import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { creditNoteApi } from '../../api/creditNoteApi';
import { vendorApi } from '../../api/vendorApi';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import { toast } from '../../components/common/Toast';
import {
  MdAdd, MdDelete, MdArrowBack, MdCheckCircle, MdReceipt,
  MdSearch, MdClose, MdVisibility,
} from 'react-icons/md';
import Pagination from '../../components/common/Pagination';

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

// backend vendor field is companyName
const vName = (v) => v?.companyName || v?.name || '';

const REASON_OPTIONS = [
  'Quality Rejection', 'Damage in Transit', 'Wrong Item Delivered',
  'Quantity Shortage', 'Expired / Near-Expiry Product', 'Pricing Discrepancy',
  'Duplicate Invoice', 'Order Cancellation', 'Other',
];

const emptyItem = () => ({ productName: '', quantity: 1, rate: 0, amount: 0, gstRate: 18 });

function calcTotals(items) {
  const creditAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const gstAmount    = items.reduce((s, i) => s + (Number(i.amount) || 0) * (Number(i.gstRate) || 0) / 100, 0);
  return { creditAmount, gstAmount, totalAmount: creditAmount + gstAmount };
}

function buildEmptyForm(invoiceState) {
  if (!invoiceState) return {
    vendorId: '', customerName: '', customerEmail: '', customerGST: '',
    customerAddress: '', customerPhone: '',
    invoiceNo: '', returnId: '', reason: '',
    items: [emptyItem()], creditAmount: 0, gstAmount: 0, totalAmount: 0,
  };
  const inv = invoiceState;
  const items = (inv.items || []).map(it => {
    const qty     = Number(it.invoicedQty) || 1;
    const rate    = Number(it.basePrice)   || 0;
    const gstRate = Number(it.cgst || 0) + Number(it.sgst || 0) || 18;
    return { productName: it.itemName || it.productName || '', quantity: qty, rate, amount: qty * rate, gstRate };
  });
  const totals = calcTotals(items.length ? items : [emptyItem()]);
  return {
    vendorId: '', customerName: inv.vendorName || '',
    customerEmail: inv.vendorEmail || '', customerGST: inv.vendorGST || '',
    customerAddress: inv.vendorAddress || '', customerPhone: inv.vendorPhone || '',
    invoiceNo: inv.invoiceNo || '', returnId: '', reason: '',
    items: items.length ? items : [emptyItem()], ...totals,
  };
}

// ─── Shared input styles ──────────────────────────────────────────────────────
const inp = (err) => ({
  width: '100%', padding: '9px 13px',
  border: `1.5px solid ${err ? '#dc2626' : '#d1d5db'}`,
  borderRadius: 9, fontSize: 13, fontFamily: 'inherit',
  boxSizing: 'border-box', color: '#1e293b', background: '#fff', outline: 'none',
});
const sel = () => ({
  width: '100%', padding: '9px 13px', border: '1.5px solid #d1d5db',
  borderRadius: 9, fontSize: 13, fontFamily: 'inherit',
  boxSizing: 'border-box', color: '#1e293b', background: '#fff',
  outline: 'none', cursor: 'pointer',
});

function Field({ label, required, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3 }}>{error}</div>}
    </div>
  );
}

