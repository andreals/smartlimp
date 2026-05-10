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

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px', borderRadius: '12px' },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/comandas/:id/imprimir"
          element={
            <PrivateRoute>
              <ImprimirComandaPage />
            </PrivateRoute>
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
