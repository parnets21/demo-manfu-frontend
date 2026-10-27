import Modal from '../../../../components/common/Modal';

export default function QCDetailModal({ open, onClose, qc }) {
  if (!qc) return null;

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

  return (
    <Modal open={open} onClose={onClose} title={`QC Record: ${qc.qcId}`} size="lg"
      footer={
        <button className="btn btn-outline" onClick={onClose}>Close</button>
      }>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>GRN ID</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{qc.grnId?.grnId || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>SKU ID</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{qc.skuId}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>Vendor</div>
          <div style={{ fontSize: 14 }}>{qc.vendorId?.companyName || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>Batch Number</div>
          <div style={{ fontSize: 14 }}>{qc.batchNumber || '—'}</div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', borderRadius: 9, padding: 14, border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>QUANTITIES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Received</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{qc.receivedQuantity}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Accepted</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#16a34a' }}>{qc.acceptedQuantity}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Rejected</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#dc2626' }}>{qc.rejectedQuantity}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Status</div>
            <span style={{
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              background: getStatusBg(qc.status),
              color: getStatusColor(qc.status)
            }}>
              {qc.status}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>Rejection Reason</div>
          <div style={{ fontSize: 14 }}>{qc.rejectionReason || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>Inspection Date</div>
          <div style={{ fontSize: 14 }}>{new Date(qc.inspectionDate).toLocaleString()}</div>
        </div>
      </div>

      {qc.storageLocation && (
        <div style={{ background: '#f8fafc', borderRadius: 9, padding: 14, border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>STORAGE LOCATION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Zone</div>
              <div style={{ fontWeight: 600 }}>{qc.storageLocation.zone || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Rack</div>
              <div style={{ fontWeight: 600 }}>{qc.storageLocation.rack || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Shelf</div>
              <div style={{ fontWeight: 600 }}>{qc.storageLocation.shelf || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Bin</div>
              <div style={{ fontWeight: 600 }}>{qc.storageLocation.bin || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {qc.inspectionNotes && (
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>INSPECTION NOTES</div>
          <div style={{
            background: '#f1f5f9',
            borderRadius: 6,
            padding: 12,
            fontSize: 13,
            color: '#475569',
            lineHeight: 1.5
          }}>
            {qc.inspectionNotes}
          </div>
        </div>
      )}
    </Modal>
  );
}
