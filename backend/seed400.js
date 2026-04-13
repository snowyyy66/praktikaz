/**
 * seed400.js — наполняет БД 400 объявлениями и ~20 реальными пользователями
 * Запуск: node seed400.js
 *
 * Источники:
 *  - Пользователи + аватарки: randomuser.me (реальные фото)
 *  - Фото товаров: picsum.photos (по seed, стабильные URL)
 *  - Данные: @faker-js/faker (ru locale)
 */

import { initDatabase, runSql, queryOne } from './database.js';
import { faker } from '@faker-js/faker/locale/ru';
import unzipper from 'unzipper';

// ─── Контент по категориям ────────────────────────────────────────────────────

const TRANSPORT = {
  titles: [
    'BMW 5 Series', 'Mercedes-Benz E-Class', 'Toyota Camry', 'Audi A6',
    'Kia K5', 'Hyundai Sonata', 'Volkswagen Passat', 'Ford Focus',
    'Mazda 6', 'Honda Accord', 'Lexus ES', 'Skoda Octavia',
    'Nissan Altima', 'Mitsubishi Outlander', 'Toyota RAV4', 'Kia Sportage',
    'Hyundai Tucson', 'Audi Q5', 'BMW X5', 'Land Rover Discovery',
    'Porsche Cayenne', 'Mercedes GLE', 'Chevrolet Tahoe', 'Ford Explorer',
    'Range Rover Sport', 'Volvo XC90', 'Subaru Outback', 'Jeep Grand Cherokee',
    'Yamaha MT-07', 'Honda CB650R', 'Kawasaki Z900', 'BMW R1250GS',
  ],
  brands: ['Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Kia', 'Hyundai', 'Lexus', 'Honda', 'Mazda', 'Nissan', 'Ford', 'Porsche', 'Volvo', 'Subaru'],
  engines: ['1.4 TSI', '1.6 HDI', '2.0 TFSI', '2.0 TDI', '2.5 V6', '3.0 V6', '3.5 V6', '4.4 V8 BiTurbo', '2.0 дизель', '1.8 бензин'],
  powers: ['110 л.с.', '140 л.с.', '170 л.с.', '200 л.с.', '245 л.с.', '286 л.с.', '340 л.с.', '400 л.с.', '510 л.с.', '625 л.с.'],
  transmissions: ['Автомат', 'Механика', 'Робот', 'Вариатор'],
  drives: ['Передний', 'Задний', 'Полный'],
  descs: [
    'Машина в идеальном состоянии, без ДТП, один хозяин. Все ТО пройдены у официального дилера.',
    'Срочная продажа в связи с переездом. Торг уместен. Любые проверки за счёт покупателя.',
    'Брал новым, эксплуатировал аккуратно. Комплект зимней резины в подарок.',
    'Пригнал из Германии, растаможен. Полная комплектация, панорамная крыша.',
    'Семейный автомобиль, не бит не крашен. Покупал для жены — не понравился цвет.',
    'Отличный вариант для города и трассы. Экономичный, надёжный. Охотно меняю на Т+.',
  ],
};

const REALESTATE = {
  types: ['1-комнатная квартира', '2-комнатная квартира', '3-комнатная квартира', 'Студия', '4-комнатная квартира', 'Таунхаус', 'Коттедж', 'Апартаменты'],
  districts: ['в центре', 'у метро', 'в ЖК бизнес-класса', 'рядом с парком', 'в тихом районе', 'у набережной', 'на Арбате', 'на Рублёвке', 'в Сити'],
  renovations: ['Евро', 'Дизайнерский', 'Чистовая', 'Вторичка', 'Черновая', 'Без ремонта'],
  descs: [
    'Отличная планировка, большие окна, высокие потолки. Ипотека рассматривается.',
    'Срочная продажа. Документы готовы. Свободная продажа, заезд сразу.',
    'Инвестиционный объект. Арендаторы есть, доход 60к/мес. Продаю бизнес.',
    'Дом сдан в 2023г. Закрытая территория, консьерж, паркинг включён.',
    'Хозяин — прямая продажа, без посредников. Торг при просмотре.',
    'Полностью меблирована, заезжай и живи. Техника остаётся.',
  ],
};

