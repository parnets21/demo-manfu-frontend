const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api/api');
const API_URL = `${BASE}/brand-orders`;

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

export const createBrandOrder = (data) =>
  fetch(API_URL, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle);

export const getBrandOrders = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return fetch(`${API_URL}${params ? `?${params}` : ''}`, { headers: authHeaders() }).then(handle);
};

export const getBrandOrderById = (id) =>
  fetch(`${API_URL}/${id}`, { headers: authHeaders() }).then(handle);

export const updateBrandOrder = (id, data) =>
  fetch(`${API_URL}/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle);

export const approveBrandOrder = (id, approvalStatus) =>
  fetch(`${API_URL}/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ approvalStatus }),
  }).then(handle);

export const cancelBrandOrder = (id) =>
  fetch(`${API_URL}/${id}/cancel`, { method: 'POST', headers: authHeaders() }).then(handle);
