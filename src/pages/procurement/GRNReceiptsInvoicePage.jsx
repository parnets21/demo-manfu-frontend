import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import StatusBadge from '../../components/common/StatusBadge';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import { CHAKRA_LOGO_B64 } from '../../assets/chakraLogoB64';
import Modal from '../../components/common/Modal';
import {
  MdReceipt, MdSearch, MdPrint, MdDownload, MdVisibility,
  MdCheckCircle, MdHourglassEmpty, MdCurrencyRupee, MdFilterList,
  MdPayment, MdAdd, MdDelete, MdClose,
} from 'react-icons/md';

// ── Status colour map ─────────────────────────────────────────────────────────
const STATUS_STYLE = {
  Draft:     { bg: '#f1f5f9', color: '#64748b' },
  Approved:  { bg: '#dcfce7', color: '#16a34a' },
  Sent:      { bg: '#dbeafe', color: '#1d4ed8' },
  Paid:      { bg: '#f0fdf4', color: '#15803d' },
  Cancelled: { bg: '#fee2e2', color: '#dc2626' },
};

const fmt  = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtD = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } };

// ── Build printable invoice HTML ──────────────────────────────────────────────
function buildInvoiceHTML(inv) {
  const n   = (v) => Number(v) || 0;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));

  const rows = (inv.items || []).map((it, i) => {
    const taxable = n(it.taxableValue) || n(it.invoicedQty) * n(it.basePrice);
    const cgstVal = n(it.cgstVal) || taxable * n(it.cgst) / 100;
    const sgstVal = n(it.sgstVal) || taxable * n(it.sgst) / 100;
    const lineTotal = n(it.lineTotal) || taxable + cgstVal + sgstVal;
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${esc(it.itemName)}</td>
      <td style="text-align:center">${esc(it.hsn || '—')}</td>
      <td style="text-align:right">${n(it.invoicedQty)} ${esc(it.unit || '')}</td>
      <td style="text-align:right">${fmt(it.basePrice)}</td>
      <td style="text-align:right">${fmt(taxable)}</td>
      <td style="text-align:right">${n(it.cgst)}%</td>
      <td style="text-align:right;color:#1d4ed8">${fmt(cgstVal)}</td>
      <td style="text-align:right">${n(it.sgst)}%</td>
      <td style="text-align:right;color:#1d4ed8">${fmt(sgstVal)}</td>
      <td style="text-align:right;font-weight:700;color:#1e40af">${fmt(lineTotal)}</td>
    </tr>`;
  }).join('');

  const totalTaxable = (inv.items || []).reduce((s, it) => s + (n(it.taxableValue) || n(it.invoicedQty) * n(it.basePrice)), 0);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>GRN Receipt Invoice — ${inv.invoiceNo}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:10px;color:#111;background:#fff}
.page{max-width:900px;margin:0 auto;padding:18px 20px;border:1px solid #ccc}
.header{display:flex;align-items:flex-start;gap:12px;padding-bottom:10px;border-bottom:2px solid #111;margin-bottom:8px}
.logo img{width:48px;height:48px;object-fit:contain;border-radius:5px}
.co-name{font-size:14px;font-weight:900;color:#111}
.co-sub{font-size:8.5px;color:#555;line-height:1.5;margin-top:2px}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;margin-top:4px}
.inv-box{text-align:right;min-width:170px}
.inv-box table{margin-left:auto;border-collapse:collapse}
.inv-box td{padding:2px 5px;font-size:9.5px}
.inv-box td:first-child{font-weight:700;text-align:right}
.party-row{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ccc;border-top:none;margin-bottom:0}
.party-cell{padding:7px 10px}
.party-cell+.party-cell{border-left:1px solid #ccc}
.party-label{font-size:8px;font-weight:700;text-transform:uppercase;color:#777;margin-bottom:2px}
.party-name{font-size:11px;font-weight:800}
.party-detail{font-size:8.5px;color:#444;line-height:1.5}
table.items{width:100%;border-collapse:collapse}
table.items th{background:#1e293b;color:#e2e8f0;padding:5px 4px;font-size:8px;font-weight:700;text-transform:uppercase;text-align:left;border-bottom:1px solid #334155;white-space:nowrap}
table.items td{padding:5px 4px;font-size:9px;border-bottom:1px solid #eee;vertical-align:middle}
.tot-row td{font-weight:800;background:#f8fafc;border-top:2px solid #ccc}
.summary{display:flex;justify-content:flex-end;border:1px solid #ccc;border-top:none;padding:10px 14px}
.summary-box{min-width:240px}
.sr{display:flex;justify-content:space-between;margin-bottom:3px;font-size:10.5px}
.sr-total{display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:6px;font-size:13px;font-weight:900;color:#1e40af}
.footer{border:1px solid #ccc;border-top:none;padding:6px 14px;font-size:8.5px;color:#666;text-align:center}
@media print{@page{size:A4;margin:8mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{border:none;padding:0}}
</style></head><body><div class="page">
<div class="header">
  <div class="logo"><img src="${CHAKRA_LOGO_B64}" alt="Manufacturing ERP" /></div>
  <div style="flex:1">
    <div class="co-name">Manufacturing ERP</div>
    <div class="co-sub">#13/14, Azeez Sait Industrial Estate, Mysore Road, Nayandahalli, Bangalore - 560039<br/>GSTIN: 29ABWFS0002M1ZR</div>
    <span class="badge">GRN Receipt Invoice</span>
  </div>
  <div class="inv-box">
    <table>
      <tr><td>Invoice No.</td><td><strong>${esc(inv.invoiceNo)}</strong></td></tr>
      <tr><td>Invoice Date</td><td>${fmtD(inv.createdAt)}</td></tr>
      <tr><td>GRN Ref</td><td>${esc(inv.poRef || '—')}</td></tr>
      <tr><td>Type</td><td>${inv.invoiceType === 'partial' ? 'Partial (QC)' : 'Full (QC Passed)'}</td></tr>
    </table>
  </div>
</div>
<div class="party-row">
  <div class="party-cell">
    <div class="party-label">Vendor (Supplier)</div>
    <div class="party-name">${esc(inv.vendorName || '—')}</div>
  </div>
  <div class="party-cell">
    <div class="party-label">Received By</div>
    <div class="party-name">${esc(inv.buyerName || 'Manufacturing ERP')}</div>
    ${inv.buyerAddress ? `<div class="party-detail">${esc(inv.buyerAddress)}</div>` : ''}
    ${inv.shipToName ? `<div class="party-detail" style="margin-top:3px"><strong>Warehouse:</strong> ${esc(inv.shipToName)}</div>` : ''}
  </div>
</div>
<div style="border:1px solid #ccc;border-top:none;overflow:hidden">
<table class="items">
  <thead><tr>
    <th>#</th><th>Item</th><th style="text-align:center">HSN</th>
    <th style="text-align:right">QC Approved Qty</th><th style="text-align:right">Rate</th>
    <th style="text-align:right">Taxable</th><th style="text-align:right">CGST%</th>
    <th style="text-align:right">CGST</th><th style="text-align:right">SGST%</th>
    <th style="text-align:right">SGST</th><th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="tot-row">
    <td colspan="5" style="text-align:right;padding-right:8px">TOTALS</td>
    <td style="text-align:right">${fmt(totalTaxable)}</td>
    <td colspan="2" style="text-align:right;color:#1d4ed8">${fmt(n(inv.gstTotal) / 2)}</td>
    <td colspan="2" style="text-align:right;color:#1d4ed8">${fmt(n(inv.gstTotal) / 2)}</td>
    <td style="text-align:right;color:#1e40af">${fmt(inv.grandTotal)}</td>
  </tr></tfoot>
</table>
</div>
<div class="summary">
  <div class="summary-box">
    <div class="sr"><span>Total Taxable Value</span><span>${fmt(totalTaxable)}</span></div>
    <div class="sr"><span>Total GST</span><span>${fmt(inv.gstTotal)}</span></div>
    <div class="sr-total"><span>Grand Total</span><span>${fmt(inv.grandTotal)}</span></div>
  </div>
</div>
${inv.notes ? `<div style="border:1px solid #ccc;border-top:none;padding:8px 14px;font-size:10px;color:#475569"><strong>Notes:</strong> ${esc(inv.notes)}</div>` : ''}
<div class="footer">Auto-generated GRN Receipt Invoice · Only QC-approved quantities are invoiced · Manufacturing ERP</div>
</div></body></html>`;
}

// Payment Tracking Content Component
function PaymentTrackingContent({ 
  invoice, 
  payments, 
  loadingPayments, 
  calculatePaymentStats,
  showAddPayment,
  setShowAddPayment,
  newPayment,
  setNewPayment,
  handleAddPayment,
  addingPayment,
}) {
  const stats = calculatePaymentStats(invoice, payments);
  
  const paymentStatusStyle = {
    'Unpaid': { bg: '#fee2e2', color: '#dc2626' },
    'Partially Paid': { bg: '#fef3c7', color: '#d97706' },
    'Fully Paid': { bg: '#dcfce7', color: '#16a34a' },
  }[stats.paymentStatus] || { bg: '#f1f5f9', color: '#64748b' };

  return (
    <div>
      {/* Payment Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Vendor', value: invoice.vendorName || '—' },
          { label: 'PO Number', value: invoice.poRef || '—', mono: true },
          { label: 'GRN Number', value: invoice.poRef || '—', mono: true },
          { label: 'Invoice Number', value: invoice.invoiceNo, mono: true },
          { label: 'Invoice Date', value: fmtD(invoice.createdAt) },
          { label: 'Total Invoice Amount', value: fmt(stats.totalAmount), bold: true, color: '#1e293b' },
          { label: 'Amount Paid', value: fmt(stats.amountPaid), bold: true, color: '#16a34a' },
          { label: 'Balance Due', value: fmt(stats.balanceDue), bold: true, color: '#1e40af' },
          { label: 'Payment Due Date', value: invoice.paymentDueDate ? fmtD(invoice.paymentDueDate) : 'Not set' },
          { 
            label: 'Days Remaining', 
            value: stats.daysOverdue 
              ? `${stats.daysOverdue} days overdue` 
              : stats.daysRemaining 
                ? `${stats.daysRemaining} days` 
                : '—',
            color: stats.daysOverdue ? '#dc2626' : stats.daysRemaining ? '#16a34a' : '#64748b',
          },
          { 
            label: 'Payment Status', 
            value: stats.paymentStatus, 
            badge: true,
          },
        ].map(({ label, value, mono, bold, color, badge }) => (
          <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
            {badge ? (
              <div style={{ 
                display: 'inline-block', 
                padding: '4px 10px', 
                borderRadius: 20, 
                fontSize: 12, 
                fontWeight: 700, 
                ...paymentStatusStyle 
              }}>
                {value}
              </div>
            ) : (
              <div style={{ 
                fontSize: 13, 
                fontWeight: bold ? 800 : 600, 
                color: color || '#1e293b', 
                fontFamily: mono ? 'monospace' : 'inherit' 
              }}>
                {value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Payment Button */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setShowAddPayment(true)}
          style={{
            padding: '10px 16px',
            background: '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MdAdd size={16} />
          Add Payment
        </button>
      </div>

      {/* Add Payment Form */}
      {showAddPayment && (
        <div style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: 10, 
          padding: 16, 
          marginBottom: 16 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1e293b' }}>Record New Payment</h3>
            <button
              onClick={() => setShowAddPayment(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <MdClose size={20} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Payment Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Payment Date
              </label>
              <input
                type="date"
                value={newPayment.date}
                onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Payment Mode
              </label>
              <select
                value={newPayment.mode}
                onChange={(e) => setNewPayment({ ...newPayment, mode: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Transaction Reference
              </label>
              <input
                type="text"
                value={newPayment.reference}
                onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                placeholder="Reference number"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Remarks
              </label>
              <textarea
                value={newPayment.remarks}
                onChange={(e) => setNewPayment({ ...newPayment, remarks: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  minHeight: 60,
                  boxSizing: 'border-box',
                }}
                placeholder="Add remarks (optional)"
              />
            </div>
          </div>
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button
              onClick={handleAddPayment}
              disabled={addingPayment || !newPayment.amount}
              style={{
                padding: '9px 18px',
                background: addingPayment || !newPayment.amount ? '#94a3b8' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: addingPayment || !newPayment.amount ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {addingPayment ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Payment History Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1e293b' }}>Payment History</h3>
        </div>
        {loadingPayments ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading payments…</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No payments recorded yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Date', 'Amount', 'Mode', 'Reference', 'Remarks'].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...payments].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).map((payment, idx) => (
                  <tr key={payment._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#1e293b' }}>
                      {fmtD(payment.date || payment.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                      {fmt(payment.amount)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#1e293b' }}>
                      {payment.mode}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#1e293b', fontFamily: 'monospace' }}>
                      {payment.reference || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                      {payment.remarks || '—'}
                    </td>
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

// ── Main Page Component ───────────────────────────────────────────────────────
export default function GRNReceiptsInvoicePage() {
  const navigate = useNavigate();
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewInv, setViewInv]     = useState(null);
  const [updating, setUpdating]   = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [invoicePayments, setInvoicePayments] = useState({}); // { invoiceId: payments[]
  
  // Payment tracking state
  const [showPayments, setShowPayments] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'Bank Transfer',
    reference: '',
    remarks: '',
  });

  // KPI counts
  const total    = invoices.length;
  const draft    = invoices.filter(i => i.status === 'Draft').length;
  const approved = invoices.filter(i => i.status === 'Approved').length;
  const paid     = invoices.filter(i => i.status === 'Paid').length;
  const totalVal = invoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  
  // Fetch payments for an invoice from API
  const fetchPayments = useCallback(async (invoiceId) => {
    setLoadingPayments(true);
    try {
      const res = await poGeneratorApi.listPayments(invoiceId);
      const paymentsData = res.data || [];
      setPayments(paymentsData);
      setInvoicePayments(prev => ({ ...prev, [invoiceId]: paymentsData }));
    } catch (e) {
      console.error(e);
      // If API fails, use empty array (no payments)
      setPayments([]);
      setInvoicePayments(prev => ({ ...prev, [invoiceId]: [] }));
    } finally {
      setLoadingPayments(false);
    }
  }, []);
  
  // Fetch payments for all invoices (optional, for displaying in table
  const fetchAllInvoicePayments = useCallback(async () => {
    try {
      // We'll fetch payments for each invoice when we view them individually
      // For large lists, we'll fetch on view only when hover or show placeholder
    } catch (e) {
      console.error(e);
    }
  }, []);
  
  // Calculate payment stats for an invoice
  const calculatePaymentStats = useCallback((invoice, paymentList) => {
    const totalAmount = Number(invoice.grandTotal) || 0;
    const amountPaid = paymentList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balanceDue = totalAmount - amountPaid;
    
    let paymentStatus = 'Unpaid';
    if (amountPaid >= totalAmount) {
      paymentStatus = 'Fully Paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'Partially Paid';
    }
    
    // Calculate days remaining / overdue
    let daysRemaining = null;
    let daysOverdue = null;
    if (invoice.paymentDueDate) {
      const dueDate = new Date(invoice.paymentDueDate);
      const today = new Date();
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        daysRemaining = diffDays;
      } else {
        daysOverdue = Math.abs(diffDays);
      }
    }
    
    return {
      totalAmount,
      amountPaid,
      balanceDue,
      paymentStatus,
      daysRemaining,
      daysOverdue,
    };
  }, []);
  
  // Handle adding a payment
  const handleAddPayment = async () => {
    if (!viewInv || !newPayment.amount) return;
    
    setAddingPayment(true);
    try {
      const paymentData = {
        ...newPayment,
        amount: Number(newPayment.amount),
      };
      
      await poGeneratorApi.addPayment(viewInv._id, paymentData);
      
      // Refresh payments list to get latest data
      await fetchPayments(viewInv._id);
      
      // Reset form
      setNewPayment({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        mode: 'Bank Transfer',
        reference: '',
        remarks: '',
      });
      setShowAddPayment(false);
    } catch (e) {
      alert(`Failed to add payment: ${e.message}`);
    } finally {
      setAddingPayment(false);
    }
  };
  
  // When viewInv changes, fetch payments immediately
  useEffect(() => {
    if (viewInv) {
      fetchPayments(viewInv._id);
    }
  }, [viewInv, fetchPayments]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { prefix: 'GRNINV' };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await poGeneratorApi.listInvoices(params);
      const invoiceList = res.data || [];
      setInvoices(invoiceList);
      
      // Reset invoice payments (no hardcoded data)
      setInvoicePayments({});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await poGeneratorApi.updateInvoiceStatus(id, status);
      setInvoices(prev => prev.map(inv => inv._id === id ? { ...inv, status } : inv));
      if (viewInv?._id === id) setViewInv(prev => ({ ...prev, status }));
    } catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  };

  const handlePrint = (inv) => {
    const w = window.open('', '_blank');
    w.document.write(buildInvoiceHTML(inv));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const handleDownload = async (inv) => {
    setDownloading(inv._id);
    try {
      const { default: jsPDF }      = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:900px;height:1200px;border:none;visibility:hidden';
      document.body.appendChild(iframe);
      await new Promise(r => { iframe.onload = r; iframe.srcdoc = buildInvoiceHTML(inv); });
      await new Promise(r => setTimeout(r, 500));
      try {
        const doc   = iframe.contentDocument || iframe.contentWindow.document;
        const page  = doc.querySelector('.page') || doc.body;
        const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210;
        const ratio = pageW / (canvas.width / 2);
        const h = (canvas.height / 2) * ratio;
        let y = 0;
        let first = true;
        while (y < h) {
          if (!first) pdf.addPage();
          first = false;
          const slice = Math.min(h - y, 297);
          const sc = document.createElement('canvas');
          sc.width  = canvas.width;
          sc.height = Math.ceil((slice / ratio) * 2);
          sc.getContext('2d').drawImage(canvas, 0, Math.floor((y / ratio) * 2), canvas.width, sc.height, 0, 0, canvas.width, sc.height);
          pdf.addImage(sc.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, slice);
          y += slice;
        }
        pdf.save(`${inv.invoiceNo}.pdf`);
      } finally { document.body.removeChild(iframe); }
    } catch (e) { console.error(e); alert('PDF generation failed: ' + e.message); }
    finally { setDownloading(null); }
  };

  const filtered = invoices.filter(inv => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return inv.invoiceNo?.toLowerCase().includes(q)
      || inv.poRef?.toLowerCase().includes(q)
      || inv.vendorName?.toLowerCase().includes(q);
  });

  const kpis = [
    { label: 'Total Invoices', value: total,    icon: <MdReceipt size={18} />,      color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.2)' },
    { label: 'Draft',          value: draft,    icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.2)' },
    { label: 'Approved',       value: approved, icon: <MdCheckCircle size={18} />,  color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.2)' },
    { label: 'Total Value',    value: `₹${(totalVal / 1000).toFixed(1)}K`, icon: <MdCurrencyRupee size={18} />, color: '#7c3aed', color2: '#8b5cf6', glow: 'rgba(124,58,237,0.2)' },
  ];

  return (
    <div>
      <PageHeader
        title="GRN Receipt Invoices"
        breadcrumb="Procurement › GRN Receipt Invoices"
      />
      <KpiStrip kpis={kpis} />

      <PageCard>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <MdSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoice no., GRN ref, vendor…"
              style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <MdFilterList size={16} color="#94a3b8" />
            {['', 'Draft', 'Approved', 'Paid', 'Cancelled'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                  background: statusFilter === s ? '#1e40af' : '#f1f5f9',
                  color: statusFilter === s ? '#fff' : '#475569',
                }}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading invoices…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <MdReceipt size={42} style={{ color: '#e2e8f0', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>No GRN Receipt Invoices yet</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              They are generated automatically when a QC inspection is submitted.<br />
              Go to <strong>Quality Check</strong> and submit an inspection to generate the first invoice.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'Invoice No.', 'GRN / PO Ref', 'Vendor', 'QC Type', 'Items', 'Grand Total', 'Status', 'Payment Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => {
                  const sc = STATUS_STYLE[inv.status] || STATUS_STYLE.Draft;
                  const invPayments = invoicePayments[inv._id] || [];
                  const invStats = calculatePaymentStats(inv, invPayments);
                  const paymentStatusStyle = {
                    'Unpaid': { bg: '#fee2e2', color: '#dc2626' },
                    'Partially Paid': { bg: '#fef3c7', color: '#d97706' },
                    'Fully Paid': { bg: '#dcfce7', color: '#16a34a' },
                  }[invStats.paymentStatus] || { bg: '#f1f5f9', color: '#64748b' };
                  
                  return (
                    <tr key={inv._id} style={{ borderBottom: '1px solid #f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fefce8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 12px', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{inv.invoiceNo}</span>
                        <span style={{ marginLeft: 6, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                          GRN Auto
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px', fontFamily: 'monospace', fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>{inv.poRef || '—'}</td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{inv.vendorName || '—'}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: inv.invoiceType === 'partial' ? '#fef9c3' : '#dcfce7', color: inv.invoiceType === 'partial' ? '#a16207' : '#16a34a' }}>
                          {inv.invoiceType === 'partial' ? '⚠ Partial QC' : '✓ Full QC'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#1e293b' }}>{inv.items?.length || 0}</td>
                      <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                        {fmt(inv.grandTotal)}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, ...paymentStatusStyle, display: 'inline-block', width: 'fit-content' }}>
                            {invStats.paymentStatus}
                          </span>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>
                            Total: {fmt(invStats.totalAmount)}
                            <br />
                            Paid: {fmt(invStats.amountPaid)} | Balance: {fmt(invStats.balanceDue)}
                            <br />
                            Payments: {invPayments.length}
                            {inv.paymentDueDate && (
                              <>
                                <br />
                                Due: {fmtD(inv.paymentDueDate)}
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {fmtD(inv.createdAt)}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <button onClick={() => { setViewInv(inv); setShowPayments(false); }} title="View"
                            style={{ padding: '5px 10px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MdVisibility size={13} /> View
                          </button>
                          <button onClick={() => handlePrint(inv)} title="Print"
                            style={{ padding: '5px 10px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MdPrint size={13} />
                          </button>
                          <button onClick={() => handleDownload(inv)} disabled={downloading === inv._id} title="Download PDF"
                            style={{ padding: '5px 10px', background: downloading === inv._id ? '#f1f5f9' : '#fef9c3', color: '#a16207', border: 'none', borderRadius: 7, fontSize: 12, cursor: downloading === inv._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: downloading === inv._id ? 0.6 : 1 }}>
                            <MdDownload size={13} /> {downloading === inv._id ? '…' : 'PDF'}
                          </button>
                          <button 
                            onClick={() => navigate('/returns/credit-note', { state: { invoice: inv } })}
                            title="Create Credit Note"
                            style={{ padding: '5px 10px', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <MdAdd size={13} /> Credit Note
                          </button>
                          <button 
                            onClick={() => navigate('/returns/debit-note', { state: { invoice: inv } })}
                            title="Create Debit Note"
                            style={{ padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <MdAdd size={13} /> Debit Note
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ── View / Approve Modal ── */}
      <Modal
        open={!!viewInv}
        onClose={() => { setViewInv(null); setShowPayments(false); setShowAddPayment(false); }}
        title={`GRN Receipt Invoice — ${viewInv?.invoiceNo}`}
        size="xl"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {viewInv?.status === 'Draft' && (
                <button onClick={() => handleStatusUpdate(viewInv._id, 'Approved')} disabled={!!updating}
                  style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✓ Approve Invoice
                </button>
              )}
              {viewInv?.status === 'Approved' && (
                <button onClick={() => handleStatusUpdate(viewInv._id, 'Paid')} disabled={!!updating}
                  style={{ padding: '8px 16px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ₹ Mark as Paid
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => navigate('/returns/credit-note', { state: { invoice: viewInv } })}
                style={{ padding: '8px 14px', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <MdAdd size={15} /> Create Credit Note
              </button>
              <button 
                onClick={() => navigate('/returns/debit-note', { state: { invoice: viewInv } })}
                style={{ padding: '8px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <MdAdd size={15} /> Create Debit Note
              </button>
              <button onClick={() => viewInv && handlePrint(viewInv)}
                style={{ padding: '8px 14px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <MdPrint size={15} /> Print
              </button>
              <button onClick={() => viewInv && handleDownload(viewInv)} disabled={downloading === viewInv?._id}
                style={{ padding: '8px 14px', background: '#fefce8', color: '#a16207', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: downloading === viewInv?._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: downloading === viewInv?._id ? 0.6 : 1 }}>
                <MdDownload size={15} /> {downloading === viewInv?._id ? 'Generating…' : 'Download PDF'}
              </button>
              <button onClick={() => { setViewInv(null); setShowPayments(false); setShowAddPayment(false); }}
                style={{ padding: '8px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Close
              </button>
            </div>
          </div>
        }
      >
        {viewInv && (
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setShowPayments(false)}
                style={{
                  padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
                  fontSize: 13, fontWeight: 600, color: !showPayments ? '#1e40af' : '#64748b',
                  borderBottom: !showPayments ? '2px solid #1e40af' : '2px solid transparent',
                  fontFamily: 'inherit'
                }}
              >
                Invoice Details
              </button>
              <button
                onClick={() => setShowPayments(true)}
                style={{
                  padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
                  fontSize: 13, fontWeight: 600, color: showPayments ? '#1e40af' : '#64748b',
                  borderBottom: showPayments ? '2px solid #1e40af' : '2px solid transparent',
                  fontFamily: 'inherit'
                }}
              >
                <MdPayment style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                Payment Tracking
              </button>
            </div>

            {!showPayments ? (
              <>
                {/* Summary strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Invoice No.', value: viewInv.invoiceNo, mono: true },
                    { label: 'GRN / PO Ref', value: viewInv.poRef || '—', mono: true },
                    { label: 'Vendor', value: viewInv.vendorName || '—' },
                    { label: 'Grand Total', value: fmt(viewInv.grandTotal), bold: true, color: '#1e40af' },
                    { label: 'QC Type', value: viewInv.invoiceType === 'partial' ? 'Partial QC' : 'Full QC Passed' },
                    { label: 'Status', value: viewInv.status },
                  ].map(({ label, value, mono, bold, color }) => (
                    <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: color || '#1e293b', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {/* Invoice HTML preview */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}
                  dangerouslySetInnerHTML={{ __html: buildInvoiceHTML(viewInv) }}
                />
              </>
            ) : (
              <PaymentTrackingContent 
                invoice={viewInv}
                payments={payments}
                loadingPayments={loadingPayments}
                calculatePaymentStats={calculatePaymentStats}
                showAddPayment={showAddPayment}
                setShowAddPayment={setShowAddPayment}
                newPayment={newPayment}
                setNewPayment={setNewPayment}
                handleAddPayment={handleAddPayment}
                addingPayment={addingPayment}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}