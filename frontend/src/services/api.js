import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to all requests automatically
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle session invalidation cleanly on 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/verify-otp');
      if (!isAuthRoute) {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

export const getApiBaseUrl = () => {
  return API.defaults.baseURL || 'http://localhost:5000/api';
};

export const getApiHostUrl = () => {
  const base = getApiBaseUrl();
  return base.endsWith('/api') ? base.slice(0, -4) : base;
};

export default API;
