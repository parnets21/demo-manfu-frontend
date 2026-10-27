const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };
const q = (p = {}) => { const s = new URLSearchParams(p).toString(); return s ? '?' + s : ''; };

// ── BOM ───────────────────────────────────────────────────────────────────────
export const bomApi = {
  getAll:          (params = {}) => fetch(`${BASE}/bom${q(params)}`,                          { headers: authHeaders() }).then(handle),
  getById:         (id)          => fetch(`${BASE}/bom/${id}`,                                 { headers: authHeaders() }).then(handle),
  create:          (body)        => fetch(`${BASE}/bom`,                                       { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update:          (id, body)    => fetch(`${BASE}/bom/${id}`,                                 { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete:          (id)          => fetch(`${BASE}/bom/${id}`,                                 { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Versioning
  getVersions:     (id)          => fetch(`${BASE}/bom/${id}/versions`,                        { headers: authHeaders() }).then(handle),
  createVersion:   (id, body)    => fetch(`${BASE}/bom/${id}/version`,                         { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  // Approval
  submit:          (id, body)    => fetch(`${BASE}/bom/${id}/submit`,                          { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  approve:         (id, body)    => fetch(`${BASE}/bom/${id}/approve`,                         { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify(body) }).then(handle),

  // Explosion
  explode:         (id, qty)     => fetch(`${BASE}/bom/${id}/explode${q({ qty })}`,            { headers: authHeaders() }).then(handle),

  // Components
  addComponent:    (id, body)    => fetch(`${BASE}/bom/${id}/components`,                      { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateComponent: (id, cId, b)  => fetch(`${BASE}/bom/${id}/components/${cId}`,               { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(b) }).then(handle),
  deleteComponent: (id, cId)     => fetch(`${BASE}/bom/${id}/components/${cId}`,               { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Alternates
  addAlternate:    (id, cId, b)  => fetch(`${BASE}/bom/${id}/components/${cId}/alternates`,    { method: 'POST',   headers: authHeaders(), body: JSON.stringify(b) }).then(handle),
  deleteAlternate: (id, cId, aId)=> fetch(`${BASE}/bom/${id}/components/${cId}/alternates/${aId}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
};

// ── Work Orders ───────────────────────────────────────────────────────────────
export const workOrderApi = {
  getAll:           (params = {}) => fetch(`${BASE}/workorders${q(params)}`,                   { headers: authHeaders() }).then(handle),
  getById:          (id)          => fetch(`${BASE}/workorders/${id}`,                          { headers: authHeaders() }).then(handle),
  create:           (body)        => fetch(`${BASE}/workorders`,                                { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  update:           (id, body)    => fetch(`${BASE}/workorders/${id}`,                          { method: 'PUT',    headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete:           (id)          => fetch(`${BASE}/workorders/${id}`,                          { method: 'DELETE', headers: authHeaders() }).then(handle),

  // Workflow
  release:          (id)          => fetch(`${BASE}/workorders/${id}/release`,                  { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify({}) }).then(handle),
  updateProgress:   (id, produced)=> fetch(`${BASE}/workorders/${id}/progress`,                 { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify({ produced }) }).then(handle),
  recordConsumption:(id, body)    => fetch(`${BASE}/workorders/${id}/consume`,                  { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deductInventory:  (id)          => fetch(`${BASE}/workorders/${id}/deduct-inventory`,         { method: 'POST',   headers: authHeaders(), body: JSON.stringify({}) }).then(handle),
  recordQC:         (id, body)    => fetch(`${BASE}/workorders/${id}/qc`,                       { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  recordWastage:    (id, body)    => fetch(`${BASE}/workorders/${id}/wastage`,                  { method: 'PATCH',  headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
};

// ── MRP ───────────────────────────────────────────────────────────────────────
export const mrpApi = {
  getAll:       ()         => fetch(`${BASE}/mrp`,                                              { headers: authHeaders() }).then(handle),
  getById:      (id)       => fetch(`${BASE}/mrp/${id}`,                                        { headers: authHeaders() }).then(handle),
  run:          (body)     => fetch(`${BASE}/mrp/run`,                                          { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  createPRs:    (id, body) => fetch(`${BASE}/mrp/${id}/create-prs`,                             { method: 'POST',   headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  delete:       (id)       => fetch(`${BASE}/mrp/${id}`,                                        { method: 'DELETE', headers: authHeaders() }).then(handle),
};
