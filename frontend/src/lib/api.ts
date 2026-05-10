import axios, { AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartlimp:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smartlimp:token');
      localStorage.removeItem('smartlimp:usuario');
      const path = window.location.pathname;
      const isLogin = path === '/login';
      const isPrint = path.includes('/imprimir');
      if (!isLogin && !isPrint) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function extractError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  return fallback;
}
