import { useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import MainLayout from './layout/MainLayout';
import AppRoutes from './routes/AppRoutes';
import { ToastContainer } from './components/common/Toast';

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const isVendorPortal = location.pathname.startsWith('/vendor/');
  const activePage = location.pathname.replace('/', '').split('/')[0] || 'dashboard';

  return (
    <AuthProvider>
      {isLogin || isVendorPortal ? (
        <AppRoutes />
      ) : (
        <MainLayout activePage={activePage}>
          <AppRoutes />
        </MainLayout>
      )}
      <ToastContainer />
    </AuthProvider>
  );
}