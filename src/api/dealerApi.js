const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

const authHeaders = (json = true) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const dealerApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/dealer/erp/dealers${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },

  update: (id, body) =>
    fetch(`${BASE}/dealer/erp/dealers/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handle),

  delete: (id) =>
    fetch(`${BASE}/dealer/erp/dealers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handle),
};

export default dealerApi;
