import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';


const API_BASE_URL = 'https://namami-infotech.com/inventry-invoice/api';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) { }
  return config;
});

export const authService = {
  login: async (identifier, password) => {
    try {
      return await api.post('/auth/login', { identifier, password });
    } catch (err) {
      // Fallback if /auth route isn't available
      if (err.response && err.response.status === 404) {
        return await api.post('/users/login', { identifier, password });
      }
      throw err;
    }
  },
  getMe: () => api.get('/auth/me'),
  logout: () => {
    try {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    } catch (e) { }
  },
  getCurrentUser: () => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
  saveSession: (token, user) => {
    try {
      if (token) localStorage.setItem('admin_token', token);
      if (user) localStorage.setItem('admin_user', JSON.stringify(user));
    } catch (e) { }
  }
};

export const itemService = {
  getAll: (search = '') => api.get(`/items?search=${encodeURIComponent(search)}`),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`)
};

export const userService = {
  getAll: (role = '', search = '') => api.get(`/users?role=${role}&search=${encodeURIComponent(search)}`),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

export const settingService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data)
};

export const invoiceService = {
  getAll: (status = '', search = '') => api.get(`/invoices?status=${status}&search=${encodeURIComponent(search)}`),
  getById: (id) => api.get(`/invoices/${id}`),
  getNextNumber: () => api.get('/invoices/next-number'),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }),
  updatePhone: (id, data) => api.patch(`/invoices/${id}/phone`, data),
  delete: (id) => api.delete(`/invoices/${id}`)
};

export default api;
