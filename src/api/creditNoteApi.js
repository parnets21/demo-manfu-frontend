const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };

export const creditNoteApi = {
  getAll:   (p = {}) => fetch(`${BASE}/credit-notes?${new URLSearchParams(p)}`, { headers: authHeaders() }).then(handle),
  getStats: ()       => fetch(`${BASE}/credit-notes/stats`, { headers: authHeaders() }).then(handle),
  create:   (body)   => fetch(`${BASE}/credit-notes`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateStatus: (id, status) => fetch(`${BASE}/credit-notes/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  sendReminder: (id) => fetch(`${BASE}/credit-notes/${id}/send-reminder`, { method: 'POST', headers: authHeaders() }).then(handle),
  delete:   (id)     => fetch(`${BASE}/credit-notes/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
};
