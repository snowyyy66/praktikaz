const API_BASE = 'http://localhost:3000/api';

// Current user (mock auth — user ID 1)


export async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const getUserId = () => {
  return localStorage.getItem('userId') || null;
};

export const api = {
  // Auth
  login: async (credentials) => {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.success) localStorage.setItem('userId', res.user_id);
    return res;
  },
  
  register: async (data) => {
    const res = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) localStorage.setItem('userId', res.user_id);
    return res;
  },

  logout: () => {
    localStorage.removeItem('userId');
  },

  // Products
  createProduct: (productData) =>
    fetchApi('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),

  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/products${qs ? '?' + qs : ''}`);
  },
  
  getProduct: (id) => fetchApi(`/products/${id}`),
  likeProduct: (id) => fetchApi(`/products/${id}/like`, { method: 'POST' }),

  // Search
  search: (q) => fetchApi(`/search?q=${encodeURIComponent(q)}`),

  // Categories
  getCategories: () => fetchApi('/categories'),

  // Users
  getUser: (id) => fetchApi(`/users/${id}`),
  updateUser: (id, userData) => fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
  getUserProducts: (id) => fetchApi(`/users/${id}/products`),
  getUserStats: (id) => fetchApi(`/users/${id}/stats`),

  // Favorites
  getUserFavorites: (userId) => fetchApi(`/users/${userId}/favorites`),
  toggleFavorite: (userId, productId) => 
    fetchApi('/favorites', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, product_id: productId })
    }),

  // Orders
  getUserOrders: (userId) => fetchApi(`/users/${userId}/orders`),
};
