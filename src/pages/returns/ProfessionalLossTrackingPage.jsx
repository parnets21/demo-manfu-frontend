import React, { useEffect, useState } from 'react';
import {
  MdTrendingDown as TrendingDown,
  MdClose as X,
  MdAssignment as ClipboardList,
  MdInventory2 as Package,
  MdPerson as User,
  MdDescription as FileText,
  MdWarning as AlertTriangle,
  MdCheckCircle as CheckCircle,
  MdAccessTime as Clock,
  MdAdd as Plus,
  MdDelete as Trash2,
  MdVisibility as Eye,
  MdCurrencyRupee as IndianRupee,
  MdSecurity as ShieldAlert,
  MdShowChart as Activity,
  MdHourglassEmpty as Loader2,
} from 'react-icons/md';
import { lossTrackingApi } from '../../api/lossTrackingApi';
import { materialReturnApi } from '../../api/materialReturnApi';

// ─── Inline Modal ──────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null;
  const widths = { sm: 480, md: 600, lg: 760, xl: 960 };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: widths[size], maxHeight: '92vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, type = 'info') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };
  return { toasts, show };
}

// ─── Pill ──────────────────────────────────────────────────────────────────────
const PILL = {
  'Transit Damage': 'bg-orange-100 text-orange-700',
  'QC Rejected': 'bg-red-100 text-red-700',
  'Courier Lost': 'bg-purple-100 text-purple-700',
  Theft: 'bg-gray-200 text-gray-700',
  High: 'bg-red-500 text-white',
  Critical: 'bg-red-700 text-white',
  Medium: 'bg-yellow-400 text-white',
  Low: 'bg-green-500 text-white',
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Closed: 'bg-green-100 text-green-700',
  'Pending Finance': 'bg-purple-100 text-purple-700',
  'Full Recovery': 'bg-green-100 text-green-700',
  'Partial Recovery': 'bg-yellow-100 text-yellow-700',
  'No Recovery': 'bg-red-100 text-red-700',
  Synced: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-gray-100 text-gray-600',
};
function Pill({ label }) {
  const cls = PILL[label] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

// ─── Shared field styles ───────────────────────────────────────────────────────
const inp =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400';
const lbl = 'text-xs font-semibold text-gray-600 mb-1 block';
const fld = 'flex flex-col';

// ─── Seed data removed — all records load from the API via loadRecords() ──────


// ─── Compute aging ─────────────────────────────────────────────────────────────
function daysAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now - d) / 86400000));
}

