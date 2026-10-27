import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { salesOrderApi } from '../../api/salesOrderApi';
import { invoiceApi } from '../../api/invoiceApi';
import {
  MdRefresh, MdDownload, MdStorefront, MdCheckCircle,
  MdLocalShipping, MdInventory, MdPending, MdCancel,
  MdReceipt,
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import Pagination from '../../components/common/Pagination';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  'Order Placed':      { color: '#10B981', bg: '#D1FAE5' },
  'Pending Approval':  { color: '#F59E0B', bg: '#FEF3C7' },
  'Approved':          { color: '#3B82F6', bg: '#DBEAFE' },
  'Rejected':          { color: '#EF4444', bg: '#FEE2E2' },
  'Picking Started':   { color: '#8B5CF6', bg: '#EDE9FE' },
  'Picking Completed': { color: '#6D28D9', bg: '#EDE9FE' },
  'Sorting Started':   { color: '#06B6D4', bg: '#CFFAFE' },
  'Sorting Completed': { color: '#0891B2', bg: '#CFFAFE' },
  'Packing Started':   { color: '#0EA5E9', bg: '#E0F2FE' },
  'Packing Completed': { color: '#0284C7', bg: '#E0F2FE' },
  'Invoice Generated': { color: '#059669', bg: '#D1FAE5' },
  'Ready for Dispatch':{ color: '#F97316', bg: '#FFEDD5' },
  'Dispatched':        { color: '#EA580C', bg: '#FFEDD5' },
  'In Transit':        { color: '#F97316', bg: '#FFEDD5' },
  'Delivered':         { color: '#10B981', bg: '#D1FAE5' },
  'Cancelled':         { color: '#EF4444', bg: '#FEE2E2' },
};

const ALL_STATUSES = [
  'All', 'Order Placed', 'Pending Approval', 'Approved', 'Rejected', 'Picking Started', 
  'Picking Completed', 'Sorting Started', 'Sorting Completed', 'Packing Started', 
  'Packing Completed', 'Invoice Generated', 'Ready for Dispatch', 'Dispatched', 
  'In Transit', 'Delivered', 'Cancelled',
];

