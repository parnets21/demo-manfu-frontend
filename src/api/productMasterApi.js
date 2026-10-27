import api from './axiosConfig';

const BASE = '/product-master';
const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () =>
  localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

export const productMasterApi = {
  // Returns { success, data[], total, categories?, brands? }
  getAll: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`${BASE}${qs ? `?${qs}` : ''}`);
  },
  getById:     (id) => api.get(`${BASE}/${id}`),
  getFilters:  ()   => api.get(`${BASE}/filters`),
  generateSku: (p = {}) => api.get(`${BASE}/sku-gen?brand=${p.brand || ''}&category=${p.category || ''}`),

  create: async (formData) => {
    const r = await fetch(`${BASE_URL}${BASE}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Failed to create product');
    return d;
  },

  update: async (id, formData) => {
    const r = await fetch(`${BASE_URL}${BASE}/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Failed to update product');
    return d;
  },

  delete: (id) => api.delete(`${BASE}/${id}`),
};
