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

// ======================= CATEGORIES =======================
app.get('/api/categories', (req, res) => {
  res.json(queryAll('SELECT * FROM categories'));
});

// ======================= PRODUCTS =======================
app.get('/api/products', (req, res) => {
  const { category, sort, search } = req.query;
  let sql = `
    SELECT p.*, u.username as seller_name, u.phone as seller_phone, u.rating as seller_rating, c.name as category_name
    FROM products p
    JOIN users u ON p.seller_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (category) {
    sql += ' AND p.category_id = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND p.title LIKE ?';
    params.push(`%${search}%`);
  }

  switch (sort) {
    case 'price_asc': sql += ' ORDER BY p.price ASC'; break;
    case 'price_desc': sql += ' ORDER BY p.price DESC'; break;
    case 'popular': sql += ' ORDER BY p.views DESC'; break;
    default: sql += ' ORDER BY p.created_at DESC'; break;
  }

  const products = queryAll(sql, params).map(p => ({ ...p, details: JSON.parse(p.details || '{}'), images: JSON.parse(p.images || '[]') }));
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = queryOne(`
    SELECT p.*, u.username as seller_name, u.phone as seller_phone, u.rating as seller_rating, u.city as seller_city, u.total_sales as seller_total_sales, u.avatar as seller_avatar, c.name as category_name
    FROM products p
    JOIN users u ON p.seller_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [parseInt(req.params.id)]);

  if (!product) return res.status(404).json({ error: 'Not found' });

  runSql('UPDATE products SET views = views + 1 WHERE id = ?', [parseInt(req.params.id)]);
  product.details = JSON.parse(product.details || '{}');
  product.images = JSON.parse(product.images || '[]');
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const { title, description, category_id, price, city, condition, seller_id, details } = req.body;

  runSql(`
    INSERT INTO products (title, description, category_id, price, city, condition, seller_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [title, description, category_id, price, city, condition, seller_id, JSON.stringify(details || {})]);

  const created = queryOne('SELECT id FROM products WHERE seller_id = ? ORDER BY id DESC LIMIT 1', [seller_id]);
  res.json({ success: true, id: created?.id });
});

app.post('/api/products/:id/images', upload.array('images', 10), (req, res) => {
  const id = parseInt(req.params.id);
  const product = queryOne('SELECT images FROM products WHERE id = ?', [id]);
  if (!product) return res.status(404).json({ error: 'Not found' });

  const existing = JSON.parse(product.images || '[]');
  const newUrls = req.files.map(f => `/uploads/${f.filename}`);
  const updated = [...existing, ...newUrls];
  runSql('UPDATE products SET images = ? WHERE id = ?', [JSON.stringify(updated), id]);
  res.json({ success: true, images: updated });
});

app.post('/api/products/:id/like', (req, res) => {
  const id = parseInt(req.params.id);
  runSql('UPDATE products SET likes = likes + 1 WHERE id = ?', [id]);
  const p = queryOne('SELECT likes FROM products WHERE id = ?', [id]);
  res.json({ likes: p?.likes || 0 });
});

app.patch('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, category_id, price, city, condition, details } = req.body;
  try {
    runSql(`
      UPDATE products SET title = ?, description = ?, category_id = ?, price = ?, city = ?, condition = ?, details = ? WHERE id = ?
    `, [title, description, category_id, price, city, condition, JSON.stringify(details || {}), id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  runSql('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
  res.json({ success: true });
});

// ======================= AUTH =======================
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const check = queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (check) return res.status(400).json({ error: 'Пользователь с такой почтой или именем уже существует' });

    const hash = await bcrypt.hash(password, 10);
    runSql('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hash]);
    const user = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    res.json({ success: true, user_id: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = queryOne('SELECT id, password FROM users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Неверная почта или пароль' });

  const isValid = user.password.startsWith('$2')
    ? await bcrypt.compare(password, user.password)
    : user.password === password; // fallback for existing seed users

  if (!isValid) return res.status(401).json({ error: 'Неверная почта или пароль' });
  res.json({ success: true, user_id: user.id });
});

// ======================= USERS =======================
app.get('/api/users/:id', (req, res) => {
  const user = queryOne('SELECT id, username, email, phone, city, avatar, created_at, rating, total_sales, total_earnings FROM users WHERE id = ?', [parseInt(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.post('/api/users/:id/avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  const url = `/uploads/${req.file.filename}`;
  runSql('UPDATE users SET avatar = ? WHERE id = ?', [url, parseInt(req.params.id)]);
  res.json({ success: true, avatar: url });
});

app.put('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { username, phone, city } = req.body;
  try {
    runSql('UPDATE users SET username = ?, phone = ?, city = ? WHERE id = ?', [username, phone, city, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id/products', (req, res) => {
  const products = queryAll(`
    SELECT p.*, c.name as category_name FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.seller_id = ? AND p.is_active = 1 ORDER BY p.created_at DESC
  `, [parseInt(req.params.id)]);
  res.json(products.map(p => ({ ...p, details: JSON.parse(p.details || '{}') })));
});

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

// ======================= FAVORITES =======================
app.get('/api/users/:id/favorites', (req, res) => {
  const favs = queryAll(`
    SELECT p.*, c.name as category_name, u.username as seller_name
    FROM favorites f JOIN products p ON f.product_id = p.id
    JOIN categories c ON p.category_id = c.id JOIN users u ON p.seller_id = u.id
    WHERE f.user_id = ? ORDER BY f.created_at DESC
  `, [parseInt(req.params.id)]);
  res.json(favs.map(p => ({ ...p, details: JSON.parse(p.details || '{}') })));
});

app.post('/api/favorites', (req, res) => {
  const { user_id, product_id } = req.body;
  const existing = queryOne('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
  if (existing) {
    runSql('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
    res.json({ success: true, removed: true });
  } else {
    runSql('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)', [user_id, product_id]);
    res.json({ success: true });
  }
});

// ======================= SEARCH =======================
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
  `, [term, term]);
  res.json(products.map(p => ({ ...p, details: JSON.parse(p.details || '{}') })));
});

