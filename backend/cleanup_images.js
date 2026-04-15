import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, queryAll } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');

async function cleanup() {
  console.log('Starting images cleanup...');
  
  // 1. Initialize DB to read data
  await initDatabase();

  // 2. Collect all used image paths from DB
  const usedImages = new Set();
  
  // From products
  const products = queryAll('SELECT images FROM products');
  products.forEach(p => {
    try {
      const imgs = JSON.parse(p.images || '[]');
      imgs.forEach(img => {
        if (typeof img === 'string' && img.startsWith('/uploads/')) {
          usedImages.add(img.replace('/uploads/', ''));
        }
      });
    } catch (e) {}
  });

  // From users (avatars)
  const users = queryAll('SELECT avatar FROM users');
  users.forEach(u => {
    if (u.avatar && typeof u.avatar === 'string' && u.avatar.startsWith('/uploads/')) {
      usedImages.add(u.avatar.replace('/uploads/', ''));
    }
  });

  console.log(`Found ${usedImages.size} unique images used in database.`);

  // 3. List all files in uploads directory
  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist. Nothing to clean.');
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  let deletedCount = 0;

  files.forEach(file => {
    // Skip hidden files if any
    if (file.startsWith('.')) return;

    if (!usedImages.has(file)) {
      const filePath = path.join(uploadsDir, file);
      try {
        // Double check if it's a file (not a subdirectory)
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`Deleted orphan file: ${file}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`Failed to delete ${file}:`, err.message);
      }
    }
  });

  console.log(`Cleanup complete. Deleted ${deletedCount} unused files.`);
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
