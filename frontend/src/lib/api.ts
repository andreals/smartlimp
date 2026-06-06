import axios, { AxiosError } from 'axios';
import { handleSessionExpired, isTokenExpired, TOKEN_KEY } from '@/lib/auth-session';

const baseURL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 30000,
});

const SESSION_EXPIRED_CANCEL = 'session-expired';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return config;
  if (isTokenExpired(token)) {
    handleSessionExpired();
    return Promise.reject(new axios.CanceledError(SESSION_EXPIRED_CANCEL));
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      handleSessionExpired();
      return Promise.reject(new axios.CanceledError(SESSION_EXPIRED_CANCEL));
    }
    return Promise.reject(error);
  },
);

export function extractError(err: unknown, fallback: string): string {
  if (axios.isCancel(err)) return '';
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  return fallback;
}