const ITEMS = {
  titles: [
    'iPhone 15 Pro Max 256GB', 'Samsung Galaxy S24 Ultra', 'MacBook Pro 16" M3 Pro',
    'iPad Pro 12.9" M2', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch OLED',
    'AirPods Pro 2', 'Sony WH-1000XM5', 'DJI Mini 3 Pro', 'GoPro Hero 12',
    'Dyson V15 Detect', 'Кофемашина De\'Longhi', 'Робот-пылесос Roborock S8',
    'Телевизор Samsung Neo QLED 65"', 'Монитор LG UltraWide 34"',
    'Видеокарта RTX 4090', 'Процессор Ryzen 9 7950X', 'SSD Samsung 2TB NVMe',
    'Электросамокат Ninebot Max G2', 'Велосипед Trek Marlin 7',
    'Фотоаппарат Sony A7R V', 'Объектив Canon RF 85mm f/1.2',
    'Гитара Gibson Les Paul Standard', 'Синтезатор Yamaha DX7',
    'Рюкзак Arc\'teryx Atom 20L', 'Часы Rolex Submariner',
    'Стол IKEA BEKANT', 'Кресло Herman Miller Aeron',
  ],
  descs: [
    'Куплено месяц назад, не подошло. Полный комплект, документы есть.',
    'Использовал 3 месяца, в идеальном состоянии. Причина продажи — апгрейд.',
    'Новое, запечатанное. Подарили на ДР — уже есть такое.',
    'Состояние 9/10, есть мелкая царапина на корпусе, функционал не затрагивает.',
    'Покупал для работы, теперь не нужно. Отдам с чехлом и ЗУ.',
    'Легит чек пройден, оригинал 100%. Коробка, документы, чек из магазина.',
  ],
};

const CLOTHING = {
  titles: [
    'Nike Air Jordan 1 Retro High OG', 'Adidas Yeezy Boost 350 V2',
    'New Balance 990v5', 'Asics Gel-Kayano 30',
    'Куртка Stone Island Shadow Project', 'Пуховик Moncler Maya',
    'Худи Supreme Box Logo', 'Свитшот Off-White', 'Футболка Balenciaga',
    'Джинсы Levi\'s 501 Original', 'Брюки Carhartt WIP', 'Шорты Palm Angels',
    'Пальто Max Mara', 'Платье Jacquemus', 'Блузка Zimmermann',
    'Сумка Louis Vuitton Neverfull', 'Рюкзак Gucci GG Supreme',
    'Ремень Hermès', 'Шапка Acne Studios', 'Шарф Burberry',
  ],
  brands: ['Nike', 'Adidas', 'Supreme', 'Stone Island', 'Moncler', 'Off-White', 'Balenciaga', 'Levi\'s', 'Carhartt', 'New Balance', 'Louis Vuitton', 'Gucci', 'Hermès'],
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  descs: [
    'Ориг 100%, легит чек есть. Размер не подошёл, носил 1 раз.',
    'Куплено в официальном магазине, чек сохранён. Состояние новое.',
    'Брал для фотосессии, надел один раз. Всё идеально.',
    'Реальные фото по запросу. Торг при быстрой продаже.',
    'Коллекционный дроп, уже не найти в магазинах. Цена финальная.',
  ],
};

const SERVICES = {
  titles: [
    'Ремонт квартир под ключ', 'Сантехник — выезд в день обращения',
    'Электрик — любые работы', 'Грузоперевозки по городу и области',
    'Перетяжка мебели', 'Мастер на час', 'Ремонт техники Apple',
    'Репетитор по математике ЕГЭ', 'Бухгалтерские услуги для ИП',
    'Дизайн интерьера', 'Фотограф на мероприятие', 'Видеосъёмка свадеб',
    'Юридические консультации', 'Переводы документов (нотариальные)',
    'Уборка квартир', 'Химчистка мебели', 'Мойка автомобилей с выездом',
    'Установка кондиционеров', 'Натяжные потолки', 'Укладка ламината',
  ],
  descs: [
    'Опыт 10+ лет. Работаю официально, все материалы сертифицированы. Гарантия.',
    'Быстро, качественно, недорого. Выезд по Москве и МО в день заявки.',
    'Индивидуальный подход к каждому клиенту. Бесплатная консультация.',
    'Бригада профессионалов. Сроки соблюдаем, смету выдаём до начала работ.',
    'Работаю с 2015 года. Портфолио в профиле. Первая консультация бесплатно.',
  ],
};

