import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('chakra_user') || sessionStorage.getItem('chakra_user');
      const token = localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
      if (stored && !token) {
        // Stale mock session — no real JWT, clear it
        localStorage.removeItem('chakra_user');
        sessionStorage.removeItem('chakra_user');
        return null;
      }
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const timerRef = useRef(null);

  const logout = useCallback(async () => {
    // Fire logout to backend (best-effort)
    try {
      const token = localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
      if (token) {
        await fetch(`${BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* ignore */ }

    setUser(null);
    localStorage.removeItem('chakra_user');
    localStorage.removeItem('chakra_token');
    sessionStorage.removeItem('chakra_user');
    sessionStorage.removeItem('chakra_token');
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Auto-logout on inactivity
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  // Listen for 401 events from axiosConfig (avoids hard page-reload crash)
  useEffect(() => {
    const handle401 = () => {
      logout();
      // Use history API so React Router handles navigation without page crash
      window.history.replaceState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    };
    window.addEventListener('chakra:unauthorized', handle401);
    return () => window.removeEventListener('chakra:unauthorized', handle401);
  }, [logout]);

  const login = async (email, password, remember = true) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json();
    console.log('Login response:', data); // Debug log
    if (!data.success) throw new Error(data.message || 'Invalid email or password');

    const { token, user: userData } = data;
    console.log('Token received:', token ? 'Yes' : 'No'); // Debug log
    
    if (!token) {
      throw new Error('No token received from server');
    }
    
    // Always use localStorage for persistence across page refreshes
    localStorage.setItem('chakra_token', token);
    localStorage.setItem('chakra_user', JSON.stringify(userData));
    console.log('Token stored in localStorage'); // Debug log
    setUser(userData);
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
