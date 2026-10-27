const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const itemMasterApi = {
  // CRUD Operations
  getAll: (params = {}) => fetch(`${BASE}/item-master${q(params)}`, { headers: authHeaders() }).then(handle),
  getById: (id) => fetch(`${BASE}/item-master/${id}`, { headers: authHeaders() }).then(handle),
  getBySku: (sku) => fetch(`${BASE}/item-master/sku/${sku}`, { headers: authHeaders() }).then(handle),
  create: (body) => fetch(`${BASE}/item-master`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update: (id, body) => fetch(`${BASE}/item-master/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete: (id) => fetch(`${BASE}/item-master/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
  deleteAll: () => fetch(`${BASE}/item-master/delete-all`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Search & Filter
  search: (query) => fetch(`${BASE}/item-master/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() }).then(handle),
  
  // Dropdown - Get items for dropdown (minimal data)
  getDropdown: () => fetch(`${BASE}/item-master/dropdown`, { headers: authHeaders() }).then(handle),

  // Barcode lookup — find product by barcode value
  getByBarcode: (barcode) => fetch(`${BASE}/item-master/barcode/${encodeURIComponent(barcode)}`, { headers: authHeaders() }).then(handle),

  // Admin only: regenerate barcode for an existing item
  regenerateBarcode: (id) => fetch(`${BASE}/item-master/${id}/regenerate-barcode`, { method: 'POST', headers: authHeaders() }).then(handle),
  
  // Stats
  getStats: () => fetch(`${BASE}/item-master/stats`, { headers: authHeaders() }).then(handle),
};
