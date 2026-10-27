const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handleResponse = async (res) => {
  const data = await res.json();
  if (res.status === 401) throw new Error('Session expired. Please log out and log in again.');
  if (res.status === 403) throw new Error('You do not have permission to perform this action.');
  if (!data.success) throw new Error(data.message || 'Request failed');
  return data;
};

// ── Users ──────────────────────────────────────────────────────────────────
export const fetchUsers = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/users${qs ? `?${qs}` : ''}`, { headers: headers() });
  return handleResponse(res);
};

export const createUser = async (payload) => {
  const res = await fetch(`${BASE}/users`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.user;
};

export const updateUser = async (id, payload) => {
  const res = await fetch(`${BASE}/users/${id}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.user;
};

export const toggleUserStatus = async (id) => {
  const res = await fetch(`${BASE}/users/${id}/toggle-status`, {
    method: 'PUT', headers: headers(),
  });
  const data = await handleResponse(res);
  return data.user;
};

export const resetUserPassword = async (id, newPassword) => {
  const res = await fetch(`${BASE}/users/${id}/reset-password`, {
    method: 'PUT', headers: headers(), body: JSON.stringify({ newPassword }),
  });
  return handleResponse(res);
};

export const deleteUser = async (id) => {
  const res = await fetch(`${BASE}/users/${id}`, { method: 'DELETE', headers: headers() });
  return handleResponse(res);
};

// ── Activity Logs ──────────────────────────────────────────────────────────
export const fetchActivityLogs = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/activity-logs${qs ? `?${qs}` : ''}`, { headers: headers() });
  return handleResponse(res);
};

export const fetchMyActivityLogs = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/activity-logs/my${qs ? `?${qs}` : ''}`, { headers: headers() });
  return handleResponse(res);
};
