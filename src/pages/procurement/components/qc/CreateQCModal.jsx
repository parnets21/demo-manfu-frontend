import { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import { grnApi } from '../../../../api/grnApi';
import { qcApi } from '../../../../api/qualityCheckApi';

export default function CreateQCModal({ open, onClose, onSaved }) {
  const [grns, setGRNs] = useState([]);
  const [selectedGRN, setSelectedGRN] = useState('');
  const [grnData, setGRNData] = useState(null);
  const [acceptedQty, setAcceptedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Other');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [storageLocation, setStorageLocation] = useState({ zone: '', rack: '', shelf: '', bin: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPendingGRNs();
      resetForm();
    }
  }, [open]);

  const loadPendingGRNs = async () => {
    setLoading(true);
    try {
      const res = await grnApi.getAll();
      const pending = (res.data || []).filter(g => g.grnStatus === 'Received' || g.grnStatus === 'QC_Pending');
      setGRNs(pending);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGRNSelect = async (grnId) => {
    setSelectedGRN(grnId);
    if (!grnId) {
      setGRNData(null);
      return;
    }
    try {
      const res = await grnApi.getById(grnId);
      setGRNData(res.data);
      setAcceptedQty(res.data.receivedQuantity);
      setRejectedQty(0);
    } catch (e) {
      alert(e.message);
    }
  };

  const resetForm = () => {
    setSelectedGRN('');
    setGRNData(null);
    setAcceptedQty('');
    setRejectedQty('');
    setRejectionReason('Other');
    setInspectionNotes('');
    setBatchNumber('');
    setWarehouseId('');
    setStorageLocation({ zone: '', rack: '', shelf: '', bin: '' });
  };

  const handleSave = async () => {
    if (!selectedGRN) {
      alert('Please select a GRN');
      return;
    }
    if (!acceptedQty && acceptedQty !== 0) {
      alert('Please enter accepted quantity');
      return;
    }
    if (!rejectedQty && rejectedQty !== 0) {
      alert('Please enter rejected quantity');
      return;
    }

    const total = parseInt(acceptedQty) + parseInt(rejectedQty);
    if (total !== grnData.receivedQuantity) {
      alert(`Accepted + Rejected must equal Received (${grnData.receivedQuantity})`);
      return;
    }

    if (!warehouseId) {
      alert('Please select a warehouse');
      return;
    }

    setSaving(true);
    try {
      await qcApi.create({
        grnId: selectedGRN,
        acceptedQuantity: parseInt(acceptedQty),
        rejectedQuantity: parseInt(rejectedQty),
        rejectionReason,
        inspectionNotes,
        inspectedBy: localStorage.getItem('userId') || 'system',
        batchNumber,
        warehouseId,
        storageLocation
      });
      onSaved?.();
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Quality Check Inspection" size="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Processing...' : 'Complete QC'}
          </button>
        </>
      }>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading GRNs...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">GRN Reference *</label>
              <select className="form-select" value={selectedGRN} onChange={e => handleGRNSelect(e.target.value)}>
                <option value="">— Select GRN —</option>
                {grns.map(g => (
                  <option key={g._id} value={g._id}>
                    {g.grnId} — {g.receivedQuantity} units [{g.grnStatus}]
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Warehouse *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Warehouse ID"
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Batch Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., BATCH-2024-001"
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <select className="form-select" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}>
                <option>Damaged</option>
                <option>Defective</option>
                <option>Quantity Mismatch</option>
                <option>Quality Issue</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {grnData && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, marginBottom: 16, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: '#15803d' }}>GRN: </span>
              <span>{grnData.grnId}</span>
              <span style={{ marginLeft: 16, fontWeight: 600, color: '#15803d' }}>Received: </span>
              <span>{grnData.receivedQuantity} units</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Accepted Quantity *</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={acceptedQty}
                onChange={e => setAcceptedQty(e.target.value)}
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rejected Quantity *</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={rejectedQty}
                onChange={e => setRejectedQty(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Zone</label>
              <input
                type="text"
                className="form-input"
                placeholder="Zone"
                value={storageLocation.zone}
                onChange={e => setStorageLocation({ ...storageLocation, zone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rack</label>
              <input
                type="text"
                className="form-input"
                placeholder="Rack"
                value={storageLocation.rack}
                onChange={e => setStorageLocation({ ...storageLocation, rack: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Shelf</label>
              <input
                type="text"
                className="form-input"
                placeholder="Shelf"
                value={storageLocation.shelf}
                onChange={e => setStorageLocation({ ...storageLocation, shelf: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bin</label>
              <input
                type="text"
                className="form-input"
                placeholder="Bin"
                value={storageLocation.bin}
                onChange={e => setStorageLocation({ ...storageLocation, bin: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Inspection Notes</label>
            <textarea
              className="form-input"
              placeholder="Additional inspection notes..."
              value={inspectionNotes}
              onChange={e => setInspectionNotes(e.target.value)}
              rows="3"
            />
          </div>

          {grnData && (
            <div style={{ background: '#f8fafc', borderRadius: 9, padding: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>QC SUMMARY</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Received</div>
                  <div style={{ fontWeight: 700 }}>{grnData.receivedQuantity} units</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Accepted</div>
                  <div style={{ fontWeight: 700, color: '#16a34a' }}>{acceptedQty || 0} units</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Rejected</div>
                  <div style={{ fontWeight: 700, color: '#dc2626' }}>{rejectedQty || 0} units</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Status</div>
                  <div style={{
                    fontWeight: 700,
                    color: rejectedQty === 0 ? '#16a34a' : rejectedQty === grnData.receivedQuantity ? '#dc2626' : '#d97706'
                  }}>
                    {rejectedQty === 0 ? 'Approved' : rejectedQty === grnData.receivedQuantity ? 'Rejected' : 'Partial'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
