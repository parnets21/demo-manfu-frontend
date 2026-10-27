const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => {
  const token = localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
  console.log('Vendor API - Token from storage:', token ? `${token.substring(0, 20)}...` : 'null');
  return token;
};

const authHeaders = () => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('Vendor API - Auth headers:', { ...headers, Authorization: headers.Authorization ? `Bearer ${headers.Authorization.substring(7, 27)}...` : 'null' });
  return headers;
};

const handle = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('chakra_token');
    localStorage.removeItem('chakra_user');
    sessionStorage.removeItem('chakra_token');
    sessionStorage.removeItem('chakra_user');
    window.location.href = '/login';
    throw new Error('Unauthorized – please log in again');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const vendorApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/vendors${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  getById: (id) => fetch(`${BASE}/vendors/${id}`, { headers: authHeaders() }).then(handle),
  create: (body) =>
    fetch(`${BASE}/vendors`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handle),
  update: (id, body) =>
    fetch(`${BASE}/vendors/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handle),
  delete: (id) => fetch(`${BASE}/vendors/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
  getStats: () => fetch(`${BASE}/vendors/stats`, { headers: authHeaders() }).then(handle),

  // Send email to vendor
  sendEmail: (body) =>
    fetch(`${BASE}/vendors/send-email`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handle),

  // Vendor price mapping
  getPrices: (vendorId) =>
    fetch(`${BASE}/vendors/${vendorId}/prices`, { headers: authHeaders() }).then(handle),
  addPrice: (vendorId, body) =>
    fetch(`${BASE}/vendors/${vendorId}/prices`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
    }).then(handle),
  updatePrice: (vendorId, priceId, body) =>
    fetch(`${BASE}/vendors/${vendorId}/prices/${priceId}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
    }).then(handle),
  deletePrice: (vendorId, priceId) =>
    fetch(`${BASE}/vendors/${vendorId}/prices/${priceId}`, {
      method: 'DELETE', headers: authHeaders(),
    }).then(handle),
  getPricesByProduct: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/vendors/prices/product${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
};
