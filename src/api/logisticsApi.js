const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const logisticsApi = {
  // Vehicles
  getVehicles:    (p = {}) => fetch(`${BASE}/logistics/vehicles${q(p)}`, { headers: authHeaders() }).then(handle),
  createVehicle:  (body)   => fetch(`${BASE}/logistics/vehicles`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateVehicle:  (id, body) => fetch(`${BASE}/logistics/vehicles/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteVehicle:  (id)     => fetch(`${BASE}/logistics/vehicles/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Dispatches
  getDispatches:  (p = {}) => fetch(`${BASE}/logistics/dispatches${q(p)}`, { headers: authHeaders() }).then(handle),
  getStats:       ()       => fetch(`${BASE}/logistics/dispatches/stats`, { headers: authHeaders() }).then(handle),
  createDispatch: (body)   => fetch(`${BASE}/logistics/dispatches`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateDispatchStatus: (id, body) => fetch(`${BASE}/logistics/dispatches/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteDispatch: (id)     => fetch(`${BASE}/logistics/dispatches/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Courier Shipments
  getShipments:   (p = {}) => fetch(`${BASE}/logistics/shipments${q(p)}`, { headers: authHeaders() }).then(handle),
  createShipment: (body)   => fetch(`${BASE}/logistics/shipments`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateShipment: (id, body) => fetch(`${BASE}/logistics/shipments/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  markPOD:        (id, body) => fetch(`${BASE}/logistics/shipments/${id}/pod`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteShipment: (id)     => fetch(`${BASE}/logistics/shipments/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Courier Tracking & Reports
  trackCourier:   (awbNo, courier = '') => fetch(`${BASE}/logistics/track/${awbNo}${courier ? `?courier=${courier}` : ''}`, { headers: authHeaders() }).then(handle),
  regularize:     (id)     => fetch(`${BASE}/logistics/dispatches/${id}/regularize`, { method: 'POST', headers: authHeaders() }).then(handle),
  getPendency:    ()       => fetch(`${BASE}/logistics/pendency`, { headers: authHeaders() }).then(handle),
};
