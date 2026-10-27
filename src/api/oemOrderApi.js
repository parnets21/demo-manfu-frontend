const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const oemOrderApi = {
  // Get all OEM orders
  getAll:           (params)        => fetch(`${BASE}/oem-orders${q(params)}`,              { headers: authHeaders() }).then(handle),
  
  // Get OEM orders by brand
  getByBrand:       (brandId, params) => fetch(`${BASE}/oem-orders/brand/${brandId}${q(params)}`, { headers: authHeaders() }).then(handle),
  
  // Get OEM order by ID
  getById:          (id)            => fetch(`${BASE}/oem-orders/${id}`,                    { headers: authHeaders() }).then(handle),
  
  // Create OEM order
  create:           (body)          => fetch(`${BASE}/oem-orders`,                         { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  
  // Update OEM order
  update:           (id, body)      => fetch(`${BASE}/oem-orders/${id}`,                   { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  
  // Update order status
  updateStatus:     (id, status)    => fetch(`${BASE}/oem-orders/${id}/status`,            { method: 'PUT',    headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  
  // Delete OEM order
  delete:           (id)            => fetch(`${BASE}/oem-orders/${id}`,                   { method: 'DELETE', headers: authHeaders() }).then(handle),
  
  // Get OEM order stats
  getStats:         (params)        => fetch(`${BASE}/oem-orders/stats/dashboard${q(params)}`, { headers: authHeaders() }).then(handle),
};
