// Базовый адрес API: .env VITE_API_ORIGIN; в dev по умолчанию пустой origin → те же хост/порт что у Vite (прокси на :3000 в vite.config.js).
const explicitOrigin =
  typeof import.meta.env.VITE_API_ORIGIN === 'string' && import.meta.env.VITE_API_ORIGIN.trim() !== ''
    ? import.meta.env.VITE_API_ORIGIN.trim().replace(/\/$/, '')
    : null;

const origin =
  explicitOrigin ??
  (import.meta.env.DEV ? '' : 'http://localhost:3000');

export const API_ORIGIN = origin;
export const API_BASE = origin === '' ? '/api' : `${origin}/api`;
