const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
};

export const vendorPriceApi = {
  getVendorPrices: (vendorId) =>
    fetch(`${API_BASE}/vendors/${vendorId}/prices`, { headers: authHeaders() }).then(handle),

  addPrice: (vendorId, data) =>
    fetch(`${API_BASE}/vendors/${vendorId}/prices`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    }).then(handle),

  updatePrice: (vendorId, priceId, data) =>
    fetch(`${API_BASE}/vendors/${vendorId}/prices/${priceId}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
    }).then(handle),

  deletePrice: (vendorId, priceId) =>
    fetch(`${API_BASE}/vendors/${vendorId}/prices/${priceId}`, {
      method: 'DELETE', headers: authHeaders(),
    }).then(handle),

  getPricesByProduct: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/vendors/prices/product${query ? '?' + query : ''}`, { headers: authHeaders() }).then(handle);
  },
};
