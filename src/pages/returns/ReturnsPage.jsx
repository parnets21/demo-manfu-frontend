import React, { useState, useEffect } from 'react';
import {
  MdAdd, MdRefresh, MdSearch, MdDownload, MdVisibility, MdDelete,
  MdCheckCircle, MdClose, MdLocalShipping, MdWarehouse, MdVerifiedUser,
  MdReceipt, MdBalance, MdWarning, MdAssignment, MdArrowForward,
  MdTrendingDown,
} from 'react-icons/md';
import { materialReturnApi } from '../../api/materialReturnApi.js';
import { invoiceApi } from '../../api/invoiceApi.js';
import { toast } from '../../components/common/Toast.jsx';
import Modal from '../../components/common/Modal.jsx';
import DocketTrackingPage from './DocketTrackingPage.jsx';
import WarehouseReceivePage from './WarehouseReceivePage.jsx';
import DebitCreditMatchingPage from './DebitCreditMatchingPage.jsx';
import MaterialReturnsPage from './MaterialReturnsPage.jsx';
import ProfessionalLossTrackingPage from './ProfessionalLossTrackingPage.jsx';
import { dataEvents } from '../../utils/dataEvents.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const RETURN_TYPES = ['Sales Return', 'Purchase Return', 'Damaged Return', 'Replacement Return'];
const PRIORITIES   = ['Low', 'Medium', 'High', 'Critical'];

const STAGE_COLORS = {
  Return_Request_Create: 'bg-blue-100 text-blue-700',
  Manager_Approval:      'bg-amber-100 text-amber-700',
  Docket_Create:         'bg-orange-100 text-orange-700',
  Transport_Tracking:    'bg-sky-100 text-sky-700',
  In_Transit:            'bg-sky-100 text-sky-700',
  Warehouse_Receive:     'bg-teal-100 text-teal-700',
  Received_At_Warehouse: 'bg-teal-100 text-teal-700',
  QC_Verification:       'bg-purple-100 text-purple-700',
  QC_In_Progress:        'bg-purple-100 text-purple-700',
  Finance_Reconciliation:'bg-yellow-100 text-yellow-700',
  Tally_Sync:            'bg-lime-100 text-lime-700',
  Closed:                'bg-green-100 text-green-700',
  Initiated:             'bg-gray-100 text-gray-600',
  Approved:              'bg-green-100 text-green-700',
  Rejected:              'bg-red-100 text-red-700',
};

const PRIORITY_COLORS = {
  Low:      'bg-green-100 text-green-700',
  Medium:   'bg-yellow-100 text-yellow-700',
  High:     'bg-red-100 text-red-700',
  Critical: 'bg-red-700 text-white',
};

const QC_COLORS = {
  Pending:     'bg-gray-100 text-gray-600',
  'In Progress':'bg-blue-100 text-blue-700',
  Passed:      'bg-green-100 text-green-700',
  Failed:      'bg-red-100 text-red-700',
  Completed:   'bg-green-100 text-green-700',
};

const LEGACY_MAP = {
  Initiated: 'Return_Request_Create', Approved: 'Manager_Approval',
  Transport_Pickup: 'Docket_Create', In_Transit: 'Transport_Tracking',
  Out_For_Delivery: 'Transport_Tracking', Delivered: 'Warehouse_Receive',
  Warehouse_Queue: 'Warehouse_Receive', Received_At_Warehouse: 'Warehouse_Receive',
  QC_In_Progress: 'QC_Verification', QC_Completed: 'Finance_Reconciliation',
};

const DUMMY = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const stageBadge = (s) => STAGE_COLORS[s] || 'bg-gray-100 text-gray-600';
const prioBadge  = (p) => PRIORITY_COLORS[p] || 'bg-gray-100 text-gray-600';
const qcBadge    = (q) => QC_COLORS[q] || 'bg-gray-100 text-gray-600';

