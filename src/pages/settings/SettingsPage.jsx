import { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/common/Modal';
import RolePermissionsPage from './RolePermissionsPage';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchUsers, createUser, updateUser,
  deleteUser, toggleUserStatus, fetchActivityLogs,
} from '../../api/userApi';
import {
  MdPeople, MdLock, MdBusiness, MdNotifications,
  MdLink, MdBackup, MdHistory, MdArrowBack,
  MdAdd, MdEdit, MdDelete, MdToggleOn, MdToggleOff,
  MdSearch, MdAdminPanelSettings,
} from 'react-icons/md';

const ROLES_LIST = [
  { value: 'super_admin',        label: 'Super Admin',        color: '#1e40af', bg: '#fef2f2' },
  { value: 'management',         label: 'Management',         color: '#8e44ad', bg: '#f5f0ff' },
  { value: 'purchase_manager',   label: 'Purchase Manager',   color: '#2980b9', bg: '#eff6ff' },
  { value: 'production_manager', label: 'Production Manager', color: '#27ae60', bg: '#f0fdf4' },
  { value: 'dealer',             label: 'Dealer',             color: '#f39c12', bg: '#fffbeb' },
  { value: 'corporate_client',   label: 'Corporate Client',   color: '#16a085', bg: '#f0fdfa' },
];

const getRoleStyle = (role) => ROLES_LIST.find(r => r.value === role) || { color: '#64748b', bg: '#f1f5f9', label: role };

const SECTIONS = [
  { key: 'users',   label: 'User Management',  icon: MdPeople,           desc: 'Add, edit and manage user accounts & roles', superOnly: false },
  { key: 'roles',   label: 'Role Permissions', icon: MdAdminPanelSettings, desc: 'Control which role can access which module',  superOnly: true  },
  { key: 'company', label: 'Company Profile',  icon: MdBusiness,         desc: 'Business name, address, GST, logo',           superOnly: false },
  { key: 'notif',   label: 'Notifications',    icon: MdNotifications,    desc: 'Email, SMS, in-app alert settings',           superOnly: false },
  { key: 'integr',  label: 'Integrations',     icon: MdLink,             desc: 'Tally, courier APIs, payment gateways',       superOnly: false },
  { key: 'backup',  label: 'Backup & Export',  icon: MdBackup,           desc: 'Data backup, export to Excel/PDF',            superOnly: false },
  { key: 'audit',   label: 'Audit Logs',       icon: MdHistory,          desc: 'User activity and change history',            superOnly: false },
];

// ── Shared style tokens ────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]";
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]";
const labelCls = "text-xs font-semibold text-gray-600";
const fieldCls = "flex flex-col gap-1.5 mb-4";
const thCls = "bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap";
const tdCls = "px-4 py-3 text-gray-800 align-middle";
const trCls = "border-b border-gray-50 last:border-0 hover:bg-red-50/40 transition-colors";
const btnPrimary = "inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]";
const btnOutline = "inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]";
const btnSm = "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border font-semibold cursor-pointer font-[inherit] transition-all";

const EMPTY_FORM = { name: '', email: '', password: '', role: 'purchase_manager' };

