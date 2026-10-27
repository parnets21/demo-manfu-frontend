import { useState, useEffect, useCallback } from 'react';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import { clientApi } from '../../../api/clientApi';
import { categoryApi } from '../../../api/categoryApi';
import { dataEvents } from '../../../utils/dataEvents';
import { MdSearch, MdAdd, MdVisibility, MdEdit, MdDelete, MdPerson, MdPhone, MdLocationOn, MdBusiness } from 'react-icons/md';

const EMPTY_FORM = {
  name: '', contact: '', phone: '', email: '',
  city: '', state: '', address: '', pincode: '',
  gstNumber: '', category: 'Regular', status: 'Active', remarks: '',
};

const inp = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff',
  color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color .15s',
};
const lbl = { fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 5, display: 'block' };

export default function ClientsTab({
  showClientModal, setShowClientModal,
  onStatsChange,
}) {
  const [clients, setClients]     = useState([]);
  const [categories, setCategories] = useState(['Regular', 'Premium', 'Corporate', 'Distributor', 'Retailer']);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [viewClient, setViewClient] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchClients = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const res = await clientApi.getAll(params);
      setClients(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterCategory]);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { const t = setTimeout(fetchClients, 400); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    categoryApi.getAll().then(res => {
      if (res.success && res.data?.length > 0) {
        setCategories(res.data.map(c => c.name || c));
      }
    }).catch(console.error);
  }, []);

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setShowClientModal(true); };
  const openEdit = (c) => {
    setForm({
      name: c.name || '', contact: c.contact || '', phone: c.phone || '',
      email: c.email || '', city: c.city || '', state: c.state || '',
      address: c.address || '', pincode: c.pincode || '',
      gstNumber: c.gstNumber || '', category: c.category || 'Regular',
      status: c.status || 'Active', remarks: c.remarks || '',
    });
    setEditId(c._id);
    setViewClient(null);
    setShowClientModal(true);
  };

  const openView = (c) => setViewClient(c);

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Client name is required';
    if (!form.contact.trim()) errors.contact = 'Contact person is required';
    if (!form.phone) errors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) errors.phone = 'Phone must be 10 digits';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.state.trim()) errors.state = 'State is required';
    if (form.gstNumber) {
      const g = form.gstNumber.toUpperCase().replace(/\s/g, '');
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g))
        errors.gstNumber = 'Invalid GST format (e.g. 27AABCC1234D1Z5)';
    }
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSaving(true); setFormErrors({}); setSuccessMsg('');
    try {
      const cleanData = {
        ...form,
        phone: form.phone.replace(/\D/g, ''),
        pincode: form.pincode.replace(/\D/g, ''),
        gstNumber: form.gstNumber.toUpperCase().trim(),
      };
      editId ? await clientApi.update(editId, cleanData) : await clientApi.create(cleanData);
      setShowClientModal(false);
      setForm(EMPTY_FORM);
      setSuccessMsg(editId ? '✓ Client updated successfully!' : '✓ Client created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      dataEvents.emit('client:changed');
      fetchClients();
      onStatsChange?.();
    } catch (e) {
      setFormErrors({ _general: e.message || 'Failed to save client' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await clientApi.delete(id);
      setSuccessMsg('✓ Client deleted!');
      setTimeout(() => setSuccessMsg(''), 3000);
      dataEvents.emit('client:changed');
      fetchClients();
      onStatsChange?.();
    } catch (e) { alert(`❌ ${e.message}`); }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  // Calculate paginated clients
  const startIndex = (page - 1) * pageSize;
  const paginatedClients = clients.slice(startIndex, startIndex + pageSize);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCategory]);

  const statusColor = (s) =>
    s === 'Active' ? { bg: '#ecfdf5', color: '#047857' } :
    s === 'Inactive' ? { bg: '#f3f4f6', color: '#6b7280' } :
    { bg: '#fef2f2', color: '#dc2626' };

  return (
    <>
      <style>{`
        .ct-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .ct-search-wrap { position:relative; flex:1; min-width:160px; }
        .ct-search { width:100%; padding:9px 12px 9px 34px; border:1.5px solid #e2e8f0; border-radius:10px; background:#f8fafc; font-size:13px; color:#1e293b; outline:none; font-family:inherit; transition:all .2s; box-sizing:border-box; }
        .ct-search:focus { border-color:#ef4444; background:#fff; box-shadow:0 0 0 3px rgba(239,68,68,0.08); }
        .ct-search::placeholder { color:#94a3b8; }
        .ct-search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; display:flex; }
        .ct-select { padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:10px; background:#f8fafc; font-size:13px; color:#1e293b; outline:none; font-family:inherit; cursor:pointer; min-width:130px; }
        .ct-table-wrap { overflow-x:auto; border-radius:12px; border:1px solid #f1f5f9; }
        .ct-table { width:100%; border-collapse:collapse; min-width:600px; }
        .ct-table thead tr { background:#f8fafc; }
        .ct-table th { padding:10px 14px; text-align:left; font-size:10.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.7px; border-bottom:1px solid #f1f5f9; white-space:nowrap; }
        .ct-table td { padding:11px 14px; font-size:12.5px; color:#1e293b; border-bottom:1px solid #f8fafc; vertical-align:middle; }
        .ct-table tbody tr { transition:background .1s; }
        .ct-table tbody tr:hover { background:#fef2f2; }
        .ct-table tbody tr:last-child td { border-bottom:none; }
        .ct-cards { display:none; flex-direction:column; gap:10px; }
        @media(max-width:640px) { .ct-table-wrap{display:none;} .ct-cards{display:flex;} }
        .ct-card { background:#fff; border-radius:14px; border:1px solid #e8edf2; box-shadow:0 2px 8px rgba(15,23,42,0.05); padding:14px 16px; }
        .ct-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; }
        .ct-card-name { font-size:14px; font-weight:700; color:#0f172a; }
        .ct-card-id { font-size:11px; color:#94a3b8; margin-top:2px; font-family:monospace; }
        .ct-card-meta { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; margin-bottom:12px; }
        .ct-card-meta-item { display:flex; align-items:center; gap:5px; font-size:12px; color:#475569; }
        .ct-card-actions { display:flex; gap:8px; }
        .ct-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media(max-width:540px) { .ct-form-grid{grid-template-columns:1fr;} }
        .ct-span2 { grid-column:span 2; }
        @media(max-width:540px) { .ct-span2{grid-column:span 1;} }
      `}</style>

      {/* Toolbar */}
      <div className="ct-toolbar">
        <div className="ct-search-wrap">
          <span className="ct-search-icon"><MdSearch size={15} /></span>
          <input className="ct-search" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="ct-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Active</option><option>Inactive</option><option>Blocked</option>
        </select>
        <select className="ct-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Alerts */}
      {error && <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#ef4444', fontSize:13, marginBottom:12 }}>❌ {error}</div>}
      {successMsg && <div style={{ padding:'10px 14px', background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:10, color:'#047857', fontSize:13, marginBottom:12 }}>{successMsg}</div>}
      {loading && <div style={{ padding:'32px 0', textAlign:'center', color:'#94a3b8', fontSize:13 }}>Loading clients…</div>}

      {/* Desktop Table */}
      {!loading && clients.length > 0 && (
        <div className="ct-table-wrap" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
          <table className="ct-table">
            <thead><tr>
              <th>Client ID</th><th>Name</th><th>Contact</th><th>Phone</th>
              <th>City</th><th>State</th><th>Category</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {paginatedClients.map(c => {
                const sc = statusColor(c.status);
                return (
                  <tr key={c._id}>
                    <td style={{ fontFamily:'monospace', fontSize:11, fontWeight:600, color:'#64748b' }}>{c.clientId}</td>
                    <td style={{ fontWeight:500 }}>{c.name}</td>
                    <td>{c.contact}</td>
                    <td>{c.phone}</td>
                    <td>{c.city}</td>
                    <td>{c.state}</td>
                    <td><span style={{ display:'inline-block', padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600, background:'#dbeafe', color:'#1e40af' }}>{c.category}</span></td>
                    <td><span style={{ display:'inline-block', padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600, background:sc.bg, color:sc.color }}>{c.status}</span></td>
                    <td style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openView(c)} style={{ padding:'4px 10px', borderRadius:6, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#475569', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit' }}>View</button>
                      <button onClick={() => openEdit(c)} style={{ padding:'4px 10px', borderRadius:6, background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit' }}>Edit</button>
                      <button onClick={() => handleDelete(c._id, c.name)} style={{ padding:'4px 10px', borderRadius:6, background:'#fee2e2', border:'1px solid #fecaca', color:'#dc2626', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit' }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && clients.length > 0 && (
        <Pagination
          total={clients.length}
          page={page}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      {/* Mobile Cards */}
      {!loading && clients.length > 0 && (
        <div className="ct-cards">
          {paginatedClients.map(c => {
            const sc = statusColor(c.status);
            return (
              <div key={c._id} className="ct-card">
                <div className="ct-card-top">
                  <div>
                    <div className="ct-card-name">{c.name}</div>
                    <div className="ct-card-id">{c.clientId}</div>
                  </div>
                  <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600, background:sc.bg, color:sc.color }}>{c.status}</span>
                </div>
                <div className="ct-card-meta">
                  <div className="ct-card-meta-item"><MdPhone size={14}/>{c.phone}</div>
                  <div className="ct-card-meta-item"><MdLocationOn size={14}/>{c.city}</div>
                  <div className="ct-card-meta-item"><MdBusiness size={14}/>{c.category}</div>
                  <div className="ct-card-meta-item"><MdPerson size={14}/>{c.contact}</div>
                </div>
                <div className="ct-card-actions">
                  <button onClick={() => openView(c)} style={{ flex:1, padding:'8px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0' }}><MdVisibility size={14}/> View</button>
                  <button onClick={() => openEdit(c)} style={{ flex:1, padding:'8px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca' }}><MdEdit size={14}/> Edit</button>
                  <button onClick={() => handleDelete(c._id, c.name)} style={{ flex:1, padding:'8px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca' }}><MdDelete size={14}/> Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && clients.length === 0 && (
        <div style={{ padding:'48px 24px', textAlign:'center', background:'#f8fafc', borderRadius:12, border:'1px dashed #e2e8f0' }}>
          <MdPerson size={40} style={{ color:'#cbd5e1', marginBottom:12 }} />
          <div style={{ fontSize:14, fontWeight:600, color:'#475569', marginBottom:4 }}>No clients found</div>
          <div style={{ fontSize:12, color:'#94a3b8' }}>Add your first client to get started</div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={showClientModal} onClose={() => setShowClientModal(false)}
        title={editId ? 'Edit Client' : 'Add New Client'}
        footer={
          <>
            <button onClick={() => setShowClientModal(false)} style={{ padding:'8px 16px', borderRadius:9, border:'1.5px solid #1e40af', color:'#1e40af', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding:'8px 18px', borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#1e40af)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, opacity:saving?0.7:1 }}>{saving?'Saving…':'Save Client'}</button>
          </>
        }>
        <div className="ct-form-grid">
          {formErrors._general && (
            <div style={{ gridColumn:'span 2', padding:'8px 12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, fontSize:12, color:'#dc2626', fontWeight:600 }}>❌ {formErrors._general}</div>
          )}
          <div><label style={lbl}>Client Name *</label><input style={{...inp, borderColor:formErrors.name?'#ef4444':'#e2e8f0'}} placeholder="Full name" value={form.name} onChange={f('name')} />{formErrors.name&&<div style={{fontSize:11,color:'#ef4444',marginTop:3}}>⚠ {formErrors.name}</div>}</div>
          <div><label style={lbl}>Contact Person *</label><input style={{...inp, borderColor:formErrors.contact?'#ef4444':'#e2e8f0'}} placeholder="Name" value={form.contact} onChange={f('contact')} />{formErrors.contact&&<div style={{fontSize:11,color:'#ef4444',marginTop:3}}>⚠ {formErrors.contact}</div>}</div>
          <div><label style={lbl}>Phone *</label><input style={{...inp, borderColor:formErrors.phone?'#ef4444':'#e2e8f0'}} placeholder="10-digit number" value={form.phone} maxLength={10} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,10);setForm(p=>({...p,phone:v}));}} />{formErrors.phone&&<div style={{fontSize:11,color:'#ef4444',marginTop:3}}>⚠ {formErrors.phone}</div>}</div>
          <div><label style={lbl}>Email</label><input style={inp} type="email" placeholder="email@company.com" value={form.email} onChange={f('email')} /></div>
          <div><label style={lbl}>City *</label><input style={{...inp, borderColor:formErrors.city?'#ef4444':'#e2e8f0'}} placeholder="City" value={form.city} onChange={f('city')} />{formErrors.city&&<div style={{fontSize:11,color:'#ef4444',marginTop:3}}>⚠ {formErrors.city}</div>}</div>
          <div><label style={lbl}>State *</label><input style={{...inp, borderColor:formErrors.state?'#ef4444':'#e2e8f0'}} placeholder="State" value={form.state} onChange={f('state')} />{formErrors.state&&<div style={{fontSize:11,color:'#ef4444',marginTop:3}}>⚠ {formErrors.state}</div>}</div>
          <div><label style={lbl}>Pincode</label><input style={inp} placeholder="6-digit pincode" value={form.pincode} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,6);setForm(p=>({...p,pincode:v}));}} /></div>
          <div><label style={lbl}>GST Number</label><input style={{...inp, borderColor:formErrors.gstNumber?'#ef4444':'#e2e8f0'}} placeholder="GSTIN (optional)" value={form.gstNumber} onChange={f('gstNumber')} />{formErrors.gstNumber&&<div style={{fontSize:11,color:'#ef4444',marginTop:3}}>⚠ {formErrors.gstNumber}</div>}</div>
          <div className="ct-span2"><label style={lbl}>Address</label><input style={inp} placeholder="Full address" value={form.address} onChange={f('address')} /></div>
          <div><label style={lbl}>Category</label><select style={inp} value={form.category} onChange={f('category')}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>Status</label><select style={inp} value={form.status} onChange={f('status')}><option>Active</option><option>Inactive</option><option>Blocked</option></select></div>
          <div className="ct-span2"><label style={lbl}>Remarks</label><input style={inp} placeholder="Optional notes" value={form.remarks} onChange={f('remarks')} /></div>
        </div>
      </Modal>

      {/* View Modal */}
      {viewClient && (
        <Modal open={!!viewClient} onClose={() => setViewClient(null)} title={viewClient.name} size="lg"
          footer={
            <div style={{ display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:12, color:'#64748b' }}>Client ID: <span style={{ fontWeight:600, color:'#1e293b' }}>{viewClient.clientId}</span></div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => openEdit(viewClient)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#fef2f2', border:'1.5px solid #fecaca', color:'#ef4444', padding:'8px 16px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}><MdEdit size={16}/> Edit</button>
                <button onClick={() => setViewClient(null)} style={{ background:'transparent', border:'1.5px solid #cbd5e1', color:'#475569', padding:'8px 16px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Close</button>
              </div>
            </div>
          }>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', padding:'4px 10px', background:'#dbeafe', color:'#1e40af', borderRadius:6, fontSize:12, fontWeight:600, border:'1px solid #bfdbfe' }}>{viewClient.category}</span>
            <span style={{ display:'inline-flex', padding:'4px 10px', background:statusColor(viewClient.status).bg, color:statusColor(viewClient.status).color, borderRadius:6, fontSize:12, fontWeight:600, border:'1px solid #e2e8f0' }}>{viewClient.status}</span>
            {viewClient.tallySynced && <span style={{ display:'inline-flex', padding:'4px 10px', background:'#ecfdf5', color:'#047857', borderRadius:6, fontSize:12, fontWeight:600, border:'1px solid #a7f3d0' }}>✅ Tally Synced</span>}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'14px 20px' }}>
            {[
              { label:'Contact Person', value: viewClient.contact },
              { label:'Phone',          value: viewClient.phone },
              { label:'Email',          value: viewClient.email },
              { label:'City',           value: viewClient.city },
              { label:'State',          value: viewClient.state },
              { label:'Pincode',        value: viewClient.pincode },
              { label:'GST Number',     value: viewClient.gstNumber || '—' },
              { label:'Payment Terms',  value: viewClient.paymentTerms || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize:11, fontWeight:500, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.3px' }}>{label}</div>
                <div style={{ fontSize:14, color:'#1e293b', marginTop:3 }}>{value}</div>
              </div>
            ))}
            {viewClient.address && (
              <div style={{ gridColumn:'span 3' }}>
                <div style={{ fontSize:11, fontWeight:500, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.3px' }}>Address</div>
                <div style={{ fontSize:14, color:'#1e293b', marginTop:3 }}>{viewClient.address}</div>
              </div>
            )}
          </div>
          {viewClient.remarks && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, padding:'12px 16px', marginTop:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#92400e', marginBottom:4 }}>Remarks</div>
              <div style={{ fontSize:13, color:'#78350f' }}>{viewClient.remarks}</div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
