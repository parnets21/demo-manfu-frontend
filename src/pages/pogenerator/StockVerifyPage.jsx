import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import {
  MdCheckCircle, MdWarning, MdError, MdArrowBack, MdArrowForward,
  MdInventory2, MdRefresh,
} from 'react-icons/md';

const stockBadge = (status) => {
  if (status === 'Ready')         return { bg: '#dcfce7', color: '#16a34a', icon: <MdCheckCircle size={13} /> };
  if (status === 'Low Stock')     return { bg: '#fef9c3', color: '#a16207', icon: <MdWarning size={13} /> };
  if (status === 'Out of Stock')  return { bg: '#fee2e2', color: '#dc2626', icon: <MdError size={13} /> };
  return { bg: '#f1f5f9', color: '#64748b', icon: null };
};

export default function StockVerifyPage() {
  const { poId } = useParams();
  const navigate  = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchStockCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await poGeneratorApi.stockCheck(poId);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStockCheck(); }, [poId]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <MdInventory2 size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
      <div>Checking warehouse stock...</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
      <MdError size={40} style={{ marginBottom: 8 }} />
      <div>{error}</div>
      <button onClick={fetchStockCheck} style={{ marginTop: 12, padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
        Retry
      </button>
    </div>
  );

  if (!data) return null;

  const { po, items, canFullInvoice, hasAnyStock, summary } = data;

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Back */}
      <button onClick={() => navigate('/po-generator/upload')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, padding: 0 }}>
        <MdArrowBack size={16} /> Back to PO List
      </button>

      {/* PO Header */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px 22px', marginBottom: 20, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Purchase Order</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1e40af' }}>{po.poId}</div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{po.vendor?.companyName || '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Grand Total</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>₹{Math.round(po.grandTotal || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Status</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{po.status}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Items',     value: summary.totalItems,      color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Ready',           value: summary.readyItems,      color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Low Stock',       value: summary.lowStockItems,   color: '#a16207', bg: '#fefce8' },
          { label: 'Out of Stock',    value: summary.outOfStockItems, color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stock Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Stock Verification Results</div>
          <button onClick={fetchStockCheck} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 10px', fontSize: 12, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
            <MdRefresh size={14} /> Refresh
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Item Name', 'Requested Qty', 'Available in Warehouse', 'Dispatchable Qty', 'Pending Qty', 'Stock Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const badge = stockBadge(item.stockStatus);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{item.itemName}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569', fontWeight: 600 }}>
                      {item.requestedQty} <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.unit}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: item.availableQty >= item.requestedQty ? '#16a34a' : item.availableQty > 0 ? '#a16207' : '#dc2626' }}>
                        {item.availableQty}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>{item.unit}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                      {item.dispatchableQty} <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.unit}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: item.pendingQty > 0 ? 700 : 400, color: item.pendingQty > 0 ? '#dc2626' : '#94a3b8' }}>
                      {item.pendingQty > 0 ? `${item.pendingQty} ${item.unit}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>
                        {badge.icon} {item.stockStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock status banner */}
      {canFullInvoice ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <MdCheckCircle size={22} color="#16a34a" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>Full Stock Available</div>
            <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>All items have sufficient stock. A full invoice can be generated.</div>
          </div>
        </div>
      ) : hasAnyStock ? (
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <MdWarning size={22} color="#a16207" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Partial Stock Available</div>
            <div style={{ fontSize: 12, color: '#78350f', marginTop: 2 }}>Some items have insufficient stock. A partial invoice will be generated for available quantities. Remaining will be saved as pending orders.</div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <MdError size={22} color="#dc2626" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#b91c1c' }}>No Stock Available</div>
            <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>No items have available stock. Invoice cannot be generated at this time.</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => navigate('/po-generator/upload')}
          style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
        {hasAnyStock && (
          <button
            onClick={() => navigate(`/po-generator/approval/${poId}`, { state: { stockData: data } })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: 'linear-gradient(135deg,#1e40af,#1e3a8a)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(192,57,43,0.3)' }}
          >
            Proceed to Approval <MdArrowForward size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
