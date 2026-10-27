import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '../api/notificationApi';
import { useAuth } from '../auth/AuthContext';

const POLL_INTERVAL = 30_000; // 30 seconds
const DISMISSED_KEY = 'chakra_dismissed_notifications';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const prevCountRef                      = useRef(0);
  const [hasNew, setHasNew]               = useState(false);
  const [dismissed, setDismissed]         = useState(new Set());

  // Load dismissed notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Failed to parse dismissed notifications:', e);
      }
    }
  }, []);

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await notificationApi.getAll();
      const allNotifications = res.data || [];
      const filtered = allNotifications.filter(n => !dismissed.has(n.id));
      setNotifications(filtered);
      const count = res.unreadCount || 0;
      if (count > prevCountRef.current) setHasNew(true);
      prevCountRef.current = count;
      setUnreadCount(count);
    } catch (err) {
      // Silently ignore network errors (server restart / offline)
      // Only log non-network errors to avoid console spam
      const isNetworkError = err.name === 'TypeError' || err.message === 'Failed to fetch';
      if (!isNetworkError) console.error('Notification fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, dismissed]);

  // Initial fetch
  useEffect(() => { 
    if (user) {
      fetch();
    }
  }, [fetch, user]);

  // Polling
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetch, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetch, user]);

  const clearNew = () => setHasNew(false);

  const dismissNotification = useCallback((notificationId) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(notificationId);
    setDismissed(newDismissed);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(newDismissed)));
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    // Try to dismiss on backend (doesn't break if fails)
    notificationApi.dismiss(notificationId).catch(err => console.warn('Failed to dismiss notification:', err));
  }, [dismissed]);

  const clearAllNotifications = useCallback(() => {
    // Dismiss all current notifications
    const allIds = notifications.map(n => n.id);
    const newDismissed = new Set([...dismissed, ...allIds]);
    setDismissed(newDismissed);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(newDismissed)));
    setNotifications([]);
    // Try to clear on backend (doesn't break if fails)
    notificationApi.clearAll().catch(err => console.warn('Failed to clear notifications:', err));
  }, [notifications, dismissed]);

  return { notifications, unreadCount, loading, hasNew, clearNew, refetch: fetch, dismissNotification, clearAllNotifications };
}
