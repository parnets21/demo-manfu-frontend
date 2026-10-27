const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const oemFinishedGoodsApi = {
  // Get all finished goods
  getAll:           (params)        => fetch(`${BASE}/oem-finished-goods${q(params)}`,     { headers: authHeaders() }).then(handle),
  
  // Get finished goods by OEM order
  getByOrder:       (orderId, params) => fetch(`${BASE}/oem-finished-goods/order/${orderId}${q(params)}`, { headers: authHeaders() }).then(handle),
  
  // Get finished goods by brand
  getByBrand:       (brandId, params) => fetch(`${BASE}/oem-finished-goods/brand/${brandId}${q(params)}`, { headers: authHeaders() }).then(handle),
  
  // Get finished goods by ID
  getById:          (id)            => fetch(`${BASE}/oem-finished-goods/${id}`,            { headers: authHeaders() }).then(handle),
  
  // Create finished goods
  create:           (body)          => fetch(`${BASE}/oem-finished-goods`,                 { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  
  // Update finished goods
  update:           (id, body)      => fetch(`${BASE}/oem-finished-goods/${id}`,           { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  
  // Update status
  updateStatus:     (id, status)    => fetch(`${BASE}/oem-finished-goods/${id}/status`,    { method: 'PUT',    headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  
  // Delete finished goods
  delete:           (id)            => fetch(`${BASE}/oem-finished-goods/${id}`,           { method: 'DELETE', headers: authHeaders() }).then(handle),
  
  // Get stats
  getStats:         (params)        => fetch(`${BASE}/oem-finished-goods/stats/dashboard${q(params)}`, { headers: authHeaders() }).then(handle),
};
