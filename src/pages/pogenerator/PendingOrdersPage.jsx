import { useState, useEffect } from 'react';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import { MdSearch, MdHourglassEmpty, MdCheckCircle, MdCancel } from 'react-icons/md';

const STATUS_COLORS = {
  Pending:   { bg: '#fef9c3', color: '#a16207' },
  Fulfilled: { bg: '#dcfce7', color: '#16a34a' },
  Cancelled: { bg: '#fee2e2', color: '#dc2626' },
};

export default function PendingOrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('Pending');
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      if (search) params.search = search;
      const res = await poGeneratorApi.listPendingOrders(params);
      setOrders(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await poGeneratorApi.updatePendingOrder(id, { status });
      fetchOrders();
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdating(null);
    }
  };

  // Stats
  const pendingCount   = orders.filter(o => o.status === 'Pending').length;
  const totalPendingQty = orders.filter(o => o.status === 'Pending').reduce((s, o) => s + (o.pendingQty || 0), 0);

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Pending Orders</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Backorder items — quantities not fulfilled in partial invoices</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pending Items',    value: pendingCount,    color: '#a16207', bg: '#fefce8' },
          { label: 'Total Pending Qty', value: totalPendingQty, color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 18px', border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <MdSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            placeholder="Search PO ref, item, vendor..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
          <option value="Pending">Pending</option>
          <option value="Fulfilled">Fulfilled</option>
          <option value="Cancelled">Cancelled</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading pending orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <MdHourglassEmpty size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>No pending orders found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['PO Ref', 'Vendor', 'Item Name', 'Requested', 'Invoiced', 'Pending Qty', 'Invoice Ref', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const sc = STATUS_COLORS[order.status] || STATUS_COLORS.Pending;
                  return (
                    <tr key={order._id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{order.poRef || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1e293b' }}>{order.vendorName || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{order.itemName}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>{order.requestedQty} {order.unit}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>{order.invoicedQty} {order.unit}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>{order.pendingQty} {order.unit}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                        {order.poInvoiceId?.invoiceNo || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{order.status}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {order.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'Fulfilled')}
                              disabled={updating === order._id}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <MdCheckCircle size={13} /> Fulfill
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'Cancelled')}
                              disabled={updating === order._id}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <MdCancel size={13} /> Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
