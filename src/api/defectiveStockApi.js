const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const defectiveStockApi = {
  getAll: (params = {}) => fetch(`${BASE}/defective-stock${q(params)}`, { headers: authHeaders() }).then(handle),
  getById: (id) => fetch(`${BASE}/defective-stock/${id}`, { headers: authHeaders() }).then(handle),
  getLogs: (id) => fetch(`${BASE}/defective-stock/${id}/logs`, { headers: authHeaders() }).then(handle),
  create: (body) => fetch(`${BASE}/defective-stock`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update: (id, body) => fetch(`${BASE}/defective-stock/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete: (id) => fetch(`${BASE}/defective-stock/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
};

export default defectiveStockApi;