const ORDER_STAGES = [
  'Order Placed', 'Pending Approval', 'Approved', 'Picking Started', 'Picking Completed', 
  'Sorting Started', 'Sorting Completed', 'Packing Started', 'Packing Completed', 
  'Invoice Generated', 'Ready for Dispatch', 'Dispatched', 'Delivered',
];

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid #f1f5f9', borderTop: '3px solid #1e40af',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Order Detail Drawer ────────────────────────────────────────────────────────
function OrderDetailPanel({ order, onClose, onStatusUpdate }) {
  const [updating, setUpdating]     = useState(false);
  const [newStatus, setNewStatus]   = useState(order?.status || 'Pending');
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (order) setNewStatus(order.status);
  }, [order]);

  if (!order) return null;

  const handleStatusUpdate = async () => {
    if (newStatus === order.status && !statusNote) {
      toast('Select a different status to update', 'warning');
      return;
    }
    setUpdating(true);
    try {
      // Build updated statusHistory
      const existingHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      const updatedHistory = [
        ...existingHistory,
        { status: newStatus, at: new Date().toISOString(), note: statusNote || `Status updated to ${newStatus}` },
      ];
      await salesOrderApi.update(order._id, {
        status: newStatus,
        statusHistory: updatedHistory,
      });
      toast(`Order ${order.orderId} updated to "${newStatus}"`);
      onStatusUpdate();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const lineItems  = order.lineItems || [];
  const history    = order.statusHistory || [];
  const currentIdx = ORDER_STAGES.indexOf(order.status);
  const fmtDate    = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const cfg        = STATUS_COLORS[order.status] || {};

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'relative',
        width: 540, maxWidth: '95vw',
        background: '#fff',
        height: '100vh',
        overflowY: 'auto',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af, #96281b)',
          padding: '20px 24px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>
                {order.orderId}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                Placed {fmtDate(order.createdAt || order.orderDate)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                background: cfg.bg || '#F3F4F6',
                color: cfg.color || '#6B7280',
                padding: '4px 12px', borderRadius: 20,
                fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
              }}>
                {order.status}
              </span>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

          {/* KPIs row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Subtotal', value: `₹${Number(order.subTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
              { label: 'GST', value: `₹${Number(order.totalGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
              { label: 'Total Value', value: `₹${Number(order.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, highlight: true },
            ].map((k, i) => (
              <div key={i} style={{
                background: k.highlight ? '#FFF5F5' : '#F9FAFB',
                borderRadius: 12, padding: '12px 14px',
                border: `1px solid ${k.highlight ? '#FECACA' : '#E5E7EB'}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {k.label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: k.highlight ? '#1e40af' : '#111827' }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          {/* Progress timeline */}
          {order.status !== 'Cancelled' && (
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Order Progress
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
                {ORDER_STAGES.map((stage, idx) => {
                  const done    = idx <= currentIdx;
                  const active  = idx === currentIdx;
                  const stageCfg = STATUS_COLORS[stage] || {};
                  return (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 68 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: done ? (stageCfg.color || '#10B981') : '#E5E7EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, color: done ? '#fff' : '#9CA3AF',
                          fontWeight: 700, border: active ? `3px solid ${stageCfg.color}` : 'none',
                          boxShadow: active ? `0 0 0 3px ${stageCfg.bg}` : 'none',
                        }}>
                          {done ? '✓' : idx + 1}
                        </div>
                        <div style={{
                          fontSize: 9, marginTop: 4, textAlign: 'center',
                          color: done ? stageCfg.color || '#10B981' : '#9CA3AF',
                          fontWeight: active ? 800 : 600,
                          maxWidth: 62, lineHeight: 1.2,
                        }}>
                          {stage}
                        </div>
                      </div>
                      {idx < ORDER_STAGES.length - 1 && (
                        <div style={{
                          height: 2, width: 20, flexShrink: 0,
                          background: idx < currentIdx ? (stageCfg.color || '#10B981') : '#E5E7EB',
                          marginBottom: 18,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order Info */}
          <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Information</div>
            {[
              ['Customer / Dealer', order.customer],
              ['Order ID', order.orderId],
              ['Source', order.source || 'DealerApp'],
              ['Priority', order.priority || 'Normal'],
              ['Order Date', fmtDate(order.orderDate || order.createdAt)],
              ['Delivery Address', order.deliveryAddress || '—'],
              ['Notes', order.notes || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, minWidth: 120 }}>{k}</span>
                <span style={{ fontSize: 12, color: '#111827', fontWeight: 700, textAlign: 'right', flex: 1, marginLeft: 12 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Ordered Products ({lineItems.length})
              </div>
              {lineItems.map((item, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10, padding: '10px 12px',
                  marginBottom: 8, border: '1px solid #E5E7EB',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>SKU: {item.sku}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, background: '#F3F4F6', color: '#374151', fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                        Qty: {item.quantity}
                      </span>
                      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
                        @ ₹{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      {item.gstPercent > 0 && (
                        <span style={{ fontSize: 11, background: '#EDE9FE', color: '#7C3AED', fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                          GST {item.gstPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#1e40af', marginLeft: 12, whiteSpace: 'nowrap' }}>
                    ₹{Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status History */}
          {history.length > 0 && (
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Status History
              </div>
              {[...history].reverse().map((h, i) => {
                const hCfg = STATUS_COLORS[h.status] || {};
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: hCfg.color || '#9CA3AF', marginTop: 3, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: hCfg.color || '#374151' }}>{h.status}</span>
                      {h.at && <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 8 }}>{fmtDate(h.at)}</span>}
                      {h.note && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{h.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Update Status */}
          <div style={{ background: '#FFF5F5', borderRadius: 14, padding: 16, border: '2px solid #FECACA' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Update Order Status
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #FECACA',
                  fontSize: 13, fontWeight: 600, background: '#fff', color: '#111827',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {ALL_STATUSES.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Add a note (optional)..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #FECACA',
                  fontSize: 13, background: '#fff', color: '#111827', fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #1e40af, #96281b)',
                  color: '#fff', border: 'none', fontSize: 13, fontWeight: 800,
                  cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DealerOrdersPage() {
  const [orders,        setOrders]        = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [stats,         setStats]         = useState({});
  const [loading,       setLoading]       = useState(false);
  const [statusFilter,  setStatusFilter]  = useState('All');
  const [search,        setSearch]        = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [creatingInvoice, setCreatingInvoice] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [viewInvoice,   setViewInvoice]   = useState(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { source: 'DealerApp' };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search.trim())          params.search  = search.trim();

      const [ordersRes, statsRes, invoicesRes] = await Promise.all([
        salesOrderApi.getAll(params),
        salesOrderApi.getStats(),
        invoiceApi.getAll(),
      ]);

      // Filter only DealerApp orders on the client side as well (server filter above)
      const allOrders = ordersRes.data || [];
      const dealerOrders = allOrders.filter(
        (o) => o.source === 'DealerApp' || o.dealerId
      );
      setOrders(dealerOrders);
      setInvoices(invoicesRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) {
      toast(err.message || 'Failed to load dealer orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const handleCreateInvoice = async (order) => {
    setCreatingInvoice(order._id);
    try {
      const res = await invoiceApi.createFromSalesOrder(order._id);
      toast(`Invoice ${res.data.invoiceNo} created successfully!`);
      fetchData();
    } catch (err) {
      toast(err.message || 'Failed to create invoice', 'error');
    } finally {
      setCreatingInvoice(null);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to delete order ${order.orderId}?`)) return;
    setDeletingOrder(order._id);
    try {
      await salesOrderApi.delete(order._id);
      toast('Order deleted successfully');
      fetchData();
    } catch (err) {
      toast(err.message || 'Failed to delete order', 'error');
    } finally {
      setDeletingOrder(null);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!orders.length) { toast('No orders to export', 'warning'); return; }
    const rows = orders.map((o) => ({
      'Order ID':       o.orderId,
      'Dealer':         o.customer,
      'Items':          o.itemCount || (Array.isArray(o.lineItems) ? o.lineItems.length : 0),
      'Subtotal (₹)':   o.subTotal || 0,
      'GST (₹)':        o.totalGst || 0,
      'Total Value (₹)':o.value || 0,
      'Priority':       o.priority || 'Normal',
      'Status':         o.status,
      'Order Date':     new Date(o.orderDate || o.createdAt).toLocaleDateString('en-IN'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [14, 24, 8, 14, 12, 16, 10, 14, 12].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dealer Orders');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const url = URL.createObjectURL(new Blob([out], { type: 'application/octet-stream' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `DealerOrders_${new Date().toISOString().slice(0, 10)}.xlsx` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${orders.length} dealer orders`);
  };

  // Compute dealer-specific stats from fetched orders
  const dealerStats = {
    total:     orders.length,
    pending:   orders.filter((o) => o.status === 'Pending Approval').length,
    approved:  orders.filter((o) => o.status === 'Approved').length,
    picking:   orders.filter((o) => ['Picking Started', 'Picking Completed'].includes(o.status)).length,
    sorting:   orders.filter((o) => ['Sorting Started', 'Sorting Completed'].includes(o.status)).length,
    packing:   orders.filter((o) => ['Packing Started', 'Packing Completed'].includes(o.status)).length,
    invoiced:  orders.filter((o) => o.status === 'Invoice Generated').length,
    ready:     orders.filter((o) => o.status === 'Ready for Dispatch').length,
    shipped:   orders.filter((o) => ['Dispatched', 'Shipped', 'In Transit'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'Delivered').length,
    rejected:  orders.filter((o) => o.status === 'Rejected').length,
    cancelled: orders.filter((o) => o.status === 'Cancelled').length,
  };

  const kpis = [
    { label: 'Total Dealer Orders', value: dealerStats.total,     color: '#3B82F6', icon: MdStorefront },
    { label: 'Pending Approval',   value: dealerStats.pending,    color: '#F59E0B', icon: MdPending },
    { label: 'Approved',           value: dealerStats.approved,   color: '#3B82F6', icon: MdCheckCircle },
    { label: 'Picking',            value: dealerStats.picking,    color: '#8B5CF6', icon: MdInventory },
    { label: 'Sorting',            value: dealerStats.sorting,    color: '#06B6D4', icon: MdLocalShipping },
    { label: 'Packing',            value: dealerStats.packing,    color: '#0EA5E9', icon: MdLocalShipping },
    { label: 'Invoiced',           value: dealerStats.invoiced,   color: '#059669', icon: MdReceipt },
    { label: 'Dispatched',         value: dealerStats.shipped,    color: '#F97316', icon: MdLocalShipping },
    { label: 'Delivered',          value: dealerStats.delivered,  color: '#10B981', icon: MdCheckCircle },
  ];

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>
            Dealer App Orders
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            All orders placed by dealers via the Sri Chakra Dealer App
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E5E7EB', borderRadius: 10, background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <MdRefresh size={16} /> Refresh
          </button>
          <button
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '2px solid #1e40af', borderRadius: 10, background: '#fff', color: '#1e40af', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <MdDownload size={16} /> Export
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '16px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={18} style={{ color: k.color }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: k.color }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search by Order ID or Dealer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, outline: 'none', minWidth: 240, fontFamily: 'inherit', color: '#111827' }}
        />
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1px solid ${statusFilter === s ? '#1e40af' : '#E5E7EB'}`,
              background: statusFilter === s ? '#1e40af' : '#fff',
              color: statusFilter === s ? '#fff' : '#374151',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E7EB', padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {loading ? <Spinner /> : (
          <>
            <DataTable
              columns={[
                {
                  key: 'orderId', label: 'Order ID',
                  render: (v) => <span style={{ fontWeight: 800, color: '#1e40af' }}>{v}</span>,
                },
                {
                  key: 'customer', label: 'Dealer',
                  render: (v) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MdStorefront size={14} style={{ color: '#1e40af' }} />
                      <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                  ),
                },
                {
                  key: 'lineItems', label: 'Products',
                  render: (v, row) => {
                    const count = Array.isArray(v) && v.length ? v.length : (row.itemCount || 0);
                    return <span style={{ fontWeight: 700 }}>{count} item{count !== 1 ? 's' : ''}</span>;
                  },
                },
                {
                  key: 'value', label: 'Total Value',
                  render: (v) => <span style={{ fontWeight: 800, color: '#1e40af' }}>₹{Number(v || 0).toLocaleString('en-IN')}</span>,
                },
                {
                  key: 'priority', label: 'Priority',
                  render: (v) => <StatusBadge status={v || 'Normal'} type={v === 'Urgent' ? 'danger' : v === 'High' ? 'warning' : v === 'Low' ? 'gray' : 'info'} />,
                },
                {
                  key: 'orderDate', label: 'Order Date',
                  render: (v, row) => {
                    const d = v || row.createdAt;
                    return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                  },
                },
                {
                  key: 'status', label: 'Status',
                  render: (v) => {
                    const cfg = STATUS_COLORS[v] || {};
                    return (
                      <span style={{
                        background: cfg.bg || '#F3F4F6',
                        color: cfg.color || '#6B7280',
                        padding: '3px 10px', borderRadius: 8,
                        fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                      }}>
                        {v}
                      </span>
                    );
                  },
                },
                {
                  key: '_id', label: 'Invoice',
                  render: (_, row) => {
                    const invoice = invoices.find(inv => String(inv.salesOrderId) === String(row._id));
                    if (invoice) {
                      return (
                        <span
                          onClick={() => setViewInvoice(invoice)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: '#D1FAE5', color: '#10B981',
                            padding: '3px 10px', borderRadius: 8,
                            fontSize: 11, fontWeight: 800, cursor: 'pointer',
                          }}
                          title="Click to view invoice"
                        >
                          <MdReceipt size={12} />
                          {invoice.invoiceNo}
                        </span>
                      );
                    }
                    return <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600 }}>—</span>;
                  },
                },
                {
                  key: '_id', label: 'Actions',
                  render: (_, row) => {
                    const invoice = invoices.find(inv => String(inv.salesOrderId) === String(row._id));
                    const canCreateInvoice = row.status === 'Approved' && !invoice;
                    return (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canCreateInvoice && (
                          <button
                            onClick={() => handleCreateInvoice(row)}
                            disabled={creatingInvoice === row._id}
                            style={{
                              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              border: 'none', color: '#fff', background: 'linear-gradient(135deg, #10B981, #059669)',
                              cursor: creatingInvoice === row._id ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit', opacity: creatingInvoice === row._id ? 0.7 : 1,
                            }}
                          >
                            {creatingInvoice === row._id ? 'Creating...' : 'Create Invoice'}
                          </button>
                        )}
                        {invoice && (
                          <button
                            onClick={() => setViewInvoice(invoice)}
                            style={{
                              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              border: '1px solid #059669', color: '#059669', background: 'transparent',
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            View Invoice
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(row)}
                          style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid #1e40af', color: '#1e40af', background: 'transparent',
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          View & Update
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(row)}
                          disabled={deletingOrder === row._id}
                          style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid #EF4444', color: '#EF4444', background: 'transparent',
                            cursor: deletingOrder === row._id ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {deletingOrder === row._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    );
                  },
                },
              ]}
              data={orders.slice((page-1)*pageSize, page*pageSize)}
            />
            {orders.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF' }}>
                <MdStorefront size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontSize: 15, fontWeight: 700 }}>No Dealer Orders Found</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  Orders placed by dealers via the Sri Chakra Dealer App will appear here.
                </div>
              </div>
            )}
            {orders.length > 0 && (
              <Pagination total={orders.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={s=>{setPageSize(s);setPage(1);}} />
            )}
          </>
        )}
      </div>

      {/* ── Order Detail Drawer ─────────────────────────────────────────────── */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={() => {
            setSelectedOrder(null);
            fetchData();
          }}
        />
      )}

      {/* ── Invoice View Modal ─────────────────────────────────────────────── */}
      {viewInvoice && (
        <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice.invoiceNo}`} size="xl">
          <div style={{ padding: '20px 0' }}>
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #E5E7EB' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1e40af' }}>MANUFACTURING ERP</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.6 }}>
                  #13/14, Azeez Sait Industrial Estate, Mysore Road,<br/>
                  Nayandahalli, Bangalore - 560039<br/>
                  GSTIN: 29ABWFS0002M1ZR
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>TAX INVOICE</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  Invoice No: <strong>{viewInvoice.invoiceNo}</strong><br/>
                  Date: <strong>{new Date(viewInvoice.invoiceDate).toLocaleDateString('en-IN')}</strong>
                </div>
              </div>
            </div>

            {/* Bill To / Ship To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, padding: 16, background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Bill To</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{viewInvoice.billToName || viewInvoice.partyName}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>
                  {viewInvoice.billToAddress || viewInvoice.partyAddress || '—'}<br/>
                  {viewInvoice.partyPhone && <>Mobile: {viewInvoice.partyPhone}</>}
                  {viewInvoice.billToGST && <><br/>GSTIN: {viewInvoice.billToGST}</>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Ship To</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{viewInvoice.shipToName || 'MANUFACTURING ERP'}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>
                  {viewInvoice.shipToAddress || '#13/14, Azeez Sait Industrial Estate, Mysore Road, Nayandahalli, Bangalore - 560039'}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>S.No</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Items</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Qty</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Rate</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Tax</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewInvoice.items || []).map((item, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#111827' }}>{item.description || item.name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'center', color: '#111827' }}>{item.qty || 0}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', color: '#111827' }}>₹{Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', color: '#6B7280' }}>{item.taxRate || 0}%</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#111827' }}>₹{Number(item.total || item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 280, borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Subtotal</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>₹{Number(viewInvoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Tax</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>₹{Number(viewInvoice.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#FFF5F5' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1e40af' }}>Grand Total</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1e40af' }}>₹{Number(viewInvoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
