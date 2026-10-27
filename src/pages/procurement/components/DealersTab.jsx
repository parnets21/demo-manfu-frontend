import { useState, useEffect, useCallback } from 'react';
import Modal from '../../../components/common/Modal';
import { dealerApi } from '../../../api/dealerApi';
import {
  MdSearch, MdVisibility, MdPerson, MdPhone, MdLocationOn, MdBusiness, MdRefresh,
} from 'react-icons/md';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import Pagination from '../../../components/common/Pagination';

// ── Styles ────────────────────────────────────────────────────────────────────
const TH = {
  padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px',
  borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', background: '#f8fafc',
};
const TD = { padding: '11px 14px', fontSize: 12.5, color: '#1e293b', verticalAlign: 'middle' };

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
  color: '#1e293b', background: '#fff', outline: 'none', boxSizing: 'border-box',
};
const selStyle = {
  padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10,
  background: '#f8fafc', fontSize: 13, color: '#1e293b',
  outline: 'none', fontFamily: 'inherit', cursor: 'pointer', minWidth: 130,
};

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ active }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 12,
      fontSize: 11, fontWeight: 600,
      background: active ? '#ecfdf5' : '#f3f4f6',
      color: active ? '#047857' : '#6b7280',
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── Icon button helper ────────────────────────────────────────────────────────
function IconBtn({ onClick, title, icon, base, hover }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30, height: 30, borderRadius: 7, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: hovered ? hover.border : base.border,
        background: hovered ? hover.bg : base.bg,
        color: hovered ? hover.color : base.color,
        transition: 'all .15s',
      }}>
      {icon}
    </button>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditDealerModal({ dealer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:          dealer.name          || '',
    email:         dealer.email         || '',
    mobile:        dealer.mobile        || '',
    businessName:  dealer.businessName  || '',
    contactPerson: dealer.contactPerson || '',
    zone:          dealer.zone          || '',
    address:       dealer.address       || '',
    city:          dealer.city          || '',
    state:         dealer.state         || '',
    pincode:       dealer.pincode       || '',
    gstin:         dealer.gstin         || '',
    panNumber:     dealer.panNumber     || '',
    creditLimit:   dealer.creditLimit   ?? '',
    isActive:      dealer.isActive !== false,
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim())   return setErr('Name is required');
    if (!form.mobile.trim()) return setErr('Mobile is required');
    setErr(''); setSaving(true);
    try {
      const res = await dealerApi.update(dealer.id, form);
      onSaved(res.data || res);
      onClose();
    } catch (e) {
      setErr(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, k, type = 'text' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} style={inputStyle} />
    </div>
  );

  return (
    <Modal open onClose={onClose} title={`Edit Dealer — ${dealer.name}`} size="xl">
      <form onSubmit={handleSubmit}>
        {err && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
            {err}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
          <Field label="Full Name"       k="name" />
          <Field label="Email"           k="email"  type="email" />
          <Field label="Mobile"          k="mobile" type="tel" />
          <Field label="Business Name"   k="businessName" />
          <Field label="Contact Person"  k="contactPerson" />
          <Field label="Zone"            k="zone" />
          <Field label="City"            k="city" />
          <Field label="State"           k="state" />
          <Field label="Pincode"         k="pincode" />
          <Field label="GSTIN"           k="gstin" />
          <Field label="PAN Number"      k="panNumber" />
          <Field label="Credit Limit (₹)" k="creditLimit" type="number" />

          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Status</label>
            <select value={form.isActive ? 'active' : 'inactive'}
              onChange={e => set('isActive', e.target.value === 'active')}
              style={inputStyle}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Address — full width */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Address</label>
            <textarea value={form.address} onChange={e => set('address', e.target.value)}
              rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
          <button type="button" onClick={onClose} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: '9px 24px', borderRadius: 8, border: 'none',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteDealerModal({ dealer, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [err,      setErr]      = useState('');

  const handleDelete = async () => {
    setDeleting(true); setErr('');
    try {
      await dealerApi.delete(dealer.id);
      onDeleted(dealer.id);
      onClose();
    } catch (e) {
      setErr(e.message || 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Delete Dealer" size="sm">
      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
          Delete {dealer.name}?
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: err ? 10 : 24 }}>
          This action cannot be undone. The dealer account will be permanently removed.
        </div>
        {err && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
            {err}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button onClick={onClose} disabled={deleting}
            style={{ padding: '9px 24px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: '9px 24px', borderRadius: 8, border: 'none',
              background: deleting ? '#94a3b8' : 'linear-gradient(135deg,#3b82f6,#1e40af)',
              color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DealersTab() {
  const [dealers,     setDealers]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [filterStatus,setFilterStatus]= useState('');
  const [viewDealer,  setViewDealer]  = useState(null);
  const [editDealer,  setEditDealer]  = useState(null);
  const [deleteDealer,setDeleteDealer]= useState(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchDealers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (search)       params.search = search;
      if (filterStatus) params.status = filterStatus;
      const res = await dealerApi.getAll(params);
      setDealers(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetchDealers(); }, [fetchDealers]);
  // Debounced search
  useEffect(() => { const t = setTimeout(fetchDealers, 400); return () => clearTimeout(t); }, [search]);

  const handleSaved   = updated => setDealers(prev => prev.map(d => (d.id === updated.id ? { ...d, ...updated } : d)));
  const handleDeleted = id      => setDealers(prev => prev.filter(d => d.id !== id));

  return (
    <>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <MdSearch size={15} style={{ position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #e2e8f0',
              borderRadius: 10, background: '#f8fafc', fontSize: 13, color: '#1e293b',
              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            placeholder="Search dealers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select style={selStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <button onClick={fetchDealers}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px',
            borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc',
            color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
          <MdRefresh size={14} /> Refresh
        </button>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, color: '#ef4444', fontSize: 13, marginBottom: 12 }}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Loading dealers…
        </div>
      )}

      {/* ── Desktop Table ── */}
      {!loading && dealers.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                {['Dealer Code', 'Name', 'Business Name', 'Mobile', 'City', 'Status', 'Actions'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dealers.slice((page-1)*pageSize, page*pageSize).map(d => (
                <tr key={d.id || d._id}
                  style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background .1s' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  onClick={() => setViewDealer(d)}>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#64748b' }}>{d.dealerCode}</td>
                  <td style={{ ...TD, fontWeight: 600 }}>{d.name}</td>
                  <td style={TD}>{d.businessName || '—'}</td>
                  <td style={TD}>{d.mobile}</td>
                  <td style={TD}>{d.city || '—'}</td>
                  <td style={TD}><StatusBadge active={d.isActive} /></td>
                  <td style={{ ...TD }} onClick={ev => ev.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* Edit */}
                      <IconBtn
                        title="Edit Dealer"
                        onClick={() => setEditDealer(d)}
                        icon={<FiEdit2 size={13} />}
                        base={{ border: '1px solid #bfdbfe', bg: '#eff6ff', color: '#2563eb' }}
                        hover={{ border: '1px solid #2563eb', bg: '#2563eb',  color: '#fff'    }}
                      />
                      {/* Delete */}
                      <IconBtn
                        title="Delete Dealer"
                        onClick={() => setDeleteDealer(d)}
                        icon={<FiTrash2 size={13} />}
                        base={{ border: '1px solid #fecaca', bg: '#fef2f2', color: '#dc2626' }}
                        hover={{ border: '1px solid #dc2626', bg: '#dc2626',  color: '#fff'    }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && dealers.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc',
          borderRadius: 12, border: '1px dashed #e2e8f0' }}>
          <MdPerson size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 4 }}>No dealers found</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Dealers will appear here once they register via the mobile app</div>
        </div>
      )}

      {/* ── Footer count ── */}
      {!loading && dealers.length > 0 && (
        <Pagination
          total={dealers.length}
          page={page}
          pageSize={pageSize}
          onPage={p => setPage(p)}
          onPageSize={s => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* ── View Modal ── */}
      {viewDealer && (
        <Modal open onClose={() => setViewDealer(null)} title={viewDealer.name} size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Dealer Code: <span style={{ fontWeight: 600, color: '#1e293b' }}>{viewDealer.dealerCode}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setViewDealer(null); setEditDealer(viewDealer); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                    border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                  <FiEdit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => { setViewDealer(null); setDeleteDealer(viewDealer); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                    border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                  <FiTrash2 size={13} /> Delete
                </button>
                <button onClick={() => setViewDealer(null)}
                  style={{ background: 'transparent', border: '1.5px solid #cbd5e1', color: '#475569',
                    padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Close
                </button>
              </div>
            </div>
          }>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <StatusBadge active={viewDealer.isActive} />
            {viewDealer.erpClientId && (
              <span style={{ display: 'inline-flex', padding: '4px 10px', background: '#dbeafe',
                color: '#1e40af', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #bfdbfe' }}>
                Synced to ERP
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 20px' }}>
            {[
              { label: 'Contact Person', value: viewDealer.contactPerson || viewDealer.name },
              { label: 'Mobile',         value: viewDealer.mobile },
              { label: 'Email',          value: viewDealer.email || '—' },
              { label: 'City',           value: viewDealer.city || '—' },
              { label: 'State',          value: viewDealer.state || '—' },
              { label: 'Pincode',        value: viewDealer.pincode || '—' },
              { label: 'GSTIN',          value: viewDealer.gstin || '—' },
              { label: 'PAN Number',     value: viewDealer.panNumber || '—' },
              { label: 'Credit Limit',   value: viewDealer.creditLimit ? `₹${Number(viewDealer.creditLimit).toLocaleString()}` : '—' },
              { label: 'Outstanding',    value: viewDealer.outstandingAmount ? `₹${Number(viewDealer.outstandingAmount).toLocaleString()}` : '—' },
              { label: 'Zone',           value: viewDealer.zone || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
                <div style={{ fontSize: 14, color: '#1e293b', marginTop: 3 }}>{value}</div>
              </div>
            ))}
            {viewDealer.address && (
              <div style={{ gridColumn: 'span 3' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Address</div>
                <div style={{ fontSize: 14, color: '#1e293b', marginTop: 3 }}>{viewDealer.address}</div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editDealer && (
        <EditDealerModal
          dealer={editDealer}
          onClose={() => setEditDealer(null)}
          onSaved={updated => { handleSaved(updated); setEditDealer(null); }}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteDealer && (
        <DeleteDealerModal
          dealer={deleteDealer}
          onClose={() => setDeleteDealer(null)}
          onDeleted={id => { handleDeleted(id); setDeleteDealer(null); }}
        />
      )}
    </>
  );
}
