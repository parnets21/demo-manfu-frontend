import { useState, useEffect, useCallback } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { approvalApi } from '../../api/approvalApi';
import { useAuth } from '../../auth/AuthContext';
import { MdPendingActions, MdCheckCircle, MdCancel, MdAccessTime } from 'react-icons/md';
import { useDataEvent, dataEvents } from '../../utils/dataEvents';


export default function ApprovalsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats]         = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading]     = useState(false);
  const [filterStatus, setFilter] = useState('');
  const [actionModal, setActionModal] = useState(null); // { approval, type: 'approve'|'reject' }
  const [remarks, setRemarks]     = useState('');
  const [saving, setSaving]       = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const [aRes, sRes] = await Promise.all([approvalApi.getAll(params), approvalApi.getStats()]);
      setApprovals(aRes.data || []);
      setStats(sRes.data || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useDataEvent('approval:changed', fetchAll);

  const handleAction = async () => {
    if (!actionModal) return;
    setSaving(true);
    try {
      const body = { approvedBy: user?.name || user?.email || 'Admin', remarks };
      if (actionModal.type === 'approve') {
        await approvalApi.approve(actionModal.approval._id, body);
      } else {
        await approvalApi.reject(actionModal.approval._id, body);
      }
      setActionModal(null);
      setRemarks('');
      dataEvents.emit('approval:changed');
      await fetchAll();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const kpis = [
    { label: 'Pending',  value: stats.pending,  icon: <MdPendingActions size={18} />, color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Approved', value: stats.approved, icon: <MdCheckCircle size={18} />,   color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    { label: 'Rejected', value: stats.rejected, icon: <MdCancel size={18} />,        color: '#dc2626', color2: '#ef4444', glow: 'rgba(220,38,38,0.3)' },
    { label: 'Total',    value: stats.total,    icon: <MdAccessTime size={18} />,    color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
  ];

  return (
    <div>
      <PageHeader title="Approval Dashboard" breadcrumb="Procurement › Approvals" />
      <KpiStrip kpis={kpis} />

      <PageCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Approval Requests</div>
          <select className="form-select" value={filterStatus} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Approval ID', 'Type', 'Doc Ref', 'Vendor', 'Amount', 'Requested By', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvals.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No approvals yet. Complete a QC inspection to generate approval requests.</td></tr>
                ) : approvals.map((a) => (
                  <tr key={a._id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{a.approvalId}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5 }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', fontSize: 11, fontWeight: 700, color: '#475569' }}>{a.docType}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, color: '#1e293b', fontWeight: 600 }}>{a.docRef}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#1e293b' }}>{a.vendorId?.companyName || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>
                      {a.amount ? `₹${Number(a.amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#475569' }}>{a.requestedBy || '—'}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={a.status} /></td>
                    <td style={{ padding: '11px 14px' }}>
                      {a.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setActionModal({ approval: a, type: 'approve' }); setRemarks(''); }} style={{
                            padding: '5px 12px', fontSize: 12, borderRadius: 8,
                            background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0',
                            cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                          }}>✓ Approve</button>
                          <button onClick={() => { setActionModal({ approval: a, type: 'reject' }); setRemarks(''); }} style={{
                            padding: '5px 12px', fontSize: 12, borderRadius: 8,
                            background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                            cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                          }}>✗ Reject</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {a.approvedBy && `By ${a.approvedBy}`}
                          {a.approvedAt && ` · ${new Date(a.approvedAt).toLocaleDateString('en-IN')}`}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* Confirm Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.type === 'approve' ? 'Approve Request' : 'Reject Request'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setActionModal(null)} disabled={saving}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={saving}
              onClick={handleAction}
              style={{ background: actionModal?.type === 'approve' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#3b82f6,#1e40af)' }}
            >
              {saving ? 'Processing...' : actionModal?.type === 'approve' ? '✓ Confirm Approve' : '✗ Confirm Reject'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
          {actionModal?.type === 'approve'
            ? <>Approve <strong>{actionModal?.approval?.approvalId}</strong> for <strong>{actionModal?.approval?.docRef}</strong>? This will mark the PO as <strong>Received</strong>.</>
            : <>Reject <strong>{actionModal?.approval?.approvalId}</strong>? This action will be recorded.</>
          }
        </p>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Remarks (optional)</label>
        <input className="form-input" placeholder="Add remarks..." value={remarks} onChange={e => setRemarks(e.target.value)} />
      </Modal>
    </div>
  );
}
