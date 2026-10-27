import Modal from '../../../../components/common/Modal';
import StatusBadge from '../../../../components/common/StatusBadge';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const renderValue = (label, value) => {
  if (label === 'Status') {
    return <StatusBadge status={typeof value === 'string' ? value : value?.status || 'Unknown'} />;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (value === null || value === undefined) {
    return '—';
  }
  return '—';
};

export default function GRNDetailModal({ open, onClose, grn }) {
  if (!grn || !grn._id) return null;

  return (
    <Modal open={open} onClose={onClose} title={`GRN Details — ${grn.grnId}`} size="lg"
      footer={<button className="btn btn-outline" onClick={onClose}>Close</button>}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          ['GRN ID',       grn.grnId || '—'],
          ['PO Reference', typeof grn.poId === 'string' ? grn.poId : (grn.poId?.poId || '—')],
          ['Vendor',       typeof grn.vendorId === 'string' ? grn.vendorId : (grn.vendorId?.companyName || '—')],
          ['Warehouse',    typeof grn.warehouseId === 'string' ? grn.warehouseId : (grn.warehouseId ? `${grn.warehouseId.warehouseId} — ${grn.warehouseId.name}` : '—')],
          ['Receipt Date', fmt(grn.receivedDate)],
          ['Status',       grn.grnStatus || grn.status || 'Unknown'],
          ['Remarks',      grn.remarks || '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {renderValue(label, value)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--border)' }}>
        {[
          ['Total Ordered',  grn.orderedQuantity,  '#1c2833'],
          ['Total Received', grn.receivedQuantity, grn.receivedQuantity >= grn.orderedQuantity ? '#16a34a' : '#d97706'],
          ['Pending',        Math.max(0, grn.orderedQuantity - grn.receivedQuantity), '#d97706'],
        ].map(([label, val, color]) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color }}>{val}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
