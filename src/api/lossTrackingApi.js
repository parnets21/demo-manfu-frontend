const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { 
  if (res.status === 401) {
    localStorage.removeItem('chakra_token');
    localStorage.removeItem('chakra_user');
    sessionStorage.removeItem('chakra_token');
    sessionStorage.removeItem('chakra_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const d = await res.json(); 
  if (!res.ok) throw new Error(d.message || 'Request failed'); 
  return d; 
};

export const lossTrackingApi = {
  // Get all loss tracking records with advanced filtering
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${BASE}/loss-tracking?${queryString}` : `${BASE}/loss-tracking`;
    return fetch(url, { headers: authHeaders() }).then(handle);
  },

  // Get single loss tracking record
  getById: (id) => fetch(`${BASE}/loss-tracking/${id}`, { headers: authHeaders() }).then(handle),

  // Create new loss tracking record with professional structure
  create: (data) => fetch(`${BASE}/loss-tracking`, { 
    method: 'POST', 
    headers: authHeaders(), 
    body: JSON.stringify(data) 
  }).then(handle),

  // Update loss tracking record
  update: (id, data) => fetch(`${BASE}/loss-tracking/${id}`, { 
    method: 'PUT', 
    headers: authHeaders(), 
    body: JSON.stringify(data) 
  }).then(handle),

  // Raise Debit Note
  raiseDebitNote: (id, amount, reason) => fetch(`${BASE}/loss-tracking/${id}/debit-note`, { 
    method: 'POST', 
    headers: authHeaders(), 
    body: JSON.stringify({ amount, reason }) 
  }).then(handle),

  // Issue Credit Note
  issueCreditNote: (id, amount, reason) => fetch(`${BASE}/loss-tracking/${id}/credit-note`, { 
    method: 'POST', 
    headers: authHeaders(), 
    body: JSON.stringify({ amount, reason }) 
  }).then(handle),

  // Escalate loss tracking record
  escalate: (id, escalationReason) => fetch(`${BASE}/loss-tracking/${id}/escalate`, { 
    method: 'POST', 
    headers: authHeaders(), 
    body: JSON.stringify({ escalationReason }) 
  }).then(handle),

  // Close loss tracking record
  close: (id, closureReason) => fetch(`${BASE}/loss-tracking/${id}/close`, { 
    method: 'POST', 
    headers: authHeaders(), 
    body: JSON.stringify({ closureReason }) 
  }).then(handle),

  // Delete loss tracking record
  delete: (id) => fetch(`${BASE}/loss-tracking/${id}`, { 
    method: 'DELETE', 
    headers: authHeaders() 
  }).then(handle),

  // Get legacy dashboard stats (backward compatibility)
  getStats: () => fetch(`${BASE}/loss-tracking/stats`, { headers: authHeaders() }).then(handle),

  // Get comprehensive dashboard analytics
  getAnalytics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${BASE}/loss-tracking/analytics?${queryString}` : `${BASE}/loss-tracking/analytics`;
    return fetch(url, { headers: authHeaders() }).then(handle);
  },

  // Professional ERP Constants
  LOSS_TYPES: [
    'Transit Damage',
    'Material Shortage', 
    'Wrong Material',
    'Supplier Defect',
    'Customer Return',
    'Expired Material',
    'Packing Damage',
    'Transport Delay',
    'Invoice Mismatch',
    'Quantity Mismatch',
    'Duplicate Dispatch',
    'QC Rejection',
    'Missing Material',
    'Financial Adjustment',
    'Warehouse Damage',
    'Theft / Pilferage',
    'Production Rejection'
  ],

  ROOT_CAUSES: [
    'Supplier Packing Issue',
    'Transport Mishandling',
    'Warehouse Error',
    'QC Failure',
    'Invoice Error',
    'System Entry Mistake',
    'Customer Rejection',
    'Production Defect',
    'Wrong Dispatch',
    'Missing Documentation'
  ],

  DEPARTMENTS: [
    'Procurement', 
    'Warehouse', 
    'QC', 
    'Logistics', 
    'Finance', 
    'Sales', 
    'Production'
  ],

  PRIORITIES: ['Low', 'Medium', 'High', 'Critical'],

  FINANCIAL_STATUS: [
    'Pending', 
    'Debit Note Raised', 
    'Credit Note Issued', 
    'Settled', 
    'Write-off'
  ],

  MATERIAL_STATUS: [
    'Pending Return', 
    'In Transit', 
    'Received', 
    'QC In Progress', 
    'QC Completed', 
    'Disposed'
  ],

  RECONCILIATION_STATUS: [
    'Open', 
    'Material Closed', 
    'Finance Closed', 
    'Fully Reconciled'
  ],

  FINAL_STATUS: [
    'Open', 
    'In Progress', 
    'Resolved', 
    'Escalated', 
    'Closed'
  ]
};