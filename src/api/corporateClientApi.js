const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const corporateClientApi = {
  // Basic CRUD operations
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/corporate-clients${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  
  getById: (id) => fetch(`${BASE}/corporate-clients/${id}`, { headers: authHeaders() }).then(handle),
  
  create: (body) =>
    fetch(`${BASE}/corporate-clients`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handle),
    
  update: (id, body) =>
    fetch(`${BASE}/corporate-clients/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handle),
    
  delete: (id) => fetch(`${BASE}/corporate-clients/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Dynamic Data Flow operations
  syncWithTally: (id) =>
    fetch(`${BASE}/corporate-clients/${id}/sync`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handle),

  bulkSync: () =>
    fetch(`${BASE}/corporate-clients/bulk-sync`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handle),

  getIntegrationStatus: (id) =>
    fetch(`${BASE}/corporate-clients/${id}/integration-status`, { headers: authHeaders() }).then(handle),

  // Query operations
  getByTier: (tier) =>
    fetch(`${BASE}/corporate-clients/tier/${tier}`, { headers: authHeaders() }).then(handle),

  getPendingSync: () =>
    fetch(`${BASE}/corporate-clients/sync/pending`, { headers: authHeaders() }).then(handle),

  // Utility functions for dynamic data flow
  validateGST: (gstNumber) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber);
  },

  validatePAN: (panNumber) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(panNumber);
  },

  calculateAvailableCredit: (creditLimit, outstanding) => {
    return Math.max(0, creditLimit - outstanding);
  },

  formatClientData: (formData) => {
    return {
      name: formData.name?.trim(),
      contact: formData.contact?.trim(),
      phone: formData.phone?.replace(/\D/g, ''),
      email: formData.email?.toLowerCase().trim(),
      gstNumber: formData.gstNumber?.toUpperCase().trim(),
      panNumber: formData.panNumber?.toUpperCase().trim(),
      tier: formData.tier,
      creditLimit: parseFloat(formData.creditLimit) || 0,
      paymentTerms: formData.paymentTerms || 'Net 30',
      discountPercentage: parseFloat(formData.discountPercentage) || 0,
      status: formData.status || 'Active',
      address: {
        street: formData.address?.street?.trim(),
        area: formData.address?.area?.trim(),
        city: formData.address?.city?.trim(),
        state: formData.address?.state?.trim(),
        pincode: formData.address?.pincode?.replace(/\D/g, ''),
        country: formData.address?.country || 'India'
      },
      billingAddress: formData.billingAddress || formData.address,
      shippingAddress: formData.shippingAddress || formData.address
    };
  }
};
