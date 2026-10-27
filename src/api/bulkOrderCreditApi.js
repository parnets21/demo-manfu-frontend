const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const API_URL = `${BASE}/bulk-order-credit`;

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

export const bulkOrderCreditApi = {
  checkCreditLimit: (clientId, orderValue) =>
    fetch(`${API_URL}/check`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ clientId, orderValue }),
    }).then(handle),

  reserveCredit: (orderId) =>
    fetch(`${API_URL}/${orderId}/reserve`, { method: 'POST', headers: authHeaders() }).then(handle),

  releaseCredit: (orderId) =>
    fetch(`${API_URL}/${orderId}/release`, { method: 'POST', headers: authHeaders() }).then(handle),

  getClientCreditSummary: (clientId) =>
    fetch(`${API_URL}/${clientId}/summary`, { headers: authHeaders() }).then(handle),
};
