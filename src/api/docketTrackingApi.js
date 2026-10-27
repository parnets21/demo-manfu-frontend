const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const API_BASE_URL = `${BASE}/docket-tracking`;

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

const buildQuery = (params = {}) => {
  const s = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  ).toString();
  return s ? `?${s}` : '';
};

export const docketTrackingApi = {
  getAllDockets: (params = {}) =>
    fetch(`${API_BASE_URL}${buildQuery(params)}`, { headers: authHeaders() }).then(handle),

  getDocketById: (id) =>
    fetch(`${API_BASE_URL}/${id}`, { headers: authHeaders() }).then(handle),

  createDocket: (docketData) =>
    fetch(API_BASE_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(docketData),
    }).then(handle),

  updateDocket: (id, docketData) =>
    fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(docketData),
    }).then(handle),

  updateDocketStatus: (id, statusData) =>
    fetch(`${API_BASE_URL}/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(statusData),
    }).then(handle),

  deleteDocket: (id) =>
    fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  trackByLRNumber: (lrNumber) =>
    fetch(`${API_BASE_URL}/track/${encodeURIComponent(lrNumber)}`, { headers: authHeaders() }).then(handle),

  getDashboardStats: () =>
    fetch(`${API_BASE_URL}/stats`, { headers: authHeaders() }).then(handle),

  getDelayedDockets: () =>
    fetch(`${API_BASE_URL}/delayed`, { headers: authHeaders() }).then(handle),

  uploadPOD: (id, podData) =>
    fetch(`${API_BASE_URL}/${id}/pod`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(podData),
    }).then(handle),

  uploadAttachment: (id, attachmentData) =>
    fetch(`${API_BASE_URL}/${id}/attachment`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(attachmentData),
    }).then(handle),

  getTrackingTimeline: (id) =>
    fetch(`${API_BASE_URL}/${id}/timeline`, { headers: authHeaders() }).then(handle),

  closeDocket: (id, closeData) =>
    fetch(`${API_BASE_URL}/${id}/close`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(closeData),
    }).then(handle),

  bulkUpdateStatus: (docketIds, statusData) =>
    fetch(`${API_BASE_URL}/bulk/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ docketIds, ...statusData }),
    }).then(handle),
};

export default docketTrackingApi;
