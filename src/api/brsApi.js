const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Request failed');
  return d;
};

export const brsApi = {
  uploadStatement: async (file, bankName = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (bankName) formData.append('bankName', bankName);

    const res = await fetch(`${BASE}/brs/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });
    return handle(res);
  },
  getStatements: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE}/brs${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(),
    });
    return handle(res);
  },
  getReconciliation: async (id) => {
    const res = await fetch(`${BASE}/brs/${id}`, {
      headers: authHeaders(),
    });
    return handle(res);
  },
  reconcile: async (id, data) => {
    const res = await fetch(`${BASE}/brs/${id}/reconcile`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handle(res);
  },
};
