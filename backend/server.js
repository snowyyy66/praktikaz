import express from 'express';
import cors from 'cors';
import { initDatabase, queryAll, queryOne, runSql } from './database.js';

const app = express();
app.use(cors());
app.use(express.json());

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

  const products = queryAll(sql, params).map(p => ({ ...p, details: JSON.parse(p.details || '{}') }));
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = queryOne(`
    SELECT p.*, u.username as seller_name, u.phone as seller_phone, u.rating as seller_rating, u.city as seller_city, u.total_sales as seller_total_sales, c.name as category_name
    FROM products p
    JOIN users u ON p.seller_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [parseInt(req.params.id)]);

  if (!product) return res.status(404).json({ error: 'Not found' });

  runSql('UPDATE products SET views = views + 1 WHERE id = ?', [parseInt(req.params.id)]);
  product.details = JSON.parse(product.details || '{}');
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const { title, description, category_id, price, city, condition, seller_id } = req.body;
  
  runSql(`
    INSERT INTO products (title, description, category_id, price, city, condition, seller_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [title, description, category_id, price, city, condition, seller_id]);

  res.json({ success: true });
});

app.post('/api/products/:id/like', (req, res) => {
  const id = parseInt(req.params.id);
  runSql('UPDATE products SET likes = likes + 1 WHERE id = ?', [id]);
  const p = queryOne('SELECT likes FROM products WHERE id = ?', [id]);
  res.json({ likes: p?.likes || 0 });
});

// ======================= AUTH =======================
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  try {
    const check = queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (check) return res.status(400).json({ error: 'Пользователь с такой почтой или именем уже существует' });

    runSql('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password]);
    const user = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    res.json({ success: true, user_id: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = queryOne('SELECT id, password FROM users WHERE email = ?', [email]);
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Неверная почта или пароль' });
  }
  
  res.json({ success: true, user_id: user.id });
});

// ======================= USERS =======================
app.get('/api/users/:id', (req, res) => {
  const user = queryOne('SELECT id, username, email, phone, city, avatar, created_at, rating, total_sales, total_earnings FROM users WHERE id = ?', [parseInt(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
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

// ======================= ORDERS =======================
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
