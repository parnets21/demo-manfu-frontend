const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const accountsLedgerApi = {
  getAll:              (params = {}) => fetch(`${BASE}/accounts-ledgers${q(params)}`,           { headers: authHeaders() }).then(handle),
  getById:             (id)          => fetch(`${BASE}/accounts-ledgers/${id}`,                  { headers: authHeaders() }).then(handle),
  getTransactions:     (id)          => fetch(`${BASE}/accounts-ledgers/${id}/transactions`,     { headers: authHeaders() }).then(handle),
  update:              (id, body)    => fetch(`${BASE}/accounts-ledgers/${id}`,                  { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateBalance:       (id, body)    => fetch(`${BASE}/accounts-ledgers/${id}/balance`,          { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  calculateClosing:    (id)          => fetch(`${BASE}/accounts-ledgers/${id}/balance/calculate-closing`, { method: 'POST', headers: authHeaders() }).then(handle),
  getBalanceSummary:   (id)          => fetch(`${BASE}/accounts-ledgers/${id}/balance-summary`,  { headers: authHeaders() }).then(handle),
  getPending:          ()            => fetch(`${BASE}/accounts-ledgers/sync/pending`,            { headers: authHeaders() }).then(handle),
  recalculateBalances: ()            => fetch(`${BASE}/accounts-ledgers/balance/recalculate`,    { method: 'POST', headers: authHeaders() }).then(handle),
  getTrialBalance:     ()            => fetch(`${BASE}/accounts-ledgers/reports/trial-balance`,  { headers: authHeaders() }).then(handle),
  getByType:           (type)        => fetch(`${BASE}/accounts-ledgers/type/${type}`,            { headers: authHeaders() }).then(handle),
};
