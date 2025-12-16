// src/api.js

import axios from 'axios';

// Base URL do backend memória (ajusta conforme o teu docker-compose ou env)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/memoria';

// Axios instance dedicado
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // se usares cookies
});

// Interceptor para adicionar token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken'); // ou onde guardas o token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor de resposta para erros comuns (ex: 401 → logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login'; // ou redirect para login global
    }
    return Promise.reject(error);
  }
);

export default api;
