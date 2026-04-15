import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, queryAll, queryOne, runSql } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

function toInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : NaN;
}

function isAdminUser(userId) {
  if (!Number.isFinite(userId)) return false;
  const row = queryOne('SELECT is_admin FROM users WHERE id = ?', [userId]);
  return !!row?.is_admin;
}

/** Строка даты/времени из БД → миллисекунды (для сравнения с «сейчас») */
function sqlDateToMs(auctionEndsAt) {
  if (!auctionEndsAt) return 0;
  const s = String(auctionEndsAt).includes('T') ? String(auctionEndsAt) : String(auctionEndsAt).replace(' ', 'T');
  return new Date(s).getTime();
}

/** Аукцион ещё идёт: тип auction и дата окончания в будущем */
function isAuctionLive(product) {
  if ((product.sale_type || 'fixed') !== 'auction') return false;
  if (!product.auction_ends_at) return false;
  return sqlDateToMs(product.auction_ends_at) > Date.now();
}

/** Максимальная ставка по лоту (0, если ставок не было) */
function getAuctionHigh(productId) {
  const row = queryOne('SELECT COALESCE(MAX(amount), 0) as m FROM auction_bids WHERE product_id = ?', [productId]);
  return row?.m || 0;
}

/** Минимальная сумма следующей ставки: стартовая цена или лучшая ставка + шаг */
function getAuctionMinBid(product) {
  const step = product.auction_step || 500;
  const high = getAuctionHigh(product.id);
  if (high <= 0) return product.price;
  return high + step;
}

/** Участник с максимальной ставкой (при равенстве — кто поставил последним) */
function getAuctionLeader(productId, highAmount) {
  if (!highAmount) return null;
  return queryOne(`
    SELECT b.bidder_id, u.username as leader_name
    FROM auction_bids b JOIN users u ON b.bidder_id = u.id
    WHERE b.product_id = ? AND b.amount = ?
    ORDER BY b.created_at DESC, b.id DESC LIMIT 1
  `, [productId, highAmount]);
}

/** GET /api/categories — список категорий */
app.get('/api/categories', (req, res) => {
  res.json(queryAll('SELECT * FROM categories'));
});

/** GET /api/products — активные объявления (фильтры, сортировка, до 20 шт.; опционально is_favorite для user_id) */
app.get('/api/products', (req, res) => {
  const { category, sort, search, auction, city, user_id, page, limit } = req.query;
  const pageNum = Math.max(1, toInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, toInt(limit) || 24));
  const offsetNum = (pageNum - 1) * limitNum;
  const favUid = user_id != null && String(user_id).trim() !== '' ? parseInt(user_id, 10) : NaN;
  const favSql = Number.isFinite(favUid)
    ? '(SELECT EXISTS(SELECT 1 FROM favorites f WHERE f.product_id = p.id AND f.user_id = ?))'
    : '0';
  let sql = `
    SELECT p.*, u.username as seller_name, u.phone as seller_phone, u.rating as seller_rating, c.name as category_name,
      (SELECT COALESCE(MAX(amount), 0) FROM auction_bids ab WHERE ab.product_id = p.id) as auction_high_bid,
      ${favSql} as is_favorite
    FROM products p
    JOIN users u ON p.seller_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  const params = [];
  if (Number.isFinite(favUid)) params.push(favUid);

  if (auction === '1') {
    sql += " AND COALESCE(p.sale_type, 'fixed') = 'auction'";
  }
  if (category) {
    sql += ' AND p.category_id = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND p.title LIKE ?';
    params.push(`%${search}%`);
  }
  if (city && String(city).trim()) {
    sql += ' AND LOWER(p.city) LIKE LOWER(?)';
    params.push(`%${String(city).trim()}%`);
  }

  switch (sort) {
    case 'price_asc': sql += ' ORDER BY p.price ASC'; break;
    case 'price_desc': sql += ' ORDER BY p.price DESC'; break;
    case 'popular': sql += ' ORDER BY p.views DESC'; break;
    default: sql += ' ORDER BY p.created_at DESC'; break;
  }

  sql += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offsetNum);

  const products = queryAll(sql, params).map(p => ({
    ...p,
    details: JSON.parse(p.details || '{}'),
    images: JSON.parse(p.images || '[]'),
    is_favorite: !!p.is_favorite,
  }));
  res.json({
    items: products,
    page: pageNum,
    limit: limitNum,
    has_more: products.length === limitNum,
  });
});

/** GET /api/products/:id — карточка товара (+1 просмотр, данные аукциона, избранное по ?user_id=) */
app.get('/api/products/:id', (req, res) => {
  const product = queryOne(`
    SELECT p.*, u.username as seller_name, u.phone as seller_phone, u.rating as seller_rating, u.city as seller_city, u.total_sales as seller_total_sales, u.avatar as seller_avatar, c.name as category_name
    FROM products p
    JOIN users u ON p.seller_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [parseInt(req.params.id)]);

  if (!product) return res.status(404).json({ error: 'Not found' });

  product.details = JSON.parse(product.details || '{}');
  product.images = JSON.parse(product.images || '[]');

  const high = getAuctionHigh(product.id);
  const leader = getAuctionLeader(product.id, high);
  const bidsCountRow = queryOne('SELECT COUNT(*) as c FROM auction_bids WHERE product_id = ?', [product.id]);
  product.auction_high_bid = high > 0 ? high : null;
  product.auction_min_next_bid = (product.sale_type || 'fixed') === 'auction' ? getAuctionMinBid(product) : null;
  product.auction_leader_id = leader?.bidder_id || null;
  product.auction_leader_name = leader?.leader_name || null;
  product.auction_bids_count = bidsCountRow?.c || 0;
  product.auction_live = isAuctionLive(product);
  product.auction_ended = (product.sale_type || 'fixed') === 'auction' && product.auction_ends_at && !isAuctionLive(product);

  const favUid = req.query.user_id != null && String(req.query.user_id).trim() !== '' ? parseInt(req.query.user_id, 10) : NaN;
  if (Number.isFinite(favUid)) {
    const fav = queryOne('SELECT 1 as x FROM favorites WHERE user_id = ? AND product_id = ?', [favUid, product.id]);
    product.is_favorite = !!fav;
  } else {
    product.is_favorite = false;
  }

  res.json(product);
});

