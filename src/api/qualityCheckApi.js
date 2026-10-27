const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };

export const qualityCheckApi = {
  getAll:   ()        => fetch(`${BASE}/quality-checks`, { headers: authHeaders() }).then(handle),
  getStats: ()        => fetch(`${BASE}/quality-checks/stats`, { headers: authHeaders() }).then(handle),
  getById:  (id)      => fetch(`${BASE}/quality-checks/${id}`, { headers: authHeaders() }).then(handle),
  submit:   (id, body) => fetch(`${BASE}/quality-checks/${id}/submit`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
};
