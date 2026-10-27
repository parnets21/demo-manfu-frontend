import axiosInstance from './axiosConfig';

const ERP_DEALER_ORDERS_BASE = '/erp/dealer-orders';

export const erpDealerOrderApi = {
  getAll: (params) => axiosInstance.get(ERP_DEALER_ORDERS_BASE, { params }),
  getById: (id) => axiosInstance.get(`${ERP_DEALER_ORDERS_BASE}/${id}`),
  approve: (id, data) => axiosInstance.post(`${ERP_DEALER_ORDERS_BASE}/${id}/approve`, data),
  reject: (id, data) => axiosInstance.post(`${ERP_DEALER_ORDERS_BASE}/${id}/reject`, data),
  getPicking: (orderId) => axiosInstance.get(`${ERP_DEALER_ORDERS_BASE}/${orderId}/picking`),
  updatePicking: (id, data) => axiosInstance.put(`${ERP_DEALER_ORDERS_BASE}/picking/${id}`, data),
  getSorting: (orderId) => axiosInstance.get(`${ERP_DEALER_ORDERS_BASE}/${orderId}/sorting`),
  updateSorting: (id, data) => axiosInstance.put(`${ERP_DEALER_ORDERS_BASE}/sorting/${id}`, data),
  getPacking: (orderId) => axiosInstance.get(`${ERP_DEALER_ORDERS_BASE}/${orderId}/packing`),
  updatePacking: (id, data) => axiosInstance.put(`${ERP_DEALER_ORDERS_BASE}/packing/${id}`, data),
  generateInvoice: (orderId) => axiosInstance.post(`${ERP_DEALER_ORDERS_BASE}/${orderId}/invoice`),
  updateDispatch: (orderId, data) => axiosInstance.put(`${ERP_DEALER_ORDERS_BASE}/${orderId}/dispatch`, data),
  markDelivered: (orderId) => axiosInstance.post(`${ERP_DEALER_ORDERS_BASE}/${orderId}/deliver`),
  getDashboardStats: () => axiosInstance.get(`${ERP_DEALER_ORDERS_BASE}/dashboard`),
};