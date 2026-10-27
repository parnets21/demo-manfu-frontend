const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const clientApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/clients${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  getById: (id) => fetch(`${BASE}/clients/${id}`, { headers: authHeaders() }).then(handle),
  create: (body) =>
    fetch(`${BASE}/clients`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handle),
  update: (id, body) =>
    fetch(`${BASE}/clients/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handle),
  delete: (id) => fetch(`${BASE}/clients/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
};

export default clientApi;
