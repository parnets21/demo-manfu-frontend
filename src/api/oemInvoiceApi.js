const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const oemInvoiceApi = {
  // Get all OEM invoices
  getAll:           (params)        => fetch(`${BASE}/oem-invoices${q(params)}`,           { headers: authHeaders() }).then(handle),
  
  // Get OEM invoices by brand
  getByBrand:       (brandId, params) => fetch(`${BASE}/oem-invoices/brand/${brandId}${q(params)}`, { headers: authHeaders() }).then(handle),
  
  // Get OEM invoice by ID
  getById:          (id)            => fetch(`${BASE}/oem-invoices/${id}`,                 { headers: authHeaders() }).then(handle),
  
  // Create OEM invoice
  create:           (body)          => fetch(`${BASE}/oem-invoices`,                       { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  
  // Update OEM invoice
  update:           (id, body)      => fetch(`${BASE}/oem-invoices/${id}`,                 { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  
  // Update payment status
  updatePaymentStatus: (id, status) => fetch(`${BASE}/oem-invoices/${id}/payment-status`,  { method: 'PUT',    headers: authHeaders(), body: JSON.stringify({ paymentStatus: status }) }).then(handle),
  
  // Record payment
  recordPayment:    (id, body)      => fetch(`${BASE}/oem-invoices/${id}/payment`,        { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  
  // Delete OEM invoice
  delete:           (id)            => fetch(`${BASE}/oem-invoices/${id}`,                 { method: 'DELETE', headers: authHeaders() }).then(handle),
  
  // Get invoice stats
  getStats:         (params)        => fetch(`${BASE}/oem-invoices/stats/dashboard${q(params)}`, { headers: authHeaders() }).then(handle),
};