const RENT = {
  titles: [
    'Аренда Tesla Model 3', 'Прокат BMW 3 Series', 'Аренда Mercedes C-Class',
    'Прокат Toyota Camry', 'Аренда Kia Sportage', 'Прокат Hyundai Tucson',
    'Аренда Range Rover', 'Прокат Porsche Macan', 'Аренда Volkswagen Touareg',
    'Прокат Audi A4', 'Аренда Ford Explorer', 'Прокат Chevrolet Tahoe',
    'Аренда Lexus RX', 'Прокат Genesis G80', 'Аренда Volvo XC60',
  ],
  descs: [
    'Машина в отличном состоянии. Страховка КАСКО включена. Залог 10-30к.',
    'Подаём и забираем сами. Без пробегового ограничения по городу.',
    'Минимальный стаж 2 года. Выдаём договор аренды. Топливо за счёт арендатора.',
    'Доступна посуточно и от недели. Скидки при долгосрочной аренде.',
  ],
};

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Казань', 'Екатеринбург',
  'Нижний Новгород', 'Красноярск', 'Самара', 'Ростов-на-Дону', 'Уфа',
  'Краснодар', 'Воронеж', 'Омск', 'Пермь', 'Тюмень', 'Сочи',
];

const DOCX_PATH = process.env.DOCX_PATH || 'c:/Users/Виктор/Desktop/foto.docx';
let DOCX_IMAGE_MAP = null;

function normalizeTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripYear(title) {
  return String(title || '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadDocxImageMap() {
  if (DOCX_IMAGE_MAP) return DOCX_IMAGE_MAP;
  try {
    const dir = await unzipper.Open.file(DOCX_PATH);
    const entry = dir.files.find(f => f.path === 'word/document.xml');
    if (!entry) throw new Error('word/document.xml not found');
    const xml = (await entry.buffer()).toString('utf8');
    const rows = [];
    const paragraphRegex = /<w:p[\s\S]*?<\/w:p>/g;
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    for (const p of xml.match(paragraphRegex) || []) {
      const textParts = [];
      let m;
      while ((m = textRegex.exec(p)) !== null) {
        textParts.push(m[1]);
      }
      const line = textParts.join('').trim();
      if (!line) continue;
      const urlMatch = line.match(/https?:\/\/\S+/);
      if (!urlMatch) continue;
      const url = urlMatch[0].replace(/[).,;\]]+$/, '');
      const title = line.slice(0, line.indexOf(urlMatch[0])).trim().replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '');
      if (title) rows.push({ title, url });
    }
    const parsed = rows;
    DOCX_IMAGE_MAP = new Map(parsed.map(r => [normalizeTitle(r.title), r.url]));
    console.log(`🖼️  Фото из DOCX загружены: ${DOCX_IMAGE_MAP.size}`);
  } catch (err) {
    DOCX_IMAGE_MAP = new Map();
    console.warn('⚠️  Не удалось загрузить foto.docx, использую fallback-картинки');
  }
  return DOCX_IMAGE_MAP;
}

function getDocxImageForTitle(title) {
  const map = DOCX_IMAGE_MAP || new Map();
  const exact = map.get(normalizeTitle(title));
  if (exact) return exact;
  const noYear = map.get(normalizeTitle(stripYear(title)));
  if (noYear) return noYear;
  const target = normalizeTitle(stripYear(title));
  for (const [k, v] of map.entries()) {
    if (!k) continue;
    if (k.includes(target) || target.includes(k)) return v;
  }
  return null;
}

// ─── Изображения: source.unsplash.com — семантический поиск по запросу ────────
// sig=N гарантирует разные фото при одном поисковом запросе

