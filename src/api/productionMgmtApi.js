const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => {
  const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const s = new URLSearchParams(clean).toString();
  return s ? '?' + s : '';
};

export const productionMgmtApi = {
  // CRUD
  getAll:    (params = {}) => fetch(`${BASE}/production-manage${q(params)}`,        { headers: authHeaders() }).then(handle),
  getById:   (id)          => fetch(`${BASE}/production-manage/${id}`,              { headers: authHeaders() }).then(handle),
  create:    (body)        => fetch(`${BASE}/production-manage`,        { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update:    (id, body)    => fetch(`${BASE}/production-manage/${id}`,  { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete:    (id)          => fetch(`${BASE}/production-manage/${id}`,  { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Stats & Reports
  getStats:         (params = {}) => fetch(`${BASE}/production-manage/stats${q(params)}`,          { headers: authHeaders() }).then(handle),
  getDailyReport:   (params = {}) => fetch(`${BASE}/production-manage/report/daily${q(params)}`,   { headers: authHeaders() }).then(handle),
  getMonthlyReport: (params = {}) => fetch(`${BASE}/production-manage/report/monthly${q(params)}`, { headers: authHeaders() }).then(handle),
  getDamageReport:  (params = {}) => fetch(`${BASE}/production-manage/report/damage${q(params)}`,  { headers: authHeaders() }).then(handle),
};
