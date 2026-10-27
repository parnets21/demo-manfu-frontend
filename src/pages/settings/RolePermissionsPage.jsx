import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MdLock, MdSave, MdCheckCircle, MdVisibility, MdBlock,
  MdAdd, MdEdit, MdDelete, MdClose, MdRefresh,
} from 'react-icons/md';
import {
  BASE_ROLES, getAllRoles, NAV_ITEMS,
  loadPageAccess, savePageAccess, resetPageAccess,
  saveCustomRole, deleteCustomRole, loadCustomRoles,
} from '../../auth/rbac';

// Page list from nav (deduped by page key)
const PAGE_GROUPS = (() => {
  const groups = [];
  const seen = new Set();
  let cur = null;
  for (const item of NAV_ITEMS) {
    if (item.section) {
      cur = { section: item.section, pages: [] };
      groups.push(cur);
    } else if (cur && !seen.has(item.page)) {
      seen.add(item.page);
      cur.pages.push({ page: item.page, label: item.label });
    }
  }
  return groups.filter(g => g.pages.length);
})();

const CYCLE = [false, 'view', 'full'];

const BADGE = {
  full:  { label: 'Full', bg: '#dcfce7', color: '#16a34a', border: '#86efac', icon: <MdCheckCircle size={12} /> },
  view:  { label: 'View', bg: '#eff6ff', color: '#2563eb', border: '#93c5fd', icon: <MdVisibility  size={12} /> },
  false: { label: 'None', bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0', icon: <MdBlock       size={12} /> },
};

const COLORS = ['#1e40af','#8e44ad','#2980b9','#27ae60','#f39c12','#16a085','#d35400','#e74c3c','#3498db','#9b59b6'];
const autoColor = key => { let h = 0; for (const c of key) h = c.charCodeAt(0) + ((h << 5) - h); return COLORS[Math.abs(h) % COLORS.length]; };
const autoKey   = v   => v.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

function Badge({ value, onClick, locked }) {
  const b = BADGE[String(value)] ?? BADGE.false;
  return (
    <button
      onClick={locked ? undefined : onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        background: b.bg, color: b.color, border: `1.5px solid ${b.border}`,
        cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.6 : 1,
        fontFamily: 'inherit', whiteSpace: 'nowrap', minWidth: 60, justifyContent: 'center',
        transition: 'transform .1s',
      }}
      onMouseEnter={e => { if (!locked) e.currentTarget.style.transform = 'scale(1.07)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {b.icon} {b.label}
    </button>
  );
}

function RoleModal({ open, editing, onSave, onClose }) {
  const [name,  setName]  = useState(editing?.label || '');
  const [key,   setKey]   = useState(editing?.key   || '');
  const [color, setColor] = useState(editing ? autoColor(editing.key) : COLORS[0]);
  const [err,   setErr]   = useState('');

  const onName = v => { setName(v); if (!editing) setKey(autoKey(v)); };

  const submit = () => {
    if (!name.trim()) { setErr('Role name is required.'); return; }
    if (!key.trim())  { setErr('Role key is required.');  return; }
    if (!/^[a-z0-9_]+$/.test(key)) { setErr('Key: lowercase letters, numbers, underscores only.'); return; }
    if (!editing && key in BASE_ROLES) { setErr('This key conflicts with a built-in role.'); return; }
    onSave({ key: key.trim(), label: name.trim() });
  };

  if (!open) return null;

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, boxSizing: 'border-box',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        fontFamily: "'Inter',system-ui,sans-serif",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{editing ? 'Edit Role' : 'New Role'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}>
            <MdClose size={20} />
          </button>
        </div>

        {err && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
            {err}
          </div>
        )}

        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Role Name *</label>
        <input
          autoFocus value={name} onChange={e => onName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. Warehouse Manager"
          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 14 }}
          onFocus={e => e.target.style.borderColor = '#1e40af'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />

        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
          Role Key * <span style={{ fontWeight: 400, color: '#94a3b8' }}>(auto-generated, fixed after creation)</span>
        </label>
        <input
          value={key} onChange={e => !editing && setKey(autoKey(e.target.value))}
          disabled={!!editing} placeholder="e.g. warehouse_manager"
          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16, background: editing ? '#f8fafc' : '#fff', color: editing ? '#94a3b8' : '#1e293b' }}
        />

        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 26, height: 26, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
              outline: color === c ? `3px solid ${c}` : '3px solid transparent', outlineOffset: 2,
              transform: color === c ? 'scale(1.2)' : 'scale(1)', transition: 'transform .15s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: color + '12', border: `1px solid ${color}30`, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
            {name ? name[0].toUpperCase() : '?'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>{name || 'Role Name'}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{key || 'role_key'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={submit} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {editing ? 'Save' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function RolePermissionsPage() {
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate(n => n + 1), []);

  const allRoles      = getAllRoles();
  const customRoles   = loadCustomRoles();
  const editableRoles = Object.keys(allRoles).filter(r => r !== 'super_admin');

  const [matrix,       setMatrix]       = useState(() => loadPageAccess());
  const [saved,        setSaved]        = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const [modalKey,  setModalKey]  = useState(0);
  const [roleModal, setRoleModal] = useState(null);

  const openAdd  = ()           => { setModalKey(k => k + 1); setRoleModal({ editing: null }); };
  const openEdit = (key, label) => { setModalKey(k => k + 1); setRoleModal({ editing: { key, label } }); };

  const cycle = (page, role) => {
    const cur  = matrix[page]?.[role] ?? false;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    setMatrix(p => ({ ...p, [page]: { ...p[page], [role]: next } }));
    setSaved(false);
  };

  const clearRow = (page) => {
    setMatrix(p => {
      const row = { ...p[page] };
      for (const role of editableRoles) row[role] = false;
      return { ...p, [page]: row };
    });
    setSaved(false);
  };

  const save = () => {
    savePageAccess(matrix);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    const fresh = resetPageAccess();
    for (const pg of Object.keys(fresh)) {
      for (const k of Object.keys(customRoles)) fresh[pg][k] = false;
    }
    setMatrix(fresh);
    setConfirmReset(false);
    setSaved(false);
  };

  const saveRole = ({ key, label }) => {
    saveCustomRole(key, label);
    setMatrix(p => {
      const n = { ...p };
      for (const pg of Object.keys(n)) n[pg] = { ...n[pg], [key]: n[pg][key] ?? false };
      return n;
    });
    setRoleModal(null);
    refresh();
  };

  const deleteRole = (key) => {
    deleteCustomRole(key);
    setMatrix(p => {
      const n = { ...p };
      for (const pg of Object.keys(n)) {
        const r = { ...n[pg] };
        delete r[key];
        n[pg] = r;
      }
      return n;
    });
    refresh();
  };

  const hasCustomRoles = Object.keys(customRoles).length > 0;

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {/* <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Role Permissions</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Click a badge to toggle access. Super Admin is always Full.</div>
        </div> */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1.5px solid #1e40af', background: '#fef2f2', color: '#1e40af', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <MdAdd size={15} /> Add Role
          </button>
          <button onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${confirmReset ? '#ef4444' : '#e2e8f0'}`, background: confirmReset ? '#fef2f2' : '#fff', color: confirmReset ? '#ef4444' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <MdRefresh size={14} /> {confirmReset ? 'Confirm?' : 'Reset'}
          </button>
          {confirmReset && (
            <button onClick={() => setConfirmReset(false)} style={{ padding: '7px 12px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          )}
          <button onClick={save} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 9, border: 'none', background: saved ? '#16a34a' : 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .3s' }}>
            {saved ? <><MdCheckCircle size={14} /> Saved</> : <><MdSave size={14} /> Save</>}
          </button>
        </div>
      </div>

      {/* Custom roles cards */}
      {hasCustomRoles && (
        <div style={{ marginBottom: 20, padding: '14px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Custom Roles</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(customRoles).map(([key, label]) => {
              const color = autoColor(key);
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: '#fff', border: `1.5px solid ${color}30` }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {label[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{key}</div>
                  </div>
                  <button onClick={() => openEdit(key, label)} title="Edit"
                    style={{ marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                  >
                    <MdEdit size={14} />
                  </button>
                  <button onClick={() => deleteRole(key)} title="Delete"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', color: '#dc2626' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                  >
                    <MdDelete size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.entries(BADGE).map(([k, b]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: b.color, fontWeight: 600 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: b.bg, border: `1.5px solid ${b.border}` }} />
            {b.label} — {k === 'full' ? 'Full access' : k === 'view' ? 'Read only' : 'No access'}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2, minWidth: 160 }}>
                Page
              </th>
              <th style={{ padding: '11px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#1e40af', minWidth: 110 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <MdLock size={11} /> Super Admin
                </div>
              </th>
              {editableRoles.map(role => {
                const color  = autoColor(role);
                const custom = role in customRoles;
                return (
                  <th key={role} style={{ padding: '11px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ color }}>{allRoles[role]}</span>
                      {custom && (
                        <button onClick={() => deleteRole(role)} title="Delete role"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 3, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                        >
                          <MdDelete size={11} />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PAGE_GROUPS.map(group => (
              <React.Fragment key={group.section}>
                <tr>
                  <td colSpan={2 + editableRoles.length} style={{ padding: '6px 16px', fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    {group.section}
                  </td>
                </tr>
                {group.pages.map((pg, i) => (
                  <tr key={pg.page}
                    style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafcff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef9f9'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafcff'}
                  >
                    <td style={{ padding: '9px 16px', position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', flex: 1 }}>{pg.label}</span>
                        <button onClick={() => clearRow(pg.page)} title="Clear all access for this page"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', padding: 0, flexShrink: 0, opacity: 0.5 }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                        >
                          <MdDelete size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <Badge value="full" locked />
                    </td>
                    {editableRoles.map(role => (
                      <td key={role} style={{ padding: '8px', textAlign: 'center' }}>
                        <Badge value={matrix[pg.page]?.[role] ?? false} onClick={() => cycle(pg.page, role)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
        Save changes — users need to refresh to see updated access.
      </p>

      <RoleModal
        key={modalKey}
        open={!!roleModal}
        editing={roleModal?.editing ?? null}
        onSave={saveRole}
        onClose={() => setRoleModal(null)}
      />
    </div>
  );
}