const normalizeReturn = (r) => ({
  ...r,
  _id: r._id || r.id,
  mrId: r.mrId || r.returnRequestId || '',
  stage: LEGACY_MAP[r.stage] || r.stage || 'Return_Request_Create',
  supplierName: r.supplierName || r.customerName || 'Unknown',
  productName: r.productName || 'Item',
  returnQty: Number(r.returnQty || r.expectedQty || 0),
  value: Number(r.value || r.refundAmount || 0),
  approvalStatus: r.approvalStatus || 'Pending',
  qcStatus: r.qcStatus || 'Pending',
  priority: r.priority || 'Medium',
  returnType: r.returnType || r.reason || 'Purchase Return',
  reason: r.reason || '',
  createdAt: r.createdAt || r.returnDate || new Date().toISOString(),
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-800 leading-tight">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-emerald-600 font-medium mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, cls }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>{label}</span>;
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count, onAdd, addLabel, onRefresh, extra }) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        {count !== undefined && <p className="text-xs text-gray-500 mt-0.5">{count} records</p>}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {onRefresh && (
          <button onClick={onRefresh} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <MdRefresh size={16} />
          </button>
        )}
        {onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <MdAdd size={16} /> {addLabel || 'Add'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
      />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon size={40} className="mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Create Return Modal ──────────────────────────────────────────────────────
function CreateReturnModal({ open, onClose, onCreate, invoices, saving }) {
  const empty = {
    invoiceNo:'', supplierName:'', productName:'', productSku:'',
    returnQty:'', returnValue:'', returnType:'Purchase Return',
    reason:'', priority:'Medium', attachment:'',
  };
  const [form, setForm]               = useState(empty);
  const [fetching, setFetching]       = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [showDropdown, setShowDropdown]   = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Reset on close
  useEffect(() => {
    if (!open) { setForm(empty); setInvoiceSearch(''); setShowDropdown(false); }
  }, [open]); // eslint-disable-line

  const filteredInvoices = (invoices || []).filter(inv => {
    if (!invoiceSearch) return true;
    const q = invoiceSearch.toLowerCase();
    return (inv.invoiceNo || '').toLowerCase().includes(q) ||
           (inv.partyName || '').toLowerCase().includes(q);
  }).slice(0, 50);

  const handleInvoiceSelect = async (invoiceNo) => {
    setInvoiceSearch(invoiceNo);
    set('invoiceNo', invoiceNo);
    setShowDropdown(false);
    if (!invoiceNo) return;
    setFetching(true);
    try {
      const res = await materialReturnApi.getInvoiceContext(invoiceNo);
      const d = res.data || {};
      setForm(f => ({
        ...f, invoiceNo,
        supplierName: d.supplierName || f.supplierName,
        productName:  d.productName  || f.productName,
        productSku:   d.productSku   || d.skuCode || f.productSku,
        returnValue:  d.value        || f.returnValue,
        returnQty:    d.returnQty    || f.returnQty,
      }));
      toast('Invoice details fetched', 'success');
    } catch (e) {
      console.error('[Returns] getInvoiceContext failed:', e.message);
      toast('Could not fetch invoice details — fill manually', 'error');
    } finally { setFetching(false); }
  };

  const handleSubmit = () => {
    if (!form.invoiceNo)    { toast('Invoice number is required', 'error');  return; }
    if (!form.supplierName) { toast('Supplier name is required', 'error');   return; }
    if (!form.returnQty)    { toast('Return quantity is required', 'error'); return; }
    if (!form.reason)       { toast('Return reason is required', 'error');   return; }
    onCreate(form).then(() => { setForm(empty); setInvoiceSearch(''); });
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Create Return Request">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">

          {/* Invoice — searchable combo */}
          <div className="col-span-2 relative">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Invoice Number *{' '}
              {invoices.length > 0 && <span className="text-gray-400 font-normal">({invoices.length} available)</span>}
            </label>
            <input
              type="text"
              placeholder={invoices.length > 0 ? 'Search or type invoice number...' : 'Type invoice number manually...'}
              value={invoiceSearch}
              onChange={e => { setInvoiceSearch(e.target.value); set('invoiceNo', e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            {showDropdown && filteredInvoices.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredInvoices.map(inv => (
                  <button key={inv._id || inv.invoiceNo} type="button"
                    onMouseDown={() => handleInvoiceSelect(inv.invoiceNo)}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-red-50 hover:text-red-700 border-b border-gray-50 last:border-0 transition-colors">
                    <span className="font-semibold text-gray-800">{inv.invoiceNo}</span>
                    {inv.partyName && <span className="text-gray-500 ml-2">— {inv.partyName}</span>}
                    {inv.grandTotal > 0 && <span className="text-gray-400 ml-2">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</span>}
                  </button>
                ))}
              </div>
            )}
            {showDropdown && invoiceSearch && filteredInvoices.length === 0 && invoices.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-3 text-xs text-gray-400">
                No invoices match "{invoiceSearch}"
              </div>
            )}
            {fetching && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <MdRefresh size={12} className="animate-spin" /> Fetching invoice details...
              </p>
            )}
            {invoices.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠ Invoice list not loaded — type the invoice number manually</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Supplier / Customer *</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder="Auto-filled from invoice" value={form.supplierName} onChange={e => set('supplierName', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Return Type</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              value={form.returnType} onChange={e => set('returnType', e.target.value)}>
              {RETURN_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Product Name</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder="Auto-filled from invoice" value={form.productName} onChange={e => set('productName', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Product SKU</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder="SKU-XXXX" value={form.productSku} onChange={e => set('productSku', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Return Quantity *</label>
            <input type="number" min="1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder="0" value={form.returnQty} onChange={e => set('returnQty', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Return Value (₹)</label>
            <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder="0" value={form.returnValue} onChange={e => set('returnValue', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Priority</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Approval Status *</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" 
              value={form.status} 
              onChange={e => set('status', e.target.value)}
            >
              <option value="Pending">PENDING</option>
              <option value="Approved">APPROVED</option>
               <option value="Approved">COMPLETED</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Return Reason *</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
              placeholder="Describe the reason for return..." value={form.reason} onChange={e => set('reason', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Attachment / Image URL</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder="Paste image URL or file path" value={form.attachment} onChange={e => set('attachment', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || fetching}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors">
            {saving ? 'Creating...' : 'Create Return Request'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ returns, loading }) {
  const total     = returns.length;
  const pending   = returns.filter(r => r.approvalStatus === 'Pending').length;
  const approved  = returns.filter(r => r.approvalStatus === 'Approved').length;
  const rejected  = returns.filter(r => r.approvalStatus === 'Rejected').length;
  const inTransit = returns.filter(r => ['Transport_Tracking','In_Transit','Docket_Create'].includes(r.stage)).length;
  const closed    = returns.filter(r => r.stage === 'Closed').length;
  const totalVal  = returns.reduce((s, r) => s + r.value, 0);
  const pendingRefund = returns.filter(r => r.stage !== 'Closed').reduce((s, r) => s + r.value, 0);
  const recent = [...returns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const flowSteps = [
    { label: 'Return Request', count: returns.filter(r => r.stage === 'Return_Request_Create').length, color: 'bg-blue-500' },
    { label: 'Approval',       count: returns.filter(r => r.stage === 'Manager_Approval').length,      color: 'bg-amber-500' },
    { label: 'Transport',      count: inTransit,                                                        color: 'bg-sky-500' },
    { label: 'Warehouse',      count: returns.filter(r => r.stage === 'Warehouse_Receive' || r.stage === 'Received_At_Warehouse').length, color: 'bg-teal-500' },
    { label: 'QC',             count: returns.filter(r => r.stage === 'QC_Verification' || r.stage === 'QC_In_Progress').length, color: 'bg-purple-500' },
    { label: 'Finance',        count: returns.filter(r => r.stage === 'Finance_Reconciliation').length, color: 'bg-yellow-500' },
    { label: 'Closed',         count: closed,                                                           color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={MdAssignment}    label="Total Returns"    value={total}     color="bg-red-500"     sub={`${closed} closed`} />
        <StatCard icon={MdWarning}       label="Pending Approval" value={pending}   color="bg-amber-500"   sub="Awaiting review" />
        <StatCard icon={MdLocalShipping} label="In Transit"       value={inTransit} color="bg-sky-500"     sub="Being shipped back" />
        <StatCard icon={MdCheckCircle}   label="Approved"         value={approved}  color="bg-green-500"   sub={`${rejected} rejected`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={MdReceipt}    label="Total Return Value"  value={fmt(totalVal)}      color="bg-violet-500" />
        <StatCard icon={MdBalance}    label="Pending Refund"      value={fmt(pendingRefund)} color="bg-orange-500" />
        <StatCard icon={MdWarehouse}  label="At Warehouse"        value={returns.filter(r => r.stage === 'Received_At_Warehouse').length} color="bg-teal-500" />
        <StatCard icon={MdVerifiedUser} label="QC In Progress"   value={returns.filter(r => ['QC_Verification','QC_In_Progress'].includes(r.stage)).length} color="bg-purple-500" />
      </div>

      {/* Flow Pipeline */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Return Flow Pipeline</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {flowSteps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={`w-12 h-12 rounded-full ${step.color} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                  {step.count}
                </div>
                <div className="text-xs text-gray-600 font-medium mt-1.5 text-center leading-tight">{step.label}</div>
              </div>
              {i < flowSteps.length - 1 && (
                <MdArrowForward size={18} className="text-gray-300 flex-shrink-0 mb-4" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Recent Returns */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">Recent Returns</h3>
          <span className="text-xs text-gray-400">Last 5 entries</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading returns...</div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MdAssignment size={36} className="mb-2 opacity-30" />
            <p className="text-sm">No returns yet. Create your first return request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['MR ID','Party','Product','Type','Stage','Priority','Value','Date'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(r => (
                  <tr key={r.mrId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-red-600 text-xs">{r.mrId}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">{r.supplierName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">{r.productName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.returnType}</td>
                    <td className="px-4 py-3"><Badge label={r.stage.replace(/_/g,' ')} cls={stageBadge(r.stage)} /></td>
                    <td className="px-4 py-3"><Badge label={r.priority} cls={prioBadge(r.priority)} /></td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">{fmt(r.value)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Return Requests Tab ──────────────────────────────────────────────────────
function ReturnRequestsTab({ returns, loading, onAdd, onDelete, onRefresh }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = returns.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.mrId?.toLowerCase().includes(q) || r.supplierName?.toLowerCase().includes(q)
      || r.invoiceNo?.toLowerCase().includes(q) || r.productName?.toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || r.returnType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search MR ID, party, invoice, product..." />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-100">
          <option value="All">All Types</option>
          {RETURN_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={onRefresh} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
          <MdRefresh size={16} />
        </button>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <MdAdd size={16} /> Create Return Request
        </button>
      </div>

      <div className={`grid gap-4 ${selected ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Table */}
        <div className={`${selected ? 'xl:col-span-7' : ''} bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden`}>
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Return Requests <span className="text-gray-400 font-normal">({filtered.length})</span></span>
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              <MdDownload size={14} /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['MR ID','Invoice No','Party','Product','Qty','Type','Stage','Approval','Priority','Value','Date','Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-xs text-gray-400">Loading...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={12} className="px-4 py-12 text-center text-xs text-gray-400">No return requests found</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.mrId} onClick={() => setSelected(s => s?.mrId === r.mrId ? null : r)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${selected?.mrId === r.mrId ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-3 font-bold text-red-600 text-xs whitespace-nowrap">{r.mrId}</td>
                    <td className="px-3 py-3 text-xs font-mono text-gray-600">{r.invoiceNo || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-700 max-w-[110px] truncate">{r.supplierName}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 max-w-[110px] truncate">{r.productName}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-center">{r.returnQty}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{r.returnType}</td>
                    <td className="px-3 py-3"><Badge label={r.stage.replace(/_/g,' ')} cls={stageBadge(r.stage)} /></td>
                    <td className="px-3 py-3">
                      <Badge label={r.approvalStatus}
                        cls={r.approvalStatus==='Approved'?'bg-green-100 text-green-700':r.approvalStatus==='Rejected'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'} />
                    </td>
                    <td className="px-3 py-3"><Badge label={r.priority} cls={prioBadge(r.priority)} /></td>
                    <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">{fmt(r.value)}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(s => s?.mrId === r.mrId ? null : r)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="View"><MdVisibility size={15} /></button>
                        <button onClick={() => onDelete(r.mrId)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><MdDelete size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="xl:col-span-5">
            <ReturnDetailPanel record={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Return Detail Panel ──────────────────────────────────────────────────────
function ReturnDetailPanel({ record, onClose }) {
  const [tab, setTab] = useState('details');
  const detailTabs = ['details', 'transport', 'qc', 'finance', 'activity'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div>
          <span className="font-bold text-sm text-gray-800">{record.mrId}</span>
          <Badge label={record.stage.replace(/_/g,' ')} cls={`ml-2 ${stageBadge(record.stage)}`} />
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><MdClose size={18} /></button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-gray-100 bg-white text-xs">
        <div><span className="text-gray-400">Party</span><div className="font-semibold text-gray-800 mt-0.5 truncate">{record.supplierName}</div></div>
        <div><span className="text-gray-400">Invoice</span><div className="font-mono font-semibold text-gray-800 mt-0.5">{record.invoiceNo || '—'}</div></div>
        <div><span className="text-gray-400">Value</span><div className="font-bold text-red-600 mt-0.5">{fmt(record.value)}</div></div>
        <div><span className="text-gray-400">Product</span><div className="font-semibold text-gray-800 mt-0.5 truncate">{record.productName}</div></div>
        <div><span className="text-gray-400">Qty</span><div className="font-semibold text-gray-800 mt-0.5">{record.returnQty}</div></div>
        <div><span className="text-gray-400">Priority</span><div className="mt-0.5"><Badge label={record.priority} cls={prioBadge(record.priority)} /></div></div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {detailTabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-semibold capitalize whitespace-nowrap border-b-2 transition-colors ${tab===t?'border-red-600 text-red-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 text-xs">
        {tab === 'details' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Return Type', record.returnType],
                ['Docket ID', record.docketId || '—'],
                ['Approval Status', record.approvalStatus],
                ['QC Status', record.qcStatus],
                ['Created', fmtDate(record.createdAt)],
                ['Reason', record.reason || '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-400 mb-0.5">{k}</div>
                  <div className="font-semibold text-gray-800">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'transport' && (
          <div className="space-y-3">
            {[
              ['Docket / LR No', record.docketId || '—'],
              ['Transporter', record.transport || '—'],
              ['Vehicle No', record.vehicleNo || '—'],
              ['Pickup Date', fmtDate(record.pickupDate)],
              ['Expected Delivery', fmtDate(record.expectedDeliveryDate)],
              ['Current Location', record.currentLocation || '—'],
              ['Transit Status', record.stage.replace(/_/g,' ')],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">{k}</span>
                <span className="font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'qc' && (
          <div className="space-y-3">
            {[
              ['QC Status', record.qcStatus],
              ['QC Engineer', record.qcEngineer || '—'],
              ['Received Qty', record.receivedQty ?? '—'],
              ['Damaged Qty', record.damagedQtyReceived ?? '—'],
              ['Missing Qty', record.missingQtyReceived ?? '—'],
              ['QC Decision', record.qcDecision || '—'],
              ['QC Remarks', record.qcRemarks || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">{k}</span>
                <span className="font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'finance' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Return Value', fmt(record.value)],
                ['Refund Amount', fmt(record.refundAmount)],
                ['Credit Note', record.creditNoteNo || record.creditNoteId || '—'],
                ['Debit Note', record.debitNoteNo || record.debitNoteId || '—'],
                ['Ledger Status', record.ledgerStatus || '—'],
                ['Reconciliation', record.reconciliationStatus || '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-400 mb-0.5">{k}</div>
                  <div className="font-semibold text-gray-800">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'activity' && (
          <div className="space-y-2">
            {[
              { action: `Return ${record.mrId} created`, time: fmtDate(record.createdAt) },
              { action: `Stage: ${record.stage.replace(/_/g,' ')}`, time: 'Current' },
              { action: `Approval: ${record.approvalStatus}`, time: '—' },
              { action: `QC: ${record.qcStatus}`, time: '—' },
            ].map((e, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-gray-700">{e.action}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{e.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Approval Tab ─────────────────────────────────────────────────────────────
function ApprovalTab({ returns, onStageMove }) {
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState({});

  const pending = returns.filter(r =>
    r.approvalStatus === 'Pending' || r.stage === 'Manager_Approval' || r.stage === 'Return_Request_Create'
  ).filter(r => {
    const q = search.toLowerCase();
    return !q || r.mrId?.toLowerCase().includes(q) || r.supplierName?.toLowerCase().includes(q);
  });

  const handleApprove = (r) => onStageMove(r.mrId, 'Manager_Approval', 'Approved');
  const handleReject  = (r) => onStageMove(r.mrId, 'Rejected', 'Rejected');
  const handleAssignTransport = (r) => onStageMove(r.mrId, 'Docket_Create');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search pending approvals..." /></div>
        <div className="flex gap-2 text-xs">
          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold">{pending.length} Pending</span>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <EmptyState icon={MdCheckCircle} message="No pending approvals" />
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(r => (
            <div key={r.mrId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-bold text-red-600 text-sm">{r.mrId}</span>
                    <Badge label={r.returnType} cls="bg-blue-100 text-blue-700" />
                    <Badge label={r.priority} cls={prioBadge(r.priority)} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-gray-400">Party</span><div className="font-semibold text-gray-800 mt-0.5 truncate">{r.supplierName}</div></div>
                    <div><span className="text-gray-400">Invoice</span><div className="font-mono font-semibold text-gray-800 mt-0.5">{r.invoiceNo || '—'}</div></div>
                    <div><span className="text-gray-400">Product</span><div className="font-semibold text-gray-800 mt-0.5 truncate">{r.productName}</div></div>
                    <div><span className="text-gray-400">Return Value</span><div className="font-bold text-red-600 mt-0.5">{fmt(r.value)}</div></div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">Approval Notes</label>
                    <input type="text" placeholder="Add notes (optional)..."
                      value={notes[r.mrId] || ''}
                      onChange={e => setNotes(n => ({ ...n, [r.mrId]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-100" />
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => handleApprove(r)}
                    className="flex items-center gap-1.5 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                    <MdCheckCircle size={14} /> Approve
                  </button>
                  <button onClick={() => handleReject(r)}
                    className="flex items-center gap-1.5 px-5 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors border border-red-200">
                    <MdClose size={14} /> Reject
                  </button>
                  <button onClick={() => handleAssignTransport(r)} className="flex items-center gap-1.5 px-5 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg text-xs font-semibold transition-colors border border-sky-200">
                    <MdLocalShipping size={14} /> Assign Transport
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QC Tab ───────────────────────────────────────────────────────────────────
function QCTab({ returns, onStageMove }) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [qcForm, setQcForm] = useState({ receivedQty:0, damagedQty:0, missingQty:0, qcStatus:'Approved', qcRemarks:'', warehouseLocation:'' });

  const qcItems = returns.filter(r =>
    ['Warehouse_Receive','Received_At_Warehouse','QC_Verification','QC_In_Progress'].includes(r.stage)
  ).filter(r => {
    const q = search.toLowerCase();
    return !q || r.mrId?.toLowerCase().includes(q) || r.supplierName?.toLowerCase().includes(q);
  });

  const openQC = (r) => {
    setSelected(r);
    setQcForm({ receivedQty: r.returnQty || 0, damagedQty:0, missingQty:0, qcStatus:'Approved', qcRemarks:'', warehouseLocation:'' });
    setShowModal(true);
  };

  const handleQCSubmit = async () => {
    if (!selected) return;
    try {
      if (selected._id) {
        await materialReturnApi.processQC(selected._id, { ...qcForm, qcBy:'QC Team', qcDate: new Date().toISOString() });
      }
      onStageMove(selected.mrId, 'QC_Verification');
      toast('QC completed', 'success');
    } catch (e) { toast(e.message || 'QC update failed', 'error'); }
    setShowModal(false);
  };

  const QC_STATUSES = ['Approved', 'Rejected', 'Repairable', 'Scrap'];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search QC queue..." /></div>
        <span className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-semibold">{qcItems.length} In Queue</span>
      </div>

      {qcItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <EmptyState icon={MdVerifiedUser} message="No items pending QC" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['MR ID','Party','Product','Expected Qty','Stage','QC Status','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {qcItems.map(r => (
                  <tr key={r.mrId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-red-600 text-xs">{r.mrId}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">{r.supplierName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">{r.productName}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-center">{r.returnQty}</td>
                    <td className="px-4 py-3"><Badge label={r.stage.replace(/_/g,' ')} cls={stageBadge(r.stage)} /></td>
                    <td className="px-4 py-3"><Badge label={r.qcStatus} cls={qcBadge(r.qcStatus)} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => openQC(r)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-semibold transition-colors">
                        QC Check
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QC Modal */}
      {showModal && selected && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title={`QC Check — ${selected.mrId}`}>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs">
              <div className="font-semibold text-purple-800 mb-1">{selected.supplierName} — {selected.productName}</div>
              <div className="text-purple-600">Expected Qty: {selected.returnQty} | Return Value: {fmt(selected.value)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label:'Received Qty', key:'receivedQty', type:'number' },
                { label:'Damaged Qty',  key:'damagedQty',  type:'number' },
                { label:'Missing Qty',  key:'missingQty',  type:'number' },
                { label:'Warehouse Location', key:'warehouseLocation', type:'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
                  <input type={type} value={qcForm[key]}
                    onChange={e => setQcForm(f => ({ ...f, [key]: type==='number' ? parseInt(e.target.value)||0 : e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-100" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">QC Status</label>
                <select value={qcForm.qcStatus} onChange={e => setQcForm(f => ({ ...f, qcStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-100">
                  {QC_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">QC Remarks</label>
                <textarea rows={2} value={qcForm.qcRemarks} onChange={e => setQcForm(f => ({ ...f, qcRemarks: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-100"
                  placeholder="Add QC observations..." />
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleQCSubmit} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Complete QC</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main ReturnsPage ─────────────────────────────────────────────────────────
export default function ReturnsPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [returns, setReturns]     = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const res = await materialReturnApi.getAll();
      setReturns((res.data || []).map(normalizeReturn));
    } catch (e) {
      console.error('[Returns] loadReturns failed:', e.message);
      toast('Could not load returns from server', 'error');
      setReturns([]);
    } finally { setLoading(false); }
  };
  const loadInvoices = async () => {
    try {
      const res = await invoiceApi.getAll({ limit: 0 }); // 0 = fetch all
      setInvoices(res.data || []);
    } catch (e) {
      console.error('[Returns] loadInvoices failed:', e.message);
      toast('Could not load invoices — type invoice number manually', 'error');
      setInvoices([]);
    }
  };

  useEffect(() => { loadReturns(); loadInvoices(); }, []);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const payload = {
        invoiceNo: form.invoiceNo, supplierName: form.supplierName,
        productName: form.productName, productSku: form.productSku, skuCode: form.productSku,
        returnQty: Number(form.returnQty) || 1, expectedQty: Number(form.returnQty) || 1,
        value: Number(form.returnValue) || 0, priority: form.priority,
        reason: form.reason, returnType: form.returnType,
        returnStatus: 'Pending', approvalStatus: 'Pending', qcStatus: 'Pending',
        ledgerStatus: 'Pending', reconciliationStatus: 'Pending',
        stage: 'Return_Request_Create', currentWorkflowStage: 'Return_Request_Create',
      };
      const res = await materialReturnApi.create(payload);
      const created = normalizeReturn(res.data);
      setReturns(prev => [created, ...prev]);
      toast(`Return ${created.mrId} created`, 'success');
      dataEvents.emit('return:changed');
      setShowCreate(false);
    } catch (e) {
      toast(e.message || 'Create failed', 'error');
      throw e;
    } finally { setSaving(false); }
  };

  const handleStageMove = async (mrId, newStage, approvalStatus) => {
    const record = returns.find(r => r.mrId === mrId);
    if (record?._id) {
      try {
        const res = await materialReturnApi.updateStage(record._id, newStage, approvalStatus);
        const updated = normalizeReturn(res.data);
        setReturns(prev => prev.map(r => r.mrId === mrId ? updated : r));
        toast(`Stage updated to ${newStage.replace(/_/g,' ')}`, 'success');
        dataEvents.emit('return:changed');
        return;
      } catch (e) { toast(e.message || 'Stage update failed', 'error'); return; }
    }
    setReturns(prev => prev.map(r => r.mrId === mrId ? { ...r, stage: newStage, approvalStatus: approvalStatus || r.approvalStatus } : r));
    toast(`Stage updated to ${newStage.replace(/_/g,' ')}`, 'success');
    dataEvents.emit('return:changed');
  };

  const handleDelete = async (mrId) => {
    const record = returns.find(r => r.mrId === mrId);
    try {
      if (record?._id) await materialReturnApi.delete(record._id);
      setReturns(prev => prev.filter(r => r.mrId !== mrId));
      toast('Return deleted', 'success');
      dataEvents.emit('return:changed');
    } catch (e) { toast(e.message || 'Delete failed', 'error'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {activeTab === 0 && <DashboardTab returns={returns} loading={loading} />}
      {activeTab === 1 && <ReturnRequestsTab returns={returns} loading={loading} onAdd={() => setShowCreate(true)} onDelete={handleDelete} onRefresh={loadReturns} />}
      {activeTab === 2 && <ApprovalTab returns={returns} onStageMove={handleStageMove} />}
      {activeTab === 3 && <DocketTrackingPage />}
      {activeTab === 4 && <WarehouseReceivePage />}
      {activeTab === 5 && <QCTab returns={returns} onStageMove={handleStageMove} />}
      {activeTab === 6 && <DebitCreditMatchingPage />}
      {activeTab === 7 && <MaterialReturnsPage />}
      {activeTab === 8 && <ProfessionalLossTrackingPage />}

      <CreateReturnModal
        open={showCreate} onClose={() => setShowCreate(false)}
        onCreate={handleCreate} invoices={invoices} saving={saving}
      />
    </div>
  );
}
