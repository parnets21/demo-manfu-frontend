import { useState, useEffect, useCallback, Component } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import api from '../../api/axiosConfig';
import {
  MdSearch, MdPeople, MdPerson, MdBadge, MdVerified, MdBlock,
  MdRefresh, MdLocalShipping, MdWork, MdPhone, MdEmail,
  MdCalendarToday, MdLocationOn, MdFilterList,
} from 'react-icons/md';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import Pagination from '../../components/common/Pagination';

// ── Helpers ───────────────────────────────────────────────────────────────────
const API_BASE     = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const MEDIA_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
const imgUrl  = p  => { if (!p) return ''; if (p.startsWith('http')) return p; return `${MEDIA_ORIGIN}${p.startsWith('/') ? p : `/${p}`}`; };
const fmtDate = v  => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('en-GB'); };
const toInputDate = v => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : d.toISOString().split('T')[0]; };

// ── Style tokens ──────────────────────────────────────────────────────────────
const TH = {
  padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px',
  borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', background: '#f8fafc',
};
const TD = { padding: '9px 12px', fontSize: 12, color: '#1e293b', verticalAlign: 'middle' };

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
  color: '#1e293b', background: '#fff', outline: 'none', boxSizing: 'border-box',
};
const selStyle = {
  padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 12.5, fontFamily: 'inherit', color: '#334155',
  background: '#fff', outline: 'none', cursor: 'pointer',
};

// ── Avatar fallback ───────────────────────────────────────────────────────────
function Avatar({ name = '', photo = '', size = 36 }) {
  const [err, setErr] = useState(false);
  const initials = name.split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase();
  const colors = ['#1e40af', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
  const color  = colors[(name.charCodeAt(0) || 0) % colors.length];
  const src    = photo ? (photo.startsWith('http') ? photo : imgUrl(photo)) : '';
  if (src && !err) {
    return (
      <img src={src} alt={name} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
                 border: '2px solid #f1f5f9', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: size * 0.36, flexShrink: 0,
                  border: '2px solid #f1f5f9' }}>
      {initials || '?'}
    </div>
  );
}

// ── Info tile in detail modal ─────────────────────────────────────────────────
function Tile({ label, value, icon, accent }) {
  if (!value || value === '—') return null;
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px',
                  border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon && <span style={{ color: accent || '#1e40af' }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent || '#0f172a', lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}

function SecHead({ title }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', letterSpacing: '.4px', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,#fee2e2,transparent)', borderRadius: 2 }} />
    </div>
  );
}

// ── Role & Status badges ──────────────────────────────────────────────────────
const roleMeta = r => ({
  employee:           { label: 'Employee',         bg: '#eff6ff', txt: '#1d4ed8', Icon: MdPerson },
  delivery_logistics: { label: 'Delivery / Field', bg: '#f0fdf4', txt: '#16a34a', Icon: MdLocalShipping },
}[r] || { label: r, bg: '#f1f5f9', txt: '#475569', Icon: MdBadge });

