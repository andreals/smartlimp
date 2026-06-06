import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extractError } from '@/lib/api';
import { md5 } from '@/lib/format';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearAuthSession,
  getTokenExpirationMs,
  handleSessionExpired,
  isTokenExpired,
  resetSessionExpiryGuard,
  shouldSkipLoginRedirect,
  TOKEN_KEY,
  USER_KEY,
} from '@/lib/auth-session';

interface UsuarioSessao {
  id: number;
  nome: string;
  login: string;
  status: string;
}

interface AuthContextValue {
  usuario: UsuarioSessao | null;
  loading: boolean;
  login(loginValue: string, senha: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUsuario(): UsuarioSessao | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || isTokenExpired(token)) {
    clearAuthSession();
    return null;
  }
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsuarioSessao;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(() => readStoredUsuario());
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    clearAuthSession();
    resetSessionExpiryGuard();
    setUsuario(null);
  }, []);

  const expireSession = useCallback(() => {
    clearAuthSession();
    setUsuario(null);
    if (!shouldSkipLoginRedirect()) {
      toast.error('Sessão expirada. Faça login novamente.');
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const onExpired = () => expireSession();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
  }, [expireSession]);

  useEffect(() => {
    if (usuario) {
      localStorage.setItem(USER_KEY, JSON.stringify(usuario));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;

    let timerId: ReturnType<typeof setTimeout> | undefined;

    const armTimer = () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || isTokenExpired(token)) {
        handleSessionExpired();
        return;
      }
      const expMs = getTokenExpirationMs(token);
      if (!expMs) {
        handleSessionExpired();
        return;
      }
      const remaining = expMs - Date.now();
      if (remaining <= 0) {
        handleSessionExpired();
        return;
      }
      timerId = window.setTimeout(() => handleSessionExpired(), remaining);
    };

    armTimer();

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || isTokenExpired(token)) {
        handleSessionExpired();
        return;
      }
      if (timerId) clearTimeout(timerId);
      armTimer();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [usuario]);

  const login = useCallback(async (loginValue: string, senha: string) => {
    setLoading(true);
    try {
      const senhaHash = await md5(senha);
      const { data } = await api.post<{
        token: string;
        usuario: UsuarioSessao;
      }>('/auth/login', { login: loginValue, senha: senhaHash });
      localStorage.setItem(TOKEN_KEY, data.token);
      resetSessionExpiryGuard();
      setUsuario(data.usuario);
    } catch (err) {
      throw new Error(extractError(err, 'Falha ao realizar login'));
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({ usuario, loading, login, logout }), [usuario, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve estar dentro de AuthProvider');
  return ctx;
}
