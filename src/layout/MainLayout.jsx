import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function MainLayout({ activePage, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [isMobile, setIsMobile]       = useState(false);
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 768);
      setCollapsed(w <= 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sidebarW = isMobile ? 0 : collapsed ? 68 : 256;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8' }}>
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
        }} />
      )}

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      <div style={{
        flex: 1,
        marginLeft: sidebarW,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)',
        minWidth: 0,
        overflow: 'hidden',
        background: '#f0f4f8',
      }}>
        <Navbar activePage={activePage} onMenuClick={() => setSidebarOpen(true)} isMobile={isMobile} />
        <main className="fade-in" style={{
          flex: 1,
          padding: isMobile ? '16px 12px' : '24px 28px',
          background: '#f0f4f8',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
