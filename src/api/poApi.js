const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const authHeadersFormData = () => ({ Authorization: `Bearer ${getToken()}` });

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const poApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/purchase-orders${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  getById: (id) => fetch(`${BASE}/purchase-orders/${id}`, { headers: authHeaders() }).then(handle),
  create: (body) =>
    fetch(`${BASE}/purchase-orders`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update: (id, body) =>
    fetch(`${BASE}/purchase-orders/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateStatus: (id, status) =>
    fetch(`${BASE}/purchase-orders/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  delete: (id) => fetch(`${BASE}/purchase-orders/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
  bulkUpload: (formData) =>
    fetch(`${BASE}/purchase-orders/bulk-upload`, { method: 'POST', headers: authHeadersFormData(), body: formData }).then(handle),
  sendEmail: (id, to) =>
    fetch(`${BASE}/purchase-orders/${id}/send-email`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ to }) }).then(handle),
  sendWhatsApp: (id, to) =>
    fetch(`${BASE}/purchase-orders/${id}/send-whatsapp`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ to }) }).then(handle),
};
