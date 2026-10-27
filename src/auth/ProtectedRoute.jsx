import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { canAccess } from './rbac';

// Maps pathname → page key
function pathToPage(pathname) {
  const segment = pathname.replace('/', '').split('/')[0] || 'dashboard';
  // Normalize hyphenated path segments to camelCase/no-hyphen page keys
  const PATH_MAP = {
    'po-generator': 'pogenerator',
    'live-tracking': 'livetracking',
    'credit-notes': 'creditnotes',
    'employee-management': 'employeemanage',
  };
  return PATH_MAP[segment] ?? segment;
}

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const page = pathToPage(location.pathname);
  if (page && page !== 'login' && !canAccess(user.role, page)) {
    return <AccessDenied />;
  }

  return children;
}

function AccessDenied() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', padding: 32,
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1c2833', marginBottom: 8 }}>
        Access Denied
      </div>
      <div style={{ fontSize: 14, color: '#718096', maxWidth: 360, lineHeight: 1.6 }}>
        You don't have permission to view this page. Contact your administrator if you think this is a mistake.
      </div>
      <a href="/dashboard" style={{
        marginTop: 24, padding: '10px 24px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        color: '#fff', borderRadius: 10, textDecoration: 'none',
        fontSize: 13, fontWeight: 700,
        boxShadow: '0 4px 12px rgba(185,28,28,0.3)',
      }}>
        Go to Dashboard
      </a>
    </div>
  );
}
