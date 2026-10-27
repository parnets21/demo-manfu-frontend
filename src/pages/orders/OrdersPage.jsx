import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import { MdDeleteOutline, MdAdd, MdDownload, MdRefresh } from 'react-icons/md';
import { toast } from '../../components/common/Toast';
import { salesOrderApi } from '../../api/salesOrderApi';
import { clientApi } from '../../api/clientApi';
import Pagination from '../../components/common/Pagination';

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]';
const emptyForm = { customer: '', date: '', priority: 'Normal', status: 'Pending', items: '', value: '', remarks: '', file: '' };

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
      <div style={{ width:32, height:32, border:'3px solid #f1f5f9', borderTop:'3px solid #1e40af', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function FormBody({ form, handleFormChange, customers, showCustomerDropdown, setShowCustomerDropdown }) {
  const filteredCustomers = form.customer.trim() 
    ? customers.filter(c => {
        const name = (c.name || c.companyName || c.clientName || '').toLowerCase();
        return name.includes(form.customer.toLowerCase());
      })
    : customers;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-xs font-semibold text-gray-600">Customer Name *</label>
          <input 
            type="text" 
            autoComplete="off" 
            className={inp} 
            placeholder="Type customer name..." 
            value={form.customer} 
            onChange={e => handleFormChange('customer', e.target.value)}
            onFocus={() => setShowCustomerDropdown(true)}
            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
          />
          {showCustomerDropdown && filteredCustomers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {filteredCustomers.map(c => {
                const custName = c.name || c.companyName || c.clientName;
                return (
                  <div
                    key={c._id}
                    onMouseDown={e => {
                      e.preventDefault();
                      handleFormChange('customer', custName);
                      setShowCustomerDropdown(false);
                    }}
                    className="px-3 py-2 hover:bg-red-50 cursor-pointer text-sm border-b border-gray-100 last:border-0"
                  >
                    {custName}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Priority</label>
          <select className={inp} value={form.priority} onChange={e => handleFormChange('priority', e.target.value)}>
            {['Low','Normal','High','Urgent'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Order Status</label>
          <select className={inp} value={form.status} onChange={e => handleFormChange('status', e.target.value)}>
            {['Pending','Processing','Shipped','Delivered','Cancelled'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Number of Items *</label>
          <input 
            type="number" 
            autoComplete="off" 
            className={inp} 
            placeholder="e.g. 12" 
            value={form.items} 
            onChange={e => handleFormChange('items', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Order Date</label>
          <input 
            type="date" 
            className={inp} 
            value={form.date} 
            onChange={e => handleFormChange('date', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Order Value (₹) *</label>
          <input 
            type="number" 
            autoComplete="off" 
            className={inp} 
            placeholder="e.g. 284000" 
            value={form.value} 
            onChange={e => handleFormChange('value', e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-600">File Attachment (URL)</label>
        <input 
          type="text" 
          autoComplete="off" 
          className={inp} 
          placeholder="Paste file/document URL..." 
          value={form.file} 
          onChange={e => handleFormChange('file', e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-600">Remarks</label>
        <textarea 
          autoComplete="off" 
          className={inp} 
          placeholder="Add notes..." 
          value={form.remarks} 
          onChange={e => handleFormChange('remarks', e.target.value)}
          rows="3" 
        />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ total:0, pending:0, processing:0, delivered:0 });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [deleteOrder, setDeleteOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [form, setForm] = useState(emptyForm);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;
      const [listRes, statsRes] = await Promise.all([
        salesOrderApi.getAll(params),
        salesOrderApi.getStats(),
      ]);
      setOrders(listRes.data || []);
      setStats(statsRes.data || {});
    } catch (e) { toast(e.message || 'Failed to load orders', 'error'); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await clientApi.getAll();
      setCustomers(res.data || []);
    } catch (e) { console.error('Failed to load customers:', e); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleFormChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCreate = async () => {
    if (!form.customer) { toast('Customer name required', 'error'); return; }
    if (!form.items || parseInt(form.items) <= 0) { toast('Items must be greater than 0', 'error'); return; }
    if (!form.value || parseFloat(form.value) <= 0) { toast('Value must be greater than 0', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        customer: form.customer,
        items: parseInt(form.items),
        value: parseFloat(form.value),
        priority: form.priority,
        status: form.status,
        orderDate: form.date || new Date().toISOString(),
        remarks: form.remarks,
        file: form.file,
      };
      await salesOrderApi.create(payload);
      toast('Order created successfully');
      setForm(emptyForm);
      setShowModal(false);
      fetchAll();
    } catch (e) { toast(e.message || 'Failed to create order', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editOrder) return;
    if (!form.customer) { toast('Customer name required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        customer: form.customer,
        items: form.items ? parseInt(form.items) : undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        priority: form.priority,
        status: form.status,
        remarks: form.remarks,
        file: form.file,
      };
      await salesOrderApi.update(editOrder._id, payload);
      toast(`Order ${editOrder.orderId} updated successfully`);
      setEditOrder(null);
      setForm(emptyForm);
      fetchAll();
    } catch (e) { toast(e.message || 'Failed to update order', 'error'); }
    finally { setSaving(false); }
  };

  const openEdit = (row) => {
    setEditOrder(row);
    const itemDisplay = Array.isArray(row.items) ? row.items.length : (row.itemCount || row.items || 0);
    setForm({ 
      customer: row.customer, 
      date: '', 
      priority: row.priority, 
      status: row.status, 
      items: String(itemDisplay), 
      value: String(row.value), 
      remarks: row.remarks || '', 
      file: row.file || '' 
    });
  };

  const confirmDelete = async () => {
    if (!deleteOrder) return;
    try {
      await salesOrderApi.delete(deleteOrder._id);
      toast(`Order ${deleteOrder.orderId} deleted`);
      setDeleteOrder(null);
      fetchAll();
    } catch (e) { toast(e.message || 'Failed to delete', 'error'); }
  };

  const handleExport = () => {
    if (!orders.length) { toast('No orders to export', 'warning'); return; }
    const rows = orders.map(o => ({
      'Order ID': o.orderId,
      'Customer': o.customer,
      'Items': Array.isArray(o.items) ? o.items.length : (o.itemCount || o.items || 0),
      'Value (₹)': o.value,
      'Priority': o.priority,
      'Status': o.status,
      'Date': new Date(o.orderDate).toLocaleDateString('en-IN'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch:16 },{ wch:28 },{ wch:8 },{ wch:14 },{ wch:10 },{ wch:14 },{ wch:12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    const summaryRows = [
      { Metric:'Total Orders', Value: stats.total },
      { Metric:'Pending', Value: stats.pending },
      { Metric:'Processing', Value: stats.processing },
      { Metric:'Delivered', Value: stats.delivered },
      { Metric:'Exported On', Value: new Date().toLocaleString('en-IN') },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    const wbOut = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const blob = new Blob([wbOut], { type:'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Orders_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${orders.length} orders`);
  };

  const kpis = [
    { label:'Total Orders', value: stats.total || 0, color:'#3b82f6' },
    { label:'Processing', value: stats.processing || 0, color:'#f59e0b' },
    { label:'Delivered', value: stats.delivered || 0, color:'#10b981' },
    { label:'Pending', value: stats.pending || 0, color:'#ef4444' },
  ];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', flex:1 }}>
          <input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]"
            style={{ minWidth:220 }} />
          {['All','Pending','Processing','Shipped','Delivered','Cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer font-[inherit] ${statusFilter===s ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-400'}`}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchAll} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 bg-white rounded-xl text-sm font-semibold cursor-pointer font-[inherit] hover:bg-gray-50 transition-all">
            <MdRefresh size={16} />
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-red-600 text-red-700 bg-white rounded-xl text-sm font-semibold cursor-pointer font-[inherit] hover:bg-red-50 transition-all shadow-sm">
            <MdDownload size={16} />Export
          </button>
          <button onClick={() => { setForm(emptyForm); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md cursor-pointer font-[inherit] border-0 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <MdAdd size={18} />New Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="text-2xl font-black tracking-tight" style={{ color:k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        {loading ? <Spinner /> : (
          <>
            <DataTable columns={[
              { key:'orderId', label:'Order ID', render: v => <span className="font-semibold text-red-700">{v}</span> },
              { key:'customer', label:'Customer', render: v => <span className="font-semibold">{v}</span> },
              { key:'items', label:'Items', render: (v, row) => (Array.isArray(v) ? v.length : (row.itemCount || v || 0)) },
              { key:'value', label:'Value (₹)', render: v => <span className="font-bold">₹{Number(v).toLocaleString('en-IN')}</span> },
              { key:'priority', label:'Priority', render: v => <StatusBadge status={v} type={v==='Urgent'?'danger':v==='High'?'warning':v==='Low'?'gray':'info'} /> },
              { key:'orderDate', label:'Date', render: v => new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) },
              { key:'status', label:'Status', render: v => <StatusBadge status={v} /> },
              { key:'_id', label:'Actions', render: (_, row) => (
                <div className="flex gap-1.5">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-600 text-red-700 bg-transparent font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]" onClick={() => setSelectedOrder(row)}>View</button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-800 font-semibold cursor-pointer font-[inherit] border-0 hover:bg-gray-200 transition-all" onClick={() => openEdit(row)}>Edit</button>
                  <button className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 font-semibold cursor-pointer font-[inherit] border border-red-200 hover:bg-red-600 hover:text-white transition-all" onClick={() => setDeleteOrder(row)}><MdDeleteOutline size={15} /></button>
                </div>
              )},
            ]} data={orders.slice((page-1)*pageSize, page*pageSize)} />
            {orders.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No orders found. Click "+ New Order" to create one.</div>}
            <Pagination total={orders.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={s=>{setPageSize(s);setPage(1);}} />
          </>
        )}
      </div>

      <Modal open={!!deleteOrder} onClose={() => setDeleteOrder(null)} title="Delete Order">
        <p className="text-sm text-gray-700 mb-4">Delete order <strong>{deleteOrder?.orderId}</strong> for <strong>{deleteOrder?.customer}</strong>? This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold cursor-pointer font-[inherit]" onClick={() => setDeleteOrder(null)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold cursor-pointer font-[inherit] border-0" onClick={confirmDelete}>Delete</button>
        </div>
      </Modal>

      <Modal open={showModal} onClose={() => { setShowModal(false); setShowCustomerDropdown(false); }} title="Create New Order">
        <FormBody form={form} handleFormChange={handleFormChange} customers={customers} showCustomerDropdown={showCustomerDropdown} setShowCustomerDropdown={setShowCustomerDropdown} />
        <div className="flex gap-2 justify-end mt-4">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold cursor-pointer font-[inherit]" onClick={() => { setShowModal(false); setShowCustomerDropdown(false); }}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md border-0 cursor-pointer font-[inherit]" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Order'}</button>
        </div>
      </Modal>

      <Modal open={!!editOrder} onClose={() => { setEditOrder(null); setForm(emptyForm); setShowCustomerDropdown(false); }} title={`Edit Order — ${editOrder?.orderId}`}>
        <FormBody form={form} handleFormChange={handleFormChange} customers={customers} showCustomerDropdown={showCustomerDropdown} setShowCustomerDropdown={setShowCustomerDropdown} />
        <div className="flex gap-2 justify-end mt-4">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold cursor-pointer font-[inherit]" onClick={() => { setEditOrder(null); setForm(emptyForm); setShowCustomerDropdown(false); }}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md border-0 cursor-pointer font-[inherit]" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </Modal>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order — ${selectedOrder?.orderId || ''}`}>
        {selectedOrder && [
          ['Customer', selectedOrder.customer],
          ['Order Date', new Date(selectedOrder.orderDate).toLocaleDateString('en-IN')],
          ['Items', Array.isArray(selectedOrder.items) ? selectedOrder.items.length : (selectedOrder.itemCount || selectedOrder.items || 0)],
          ['Value', `₹${Number(selectedOrder.value).toLocaleString('en-IN')}`],
          ['Priority', selectedOrder.priority],
          ['Status', selectedOrder.status],
          ['Remarks', selectedOrder.remarks || '—'],
          ['File', selectedOrder.file ? <a href={selectedOrder.file} target="_blank" rel="noreferrer" className="text-blue-600 underline">{selectedOrder.file}</a> : '—'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between py-2 border-b border-gray-200 text-sm last:border-0">
            <span className="text-gray-500">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
        <div className="flex justify-end mt-4">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md border-0 cursor-pointer font-[inherit]" onClick={() => setSelectedOrder(null)}>Close</button>
        </div>
      </Modal>
    </div>
  );
}
