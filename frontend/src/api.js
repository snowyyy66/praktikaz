const API_BASE = 'http://localhost:3000/api';

/** HTTP-запрос к API: парсит JSON, при ошибке кидает Error с текстом сервера */
export async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API Error: ${res.status}`);
  return data;
}

/** ID текущего пользователя: сначала dev-override в sessionStorage, иначе после логина — localStorage */
export const getUserId = () => {
  return sessionStorage.getItem('userIdOverride') || localStorage.getItem('userId') || null;
};

export const api = {
  /** Вход: проверяет почту/пароль, пишет userId в localStorage */
  login: async (credentials) => {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.success) localStorage.setItem('userId', res.user_id);
    return res;
  },

  /** Регистрация: создаёт пользователя, пишет userId в localStorage */
  register: async (data) => {
    const res = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) localStorage.setItem('userId', res.user_id);
    return res;
  },

  /** Выход: очищает localStorage и dev-override сессии */
  logout: () => {
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userIdOverride');
  },

  /** Создать объявление (тело — поля товара + seller_id) */
  createProduct: (productData) =>
    fetchApi('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),

  /** Список объявлений (фильтры: category, search, sort, auction, user_id для избранного) */
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/products${qs ? '?' + qs : ''}`);
  },

  /** Одно объявление по id; подставляет user_id для флага «в избранном» */
  getProduct: (id) => {
    const uid = getUserId();
    const q = uid ? `?user_id=${encodeURIComponent(uid)}` : '';
    return fetchApi(`/products/${id}${q}`);
  },
  /** История ставок по аукционному лоту */
  getProductBids: (id) => fetchApi(`/products/${id}/bids`),
  /** Сделать ставку на аукцион */
  placeBid: (id, bidderId, amount) =>
    fetchApi(`/products/${id}/bids`, { method: 'POST', body: JSON.stringify({ bidder_id: bidderId, amount }) }),
  /** Увеличить счётчик лайков (устаревший сценарий; избранное — через toggleFavorite) */
  likeProduct: (id) => fetchApi(`/products/${id}/like`, { method: 'POST' }),
  /** Обновить объявление */
  updateProduct: (id, data) => fetchApi(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  /** Снять объявление с публикации (мягкое удаление) */
  deleteProduct: (id) => fetchApi(`/products/${id}`, { method: 'DELETE' }),

  /** Поиск по названию и описанию */
  search: (q) => fetchApi(`/search?q=${encodeURIComponent(q)}`),

  /** Все категории */
  getCategories: () => fetchApi('/categories'),

  /** Профиль пользователя по id */
  getUser: (id) => fetchApi(`/users/${id}`),
  /** Сохранить имя, телефон, город в профиле */
  updateUser: (id, userData) => fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
  /** Активные объявления продавца */
  getUserProducts: (id) => fetchApi(`/users/${id}/products`),
  /** Сводная статистика продавца/покупателя */
  getUserStats: (id) => fetchApi(`/users/${id}/stats`),

  /** Список избранного пользователя */
  getUserFavorites: (userId) => fetchApi(`/users/${userId}/favorites`),
  /** Добавить/убрать товар в избранном (переключатель) */
  toggleFavorite: (userId, productId) => 
    fetchApi('/favorites', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, product_id: productId })
    }),

  /** История заказов пользователя (покупки и продажи) */
  getUserOrders: (userId) => fetchApi(`/users/${userId}/orders`),
  /** Оформить покупку/аренду; для аренды передать options.rent_hours */
  createOrder: (buyerId, productId, options = {}) =>
    fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify({
        buyer_id: buyerId,
        product_id: productId,
        ...(options.rent_hours != null ? { rent_hours: options.rent_hours } : {}),
      }),
    }),

  /** Загрузить аватар (multipart, не через fetchApi) */
  uploadAvatar: (userId, file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return fetch(`http://localhost:3000/api/users/${userId}/avatar`, { method: 'POST', body: fd }).then(r => r.json());
  },

  /** Отзывы к товару */
  getProductReviews: (productId) => fetchApi(`/products/${productId}/reviews`),
  /** Оставить отзыв (после покупки) */
  createReview: (data) => fetchApi('/reviews', { method: 'POST', body: JSON.stringify(data) }),

  /** Список диалогов пользователя */
  getConversations: (userId) => fetchApi(`/conversations?user_id=${userId}`),
  /** Найти или создать чат между двумя пользователями (опционально по объявлению) */
  createConversation: (user1_id, user2_id, product_id) =>
    fetchApi('/conversations', { method: 'POST', body: JSON.stringify({ user1_id, user2_id, product_id }) }),
  /** Сообщения в диалоге */
  getMessages: (convId) => fetchApi(`/conversations/${convId}/messages`),
  /** Отправить сообщение в диалог */
  sendMessage: (convId, senderId, text) =>
    fetchApi(`/conversations/${convId}/messages`, { method: 'POST', body: JSON.stringify({ sender_id: senderId, text }) }),

  /** Уведомления пользователя */
  getNotifications: (userId) => fetchApi(`/users/${userId}/notifications`),
  /** Пометить одно уведомление прочитанным */
  markNotificationRead: (id) => fetchApi(`/notifications/${id}/read`, { method: 'PUT' }),
  /** Пометить все уведомления прочитанными */
  markAllNotificationsRead: (userId) => fetchApi(`/users/${userId}/notifications/read-all`, { method: 'PUT' }),
};
