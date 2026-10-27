// Shared fetch helpers — mirrors the pattern used across the rest of the API layer
const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () =>
  localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

export const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('chakra_token');
    localStorage.removeItem('chakra_user');
    sessionStorage.removeItem('chakra_token');
    sessionStorage.removeItem('chakra_user');
    // Use React Router-safe redirect — don't do hard window.location crash
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chakra:unauthorized'));
    }
    throw new Error('Unauthorized – please log in again');
  }
  let d;
  try {
    d = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (status ${res.status})`);
  }
  if (!res.ok) throw new Error(d?.message || `Request failed (${res.status})`);
  return d;
};

export const api = {
  get:    (path)        => fetch(`${BASE}${path}`,  { headers: authHeaders() }).then(handle),
  post:   (path, body)  => fetch(`${BASE}${path}`,  { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  put:    (path, body)  => fetch(`${BASE}${path}`,  { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  patch:  (path, body)  => fetch(`${BASE}${path}`,  { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete: (path)        => fetch(`${BASE}${path}`,  { method: 'DELETE', headers: authHeaders() }).then(handle),
};

export default api;
