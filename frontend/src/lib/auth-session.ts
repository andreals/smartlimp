export const TOKEN_KEY = 'smartlimp:token';
export const USER_KEY = 'smartlimp:usuario';
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenExpirationMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return null;
  return exp * 1000;
}

export function isTokenExpired(token: string): boolean {
  const expMs = getTokenExpirationMs(token);
  if (!expMs) return true;
  return Date.now() >= expMs;
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function shouldSkipLoginRedirect(): boolean {
  const path = window.location.pathname;
  return path === '/login' || path.includes('/imprimir');
}

let sessionExpiryInProgress = false;

export function resetSessionExpiryGuard(): void {
  sessionExpiryInProgress = false;
}

export function handleSessionExpired(): void {
  if (sessionExpiryInProgress) return;
  sessionExpiryInProgress = true;
  clearAuthSession();
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}
