import { API_ORIGIN } from '../config.js';

// Бэкенд отдаёт пути вида /uploads/... — для <img src> нужен полный URL на тот же хост, что и API.
export function mediaUrl(src) {
  if (!src) return '';
  if (typeof src !== 'string') return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return `${API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}