// ======================= ORDERS =======================
app.post('/api/orders', (req, res) => {
  const { buyer_id, product_id } = req.body;
  const product = queryOne('SELECT * FROM products WHERE id = ? AND is_active = 1', [product_id]);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  if (product.seller_id === buyer_id) return res.status(400).json({ error: 'Нельзя купить собственный товар' });

  try {
    runSql(`INSERT INTO orders (buyer_id, seller_id, product_id, total, status) VALUES (?, ?, ?, ?, 'completed')`,
      [buyer_id, product.seller_id, product_id, product.price]);
    runSql('UPDATE products SET is_active = 0 WHERE id = ?', [product_id]);
    runSql('UPDATE users SET total_sales = total_sales + 1, total_earnings = total_earnings + ? WHERE id = ?',
      [product.price, product.seller_id]);
    runSql('INSERT INTO notifications (user_id, type, text) VALUES (?, ?, ?)',
      [product.seller_id, 'sale', `Ваш товар "${product.title}" куплен за ${product.price.toLocaleString('ru-RU')} ₽`]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id/orders', (req, res) => {
  const uid = parseInt(req.params.id);
  const orders = queryAll(`
    SELECT o.*, p.title as product_title, p.price as product_price,
           buyer.username as buyer_name, seller.username as seller_name
    FROM orders o JOIN products p ON o.product_id = p.id
    JOIN users buyer ON o.buyer_id = buyer.id
    JOIN users seller ON o.seller_id = seller.id
    WHERE o.buyer_id = ? OR o.seller_id = ?
    ORDER BY o.created_at DESC
  `, [uid, uid]);
  res.json(orders);
});

// ======================= REVIEWS =======================
app.get('/api/products/:id/reviews', (req, res) => {
  const reviews = queryAll(`
    SELECT r.*, u.username as reviewer_name
    FROM reviews r JOIN users u ON r.reviewer_id = u.id
    WHERE r.product_id = ? ORDER BY r.created_at DESC
  `, [parseInt(req.params.id)]);
  res.json(reviews);
});

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

// ======================= MESSAGES =======================
app.get('/api/conversations', (req, res) => {
  const userId = parseInt(req.query.user_id);
  const convs = queryAll(`
    SELECT c.*,
      u1.username as user1_name, u2.username as user2_name,
      p.title as product_title,
      (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_at
    FROM conversations c
    JOIN users u1 ON c.user1_id = u1.id
    JOIN users u2 ON c.user2_id = u2.id
    LEFT JOIN products p ON c.product_id = p.id
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY last_at DESC
  `, [userId, userId]);
  res.json(convs);
});

app.post('/api/conversations', (req, res) => {
  const { user1_id, user2_id, product_id } = req.body;
  const [a, b] = [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)];
  let conv = queryOne('SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ? AND product_id IS ?', [a, b, product_id || null]);
  if (!conv) {
    runSql('INSERT INTO conversations (user1_id, user2_id, product_id) VALUES (?, ?, ?)', [a, b, product_id || null]);
    conv = queryOne('SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ? ORDER BY id DESC LIMIT 1', [a, b]);
  }
  res.json({ id: conv.id });
});

app.get('/api/conversations/:id/messages', (req, res) => {
  const msgs = queryAll(`
    SELECT m.*, u.username as sender_name
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ? ORDER BY m.created_at ASC
  `, [parseInt(req.params.id)]);
  res.json(msgs);
});

app.post('/api/conversations/:id/messages', (req, res) => {
  const { sender_id, text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Пустое сообщение' });
  runSql('INSERT INTO messages (conversation_id, sender_id, text) VALUES (?, ?, ?)',
    [parseInt(req.params.id), sender_id, text.trim()]);
  const msg = queryOne('SELECT m.*, u.username as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT 1', [parseInt(req.params.id)]);
  res.json(msg);
});

// ======================= NOTIFICATIONS =======================
app.get('/api/users/:id/notifications', (req, res) => {
  const notifications = queryAll(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [parseInt(req.params.id)]
  );
  res.json(notifications);
});

app.put('/api/notifications/:id/read', (req, res) => {
  runSql('UPDATE notifications SET is_read = 1 WHERE id = ?', [parseInt(req.params.id)]);
  res.json({ success: true });
});

app.put('/api/users/:id/notifications/read-all', (req, res) => {
  runSql('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [parseInt(req.params.id)]);
  res.json({ success: true });
});

// ======================= START SERVER =======================
const PORT = 3000;

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to init database:', err);
  process.exit(1);
});
