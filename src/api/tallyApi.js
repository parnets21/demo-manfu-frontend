const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://demo-manfu-backened.onrender.com/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const handle = async (res) => {
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Request failed');
  if (!d.success && d.offline) return d;
  return d;
};

const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

/**
 * openDirectionalStream — opens an SSE connection for Import or Export.
 *
 * @param {'import'|'export'|'full-export'|'selective-export'} direction
 * @param {string}   type    - entity type or task key
 * @param {Function} onEvent - callback({ event, entity, message, stats, ... })
 * @returns {{ close: () => void }}   call .close() to cancel
 */
function openDirectionalStream(direction, type = 'Full', onEvent) {
  const token = getToken();
  let es;
  let closed = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY_MS = 2000; // Initial delay, will backoff

  const buildUrl = () => {
    if (direction === 'full-export') {
      return `${BASE}/tally/full-export-stream?token=${encodeURIComponent(token)}`;
    } else if (direction === 'selective-export') {
      return `${BASE}/tally/selective-export?key=${encodeURIComponent(type)}&token=${encodeURIComponent(token)}`;
    } else if (direction === 'po-export') {
      return `${BASE}/tally/po-export-stream?token=${encodeURIComponent(token)}`;
    } else {
      const endpoint = direction === 'export' ? 'export-stream' : 'import-stream';
      return `${BASE}/tally/${endpoint}?type=${encodeURIComponent(type)}&token=${encodeURIComponent(token)}`;
    }
  };

  const connect = () => {
    if (closed) return;

    es = new EventSource(buildUrl());

    es.onmessage = (e) => {
      try { 
        if (e.data.trim().startsWith(':')) {
          // Heartbeat comment, ignore
          return;
        }
        onEvent(JSON.parse(e.data)); 
      } catch (_) {}
    };

    es.onerror = (err) => {
      if (closed) {
        es.close();
        return;
      }
      
      console.warn('SSE connection error:', err);
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
        onEvent({ 
          event: 'info', 
          message: `Stream connection lost. Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...` 
        });
        
        setTimeout(() => {
          if (!closed) connect();
        }, delay);
      } else {
        onEvent({ event: 'error', message: 'Stream connection lost. Check your network and try again.' });
        close();
      }
      
      if (es) es.close();
    };
  };

  const close = () => {
    closed = true;
    if (es) {
      es.close();
      es = null;
    }
  };

  connect();
  return { close };
}

