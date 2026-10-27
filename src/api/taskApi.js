const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error(`Server error (${res.status})`);
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Request failed');
  return d;
};

export const taskApi = {
  getAll:       (p = {}) => fetch(`${BASE}/tasks?${new URLSearchParams(p)}`, { headers: authHeaders() }).then(handle),
  getById:      (id)     => fetch(`${BASE}/tasks/${id}`, { headers: authHeaders() }).then(handle),
  create:       (body)   => fetch(`${BASE}/tasks`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update:       (id, body) => fetch(`${BASE}/tasks/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateStatus: (id, body) => fetch(`${BASE}/tasks/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete:       (id)     => fetch(`${BASE}/tasks/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Comments
  addComment:    (id, body)              => fetch(`${BASE}/tasks/${id}/comments`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteComment: (id, commentId)         => fetch(`${BASE}/tasks/${id}/comments/${commentId}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Bulk
  bulkUpdateStatus: (ids, status) => fetch(`${BASE}/tasks/bulk/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ ids, status }) }).then(handle),
  bulkDelete:       (ids)         => fetch(`${BASE}/tasks/bulk`, { method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ ids }) }).then(handle),
};
