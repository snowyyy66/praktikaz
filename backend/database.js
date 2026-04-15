import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'marketplace.db');

let db;

/** Подключить или создать файл БД, создать таблицы и колонки при отсутствии, при пустой БД — seed, затем сохранить на диск */
export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      phone TEXT DEFAULT '',
      city TEXT DEFAULT 'Москва',
      avatar TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      rating REAL DEFAULT 5.0,
      total_sales INTEGER DEFAULT 0,
      total_earnings INTEGER DEFAULT 0
    )
  `);
  try { db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0'); } catch (_) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category_id TEXT NOT NULL,
      price INTEGER NOT NULL,
      city TEXT DEFAULT 'Москва',
      condition TEXT DEFAULT 'Б/У',
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      seller_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1,
      details TEXT DEFAULT '{}'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      status TEXT DEFAULT 'completed',
      total INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try { db.run('ALTER TABLE orders ADD COLUMN rent_hours INTEGER'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN appointment_date TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN appointment_time TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN address_street TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN address_house TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN house_type TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN address_entrance TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN address_floor TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN address_apartment TEXT'); } catch (_) {}

  // Migration: add images column if missing
  try { db.run("ALTER TABLE products ADD COLUMN images TEXT DEFAULT '[]'"); } catch (_) {}
  try { db.run("ALTER TABLE products ADD COLUMN sale_type TEXT DEFAULT 'fixed'"); } catch (_) {}
  try { db.run("ALTER TABLE products ADD COLUMN auction_ends_at TEXT"); } catch (_) {}
  try { db.run("ALTER TABLE products ADD COLUMN auction_step INTEGER DEFAULT 500"); } catch (_) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS auction_bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      bidder_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL,
      user2_id INTEGER NOT NULL,
      product_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user1_id, user2_id, product_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try { db.run('ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0'); } catch (_) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      text TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(reviewer_id, product_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const count = db.exec("SELECT COUNT(*) as c FROM users");
  if (count[0].values[0][0] === 0) {
    seedDatabase();
  }

  const admin = queryOne('SELECT id FROM users WHERE email = ?', ['admin45@gmail.com']);
  if (!admin) {
    db.run(
      'INSERT INTO users (username, email, password, is_admin, phone, city, rating, total_sales, total_earnings) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)',
      ['admin_wiwang', 'admin45@gmail.com', 'admin12345', '+7 (900) 000-00-00', 'Москва', 5.0, 0, 0]
    );
  } else {
    db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [admin.id]);
  }

  const ps5Auction = queryOne("SELECT id FROM products WHERE title LIKE '%PS5%' AND sale_type = 'auction' LIMIT 1");
  if (!ps5Auction) {
    const ps5 = queryOne("SELECT id FROM products WHERE title LIKE '%PS5%' LIMIT 1");
    if (ps5) {
      db.run(`UPDATE products SET sale_type = 'auction', auction_ends_at = datetime('now', '+14 days'), auction_step = 500, price = 30000 WHERE id = ?`, [ps5.id]);
    }
  }

  const rentRows = queryAll("SELECT id, details FROM products WHERE category_id = 'rent'");
  for (const r of rentRows) {
    let d = {};
    try { d = JSON.parse(r.details || '{}'); } catch (_) {}
    if (d.min_hours == null || d.min_hours === '' || d.max_hours == null || d.max_hours === '') {
      d.min_hours = d.min_hours || '4';
      d.max_hours = d.max_hours || '168';
      db.run('UPDATE products SET details = ? WHERE id = ?', [JSON.stringify(d), r.id]);
    }
  }

  saveDb();
  return db;
}

/** Сериализовать текущее состояние sql.js в файл marketplace.db */
function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/** Заполнить демо-пользователей, категории, товары, заказы и избранное при первом запуске */
function seedDatabase() {
  const users = [
    ['vlad_msk', 'vlad99@bk.ru', '123456', '+7 (916) 453-29-11', 'Москва', 4.8, 12, 540000],
    ['AutoDealer_Pro', 'dealer@mail.ru', '123456', '+7 (999) 234-56-78', 'Санкт-Петербург', 4.9, 45, 3400000],
    ['dimon1995', 'dimon@inbox.ru', '123456', '+7 (903) 112-68-98', 'Казань', 4.2, 5, 80000],
    ['elena_realtor', 'el_real@gmail.com', '123456', '+7 (926) 888-21-44', 'Новосибирск', 5.0, 17, 18900000],
    ['artem_krop', 'krop@ya.ru', '123456', '+7 (911) 567-89-01', 'Москва', 4.7, 34, 4500000],
    ['sneaker_head_spb', 'shoes@mail.ru', '123456', '+7 (965) 678-90-12', 'Екатеринбург', 4.5, 48, 620000],
  ];
  for (const u of users) {
    db.run('INSERT INTO users (username, email, password, phone, city, rating, total_sales, total_earnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', u);
  }

  const cats = [
    ['transport', 'Транспорт'],
    ['realestate', 'Недвижимость'],
    ['items', 'Предметы'],
    ['clothing', 'Одежда и аксессуары'],
    ['services', 'Услуги и прочее'],
    ['rent', 'Аренда транспорта']
  ];
  for (const c of cats) {
    db.run('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)', c);
  }

  const products = [
    ['BMW M5 F90', 'Продам свою ласточку, состояние идеал, без дтп. Звоните', 'transport', 8500000, 'Москва', 'Б/У', 1240, 89, 1, '{"Двигатель":"4.4 V8 BiTurbo","Мощность":"625 л.с.","Пробег":"32 000 км","Год":"2021","КПП":"Автомат","Привод":"Полный"}'],
    ['Mercedes W223 S', 'Пригонял из за границы, выхлоп amg. Торг у капота.', 'transport', 12000000, 'Москва', 'Б/У', 890, 67, 2, '{"Двигатель":"3.0 Diesel","Мощность":"330 л.с.","Пробег":"18 000 км","Год":"2022","КПП":"Автомат","Привод":"Полный"}'],
    ['Toyota Camry 70', 'Машина отца, относились бережно. Любые проверки.', 'transport', 2800000, 'Казань', 'Б/У', 2100, 156, 3, '{"Двигатель":"3.5 V6","Мощность":"249 л.с.","Пробег":"45 000 км","Год":"2020","КПП":"Автомат","Привод":"Передний"}'],
    ['Квартира 2шка на Арбате', 'Срочная продажа! Мебель оставим. Ипотеку рассматриваем.', 'realestate', 18500000, 'Москва', 'Вторичка', 3200, 89, 4, '{"Площадь":"65 кв.м","Комнат":"2","Этаж":"7/12","Ремонт":"Евро"}'],
    ['Студия Комендантский', 'Сдача в след году, переуступка. Звоните до 21', 'realestate', 5200000, 'Санкт-Петербург', 'Новостройка', 1800, 56, 4, '{"Площадь":"28 кв.м","Комнат":"Студия","Этаж":"15/25","Ремонт":"Чистовая"}'],
    ['iPhone 15 Pro Max', 'Телефону неделя, не подошел цвет( чек коробка все дела', 'items', 120000, 'Москва', 'Б/У', 4500, 234, 1, '{"Память":"256 ГБ","Цвет":"Титановый синий","Состояние":"Идеальное"}'],
    ['MacBook 16 m3', 'Подарили на др. не включал!', 'items', 280000, 'Москва', 'Новое', 2300, 156, 5, '{"Процессор":"M3 Pro","ОЗУ":"36 ГБ","SSD":"512 ГБ"}'],
    ['PS5 с дисководом', 'Плойка как плойка, играл раз 5. Джойстик в поряде.', 'items', 45000, 'Казань', 'Б/У', 1800, 89, 3, '{"Версия":"С дисководом","Геймпады":"1 шт","Состояние":"Отличное"}'],
    ['Jordan 1 Chicago', 'Ориг, легит чек пройден. Размер не подошел.', 'clothing', 18000, 'Москва', 'Новое', 3400, 210, 6, '{"Бренд":"Nike","Размер":"42","Состояние":"Новые с коробкой"}'],
    ['Куртка TNF Nuptse', 'Носил 1 месяц зимний пухан', 'clothing', 22000, 'Санкт-Петербург', 'Б/У', 1200, 67, 6, '{"Бренд":"The North Face","Размер":"L","Сезон":"Зима"}'],
    ['Замена проводки', 'Сделаю всё что нужно по электрике, цена после осмотра', 'services', 5000, 'Москва', 'Услуга', 1800, 45, 1, '{"Опыт":"10 лет","Выезд":"Бесплатно"}'],
    ['Переезд с грузчиками', 'Приедем поможем загрузим', 'services', 2000, 'Москва', 'Услуга', 3400, 210, 5, '{"Техника":"Газель 4м","Грузчики":"2 человека"}'],
    ['Аренда Model Y', 'Сдам в аренду, договор, залог. Цена за час — см. карточку.', 'rent', 1800, 'Москва', 'Аренда/сутки', 1800, 67, 2, '{"min_hours":"4","max_hours":"120","Залог":"10 000 ₽","Стаж вождения":"от 3 лет"}']
  ];
  for (const p of products) {
    db.run('INSERT INTO products (title, description, category_id, price, city, condition, views, likes, seller_id, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', p);
  }

  const orders = [
    [1, 2, 2, 'completed', 12000000, '2026-03-15 14:30:00'],
    [1, 3, 9, 'completed', 45000, '2026-03-20 10:00:00'],
    [2, 1, 1, 'completed', 8500000, '2026-03-22 16:45:00'],
    [3, 4, 4, 'completed', 18500000, '2026-03-25 09:30:00']
  ];
  for (const o of orders) {
    db.run('INSERT INTO orders (buyer_id, seller_id, product_id, status, total, created_at) VALUES (?, ?, ?, ?, ?, ?)', o);
  }

  const favs = [[1,1],[1,5],[2,1],[2,6],[3,2]];
  for (const f of favs) {
    db.run('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)', f);
  }
}

/** Выполнить SELECT и вернуть массив строк-объектов */
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/** Одна строка результата или null */
export function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

/** INSERT/UPDATE/DELETE и сразу сохранить БД на диск */
export function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

/** Сырой экземпляр sql.js (для отладки или расширений) */
export function getDb() { return db; }