// Маппинг заголовка объявления → поисковый запрос Unsplash
// Порядок важен: более специфичные правила выше
const TITLE_QUERY_MAP = [
  // ── Конкретные авто ────────────────────────────────────────────────────
  [/BMW R\d|BMW GS/i,            'BMW motorcycle adventure'],
  [/Yamaha MT/i,                 'Yamaha MT motorcycle'],
  [/Honda CB/i,                  'Honda CB motorcycle street'],
  [/Kawasaki Z/i,                'Kawasaki Z motorcycle'],
  [/мотоцикл|ducati|harley/i,    'motorcycle bike road'],
  [/Tesla/i,                     'Tesla Model 3 electric car'],
  [/BMW X5/i,                    'BMW X5 SUV black'],
  [/BMW 5|BMW M/i,               'BMW 5 Series sedan'],
  [/BMW/i,                       'BMW car luxury'],
  [/Mercedes.*GLE|Mercedes.*GLC/i,'Mercedes GLE SUV'],
  [/Mercedes/i,                  'Mercedes Benz sedan luxury'],
  [/Audi Q5|Audi Q7/i,           'Audi Q5 SUV'],
  [/Audi A6/i,                   'Audi A6 sedan'],
  [/Audi/i,                      'Audi car quattro'],
  [/Porsche Cayenne/i,           'Porsche Cayenne SUV'],
  [/Porsche/i,                   'Porsche 911 sports car'],
  [/Range Rover Sport/i,         'Range Rover Sport luxury SUV'],
  [/Land Rover/i,                'Land Rover Discovery offroad'],
  [/Lexus/i,                     'Lexus ES luxury sedan'],
  [/Volvo XC/i,                  'Volvo XC90 SUV'],
  [/Toyota RAV4/i,               'Toyota RAV4 SUV crossover'],
  [/Toyota Camry/i,              'Toyota Camry sedan'],
  [/Kia Sportage/i,              'Kia Sportage crossover'],
  [/Hyundai Tucson/i,            'Hyundai Tucson crossover'],
  [/Volkswagen/i,                'Volkswagen car'],
  [/Ford Explorer/i,             'Ford Explorer SUV'],
  [/Chevrolet Tahoe/i,           'Chevrolet Tahoe SUV'],
  [/Jeep Grand Cherokee/i,       'Jeep Grand Cherokee offroad'],
  [/Subaru/i,                    'Subaru Outback car'],
  [/Mitsubishi/i,                'Mitsubishi SUV car'],
  [/Honda Accord/i,              'Honda Accord sedan'],
  [/Nissan/i,                    'Nissan sedan car'],
  [/Mazda/i,                     'Mazda 6 sedan'],
  [/Skoda/i,                     'Skoda Octavia car'],
  [/Genesis/i,                   'Genesis G80 luxury sedan'],
  // ── Недвижимость ───────────────────────────────────────────────────────
  [/Студия/i,                    'studio apartment modern interior'],
  [/1-комнатная/i,               'one room apartment interior cozy'],
  [/2-комнатная/i,               'two bedroom apartment modern interior'],
  [/3-комнатная/i,               'large apartment spacious interior'],
  [/4-комнатная/i,               'luxury apartment interior design'],
  [/Апартамент/i,                'luxury apartment panoramic view'],
  [/Таунхаус/i,                  'townhouse exterior modern'],
  [/Коттедж/i,                   'cottage house country exterior'],
  // ── Смартфоны ──────────────────────────────────────────────────────────
  [/iPhone 15 Pro/i,             'iPhone 15 Pro Apple smartphone'],
  [/iPhone/i,                    'iPhone Apple smartphone white'],
  [/Samsung Galaxy S24/i,        'Samsung Galaxy S24 Ultra smartphone'],
  [/Samsung Galaxy/i,            'Samsung Galaxy smartphone'],
  // ── Ноутбуки ───────────────────────────────────────────────────────────
  [/MacBook Pro/i,               'MacBook Pro Apple laptop desk'],
  [/MacBook/i,                   'MacBook Apple laptop'],
  // ── Планшеты ───────────────────────────────────────────────────────────
  [/iPad Pro/i,                  'iPad Pro Apple tablet desk'],
  [/iPad/i,                      'iPad Apple tablet'],
  // ── Гейминг ────────────────────────────────────────────────────────────
  [/PlayStation 5|PS5/i,         'PlayStation 5 Sony gaming console'],
  [/Xbox Series X/i,             'Xbox Series X Microsoft gaming'],
  [/Nintendo Switch/i,           'Nintendo Switch OLED gaming handheld'],
  // ── Аудио ──────────────────────────────────────────────────────────────
  [/AirPods Pro/i,               'AirPods Pro Apple wireless earbuds'],
  [/AirPods/i,                   'AirPods Apple earbuds white'],
  [/Sony WH-1000/i,              'Sony WH-1000XM5 headphones noise cancelling'],
  [/наушники|headphones/i,       'headphones wireless audio'],
  // ── Дрон ───────────────────────────────────────────────────────────────
  [/DJI Mini/i,                  'DJI Mini drone flying aerial'],
  [/GoPro/i,                     'GoPro Hero camera action sport'],
  // ── Умный дом / бытовая ────────────────────────────────────────────────
  [/Dyson V/i,                   'Dyson V15 cordless vacuum cleaner'],
  [/Roborock|робот.*пылесос/i,   'robot vacuum cleaner smart home'],
  [/De.Longhi|кофемашин/i,       'espresso machine coffee DeLonghi'],
  // ── Телевизор / монитор ────────────────────────────────────────────────
  [/Samsung.*QLED|телевизор/i,   'Samsung QLED 4K TV living room'],
  [/LG UltraWide|монитор/i,      'LG ultrawide monitor workspace setup'],
  [/RTX 4090|видеокарт/i,        'RTX 4090 GPU graphics card'],
  [/Ryzen 9|процессор/i,         'AMD Ryzen processor computer build'],
  [/SSD Samsung|NVMe/i,          'Samsung SSD NVMe storage'],
  // ── Транспорт / активный отдых ─────────────────────────────────────────
  [/Ninebot|электросамокат/i,    'electric scooter city ride'],
  [/Trek Marlin|велосипед/i,     'mountain bike Trek trail'],
  // ── Фото / видео ───────────────────────────────────────────────────────
  [/Sony A7|фотоаппарат/i,       'Sony A7 mirrorless camera photography'],
  [/Canon RF.*85|объектив/i,     'Canon RF lens photography portrait'],
  // ── Музыка ─────────────────────────────────────────────────────────────
  [/Gibson Les Paul/i,           'Gibson Les Paul electric guitar'],
  [/Yamaha DX7|синтезатор/i,     'Yamaha synthesizer keyboard music studio'],
  // ── Мебель / офис ──────────────────────────────────────────────────────
  [/Herman Miller|Aeron/i,       'Herman Miller Aeron office chair ergonomic'],
  [/IKEA.*BEKANT|стол.*IKEA/i,   'IKEA desk home office workspace'],
  [/Arc.teryx|рюкзак.*trek/i,    'Arc\'teryx backpack hiking outdoor'],
  [/Rolex Submariner/i,          'Rolex Submariner watch luxury close-up'],
  // ── Кроссовки ──────────────────────────────────────────────────────────
  [/Air Jordan 1/i,              'Air Jordan 1 Nike sneakers shoes'],
  [/Yeezy Boost 350/i,           'Adidas Yeezy Boost 350 V2 sneakers'],
  [/New Balance 990/i,           'New Balance 990 sneakers grey'],
  [/Asics Gel/i,                 'Asics Gel running shoes'],
  [/Nike/i,                      'Nike sneakers shoes'],
  [/Adidas/i,                    'Adidas shoes sneakers'],
  // ── Уличная мода ───────────────────────────────────────────────────────
  [/Stone Island/i,              'Stone Island jacket streetwear'],
  [/Moncler Maya|Moncler/i,      'Moncler down jacket luxury winter'],
  [/Supreme Box Logo/i,          'Supreme Box Logo hoodie streetwear'],
  [/Off-White/i,                 'Off-White hoodie fashion streetwear'],
  [/Balenciaga/i,                'Balenciaga fashion luxury streetwear'],
  [/Carhartt/i,                  'Carhartt WIP pants streetwear'],
  [/Palm Angels/i,               'Palm Angels shorts fashion luxury'],
  [/Max Mara/i,                  'Max Mara coat elegant fashion'],
  [/Jacquemus|платье/i,          'Jacquemus dress elegant fashion'],
  [/Zimmermann|блузк/i,          'Zimmermann blouse fashion women'],
  [/Levi.s 501|джинс/i,          'Levis 501 jeans denim classic'],
  // ── Аксессуары ─────────────────────────────────────────────────────────
  [/Louis Vuitton Neverfull/i,   'Louis Vuitton Neverfull bag luxury'],
  [/Gucci GG/i,                  'Gucci GG Supreme backpack luxury bag'],
  [/Hermès|ремень/i,             'Hermes belt leather luxury'],
  [/Acne Studios|шапка/i,        'Acne Studios beanie streetwear'],
  [/Burberry|шарф/i,             'Burberry scarf plaid luxury'],
  // ── Услуги ─────────────────────────────────────────────────────────────
  [/Ремонт квартир|ремонт.*ключ/i,'apartment renovation interior workers'],
  [/Сантехник/i,                 'plumber bathroom repair tools professional'],
  [/Электрик/i,                  'electrician work panel installation professional'],
  [/Грузоперевозки|грузчик/i,    'moving truck logistics workers'],
  [/Перетяжка мебели/i,          'furniture upholstery sofa restoration'],
  [/Мастер на час/i,             'handyman tools repair home professional'],
  [/Ремонт техники Apple/i,      'Apple iPhone MacBook repair service'],
  [/Репетитор/i,                 'tutor studying education math student'],
  [/Бухгалтерские/i,             'accountant office business documents'],
  [/Дизайн интерьера/i,          'interior design modern apartment luxury'],
  [/Фотограф на мероприятие/i,   'photographer event portrait professional camera'],
  [/Видеосъёмка свадеб/i,        'wedding videography ceremony couple'],
  [/Юридические/i,               'lawyer office documents business professional'],
  [/Переводы документов/i,       'documents translation notary office'],
  [/Уборка квартир/i,            'house cleaning apartment professional service'],
  [/Химчистка мебели/i,          'sofa cleaning upholstery professional'],
  [/Мойка автомобилей/i,         'car wash detail professional'],
  [/Установка кондиционеров/i,   'air conditioner installation technician'],
  [/Натяжные потолки/i,          'stretch ceiling installation modern interior'],
  [/Укладка ламината/i,          'laminate flooring installation workers'],
  // ── Аренда авто ────────────────────────────────────────────────────────
  [/Аренда Tesla/i,              'Tesla Model 3 rental electric car'],
  [/Прокат BMW|Аренда BMW/i,     'BMW car rental luxury'],
  [/Аренда Mercedes/i,           'Mercedes rental luxury car'],
  [/Аренда Range Rover/i,        'Range Rover rental luxury SUV'],
  [/Прокат Porsche|Аренда Porsche/i,'Porsche rental sports car'],
  [/Аренда Lexus/i,              'Lexus RX rental luxury'],
  [/Прокат Genesis/i,            'Genesis G80 rental luxury sedan'],
  [/Аренда Volvo/i,              'Volvo XC60 rental'],
  [/Прокат Audi/i,               'Audi A4 rental car'],
  [/Прокат Toyota|Аренда Toyota/i,'Toyota Camry rental'],
  [/Прокат Kia|Аренда Kia/i,     'Kia Sportage rental crossover'],
  [/Прокат Hyundai|Аренда Hyundai/i,'Hyundai Tucson rental'],
  [/Прокат Ford|Аренда Ford/i,   'Ford Explorer rental SUV'],
  [/Прокат Chevrolet|Аренда Chevrolet/i,'Chevrolet Tahoe rental SUV'],
];

