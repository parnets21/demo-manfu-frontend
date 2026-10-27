import { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import { pos } from '../data';

export default function EditGRNModal({ open, onClose, grn, onSave }) {
  const [selectedPO, setSelectedPO] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [warehouse, setWarehouse] = useState('WH-01');
  const [receivedBy, setReceivedBy] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [gst, setGst] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (grn) {
      setSelectedPO(grn.poRef);
      setReceiptDate(grn.receivedDate);
      setWarehouse(grn.warehouse);
      setReceivedBy(grn.receivedBy);
      setVehicleNo(grn.vehicleNo || '');
      setChallanDate(grn.challanDate || '');
      setGst(grn.gst);
      setItems(grn.items.map(item => ({
        name: item.name,
        ordered: item.ordered,
        received: item.received,
        condition: 'Good',
      })));
    }
  }, [grn, open]);

  const updateItem = (i, k, v) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleSave = () => {
    if (!selectedPO || !receiptDate || !receivedBy || !gst) {
      alert('Please fill all required fields');
      return;
    }

    const updatedGRN = {
      ...grn,
      poRef: selectedPO,
      vendor: pos.find(p => p.id === selectedPO)?.vendor || grn.vendor,
      receivedBy,
      receivedDate: receiptDate,
      warehouse,
      vehicleNo,
      challanDate,
      gst,
      items: items.map(item => ({
        name: item.name,
        ordered: item.ordered,
        received: parseInt(item.received) || 0,
        accepted: grn.items.find(i => i.name === item.name)?.accepted || 0,
        rejected: grn.items.find(i => i.name === item.name)?.rejected || 0,
      })),
    };

    onSave(updatedGRN);
    onClose();
  };

  if (!grn || !grn._id) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit GRN — ${grn?.id}`} size="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </>
      }>

      {/* Header Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">PO Reference *</label>
          <select className="form-select" value={selectedPO} onChange={e => setSelectedPO(e.target.value)}>
            <option value="">— Select PO —</option>
            {pos.map(p => (
              <option key={p.id} value={p.id}>{p.id} — {p.vendor}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Receipt Date *</label>
          <input type="date" className="form-input" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Warehouse *</label>
          <select className="form-select" value={warehouse} onChange={e => setWarehouse(e.target.value)}>
            <option value="WH-01">WH-01 — Main Store</option>
            <option value="WH-02">WH-02 — Secondary Store</option>
            <option value="WH-03">WH-03 — Raw Material Store</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Received By *</label>
          <input className="form-input" placeholder="Staff name" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Vehicle / Challan No.</label>
          <input className="form-input" placeholder="e.g. MH-12-AB-1234" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Supplier Challan Date</label>
          <input type="date" className="form-input" value={challanDate} onChange={e => setChallanDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">GST % *</label>
          <input type="number" className="form-input" placeholder="e.g. 18" value={gst} onChange={e => setGst(e.target.value)} />
        </div>
      </div>

      {/* Items Receipt */}
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Items Received</div>
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Ordered Qty</th>
              <th>Received Qty</th>
              <th>Condition</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td style={{ color: '#64748b' }}>{item.ordered}</td>
                <td>
                  <input type="number" className="form-input" style={{ width: 80 }}
                    placeholder="0" value={item.received}
                    onChange={e => updateItem(i, 'received', e.target.value)} />
                </td>
                <td>
                  <select className="form-select" style={{ width: 110 }}
                    value={item.condition} onChange={e => updateItem(i, 'condition', e.target.value)}>
                    <option>Good</option>
                    <option>Damaged</option>
                    <option>Partial</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>RECEIPT SUMMARY</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Ordered</div>
            <div style={{ fontWeight: 700 }}>{items.reduce((s, i) => s + i.ordered, 0)} units</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Received</div>
            <div style={{ fontWeight: 700, color: '#16a34a' }}>
              {items.reduce((s, i) => s + (parseInt(i.received) || 0), 0)} units
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Pending</div>
            <div style={{ fontWeight: 700, color: '#d97706' }}>
              {items.reduce((s, i) => s + Math.max(0, i.ordered - (parseInt(i.received) || 0)), 0)} units
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
