const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const inventoryFlowApi = {
  // Dashboard - Complete inventory flow data
  getDashboard: () => fetch(`${BASE}/inventory/flow/dashboard`, { headers: authHeaders() }).then(handle),
  
  // Trends - Inventory movement trends over time
  getTrends: (days = 30) => fetch(`${BASE}/inventory/flow/trends${q({ days })}`, { headers: authHeaders() }).then(handle),
  
  // GRN Flow - Detailed flow for a specific GRN
  getGRNFlow: (grnId) => fetch(`${BASE}/inventory/flow/grn/${grnId}`, { headers: authHeaders() }).then(handle),
};
