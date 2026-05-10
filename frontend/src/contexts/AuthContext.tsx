import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, extractError } from '@/lib/api';
import { md5 } from '@/lib/format';

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

const TOKEN_KEY = 'smartlimp:token';
const USER_KEY = 'smartlimp:usuario';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioSessao;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuario) {
      localStorage.setItem(USER_KEY, JSON.stringify(usuario));
    } else {
      localStorage.removeItem(USER_KEY);
    }
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
      setUsuario(data.usuario);
    } catch (err) {
      throw new Error(extractError(err, 'Falha ao realizar login'));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUsuario(null);
  }, []);

  const value = useMemo(() => ({ usuario, loading, login, logout }), [usuario, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve estar dentro de AuthProvider');
  return ctx;
}
