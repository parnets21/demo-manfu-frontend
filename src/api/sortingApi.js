const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = (isGet = false) => {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (!isGet) headers['Content-Type'] = 'application/json';
  return headers;
};
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const sortingApi = {
  getAll: (params = {}) => fetch(`${BASE}/sorting${q(params)}`, { headers: authHeaders(true) }).then(handle),
  getById: (id) => fetch(`${BASE}/sorting/${id}`, { headers: authHeaders(true) }).then(handle),
  create: (body) => fetch(`${BASE}/sorting`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update: (id, body) => fetch(`${BASE}/sorting/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete: (id) => fetch(`${BASE}/sorting/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
};

export default sortingApi;
