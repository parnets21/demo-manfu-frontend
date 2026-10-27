import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 600);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const maxW = size === 'lg' ? 820 : size === 'xl' ? 1020 : 580;
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        background: 'rgba(10,15,25,0.6)',
        backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: isMobile ? 0 : '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: isMobile ? 0 : 18,
          width: isMobile ? '100vw' : '100%',
          height: isMobile ? '100dvh' : 'auto',
          maxWidth: isMobile ? 'none' : maxW,
          maxHeight: isMobile ? 'none' : '88vh',
          overflowY: 'auto',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          boxShadow: isMobile ? 'none' : '0 32px 80px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.15)',
          fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '16px 16px 12px' : '20px 24px 16px',
          borderBottom: '1px solid #e8ecf0',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
          borderRadius: isMobile ? 0 : '18px 18px 0 0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 4, height: 22, background: 'linear-gradient(180deg, #e74c3c, #1e40af)', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: '#1a202c', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 9, border: '1.5px solid #e2e8f0',
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#718096',
              fontSize: 20, lineHeight: 1, flexShrink: 0, marginLeft: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#e74c3c'; e.currentTarget.style.color = '#1e40af'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#718096'; }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? '16px' : '22px 24px', flex: 1, overflowY: 'auto' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: isMobile ? '12px 16px' : '14px 24px 20px',
            borderTop: '1px solid #e8ecf0',
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            position: 'sticky', bottom: 0, background: '#fff',
            borderRadius: isMobile ? 0 : '0 0 18px 18px',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
