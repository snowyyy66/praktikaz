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
  // Убираем старый dev-override, который мог залипнуть и ломать вход.
  if (sessionStorage.getItem('userIdOverride') != null) {
    sessionStorage.removeItem('userIdOverride');
  }
  return localStorage.getItem('userId') || null;
};

export const isAdmin = () => localStorage.getItem('isAdmin') === '1';

export const api = {
  /** Вход: проверяет почту/пароль, пишет userId в localStorage */
  login: async (credentials) => {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.success) {
      localStorage.setItem('userId', res.user_id);
      localStorage.setItem('isAdmin', res.is_admin ? '1' : '0');
    }
    return res;
  },

  /** Регистрация: создаёт пользователя, пишет userId в localStorage */
  register: async (data) => {
    const res = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) {
      localStorage.setItem('userId', res.user_id);
      localStorage.setItem('isAdmin', res.is_admin ? '1' : '0');
    }
    return res;
  },

  /** Выход: очищает localStorage и dev-override сессии */
  logout: () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
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
    return fetchApi(`/products${qs ? '?' + qs : ''}`).then((data) => {
      if (Array.isArray(data)) {
        return { items: data, page: 1, limit: data.length, has_more: false };
      }
      return data;
    });
  },

  /** Одно объявление по id; подставляет user_id для флага «в избранном» */
  getProduct: (id) => {
    const uid = getUserId();
    const q = uid ? `?user_id=${encodeURIComponent(uid)}` : '';
    return fetchApi(`/products/${id}${q}`);
  },
  incrementProductViews: (id) => {
    const uid = getUserId();
    const q = uid ? `?user_id=${encodeURIComponent(uid)}` : '';
    return fetchApi(`/products/${id}/views${q}`, { method: 'POST' });
  },
  /** История ставок по аукционному лоту */
  getProductBids: (id) => fetchApi(`/products/${id}/bids`),
  /** Сделать ставку на аукцион */
  placeBid: (id, bidderId, amount) =>
    fetchApi(`/products/${id}/bids`, { method: 'POST', body: JSON.stringify({ bidder_id: bidderId, amount }) }),
  /** Увеличить счётчик лайков (устаревший сценарий; избранное — через toggleFavorite) */
  likeProduct: (id) => fetchApi(`/products/${id}/like`, { method: 'POST' }),
  /** Обновить объявление */
  updateProduct: (id, data, actorId = getUserId()) => fetchApi(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, seller_id: data?.seller_id ?? getUserId(), actor_id: actorId })
  }),
  /** Снять объявление с публикации (мягкое удаление) */
  deleteProduct: (id, sellerId = getUserId(), actorId = getUserId()) =>
    fetchApi(`/products/${id}?seller_id=${encodeURIComponent(sellerId)}&actor_id=${encodeURIComponent(actorId)}`, { method: 'DELETE' }),
  /** Загрузить фото объявления (multipart) */
  uploadProductImages: async (productId, sellerId, files, actorId = getUserId()) => {
    const fd = new FormData();
    for (const f of files) fd.append('images', f);
    fd.append('seller_id', sellerId);
    fd.append('actor_id', actorId);
    const res = await fetch(`http://localhost:3000/api/products/${productId}/images`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `API Error: ${res.status}`);
    return data;
  },
  /** Удалить одну фото из объявления */
  deleteProductImage: (productId, imageUrl, sellerId = getUserId(), actorId = getUserId()) =>
    fetchApi(`/products/${productId}/images`, {
      method: 'DELETE',
      body: JSON.stringify({ image_url: imageUrl, seller_id: sellerId, actor_id: actorId })
    }),


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
    fetchApi('/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, product_id: productId })
    }),

  /** Получить занятые слоты на дату */
  getProductAvailability: (id, date) => fetchApi(`/products/${id}/availability?date=${encodeURIComponent(date)}`),
  /** История заказов пользователя (покупки и продажи) */
  getUserOrders: (userId) => fetchApi(`/users/${userId}/orders`),
  /** Оформить покупку/аренду; для аренды передать options.rent_hours */
  createOrder: (buyerId, productId, data = {}) =>
    fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify({
        buyer_id: buyerId,
        product_id: productId,
        ...data
      }),
    }),

  /** Загрузить аватар (multipart, не через fetchApi) */
  uploadAvatar: (userId, file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return fetch(`http://localhost:3000/api/users/${userId}/avatar`, { method: 'POST', body: fd })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `API Error: ${r.status}`);
        return data;
      });
  },

  /** Отзывы к товару (показываются на странице товара, если это услуги) */
  getProductReviews: (productId) => fetchApi(`/reviews?product_id=${productId}`),
  /** Проверить, можно ли оставить/изменить отзыв (был ли заказ) */
  checkReview: (userId, productId) => fetchApi(`/reviews/check?user_id=${userId}&product_id=${productId}`),
  /** Оставить отзыв (после покупки или на услуги) */
  createReview: (data) => fetchApi('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  /** Изменить свой отзыв */
  updateReview: (id, data) => fetchApi(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  /** Загрузить медиа для отзыва (параллельно загрузке фото в объявлении) */
  uploadReviewMedia: async (files) => {
    const fd = new FormData();
    for (const f of files) fd.append('images', f);
    const res = await fetch(`http://localhost:3000/api/reviews/upload`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `API Error: ${res.status}`);
    return data;
  },
  /** Все отзывы о продавце (для профиля) */
  getUserReviews: (userId) => fetchApi(`/reviews/seller/${userId}`),
  /** Альянс для совместимости с ProfilePage */
  getUserReviewsList: (userId) => fetchApi(`/reviews/seller/${userId}`),
  /** Все отзывы, оставленные этим пользователем */
  getReviewsByReviewer: (userId) => fetchApi(`/reviews/reviewer/${userId}`),

  /** Список диалогов пользователя */
  getConversations: (userId) => fetchApi(`/conversations?user_id=${userId}`),
  /** Админка: все объявления */
  getAdminProducts: (userId) => fetchApi(`/admin/products?user_id=${encodeURIComponent(userId)}`),
  /** Найти или создать чат между двумя пользователями (опционально по объявлению) */
  createConversation: (user1_id, user2_id, product_id) =>
    fetchApi('/conversations', { method: 'POST', body: JSON.stringify({ user1_id, user2_id, product_id }) }),
  /** Сообщения в диалоге */
  getMessages: (convId, userId = getUserId()) => fetchApi(`/conversations/${convId}/messages?user_id=${encodeURIComponent(userId)}`),
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