// ─── Vendor searchable dropdown ───────────────────────────────────────────────
function VendorSelect({ value, onChange, vendors, loading }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const selected = vendors.find(v => v._id === value);
  const filtered = vendors.filter(v =>
    !query || vName(v).toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest('[data-vendor-select]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} data-vendor-select>
      <div onClick={() => setOpen(o => !o)}
        style={{ ...inp(false), display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ color: selected ? '#1e293b' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {loading ? 'Loading vendors…' : selected ? vName(selected) : 'Select vendor'}
        </span>
        <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6, flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 10, boxShadow: '0 10px 32px rgba(0,0,0,0.14)', marginTop: 4, overflow: 'hidden' }}>
          <div style={{ padding: '7px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 7, background: '#fafafa' }}>
            <MdSearch size={14} color="#9ca3af" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vendor…"
              style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1, color: '#1e293b', background: 'transparent' }} />
            {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}><MdClose size={13} /></button>}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 13 }}>No vendors found</div>
              : filtered.map(v => (
                <div key={v._id} onClick={() => { onChange(v); setOpen(false); setQuery(''); }}
                  style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: '#1e293b',
                    background: v._id === value ? '#eff6ff' : 'transparent',
                    borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = v._id === value ? '#eff6ff' : 'transparent'}>
                  <div style={{ fontWeight: 600 }}>{vName(v)}</div>
                  {v.email && <div style={{ fontSize: 11, color: '#6b7280' }}>{v.email}</div>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invoice searchable dropdown ──────────────────────────────────────────────
function InvoiceSelect({ value, onChange, onManualChange, invoices, loading }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const selected = invoices.find(inv => inv.invoiceNo === value);
  const filtered = invoices.filter(inv =>
    !query
      || (inv.invoiceNo  || '').toLowerCase().includes(query.toLowerCase())
      || (inv.vendorName || '').toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest('[data-invoice-select]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} data-invoice-select>
      <div onClick={() => setOpen(o => !o)}
        style={{ ...inp(false), display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ color: selected || value ? '#1e293b' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {loading ? '⏳ Loading invoices…' : selected ? selected.invoiceNo : value || 'Select or type invoice no.'}
        </span>
        <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6, flexShrink: 0 }}>
          {!loading && invoices.length > 0 ? `▾ (${invoices.length})` : '▾'}
        </span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 10, boxShadow: '0 10px 32px rgba(0,0,0,0.16)', marginTop: 4, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 7, background: '#fafafa' }}>
            <MdSearch size={14} color="#9ca3af" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoice number…"
              style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1, color: '#1e293b', background: 'transparent' }} />
            {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}><MdClose size={13} /></button>}
          </div>
          {/* Manual entry option */}
          {query && !filtered.find(inv => inv.invoiceNo.toLowerCase() === query.toLowerCase()) && (
            <div onClick={() => { onManualChange(query); setOpen(false); setQuery(''); }}
              style={{ padding: '9px 14px', fontSize: 12, cursor: 'pointer', color: '#2563eb', background: '#eff6ff', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #e2e8f0' }}>
              <MdAdd size={13} /> Use "<strong>{query}</strong>" as invoice number
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '14px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Loading invoices…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '14px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                {invoices.length === 0 ? 'No invoices found in system' : 'No invoices match'}
              </div>
            ) : (
              filtered.map(inv => (
                <div key={inv._id || inv.invoiceNo}
                  onClick={() => { onChange(inv); setOpen(false); setQuery(''); }}
                  style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                    background: inv.invoiceNo === value ? '#eff6ff' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = inv.invoiceNo === value ? '#eff6ff' : 'transparent'}>
                  <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 13 }}>{inv.invoiceNo}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                    {inv.vendorName && <span style={{ fontSize: 11, color: '#6b7280' }}>🏢 {inv.vendorName}</span>}
                    {inv.grandTotal > 0 && <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>{fmt(inv.grandTotal)}</span>}
                    {inv.status && <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>{inv.status}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Items Table ──────────────────────────────────────────────────────────────
function ItemsTable({ items, onChange }) {
  const update = (idx, field, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: field === 'productName' ? val : Number(val) || 0 };
    if (field === 'quantity' || field === 'rate')
      next[idx].amount = (next[idx].quantity || 0) * (next[idx].rate || 0);
    onChange(next);
  };
  const add    = ()    => onChange([...items, emptyItem()]);
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const t      = calcTotals(items);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Items / Products</span>
        <button type="button" onClick={add}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <MdAdd size={14} /> Add Item
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['#', 'Product Name', 'Qty', 'Rate (₹)', 'GST %', 'Amount (₹)', ''].map((h, i) => (
                <th key={i} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '9px 12px', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</td>
                <td style={{ padding: '7px 12px' }}>
                  <input type="text" value={item.productName} onChange={e => update(idx, 'productName', e.target.value)}
                    placeholder="Product name" style={{ ...inp(), minWidth: 160, padding: '6px 10px' }} />
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <input type="number" value={item.quantity} min={0} onChange={e => update(idx, 'quantity', e.target.value)}
                    style={{ ...inp(), width: 70, padding: '6px 10px' }} />
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <input type="number" value={item.rate} min={0} step="0.01" onChange={e => update(idx, 'rate', e.target.value)}
                    style={{ ...inp(), width: 90, padding: '6px 10px' }} />
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <input type="number" value={item.gstRate} min={0} max={28} onChange={e => update(idx, 'gstRate', e.target.value)}
                    style={{ ...inp(), width: 60, padding: '6px 10px' }} />
                </td>
                <td style={{ padding: '9px 12px', fontWeight: 700, color: '#2563eb', fontSize: 13 }}>{fmt(item.amount)}</td>
                <td style={{ padding: '7px 12px' }}>
                  {items.length > 1 && (
                    <button type="button" onClick={() => remove(idx)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                      <MdDelete size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td colSpan={5} style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#475569' }}>Subtotal</td>
              <td style={{ padding: '9px 12px', fontWeight: 800, color: '#1e293b' }}>{fmt(t.creditAmount)}</td><td />
            </tr>
            <tr style={{ background: '#f8fafc' }}>
              <td colSpan={5} style={{ padding: '6px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#475569' }}>GST Amount</td>
              <td style={{ padding: '6px 12px', fontWeight: 700, color: '#1d4ed8' }}>{fmt(t.gstAmount)}</td><td />
            </tr>
            <tr style={{ background: '#eff6ff' }}>
              <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#2563eb' }}>Total Credit Amount</td>
              <td style={{ padding: '10px 12px', fontWeight: 900, color: '#2563eb', fontSize: 14 }}>{fmt(t.totalAmount)}</td><td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Create Form ──────────────────────────────────────────────────────────────
function CreditNoteForm({ invoiceState, onSaved, onCancel }) {
  const [form, setForm]         = useState(() => buildEmptyForm(invoiceState));
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [vendors, setVendors]   = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingV, setLoadingV] = useState(false);
  const [loadingI, setLoadingI] = useState(false);
  const fromInvoice = !!invoiceState;

  // Load vendors + all invoices on mount
  useEffect(() => {
    setLoadingV(true);
    vendorApi.getAll({ limit: 500 })
      .then(r => setVendors(r?.data || (Array.isArray(r) ? r : [])))
      .catch(() => {}).finally(() => setLoadingV(false));

    setLoadingI(true);
    poGeneratorApi.listInvoices({ limit: 1000 })
      .then(r => setInvoices(r?.data || (Array.isArray(r) ? r : [])))
      .catch(() => {}).finally(() => setLoadingI(false));
  }, []);

  // Re-fetch invoices filtered by vendor when vendor changes
  useEffect(() => {
    if (!form.customerName) return;
    setLoadingI(true);
    poGeneratorApi.listInvoices({ search: form.customerName, limit: 500 })
      .then(r => setInvoices(r?.data || (Array.isArray(r) ? r : [])))
      .catch(() => {}).finally(() => setLoadingI(false));
  }, [form.customerName]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const onVendorSelect = (v) => setForm(p => ({
    ...p,
    vendorId:        v._id,
    customerName:    vName(v),
    customerEmail:   v.email     || '',
    customerPhone:   v.phone     || v.contactPhone || '',
    customerGST:     v.gstNumber || v.gstNo        || '',
    customerAddress: [v.address, v.city, v.state, v.pincode].filter(Boolean).join(', '),
    invoiceNo: '',  // clear invoice when vendor changes
  }));

  const onInvoiceSelect = (inv) => setForm(p => ({
    ...p,
    invoiceNo: inv.invoiceNo || '',
  }));

  const onInvoiceManual = (text) => setForm(p => ({ ...p, invoiceNo: text }));

  const onItemsChange = (items) => setForm(p => ({ ...p, items, ...calcTotals(items) }));

  const validate = () => {
    const e = {};
    if (!form.customerName.trim()) e.customerName = 'Vendor Name is required';
    if (!form.reason)              e.reason        = 'Reason is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await creditNoteApi.create({
        vendorName:    form.customerName,
        vendorEmail:   form.customerEmail  || '',
        vendorGST:     form.customerGST    || '',
        vendorAddress: form.customerAddress || '',
        invoiceNumber: form.invoiceNo      || '',
        against:       form.returnId       || '',
        reason:        form.reason,
        amount:        form.totalAmount    || 0,
        items:         form.items,
        status:        'Open',
      });
      toast('Credit note created successfully');
      onSaved();
    } catch (err) { toast(err.message || 'Failed to create credit note', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.12)', maxWidth: 820, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 26px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: '16px 16px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MdReceipt size={20} color="#fff" />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Create Credit Note</span>
          {fromInvoice && <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>Auto-filled from GRN</span>}
        </div>
        <button type="button" onClick={onCancel}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
          <MdClose size={17} />
        </button>
      </div>

      <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {fromInvoice && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdCheckCircle size={16} color="#2563eb" />
            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>Pre-filled from GRN Invoice <strong>{invoiceState.invoiceNo}</strong></span>
          </div>
        )}

        {/* Row 1: Vendor Name (searchable dropdown) + Reason */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          <Field label="Vendor Name" required error={errors.customerName}>
            <VendorSelect value={form.vendorId} onChange={onVendorSelect} vendors={vendors} loading={loadingV} />
          </Field>
          <Field label="Reason for Credit" required error={errors.reason}>
            <select value={form.reason} onChange={e => set('reason', e.target.value)} style={sel()}>
              <option value="">Select reason</option>
              {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>

        {/* Row 2: Invoice No. (dynamic dropdown) + Return / MR ID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          <Field label="Invoice No.">
            <InvoiceSelect
              value={form.invoiceNo}
              onChange={onInvoiceSelect}
              onManualChange={onInvoiceManual}
              invoices={invoices}
              loading={loadingI}
            />
          </Field>
          <Field label="Return / MR ID">
            <input type="text" value={form.returnId} onChange={e => set('returnId', e.target.value)}
              placeholder="MR-XXXX (optional)" style={inp()} />
          </Field>
        </div>

        {/* Row 3: Email + Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          <Field label="Email">
            <input type="email" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)}
              placeholder="vendor@company.com" style={inp()} />
          </Field>
          <Field label="Phone">
            <input type="text" value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)}
              placeholder="10-digit number" style={inp()} />
          </Field>
        </div>

        {/* Row 4: GST + Address */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          <Field label="GST Number">
            <input type="text" value={form.customerGST} onChange={e => set('customerGST', e.target.value)}
              placeholder="GSTIN (optional)" style={inp()} />
          </Field>
          <Field label="Address">
            <input type="text" value={form.customerAddress} onChange={e => set('customerAddress', e.target.value)}
              placeholder="Vendor address" style={inp()} />
          </Field>
        </div>

        {/* Items Table */}
        <ItemsTable items={form.items} onChange={onItemsChange} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '9px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ padding: '9px 24px', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 3px 10px rgba(37,99,235,0.3)' }}>
            {saving ? 'Saving…' : 'Create Credit Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function CreditNoteDetail({ note, onClose }) {
  const t = calcTotals(note.items || []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', fontFamily: 'Inter, system-ui, sans-serif' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Credit Note — {note.cnId || note.creditNoteNo || note._id}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{note.vendorName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <MdClose size={17} />
          </button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Credit Note #', value: note.cnId || '—' },
              { label: 'Vendor',        value: note.vendorName || '—' },
              { label: 'Invoice No.',   value: note.invoiceNumber || '—' },
              { label: 'Reason',        value: note.reason || '—' },
              { label: 'Status',        value: note.status || '—' },
              { label: 'Total Amount',  value: fmt(note.amount || note.totalAmount) },
              { label: 'GST',           value: note.vendorGST || '—' },
              { label: 'Created By',    value: note.createdBy || '—' },
              { label: 'Date',          value: note.createdAt ? fmtDate(note.createdAt) : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 13px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>{value}</div>
              </div>
            ))}
          </div>
          {/* Amount summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Credit Amount', value: fmt(note.creditAmount || t.creditAmount), color: '#2563eb', bg: '#eff6ff' },
              { label: 'GST Amount',    value: fmt(note.gstAmount    || t.gstAmount),    color: '#1d4ed8', bg: '#eff6ff' },
              { label: 'Total Amount',  value: fmt(note.amount       || t.totalAmount),  color: '#2563eb', bg: '#eff6ff' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${color}22` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
          {(note.items || []).length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '9px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Items ({note.items.length})</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {['#', 'Product', 'Qty', 'Rate', 'GST %', 'Amount'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {note.items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', fontSize: 12, color: '#94a3b8' }}>{i + 1}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{it.productName || '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13 }}>{it.quantity}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13 }}>{fmt(it.rate)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13 }}>{it.gstRate}%</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{fmt(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#eff6ff', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#2563eb', fontSize: 13 }}>Total Credit Amount</td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: '#2563eb', fontSize: 14 }}>{fmt(note.amount || t.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Open:   { bg: '#eff6ff', color: '#1d4ed8' },
    Closed: { bg: '#d1fae5', color: '#065f46' },
    Pending:{ bg: '#fef3c7', color: '#92400e' },
    Draft:  { bg: '#f1f5f9', color: '#475569' },
  };
  const s = map[status] || map.Draft;
  return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{status || 'Open'}</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreditNotePage() {
  const location     = useLocation();
  const navigate     = useNavigate();
  const invoiceState = location.state?.invoice || null;

  // 'list' = table view | 'form' = create form
  const [view,    setView]    = useState('list');
  const [notes,   setNotes]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [detail,  setDetail]  = useState(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // If navigated from GRN invoice, open form immediately
  useEffect(() => {
    if (invoiceState) setView('form');
  }, [invoiceState]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, stRes] = await Promise.all([creditNoteApi.getAll(), creditNoteApi.getStats()]);
      const raw = listRes?.data || (Array.isArray(listRes) ? listRes : []);
      setNotes(raw.map(n => ({
        ...n,
        _cnNo:      n.cnId          || '',
        _invoiceNo: n.invoiceNumber || '',
        _status:    n.status        || 'Open',
      })));
      const sd = stRes?.data || stRes || {};
      setStats({
        total:       sd.total   ?? raw.length,
        open:        sd.open    ?? raw.filter(n => n.status === 'Open').length,
        closed:      sd.closed  ?? raw.filter(n => n.status === 'Closed').length,
        totalAmount: raw.reduce((s, n) => s + (Number(n.amount || n.totalAmount) || 0), 0),
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (view === 'list') fetchData(); }, [view, fetchData]);

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return !q
      || (n.vendorName || '').toLowerCase().includes(q)
      || (n._cnNo      || '').toLowerCase().includes(q)
      || (n._invoiceNo || '').toLowerCase().includes(q);
  });

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this credit note?')) return;
    try { await creditNoteApi.delete(id); toast('Deleted'); fetchData(); }
    catch (err) { toast(err.message, 'error'); }
  };

  // ── Form view ── (opened only when Add button clicked or from GRN)
  if (view === 'form') {
    return (
      <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setView('list')}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}>
            <MdArrowBack size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#1e293b' }}>
              {invoiceState ? 'Create Credit Note from GRN Invoice' : 'New Credit Note'}
            </h1>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Fill in the details below to raise a credit note</div>
          </div>
        </div>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <CreditNoteForm
            invoiceState={invoiceState}
            onSaved={() => setView('list')}
            onCancel={() => setView('list')}
          />
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}>
            <MdArrowBack size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>Credit Notes</h1>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Manage and track all credit notes</div>
          </div>
        </div>
        {/* Add button — click to open form */}
        <button onClick={() => setView('form')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
          <MdAdd size={16} /> New Credit Note
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Notes',  value: stats.total,       color: '#2563eb', bg: '#eff6ff' },
            { label: 'Open',         value: stats.open,        color: '#d97706', bg: '#fffbeb' },
            { label: 'Closed',       value: stats.closed,      color: '#059669', bg: '#f0fdf4' },
            { label: 'Total Amount', value: `₹${((stats.totalAmount || 0) / 1000).toFixed(1)}K`, color: '#7c3aed', bg: '#f5f3ff' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <MdSearch size={16} color="#94a3b8" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by vendor, credit note no, or invoice no…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: '#1e293b' }} />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><MdClose size={16} /></button>}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No credit notes yet</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              {search ? 'No results match your search.' : 'Create your first credit note to get started.'}
            </div>
            {!search && (
              <button onClick={() => setView('form')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <MdAdd size={15} /> Create Credit Note
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Credit Note #', 'Vendor', 'Invoice No.', 'Reason', 'Total Amount', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page-1)*pageSize, page*pageSize).map((n, i) => (
                  <tr key={n._id || i}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => setDetail(n)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: '#2563eb', fontSize: 13 }}>
                      {n._cnNo || `CN-${String(i + 1).padStart(4, '0')}`}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{n.vendorName || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: '#475569', fontFamily: 'monospace' }}>{n._invoiceNo || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#475569', maxWidth: 160 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.reason || '—'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{fmt(n.amount || n.totalAmount)}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={n._status} /></td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{n.createdAt ? fmtDate(n.createdAt) : '—'}</td>
                    <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setDetail(n)} title="View"
                          style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                          <MdVisibility size={14} />
                        </button>
                        <button onClick={e => handleDelete(n._id, e)} title="Delete"
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                          <MdDelete size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPage={p => setPage(p)}
            onPageSize={s => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>

      {detail && <CreditNoteDetail note={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
