const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const bulkQuotationRequestApi = {
  // Basic CRUD operations
  create: (requestData) =>
    fetch(`${BASE}/bulk-quotation-requests`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(requestData),
    }).then(handle),

  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE}/bulk-quotation-requests${q ? '?' + q : ''}`, { 
      headers: authHeaders() 
    }).then(handle);
  },

  getById: (id) => 
    fetch(`${BASE}/bulk-quotation-requests/${id}`, { 
      headers: authHeaders() 
    }).then(handle),

  // Status management
  updateStatus: (id, status, notes = '') =>
    fetch(`${BASE}/bulk-quotation-requests/${id}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status, notes }),
    }).then(handle),

  submitForApproval: (id) =>
    fetch(`${BASE}/bulk-quotation-requests/${id}/submit`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handle),

  approve: (id, approvalData) =>
    fetch(`${BASE}/bulk-quotation-requests/${id}/approve`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(approvalData),
    }).then(handle),

  // Workflow operations
  performInventoryCheck: (id) =>
    fetch(`${BASE}/bulk-quotation-requests/${id}/inventory-check`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handle),

  createProductionPlan: (id, planData) =>
    fetch(`${BASE}/bulk-quotation-requests/${id}/production-plan`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(planData),
    }).then(handle),

  // Query operations
  getByStatus: (status) =>
    fetch(`${BASE}/bulk-quotation-requests/status/${status}`, { 
      headers: authHeaders() 
    }).then(handle),

  getPendingApprovals: () =>
    fetch(`${BASE}/bulk-quotation-requests/approvals/pending`, { 
      headers: authHeaders() 
    }).then(handle),

  getDashboardStats: () =>
    fetch(`${BASE}/bulk-quotation-requests/dashboard/stats`, { 
      headers: authHeaders() 
    }).then(handle),

  // Utility functions
  formatRequestData: (formData) => {
    return {
      clientId: formData.clientId,
      deliveryDate: formData.deliveryDate,
      products: formData.products.map(product => ({
        productName: product.productName?.trim(),
        productType: product.productType || 'Bottle',
        quantity: parseInt(product.quantity) || 0,
        unit: product.unit || 'Pieces',
        specifications: {
          material: product.specifications?.material?.trim(),
          size: product.specifications?.size?.trim(),
          color: product.specifications?.color?.trim(),
          finish: product.specifications?.finish?.trim(),
          customRequirements: product.specifications?.customRequirements?.trim()
        }
      })),
      packaging: {
        type: formData.packaging?.type || 'Standard',
        customBranding: formData.packaging?.customBranding || false,
        brandingDetails: formData.packaging?.brandingDetails || {}
      },
      paymentTerms: formData.paymentTerms || 'Net 30',
      creditTerms: formData.creditTerms || {
        creditRequired: false,
        creditAmount: 0,
        creditPeriod: 30
      },
      notes: formData.notes?.trim() || ''
    };
  },

  validateRequestData: (data) => {
    const errors = {};

    if (!data.clientId) {
      errors.clientId = 'Client is required';
    }

    if (!data.deliveryDate) {
      errors.deliveryDate = 'Delivery date is required';
    } else {
      const deliveryDate = new Date(data.deliveryDate);
      const today = new Date();
      if (deliveryDate <= today) {
        errors.deliveryDate = 'Delivery date must be in the future';
      }
    }

    if (!data.products || data.products.length === 0) {
      errors.products = 'At least one product is required';
    } else {
      data.products.forEach((product, index) => {
        if (!product.productName?.trim()) {
          errors[`products.${index}.productName`] = 'Product name is required';
        }
        if (!product.quantity || product.quantity <= 0) {
          errors[`products.${index}.quantity`] = 'Valid quantity is required';
        }
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  getStatusColor: (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Submitted': 'bg-blue-100 text-blue-800',
      'Under Review': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Quoted': 'bg-purple-100 text-purple-800',
      'Converted': 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  getStatusIcon: (status) => {
    const icons = {
      'Draft': '📝',
      'Submitted': '📤',
      'Under Review': '👀',
      'Approved': '✅',
      'Rejected': '❌',
      'Quoted': '💰',
      'Converted': '🎉'
    };
    return icons[status] || '📄';
  },

  formatCurrency: (amount) => {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  },

  formatQuantity: (quantity, unit) => {
    if (!quantity) return '0';
    const formattedQty = quantity.toLocaleString('en-IN');
    return unit ? `${formattedQty} ${unit}` : formattedQty;
  }
};