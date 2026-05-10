import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [loginValue, setLogin] = useState('');
  const [senha, setSenha] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loginValue.trim().length < 3 || senha.length < 5) {
      toast.error('Login ou senha inválidos');
      return;
    }
    try {
      await login(loginValue.trim(), senha);
      navigate('/comanda', { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-100 via-white to-brand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500 text-2xl font-bold text-white shadow-lg shadow-brand-500/30">
            SL
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Smart Limp Lavanderia</h1>
          <p className="text-sm text-slate-500">Faça login para continuar</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label htmlFor="login">Login</label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              className="input mt-1"
              placeholder="Seu login"
              value={loginValue}
              onChange={(e) => setLogin(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              className="input mt-1"
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Acessando...' : 'Acessar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Smart Limp © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
