const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const fetchWithRetry = async (url, options = {}, retries = 2) => {
  try {
    const res = await fetch(url, options);
    // Handle 304 Not Modified as success with empty data
    if (res.status === 304) {
      return { success: true, data: [], notModified: true };
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (retries > 0 && (err.name === 'TypeError' || err.message.includes('Failed to fetch'))) {
      console.warn(`Fetch failed, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
};

const getUrl = (path, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return query ? `${BASE}${path}?${query}` : `${BASE}${path}`;
};

export const materialReturnApi = {
  // Master Lifecycle
  getAll:  (p = {}) => fetchWithRetry(getUrl('/returns', p), { headers: authHeaders() }),
  getById: (id) => fetchWithRetry(getUrl(`/returns/${id}`), { headers: authHeaders() }),
  getStats: () => fetchWithRetry(getUrl('/returns/dashboard'), { headers: authHeaders() }),
  getInvoiceContext: (invoiceNo) => fetchWithRetry(getUrl(`/returns/invoice/${encodeURIComponent(invoiceNo)}/context`), { headers: authHeaders() }),
  create:  (body) => fetchWithRetry(getUrl('/returns'), { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }),
  approve: (id) => fetchWithRetry(getUrl(`/returns/${id}/approve`), { method: 'PUT', headers: authHeaders() }),
  generateDocket: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/docket`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  createGateEntry: (id) => fetchWithRetry(getUrl(`/returns/${id}/gate-entry`), { method: 'POST', headers: authHeaders() }),
  receiveMaterial: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/receive`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  qcVerify: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/qc-verify`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  inventoryUpdate: (id) => fetchWithRetry(getUrl(`/returns/${id}/inventory-update`), { method: 'POST', headers: authHeaders() }),
  financeClose: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/finance-close`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  updateStatus: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/status`), { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }),
  updateStage: (id, stage, approvalStatus) => fetchWithRetry(getUrl(`/returns/${id}/stage`), { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ stage, ...(approvalStatus ? { approvalStatus } : {}) }) }),
  
  // Specific Module Actions
  processQC: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/qc`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  processInventory: (id) => fetchWithRetry(getUrl(`/returns/${id}/inventory`), { method: 'POST', headers: authHeaders() }),
  processReconciliation: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/reconciliation`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  processLoss: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/loss`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  updateTransport: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/transport`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  
  // Warehouse Operations
  getWarehouseQueue: () => fetchWithRetry(getUrl('/returns/warehouse/queue'), { headers: authHeaders() }),
  getWarehouseReturns: () => fetchWithRetry(getUrl('/returns/warehouse/returns'), { headers: authHeaders() }),
  receiveAtWarehouse: (id, data) => fetchWithRetry(getUrl(`/returns/${id}/warehouse/receive`), { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data) }),

  // Workflow tracking
  getWorkflowStatus: (id) => fetchWithRetry(getUrl(`/returns/${id}/workflow/status`), { headers: authHeaders() }),
  processWorkflowStage: (id, stage) => fetchWithRetry(getUrl(`/returns/${id}/workflow/process`), { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ stage }) }),

  // Utilities
  delete: (id) => fetchWithRetry(getUrl(`/returns/${id}`), { method: 'DELETE', headers: authHeaders() }),
};
