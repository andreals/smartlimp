import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import ComandaPage from '@/pages/ComandaPage';
import FinanceiroPage from '@/pages/FinanceiroPage';
import ClientesPage from '@/pages/ClientesPage';
import PacotesPage from '@/pages/PacotesPage';
import PecasPage from '@/pages/PecasPage';
import UsuariosPage from '@/pages/UsuariosPage';
import ImprimirComandaPage from '@/pages/ImprimirComandaPage';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

/** Impressão: valida só o JWT (localStorage). Evita aba nova sem `usuario` hidratado no contexto. */
function RequireAuthToken({ children }: { children: JSX.Element }) {
  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('smartlimp:token') : null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 400000 }}
        toastOptions={{
          duration: 4000,
          className: '!bg-white !text-slate-800 !shadow-card !border !border-slate-200/80',
          style: { fontSize: '14px', borderRadius: '14px', padding: '12px 16px' },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error: { iconTheme: { primary: '#e11d48', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/comandas/:id/imprimir"
          element={
            <RequireAuthToken>
              <ImprimirComandaPage />
            </RequireAuthToken>
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/comanda" replace />} />
          <Route path="comanda" element={<ComandaPage />} />
          <Route path="financeiro" element={<FinanceiroPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="pacotes" element={<PacotesPage />} />
          <Route path="pecas" element={<PecasPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/comanda" replace />} />
      </Routes>
    </>
  );
}
