import { api } from './axiosConfig.js';

const BASE = '/production-entries';

const qs = (p = {}) => {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, v); });
  const s = q.toString();
  return s ? '?' + s : '';
};

export const productionApi = {
  getAll:           (params = {}) => api.get(`${BASE}${qs(params)}`),
  getDashboard:     ()            => api.get(`${BASE}/dashboard`),
  getMonthlyReport: (month)       => api.get(`${BASE}/monthly-report?month=${month}`),
  getById:          (id)          => api.get(`${BASE}/${id}`),
  create:           (data)        => api.post(BASE, data),
  update:           (id, data)    => api.put(`${BASE}/${id}`, data),
  remove:           (id)          => api.delete(`${BASE}/${id}`),
};

export default productionApi;
