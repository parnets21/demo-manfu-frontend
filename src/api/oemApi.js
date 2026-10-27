const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const oemApi = {
  // Stats
  getStats:          ()              => fetch(`${BASE}/oem/stats`,                          { headers: authHeaders() }).then(handle),
  autoSelect:        (params)        => fetch(`${BASE}/oem/auto-select${q(params)}`,        { headers: authHeaders() }).then(handle),

  // Brands
  getBrands:         ()              => fetch(`${BASE}/oem`,                                { headers: authHeaders() }).then(handle),
  getBrandById:      (id)            => fetch(`${BASE}/oem/${id}`,                          { headers: authHeaders() }).then(handle),
  createBrand:       (body)          => fetch(`${BASE}/oem`,                                { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateBrand:       (id, body)      => fetch(`${BASE}/oem/${id}`,                          { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteBrand:       (id)            => fetch(`${BASE}/oem/${id}`,                          { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Products per brand
  getProductsByBrand:(brandId)       => fetch(`${BASE}/oem/${brandId}/products`,            { headers: authHeaders() }).then(handle),
  getWOsByBrand:     (brandId)       => fetch(`${BASE}/oem/${brandId}/workorders`,          { headers: authHeaders() }).then(handle),
  getAllProducts:     ()              => fetch(`${BASE}/oem/products/all`,                   { headers: authHeaders() }).then(handle),

  // Product CRUD
  createProduct:     (body)          => fetch(`${BASE}/oem/products`,                       { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateProduct:     (id, body)      => fetch(`${BASE}/oem/products/${id}`,                 { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteProduct:     (id)            => fetch(`${BASE}/oem/products/${id}`,                 { method: 'DELETE', headers: authHeaders() }).then(handle),
};
