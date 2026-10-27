const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const API_URL = `${BASE}/bulk-order-inventory`;

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

export const bulkOrderInventoryApi = {
  checkInventory: (orderId) =>
    fetch(`${API_URL}/${orderId}/check`, { method: 'POST', headers: authHeaders() }).then(handle),

  reserveInventory: (orderId) =>
    fetch(`${API_URL}/${orderId}/reserve`, { method: 'POST', headers: authHeaders() }).then(handle),

  createWorkOrderForShortage: (orderId) =>
    fetch(`${API_URL}/${orderId}/create-work-order`, { method: 'POST', headers: authHeaders() }).then(handle),

  releaseReservedInventory: (orderId) =>
    fetch(`${API_URL}/${orderId}/release`, { method: 'POST', headers: authHeaders() }).then(handle),
};
