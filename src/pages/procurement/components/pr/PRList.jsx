import { useState, useEffect } from 'react';
import StatusBadge from '../../../../components/common/StatusBadge';
import PRApprovalBadge from './PRApprovalBadge';
import Modal from '../../../../components/common/Modal';
import Pagination from '../../../../components/common/Pagination';
import { prApi } from '../../../../api/prApi';
import { MdVisibility, MdEdit, MdCheckCircle, MdCancel, MdDeleteOutline } from 'react-icons/md';

import { dataEvents } from '../../../../utils/dataEvents';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

const priorityStyle = (p) => ({
  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, display: 'inline-block',
  background: p === 'Critical' ? '#fee2e2' : p === 'Urgent' ? '#fef3c7' : '#f1f5f9',
  color: p === 'Critical' ? '#991b1b' : p === 'Urgent' ? '#92400e' : '#475569',
});

export default function PRList({ onEdit, refresh, viewOnly }) {
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewPR, setViewPR] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [approvalModal, setApprovalModal] = useState(null); // { pr, type: 'approve'|'reject' }
  const [approving, setApproving] = useState(false);
  const isMobile = useIsMobile();

  const fetchPRs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await prApi.getAll(params);
      setPrs(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPRs(); }, [filterStatus, refresh]);

  const handleDelete = async (pr) => {
    setDeleting(true);
    try {
      await prApi.delete(pr._id);
      setDeleteConfirm(null);
      dataEvents.emit('pr:changed');
      fetchPRs();
    } catch (e) { alert(e.message); }
    finally { setDeleting(false); }
  };

  const handleApproval = async () => {
    if (!approvalModal) return;
    setApproving(true);
    try {
      await prApi.updateStatus(approvalModal.pr._id, approvalModal.type === 'approve' ? 'Approved' : 'Rejected');
      setApprovalModal(null);
      dataEvents.emit('pr:changed');
      fetchPRs();
    } catch (e) { alert(e.message); }
    finally { setApproving(false); }
  };

  // Calculate paginated PRs
  const startIndex = (page - 1) * pageSize;
  const paginatedPRs = prs.slice(startIndex, startIndex + pageSize);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  const ActionButtons = ({ p }) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button
        title="View"
        style={{ background: '#f1f5f9', color: '#334155', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 6 }}
        onClick={() => setViewPR(p)}
      ><MdVisibility size={16} /></button>
      {!viewOnly && <>
        {p.status === 'Pending' && (
          <>
            <button
              title="Approve PR"
              style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #bbf7d0', borderRadius: 6 }}
              onClick={() => setApprovalModal({ pr: p, type: 'approve' })}
            ><MdCheckCircle size={16} /></button>
            <button
              title="Reject PR"
              style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #fecaca', borderRadius: 6 }}
              onClick={() => setApprovalModal({ pr: p, type: 'reject' })}
            ><MdCancel size={16} /></button>
          </>
        )}
        <button
          title="Edit"
          style={{ background: '#fef2f2', color: '#ef4444', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #fecaca', borderRadius: 6 }}
          onClick={() => onEdit?.(p)}
        ><MdEdit size={16} /></button>
        <button
          title="Delete"
          style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #fecaca', borderRadius: 6 }}
          onClick={() => setDeleteConfirm(p)}
        ><MdDeleteOutline size={14} /></button>
      </>}
    </div>
  );

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px', borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Purchase Requisitions</div>
          <select
            className="form-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ maxWidth: 150, fontSize: 13 }}
          >
            <option value="">All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : prs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No records found</div>
        ) : (
          <>
            {isMobile ? (
              /* ── Mobile card list ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {paginatedPRs.map((p, idx) => (
                  <div key={p._id} style={{
                    padding: '14px 16px',
                    borderBottom: idx < paginatedPRs.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}>
                    {/* Row 1: PR ID + status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>{p.prId}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={priorityStyle(p.priority)}>{p.priority}</span>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    {/* Row 2: dept */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{p.department}</span>
                    </div>
                    {/* Row 3: meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{p.items?.length ?? 0} items</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>By {p.requestedBy}</span>
                      {p.requiredBy && (
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          Due {new Date(p.requiredBy).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                    {/* Row 4: approval + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <PRApprovalBadge status={p.status} />
                      <ActionButtons p={p} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── Desktop table ── */
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', minWidth: 860 }}>
                  <thead>
                    <tr>
                      {['PR ID','Department','Items','Requested By','Required By','Priority','Approval','Status','Actions'].map(h => (
                        <th key={h} style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPRs.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', padding: '12px' }}>{p.prId}</td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>{p.department}</td>
                    <td style={{ padding: '12px' }}>{p.items?.length ?? 0}</td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>{p.requestedBy}</td>
                    <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap', padding: '12px' }}>
                      {p.requiredBy ? new Date(p.requiredBy).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>
                      <span style={priorityStyle(p.priority)}>{p.priority}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}><PRApprovalBadge status={p.status} /></td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}><StatusBadge status={p.status} /></td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}><ActionButtons p={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          {prs.length > 0 && (
            <Pagination
              total={prs.length}
              page={page}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          )}
        </>
      )}
      </div>

      {/* ── View PR Modal ── */}
      {viewPR && (
        <Modal
          open={!!viewPR}
          onClose={() => setViewPR(null)}
          title={`PR: ${viewPR.prId}`}
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Status: <span style={{ fontWeight: 600, color: viewPR.status === 'Approved' ? '#047857' : viewPR.status === 'Rejected' ? '#DC2626' : '#F59E0B' }}>{viewPR.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!viewOnly && (
                  <button
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1.5px solid #fecaca', color: '#ef4444', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                    onClick={() => { onEdit?.(viewPR); setViewPR(null); }}
                  ><MdEdit size={15} /> Edit</button>
                )}
                <button
                  style={{ background: 'transparent', border: '1.5px solid #cbd5e1', color: '#475569', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => setViewPR(null)}
                >Close</button>
              </div>
            </div>
          }
        >
          <style>{`
            .pr-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px 16px; }
            @media(max-width:520px){ .pr-grid { grid-template-columns: 1fr 1fr; } }
            .pr-span { grid-column: span 3; }
            @media(max-width:520px){ .pr-span { grid-column: span 2; } }
            .pr-field { display:flex; flex-direction:column; gap:3px; }
            .pr-label { font-size:10px; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.4px; }
            .pr-value { font-size:13px; font-weight:500; color:#1E293B; }
            .pr-sec { font-size:12px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.4px; margin:0; }
            .pr-sec-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #E4E7EC; }
          `}</style>

          <div style={{ marginBottom: 20 }}>
            <div className="pr-sec-row"><h3 className="pr-sec">Requisition Details</h3></div>
            <div className="pr-grid">
              {[
                ['Department', viewPR.department],
                ['Requested By', viewPR.requestedBy],
                ['Required By', viewPR.requiredBy ? new Date(viewPR.requiredBy).toLocaleDateString('en-IN') : '—'],
              ].map(([k, v]) => (
                <div key={k} className="pr-field">
                  <div className="pr-label">{k}</div>
                  <div className="pr-value">{v}</div>
                </div>
              ))}
              <div className="pr-field">
                <div className="pr-label">Priority</div>
                <div className="pr-value">
                  <span style={priorityStyle(viewPR.priority)}>{viewPR.priority}</span>
                </div>
              </div>
              {viewPR.remarks && (
                <div className="pr-field pr-span">
                  <div className="pr-label">Remarks</div>
                  <div className="pr-value">{viewPR.remarks}</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="pr-sec-row"><h3 className="pr-sec">Items ({viewPR.items?.length || 0})</h3></div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, minWidth: 280 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['ITEM NAME','QTY','UNIT'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: i > 0 ? 'right' : 'left', fontWeight: 600, color: '#64748B', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(viewPR.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{item.qty}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <Modal
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Purchase Requisition"
          size="md"
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
              <button
                style={{ background: 'transparent', border: '1px solid #CBD5E1', color: '#475569', padding: '8px 16px', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => setDeleteConfirm(null)} disabled={deleting}
              >Cancel</button>
              <button
                style={{ background: '#DC2626', color: 'white', padding: '8px 16px', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: 'none' }}
                onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
              >{deleting ? 'Deleting...' : 'Delete PR'}</button>
            </div>
          }
        >
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#1E293B' }}>Delete this PR?</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>This action cannot be undone.</div>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 14, textAlign: 'left', maxWidth: 360, margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px', fontSize: 13 }}>
                {[
                  ['PR ID', deleteConfirm.prId],
                  ['Department', deleteConfirm.department],
                  ['Items', `${deleteConfirm.items?.length || 0} item(s)`],
                ].map(([k, v]) => (
                  <>
                    <div key={k} style={{ color: '#991B1B', fontWeight: 600 }}>{k}:</div>
                    <div key={v} style={{ color: '#1E293B', fontWeight: k === 'PR ID' || k === 'Total Value' ? 700 : 400 }}>{v}</div>
                  </>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Approve / Reject PR Modal ── */}
      <Modal
        open={!!approvalModal}
        onClose={() => setApprovalModal(null)}
        title={approvalModal?.type === 'approve' ? 'Approve Purchase Requisition' : 'Reject Purchase Requisition'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <button
              style={{ background: 'transparent', border: '1px solid #CBD5E1', color: '#475569', padding: '8px 16px', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => setApprovalModal(null)} disabled={approving}
            >Cancel</button>
            <button
              style={{
                background: approvalModal?.type === 'approve' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#3b82f6,#1e40af)',
                color: 'white', padding: '8px 20px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              }}
              onClick={handleApproval} disabled={approving}
            >{approving ? 'Processing...' : approvalModal?.type === 'approve' ? '✓ Approve PR' : '✗ Reject PR'}</button>
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{approvalModal?.type === 'approve' ? '✅' : '❌'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#1E293B' }}>
            {approvalModal?.type === 'approve' ? 'Approve this PR?' : 'Reject this PR?'}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
            {approvalModal?.type === 'approve'
              ? 'Approving will allow an RFQ to be created from this PR.'
              : 'Rejecting will block this PR from moving forward.'}
          </div>
          {approvalModal?.pr && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, textAlign: 'left', maxWidth: 320, margin: '0 auto' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>PR DETAILS</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>{approvalModal.pr.prId}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{approvalModal.pr.department} · {approvalModal.pr.items?.length || 0} items</div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
