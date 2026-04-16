// Очищает папку uploads от файлов, не используемых в базе данных.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, queryAll } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');

async function cleanup() {
  console.log('Запуск очистки файлов изображений...');
  
  // Шаг 1: инициализируем БД, чтобы прочитать ссылки на используемые файлы.
  await initDatabase();

  // Шаг 2: собираем имена всех файлов, на которые ссылаются записи в БД.
  const usedImages = new Set();
  
  // Берем изображения из карточек объявлений.
  const products = queryAll('SELECT images FROM products');
  products.forEach(p => {
    try {
      // В БД поле images хранится JSON-массивом строк.
      const imgs = JSON.parse(p.images || '[]');
      imgs.forEach(img => {
        // Берем только локальные файлы, загруженные в /uploads/.
        if (typeof img === 'string' && img.startsWith('/uploads/')) {
          // Для сравнения оставляем только имя файла без префикса пути.
          usedImages.add(img.replace('/uploads/', ''));
        }
      });
    } catch (e) {}
  });

  // Также учитываем аватары пользователей.
  const users = queryAll('SELECT avatar FROM users');
  users.forEach(u => {
    if (u.avatar && typeof u.avatar === 'string' && u.avatar.startsWith('/uploads/')) {
      usedImages.add(u.avatar.replace('/uploads/', ''));
    }
  });

  console.log(`В БД найдено ${usedImages.size} уникальных используемых изображений.`);

  // Шаг 3: получаем список реальных файлов на диске в папке uploads.
  if (!fs.existsSync(uploadsDir)) {
    console.log('Папка uploads отсутствует, очищать нечего.');
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  let deletedCount = 0;

  files.forEach(file => {
    // Пропускаем скрытые служебные файлы (если такие есть).
    if (file.startsWith('.')) return;

    // Если файла нет в множестве используемых, считаем его «сиротой» и удаляем.
    if (!usedImages.has(file)) {
      const filePath = path.join(uploadsDir, file);
      try {
        // Дополнительная защита: удаляем только обычные файлы, не директории.
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`Удалён неиспользуемый файл: ${file}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`Не удалось удалить ${file}:`, err.message);
      }
    }
  });

  console.log(`Очистка завершена. Удалено ${deletedCount} неиспользуемых файлов.`);
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Очистка завершилась с ошибкой:', err);
  process.exit(1);
});
