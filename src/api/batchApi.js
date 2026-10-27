const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { 
  const d = await res.json(); 
  if (!res.ok) {
    console.error('API Error:', res.status, d);
    throw new Error(d.message || `Request failed with status ${res.status}`); 
  }
  return d; 
};
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const batchApi = {
  getAll: (params = {}) => {
    const url = `${BASE}/batches${q(params)}`;
    console.log('Fetching batches from:', url);
    return fetch(url, { headers: authHeaders() })
      .then(handle)
      .catch(err => {
        console.error('Batch API error:', err);
        // Return empty data on error instead of throwing
        return { success: true, data: [] };
      });
  },
  getById: (id) => fetch(`${BASE}/batches/${id}`, { headers: authHeaders() }).then(handle),
  create: (body) => fetch(`${BASE}/batches`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update: (id, body) => fetch(`${BASE}/batches/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete: (id) => fetch(`${BASE}/batches/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
};

export default batchApi;