const CATEGORY_QUERY = {
  transport:  'luxury car sedan road',
  realestate: 'modern apartment interior design',
  items:      'electronics gadget technology',
  clothing:   'fashion style clothing streetwear',
  services:   'professional work service tools',
  rent:       'car rental luxury drive',
};

function titleToQuery(title, category) {
  for (const [re, q] of TITLE_QUERY_MAP) {
    if (re.test(title)) return encodeURIComponent(q);
  }
  return encodeURIComponent(CATEGORY_QUERY[category] || 'product item sale');
}

function getImages(title, category, idx, count = 2) {
  const docxImage = getDocxImageForTitle(title);
  if (docxImage) return [docxImage];
  const q = titleToQuery(title, category);
  return Array.from({ length: count }, (_, i) =>
    `https://source.unsplash.com/600x400/?${q}&sig=${idx * 7 + i + 1}`
  );
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Генераторы по категории ──────────────────────────────────────────────────

function genTransport(idx) {
  const year = randInt(2015, 2024);
  const mileage = randInt(0, 180000);
  const title = rand(TRANSPORT.titles) + ` ${year}`;
  return {
    title,
    description: rand(TRANSPORT.descs),
    category_id: 'transport',
    price: randInt(500000, 14000000),
    condition: mileage < 10000 ? 'Новое' : 'Б/У',
    details: {
      Марка: rand(TRANSPORT.brands),
      Двигатель: rand(TRANSPORT.engines),
      Мощность: rand(TRANSPORT.powers),
      Пробег: `${mileage.toLocaleString('ru-RU')} км`,
      Год: String(year),
      КПП: rand(TRANSPORT.transmissions),
      Привод: rand(TRANSPORT.drives),
    },
    images: getImages(title, 'transport', idx, 2),
  };
}

function genRealestate(idx) {
  const area = randInt(22, 180);
  const rooms = randInt(1, 5);
  const floor = randInt(1, 25);
  const totalFloors = floor + randInt(0, 10);
  const condition = rand(['Вторичка', 'Новостройка']);
  const type = rand(REALESTATE.types);
  const title = `${type} ${rand(REALESTATE.districts)}`;
  return {
    title,
    description: rand(REALESTATE.descs),
    category_id: 'realestate',
    price: randInt(2500000, 45000000),
    condition,
    details: {
      Площадь: `${area} кв.м`,
      Комнат: type.includes('Студия') ? 'Студия' : String(rooms),
      Этаж: `${floor}/${totalFloors}`,
      Ремонт: rand(REALESTATE.renovations),
    },
    images: getImages(title, 'realestate', idx, 2),
  };
}

function genItems(idx) {
  const isNew = Math.random() > 0.45;
  const title = rand(ITEMS.titles);
  return {
    title,
    description: rand(ITEMS.descs),
    category_id: 'items',
    price: randInt(2000, 350000),
    condition: isNew ? 'Новое' : 'Б/У',
    details: {
      Состояние: isNew ? 'Новое, запечатанное' : `${randInt(7, 10)}/10`,
      Гарантия: isNew ? '1 год' : 'Нет',
    },
    images: getImages(title, 'items', idx, 3),
  };
}

function genClothing(idx) {
  const isNew = Math.random() > 0.35;
  const title = rand(CLOTHING.titles);
  return {
    title,
    description: rand(CLOTHING.descs),
    category_id: 'clothing',
    price: randInt(1500, 180000),
    condition: isNew ? 'Новое' : 'Б/У',
    details: {
      Бренд: rand(CLOTHING.brands),
      Размер: rand(CLOTHING.sizes),
      Состояние: isNew ? 'Новое с бирками' : 'Б/У',
    },
    images: getImages(title, 'clothing', idx, 2),
  };
}

function genServices(idx) {
  const title = rand(SERVICES.titles);
  return {
    title,
    description: rand(SERVICES.descs),
    category_id: 'services',
    price: randInt(500, 80000),
    condition: 'Услуга',
    details: {
      Опыт: `${randInt(1, 20)} лет`,
      Выезд: Math.random() > 0.5 ? 'Бесплатно' : 'Платный',
      Гарантия: Math.random() > 0.5 ? 'Да' : 'По договорённости',
    },
    images: getImages(title, 'services', idx, 1),
  };
}

function genRent(idx) {
  const pricePerDay = randInt(2000, 25000);
  const title = rand(RENT.titles);
  return {
    title,
    description: rand(RENT.descs),
    category_id: 'rent',
    price: pricePerDay,
    condition: 'Аренда/сутки',
    details: {
      Залог: `${randInt(10000, 50000).toLocaleString('ru-RU')} ₽`,
      'Мин. стаж': `${randInt(1, 5)} лет`,
      Страховка: 'КАСКО включена',
      'Цена/сутки': `${pricePerDay.toLocaleString('ru-RU')} ₽`,
    },
    images: getImages(title, 'rent', idx, 2),
  };
}

const GENERATORS = [genTransport, genRealestate, genItems, genClothing, genServices, genRent];

// Распределение: 25% transport, 15% real estate, 30% items, 15% clothing, 10% services, 5% rent
const DIST = [
  ...Array(25).fill(0), ...Array(15).fill(1), ...Array(30).fill(2),
  ...Array(15).fill(3), ...Array(10).fill(4), ...Array(5).fill(5),
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await loadDocxImageMap();

  console.log('🚀 Запуск seed400.js...\n');

  // 1. Инициализация БД
  await initDatabase();
  console.log('✅ БД инициализирована');

  // 1.1 Полная пересборка объявлений (чтобы в базе были все 400)
  console.log('🧹 Очистка старых объявлений и связанных данных...');
  runSql('DELETE FROM auction_bids');
  runSql('DELETE FROM favorites');
  runSql('DELETE FROM reviews');
  runSql('DELETE FROM messages');
  runSql('DELETE FROM conversations');
  runSql('DELETE FROM notifications');
  runSql('DELETE FROM orders');
  runSql('DELETE FROM products');
  console.log('✅ Старые объявления удалены');

  // 2. Загрузка реальных пользователей с randomuser.me
  console.log('⏳ Загрузка пользователей с randomuser.me...');
  let apiUsers = [];
  try {
    const res = await fetch('https://randomuser.me/api/?results=40&nat=ru,de,us,fr&inc=name,picture,email,phone,location&seed=wiwang2024');
    const data = await res.json();
    apiUsers = data.results;
    console.log(`✅ Получено ${apiUsers.length} пользователей`);
  } catch (err) {
    console.warn('⚠️  randomuser.me недоступен, генерирую пользователей через faker');
  }

  // 3. Вставка пользователей
  const insertedUserIds = [];

  for (let i = 0; i < 40; i++) {
    const u = apiUsers[i];
    let username, email, phone, city, avatar;

    if (u) {
      username = `${u.name.first}${u.name.last}${randInt(1, 999)}`.replace(/\s/g, '');
      email = `seed_${i}_${u.email}`;
      phone = `+7 ${u.phone?.replace(/[^0-9]/g, '').slice(0, 10)}`;
      city = rand(CITIES);
      avatar = u.picture.large;
    } else {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      username = `${firstName}${lastName}${randInt(1, 999)}`.replace(/\s/g, '');
      email = `seed_${i}_${faker.internet.email()}`;
      phone = faker.phone.number('+7 (9##) ###-##-##');
      city = rand(CITIES);
      avatar = `https://picsum.photos/seed/user_${i}/200/200`;
    }

    // Проверяем уникальность
    const existing = queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing) {
      insertedUserIds.push(existing.id);
      continue;
    }

    const rating = (Math.random() * 2 + 3).toFixed(1); // 3.0 – 5.0
    const totalSales = randInt(0, 60);
    const totalEarnings = totalSales * randInt(5000, 200000);

    runSql(
      'INSERT INTO users (username, email, password, phone, city, avatar, rating, total_sales, total_earnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, '123456', phone, city, avatar, parseFloat(rating), totalSales, totalEarnings]
    );
    const inserted = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (inserted) insertedUserIds.push(inserted.id);
  }

  console.log(`✅ Пользователей в пуле: ${insertedUserIds.length}`);

  // 4. Генерация 400 объявлений
  console.log('⏳ Генерация 400 объявлений...');
  let successCount = 0;

  for (let i = 0; i < 400; i++) {
    const catIdx = DIST[i % DIST.length];
    const gen = GENERATORS[catIdx];
    const product = gen(i);

    const sellerId = rand(insertedUserIds);
    const views = randInt(50, 8000);
    const likes = randInt(0, Math.floor(views * 0.15));
    const daysAgo = randInt(0, 180);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString().replace('T', ' ').slice(0, 19);

    try {
      runSql(
        `INSERT INTO products (title, description, category_id, price, city, condition, views, likes, seller_id, details, images, created_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          product.title,
          product.description,
          product.category_id,
          product.price,
          rand(CITIES),
          product.condition,
          views,
          likes,
          sellerId,
          JSON.stringify(product.details),
          JSON.stringify(product.images),
          createdAt,
        ]
      );
      successCount++;
    } catch (err) {
      // пропускаем дубли
    }

    if ((i + 1) % 50 === 0) {
      process.stdout.write(`  ⏳ ${i + 1}/400\r`);
    }
  }

  console.log(`\n✅ Вставлено объявлений: ${successCount}/400`);

  // 5. Итоговая статистика
  const userCount = queryOne('SELECT COUNT(*) as c FROM users').c;
  const prodCount = queryOne('SELECT COUNT(*) as c FROM products WHERE is_active = 1').c;
  const catCounts = [
    queryOne("SELECT COUNT(*) as c FROM products WHERE category_id='transport' AND is_active=1").c,
    queryOne("SELECT COUNT(*) as c FROM products WHERE category_id='realestate' AND is_active=1").c,
    queryOne("SELECT COUNT(*) as c FROM products WHERE category_id='items' AND is_active=1").c,
    queryOne("SELECT COUNT(*) as c FROM products WHERE category_id='clothing' AND is_active=1").c,
    queryOne("SELECT COUNT(*) as c FROM products WHERE category_id='services' AND is_active=1").c,
    queryOne("SELECT COUNT(*) as c FROM products WHERE category_id='rent' AND is_active=1").c,
  ];

  console.log('\n📊 Итого в БД:');
  console.log(`   👤 Пользователей: ${userCount}`);
  console.log(`   📦 Объявлений: ${prodCount}`);
  console.log(`      🚗 Транспорт:     ${catCounts[0]}`);
  console.log(`      🏠 Недвижимость:  ${catCounts[1]}`);
  console.log(`      📱 Предметы:      ${catCounts[2]}`);
  console.log(`      👟 Одежда:        ${catCounts[3]}`);
  console.log(`      🔧 Услуги:        ${catCounts[4]}`);
  console.log(`      🔑 Аренда:        ${catCounts[5]}`);

  console.log('\n✅ seed400.js завершён! Перезапусти сервер.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
