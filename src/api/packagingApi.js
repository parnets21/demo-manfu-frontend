const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () =>
  localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Request failed');
  return d;
};

export const packagingApi = {
  getAll: () =>
    fetch(`${BASE}/packaging`, { headers: authHeaders() }).then(handle),

  getById: (id) =>
    fetch(`${BASE}/packaging/${id}`, { headers: authHeaders() }).then(handle),

  getActive: () =>
    fetch(`${BASE}/packaging/active/list`, { headers: authHeaders() }).then(handle),

  getByType: (type) =>
    fetch(`${BASE}/packaging/type/${type}`, { headers: authHeaders() }).then(handle),

  create: (data) =>
    fetch(`${BASE}/packaging`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handle),

  update: (id, data) =>
    fetch(`${BASE}/packaging/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handle),

  delete: (id) =>
    fetch(`${BASE}/packaging/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handle),
};
