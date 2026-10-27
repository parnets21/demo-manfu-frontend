const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const bulkOrderApi = {
  // Stats
  getStats:         ()       => fetch(`${BASE}/bulk-orders/stats`, { headers: authHeaders() }).then(handle),

  // Corporate Clients
  getClients:       (p = {}) => fetch(`${BASE}/bulk-orders/clients${q(p)}`, { headers: authHeaders() }).then(handle),
  createClient:     (body)   => fetch(`${BASE}/bulk-orders/clients`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateClient:     (id, body) => fetch(`${BASE}/bulk-orders/clients/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteClient:     (id)     => fetch(`${BASE}/bulk-orders/clients/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
  // Bulk import clients parsed from Excel (frontend parses xlsx and sends JSON)
  importClients:    (clients) => fetch(`${BASE}/bulk-orders/clients/import`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ clients }) }).then(handle),
  importClientsFile: (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/bulk-orders/clients/import-file`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }).then(handle);
  },

  // Bulk Quotations
  getQuotations:    (p = {}) => fetch(`${BASE}/bulk-orders/quotations${q(p)}`, { headers: authHeaders() }).then(handle),
  createQuotation:  (body)   => fetch(`${BASE}/bulk-orders/quotations`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateQuotation:  (id, body) => fetch(`${BASE}/bulk-orders/quotations/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateStatus:     (id, status) => fetch(`${BASE}/bulk-orders/quotations/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  deleteQuotation:  (id)     => fetch(`${BASE}/bulk-orders/quotations/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Delivery Schedules
  getSchedules:     ()       => fetch(`${BASE}/bulk-orders/schedules`, { headers: authHeaders() }).then(handle),
  createSchedule:   (body)   => fetch(`${BASE}/bulk-orders/schedules`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateSchedule:   (id, body) => fetch(`${BASE}/bulk-orders/schedules/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteSchedule:   (id)     => fetch(`${BASE}/bulk-orders/schedules/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Convert to Dispatch
  convertToDispatch: (id)   => fetch(`${BASE}/bulk-orders/quotations/${id}/convert-to-dispatch`, { method: 'POST', headers: authHeaders() }).then(handle),

  // Convert to Purchase Order
  convertToPO: (id, vendorId) => fetch(`${BASE}/bulk-orders/quotations/${id}/convert-to-po`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ vendorId }) }).then(handle),
};
