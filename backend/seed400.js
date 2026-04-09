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

// Маппинг ключевых слов из названия товара → flickr-запрос
const TITLE_KEYWORDS = [
  // Транспорт
  [/bmw/i,            'bmw,car'],
  [/mercedes/i,       'mercedes,car'],
  [/toyota/i,         'toyota,car'],
  [/audi/i,           'audi,car'],
  [/kia/i,            'kia,car'],
  [/hyundai/i,        'hyundai,car'],
  [/volkswagen|vw/i,  'volkswagen,car'],
  [/ford/i,           'ford,car'],
  [/mazda/i,          'mazda,car'],
  [/honda/i,          'honda,car'],
  [/lexus/i,          'lexus,car'],
  [/skoda/i,          'skoda,car'],
  [/nissan/i,         'nissan,car'],
  [/land rover|range rover/i, 'range-rover,car'],
  [/porsche/i,        'porsche,car'],
  [/volvo/i,          'volvo,car'],
  [/subaru/i,         'subaru,car'],
  [/jeep/i,           'jeep,car'],
  [/tesla/i,          'tesla,electric-car'],
  [/chevrolet/i,      'chevrolet,car'],
  [/genesis/i,        'genesis,car'],
  [/mitsubishi/i,     'mitsubishi,car'],
  [/yamaha|kawasaki|ducati/i, 'motorcycle,bike'],
  // Недвижимость
  [/студия/i,         'studio,apartment'],
  [/квартир/i,        'apartment,interior'],
  [/коттедж|дом/i,    'house,real-estate'],
  [/таунхаус/i,       'townhouse,real-estate'],
  [/апартамент/i,     'apartment,luxury'],
  // Электроника
  [/iphone/i,         'iphone,apple'],
  [/samsung.*galaxy/i,'samsung,smartphone'],
  [/macbook/i,        'macbook,laptop'],
  [/ipad/i,           'ipad,tablet'],
  [/playstation|ps5/i,'playstation,gaming'],
  [/xbox/i,           'xbox,gaming'],
  [/nintendo/i,       'nintendo,gaming'],
  [/airpods/i,        'airpods,headphones'],
  [/sony.*wh|наушник/i,'headphones,audio'],
  [/dji/i,            'drone,aerial'],
  [/gopro/i,          'gopro,camera'],
  [/dyson/i,          'dyson,vacuum'],
  [/кофемашин/i,      'coffee,machine'],
  [/робот.*пылесос/i, 'robot,vacuum'],
  [/телевизор/i,      'television,tv'],
  [/монитор/i,        'monitor,computer'],
  [/видеокарт/i,      'graphics-card,computer'],
  [/процессор/i,      'processor,computer'],
  [/самокат/i,        'electric-scooter'],
  [/велосипед/i,      'bicycle,bike'],
  [/фотоаппарат|камер/i,'camera,photography'],
  [/гитар/i,          'guitar,music'],
  [/синтезатор/i,     'synthesizer,music'],
  // Одежда
  [/jordan/i,         'jordan,sneakers'],
  [/yeezy/i,          'yeezy,sneakers'],
  [/new balance/i,    'new-balance,sneakers'],
  [/nike/i,           'nike,shoes'],
  [/adidas/i,         'adidas,shoes'],
  [/asics/i,          'asics,running'],
  [/stone island/i,   'stone-island,streetwear'],
  [/moncler/i,        'moncler,jacket'],
  [/supreme/i,        'supreme,streetwear'],
  [/off.white/i,      'off-white,fashion'],
  [/balenciaga/i,     'balenciaga,fashion'],
  [/gucci/i,          'gucci,fashion'],
  [/louis vuitton/i,  'louis-vuitton,bag'],
  [/рюкзак/i,         'backpack,bag'],
  [/куртк|пуховик/i,  'jacket,fashion'],
  [/пальто/i,         'coat,fashion'],
  [/платье/i,         'dress,fashion'],
  [/джинс/i,          'jeans,fashion'],
  [/сумк/i,           'handbag,fashion'],
  [/часы|rolex/i,     'watch,luxury'],
  [/кресл/i,          'chair,office'],
  [/стол/i,           'desk,furniture'],
  // Услуги
  [/ремонт квартир/i, 'renovation,interior'],
  [/сантехник/i,      'plumber,tools'],
  [/электрик/i,       'electrician,tools'],
  [/грузопер|грузчик/i,'truck,moving'],
  [/мастер на час/i,  'handyman,tools'],
  [/apple|iphone|mac/i,'apple,repair'],
  [/репетитор/i,      'study,education'],
  [/бухгалтер/i,      'accounting,business'],
  [/дизайн/i,         'interior,design'],
  [/фотограф/i,       'photographer,camera'],
  [/видеосъемк/i,     'videography,wedding'],
  [/юридич/i,         'lawyer,business'],
  [/перевод/i,        'translation,document'],
  [/уборк/i,          'cleaning,home'],
  [/химчистк/i,       'cleaning,sofa'],
  [/мойк/i,           'car,wash'],
  [/кондиционер/i,    'air-conditioner,installation'],
  [/потолк/i,         'ceiling,renovation'],
  [/ламинат/i,        'flooring,laminate'],
  [/мебель|перетяжк/i,'furniture,upholstery'],
  // Аренда
  [/аренда tesla/i,   'tesla,car'],
  [/аренда.*bmw|прокат.*bmw/i,'bmw,luxury-car'],
  [/аренда.*mercedes/i,'mercedes,car'],
  [/аренда.*range/i,  'range-rover,luxury'],
  [/аренда.*porsche/i,'porsche,car'],
];

const CATEGORY_FALLBACK = {
  transport:   'car,automobile',
  realestate:  'apartment,interior',
  items:       'electronics,gadget',
  clothing:    'fashion,style',
  services:    'tools,work',
  rent:        'car,rental',
};

function titleToKeywords(title, category) {
  for (const [pattern, kw] of TITLE_KEYWORDS) {
    if (pattern.test(title)) return kw;
  }
  return CATEGORY_FALLBACK[category] || 'product';
}

function flickrUrl(title, category, productIdx, imgIdx = 0) {
  const kw = titleToKeywords(title, category);
  const lock = productIdx * 10 + imgIdx + 1;
  return `https://loremflickr.com/600/400/${kw}?lock=${lock}`;
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
    images: [flickrUrl(title, 'transport', idx, 0), flickrUrl(title, 'transport', idx, 1)],
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
    images: [flickrUrl(title, 'realestate', idx, 0), flickrUrl(title, 'realestate', idx, 1)],
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
    images: [flickrUrl(title, 'items', idx, 0), flickrUrl(title, 'items', idx, 1), flickrUrl(title, 'items', idx, 2)],
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
    images: [flickrUrl(title, 'clothing', idx, 0), flickrUrl(title, 'clothing', idx, 1)],
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
    images: [flickrUrl(title, 'services', idx, 0)],
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
    images: [flickrUrl(title, 'rent', idx, 0), flickrUrl(title, 'rent', idx, 1)],
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
  console.log('🚀 Запуск seed400.js...\n');

  // 1. Инициализация БД
  await initDatabase();
  console.log('✅ БД инициализирована');

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
