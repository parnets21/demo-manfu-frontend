import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import {
  MdCheckCircle, MdCancel, MdWarning, MdArrowBack, MdArrowForward,
  MdInventory2, MdError,
} from 'react-icons/md';

export default function ApprovalQueuePage() {
  const { poId }    = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();

  // Stock data passed from StockVerifyPage via router state
  const [stockData, setStockData] = useState(location.state?.stockData || null);
  const [loading, setLoading]     = useState(!stockData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [notes, setNotes]         = useState('');

  // If navigated directly (no state), re-fetch
  useEffect(() => {
    if (!stockData && poId) {
      setLoading(true);
      poGeneratorApi.stockCheck(poId)
        .then(res => setStockData(res.data))
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [poId]);

  const handleAction = async (action) => {
    if (!stockData) return;
    setSubmitting(true);
    setError('');
    try {
      const items = stockData.items.map(it => ({
        itemName:     it.itemName,
        requestedQty: it.requestedQty,
        availableQty: it.availableQty,
        invoicedQty:  it.dispatchableQty,
        pendingQty:   it.pendingQty,
        unit:         it.unit,
        basePrice:    it.basePrice,
        gst:          it.gst,
      }));

      const res = await poGeneratorApi.generateInvoice({
        poId,
        action,
        items,
        notes,
      });

      if (action === 'accept') {
        navigate('/po-generator/invoice-history', {
          state: { successMsg: res.message, invoiceId: res.data?.invoice?._id },
        });
      } else {
        navigate('/po-generator/upload', {
          state: { infoMsg: 'Invoice generation rejected. PO remains pending.' },
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <MdInventory2 size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
      <div>Loading approval data...</div>
    </div>
  );

  if (!stockData) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
      <MdError size={40} style={{ marginBottom: 8 }} />
      <div>{error || 'No stock data available. Please go back and verify stock first.'}</div>
      <button onClick={() => navigate('/po-generator/upload')} style={{ marginTop: 12, padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
        Back to PO List
      </button>
    </div>
  );

  const { po, items, canFullInvoice } = stockData;

  // Compute invoice totals
  const invoiceItems = items.filter(it => it.dispatchableQty > 0);
  const subtotal   = invoiceItems.reduce((s, it) => s + (it.dispatchableQty * it.basePrice), 0);
  const gstTotal   = invoiceItems.reduce((s, it) => s + (it.dispatchableQty * it.basePrice * it.gst / 100), 0);
  const grandTotal = subtotal + gstTotal;
  const hasPending = items.some(it => it.pendingQty > 0);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Back */}
      <button onClick={() => navigate(`/po-generator/stock-verify/${poId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, padding: 0 }}>
        <MdArrowBack size={16} /> Back to Stock Verification
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Approval Queue</h1>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>Review the partial invoice details and Accept or Reject</p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* PO Info */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>PO Reference</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af', marginTop: 2 }}>{po.poId}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Vendor</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{po.vendor?.companyName || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Invoice Type</div>
          <div style={{ marginTop: 2 }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: canFullInvoice ? '#dcfce7' : '#fef9c3', color: canFullInvoice ? '#16a34a' : '#a16207' }}>
              {canFullInvoice ? 'Full Invoice' : 'Partial Invoice'}
            </span>
          </div>
        </div>
      </div>

      {/* Level 2 — Item breakdown */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Level 2 — Partial Processing Details</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Requested vs Dispatchable vs Pending quantities per item</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Item Name', 'Requested Qty', 'Dispatchable Qty', 'Pending Qty', 'Unit Price', 'GST %', 'Line Total'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const lineTotal = item.dispatchableQty * item.basePrice * (1 + item.gst / 100);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{item.itemName}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>
                      {item.requestedQty} <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.unit}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                        {item.dispatchableQty}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>{item.unit}</span>
                      {item.dispatchableQty === 0 && (
                        <span style={{ marginLeft: 6, fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>HOLD</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {item.pendingQty > 0 ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                          {item.pendingQty} <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.unit}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>₹{(item.basePrice || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>{item.gst}%</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: item.dispatchableQty > 0 ? '#1e293b' : '#94a3b8' }}>
                      {item.dispatchableQty > 0 ? `₹${Math.round(lineTotal).toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ padding: '14px 18px', borderTop: '2px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>₹{Math.round(subtotal).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>GST Total</span>
              <span style={{ fontWeight: 600 }}>₹{Math.round(gstTotal).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8, fontSize: 15, fontWeight: 800, color: '#1e40af' }}>
              <span>Invoice Total</span>
              <span>₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending warning */}
      {hasPending && (
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <MdWarning size={20} color="#a16207" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#78350f' }}>
            <strong>Backorder Notice:</strong> Items with insufficient stock will be saved as <strong>Pending Orders</strong> and can be fulfilled when stock is replenished.
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Add any remarks for this invoice..."
          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => handleAction('reject')}
          disabled={submitting}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', background: '#fff', color: '#dc2626', border: '2px solid #fecaca', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.6 : 1 }}
        >
          <MdCancel size={18} /> Not Accept
        </button>
        <button
          onClick={() => handleAction('accept')}
          disabled={submitting || invoiceItems.length === 0}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: (submitting || invoiceItems.length === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(22,163,74,0.3)', opacity: (submitting || invoiceItems.length === 0) ? 0.6 : 1 }}
        >
          <MdCheckCircle size={18} /> {submitting ? 'Generating...' : 'Accept & Generate Invoice'}
        </button>
      </div>
    </div>
  );
}
