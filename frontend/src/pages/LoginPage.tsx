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
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-slate-300/35 blur-3xl"
        aria-hidden
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white shadow-lg shadow-brand-600/35 ring-4 ring-white/50">
            SL
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Smart Limp</h1>
            <p className="text-sm font-medium text-slate-500">Lavanderia — acesso ao sistema</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card space-y-5 shadow-card">
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

        <p className="mt-8 text-center text-xs font-medium text-slate-400">
          Smart Limp © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
