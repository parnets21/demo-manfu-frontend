import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../../../components/common/StatusBadge';
import Modal from '../../../../components/common/Modal';
import Pagination from '../../../../components/common/Pagination';
import { grnApi } from '../../../../api/grnApi';
import { useDataEvent } from '../../../../utils/dataEvents';
import { MdVisibility, MdDeleteOutline } from 'react-icons/md';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function GRNList({ onView, refresh }) {
  const [grns, setGrns]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteGRN, setDeleteGRN] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGRNs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await grnApi.getAll();
      setGrns(res.data || []);
    } catch (e) {
      console.error('GRN fetch error:', e.message);
      setGrns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGRNs();
  }, [fetchGRNs, refresh]);

  // Re-fetch when QC or approval status changes so GRN table stays in sync
  useDataEvent('qc:changed', fetchGRNs);
  useDataEvent('approval:changed', fetchGRNs);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      // await grnApi.delete(deleteGRN._id);
      setGrns(prev => prev.filter(g => g._id !== deleteGRN._id));
      setDeleteGRN(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  // Calculate paginated GRNs
  const startIndex = (page - 1) * pageSize;
  const paginatedGRNs = grns.slice(startIndex, startIndex + pageSize);

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, fontSize: 14, padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          GRN List
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : grns.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No GRNs found</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '11px 12px' }}>GRN ID</th>
                    <th style={{ padding: '11px 12px' }}>PO Ref</th>
                    <th style={{ padding: '11px 12px' }}>Vendor</th>
                    <th style={{ padding: '11px 12px', textAlign: 'center' }}>Ordered</th>
                    <th style={{ padding: '11px 12px', textAlign: 'center' }}>Received</th>
                    <th style={{ padding: '11px 12px' }}>Date</th>
                    <th style={{ padding: '11px 12px' }}>Status</th>
                    <th style={{ padding: '11px 12px' }}>QC Status</th>
                    <th style={{ padding: '11px 12px' }}>Approval</th>
                    <th style={{ padding: '11px 12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGRNs.map((g) => (
                  <tr key={g._id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 12, padding: '12px' }}>
                      {g.grnId}
                    </td>
                    <td style={{ color: '#64748b', fontSize: 12, padding: '12px' }}>
                      {g.poId?.poId || '—'}
                    </td>
                    <td style={{ fontWeight: 500, padding: '12px' }}>
                      {g.vendorId?.companyName || '—'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>{g.orderedQuantity}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, padding: '12px',
                      color: g.receivedQuantity >= g.orderedQuantity ? '#16a34a' : '#d97706' }}>
                      {g.receivedQuantity}
                    </td>
                    <td style={{ color: '#64748b', fontSize: 12, padding: '12px' }}>{fmt(g.receivedDate)}</td>
                    <td style={{ padding: '12px' }}><StatusBadge status={g.grnStatus || g.status} /></td>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge status={g.qcStatus || 'Not Started'} />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge status={g.approvalStatus || 'Not Required'} />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" title="View Details"
                          style={{ background: '#f1f5f9', color: 'var(--text)', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => onView?.(g)}>
                          <MdVisibility size={16} />
                        </button>
                        <button className="btn btn-sm" title="Delete"
                          style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => setDeleteGRN(g)}>
                          <MdDeleteOutline size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {grns.length > 0 && (
            <Pagination
              total={grns.length}
              page={page}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          )}
        </>
        )}
      </div>

      <Modal open={!!deleteGRN} onClose={() => setDeleteGRN(null)} title="Delete GRN"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteGRN(null)} disabled={deleting}>Cancel</button>
            <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', padding: '6px 18px' }}
              onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }>
        <p style={{ fontSize: 14, color: '#374151' }}>
          Delete <strong>{deleteGRN?.grnId}</strong>? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
