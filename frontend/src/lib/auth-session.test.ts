import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  TOKEN_KEY,
  USER_KEY,
  clearAuthSession,
  getTokenExpirationMs,
  handleSessionExpired,
  isTokenExpired,
  resetSessionExpiryGuard,
  shouldSkipLoginRedirect,
} from './auth-session';

function makeToken(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const payload = btoa(JSON.stringify({ exp: expSeconds }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.signature`;
}

describe('getTokenExpirationMs', () => {
  it('extrai expiração do payload JWT', () => {
    const exp = 1_700_000_000;
    expect(getTokenExpirationMs(makeToken(exp))).toBe(exp * 1000);
  });

  it('retorna null para token inválido', () => {
    expect(getTokenExpirationMs('invalid')).toBeNull();
    expect(getTokenExpirationMs('a.b')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('detecta token expirado e válido', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

    const past = Math.floor(Date.now() / 1000) - 60;
    const future = Math.floor(Date.now() / 1000) + 3600;

    expect(isTokenExpired(makeToken(past))).toBe(true);
    expect(isTokenExpired(makeToken(future))).toBe(false);

    vi.useRealTimers();
  });
});

describe('clearAuthSession', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(USER_KEY, 'user');
  });

  it('remove chaves da sessão', () => {
    clearAuthSession();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});

describe('shouldSkipLoginRedirect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ignora login e impressão', () => {
    vi.stubGlobal('location', { pathname: '/login' });
    expect(shouldSkipLoginRedirect()).toBe(true);

    vi.stubGlobal('location', { pathname: '/comandas/1/imprimir' });
    expect(shouldSkipLoginRedirect()).toBe(true);

    vi.stubGlobal('location', { pathname: '/clientes' });
    expect(shouldSkipLoginRedirect()).toBe(false);
  });
});

describe('handleSessionExpired', () => {
  beforeEach(() => {
    resetSessionExpiryGuard();
    localStorage.setItem(TOKEN_KEY, 'tok');
  });

  it('limpa sessão e dispara evento uma vez', () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);

    handleSessionExpired();
    handleSessionExpired();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    resetSessionExpiryGuard();
  });
});
