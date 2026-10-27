import { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import { rfqApi } from '../../../../api/rfqApi';
import { poApi } from '../../../../api/poApi';
import { useAuth } from '../../../../auth/AuthContext';
import { MdAdd, MdCheckCircle, MdStar } from 'react-icons/md';

const fmt = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// ── Add Quotation Modal ────────────────────────────────────────────────────
function AddQuotationModal({ open, onClose, rfq, vendor, onSaved }) {
  const [items, setItems] = useState([]);
  const [validUntil, setValidUntil] = useState('');
  const [remarks, setRemarks]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // Reset items whenever the rfq or vendor changes (fresh modal each time)
  useEffect(() => {
    if (open) {
      setItems((rfq?.items || []).map(it => ({ name: it.name, qty: it.qty, unit: it.unit, unitPrice: '', deliveryDays: '' })));
      setValidUntil('');
      setRemarks('');
      setError('');
    }
  }, [open, rfq, vendor]);

  const update = (i, field, val) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const total = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0), 0);

  const handleSave = async () => {
    setError('');
    if (items.some(it => !it.unitPrice)) { setError('Enter unit price for all items.'); return; }
    setSaving(true);
    try {
      await rfqApi.addQuotation(rfq._id, {
        vendor: vendor._id,
        items: items.map(it => ({
          name: it.name, qty: parseFloat(it.qty), unit: it.unit,
          unitPrice: parseFloat(it.unitPrice),
          totalPrice: parseFloat(it.qty) * parseFloat(it.unitPrice),
        })),
        totalAmount: total,
        validUntil: validUntil || undefined,
        remarks: remarks.trim(),
      });
      onSaved?.();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = { width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <Modal open={open} onClose={onClose} title={`Add Quotation — ${vendor?.companyName}`}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </>
      }
    >
      {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Valid Until</label>
          <input type="date" style={inp} value={validUntil} onChange={e => setValidUntil(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Remarks</label>
          <input style={inp} placeholder="Delivery terms, notes..." value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 9, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['Item', 'Qty', 'Unit', 'Unit Price (₹) *', 'Total'].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>{it.name}</td>
                <td style={{ padding: '8px 12px', fontSize: 13, color: '#64748b' }}>{it.qty}</td>
                <td style={{ padding: '8px 12px', fontSize: 13, color: '#64748b' }}>{it.unit}</td>
                <td style={{ padding: '8px 10px', width: 130 }}>
                  <input style={inp} type="number" placeholder="0.00" value={it.unitPrice}
                    onChange={e => update(i, 'unitPrice', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#1e40af'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </td>
                <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  {fmt((parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>Total Amount:</td>
              <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 15, color: '#1e40af' }}>{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Modal>
  );
}

// ── Main Compare Quotes Modal ──────────────────────────────────────────────
export default function CompareQuotesModal({ open, onClose, rfq, onRefresh }) {
  const { user } = useAuth();
  const [addQuoteVendor, setAddQuoteVendor] = useState(null);
  const [creatingPO, setCreatingPO]         = useState(false);
  const [poError, setPoError]               = useState('');
  const [poSuccess, setPoSuccess]           = useState('');

  if (!rfq || !rfq._id) return null;

  const quotations = rfq.quotations || [];
  const vendors    = rfq.vendors    || [];

  // Vendors who haven't quoted yet
  const quotedVendorIds = quotations.map(q => q.vendor?._id || q.vendor);
  const pendingVendors  = vendors.filter(v => !quotedVendorIds.includes(v._id));

  // Find best quote (lowest total)
  const bestIdx = quotations.length > 0
    ? quotations.reduce((bi, q, i) => (q.totalAmount || 0) < (quotations[bi].totalAmount || 0) ? i : bi, 0)
    : -1;

  const handleCreatePO = async (quotation) => {
    setPoError(''); setPoSuccess('');
    setCreatingPO(true);
    try {
      const vendorId = quotation.vendor?._id || quotation.vendor;
      await poApi.create({
        vendor: vendorId,
        linkedRFQ: rfq._id,
        status: 'Approved',
        items: quotation.items.map(it => ({
          name: it.name, qty: it.qty, unit: it.unit,
          basePrice: it.unitPrice, gst: 18,
          total: it.totalPrice || it.qty * it.unitPrice,
        })),
        subtotal: quotation.items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
        gstTotal: quotation.items.reduce((s, it) => s + it.qty * it.unitPrice * 0.18, 0),
        grandTotal: quotation.totalAmount,
        paymentTerms: rfq.paymentTerms || '',
        remarks: `Created from RFQ ${rfq.rfqId} — ${quotation.vendor?.companyName || 'vendor'}'s quotation`,
      });
      // Close RFQ
      await rfqApi.updateStatus(rfq._id, 'Closed');
      setPoSuccess(`PO created & approved from ${quotation.vendor?.companyName || 'vendor'}'s quotation!`);
      onRefresh?.();
    } catch (e) { setPoError(e.message); }
    finally { setCreatingPO(false); }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Quotations — ${rfq.rfqId || 'RFQ'}`} size="xl"
        footer={<button className="btn btn-outline" onClick={onClose}>Close</button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {poError   && <div style={{ padding: '9px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{poError}</div>}
          {poSuccess && <div style={{ padding: '9px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{poSuccess}</div>}

          {/* Pending vendors — add quotation */}
          {pendingVendors.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                Awaiting quotation from:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pendingVendors.map(v => (
                  <button key={v._id} onClick={() => setAddQuoteVendor(v)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: '1.5px solid #f59e0b', background: '#fff', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <MdAdd size={13} /> {v.companyName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No quotations yet */}
          {quotations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
              No quotations received yet. Click a vendor above to add their quotation.
            </div>
          )}

          {/* Quotation cards */}
          {quotations.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(quotations.length, 3)}, 1fr)`, gap: 12 }}>
                {quotations.map((q, i) => {
                  const isBest = i === bestIdx;
                  const vName  = q.vendor?.companyName || 'Vendor';
                  return (
                    <div key={i} style={{
                      padding: 16, borderRadius: 12,
                      border: `2px solid ${isBest ? '#1e40af' : '#e2e8f0'}`,
                      background: isBest ? '#fef2f2' : '#f8fafc',
                      position: 'relative',
                    }}>
                      {isBest && (
                        <div style={{ position: 'absolute', top: -10, right: 12, background: '#1e40af', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MdStar size={10} /> BEST PRICE
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>{vName}</div>
                      {q.validUntil && (
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                          Valid until: {new Date(q.validUntil).toLocaleDateString('en-IN')}
                        </div>
                      )}
                      <div style={{ fontSize: 22, fontWeight: 900, color: isBest ? '#1e40af' : '#1e293b', marginBottom: 4 }}>
                        {fmt(q.totalAmount)}
                      </div>
                      {q.remarks && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>{q.remarks}</div>}
                      <button
                        onClick={() => handleCreatePO(q)}
                        disabled={creatingPO || !!poSuccess}
                        style={{
                          width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                          background: isBest ? '#1e40af' : '#f1f5f9',
                          color: isBest ? '#fff' : '#475569',
                          fontSize: 12, fontWeight: 700, cursor: creatingPO ? 'wait' : 'pointer',
                          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}
                      >
                        <MdCheckCircle size={14} />
                        {creatingPO ? 'Creating PO...' : 'Accept & Create PO'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Item-wise comparison table */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Item-wise Price Comparison</div>
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Item</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Qty</th>
                        {quotations.map((q, i) => (
                          <th key={i} style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: i === bestIdx ? '#1e40af' : '#64748b', textTransform: 'uppercase' }}>
                            {q.vendor?.companyName || 'Vendor'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(rfq.items || []).map((rfqItem, ri) => {
                        const prices = quotations.map(q => q.items?.[ri]?.unitPrice || 0);
                        const minP   = Math.min(...prices.filter(p => p > 0));
                        return (
                          <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{rfqItem.name}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>{rfqItem.qty} {rfqItem.unit}</td>
                            {quotations.map((q, qi) => {
                              const price = q.items?.[ri]?.unitPrice || 0;
                              const isBestPrice = price === minP && price > 0;
                              return (
                                <td key={qi} style={{ padding: '9px 12px', textAlign: 'center', background: isBestPrice ? '#fef2f2' : 'transparent' }}>
                                  <div style={{ fontSize: 13, fontWeight: isBestPrice ? 800 : 500, color: isBestPrice ? '#1e40af' : '#1e293b' }}>
                                    {price > 0 ? `₹${price}/unit` : '—'}
                                  </div>
                                  {isBestPrice && <div style={{ fontSize: 9, color: '#16a34a', fontWeight: 700 }}>✓ Lowest</div>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Add Quotation sub-modal */}
      {addQuoteVendor && (
        <AddQuotationModal
          open={!!addQuoteVendor}
          onClose={() => setAddQuoteVendor(null)}
          rfq={rfq}
          vendor={addQuoteVendor}
          onSaved={() => { setAddQuoteVendor(null); onRefresh?.(); }}
        />
      )}
    </>
  );
}
