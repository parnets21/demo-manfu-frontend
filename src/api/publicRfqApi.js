const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const publicRfqApi = {
  // Get RFQ details for vendor (no auth required)
  getById: (id) => 
    fetch(`${BASE}/rfqs/public/${id}`, {
      headers: { 'Content-Type': 'application/json' }
    }).then(handle),

  // Submit quotation (no auth required)
  addQuotation: (id, quotation) =>
    fetch(`${BASE}/rfqs/public/${id}/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotation)
    }).then(handle),
};