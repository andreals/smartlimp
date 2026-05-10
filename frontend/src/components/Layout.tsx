import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const nav = [
  { to: '/comanda', label: 'Comanda', icon: 'shopping-cart' },
  { to: '/financeiro', label: 'Financeiro', icon: 'bar-chart' },
  { to: '/clientes', label: 'Clientes', icon: 'users' },
  { to: '/pacotes', label: 'Pacotes', icon: 'box' },
  { to: '/pecas', label: 'Peças', icon: 'tag' },
  { to: '/usuarios', label: 'Usuários', icon: 'user' },
];

const icons: Record<string, JSX.Element> = {
  'shopping-cart': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  ),
  'bar-chart': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0">
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

function initials(nome: string | undefined) {
  if (!nome?.trim()) return '?';
  const parts = nome.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 shadow-soft backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-expanded={open}
              aria-label="Abrir menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white shadow-md shadow-brand-500/30">
                SL
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-bold tracking-tight text-slate-900">Smart Limp</div>
                <div className="text-xs font-medium text-slate-500">Lavanderia</div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="hidden items-center gap-3 sm:flex">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600"
                aria-hidden
              >
                {initials(usuario?.nome)}
              </div>
              <div className="text-right">
                <div className="max-w-[10rem] truncate text-sm font-semibold text-slate-800">{usuario?.nome}</div>
                <div className="text-xs text-slate-500">@{usuario?.login}</div>
              </div>
            </div>
            <button type="button" onClick={handleLogout} className="btn-secondary !py-2 !px-3 text-sm">
              Sair
            </button>
          </div>
        </div>
      </header>

      {open && (
        <button
          type="button"
          className="fixed inset-0 top-16 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <aside
          className={`${
            open ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 top-16 z-30 flex w-[min(18rem,100vw-2rem)] flex-col border-r border-slate-200/80 bg-white p-4 shadow-xl transition-transform duration-200 ease-out lg:relative lg:top-0 lg:z-0 lg:h-auto lg:w-64 lg:translate-x-0 lg:flex-shrink-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <nav
            className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-card backdrop-blur-sm lg:sticky lg:top-24"
            onClick={(e) => e.stopPropagation()}
          >
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? 'text-white/90' : 'text-slate-400 group-hover:text-slate-600'}>
                      {icons[item.icon]}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
