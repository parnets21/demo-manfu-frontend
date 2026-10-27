import { useState, useEffect } from 'react';
import Pagination from '../../../../components/common/Pagination';
import { qcApi } from '../../../../api/qualityCheckApi';

export default function QCList({ onView, refresh }) {
  const [qcs, setQCs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    loadQCs();
  }, [refresh]);

  const loadQCs = async () => {
    setLoading(true);
    try {
      const res = await qcApi.getAll(filter ? { status: filter } : {});
      setQCs(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Approved': '#16a34a',
      'Rejected': '#dc2626',
      'Partial': '#d97706',
      'Pending': '#64748b'
    };
    return colors[status] || '#64748b';
  };

  const getStatusBg = (status) => {
    const bgs = {
      'Approved': '#f0fdf4',
      'Rejected': '#fef2f2',
      'Partial': '#fffbeb',
      'Pending': '#f1f5f9'
    };
    return bgs[status] || '#f1f5f9';
  };

  // Calculate paginated QCs
  const startIndex = (page - 1) * pageSize;
  const paginatedQCs = qcs.slice(startIndex, startIndex + pageSize);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'Approved', 'Rejected', 'Partial', 'Pending'].map(s => (
          <button
            key={s}
            className={`btn ${filter === s ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setFilter(s); }}
            style={{ fontSize: 12 }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading QC records...</div>
      ) : qcs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No QC records found</div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>QC ID</th>
                  <th>GRN ID</th>
                  <th>Received</th>
                  <th>Accepted</th>
                  <th>Rejected</th>
                  <th>Status</th>
                  <th>Inspection Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQCs.map(qc => (
                <tr key={qc._id}>
                  <td style={{ fontWeight: 600 }}>{qc.qcId}</td>
                  <td>{qc.grnId?.grnId || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{qc.receivedQuantity}</td>
                  <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{qc.acceptedQuantity}</td>
                  <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{qc.rejectedQuantity}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: getStatusBg(qc.status),
                      color: getStatusColor(qc.status)
                    }}>
                      {qc.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>
                    {new Date(qc.inspectionDate).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => onView?.(qc)}
                      style={{ fontSize: 11 }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {qcs.length > 0 && (
          <Pagination
            total={qcs.length}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        )}
        </>
      )}
    </div>
  );
}
