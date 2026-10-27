const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const financeApi = {
  // Dashboard
  getDashboardStats: () => fetch(`${BASE}/finance/dashboard`, { headers: authHeaders() }).then(handle),
  getRecentTransactions: () => fetch(`${BASE}/finance/transactions/recent`, { headers: authHeaders() }).then(handle),

  // Accounts Payable
  getAccountsPayable: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/accounts-payable${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  createAccountsPayable: (data) => fetch(`${BASE}/finance/accounts-payable`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),
  updateAccountsPayable: (id, data) => fetch(`${BASE}/finance/accounts-payable/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  // Accounts Receivable
  getAccountsReceivable: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/accounts-receivable${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  createAccountsReceivable: (data) => fetch(`${BASE}/finance/accounts-receivable`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),
  updateAccountsReceivable: (id, data) => fetch(`${BASE}/finance/accounts-receivable/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  // Supplier Payments
  getSupplierPayments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/supplier-payments${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  createSupplierPayment: (data) => fetch(`${BASE}/finance/supplier-payments`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  // Dealer Receipts
  getDealerReceipts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/dealer-receipts${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },
  createDealerReceipt: (data) => fetch(`${BASE}/finance/dealer-receipts`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(handle),

  // Supplier Ledger
  getSupplierLedger: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/supplier-ledger${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },

  // Dealer Ledger
  getDealerLedger: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/dealer-ledger${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },

  // Outstanding Invoices
  getOutstandingInvoices: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/outstanding-invoices${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },

  // Bank & Cash Accounts
  getBankCashAccounts: () => fetch(`${BASE}/finance/bank-cash-accounts`, { headers: authHeaders() }).then(handle),

  // Payment History
  getPaymentHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/payment-history${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },

  // Financial Reports
  getFinancialReports: (type, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/reports/${type}${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },

  // Vendor Credit Notes
  getVendorCreditNotes: (vendorId) => {
    const params = vendorId ? { vendorId } : {};
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/vendor-credit-notes${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },

  // Vendor Debit Notes
  getVendorDebitNotes: (vendorId) => {
    const params = vendorId ? { vendorId } : {};
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/finance/vendor-debit-notes${q ? '?' + q : ''}`, { headers: authHeaders() }).then(handle);
  },

  // Dynamic lookup lists for modal dropdowns
  getVendorsList: () => fetch(`${BASE}/finance/vendors-list`, { headers: authHeaders() }).then(handle),
  getDealersList: () => fetch(`${BASE}/finance/dealers-list`, { headers: authHeaders() }).then(handle),
};