export const tallyApi = {
  // ── Configuration ─────────────────────────────────────────────────────────
  getConfig:        ()       => fetch(`${BASE}/tally/config`,                    { headers: authHeaders() }).then(handle),
  saveConfig:       (body)   => fetch(`${BASE}/tally/config`,                    { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  fixConfig:        ()       => fetch(`${BASE}/tally/config/fix`,                { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),
  testConnection:   ()       => fetch(`${BASE}/tally/test-connection`,           { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),

  // ── Company Validation ─────────────────────────────────────────────────────
  /**
   * Validates that Tally is running and the correct company ("MANUFACTURING ERP") is open.
   * Returns: { reachable, openCompany, companyMatch, error }
   */
  validateCompany:  ()       => fetch(`${BASE}/tally/validate-company`,          { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),

  // ── Export Counts (pre-flight data summary) ────────────────────────────────
  getExportCounts:  ()       => fetch(`${BASE}/tally/export-counts`,             { headers: authHeaders() }).then(handle),

  // ── IMPORT FROM TALLY (Tally → ERP) ───────────────────────────────────────
  openImportStream: (type = 'Full', onEvent) => openDirectionalStream('import', type, onEvent),
  importFromTally:  (body)   => fetch(`${BASE}/tally/import`,                    { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  // ── EXPORT TO TALLY — Complete system (ERP → Tally) ───────────────────────
  /**
   * openFullExportStream — streams all 14 export tasks to Tally.
   * Validates connection + company before starting.
   * @param {Function} onEvent - callback(evt)
   * @returns {EventSource}
   */
  openFullExportStream: (onEvent) => openDirectionalStream('full-export', 'Full', onEvent),

  /**
   * openSelectiveExportStream — exports a single entity type.
   * @param {string}   key     - task key (e.g. 'salesInvoices', 'vendorLedgers', etc.)
   * @param {Function} onEvent - callback(evt)
   * @returns {EventSource}
   */
  openSelectiveExportStream: (key, onEvent) => openDirectionalStream('selective-export', key, onEvent),

  // ── EXPORT TO TALLY — Legacy (kept for backward compat) ───────────────────
  openExportStream: (type = 'Full', onEvent) => openDirectionalStream('export', type, onEvent),
  exportToTally:    (body)   => fetch(`${BASE}/tally/export`,                    { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  // ── Legacy sync (kept for backward compatibility) ──────────────────────────
  triggerSync:      (body)   => fetch(`${BASE}/tally/sync`,                      { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  fullSync:         ()       => fetch(`${BASE}/tally/sync`,                      { method: 'POST', headers: authHeaders(), body: JSON.stringify({ type: 'Full' }) }).then(handle),
  retrySync:        (id)     => fetch(`${BASE}/tally/retry/${id}`,               { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),

  /** @deprecated Use openImportStream or openFullExportStream instead */
  openSyncStream: (type = 'Full', onEvent) => openDirectionalStream('import', type, onEvent),

  // ── Status / Logs ──────────────────────────────────────────────────────────
  getSyncLogs:      (p = {}) => fetch(`${BASE}/tally/logs${q(p)}`,               { headers: authHeaders() }).then(handle),
  getSyncStats:     ()       => fetch(`${BASE}/tally/stats`,                     { headers: authHeaders() }).then(handle),
  getMasterData:    ()       => fetch(`${BASE}/tally/master-data`,               { headers: authHeaders() }).then(handle),
  getTransactions:  ()       => fetch(`${BASE}/tally/transactions`,              { headers: authHeaders() }).then(handle),

  // ── Vouchers (All types: Sales, Purchase, Payment, Receipt, Journal, Contra)
  getVouchers:      (p = {}) => fetch(`${BASE}/tally/vouchers${q(p)}`,           { headers: authHeaders() }).then(handle),
  getVoucherById:   (id)     => fetch(`${BASE}/tally/vouchers/${id}`,            { headers: authHeaders() }).then(handle),
  createVoucher:    (body)   => fetch(`${BASE}/tally/vouchers`,                  { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateVoucher:    (id, body) => fetch(`${BASE}/tally/vouchers/${id}`,          { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteVoucher:    (id)     => fetch(`${BASE}/tally/vouchers/${id}`,            { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Reset voucher sync states so next import re-fetches all amounts from Tally
  resetVoucherSyncStates: () =>
    fetch(`${BASE}/tally/reset-voucher-sync-states`, { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),

  // Reset invoice tallySync flags so already-exported invoices are re-exported on next run.
  // Pass { invoiceNos: ['INV-001'] } to reset specific invoices, or no body to reset all.
  resetInvoiceSyncFlags: (body = {}) =>
    fetch(`${BASE}/tally/reset-invoice-sync`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  // Re-normalize all tallyVoucher sub-documents with latest normalizer logic.
  // Run this after any code change to normalizeToTallyVoucher to update stored data.
  // After this, reset sync flags and re-export to Tally.
  remigrateGstFields: () =>
    fetch(`${BASE}/tally/remigrate-gst-fields`, { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),

  // ── GUID sync status ───────────────────────────────────────────────────────
  getGuidStatus:    ()       => fetch(`${BASE}/tally/guid-status`,               { headers: authHeaders() }).then(handle),

  // ── Sales Register: Import + Query (April–June) ────────────────────────────
  /**
   * importSalesRegister — pull Sales vouchers for a specific date range.
   * @param {string} fromDate - "YYYY-MM-DD"
   * @param {string} toDate   - "YYYY-MM-DD"
   */
  importSalesRegister: ({ fromDate, toDate }) =>
    fetch(`${BASE}/tally/import-sales-register`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ fromDate, toDate }),
    }).then(handle),

  /**
   * getSalesInvoices — query imported Sales Register vouchers by date range.
   * Returns { vouchers, invoices, voucherTotal, invoiceTotal, totalSalesRecords }
   */
  getSalesInvoices: (p = {}) =>
    fetch(`${BASE}/tally/sales-invoices${q(p)}`,  { headers: authHeaders() }).then(handle),

  // ── PO Invoice Export (separate from Sales Export) ────────────────────────
  /**
   * openPOExportStream — streams PO Invoice export to Tally.
   * Completely separate from the Sales Export — safe to call independently.
   * @param {Function} onEvent - callback(evt)
   * @returns {{ close: () => void }}
   */
  openPOExportStream: (onEvent) => openDirectionalStream('po-export', 'POInvoices', onEvent),

  /**
   * getPOExportCount — number of PO Invoices pending Tally export.
   */
  getPOExportCount: () =>
    fetch(`${BASE}/tally/po-export-count`, { headers: authHeaders() }).then(handle),

  // ── Connector credentials & multi-connector management ───────────────────
  generateConnectorCredentials: () =>
    fetch(`${BASE}/tally/connectors/generate-credentials`, { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),
  getConnectorStatus: () =>
    fetch(`${BASE}/tally/connectors/status`, { headers: authHeaders() }).then(handle),
  listConnectors: () =>
    fetch(`${BASE}/connector/list`, { headers: authHeaders() }).then(handle),
  setDefaultConnector: (connectorId) =>
    fetch(`${BASE}/connector/set-default/${encodeURIComponent(connectorId)}`, { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),
  removeConnector: (connectorId) =>
    fetch(`${BASE}/connector/remove/${encodeURIComponent(connectorId)}`, { method: 'DELETE', headers: authHeaders() }).then(handle),

  // ── Full diagnostics (config + connectivity + DB counts + recent logs) ─────
  getDiagnostics:   ()       => fetch(`${BASE}/tally/diagnostics`,               { headers: authHeaders() }).then(handle),

  // ── Unified dashboard stats (ERP + Tally counts in one call) ─────────────
  getDashboardStats: ()      => fetch(`${BASE}/tally/dashboard-stats`,           { headers: authHeaders() }).then(handle),

  // ── Fix bill-to address + pincode on all existing invoices & vouchers ──────
  fixBillToData: () =>
    fetch(`${BASE}/tally/fix-bill-to-data`, { method: 'POST', headers: authHeaders(), body: '{}' }).then(handle),
};