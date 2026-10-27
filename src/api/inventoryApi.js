import { globalRateLimiter } from '../utils/rateLimiter.js';

const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = (isGet = false) => {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (!isGet) headers['Content-Type'] = 'application/json';
  return headers;
};

const handle = async (res) => { 
  const d = await res.json(); 
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    throw new Error(d.message || 'Request failed'); 
  }
  return d; 
};

const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

// Robust fetch with retry, rate limiting and 304 handling
const rateLimitedFetchWithRetry = async (url, options = {}, retries = 2) => {
  try {
    await globalRateLimiter.waitIfNeeded();
    const res = await fetch(url, options);
    
    // Handle 304 Not Modified as success (fetch ok is only 200-299)
    if (!res.ok && res.status !== 304) {
      if (res.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || `Request failed with status ${res.status}`);
    }
    
    // If 304, there's no body, so return an empty object or handle accordingly
    if (res.status === 304) return { success: true, data: [] };
    
    return await res.json();
  } catch (err) {
    if (retries > 0 && (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('status 304'))) {
      console.warn(`Fetch failed, retrying... (${retries} left)`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
      return rateLimitedFetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
};

export const inventoryApi = {
  // ── Stock Items ────────────────────────────────────────────────────────────
  getAll:      (params = {}) => rateLimitedFetchWithRetry(`${BASE}/inventory${q(params)}`,          { headers: authHeaders(true) }),
  getStats:    ()            => rateLimitedFetchWithRetry(`${BASE}/inventory/stats`,                 { headers: authHeaders(true) }),
  getDropdown: ()            => rateLimitedFetchWithRetry(`${BASE}/inventory/dropdown`,              { headers: authHeaders(true) }),
  create:      (body)        => rateLimitedFetchWithRetry(`${BASE}/inventory`,                       { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }),
  adjust:      (id, body)    => rateLimitedFetchWithRetry(`${BASE}/inventory/${id}/adjust`,          { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify(body) }),
  move:        (id, body)    => rateLimitedFetchWithRetry(`${BASE}/inventory/${id}/move`,            { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify(body) }),
  delete:      (id)          => rateLimitedFetchWithRetry(`${BASE}/inventory/${id}`,                 { method: 'DELETE', headers: authHeaders() }),

  // ── Warehouses ─────────────────────────────────────────────────────────────
  getWarehouses:      ()         => rateLimitedFetchWithRetry(`${BASE}/inventory/warehouses`,           { headers: authHeaders(true) }),
  getNextWarehouseId: ()         => rateLimitedFetchWithRetry(`${BASE}/inventory/warehouses/next-id`,   { headers: authHeaders(true) }),
  createWarehouse:    (body)     => rateLimitedFetchWithRetry(`${BASE}/inventory/warehouses`,           { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }),
  updateWarehouse:    (id, body) => rateLimitedFetchWithRetry(`${BASE}/inventory/warehouses/${id}`,     { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }),
  deleteWarehouse:    (id, force = false) => rateLimitedFetchWithRetry(`${BASE}/inventory/warehouses/${id}${force ? '?force=true' : ''}`,     { method: 'DELETE', headers: authHeaders() }),

  // ── Movements ──────────────────────────────────────────────────────────────
  getMovements:    (params = {}) => rateLimitedFetchWithRetry(`${BASE}/inventory/movements${q(params)}`, { headers: authHeaders(true) }),
  createMovement:  (body)        => rateLimitedFetchWithRetry(`${BASE}/inventory/movements`,             { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }),
  deleteMovement:  (id)          => rateLimitedFetchWithRetry(`${BASE}/inventory/movements/${id}`,       { method: 'DELETE', headers: authHeaders() }),

  // ── GRN to Inventory Conversion ────────────────────────────────────────────
  convertGRNToInventory: (grnId) => rateLimitedFetchWithRetry(`${BASE}/inventory/convert-grn/${grnId}`, { method: 'POST', headers: authHeaders() }),
};
