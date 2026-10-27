const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const reportsApi = {
  getSalesAnalytics:       (p = {}) => fetch(`${BASE}/reports/sales-analytics${q(p)}`,       { headers: authHeaders() }).then(handle),
  getStockSummary:         (p = {}) => fetch(`${BASE}/reports/stock-summary${q(p)}`,          { headers: authHeaders() }).then(handle),
  getInventoryTurnover:    ()       => fetch(`${BASE}/reports/inventory-turnover`,             { headers: authHeaders() }).then(handle),
  getPurchaseRegister:     (p = {}) => fetch(`${BASE}/reports/purchase-register${q(p)}`,      { headers: authHeaders() }).then(handle),
  getProductionReport:     (p = {}) => fetch(`${BASE}/reports/production${q(p)}`,             { headers: authHeaders() }).then(handle),
  getReturnReconciliation: ()       => fetch(`${BASE}/reports/return-reconciliation`,          { headers: authHeaders() }).then(handle),
};
