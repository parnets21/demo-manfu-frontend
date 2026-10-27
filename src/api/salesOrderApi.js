const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const salesOrderApi = {
  getAll:    (params = {}) => fetch(`${BASE}/sales-orders${q(params)}`,    { headers: authHeaders() }).then(handle),
  getStats:  ()            => fetch(`${BASE}/sales-orders/stats`,           { headers: authHeaders() }).then(handle),
  getById:   (id)          => fetch(`${BASE}/sales-orders/${id}`,           { headers: authHeaders() }).then(handle),
  create:    (body)        => fetch(`${BASE}/sales-orders`,                 { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update:    (id, body)    => fetch(`${BASE}/sales-orders/${id}`,           { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete:    (id)          => fetch(`${BASE}/sales-orders/${id}`,           { method: 'DELETE', headers: authHeaders() }).then(handle),
};
