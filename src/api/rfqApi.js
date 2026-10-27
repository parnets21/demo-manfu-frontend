const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const rfqApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/rfqs${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  getById: (id) => fetch(`${BASE}/rfqs/${id}`, { headers: authHeaders() }).then(handle),
  create: (body) =>
    fetch(`${BASE}/rfqs`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update: (id, body) =>
    fetch(`${BASE}/rfqs/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateStatus: (id, status) =>
    fetch(`${BASE}/rfqs/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  addQuotation: (id, quotation) =>
    fetch(`${BASE}/rfqs/${id}/quotations`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(quotation) }).then(handle),
  delete: (id) => fetch(`${BASE}/rfqs/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
};