// ── User Management Panel ──────────────────────────────────────────────────
function UserManagementPanel({ isSuperAdmin }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const data = await fetchUsers(params);
      setUsers(data.users || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(''); setEditingUser(null); setShowModal(true); };
  const openEdit = (u) => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setFormError(''); setEditingUser(u); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) { setFormError('Name and email are required.'); return; }
    if (!editingUser && !form.password.trim()) { setFormError('Password is required for new users.'); return; }
    setFormLoading(true); setFormError('');
    try {
      if (editingUser) {
        await updateUser(editingUser._id, { name: form.name, role: form.role });
      } else {
        await createUser({ name: form.name, email: form.email, password: form.password, role: form.role });
      }
      setShowModal(false);
      load();
    } catch (e) { setFormError(e.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    try { await deleteUser(id); setConfirmDeleteId(null); load(); }
    catch (e) { alert(e.message); }
  };

  const handleToggle = async (id) => {
    try { await toggleUserStatus(id); load(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit] bg-white text-gray-700"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES_LIST.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {isSuperAdmin && (
          <button className={btnPrimary} onClick={openAdd}>
            <MdAdd size={16} /> Add User
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold">{error}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {ROLES_LIST.map(r => {
          const count = users.filter(u => u.role === r.value).length;
          return (
            <div key={r.value}
              className="rounded-xl border p-3 flex flex-col gap-1 cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ borderColor: r.color + '30', background: r.bg }}
              onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}
            >
              <div className="text-xl font-black" style={{ color: r.color }}>{count}</div>
              <div className="text-[10px] font-bold text-gray-500 leading-tight">{r.label}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              {['User', 'Email', 'Role', 'Status', 'Created', isSuperAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No users found</td></tr>
            ) : users.map(u => {
              const rs = getRoleStyle(u.role);
              return (
                <tr key={u._id} className={trCls}>
                  <td className={`${tdCls} font-semibold`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: rs.bg, color: rs.color }}>
                        {u.avatar || u.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm">{u.name}</span>
                    </div>
                  </td>
                  <td className={`${tdCls} text-gray-400 text-xs`}>{u.email}</td>
                  <td className={tdCls}>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: rs.bg, color: rs.color }}>
                      {rs.label}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td className={`${tdCls} text-gray-400 text-xs`}>
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  {isSuperAdmin && (
                    <td className={tdCls}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          className={`${btnSm} border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white`}
                          onClick={() => openEdit(u)}
                          title="Edit user"
                        >
                          <MdEdit size={12} /> Edit
                        </button>
                        <button
                          className={`${btnSm} ${u.isActive ? 'border-amber-300 text-amber-600 hover:bg-amber-500 hover:text-white' : 'border-green-300 text-green-600 hover:bg-green-500 hover:text-white'}`}
                          onClick={() => handleToggle(u._id)}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {u.isActive ? <MdToggleOff size={12} /> : <MdToggleOn size={12} />}
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className={`${btnSm} ${confirmDeleteId === u._id ? 'border-red-600 bg-red-600 text-white' : 'border-red-300 text-red-600 hover:bg-red-600 hover:text-white'}`}
                          onClick={() => handleDelete(u._id)}
                        >
                          <MdDelete size={12} />
                          {confirmDeleteId === u._id ? 'Confirm?' : 'Delete'}
                        </button>
                        {confirmDeleteId === u._id && (
                          <button className={`${btnSm} border-gray-300 text-gray-500 hover:bg-gray-100`}
                            onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-gray-400">{users.length} user{users.length !== 1 ? 's' : ''} shown</div>

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? `Edit User — ${editingUser.name}` : 'Add New User'}
        footer={
          <>
            <button className={btnOutline} onClick={() => setShowModal(false)} disabled={formLoading}>Cancel</button>
            <button className={btnPrimary} onClick={handleSubmit} disabled={formLoading}>
              {formLoading ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold">{formError}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className={fieldCls}>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} placeholder="e.g. Ramesh Gupta" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Email *</label>
            <input type="email" className={inputCls} placeholder="user@manufacturingerp.in" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={!!editingUser} />
          </div>
          {!editingUser && (
            <div className={fieldCls}>
              <label className={labelCls}>Password *</label>
              <input type="password" className={inputCls} placeholder="Min 6 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          )}
          <div className={fieldCls}>
            <label className={labelCls}>Role *</label>
            <select className={selectCls} value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES_LIST.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* Role description card */}
        {form.role && (() => {
          const rs = getRoleStyle(form.role);
          const descriptions = {
            super_admin:        'Full access to all modules including settings and user management.',
            management:         'View access across all modules. Can approve procurement and finance.',
            purchase_manager:   'Full access to procurement, vendors, and related modules.',
            production_manager: 'Full access to production and inventory modules.',
            dealer:             'Limited view access to orders, inventory, and returns.',
            corporate_client:   'Access to bulk orders and related modules only.',
          };
          return (
            <div className="mt-2 p-3 rounded-xl border text-xs" style={{ background: rs.bg, borderColor: rs.color + '30', color: rs.color }}>
              <span className="font-bold">{rs.label}:</span> {descriptions[form.role]}
            </div>
          );
        })()}

        {editingUser && (
          <p className="text-xs text-gray-400 mt-3">Email cannot be changed. Use Reset Password option to update password.</p>
        )}
      </Modal>
    </div>
  );
}

// ── Main SettingsPage ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState(null);
  const [openModal, setOpenModal] = useState(null);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await fetchActivityLogs({ limit: 50 });
      setAuditLogs(data.logs || []);
    } catch { setAuditLogs([]); }
    finally { setAuditLoading(false); }
  }, []);

  useEffect(() => {
    if (activeSection === 'audit') loadAuditLogs();
  }, [activeSection, loadAuditLogs]);

  // Sections that open as full panels (not modals)
  const PANEL_SECTIONS = ['users', 'roles', 'audit'];

  const handleSectionClick = (key, locked) => {
    if (locked) return;
    if (PANEL_SECTIONS.includes(key)) {
      setActiveSection(key);
    } else {
      setOpenModal(key);
    }
  };

  // ── Full-panel views ───────────────────────────────────────────────────
  if (activeSection) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
          >
            <MdArrowBack size={18} /> Back to Settings
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-bold text-gray-800">
            {SECTIONS.find(s => s.key === activeSection)?.label}
          </span>
        </div>

        <div className="p-6">
          {activeSection === 'users' && <UserManagementPanel isSuperAdmin={isSuperAdmin} />}

          {activeSection === 'roles' && <RolePermissionsPage />}

          {activeSection === 'audit' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-gray-800">Audit Logs</div>
                  <div className="text-xs text-gray-400 mt-0.5">User activity and system change history</div>
                </div>
                <button className={btnPrimary}>Export Logs</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr>{['User', 'Action', 'Module', 'Description', 'Status', 'Time', 'IP'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {auditLoading ? (
                      <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading logs...</td></tr>
                    ) : auditLogs.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No activity logs found</td></tr>
                    ) : auditLogs.map((log, i) => (
                      <tr key={i} className={trCls}>
                        <td className={`${tdCls} font-semibold text-sm`}>{log.userName || log.user?.name || '—'}</td>
                        <td className={`${tdCls} text-xs font-mono`}>{log.action}</td>
                        <td className={tdCls}>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{log.module}</span>
                        </td>
                        <td className={`${tdCls} text-xs text-gray-500 max-w-[200px] truncate`}>{log.description || '—'}</td>
                        <td className={tdCls}>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className={`${tdCls} text-gray-400 text-xs whitespace-nowrap`}>
                          {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className={`${tdCls} font-mono text-xs text-gray-400`}>{log.ipAddress || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Settings home grid ─────────────────────────────────────────────────
  return (
    <div>
      {/* Page intro */}
      <div className="mb-6">
        <div className="text-lg font-black text-gray-800">Settings</div>
        <div className="text-sm text-gray-400 mt-0.5">Manage your ERP configuration, users, and permissions</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(s => {
          const locked = s.superOnly && !isSuperAdmin;
          const Icon = s.icon;
          const isHighlighted = s.key === 'users' || s.key === 'roles';
          return (
            <div
              key={s.key}
              onClick={() => handleSectionClick(s.key, locked)}
              className={`
                relative bg-white rounded-2xl border p-5 flex items-start gap-4 transition-all
                ${locked
                  ? 'opacity-50 cursor-not-allowed border-gray-200'
                  : isHighlighted
                    ? 'cursor-pointer border-red-200 hover:border-red-500 hover:-translate-y-0.5 hover:shadow-md shadow-sm'
                    : 'cursor-pointer border-gray-200 hover:border-red-400 hover:-translate-y-0.5 hover:shadow-sm'
                }
              `}
              title={locked ? 'Only Super Admin can manage role permissions' : undefined}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isHighlighted ? 'bg-red-50' : 'bg-gray-50'}`}>
                <Icon size={22} className={isHighlighted ? 'text-red-600' : 'text-gray-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-bold text-sm ${isHighlighted ? 'text-gray-900' : 'text-gray-800'}`}>{s.label}</span>
                  {s.superOnly && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Super Admin</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{s.desc}</div>
              </div>
              {locked
                ? <span className="text-gray-300 text-lg flex-shrink-0">🔒</span>
                : <span className="text-red-400 text-xl font-light flex-shrink-0">›</span>
              }
            </div>
          );
        })}
      </div>

      {/* ── Company Profile Modal ── */}
      <Modal open={openModal === 'company'} onClose={() => setOpenModal(null)} title="Company Profile"
        footer={<><button className={btnOutline} onClick={() => setOpenModal(null)}>Cancel</button><button className={btnPrimary}>Save Changes</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className={fieldCls}><label className={labelCls}>Company Name *</label><input className={inputCls} defaultValue="MANUFACTURING ERP" /></div>
          <div className={fieldCls}><label className={labelCls}>GST Number</label><input className={inputCls} defaultValue="29ABWFS0002M1ZR" /></div>
          <div className={fieldCls}><label className={labelCls}>PAN Number</label><input className={inputCls} defaultValue="ABWFS0002M" /></div>
          <div className={fieldCls}><label className={labelCls}>Phone</label><input className={inputCls} defaultValue="+91 98765 43210" /></div>
          <div className={fieldCls}><label className={labelCls}>Email</label><input type="email" className={inputCls} defaultValue="info@manufacturingerp.in" /></div>
          <div className={fieldCls}><label className={labelCls}>Website</label><input className={inputCls} defaultValue="www.manufacturingerp.in" /></div>
          <div className={`${fieldCls} col-span-2`}><label className={labelCls}>Registered Address</label><textarea className={inputCls} defaultValue="Plot 42, MIDC Industrial Area, Nashik - 422010, Maharashtra" /></div>
          <div className={fieldCls}><label className={labelCls}>Financial Year Start</label><select className={selectCls}><option>April</option><option>January</option></select></div>
          <div className={fieldCls}><label className={labelCls}>Currency</label><select className={selectCls}><option>INR (₹)</option><option>USD ($)</option></select></div>
        </div>
      </Modal>

      {/* ── Notifications Modal ── */}
      <Modal open={openModal === 'notif'} onClose={() => setOpenModal(null)} title="Notification Settings"
        footer={<><button className={btnOutline} onClick={() => setOpenModal(null)}>Cancel</button><button className={btnPrimary} onClick={() => setOpenModal(null)}>Save</button></>}>
        {[
          { label: 'Low Stock Alerts', desc: 'Notify when stock falls below minimum level' },
          { label: 'PO Approval Requests', desc: 'Notify approvers when a PO is raised' },
          { label: 'GRN Received', desc: 'Notify purchase team on GRN completion' },
          { label: 'Production Completion', desc: 'Notify on work order completion' },
          { label: 'Payment Due Reminders', desc: 'Remind finance team of upcoming payments' },
          { label: 'Return Requests', desc: 'Notify on new customer return requests' },
        ].map((n, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <div className="font-semibold text-[13px] text-gray-800">{n.label}</div>
              <div className="text-[11px] text-gray-400">{n.desc}</div>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 accent-red-700 cursor-pointer" />
          </div>
        ))}
      </Modal>

      {/* ── Integrations Modal ── */}
      <Modal open={openModal === 'integr'} onClose={() => setOpenModal(null)} title="Integrations"
        footer={<button className={btnOutline} onClick={() => setOpenModal(null)}>Close</button>}>
        {[
          { name: 'Tally ERP', status: 'Connected', icon: '📊', desc: 'Finance data sync with Tally Prime' },
          { name: 'BlueDart API', status: 'Connected', icon: '🚚', desc: 'Courier tracking & AWB generation' },
          { name: 'DTDC API', status: 'Disconnected', icon: '📦', desc: 'Courier integration for shipments' },
          { name: 'Razorpay', status: 'Disconnected', icon: '💳', desc: 'Payment gateway for online collections' },
        ].map((intg, i) => (
          <div key={i} className="flex items-center gap-3.5 py-3.5 border-b border-gray-50">
            <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-[22px]">{intg.icon}</div>
            <div className="flex-1">
              <div className="font-bold text-[13px] text-gray-800">{intg.name}</div>
              <div className="text-[11px] text-gray-400">{intg.desc}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${intg.status === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{intg.status}</span>
            <button className={btnSm + ' border-red-300 text-red-600 hover:bg-red-600 hover:text-white'}>{intg.status === 'Connected' ? 'Configure' : 'Connect'}</button>
          </div>
        ))}
      </Modal>

      {/* ── Backup Modal ── */}
      <Modal open={openModal === 'backup'} onClose={() => setOpenModal(null)} title="Backup & Export"
        footer={<button className={btnOutline} onClick={() => setOpenModal(null)}>Close</button>}>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Export All Data (Excel)', icon: '📊' },
            { label: 'Export All Data (PDF)', icon: '📄' },
            { label: 'Download Database Backup', icon: '💾' },
            { label: 'Schedule Auto Backup', icon: '⏰' },
          ].map((b, i) => (
            <button key={i} className="inline-flex items-center gap-3 px-4 py-3.5 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]">
              <span className="text-xl">{b.icon}</span>
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
