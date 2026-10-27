import { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import { poApi } from '../../../../api/poApi';
import { grnApi } from '../../../../api/grnApi';
import { inventoryApi } from '../../../../api/inventoryApi';
import { dataEvents } from '../../../../utils/dataEvents';

export default function CreateGRNModal({ open, onClose, onSaved }) {
  const [pos, setPOs]               = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedPO, setSelectedPO] = useState('');
  const [poData, setPoData]         = useState(null);
  const [receiptDate, setReceiptDate] = useState('');
  const [receivedBy, setReceivedBy]   = useState('');
  const [remarks, setRemarks]         = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems]             = useState([]);
  const [saving, setSaving]           = useState(false);
  const [loading, setLoading]         = useState(false);

  const loadPOs = async () => {
    setLoading(true);
    try {
      const res = await poApi.getAll();
      // Only allow Approved POs for GRN creation (enforcing the flow)
      const usable = (res.data || []).filter(p => p.status === 'Approved');
      setPOs(usable);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadWarehouses = async () => {
    try {
      const res = await inventoryApi.getWarehouses();
      setWarehouses(res.data || []);
    } catch (e) { 
      console.error('Error loading warehouses:', e);
      setWarehouses([]);
    }
  };

  useEffect(() => {
    if (open) {
      loadPOs();
      loadWarehouses();
      setSelectedPO(''); setPoData(null); setItems([]);
      setReceiptDate(''); setReceivedBy(''); setRemarks(''); setWarehouseId('');
    }
  }, [open]);

  const handlePOSelect = async (poId) => {
    setSelectedPO(poId);
    if (!poId) { setPoData(null); setItems([]); return; }
    try {
      const res = await poApi.getById(poId);
      const po = res.data;
      setPoData(po);
      setItems((po.items || []).map(it => ({
        skuId: it.skuId || it._id,
        name: it.name,
        ordered: it.qty,
        received: '',
        condition: 'Good',
        remarks: '',
      })));
    } catch (e) { alert(e.message); }
  };

  const updateItem = (i, k, v) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleSave = async () => {
    if (!selectedPO)        { alert('Please select a PO'); return; }
    if (!receiptDate)       { alert('Please enter receipt date'); return; }
    if (!receivedBy.trim()) { alert('Please enter received by'); return; }
    if (!warehouseId.trim()) { alert('Please select a warehouse'); return; }

    const totalOrdered  = items.reduce((s, i) => s + i.ordered, 0);
    const totalReceived = items.reduce((s, i) => s + (parseInt(i.received) || 0), 0);
    if (totalReceived === 0) { alert('Please enter received quantities'); return; }

    setSaving(true);
    try {
      await grnApi.create({
        poId: selectedPO,
        vendorId: poData?.vendor?._id || poData?.vendor,
        warehouseId,
        orderedQuantity: totalOrdered,
        receivedQuantity: totalReceived,
        receivedDate: receiptDate,
        grnStatus: 'Received',
        remarks: remarks.trim(),
        items: items.map(it => ({
          itemName: it.name,
          orderedQty: it.ordered,
          receivedQty: parseInt(it.received) || 0,
          unit: it.unit || 'Nos',
        })),
      });
      dataEvents.emit('grn:changed');
      onSaved?.();
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalOrdered  = items.reduce((s, i) => s + i.ordered, 0);
  const totalReceived = items.reduce((s, i) => s + (parseInt(i.received) || 0), 0);
  const totalPending  = Math.max(0, totalOrdered - totalReceived);

  return (
    <Modal open={open} onClose={onClose} title="Create GRN" size="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save GRN'}
          </button>
        </>
      }>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading POs...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">PO Reference *</label>
              <select className="form-select" value={selectedPO} onChange={e => handlePOSelect(e.target.value)}>
                <option value="">— Select PO —</option>
                {pos.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.poId} — {p.vendor?.companyName || 'Unknown Vendor'} [{p.status}]
                  </option>
                ))}
              </select>
              {pos.length === 0 && !loading && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>No approved POs available. Approve a PO first before creating a GRN.</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Receipt Date *</label>
              <input type="date" className="form-input" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse *</label>
              <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                <option value="">— Select Warehouse —</option>
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>
                    {w.warehouseId} — {w.name} ({w.location})
                  </option>
                ))}
              </select>
              {warehouses.length === 0 && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>No warehouses available</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Received By *</label>
              <input className="form-input" placeholder="Staff name" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Remarks</label>
              <input className="form-input" placeholder="Optional notes" value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
          </div>

          {poData && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, marginBottom: 16, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: '#15803d' }}>Vendor: </span>
              <span>{poData.vendor?.companyName || '—'}</span>
              <span style={{ marginLeft: 16, fontWeight: 600, color: '#15803d' }}>PO Value: </span>
              <span>₹{(poData.grandTotal || 0).toLocaleString('en-IN')}</span>
            </div>
          )}

          {items.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Items Received</div>
              <div className="table-container" style={{ marginBottom: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Ordered Qty</th>
                      <th>Received Qty</th>
                      <th>Condition</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td style={{ color: '#64748b', textAlign: 'center' }}>{item.ordered}</td>
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
                        <td>
                          <input className="form-input" placeholder="Optional"
                            value={item.remarks} onChange={e => updateItem(i, 'remarks', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 9, padding: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>RECEIPT SUMMARY</div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Ordered</div>
                    <div style={{ fontWeight: 700 }}>{totalOrdered} units</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Received</div>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>{totalReceived} units</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Pending</div>
                    <div style={{ fontWeight: 700, color: '#d97706' }}>{totalPending} units</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Status</div>
                    <div style={{ fontWeight: 700, color: totalReceived >= totalOrdered ? '#16a34a' : totalReceived > 0 ? '#d97706' : '#94a3b8' }}>
                      {totalReceived >= totalOrdered ? 'Completed' : totalReceived > 0 ? 'Partial' : 'Pending'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
