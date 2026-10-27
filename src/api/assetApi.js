const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

// Set to true once you deploy the backend with asset routes
const ASSET_API_DEPLOYED = true;

const handle = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error(`Asset API not available (${res.status})`);
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Request failed');
  return d;
};

// localStorage fallback store
const LS_KEY = 'chakra_assets_local';
const localStore = {
  getAll: () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } },
  save:   (items) => localStorage.setItem(LS_KEY, JSON.stringify(items)),
  nextId: () => {
    const items = localStore.getAll();
    if (!items.length) return 'AST-001';
    const nums = items.map(a => parseInt((a.assetId || '').replace('AST-', '')) || 0);
    return `AST-${String(Math.max(...nums) + 1).padStart(3, '0')}`;
  },
};

const localApi = {
  getAll:     (p = {}) => {
    let items = localStore.getAll();
    if (p.status)   items = items.filter(a => a.status === p.status);
    if (p.category) items = items.filter(a => a.category === p.category);
    if (p.search)   items = items.filter(a => a.name?.toLowerCase().includes(p.search.toLowerCase()));
    return Promise.resolve({ success: true, data: items });
  },
  getById:    (id) => {
    const item = localStore.getAll().find(a => a._id === id);
    return Promise.resolve({ success: true, data: item });
  },
  getSummary: () => {
    const items = localStore.getAll();
    const count = (s) => items.filter(a => a.status === s).length;
    return Promise.resolve({ success: true, data: {
      total: items.length, active: count('Active'), maintenance: count('Maintenance'),
      inactive: count('Inactive'), disposed: count('Disposed'),
      totalPurchaseValue: items.reduce((s, a) => s + (a.purchaseValue || 0), 0),
      totalCurrentValue:  items.reduce((s, a) => s + (a.currentValue  || 0), 0),
    }});
  },
  create: (body) => {
    const items = localStore.getAll();
    const newItem = { ...body, _id: `local_${Date.now()}`, assetId: localStore.nextId(), maintenanceLogs: [], createdAt: new Date().toISOString() };
    localStore.save([newItem, ...items]);
    return Promise.resolve({ success: true, data: newItem });
  },
  update: (id, body) => {
    const items = localStore.getAll().map(a => a._id === id ? { ...a, ...body } : a);
    localStore.save(items);
    return Promise.resolve({ success: true, data: items.find(a => a._id === id) });
  },
  delete: (id) => {
    localStore.save(localStore.getAll().filter(a => a._id !== id));
    return Promise.resolve({ success: true });
  },
  addMaintenance: (id, body) => {
    const items = localStore.getAll().map(a => {
      if (a._id !== id) return a;
      const log = { ...body, _id: `log_${Date.now()}`, createdAt: new Date().toISOString() };
      const updated = { ...a, maintenanceLogs: [...(a.maintenanceLogs || []), log] };
      if (body.nextMaintDate) updated.nextMaintDate = body.nextMaintDate;
      if (body.status === 'In Progress') updated.status = 'Maintenance';
      if (body.status === 'Completed')   updated.status = 'Active';
      return updated;
    });
    localStore.save(items);
    return Promise.resolve({ success: true, data: items.find(a => a._id === id) });
  },
};

// Wrap each call: use real API if deployed, otherwise localStorage
const withFallback = (realFn, localFn) => async (...args) => {
  if (!ASSET_API_DEPLOYED) return localFn(...args);
  try { return await realFn(...args); }
  catch { return localFn(...args); }
};

export const assetApi = {
  getAll:         withFallback((p) => fetch(`${BASE}/assets?${new URLSearchParams(p)}`, { headers: authHeaders() }).then(handle), localApi.getAll),
  getById:        withFallback((id) => fetch(`${BASE}/assets/${id}`, { headers: authHeaders() }).then(handle), localApi.getById),
  getSummary:     withFallback(() => fetch(`${BASE}/assets/stats/summary`, { headers: authHeaders() }).then(handle), localApi.getSummary),
  create:         withFallback((body) => fetch(`${BASE}/assets`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle), localApi.create),
  update:         withFallback((id, body) => fetch(`${BASE}/assets/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handle), localApi.update),
  delete:         withFallback((id) => fetch(`${BASE}/assets/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handle), localApi.delete),
  addMaintenance: withFallback((id, body) => fetch(`${BASE}/assets/${id}/maintenance`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handle), localApi.addMaintenance),
};
