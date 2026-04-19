// Единый клиент бэкенда: fetchApi для JSON, multipart для файлов.
import { API_BASE } from './config.js';

function pickErrorMessage(data, res) {
  if (data && typeof data === 'object') {
    const err = typeof data.error === 'string' ? data.error.trim() : '';
    const detail = typeof data.detail === 'string' ? data.detail.trim() : '';
    if (err && detail && err !== detail) return `${err} — ${detail}`;
    const e = err || detail || data.title;
    if (typeof e === 'string' && e.trim()) return e.trim();
    if (data.errors && typeof data.errors === 'object') {
      const first = Object.values(data.errors).flat?.()[0];
      if (typeof first === 'string') return first;
    }
  }
  return `Ошибка API (${res.status} ${res.statusText || ''})`.trim();
}

export async function fetchApi(endpoint, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (e) {
    const isNetwork =
      e instanceof TypeError && (e.message === 'Failed to fetch' || e.message.includes('fetch'));
    throw new Error(
      isNetwork
        ? 'Сервер API не отвечает. Запустите backend: в корне проекта npm run dev (нужны и API, и Vite).'
        : e instanceof Error
          ? e.message
          : String(e),
    );
  }

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!res.ok) throw new Error(pickErrorMessage(data, res));

  return data;
}

// Текущий пользователь после логина (строка id в localStorage)
export const getUserId = () => {
  if (sessionStorage.getItem('userIdOverride') != null) sessionStorage.removeItem('userIdOverride');
  return localStorage.getItem('userId') || null;
};

export const isAdmin = () => localStorage.getItem('isAdmin') === '1';

export const api = {
  // --- авторизация ---
  login: async (credentials) => {
    const res = await fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    if (res.success) {
      localStorage.setItem('userId', res.user_id);
      localStorage.setItem('isAdmin', res.is_admin ? '1' : '0');
    }
    return res;
  },

  register: async (data) => {
    const res = await fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) });
    if (!res.success)
      throw new Error(typeof res.error === 'string' ? res.error : 'Регистрация не завершилась успешно');
    localStorage.setItem('userId', res.user_id);
    localStorage.setItem('isAdmin', res.is_admin ? '1' : '0');
    return res;
  },

  logout: () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
  },

  // --- объявления (товары) ---
  createProduct: (productData) => fetchApi('/products', { method: 'POST', body: JSON.stringify(productData) }),

  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/products${qs ? '?' + qs : ''}`).then((data) => {
      if (Array.isArray(data)) return { items: data, page: 1, limit: data.length, has_more: false };
      return data;
    });
  },

  getProduct: (id) => {
    const uid = getUserId();
    const q = uid ? `?user_id=${encodeURIComponent(uid)}` : '';
    return fetchApi(`/products/${id}${q}`);
  },
  incrementProductViews: (id) => fetchApi(`/products/${id}/views`, { method: 'POST' }),
  getProductBids: (id) => fetchApi(`/products/${id}/bids`),
  placeBid: (id, bidderId, amount) =>
    fetchApi(`/products/${id}/bids`, { method: 'POST', body: JSON.stringify({ bidder_id: bidderId, amount }) }),
  likeProduct: (id) => fetchApi(`/products/${id}/like`, { method: 'POST' }),
  updateProduct: (id, data, actorId = getUserId()) =>
    fetchApi(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...data, seller_id: data?.seller_id ?? getUserId(), actor_id: actorId }),
    }),
  deleteProduct: (id, sellerId = getUserId(), actorId = getUserId()) =>
    fetchApi(`/products/${id}?seller_id=${encodeURIComponent(sellerId)}&actor_id=${encodeURIComponent(actorId)}`, { method: 'DELETE' }),
  uploadProductImages: async (productId, sellerId, files, actorId = getUserId()) => {
    const fd = new FormData();
    for (const f of files) fd.append('images', f);
    fd.append('seller_id', sellerId);
    fd.append('actor_id', actorId);
    const res = await fetch(`${API_BASE}/products/${productId}/images`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `API Error: ${res.status}`);
    return data;
  },
  deleteProductImage: (productId, imageUrl, sellerId = getUserId(), actorId = getUserId()) =>
    fetchApi(`/products/${productId}/images`, {
      method: 'DELETE',
      body: JSON.stringify({ image_url: imageUrl, seller_id: sellerId, actor_id: actorId }),
    }),

  search: (q) => fetchApi(`/search?q=${encodeURIComponent(q)}`),
  getCategories: () => fetchApi('/categories'),

  // --- профиль и статистика ---
  getUser: (id) => fetchApi(`/users/${id}`),
  updateUser: (id, userData) => fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
  getUserProducts: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/users/${id}/products${qs ? '?' + qs : ''}`).then((data) =>
      Array.isArray(data) ? data : data.items ?? []
    );
  },
  getMyProductsPaged: (sellerId, params = {}) => {
    const qs = new URLSearchParams({ seller_id: sellerId, ...params }).toString();
    return fetchApi(`/products/my?${qs}`);
  },
  getUserStats: (id, opts = {}) => {
    const q = new URLSearchParams();
    if (opts.from) q.set('from', opts.from);
    if (opts.to) q.set('to', opts.to);
    if (opts.product_ids) q.set('product_ids', opts.product_ids);
    const qs = q.toString();
    return fetchApi(`/users/${id}/stats${qs ? '?' + qs : ''}`);
  },

  getUserFavorites: (userId) => fetchApi(`/users/${userId}/favorites`),
  toggleFavorite: (userId, productId) =>
    fetchApi('/favorites', { method: 'POST', body: JSON.stringify({ user_id: userId, product_id: productId }) }),

  // --- заказы и слоты услуг ---
  getProductAvailability: (id, date) => fetchApi(`/products/${id}/availability?date=${encodeURIComponent(date)}`),
  getUserOrders: (userId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/users/${userId}/orders${qs ? '?' + qs : ''}`).then((data) =>
      Array.isArray(data) ? data : data.items ?? []
    );
  },
  getUserOrdersRaw: (userId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/users/${userId}/orders${qs ? '?' + qs : ''}`);
  },
  createOrder: (buyerId, productId, data = {}) =>
    fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify({ buyer_id: buyerId, product_id: productId, ...data }),
    }),

  uploadAvatar: (userId, file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return fetch(`${API_BASE}/users/${userId}/avatar`, { method: 'POST', body: fd }).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `API Error: ${r.status}`);
      return data;
    });
  },

  // --- отзывы ---
  getProductReviews: (productId) => fetchApi(`/products/${productId}/reviews`),
  createReview: (data) => fetchApi('/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // --- чаты и админка ---
  getConversations: (userId) => fetchApi(`/conversations?user_id=${userId}`),
  getAdminProducts: (userId) => fetchApi(`/admin/products?user_id=${encodeURIComponent(userId)}`),
  createConversation: (user1_id, user2_id, product_id) =>
    fetchApi('/conversations', { method: 'POST', body: JSON.stringify({ user1_id, user2_id, product_id }) }),
  getMessages: (convId, userId = getUserId()) =>
    fetchApi(`/conversations/${convId}/messages?user_id=${encodeURIComponent(userId)}`),
  sendMessage: (convId, senderId, text) =>
    fetchApi(`/conversations/${convId}/messages`, { method: 'POST', body: JSON.stringify({ sender_id: senderId, text }) }),

  // --- уведомления ---
  getNotifications: (userId) => fetchApi(`/users/${userId}/notifications`),
  markNotificationRead: (id) => fetchApi(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: (userId) => fetchApi(`/users/${userId}/notifications/read-all`, { method: 'PUT' }),
};
