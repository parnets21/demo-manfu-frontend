const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const API_URL = `${BASE}/bulk-order-invoices`;

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

export const bulkOrderInvoiceApi = {
  generateInvoiceFromBulkOrder: (orderId) =>
    fetch(`${API_URL}/${orderId}/generate-invoice`, { method: 'POST', headers: authHeaders() }).then(handle),

  getInvoiceForOrder: (orderId) =>
    fetch(`${API_URL}/${orderId}/invoice`, { headers: authHeaders() }).then(handle),

  updateInvoiceStatus: (invoiceId, status) =>
    fetch(`${API_URL}/invoice/${invoiceId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    }).then(handle),

  getClientInvoices: (clientId) =>
    fetch(`${API_URL}/client/${clientId}/invoices`, { headers: authHeaders() }).then(handle),
};
