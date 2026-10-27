const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://demo-manfu-backened.onrender.com/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

// Helper to get/set mock payments from localStorage
const getMockPayments = () => {
  try {
    return JSON.parse(localStorage.getItem('mock_invoice_payments') || '{}');
  } catch {
    return {};
  }
};
const setMockPayments = (payments) => {
  localStorage.setItem('mock_invoice_payments', JSON.stringify(payments));
};

// Mock API response handler
const handle = async (res) => { 
  const d = await res.json(); 
  if (!res.ok) throw new Error(d.message || 'Request failed'); 
  return d; 
};
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

export const poGeneratorApi = {
  getStats:          ()             => fetch(`${BASE}/po-generator/stats`,                          { headers: authHeaders() }).then(handle),
  getUploadSummary:  (params = {})  => fetch(`${BASE}/po-generator/upload-summary${q(params)}`,     { headers: authHeaders() }).then(handle),
  listPOs:           (params = {})  => fetch(`${BASE}/po-generator/pos${q(params)}`,                { headers: authHeaders() }).then(handle),
  deletePO:          (id)           => fetch(`${BASE}/po-generator/pos/${id}`,                       { method: 'DELETE', headers: authHeaders() }).then(handle),
  stockCheck:        (poId)         => fetch(`${BASE}/po-generator/stock-check/${poId}`,             { headers: authHeaders() }).then(handle),
  generateInvoice:   (body)         => fetch(`${BASE}/po-generator/generate-invoice`,               { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  generateInvoiceFromPDF: (body)    => fetch(`${BASE}/po-generator/generate-invoice-from-pdf`,      { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  listInvoices:      (params = {})  => fetch(`${BASE}/po-generator/invoices${q(params)}`,           { headers: authHeaders() }).then(handle),
  listGRNInvoices:   (params = {})  => fetch(`${BASE}/po-generator/invoices${q({ ...params, prefix: 'GRNINV' })}`, { headers: authHeaders() }).then(handle),
  getInvoiceById:    (id)           => fetch(`${BASE}/po-generator/invoices/${id}`,                  { headers: authHeaders() }).then(handle),
  updateInvoiceStatus:(id, status)  => fetch(`${BASE}/po-generator/invoices/${id}/status`,          { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  updateDelivery:    (id, items)    => fetch(`${BASE}/po-generator/invoices/${id}/delivery`,         { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ items }) }).then(handle),
  deleteInvoice:     (id)           => fetch(`${BASE}/po-generator/invoices/${id}`,                  { method: 'DELETE', headers: authHeaders() }).then(handle),
  listPendingOrders: (params = {})  => fetch(`${BASE}/po-generator/pending-orders${q(params)}`,     { headers: authHeaders() }).then(handle),
  updatePendingOrder:(id, body)     => fetch(`${BASE}/po-generator/pending-orders/${id}`,           { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  migrateHSN:        ()             => fetch(`${BASE}/po-generator/migrate-hsn`,                    { method: 'POST', headers: authHeaders() }).then(handle),

  // Company management
  listCompanies:     ()             => fetch(`${BASE}/po-generator/companies`,                       { headers: authHeaders() }).then(handle),
  createCompany:     (body)         => fetch(`${BASE}/po-generator/companies`,                       { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateCompany:     (id, body)     => fetch(`${BASE}/po-generator/companies/${id}`,                 { method: 'PUT',  headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteCompany:     (id)           => fetch(`${BASE}/po-generator/companies/${id}`,                 { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Company-wise item tracking
  getCompanyItems:      (companyId)    => fetch(`${BASE}/po-generator/company-items/${companyId}`,      { headers: authHeaders() }).then(handle),
  getCompaniesSummary:  ()             => fetch(`${BASE}/po-generator/companies-summary`,                { headers: authHeaders() }).then(handle),
  updateItemDispatch:(invoiceId, itemId, body) => fetch(`${BASE}/po-generator/invoices/${invoiceId}/items/${itemId}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  // ── PO Upload flow (records ordered vs sent, no invoice) ─────────────────────
  // Upload a PO with optional PDF file. `payload` = { poNumber, vendorName, buyerName,
  // buyerAddress, buyerGSTIN, companyId, items:[{name,hsn,requiredQty,sentQty,unit,rate}], source, notes }
  // `file` (optional) = the PDF File object.
  uploadPO: (payload, file) => {
    const fd = new FormData();
    fd.append('payload', JSON.stringify(payload || {}));
    if (file) fd.append('file', file);
    // Do NOT set Content-Type — browser adds the multipart boundary automatically
    return fetch(`${BASE}/po-generator/po-uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    }).then(handle);
  },
  listPOUploads:     (params = {})     => fetch(`${BASE}/po-generator/po-uploads${q(params)}`,           { headers: authHeaders() }).then(handle),
  getPOUpload:       (id)              => fetch(`${BASE}/po-generator/po-uploads/${id}`,                 { headers: authHeaders() }).then(handle),
  deletePOUpload:    (id)              => fetch(`${BASE}/po-generator/po-uploads/${id}`,                 { method: 'DELETE', headers: authHeaders() }).then(handle),
  updatePOUploadItem:(id, itemId, body)=> fetch(`${BASE}/po-generator/po-uploads/${id}/items/${itemId}`,{ method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  getPOCompaniesSummary: ()            => fetch(`${BASE}/po-generator/po-companies-summary`,             { headers: authHeaders() }).then(handle),
  getPOCompanyDetail:(companyId)       => fetch(`${BASE}/po-generator/po-company/${companyId}`,          { headers: authHeaders() }).then(handle),
  
  // Payment tracking endpoints (with mock fallback)
  listPayments:      (invoiceId)    => {
    // First try real API
    return fetch(`${BASE}/po-generator/invoices/${invoiceId}/payments`, { headers: authHeaders() })
      .then(handle)
      .catch(() => {
        // Fallback to mock
        const mockPayments = getMockPayments();
        return { data: mockPayments[invoiceId] || [] };
      });
  },
  addPayment:        (invoiceId, body) => {
    return fetch(`${BASE}/po-generator/invoices/${invoiceId}/payments`, { 
      method: 'POST', 
      headers: authHeaders(), 
      body: JSON.stringify(body) 
    })
      .then(handle)
      .catch(() => {
        // Fallback to mock
        const mockPayments = getMockPayments();
        const newPayment = {
          _id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...body,
          createdAt: new Date().toISOString()
        };
        if (!mockPayments[invoiceId]) {
          mockPayments[invoiceId] = [];
        }
        mockPayments[invoiceId].push(newPayment);
        setMockPayments(mockPayments);
        return { data: newPayment };
      });
  },
  deletePayment:     (invoiceId, paymentId) => {
    return fetch(`${BASE}/po-generator/invoices/${invoiceId}/payments/${paymentId}`, { 
      method: 'DELETE', 
      headers: authHeaders() 
    })
      .then(handle)
      .catch(() => {
        // Fallback to mock
        const mockPayments = getMockPayments();
        if (mockPayments[invoiceId]) {
          mockPayments[invoiceId] = mockPayments[invoiceId].filter(p => p._id !== paymentId);
          setMockPayments(mockPayments);
        }
        return { success: true };
      });
  },
};