const normalizeLossRecord = (r) => {
  const productName = r.productName || r.items?.[0]?.productName || r.products?.[0]?.productName || 'Return Material';
  const qty = Number(r.damagedQty || r.rejectedQty || r.returnQty || r.items?.[0]?.returnQty || r.products?.[0]?.damagedQty || 1);
  const amount = Number(r.lossAmount || r.value || r.refundAmount || r.items?.[0]?.total || 0);
  const unitRate = qty ? Math.round(amount / qty) : amount;
  return {
    _id: r._id || r.id || r.lossId || r.mrId,
    lossId: r.lossId || `LOSS-${new Date().getFullYear()}-${String(r.mrId || r._id || '').slice(-4)}`,
    mrId: r.mrId || '',
    party: r.party || r.supplierName || r.customerName || 'Unknown Party',
    invoiceNumber: r.invoiceNumber || r.invoiceNo || '',
    lossType: r.lossType || (r.qcStatus === 'Failed' ? 'QC Rejected' : 'Transit Damage'),
    rootCause: r.rootCause || r.returnReason || r.reason || 'Return validation pending',
    products: r.products?.length ? r.products : [{ productName, skuCode: r.productSku || r.skuCode || '-', batchNo: r.batchNo || '-', damagedQty: qty, unitRate }],
    lossAmount: amount,
    recoverableAmount: Number(r.recoverableAmount || r.recoveredAmt || Math.round(amount * 0.8)),
    recoveryStatus: r.recoveryStatus || (r.finStatus === 'Reconciled' || r.reconciliationStatus === 'Closed' ? 'Full Recovery' : 'Partial Recovery'),
    priority: r.priority || 'Medium',
    responsibleDepartment: r.responsibleDepartment || (r.qcStatus === 'Failed' ? 'Quality' : 'Logistics'),
    assignedTo: r.assignedTo || 'Returns Team',
    createdDate: (r.createdDate || r.createdAt || r.returnDate || new Date().toISOString()).slice(0, 10),
    status: r.status || (r.stage === 'Closed' ? 'Closed' : 'In Progress'),
    tallyStatus: r.tallyStatus || r.tallySync || 'Pending',
    resolutionNotes: r.resolutionNotes || r.remarks || '',
    correctiveAction: r.correctiveAction || '',
    preventiveAction: r.preventiveAction || '',
  };
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LossTrackingPage({ linkedReturns = [] }) {
  const [records, setRecords] = useState([]);
  const [allReturns, setAllReturns] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ status: '', priority: '', lossType: '' });
  const { toasts, show: toast } = useToast();

  const generateLossId = () => `LOSS-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

  const blankForm = {
    lossId: generateLossId(),
    mrId: '',
    party: '',
    invoiceNumber: '',
    lossType: 'Transit Damage',
    rootCause: 'Supplier Packing Issue',
    responsibleDepartment: 'Procurement',
    assignedTo: '',
    priority: 'Medium',
    recoveryStatus: 'Partial Recovery',
    tallyStatus: 'Pending',
    status: 'Open',
    resolutionNotes: '',
    correctiveAction: '',
    preventiveAction: '',
    products: [{ productName: '', skuCode: '', batchNo: '', damagedQty: 0, unitRate: 0 }],
  };
  const [form, setForm] = useState(blankForm);

  const loadRecords = async () => {
    try {
      const [lossRes, returnRes] = await Promise.all([
        lossTrackingApi.getAll().catch(() => ({ data: [] })),
        materialReturnApi.getAll().catch(() => ({ data: [] })),
      ]);
      const lossRows = (lossRes.data || []).map(normalizeLossRecord);
      
      // Fetch all returns from the same API as /returns/requests to ensure consistency
      const returns = returnRes.data || [];
      
      setAllReturns(returns);

      // Only show loss records from the backend
      setRecords(lossRows);
    } catch (err) {
      console.error("Load records error", err);
      setRecords([]);
    }
  };

  const handleMrSelect = async (mrId) => {
    if (!mrId) {
      setForm(prev => ({ 
        ...prev, 
        mrId: '', 
        party: '', 
        invoiceNumber: '', 
        products: [{ productName: '', skuCode: '', batchNo: '', damagedQty: 0, unitRate: 0 }] 
      }));
      return;
    }

    // Check local state first, then fetch full details to ensure all fields like productName are present
    let ret = allReturns.find(r => r.mrId === mrId || r._id === mrId);
    
    try {
      const res = await materialReturnApi.getById(ret?._id || mrId);
      if (res.success) ret = res.data;
    } catch (e) {
      console.error("Failed to fetch full MR details", e);
    }

    if (ret) {
      const productName = ret.productName || ret.productSku || '—';
      const skuCode = ret.productSku || ret.skuCode || '—';
      // Use QC rejected quantity if available, else return quantity
      const qty = Number(ret.qcRejectedQty || ret.rejectedQty || ret.returnQty || 0);
      const rate = Number(ret.unitPrice || (ret.value / (ret.returnQty || 1)) || 0);

      setForm(prev => ({
        ...prev,
        mrId: ret.mrId || mrId,
        party: ret.supplierName || ret.customerName || '',
        invoiceNumber: ret.invoiceNo || '',
        products: [{
          productName,
          skuCode,
          batchNo: ret.batchNo || '-',
          damagedQty: qty,
          unitRate: rate
        }],
        lossAmount: ret.value || (qty * rate),
        rootCause: ret.qcFinalRemarks || ret.returnReason || ret.reason || prev.rootCause,
        responsibleDepartment: ret.qcStatus === 'Failed' ? 'Quality' : 'Logistics',
        priority: ret.priority || 'Medium'
      }));
      toast(`Auto-filled all details from Return Request: ${ret.mrId || mrId}`, 'success');
    }
  };

  useEffect(() => { loadRecords(); }, [linkedReturns]);

  const updProd = (i, k, v) =>
    setForm((p) => ({ ...p, products: p.products.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addProd = () =>
    setForm((p) => ({
      ...p,
      products: [...p.products, { productName: '', skuCode: '', batchNo: '', damagedQty: 0, unitRate: 0 }],
    }));
  const remProd = (i) =>
    form.products.length > 1 && setForm((p) => ({ ...p, products: p.products.filter((_, j) => j !== i) }));

  const totalLoss = records.reduce((s, r) => s + r.lossAmount, 0);
  const totalRec = records.reduce((s, r) => s + r.recoverableAmount, 0);
  const criticalCount = records.filter((r) => r.priority === 'Critical').length;
  const openCount = records.filter((r) => r.status === 'Open' || r.status === 'In Progress').length;

  const rows = records.filter(
    (r) =>
      (!filter.status || r.status === filter.status) &&
      (!filter.priority || r.priority === filter.priority) &&
      (!filter.lossType || r.lossType === filter.lossType)
  );

  const handleCreate = async () => {
    if (!form.mrId.trim() || !form.assignedTo.trim()) {
      toast('MR ID and Assigned To are required', 'error');
      return;
    }
    setSaving(true);
    const lossAmount = form.products.reduce((s, p) => s + p.damagedQty * p.unitRate, 0);
    const recAmt =
      form.recoveryStatus === 'Full Recovery'
        ? lossAmount
        : form.recoveryStatus === 'Partial Recovery'
        ? Math.round(lossAmount * 0.6)
        : 0;
    
    const payload = {
      ...form,
      lossAmount,
      recoverableAmount: recAmt,
      createdDate: new Date().toISOString()
    };

    try {
      const response = await lossTrackingApi.create(payload);
      if (response.success) {
        toast('Loss record created successfully!', 'success');
        setShowCreate(false);
        setForm({ ...blankForm, lossId: generateLossId() });
        loadRecords(); // Reload from backend
      }
    } catch (err) {
      toast(err.message || 'Failed to create loss record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await lossTrackingApi.delete(id);
      if (res.success) {
        toast('Record deleted', 'info');
        loadRecords();
      }
    } catch (err) {
      toast('Failed to delete record', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">

      {/* ── Toasts ── */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg text-white transition-all
            ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <TrendingDown size={26} className="text-red-600" />
            Loss Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Comprehensive ERP-level loss management — all columns auto-populated from source modules
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ ...blankForm, lossId: generateLossId() });
            setShowCreate(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow transition-all"
        >
          <Plus size={16} />
          Create Loss Record
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total Loss Amount',
            value: `₹${totalLoss.toLocaleString('en-IN')}`,
            color: '#dc2626',
            bg: '#fef2f2',
            icon: <IndianRupee size={20} color="#dc2626" />,
          },
          {
            label: 'Total Recoverable',
            value: `₹${totalRec.toLocaleString('en-IN')}`,
            color: '#059669',
            bg: '#f0fdf4',
            icon: <CheckCircle size={20} color="#059669" />,
          },
          {
            label: 'Open / In-Progress',
            value: openCount,
            color: '#2563eb',
            bg: '#eff6ff',
            icon: <Activity size={20} color="#2563eb" />,
          },
          {
            label: 'Critical Cases',
            value: criticalCount,
            color: '#b91c1c',
            bg: '#fff1f2',
            icon: <ShieldAlert size={20} color="#b91c1c" />,
          },
        ].map((k, i) => (
          <div
            key={i}
            className="rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all"
            style={{ background: k.bg, borderColor: k.color + '22' }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-2xl font-black" style={{ color: k.color }}>
                {k.value}
              </div>
              {k.icon}
            </div>
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-red-400"
          value={filter.status}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
        >
          <option value="">All Status</option>
          {['Open', 'In Progress', 'Closed', 'Pending Finance'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-red-400"
          value={filter.priority}
          onChange={(e) => setFilter((p) => ({ ...p, priority: e.target.value }))}
        >
          <option value="">All Priority</option>
          {['Low', 'Medium', 'High', 'Critical'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-red-400"
          value={filter.lossType}
          onChange={(e) => setFilter((p) => ({ ...p, lossType: e.target.value }))}
        >
          <option value="">All Loss Types</option>
          {['Transit Damage', 'QC Rejected', 'Courier Lost', 'Theft'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <span className="font-bold text-gray-800 text-sm">Loss Records ({rows.length})</span>
          <span className="text-xs text-gray-400">All columns auto-populated from source modules</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  'Loss ID',
                  'MR ID',
                  'Party',
                  'Loss Type',
                  'Root Cause',
                  'Qty Loss',
                  'Loss Amount',
                  'Recoverable',
                  'Recovery Status',
                  'Dept',
                  'Assigned To',
                  'Aging',
                  'Status',
                  'Tally',
                  'Actions',
                ].map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left whitespace-nowrap">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">{col}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={15} className="text-center py-10 text-gray-400 text-sm">
                    No records found
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const totalQty = r.products?.reduce((s, p) => s + (p.damagedQty || 0), 0) ?? 0;
                const aging = daysAgo(r.createdDate);
                return (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold whitespace-nowrap">
                      {r.lossId}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{r.mrId}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate" title={r.party}>
                      {r.party}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Pill label={r.lossType} />
                    </td>
                    <td
                      className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate"
                      title={r.rootCause}
                    >
                      {r.rootCause}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {totalQty.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-bold text-red-600 whitespace-nowrap">
                      ₹{r.lossAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600 whitespace-nowrap">
                      ₹{r.recoverableAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Pill label={r.recoveryStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {r.responsibleDepartment}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.assignedTo}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`font-semibold text-xs flex items-center gap-1 ${
                          aging > 14 ? 'text-red-600' : aging > 7 ? 'text-yellow-600' : 'text-green-600'
                        }`}
                      >
                        <Clock size={11} />
                        {aging}d
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Pill label={r.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Pill label={r.tallyStatus} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelected(r);
                            setShowDetails(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 text-xs font-semibold px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <Eye size={12} />
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="text-red-400 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          CREATE MODAL
      ═══════════════════════════════════════════════ */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Professional Loss Record"
        size="xl"
      >
        <div className="space-y-5">

          {/* Section 1: Basic Info */}
          <Section title="Basic Information" icon={<ClipboardList size={15} />} color="blue">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Loss ID *" source="">
                <input
                  className={inp}
                  value={form.lossId}
                  onChange={(e) => setForm((p) => ({ ...p, lossId: e.target.value }))}
                  placeholder="LOSS-2026-XXXX"
                />
              </FormField>
              <FormField label="MR ID *" source="">
                <select
                  className={inp}
                  value={form.mrId}
                  onChange={(e) => handleMrSelect(e.target.value)}
                >
                  <option value="">— Select MR ID —</option>
                  {allReturns.map(r => (
                    <option key={r._id} value={r._id || r.mrId}>{r.mrId} — {r.customerName || r.supplierName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label=" Supplier" source="">
                <input
                  className={inp}
                  value={form.party}
                  onChange={(e) => setForm((p) => ({ ...p, party: e.target.value }))}
                  placeholder="Supplier name"
                />
              </FormField>
              <FormField label="Invoice Number" source="">
                <input
                  className={inp}
                  value={form.invoiceNumber}
                  onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                  placeholder="INV-2026-XXXX"
                />
              </FormField>
              <FormField label="Loss Type" source="">
                <select
                  className={inp}
                  value={form.lossType}
                  onChange={(e) => setForm((p) => ({ ...p, lossType: e.target.value }))}
                >
                  {['Transit Damage', 'QC Rejected', 'Courier Lost', 'Theft', 'Material Shortage', 'Documentation Error'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Root Cause" source="">
                <select
                  className={inp}
                  value={form.rootCause}
                  onChange={(e) => setForm((p) => ({ ...p, rootCause: e.target.value }))}
                >
                  {[
                    'Supplier Packing Issue',
                    'Substandard Material',
                    'Transport Mishandling',
                    'Documentation Error',
                    'Theft in Transit',
                    'Weight Mismatch',
                    'Invoice Mismatch'
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </Section>

          {/* Section 2: Products */}
          <Section
            title="Product Details"
            icon={<Package size={15} />}
            color="green"
            subtitle="Loss Amount = Damaged Qty × Unit Rate (auto-calculated)"
          >
            {form.products.map((prod, i) => (
              <div
                key={i}
                className="relative grid grid-cols-5 gap-3 mb-3 p-3 border border-gray-200 rounded-xl bg-white"
              >
                <div className={fld}>
                  <label className={lbl}>Product Name</label>
                  <input
                    className={inp}
                    value={prod.productName}
                    onChange={(e) => updProd(i, 'productName', e.target.value)}
                    placeholder="Product"
                  />
                </div>
                <div className={fld}>
                  <label className={lbl}>SKU Code</label>
                  <input
                    className={inp}
                    value={prod.skuCode}
                    onChange={(e) => updProd(i, 'skuCode', e.target.value)}
                    placeholder="SKU-XXX"
                  />
                </div>
                <div className={fld}>
                  <label className={lbl}>Batch No</label>
                  <input
                    className={inp}
                    value={prod.batchNo}
                    onChange={(e) => updProd(i, 'batchNo', e.target.value)}
                    placeholder="B-XXX"
                  />
                </div>
                <div className={fld}>
                  <label className={lbl}>Damaged Qty</label>
                  <input
                    type="number"
                    min="0"
                    className={inp}
                    value={prod.damagedQty}
                    onChange={(e) => updProd(i, 'damagedQty', Number(e.target.value))}
                  />
                </div>
                <div className={fld}>
                  <label className={lbl}>Unit Rate (₹)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      className={inp}
                      value={prod.unitRate}
                      onChange={(e) => updProd(i, 'unitRate', Number(e.target.value))}
                    />
                    {form.products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remProd(i)}
                        className="text-red-400 hover:text-red-600 px-2 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-span-5 text-right text-xs text-gray-500 font-semibold pr-1">
                  Line Total:{' '}
                  <span className="text-red-600">
                    ₹{(prod.damagedQty * prod.unitRate).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addProd}
              className="text-green-600 text-sm font-semibold flex items-center gap-1 mt-1 hover:text-green-700 transition-colors"
            >
              <Plus size={14} />
              Add Product
            </button>
            <div className="mt-3 text-sm font-bold text-gray-700">
              Grand Total Loss:{' '}
              <span className="text-red-600">
                ₹{form.products.reduce((s, p) => s + p.damagedQty * p.unitRate, 0).toLocaleString('en-IN')}
              </span>
            </div>
          </Section>

          {/* Section 3: Assignment & Status */}
          <Section title="Assignment" icon={<User size={15} />} color="purple">
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Responsible Dept" source="System Logic">
                <select
                  className={inp}
                  value={form.responsibleDepartment}
                  onChange={(e) => setForm((p) => ({ ...p, responsibleDepartment: e.target.value }))}
                >
                  {['Procurement', 'Quality', 'Warehouse', 'Logistics', 'Finance'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Assigned To *" source="Task Module">
                <select
                  className={inp}
                  value={form.assignedTo}
                  onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}
                >
                  <option value="">— Select Person —</option>
                  {[
                    'Ramesh Gupta (Purchase)',
                    'Priya Sharma (Management)',
                    'Sunil Das (Production)',
                    'Amit Kumar (Logistics)',
                    'Suresh Singh (Quality)',
                    'Kiran Sharma (Accounts)',
                    'Self (Returns Team)'
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Priority" source="Workflow Engine">
                <select
                  className={inp}
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  {['Low', 'Medium', 'High', 'Critical'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Recovery Status" source="Recovery Workflow">
                <select
                  className={inp}
                  value={form.recoveryStatus}
                  onChange={(e) => setForm((p) => ({ ...p, recoveryStatus: e.target.value }))}
                >
                  {['Full Recovery', 'Partial Recovery', 'No Recovery'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status" source="Workflow Engine">
                <select
                  className={inp}
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  {['Open', 'In Progress', 'Pending Finance', 'Closed'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tally Status" source="Tally Integration">
                <select
                  className={inp}
                  value={form.tallyStatus}
                  onChange={(e) => setForm((p) => ({ ...p, tallyStatus: e.target.value }))}
                >
                  {['Pending', 'Synced'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </Section>

          {/* Section 4: Resolution */}
          <Section title="Resolution Notes" icon={<FileText size={15} />} color="orange">
            <div className="grid grid-cols-1 gap-4">
              <div className={fld}>
                <label className={lbl}>Resolution Notes</label>
                <textarea
                  rows={2}
                  className={inp}
                  value={form.resolutionNotes}
                  onChange={(e) => setForm((p) => ({ ...p, resolutionNotes: e.target.value }))}
                  placeholder="Steps taken to resolve..."
                />
              </div>
              <div className={fld}>
                <label className={lbl}>Corrective Action</label>
                <textarea
                  rows={2}
                  className={inp}
                  value={form.correctiveAction}
                  onChange={(e) => setForm((p) => ({ ...p, correctiveAction: e.target.value }))}
                  placeholder="Immediate corrective action..."
                />
              </div>
              <div className={fld}>
                <label className={lbl}>Preventive Action</label>
                <textarea
                  rows={2}
                  className={inp}
                  value={form.preventiveAction}
                  onChange={(e) => setForm((p) => ({ ...p, preventiveAction: e.target.value }))}
                  placeholder="Future prevention steps..."
                />
              </div>
            </div>
          </Section>

          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Create Loss Record
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════
          DETAILS MODAL
      ═══════════════════════════════════════════════ */}
      <Modal
        open={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Loss Record: ${selected?.lossId}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Loss ID', selected.lossId, ''],
                ['MR ID', selected.mrId, 'Return Module'],
                ['Party', selected.party, 'Invoice / Vendor'],
                ['Invoice No', selected.invoiceNumber, 'Purchase Module'],
                ['Loss Type', selected.lossType, 'QC / Transport'],
                ['Root Cause', selected.rootCause, 'QC Inspection'],
                ['Loss Amount', `₹${selected.lossAmount?.toLocaleString('en-IN')}`, 'Item Rate × Qty'],
                ['Recoverable', `₹${selected.recoverableAmount?.toLocaleString('en-IN')}`, 'Finance Recovery'],
                ['Recovery Status', selected.recoveryStatus, 'Recovery Workflow'],
                ['Dept', selected.responsibleDepartment, 'System Logic'],
                ['Assigned To', selected.assignedTo, 'Task Module'],
                [`Aging`, `${daysAgo(selected.createdDate)} days`, 'Date Calculation'],
                ['Status', selected.status, 'Workflow Engine'],
                ['Tally', selected.tallyStatus, 'Tally Integration'],
              ].map(([k, v, src]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">{k}</div>
                  {src && <div className="text-[9px] text-blue-400 mb-1">Source: {src}</div>}
                  <div className="font-semibold text-gray-800">{v || '—'}</div>
                </div>
              ))}
            </div>

            {/* Products */}
            <div>
              <div className="font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Package size={14} className="text-gray-500" />
                Products
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {['Product', 'SKU', 'Batch', 'Qty', 'Rate', 'Total'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-gray-600 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.products?.map((p, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2">{p.productName}</td>
                      <td className="px-3 py-2 font-mono">{p.skuCode}</td>
                      <td className="px-3 py-2">{p.batchNo}</td>
                      <td className="px-3 py-2 font-bold">{p.damagedQty}</td>
                      <td className="px-3 py-2">₹{p.unitRate?.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 font-bold text-red-600">
                        ₹{(p.damagedQty * p.unitRate).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected.resolutionNotes && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                  <FileText size={12} />
                  Resolution Notes
                </div>
                <p className="text-xs text-gray-700">{selected.resolutionNotes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon, color, subtitle, children }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  };
  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || 'bg-gray-50 border-gray-100'}`}>
      <div className={`font-bold text-gray-800 mb-0.5 text-sm flex items-center gap-1.5 ${iconColors[color]}`}>
        {icon}
        <span className="text-gray-800">{title}</span>
      </div>
      {subtitle && <div className="text-xs text-gray-500 mb-3">{subtitle}</div>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

// ─── FormField with source badge ───────────────────────────────────────────────
function FormField({ label, source, children }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        {source && (
          <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
            {source}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Readonly field ────────────────────────────────────────────────────────────
function ReadonlyField({ label, value, source }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        {source && (
          <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">
            {source}
          </span>
        )}
      </div>
      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 font-mono">
        {value}
      </div>
    </div>
  );
}
