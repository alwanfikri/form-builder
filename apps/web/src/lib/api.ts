import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// In production (GitHub Pages), __API_URL__ is injected at build time via vite define.
// In dev, proxy handles /api → localhost:3000.
declare const __API_URL__: string;
const BASE = typeof __API_URL__ !== 'undefined' && import.meta.env.PROD
  ? `${__API_URL__}/api/v1`
  : '/api/v1';

const api = axios.create({ baseURL: BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// For public form fetches (/s/:code) that go directly to API in production
export const apiBase = typeof __API_URL__ !== 'undefined' && import.meta.env.PROD
  ? __API_URL__
  : '';