function RoleBadge({ role }) {
  const { label, bg, txt, Icon } = roleMeta(role);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                   padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: bg, color: txt }}>
      <Icon size={11} /> {label}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                   padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                   background: active ? '#dcfce7' : '#fee2e2', color: active ? '#16a34a' : '#dc2626' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditEmployeeModal({ emp, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        emp.name        || '',
    email:       emp.email       || '',
    mobile:      emp.mobile      || '',
    role:        emp.role        || 'employee',
    department:  emp.department  || '',
    designation: emp.designation || '',
    joiningDate: toInputDate(emp.joiningDate),
    gender:      emp.gender      || '',
    gstNumber:   emp.gstNumber   || '',
    panNumber:   emp.panNumber   || '',
    industry:    emp.industry    || '',
    address:     emp.address     || '',
    isActive:    emp.isActive !== false,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim())        return toast('Name is required', 'error');
    if (!form.email.trim())       return toast('Email is required', 'error');
    if (!form.mobile.trim())      return toast('Mobile is required', 'error');
    if (!form.department.trim())  return toast('Department is required', 'error');
    if (!form.designation.trim()) return toast('Designation is required', 'error');
    setSaving(true);
    try {
      const res = await api.put(`/employees/admin/registered-employees/${emp.id}`, form);
      const updated = res?.data?.data || res?.data || res;
      toast('Employee updated successfully', 'success');
      onSaved(updated);
      onClose();
    } catch (err) {
      toast(err?.response?.data?.message || err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = 'text', opts = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
        style={inputStyle} {...opts} />
    </div>
  );

  return (
    <Modal open onClose={onClose} title={`Edit Employee — ${emp.name}`} size="xl">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
          {field('Full Name',   'name')}
          {field('Email',       'email',  'email')}
          {field('Mobile',      'mobile', 'tel')}
          {field('Department',  'department')}
          {field('Designation', 'designation')}
          {field('Joining Date','joiningDate','date')}

          {/* Gender */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Gender</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} style={{ ...inputStyle }}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} style={{ ...inputStyle }}>
              <option value="employee">Employee</option>
              <option value="delivery_logistics">Delivery / Field</option>
            </select>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Status</label>
            <select value={form.isActive ? 'active' : 'inactive'} onChange={e => set('isActive', e.target.value === 'active')} style={{ ...inputStyle }}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {field('GST Number', 'gstNumber')}
          {field('PAN Number', 'panNumber')}
          {field('Industry',   'industry')}

          {/* Address full width */}
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
function DeleteConfirmModal({ emp, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/employees/admin/registered-employees/${emp.id}`);
      toast(`${emp.name} deleted successfully`, 'success');
      onDeleted(emp.id);
      onClose();
    } catch (err) {
      toast(err?.response?.data?.message || err.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Delete Employee" size="sm">
      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
          Delete {emp.name}?
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
          This action cannot be undone. The employee account and all associated data will be permanently removed.
        </div>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
function RegisteredEmployeesPage() {
  const [employees,    setEmployees]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [deptFilter,   setDeptFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [viewEmp,      setViewEmp]      = useState(null);
  const [editEmp,      setEditEmp]      = useState(null);
  const [deleteEmp,    setDeleteEmp]    = useState(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim())     params.set('search',     search.trim());
      if (roleFilter)        params.set('role',       roleFilter);
      if (deptFilter.trim()) params.set('department', deptFilter.trim());
      if (dateFrom)          params.set('dateFrom',   dateFrom);
      if (dateTo)            params.set('dateTo',     dateTo);
      const qs  = params.toString();
      const res = await api.get(`/employees/admin/registered-employees${qs ? `?${qs}` : ''}`);
      let list  = Array.isArray(res?.data?.data) ? res.data.data
                : Array.isArray(res?.data)       ? res.data
                : Array.isArray(res)             ? res : [];
      if (statusFilter === 'active')   list = list.filter(e => e.isActive);
      if (statusFilter === 'inactive') list = list.filter(e => !e.isActive);
      setEmployees(list);
    } catch (err) {
      toast(err.message || 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, deptFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaved = updated => {
    setEmployees(prev => prev.map(e => (e.id === updated.id ? { ...e, ...updated } : e)));
  };
  const handleDeleted = id => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const allDepts    = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
  const total       = employees.length;
  const empCount    = employees.filter(e => e.role === 'employee').length;
  const dlCount     = employees.filter(e => e.role === 'delivery_logistics').length;
  const activeCount = employees.filter(e => e.isActive).length;
  const hasFilters  = search || roleFilter || deptFilter || statusFilter || dateFrom || dateTo;

  const kpis = [
    { label: 'Total Registered',  value: total,       icon: <MdPeople size={18}/>,        color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)' },
    { label: 'Employees',         value: empCount,    icon: <MdPerson size={18}/>,         color: '#7c3aed', color2: '#8b5cf6', glow: 'rgba(124,58,237,0.2)' },
    { label: 'Delivery / Field',  value: dlCount,     icon: <MdLocalShipping size={18}/>, color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.2)' },
    { label: 'Active Accounts',   value: activeCount, icon: <MdVerified size={18}/>,       color: '#0891b2', color2: '#06b6d4', glow: 'rgba(8,145,178,0.2)' },
  ];

  const clearFilters = () => {
    setSearch(''); setRoleFilter(''); setDeptFilter('');
    setStatusFilter(''); setDateFrom(''); setDateTo('');
  };

  return (
    <div>
      <PageHeader title="Registered Employees" breadcrumb="Employee Management › Registered Employees" />
      <KpiStrip kpis={kpis} />

      <PageCard>
        {/* ── Toolbar ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <MdSearch size={15} style={{ position: 'absolute', left: 9, top: '50%',
              transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input className="form-input" placeholder="Search name, email, mobile, designation…"
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()} style={{ paddingLeft: 30, fontSize: 12.5 }} />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={selStyle}>
            <option value="">All Roles</option>
            <option value="employee">Employee</option>
            <option value="delivery_logistics">Delivery / Field</option>
          </select>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={selStyle}>
            <option value="">All Departments</option>
            {allDepts.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={() => setShowFilters(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
              borderRadius: 8, border: `1px solid ${showFilters ? '#1e40af' : '#e2e8f0'}`,
              background: showFilters ? '#fee2e2' : '#f8fafc',
              color: showFilters ? '#1e40af' : '#475569',
              cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}>
            <MdFilterList size={14} /> Date Filter
          </button>
          <button onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
              borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc',
              color: '#475569', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}>
            <MdRefresh size={14} /> Refresh
          </button>
          {hasFilters && (
            <button onClick={clearFilters}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5',
                background: '#fff5f5', color: '#dc2626', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              Clear Filters
            </button>
          )}
        </div>

        {/* ── Date range ── */}
        {showFilters && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdCalendarToday size={14} color="#94a3b8" />
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Registered</span>
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...selStyle, fontSize: 12 }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...selStyle, fontSize: 12 }} />
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
              <thead>
                <tr>
                  {['Employee', 'Employee ID', 'Role', 'Department', 'Designation',
                    'Mobile', 'Joining Date', 'Status', 'Registered On', 'Action'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      {hasFilters ? 'No employees match your filters.' : 'No employees registered via the mobile app yet.'}
                    </td>
                  </tr>
                ) : employees.slice((page-1)*pageSize, page*pageSize).map(e => (
                  <tr key={e.id}
                    style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                    onClick={() => setViewEmp(e)}>

                    {/* Employee name + email */}
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar name={e.name} photo={e.profilePhoto} size={34} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{e.name}</div>
                          <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700, color: '#3b82f6', fontSize: 11 }}>{e.employeeId}</td>
                    <td style={TD}><RoleBadge role={e.role} /></td>
                    <td style={{ ...TD, fontSize: 11.5 }}>{e.department || '—'}</td>
                    <td style={{ ...TD, fontSize: 11.5 }}>{e.designation || '—'}</td>
                    <td style={{ ...TD, fontSize: 11.5 }}>{e.mobile || '—'}</td>
                    <td style={{ ...TD, fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(e.joiningDate)}</td>
                    <td style={TD}><StatusBadge active={e.isActive} /></td>
                    <td style={{ ...TD, fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(e.createdAt)}</td>

                    {/* Action column */}
                    <td style={{ ...TD, whiteSpace: 'nowrap' }} onClick={ev => ev.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* Edit */}
                        <button
                          title="Edit Employee"
                          onClick={() => setEditEmp(e)}
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #bfdbfe',
                            background: '#eff6ff', color: '#2563eb', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .15s' }}
                          onMouseEnter={ev => { ev.currentTarget.style.background = '#2563eb'; ev.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={ev => { ev.currentTarget.style.background = '#eff6ff'; ev.currentTarget.style.color = '#2563eb'; }}>
                          <FiEdit2 size={13} />
                        </button>
                        {/* Delete */}
                        <button
                          title="Delete Employee"
                          onClick={() => setDeleteEmp(e)}
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #fecaca',
                            background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .15s' }}
                          onMouseEnter={ev => { ev.currentTarget.style.background = '#dc2626'; ev.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={ev => { ev.currentTarget.style.background = '#fef2f2'; ev.currentTarget.style.color = '#dc2626'; }}>
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && employees.length > 0 && (
          <Pagination
            total={employees.length}
            page={page}
            pageSize={pageSize}
            onPage={p => setPage(p)}
            onPageSize={s => { setPageSize(s); setPage(1); }}
          />
        )}
      </PageCard>

      {/* ══════════ VIEW MODAL ══════════ */}
      <Modal open={!!viewEmp} onClose={() => setViewEmp(null)} title="Employee Details" size="xl">
        {viewEmp && (() => {
          const e = viewEmp;
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
                            padding: '16px 20px', background: 'linear-gradient(135deg,#fef2f2,#fff)',
                            borderRadius: 12, border: '1px solid #fee2e2' }}>
                <Avatar name={e.name} photo={e.profilePhoto} size={64} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{e.email}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <RoleBadge role={e.role} />
                    <StatusBadge active={e.isActive} />
                    {e.isVerified && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                        background: '#f0fdf4', color: '#16a34a' }}>
                        <MdVerified size={11} /> Verified
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Employee ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>{e.employeeId}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 4 }}>
                <SecHead title="Personal Information" />
                <Tile label="Full Name"  value={e.name}   icon={<MdPerson size={11}/>} />
                <Tile label="Email"      value={e.email}  icon={<MdEmail size={11}/>} />
                <Tile label="Mobile"     value={e.mobile} icon={<MdPhone size={11}/>} />
                <Tile label="Gender"     value={e.gender} />
                <Tile label="GST Number" value={e.gstNumber} />
                <Tile label="PAN Number" value={e.panNumber} />
                <Tile label="Industry"   value={e.industry} />
                {e.address && (
                  <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 10,
                                padding: '10px 14px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase',
                                  letterSpacing: '.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdLocationOn size={11} color="#1e40af" /> Address
                    </div>
                    <div style={{ fontSize: 13, color: '#0f172a' }}>{e.address}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 4 }}>
                <SecHead title="Work Information" />
                <Tile label="Department"   value={e.department}          icon={<MdWork size={11}/>} />
                <Tile label="Designation"  value={e.designation}         icon={<MdBadge size={11}/>} />
                <Tile label="Joining Date" value={fmtDate(e.joiningDate)} icon={<MdCalendarToday size={11}/>} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                <SecHead title="Account Information" />
                <Tile label="Registered On"  value={fmtDate(e.createdAt)} />
                <Tile label="Last Updated"   value={fmtDate(e.updatedAt)} />
                <Tile label="Account Status" value={e.isActive ? 'Active' : 'Inactive'} accent={e.isActive ? '#16a34a' : '#dc2626'} />
              </div>
              {/* Quick-action buttons inside view modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, marginTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => { setViewEmp(null); setEditEmp(e); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8,
                    border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                  <FiEdit2 size={13} /> Edit
                </button>
                <button onClick={() => { setViewEmp(null); setDeleteEmp(e); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8,
                    border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                  <FiTrash2 size={13} /> Delete
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ══════════ EDIT MODAL ══════════ */}
      {editEmp && (
        <EditEmployeeModal
          emp={editEmp}
          onClose={() => setEditEmp(null)}
          onSaved={handleSaved}
        />
      )}

      {/* ══════════ DELETE CONFIRM MODAL ══════════ */}
      {deleteEmp && (
        <DeleteConfirmModal
          emp={deleteEmp}
          onClose={() => setDeleteEmp(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  componentDidCatch(e, i) { console.error('[RegisteredEmployeesPage]', e, i); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'inherit' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>{this.state.error?.message}</div>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: '9px 22px', borderRadius: 9,
              background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
              color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const WrappedRegisteredEmployeesPage = props => (
  <ErrorBoundary><RegisteredEmployeesPage {...props} /></ErrorBoundary>
);

export { RegisteredEmployeesPage };
export default WrappedRegisteredEmployeesPage;
