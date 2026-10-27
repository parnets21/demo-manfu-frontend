const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const fetchWithRetry = async (url, options = {}, retries = 2) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (retries > 0 && (err.name === 'TypeError' || err.message.includes('Failed to fetch'))) {
      console.warn(`Fetch failed, retrying... (${retries} left)`);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
};

const getUrl = (path, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return query ? `${BASE}${path}?${query}` : `${BASE}${path}`;
};

export const invoiceApi = {
  getAll:       (params = {}) => fetchWithRetry(getUrl('/invoices', params), { headers: authHeaders() }),
  getStats:     ()            => fetchWithRetry(getUrl('/invoices/stats'), { headers: authHeaders() }),
  getById:      (id)          => fetchWithRetry(getUrl(`/invoices/${id}`), { headers: authHeaders() }),
  create:       (body)        => fetchWithRetry(getUrl('/invoices'), { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }),
  createFromSalesOrder: (orderId) => fetchWithRetry(getUrl(`/invoices/from-order/${orderId}`), { method: 'POST', headers: authHeaders() }),
  bulkUpload:   (body)        => fetchWithRetry(getUrl('/invoices/bulk-upload'), { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }),
  migrateTypes: ()            => fetchWithRetry(getUrl('/invoices/migrate-types'), { method: 'POST', headers: authHeaders() }),
  update:       (id, body)    => fetchWithRetry(getUrl(`/invoices/${id}`), { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }),
  updateStatus: (id, status)  => fetchWithRetry(getUrl(`/invoices/${id}/status`), { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) }),
  delete:       (id)          => fetchWithRetry(getUrl(`/invoices/${id}`), { method: 'DELETE', headers: authHeaders() }),
  deleteAll:    ()            => fetchWithRetry(getUrl('/invoices/delete-all'), { method: 'POST', headers: authHeaders() }),
  sendEmail:    (id, body)    => fetchWithRetry(getUrl(`/invoices/${id}/send-email`), { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }),
  getByInvoiceNo: (invoiceNo) => fetchWithRetry(getUrl(`/invoices/no/${invoiceNo}`), { headers: authHeaders() }),
  // Send a single invoice to Tally as a Sales Voucher
  sendToTally:  (id)          => fetchWithRetry(getUrl(`/invoices/${id}/send-to-tally`), { method: 'POST', headers: authHeaders() }),
  // Re-run normalizeToTallyVoucher on all stored invoices (fixes tax-rate baked-in bugs)
  renormalizeAll: ()          => fetchWithRetry(getUrl('/invoices/renormalize-all'), { method: 'POST', headers: authHeaders() }),
  // Convenience: fetch only GRN receipt invoices (auto-generated when QC passes)
  getGRNInvoices:         (params = {}) => fetchWithRetry(getUrl('/invoices', { ...params, invoiceSource: 'grn_receipt' }), { headers: authHeaders() }),
  // Convenience: fetch only manual stock entry invoices
  getManualStockInvoices: (params = {}) => fetchWithRetry(getUrl('/invoices', { ...params, invoiceSource: 'manual_stock_entry' }), { headers: authHeaders() }),
};

// ── Stock Invoice Archive API (permanent history — independent of deletions) ──
export const stockInvoiceArchiveApi = {
  getAll:       (params = {}) => fetchWithRetry(getUrl('/stock-invoice-archive', params), { headers: authHeaders() }),
  getStats:     ()            => fetchWithRetry(getUrl('/stock-invoice-archive/stats'), { headers: authHeaders() }),
  getById:      (id)          => fetchWithRetry(getUrl(`/stock-invoice-archive/${id}`), { headers: authHeaders() }),
  updateStatus: (id, status)  => fetchWithRetry(getUrl(`/stock-invoice-archive/${id}/status`), { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) }),
  sync:         ()            => fetchWithRetry(getUrl('/stock-invoice-archive/sync'), { method: 'POST', headers: authHeaders() }),
  delete:       (id)          => fetchWithRetry(getUrl(`/stock-invoice-archive/${id}`), { method: 'DELETE', headers: authHeaders() }),
  deleteAll:    ()            => fetchWithRetry(getUrl('/stock-invoice-archive/delete-all'), { method: 'POST', headers: authHeaders() }),
};
