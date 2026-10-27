import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

let _addToast = null;

export function toast(message, type = 'success') {
  _addToast?.({ message, type, id: Date.now() });
}

const COLORS = {
  success: { bg: '#f0fdf4', border: '#86efac', color: '#15803d', icon: '✓' },
  error:   { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', icon: '✕' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#d97706', icon: '⚠' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', icon: 'ℹ' },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3000);
  }, []);

  useEffect(() => { _addToast = addToast; return () => { _addToast = null; }; }, [addToast]);

  if (!toasts.length) return null;

  return createPortal(
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.success;
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 18px', borderRadius: 12,
            background: c.bg, border: `1px solid ${c.border}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            fontSize: 13, fontWeight: 600, color: c.color,
            fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
            minWidth: 260, maxWidth: 380,
            animation: 'slideIn 0.2s ease',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>,
    document.body
  );
}
