const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const API_URL = `${BASE}/bulk-order-approvals`;

const getToken = () =>
  localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Request failed');
  return d;
};

export const bulkOrderApprovalApi = {
  createApprovalWorkflow: (data) =>
    fetch(API_URL, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  getApprovalById: (id) =>
    fetch(`${API_URL}/${id}`, { headers: authHeaders() }).then(handle),

  getPendingApprovals: (role) =>
    fetch(`${API_URL}?role=${encodeURIComponent(role || '')}`, { headers: authHeaders() }).then(handle),

  approveAtLevel: (id, remarks) =>
    fetch(`${API_URL}/${id}/approve`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ remarks }),
    }).then(handle),

  rejectApproval: (id, rejectionReason) =>
    fetch(`${API_URL}/${id}/reject`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ rejectionReason }),
    }).then(handle),

  getApprovalStats: () =>
    fetch(`${API_URL}/stats/summary`, { headers: authHeaders() }).then(handle),
};
