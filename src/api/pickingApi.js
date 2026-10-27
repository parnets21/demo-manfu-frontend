const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = (isGet = false) => {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (!isGet) headers['Content-Type'] = 'application/json';
  return headers;
};

const fetchWithRetry = async (url, options = {}, retries = 2) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status !== 304) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || `Request failed with status ${res.status}`);
    }
    if (res.status === 304) return { success: true, data: [] };
    return await res.json();
  } catch (err) {
    if (retries > 0 && (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('status 304'))) {
      console.warn(`Fetch failed, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
};

const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const pickingApi = {
  // Get all picking lists
  getAll: (params = {}) => fetchWithRetry(`${BASE}/picking${q(params)}`, { headers: authHeaders(true) }),
  
  // Get picking stats
  getStats: () => fetchWithRetry(`${BASE}/picking/stats`, { headers: authHeaders(true) }),
  
  // Create picking list
  create: (body) => fetchWithRetry(`${BASE}/picking`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }),
  
  // Get picking list by ID
  getById: (id) => fetchWithRetry(`${BASE}/picking/${id}`, { headers: authHeaders(true) }),
  
  // Update picking list status
  updateStatus: (id, body) => fetchWithRetry(`${BASE}/picking/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }),
  
  // Delete picking list
  delete: (id) => fetchWithRetry(`${BASE}/picking/${id}`, { method: 'DELETE', headers: authHeaders() }),
};

export default pickingApi;
