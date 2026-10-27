const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => {
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Request failed');
  return d;
};

export const debitNoteApi = {
  getAll:       (params = {}) => fetch(`${BASE}/debit-notes?${new URLSearchParams(params)}`, { headers: authHeaders() }).then(handle),
  getStats:     ()            => fetch(`${BASE}/debit-notes/stats`, { headers: authHeaders() }).then(handle),
  create:       (body)        => fetch(`${BASE}/debit-notes`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateStatus: (id, status)  => fetch(`${BASE}/debit-notes/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  delete:       (id)          => fetch(`${BASE}/debit-notes/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
};