/** POST /api/products/:id/views — инкремент просмотров */
app.post('/api/products/:id/views', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
  runSql('UPDATE products SET views = views + 1 WHERE id = ?', [id]);
  res.json({ success: true });
});

/** POST /api/products — создать объявление (фикс или аукцион с датой окончания и шагом) */
app.post('/api/products', (req, res) => {
  const { title, description, category_id, price, city, condition, seller_id, details, sale_type, auction_ends_at, auction_step } = req.body;
  const sellerId = toInt(seller_id);
  const priceInt = toInt(price);
  if (!title?.trim() || !category_id || !city?.trim() || !condition?.trim()) {
    return res.status(400).json({ error: 'Заполните обязательные поля объявления' });
  }
  if (!Number.isFinite(sellerId)) {
    return res.status(400).json({ error: 'Некорректный seller_id' });
  }
  if (!Number.isFinite(priceInt) || priceInt < 1) {
    return res.status(400).json({ error: 'Некорректная цена' });
  }
  const seller = queryOne('SELECT id FROM users WHERE id = ?', [sellerId]);
  if (!seller) return res.status(404).json({ error: 'Продавец не найден' });

  const st = sale_type === 'auction' ? 'auction' : 'fixed';
  const ends = st === 'auction' && auction_ends_at ? String(auction_ends_at).trim().slice(0, 19).replace('T', ' ') : null;
  const step = st === 'auction' ? Math.max(1, toInt(auction_step) || 500) : 500;

  if (st === 'auction') {
    if (!ends) return res.status(400).json({ error: 'Укажите дату окончания торгов' });
    if (sqlDateToMs(ends) <= Date.now()) return res.status(400).json({ error: 'Окончание торгов должно быть в будущем' });
  }

  runSql(`
    INSERT INTO products (title, description, category_id, price, city, condition, seller_id, details, sale_type, auction_ends_at, auction_step)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [title.trim(), String(description || '').trim(), category_id, priceInt, city.trim(), condition.trim(), sellerId, JSON.stringify(details || {}), st, ends, step]);

  const created = queryOne('SELECT id FROM products WHERE seller_id = ? ORDER BY id DESC LIMIT 1', [sellerId]);
  res.json({ success: true, id: created?.id });
});

/** GET /api/products/:id/bids — последние ставки по аукциону */
app.get('/api/products/:id/bids', (req, res) => {
  const id = parseInt(req.params.id);
  const rows = queryAll(`
    SELECT b.id, b.amount, b.created_at, u.username as bidder_name
    FROM auction_bids b JOIN users u ON b.bidder_id = u.id
    WHERE b.product_id = ?
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT 30
  `, [id]);
  res.json(rows);
});

/** POST /api/products/:id/bids — принять ставку (валидация минимума, уведомление продавцу) */
app.post('/api/products/:id/bids', (req, res) => {
  const productId = parseInt(req.params.id);
  const { bidder_id, amount } = req.body;
  const bidderId = parseInt(bidder_id, 10);
  const amountInt = parseInt(amount, 10);
  if (!bidderId || !amountInt || amountInt < 1) return res.status(400).json({ error: 'Некорректная ставка' });

  const product = queryOne('SELECT * FROM products WHERE id = ? AND is_active = 1', [productId]);
  if (!product) return res.status(404).json({ error: 'Лот не найден' });
  if ((product.sale_type || 'fixed') !== 'auction') return res.status(400).json({ error: 'Это не аукцион' });
  if (product.seller_id === bidderId) return res.status(400).json({ error: 'Нельзя ставить на своё объявление' });
  if (!isAuctionLive(product)) return res.status(400).json({ error: 'Приём ставок закончился' });

  const minNext = getAuctionMinBid(product);
  if (amountInt < minNext) return res.status(400).json({ error: `Минимальная ставка: ${minNext.toLocaleString('ru-RU')} ₽` });

  runSql('INSERT INTO auction_bids (product_id, bidder_id, amount) VALUES (?, ?, ?)', [productId, bidderId, amountInt]);
  const high = getAuctionHigh(productId);
  const leader = getAuctionLeader(productId, high);
  const bidsCountRow = queryOne('SELECT COUNT(*) as c FROM auction_bids WHERE product_id = ?', [productId]);

  runSql('INSERT INTO notifications (user_id, type, text) VALUES (?, ?, ?)',
    [product.seller_id, 'auction', `Ставка ${amountInt.toLocaleString('ru-RU')} ₽ по «${product.title}»`]);

  res.json({
    success: true,
    auction_high_bid: high,
    auction_min_next_bid: high + (product.auction_step || 500),
    auction_leader_id: leader?.bidder_id,
    auction_leader_name: leader?.leader_name,
    auction_bids_count: bidsCountRow?.c || 0,
  });
});

/** POST /api/products/:id/images — добавить фото к объявлению (multipart) */
app.post('/api/products/:id/images', upload.array('images', 10), (req, res) => {
  const id = toInt(req.params.id);
  const sellerId = toInt(req.body.seller_id);
  const actorId = toInt(req.body.actor_id ?? sellerId);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Некорректный id объявления' });
  if (!Number.isFinite(sellerId)) return res.status(400).json({ error: 'Укажите seller_id' });
  if (!req.files?.length) return res.status(400).json({ error: 'Файлы не загружены' });

  const product = queryOne('SELECT images FROM products WHERE id = ?', [id]);
  if (!product) return res.status(404).json({ error: 'Not found' });
  const own = queryOne('SELECT id FROM products WHERE id = ? AND seller_id = ?', [id, sellerId]);
  const adminAllowed = isAdminUser(actorId);
  if (!own && !adminAllowed) return res.status(403).json({ error: 'Нельзя добавлять фото в чужое объявление' });

  const existing = JSON.parse(product.images || '[]');
  const newUrls = req.files.map(f => `/uploads/${f.filename}`);
  const updated = [...existing, ...newUrls];
  runSql('UPDATE products SET images = ? WHERE id = ?', [JSON.stringify(updated), id]);
  res.json({ success: true, images: updated });
});

/** DELETE /api/products/:id/images — удалить конкретное фото из объявления */
app.delete('/api/products/:id/images', (req, res) => {
  const id = toInt(req.params.id);
  const sellerId = toInt(req.body?.seller_id);
  const actorId = toInt(req.body?.actor_id ?? sellerId);
  const imageUrl = String(req.body?.image_url || '').trim();
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Некорректный id объявления' });
  if (!Number.isFinite(sellerId)) return res.status(400).json({ error: 'Укажите seller_id' });
  if (!imageUrl) return res.status(400).json({ error: 'Укажите image_url' });

  const own = queryOne('SELECT id, images FROM products WHERE id = ? AND seller_id = ?', [id, sellerId]);
  const adminAllowed = isAdminUser(actorId);
  const product = own || (adminAllowed ? queryOne('SELECT id, images FROM products WHERE id = ?', [id]) : null);
  if (!product) return res.status(403).json({ error: 'Нельзя удалять фото из чужого объявления' });

  const images = JSON.parse(product.images || '[]');
  const updated = images.filter((img) => img !== imageUrl);
  if (updated.length === images.length) return res.status(404).json({ error: 'Фото не найдено в объявлении' });
  runSql('UPDATE products SET images = ? WHERE id = ?', [JSON.stringify(updated), id]);

  if (imageUrl.startsWith('/uploads/')) {
    const localName = imageUrl.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, localName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
  }

  res.json({ success: true, images: updated });
});

/** POST /api/products/:id/like — увеличить счётчик лайков на карточке */
app.post('/api/products/:id/like', (req, res) => {
  const id = parseInt(req.params.id);
  runSql('UPDATE products SET likes = likes + 1 WHERE id = ?', [id]);
  const p = queryOne('SELECT likes FROM products WHERE id = ?', [id]);
  res.json({ likes: p?.likes || 0 });
});

/** PATCH /api/products/:id — обновить поля объявления */
app.patch('/api/products/:id', (req, res) => {
  const id = toInt(req.params.id);
  const { title, description, category_id, price, city, condition, details, seller_id, actor_id } = req.body;
  const sellerId = toInt(seller_id);
  const actorId = toInt(actor_id ?? seller_id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Некорректный id объявления' });
  if (!Number.isFinite(sellerId)) return res.status(400).json({ error: 'Укажите seller_id' });

  const own = queryOne('SELECT id FROM products WHERE id = ? AND seller_id = ?', [id, sellerId]);
  const adminAllowed = isAdminUser(actorId);
  if (!own && !adminAllowed) return res.status(403).json({ error: 'Нельзя редактировать чужое объявление' });

  try {
    const updates = [];
    const params = [];

    if (title != null) { updates.push('title = ?'); params.push(String(title).trim()); }
    if (description != null) { updates.push('description = ?'); params.push(String(description).trim()); }
    if (category_id != null) { updates.push('category_id = ?'); params.push(category_id); }
    if (price != null) {
      const priceInt = toInt(price);
      if (!Number.isFinite(priceInt) || priceInt < 1) return res.status(400).json({ error: 'Некорректная цена' });
      updates.push('price = ?');
      params.push(priceInt);
    }
    if (city != null) { updates.push('city = ?'); params.push(String(city).trim()); }
    if (condition != null) { updates.push('condition = ?'); params.push(String(condition).trim()); }
    if (details !== undefined) { updates.push('details = ?'); params.push(JSON.stringify(details || {})); }

    if (!updates.length) return res.status(400).json({ error: 'Нет данных для обновления' });
    params.push(id);
    runSql(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/products/:id — полностью удалить объявление и связанные данные */
app.delete('/api/products/:id', (req, res) => {
  const id = toInt(req.params.id);
  const sellerId = toInt(req.body?.seller_id ?? req.query?.seller_id);
  const actorId = toInt(req.body?.actor_id ?? req.query?.actor_id ?? sellerId);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Некорректный id объявления' });
  if (!Number.isFinite(sellerId)) return res.status(400).json({ error: 'Укажите seller_id' });
  const own = queryOne('SELECT id, seller_id, title, images FROM products WHERE id = ? AND seller_id = ?', [id, sellerId]);
  const adminAllowed = isAdminUser(actorId);
  const product = own || (adminAllowed ? queryOne('SELECT id, seller_id, title, images FROM products WHERE id = ?', [id]) : null);
  if (!product) return res.status(403).json({ error: 'Нельзя удалить чужое объявление' });

  // 1) Удаляем локальные файлы фотографий объявления (если есть)
  const images = JSON.parse(product.images || '[]');
  for (const img of images) {
    if (typeof img !== 'string' || !img.startsWith('/uploads/')) continue;
    const filePath = path.join(uploadsDir, img.replace('/uploads/', ''));
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
  }

  // 2) Удаляем все сущности, связанные с объявлением
  const convRows = queryAll('SELECT id FROM conversations WHERE product_id = ?', [id]);
  for (const c of convRows) {
    runSql('DELETE FROM messages WHERE conversation_id = ?', [c.id]);
  }
  runSql('DELETE FROM conversations WHERE product_id = ?', [id]);
  runSql('DELETE FROM favorites WHERE product_id = ?', [id]);
  runSql('DELETE FROM auction_bids WHERE product_id = ?', [id]);
  runSql('DELETE FROM reviews WHERE product_id = ?', [id]);
  runSql('DELETE FROM orders WHERE product_id = ?', [id]);

  // Чистим типовые уведомления по этому товару у владельца (аукцион/продажа/отзывы)
  runSql(
    `DELETE FROM notifications
     WHERE user_id = ? AND (type IN ('auction', 'sale', 'review')) AND text LIKE ?`,
    [product.seller_id, `%${product.title}%`]
  );

  // 3) Удаляем само объявление
  runSql('DELETE FROM products WHERE id = ?', [id]);
  res.json({ success: true, hard_deleted: true });
});

/** POST /api/auth/register — регистрация (хеш пароля, проверка уникальности почты/имени) */
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const check = queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (check) return res.status(400).json({ error: 'Пользователь с такой почтой или именем уже существует' });

    const hash = await bcrypt.hash(password, 10);
    runSql('INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 0)', [username, email, hash]);
    const user = queryOne('SELECT id, is_admin FROM users WHERE email = ?', [email]);
    res.json({ success: true, user_id: user.id, is_admin: !!user.is_admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/auth/login — вход по почте и паролю, возвращает user_id */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = queryOne('SELECT id, password, is_admin FROM users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Неверная почта или пароль' });

  const isValid = user.password.startsWith('$2')
    ? await bcrypt.compare(password, user.password)
    : user.password === password; // fallback for existing seed users

  if (!isValid) return res.status(401).json({ error: 'Неверная почта или пароль' });
  res.json({ success: true, user_id: user.id, is_admin: !!user.is_admin });
});

/** GET /api/users/:id — публичный профиль пользователя */
app.get('/api/users/:id', (req, res) => {
  const user = queryOne('SELECT id, username, email, is_admin, phone, city, avatar, created_at, rating, total_sales, total_earnings FROM users WHERE id = ?', [parseInt(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

/** GET /api/admin/products?user_id= — все объявления для админки */
app.get('/api/admin/products', (req, res) => {
  const uid = toInt(req.query.user_id);
  if (!isAdminUser(uid)) return res.status(403).json({ error: 'Доступ только для администратора' });
  const products = queryAll(`
    SELECT p.*, c.name as category_name, u.username as seller_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN users u ON p.seller_id = u.id
    ORDER BY p.created_at DESC
    LIMIT 500
  `);
  res.json(products.map(p => ({ ...p, details: JSON.parse(p.details || '{}'), images: JSON.parse(p.images || '[]') })));
});

/** POST /api/users/:id/avatar — загрузить аватар, сохранить URL в профиле */
app.post('/api/users/:id/avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  const url = `/uploads/${req.file.filename}`;
  runSql('UPDATE users SET avatar = ? WHERE id = ?', [url, parseInt(req.params.id)]);
  res.json({ success: true, avatar: url });
});

/** PUT /api/users/:id — обновить имя, телефон, город */
app.put('/api/users/:id', (req, res) => {
  const id = toInt(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Некорректный id пользователя' });
  const { username, phone, city } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Имя не может быть пустым' });
  try {
    runSql('UPDATE users SET username = ?, phone = ?, city = ? WHERE id = ?', [username.trim(), String(phone || '').trim(), String(city || '').trim(), id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/users/:id/products — активные объявления продавца (до 20) */
app.get('/api/users/:id/products', (req, res) => {
  const products = queryAll(`
    SELECT p.*, c.name as category_name FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.seller_id = ? AND p.is_active = 1 ORDER BY p.created_at DESC
  `, [parseInt(req.params.id)]);
  res.json(products.map(p => ({
    ...p,
    details: JSON.parse(p.details || '{}'),
    images: JSON.parse(p.images || '[]'),
  })));
});

/** GET /api/users/:id/stats — сводка: объявления, просмотры, лайки, продажи, покупки */
app.get('/api/users/:id/stats', (req, res) => {
  const uid = parseInt(req.params.id);
  const totalProducts = queryOne('SELECT COUNT(*) as count FROM products WHERE seller_id = ?', [uid])?.count || 0;
  const activeProducts = queryOne('SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND is_active = 1', [uid])?.count || 0;
  const totalViews = queryOne('SELECT COALESCE(SUM(views), 0) as total FROM products WHERE seller_id = ?', [uid])?.total || 0;
  const totalLikes = queryOne('SELECT COALESCE(SUM(likes), 0) as total FROM products WHERE seller_id = ?', [uid])?.total || 0;

  const sales = queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE seller_id = ? AND status = 'completed'", [uid]);
  const purchases = queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as spent FROM orders WHERE buyer_id = ? AND status = 'completed'", [uid]);

  res.json({
    totalProducts, activeProducts, totalViews, totalLikes,
    sales: { count: sales?.count || 0, revenue: sales?.revenue || 0 },
    purchases: { count: purchases?.count || 0, spent: purchases?.spent || 0 },
  });
});

/** GET /api/users/:id/favorites — избранные объявления пользователя */
app.get('/api/users/:id/favorites', (req, res) => {
  const favs = queryAll(`
    SELECT p.*, c.name as category_name, u.username as seller_name
    FROM favorites f JOIN products p ON f.product_id = p.id
    JOIN categories c ON p.category_id = c.id JOIN users u ON p.seller_id = u.id
    WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 20
  `, [parseInt(req.params.id)]);
  res.json(favs.map(p => ({
    ...p,
    details: JSON.parse(p.details || '{}'),
    images: JSON.parse(p.images || '[]'),
    is_favorite: true,
  })));
});

/** POST /api/favorites — переключить избранное (добавить или убрать пару user_id + product_id) */
app.post('/api/favorites', (req, res) => {
  const user_id = parseInt(req.body.user_id, 10);
  const product_id = parseInt(req.body.product_id, 10);
  if (!Number.isFinite(user_id) || !Number.isFinite(product_id)) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }
  const existing = queryOne('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
  if (existing) {
    runSql('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
    res.json({ success: true, favorited: false });
  } else {
    runSql('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)', [user_id, product_id]);
    res.json({ success: true, favorited: true });
  }
});

/** GET /api/search — поиск по названию и описанию (до 20 результатов) */
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);
  const term = `%${q.trim()}%`;
  const products = queryAll(`
    SELECT p.*, u.username as seller_name, c.name as category_name
    FROM products p
    JOIN users u ON p.seller_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND (p.title LIKE ? OR p.description LIKE ?)
    ORDER BY p.created_at DESC
    LIMIT 20
  `, [term, term]);
  res.json(products.map(p => ({ ...p, details: JSON.parse(p.details || '{}') })));
});

/** POST /api/orders — оформить заказ (аренда: rent_hours; услуги: дата/время/адрес; товары: адрес) */
app.post('/api/orders', (req, res) => {
  const { 
    buyer_id, product_id, rent_hours, 
    appointment_date, appointment_time,
    address_street, address_house, house_type, 
    address_entrance, address_floor, address_apartment 
  } = req.body;

  const buyerId = toInt(buyer_id);
  const productId = toInt(product_id);
  if (!Number.isFinite(buyerId) || !Number.isFinite(productId)) {
    return res.status(400).json({ error: 'Некорректные параметры заказа' });
  }

  const product = queryOne('SELECT * FROM products WHERE id = ? AND is_active = 1', [productId]);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  if (toInt(product.seller_id) === buyerId) return res.status(400).json({ error: 'Нельзя купить собственный товар' });

  // Concurrency check for services
  if (product.category_id === 'services' && appointment_date && appointment_time) {
    const existing = queryOne(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE product_id = ? AND appointment_date = ? AND appointment_time = ?
    `, [productId, appointment_date, appointment_time]);
    
    if (existing && existing.count >= 3) {
      return res.status(400).json({ error: 'Это время уже полностью забронировано (макс. 3 мастера)' });
    }
  }

  let total = product.price;
  let rentHoursSaved = null;

  if (product.category_id === 'rent') {
    const d = JSON.parse(product.details || '{}');
    const minH = Math.max(1, parseInt(d.min_hours, 10) || 1);
    const maxH = Math.max(minH, parseInt(d.max_hours, 10) || 168);
    const hrs = parseInt(rent_hours, 10);
    if (!Number.isFinite(hrs)) return res.status(400).json({ error: 'Укажите срок аренды' });
    if (hrs < minH || hrs > maxH) return res.status(400).json({ error: `Срок аренды: от ${minH} до ${maxH} ч.` });
    total = parseInt(product.price, 10) * hrs;
    rentHoursSaved = hrs;
  }

  if ((product.sale_type || 'fixed') === 'auction') {
    const high = getAuctionHigh(productId);
    const leader = getAuctionLeader(productId, high);
    if (!leader || toInt(leader.bidder_id) !== buyerId) return res.status(403).json({ error: 'Только победитель может оформить заказ' });
    total = high;
  }

  try {
    const statusVal = 'completed';
    runSql(`
      INSERT INTO orders (
        buyer_id, seller_id, product_id, total, status, rent_hours,
        appointment_date, appointment_time, address_street, address_house, 
        house_type, address_entrance, address_floor, address_apartment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      buyerId, 
      toInt(product.seller_id), 
      productId, 
      Math.floor(total), 
      statusVal,
      rentHoursSaved,
      appointment_date || null,
      appointment_time || null,
      address_street || '',
      address_house || '',
      house_type || 'apartment',
      address_entrance || '',
      address_floor || '',
      address_apartment || ''
    ]);

    // Services stay active, others go inactive
    if (product.category_id !== 'rent' && product.category_id !== 'services') {
      runSql('UPDATE products SET is_active = 0 WHERE id = ?', [productId]);
    }

    runSql('UPDATE users SET total_sales = total_sales + 1, total_earnings = total_earnings + ? WHERE id = ?',
      [Math.floor(total), toInt(product.seller_id)]);

    const saleText = product.category_id === 'rent'
      ? `Аренда «${product.title}»: ${rentHoursSaved} ч. — ${total.toLocaleString('ru-RU')} ₽`
      : `Новый заказ на "${product.title}" (${total.toLocaleString('ru-RU')} ₽)`;

    runSql('INSERT INTO notifications (user_id, type, text) VALUES (?, ?, ?)',
      [toInt(product.seller_id), 'sale', saleText]);

    res.json({ success: true });
  } catch (err) {
    console.error('Order Error:', err);
    res.status(500).json({ error: 'Ошибка базы данных при оформлении: ' + err.message });
  }
});

/** GET /api/products/:id/availability?date=... — получить занятые слоты */
app.get('/api/products/:id/availability', (req, res) => {
  const productId = parseInt(req.params.id);
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Укажите дату' });

  const orders = queryAll(`
    SELECT appointment_time, COUNT(*) as count 
    FROM orders 
    WHERE product_id = ? AND appointment_date = ?
    GROUP BY appointment_time
  `, [productId, date]);

  // Return slots that are full (count >= 3)
  const fullSlots = orders.filter(o => o.count >= 3).map(o => o.appointment_time);
  res.json({ full_slots: fullSlots });
});

/** GET /api/users/:id/orders — заказы, где пользователь покупатель или продавец */
app.get('/api/users/:id/orders', (req, res) => {
  const uid = parseInt(req.params.id);
  const orders = queryAll(`
    SELECT o.*, p.title as product_title, p.price as product_price, p.category_id as product_category_id,
           buyer.username as buyer_name, seller.username as seller_name
    FROM orders o JOIN products p ON o.product_id = p.id
    JOIN users buyer ON o.buyer_id = buyer.id
    JOIN users seller ON o.seller_id = seller.id
    WHERE o.buyer_id = ? OR o.seller_id = ?
    ORDER BY o.created_at DESC
  `, [uid, uid]);
  res.json(orders);
});

/** GET /api/products/:id/reviews — отзывы на товар */
app.get('/api/products/:id/reviews', (req, res) => {
  const reviews = queryAll(`
    SELECT r.*, u.username as reviewer_name
    FROM reviews r JOIN users u ON r.reviewer_id = u.id
    WHERE r.product_id = ? ORDER BY r.created_at DESC
  `, [parseInt(req.params.id)]);
  res.json(reviews);
});

/** POST /api/reviews — оставить отзыв (только после покупки этого товара) */
app.post('/api/reviews', (req, res) => {
  const { reviewer_id, product_id, rating, text } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Рейтинг от 1 до 5' });

  const product = queryOne('SELECT seller_id FROM products WHERE id = ?', [product_id]);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  const hasPurchased = queryOne('SELECT id FROM orders WHERE buyer_id = ? AND product_id = ?', [reviewer_id, product_id]);
  if (!hasPurchased) return res.status(403).json({ error: 'Отзыв можно оставить только после покупки товара' });

  try {
    runSql('INSERT INTO reviews (reviewer_id, target_user_id, product_id, rating, text) VALUES (?, ?, ?, ?, ?)',
      [reviewer_id, product.seller_id, product_id, rating, text || '']);

    const avg = queryOne('SELECT AVG(rating) as avg FROM reviews WHERE target_user_id = ?', [product.seller_id]);
    runSql('UPDATE users SET rating = ? WHERE id = ?', [Math.round((avg?.avg || 5) * 10) / 10, product.seller_id]);
    runSql('INSERT INTO notifications (user_id, type, text) VALUES (?, ?, ?)',
      [product.seller_id, 'review', `Новый отзыв на ваш товар — оценка ${rating}/5`]);

    res.json({ success: true });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Вы уже оставили отзыв на этот товар' });
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/conversations — список диалогов пользователя (?user_id=) с последним сообщением */
app.get('/api/conversations', (req, res) => {
  const userId = parseInt(req.query.user_id);
  const adminMode = isAdminUser(userId);
  const baseSql = `
    SELECT c.*,
      u1.username as user1_name, u2.username as user2_name,
      u1.is_admin as user1_is_admin, u2.is_admin as user2_is_admin,
      p.title as product_title,
      (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_at,
      (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id AND COALESCE(m2.is_read, 0) = 0 AND m2.sender_id != ?) as unread_count
    FROM conversations c
    JOIN users u1 ON c.user1_id = u1.id
    JOIN users u2 ON c.user2_id = u2.id
    LEFT JOIN products p ON c.product_id = p.id
  `;
  const sql = adminMode
    ? `${baseSql} ORDER BY last_at DESC`
    : `${baseSql} WHERE c.user1_id = ? OR c.user2_id = ? ORDER BY last_at DESC`;
  const convs = adminMode ? queryAll(sql, [userId]) : queryAll(sql, [userId, userId, userId]);
  res.json(convs);
});

/** POST /api/conversations — найти существующий или создать чат между двумя пользователями */
app.post('/api/conversations', (req, res) => {
  const user1 = toInt(req.body.user1_id);
  const user2 = toInt(req.body.user2_id);
  const productId = req.body.product_id == null ? null : toInt(req.body.product_id);
  if (!Number.isFinite(user1) || !Number.isFinite(user2) || user1 === user2) {
    return res.status(400).json({ error: 'Некорректные участники диалога' });
  }
  if (req.body.product_id != null && !Number.isFinite(productId)) {
    return res.status(400).json({ error: 'Некорректный product_id' });
  }
  const [a, b] = [Math.min(user1, user2), Math.max(user1, user2)];
  let conv = queryOne(`
    SELECT id FROM conversations
    WHERE user1_id = ? AND user2_id = ?
      AND ((product_id IS NULL AND ? IS NULL) OR product_id = ?)
    LIMIT 1
  `, [a, b, productId, productId]);
  if (!conv) {
    runSql('INSERT INTO conversations (user1_id, user2_id, product_id) VALUES (?, ?, ?)', [a, b, productId]);
    conv = queryOne(`
      SELECT id FROM conversations
      WHERE user1_id = ? AND user2_id = ?
        AND ((product_id IS NULL AND ? IS NULL) OR product_id = ?)
      ORDER BY id DESC LIMIT 1
    `, [a, b, productId, productId]);
  }
  res.json({ id: conv.id });
});

/** GET /api/conversations/:id/messages — все сообщения диалога по порядку */
app.get('/api/conversations/:id/messages', (req, res) => {
  const userId = toInt(req.query.user_id);
  const convId = parseInt(req.params.id, 10);
  const conv = queryOne('SELECT user1_id, user2_id FROM conversations WHERE id = ?', [convId]);
  if (!conv) return res.status(404).json({ error: 'Диалог не найден' });
  if (!isAdminUser(userId) && userId !== conv.user1_id && userId !== conv.user2_id) {
    return res.status(403).json({ error: 'Нет доступа к этому диалогу' });
  }
  // Для обычного пользователя считаем входящие прочитанными при открытии диалога.
  if (!isAdminUser(userId)) {
    runSql('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?', [convId, userId]);
  }
  const msgs = queryAll(`
    SELECT m.*, u.username as sender_name, u.is_admin as sender_is_admin
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ? ORDER BY m.created_at ASC
  `, [convId]);
  res.json(msgs);
});

/** POST /api/conversations/:id/messages — отправить сообщение в диалог */
app.post('/api/conversations/:id/messages', (req, res) => {
  const { sender_id, text } = req.body;
  const convId = parseInt(req.params.id, 10);
  const senderId = toInt(sender_id);
  if (!text?.trim()) return res.status(400).json({ error: 'Пустое сообщение' });
  if (!Number.isFinite(senderId)) return res.status(400).json({ error: 'Некорректный sender_id' });
  const conv = queryOne('SELECT user1_id, user2_id FROM conversations WHERE id = ?', [convId]);
  if (!conv) return res.status(404).json({ error: 'Диалог не найден' });
  if (!isAdminUser(senderId) && senderId !== conv.user1_id && senderId !== conv.user2_id) {
    return res.status(403).json({ error: 'Нет доступа к этому диалогу' });
  }

  runSql('INSERT INTO messages (conversation_id, sender_id, text, is_read) VALUES (?, ?, ?, 0)',
    [convId, senderId, text.trim()]);
  const msg = queryOne(
    'SELECT m.*, u.username as sender_name, u.is_admin as sender_is_admin FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT 1',
    [convId]
  );
  res.json(msg);
});

/** GET /api/users/:id/notifications — уведомления пользователя */
app.get('/api/users/:id/notifications', (req, res) => {
  const notifications = queryAll(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [parseInt(req.params.id)]
  );
  res.json(notifications);
});

/** PUT /api/notifications/:id/read — пометить уведомление прочитанным */
app.put('/api/notifications/:id/read', (req, res) => {
  runSql('UPDATE notifications SET is_read = 1 WHERE id = ?', [parseInt(req.params.id)]);
  res.json({ success: true });
});

/** PUT /api/users/:id/notifications/read-all — пометить все уведомления прочитанными */
app.put('/api/users/:id/notifications/read-all', (req, res) => {
  runSql('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [parseInt(req.params.id)]);
  res.json({ success: true });
});

const PORT = 3000;

/** Запуск: инициализация SQLite и поднятие HTTP-сервера на порту 3000 */
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to init database:', err);
  process.exit(1);
});
