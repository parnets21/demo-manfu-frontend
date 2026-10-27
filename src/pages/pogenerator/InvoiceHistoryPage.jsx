import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import {
  MdSearch, MdReceipt, MdVisibility, MdCheckCircle,
  MdPrint, MdDownload, MdClose, MdArrowBack, MdDelete,
} from 'react-icons/md';
import Modal from '../../components/common/Modal';
import { CHAKRA_LOGO_B64 } from '../../assets/chakraLogoB64';
import { SIGNATURE_B64 } from '../../assets/signatureB64.js';

const STATUS_COLORS = {
  Draft:     { bg: '#f1f5f9', color: '#64748b' },
  Approved:  { bg: '#dcfce7', color: '#16a34a' },
  Sent:      { bg: '#dbeafe', color: '#1d4ed8' },
  Paid:      { bg: '#f0fdf4', color: '#15803d' },
  Cancelled: { bg: '#fee2e2', color: '#dc2626' },
};

// ── Generate printable HTML for a POInvoice ───────────────────────────────────
function buildInvoiceHTML(inv) {
  const fmt  = (n) => `₹${(Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fmtD = (d) => { try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'}); } catch { return d||'—'; } };
  const n    = (v) => Number(v) || 0;
  const esc  = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
  const GSTIN_RE = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9]Z[A-Z0-9]\b/i;
  const normalizeAddress = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return { addressHTML: '', gstin: '' };

    const gstin = raw.match(GSTIN_RE)?.[0]?.toUpperCase() || '';
    const withoutGST = raw
      .replace(/GSTIN\s*[:\-]?\s*[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9]Z[A-Z0-9]/ig, '')
      .replace(GSTIN_RE, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const lines = withoutGST
      .split(/\r?\n|,\s*(?=\S)/)
      .map(part => part.trim().replace(/[,\s]+$/, ''))
      .filter(Boolean);

    return {
      addressHTML: lines.map(esc).join('<br/>'),
      gstin,
    };
  };

  const rows = (inv.items||[]).map((it,i) => {
    const taxable  = n(it.taxableValue) || n(it.invoicedQty) * n(it.basePrice);
    const cgstVal  = n(it.cgstVal)  || (taxable * n(it.cgst)  / 100);
    const sgstVal  = n(it.sgstVal)  || (taxable * n(it.sgst)  / 100);
    const igstVal  = n(it.igstVal)  || (taxable * n(it.igst)  / 100);
    const taxAmt   = cgstVal + sgstVal + igstVal;
    const total    = n(it.lineTotal) || taxable + taxAmt;
    // Use stored percentages directly — never fall back to gst/2 which adds phantom tax
    const cgstPct  = n(it.cgst);
    const sgstPct  = n(it.sgst);
    const igstPct  = n(it.igst);
    // Extract HSN from itemName if not stored separately (legacy invoices)
    let itemName = it.itemName || '—';
    let hsnCode  = (it.hsn && it.hsn.trim()) ? it.hsn.trim() : '';
    if (!hsnCode) {
      const m = itemName.match(/(?:\/\s*)?(\d{6,10})\s*$/);
      if (m) { hsnCode = m[1]; itemName = itemName.replace(/\s*\/?\s*\d{6,10}\s*$/, '').trim(); }
    } else {
      // Clean HSN from name if it leaked in
      itemName = itemName.replace(/\s*\/?\s*\d{6,10}\s*$/, '').trim();
    }
    return `
    <tr>
      <td style="text-align:center">${i+1}</td>
      <td class="desc" title="${esc(itemName)}">${esc(itemName)}</td>
      <td style="text-align:center;font-weight:700;color:#334155">${hsnCode || '—'}</td>
      <td style="text-align:right">${n(it.invoicedQty)} ${it.unit||''}</td>
      <td style="text-align:right">${fmt(it.basePrice)}</td>
      <td style="text-align:right">${n(it.discount)||0}%</td>
      <td style="text-align:right">${fmt(taxable)}</td>
      <td style="text-align:right">${cgstPct}%</td>
      <td style="text-align:right">${fmt(cgstVal)}</td>
      <td style="text-align:right">${sgstPct}%</td>
      <td style="text-align:right">${fmt(sgstVal)}</td>
      <td style="text-align:right">${igstPct}%</td>
      <td style="text-align:right">${fmt(igstVal)}</td>
      <td style="text-align:right;color:#a16207">${fmt(taxAmt)}</td>
      <td style="text-align:right;font-weight:700;color:#1e40af">${fmt(total)}</td>
    </tr>`;
  }).join('');

  // Compute totals
  const items = inv.items || [];
  const totalTaxable = items.reduce((s,it) => s + (n(it.taxableValue) || n(it.invoicedQty)*n(it.basePrice)), 0);
  const totalCGST    = items.reduce((s,it) => { const t=n(it.taxableValue)||n(it.invoicedQty)*n(it.basePrice); return s+(n(it.cgstVal)||(t*n(it.cgst)/100)); }, 0);
  const totalSGST    = items.reduce((s,it) => { const t=n(it.taxableValue)||n(it.invoicedQty)*n(it.basePrice); return s+(n(it.sgstVal)||(t*n(it.sgst)/100)); }, 0);
  const totalIGST    = items.reduce((s,it) => { const t=n(it.taxableValue)||n(it.invoicedQty)*n(it.basePrice); return s+(n(it.igstVal)||(t*n(it.igst)/100)); }, 0);

  // ── HSN-wise tax breakup ──────────────────────────────────────────────────
  const hsnMap = {};
  for (const it of items) {
    // Resolve HSN — use stored field, or extract from itemName for legacy invoices
    let resolvedHsn = (it.hsn && it.hsn.trim()) ? it.hsn.trim() : '';
    if (!resolvedHsn && it.itemName) {
      const m = it.itemName.match(/(?:\/\s*)?(\d{6,10})\s*$/);
      if (m) resolvedHsn = m[1];
    }
    const hsn     = resolvedHsn || 'N/A';
    const taxable = n(it.taxableValue) || n(it.invoicedQty) * n(it.basePrice);
    // Use stored percentages directly — no gst/2 fallback
    const cgstPct = n(it.cgst);
    const sgstPct = n(it.sgst);
    const igstPct = n(it.igst);
    const cgstVal = n(it.cgstVal)  || (taxable * cgstPct / 100);
    const sgstVal = n(it.sgstVal)  || (taxable * sgstPct / 100);
    const igstVal = n(it.igstVal)  || (taxable * igstPct / 100);
    // Group by HSN + tax rate combo so different-rate items under same HSN stay separate
    const key = `${hsn}__${cgstPct}__${sgstPct}__${igstPct}`;
    if (!hsnMap[key]) hsnMap[key] = { hsn, taxable:0, cgstPct, sgstPct, igstPct, cgst:0, sgst:0, igst:0 };
    hsnMap[key].taxable += taxable;
    hsnMap[key].cgst    += cgstVal;
    hsnMap[key].sgst    += sgstVal;
    hsnMap[key].igst    += igstVal;
  }
  const hsnRows = Object.values(hsnMap).map((h,i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-weight:700">${h.hsn}</td>
      <td style="text-align:right">${fmt(h.taxable)}</td>
      <td style="text-align:right">${h.cgstPct}%</td>
      <td style="text-align:right;color:#1d4ed8">${fmt(h.cgst)}</td>
      <td style="text-align:right">${h.sgstPct}%</td>
      <td style="text-align:right;color:#1d4ed8">${fmt(h.sgst)}</td>
      <td style="text-align:right">${h.igstPct > 0 ? h.igstPct+'%' : '—'}</td>
      <td style="text-align:right;color:#7c3aed">${h.igst > 0 ? fmt(h.igst) : '—'}</td>
      <td style="text-align:right;color:#a16207;font-weight:700">${fmt(h.cgst+h.sgst+h.igst)}</td>
      <td style="text-align:right;font-weight:800;color:#1e40af">${fmt(h.taxable+h.cgst+h.sgst+h.igst)}</td>
    </tr>`).join('');
  const hsnTotTaxable = Object.values(hsnMap).reduce((s,h)=>s+h.taxable,0);
  const hsnTotCGST    = Object.values(hsnMap).reduce((s,h)=>s+h.cgst,0);
  const hsnTotSGST    = Object.values(hsnMap).reduce((s,h)=>s+h.sgst,0);
  const hsnTotIGST    = Object.values(hsnMap).reduce((s,h)=>s+h.igst,0);
  const hsnTotTax     = hsnTotCGST + hsnTotSGST + hsnTotIGST;

  // ── Bill To / Ship To fields ──────────────────────────────────────────────
  const buyerName     = esc(inv.buyerName || '—');
  const buyerAddress  = normalizeAddress(inv.buyerAddress);
  const buyerGSTIN    = esc(inv.buyerGSTIN || buyerAddress.gstin || '');
  const shipToName    = esc(inv.shipToName || inv.buyerName || '—');
  const shipToAddress = normalizeAddress(inv.shipToAddress || inv.buyerAddress);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Invoice ${inv.invoiceNo}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:10px;color:#111;background:#fff}
.page{max-width:900px;margin:0 auto;padding:18px 20px;border:1px solid #ccc}
.header{display:flex;align-items:flex-start;gap:12px;padding-bottom:12px;border-bottom:2px solid #111;margin-bottom:0}
.logo-wrap img{width:52px;height:52px;object-fit:contain;border-radius:5px}
.co-name{font-size:15px;font-weight:900;color:#111}
.co-detail{font-size:9px;color:#333;line-height:1.5;margin-top:2px}
.inv-box{text-align:right;min-width:180px}
.inv-box table{margin-left:auto;border-collapse:collapse}
.inv-box td{padding:1px 5px;font-size:10px}
.inv-box td:first-child{font-weight:700;text-align:right}
.party-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ccc;border-top:none}
.party-cell{padding:8px 10px}
.party-cell+.party-cell{border-left:1px solid #ccc}
.party-label{font-size:8px;font-weight:700;text-transform:uppercase;color:#555;margin-bottom:2px}
.party-name{font-size:11px;font-weight:800;color:#111;margin-bottom:1px}
.party-detail{font-size:9px;color:#444;line-height:1.5;margin-top:1px}
.items-wrap{border:1px solid #ccc;border-top:none;overflow:hidden}
table.items{width:100%;border-collapse:collapse;table-layout:fixed}
table.items col.c-no   {width:28px}
table.items col.c-desc {width:200px}
table.items col.c-hsn  {width:60px}
table.items col.c-qty  {width:48px}
table.items col.c-rate {width:68px}
table.items col.c-disc {width:38px}
table.items col.c-tax  {width:72px}
table.items col.c-pct  {width:38px}
table.items col.c-amt  {width:62px}
table.items col.c-tot  {width:72px}
table.items th{background:#1e293b;color:#e2e8f0;padding:5px 4px;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #334155;text-align:left;white-space:nowrap;overflow:hidden}
table.items td{padding:5px 4px;font-size:9.5px;border-bottom:1px solid #eee;vertical-align:middle;overflow:hidden}
table.items td.desc{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
.total-row td{font-weight:800;font-size:10px;background:#f5f5f5;border-top:2px solid #ccc}
.hsn-section{border:1px solid #ccc;border-top:none;overflow:hidden}
.hsn-title{background:#f1f5f9;padding:6px 10px;font-size:9px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0}
table.hsn{width:100%;border-collapse:collapse;table-layout:fixed}
table.hsn th{background:#334155;color:#e2e8f0;padding:4px 6px;font-size:8px;font-weight:700;text-transform:uppercase;text-align:left;white-space:nowrap}
table.hsn td{padding:4px 6px;font-size:9.5px;border-bottom:1px solid #f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hsn-total-row td{font-weight:800;font-size:10px;background:#f8fafc;border-top:2px solid #cbd5e1}
.summary{border:1px solid #ccc;border-top:none;padding:10px 14px;display:flex;justify-content:flex-end}
.summary-box{min-width:260px}
.summary-row{display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px}
.summary-total{display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:7px;font-size:13px;font-weight:900;color:#1e40af}
.type-badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700;margin-left:5px}
.partial{background:#fef9c3;color:#a16207}
.full{background:#dcfce7;color:#16a34a}
.footer{border:1px solid #ccc;border-top:none;padding:8px 14px;font-size:9px;color:#555;text-align:center}
@media print{
  @page{size:A4 portrait;margin:8mm}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:8px}
  .page{border:none;padding:0;max-width:100%}
  table.items{font-size:8px}
  table.items col.c-desc{width:140px}
  table.items col.c-no{width:20px}
  table.items col.c-hsn{width:50px}
  table.items col.c-qty{width:40px}
  table.items col.c-rate{width:55px}
  table.items col.c-disc{width:30px}
  table.items col.c-tax{width:55px}
  table.items col.c-pct{width:30px}
  table.items col.c-amt{width:50px}
  table.items col.c-tot{width:55px}
}
</style></head><body><div class="page">
<div class="header">
  <div class="logo-wrap"><img src="${CHAKRA_LOGO_B64}" alt="MANUFACTURING ERP" /></div>
  <div style="flex:1">
    <div class="co-name">MANUFACTURING ERP</div>
    <div class="co-detail">#13/14, Azeez Sait Industrial Estate, Mysore Road, Nayandahalli, Bangalore - 560039<br/>GSTIN: 29ABWFS0002M1ZR</div>
  </div>
  <div class="inv-box">
    <table>
      <tr><td>Invoice No.</td><td><strong>${inv.invoiceNo}</strong></td></tr>
      <tr><td>Invoice Date</td><td>${fmtD(inv.createdAt)}</td></tr>
      <tr><td>PO Reference</td><td>${inv.poRef||'—'}</td></tr>
    </table>
  </div>
</div>

<!-- E-Invoice Details -->
${(inv.irn || inv.ackNo) ? `
<div style="border: 1px solid #ccc; border-top: none; padding: 12px 12px; background: #f8fafc;">
  <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">E-Invoice Details</div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    ${inv.irn ? `<div style="font-size: 11px;"><span style="color: #64748b;">IRN:</span> <span style="font-weight: 700; color: #0f172a; word-break: break-all;">${inv.irn}</span></div>` : ''}
    ${inv.ackNo ? `<div style="font-size: 11px;"><span style="color: #64748b;">Ack No:</span> <span style="font-weight: 700; color: #0f172a;">${inv.ackNo}</span></div>` : ''}
    ${inv.ackDate ? `<div style="font-size: 11px;"><span style="color: #64748b;">Ack Date:</span> <span style="font-weight: 700; color: #0f172a;">${fmtD(inv.ackDate)}</span></div>` : ''}
  </div>
</div>` : ''}

<div class="party-grid">
  <div class="party-cell">
    <div class="party-label">Bill To</div>
    <div class="party-name">${buyerName}</div>
    ${buyerAddress.addressHTML ? `<div class="party-detail">${buyerAddress.addressHTML}</div>` : ''}
    ${buyerGSTIN ? `<div class="party-detail" style="margin-top:4px"><strong>GSTIN:</strong> ${buyerGSTIN}</div>` : ''}
  </div>
  <div class="party-cell">
    <div class="party-label">Ship To</div>
    <div class="party-name">${shipToName}</div>
    ${shipToAddress.addressHTML ? `<div class="party-detail">${shipToAddress.addressHTML}</div>` : ''}
  </div>
</div>
<div class="items-wrap">
  <table class="items">
    <colgroup>
      <col class="c-no"/><col class="c-desc"/><col class="c-hsn"/>
      <col class="c-qty"/><col class="c-rate"/><col class="c-disc"/>
      <col class="c-tax"/><col class="c-pct"/><col class="c-amt"/>
      <col class="c-pct"/><col class="c-amt"/><col class="c-pct"/>
      <col class="c-amt"/><col class="c-amt"/><col class="c-tot"/>
    </colgroup>
    <thead><tr>
      <th>#</th>
      <th>Item Description</th>
      <th style="text-align:center">HSN/SAC</th>
      <th style="text-align:right">Qty</th>
      <th style="text-align:right">Rate</th>
      <th style="text-align:right">Disc%</th>
      <th style="text-align:right">Taxable</th>
      <th style="text-align:right">CGST%</th>
      <th style="text-align:right">CGST</th>
      <th style="text-align:right">SGST%</th>
      <th style="text-align:right">SGST</th>
      <th style="text-align:right">IGST%</th>
      <th style="text-align:right">IGST</th>
      <th style="text-align:right">Tax</th>
      <th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="6" style="text-align:right;padding-right:10px">TOTALS</td>
        <td style="text-align:right">${fmt(totalTaxable)}</td>
        <td></td>
        <td style="text-align:right;color:#1d4ed8">${fmt(totalCGST)}</td>
        <td></td>
        <td style="text-align:right;color:#1d4ed8">${fmt(totalSGST)}</td>
        <td></td>
        <td style="text-align:right;color:#7c3aed">${fmt(totalIGST)}</td>
        <td style="text-align:right;color:#a16207">${fmt(totalCGST+totalSGST+totalIGST)}</td>
        <td style="text-align:right;color:#1e40af">${fmt(inv.grandTotal)}</td>
      </tr>
    </tfoot>
  </table>
</div>

<!-- HSN-wise Tax Breakup -->
<div class="hsn-section">
  <div class="hsn-title">HSN / SAC — Tax Breakup</div>
  <table class="hsn">
    <thead><tr>
      <th>#</th>
      <th>HSN / SAC Code</th>
      <th style="text-align:right">Taxable Value</th>
      <th style="text-align:right">CGST %</th>
      <th style="text-align:right">CGST Amt</th>
      <th style="text-align:right">SGST %</th>
      <th style="text-align:right">SGST Amt</th>
      <th style="text-align:right">IGST %</th>
      <th style="text-align:right">IGST Amt</th>
      <th style="text-align:right">Total Tax</th>
      <th style="text-align:right">Total Amt</th>
    </tr></thead>
    <tbody>${hsnRows}</tbody>
    <tfoot>
      <tr class="hsn-total-row">
        <td colspan="2" style="text-align:right;padding-right:10px">TOTALS</td>
        <td style="text-align:right">${fmt(hsnTotTaxable)}</td>
        <td></td>
        <td style="text-align:right;color:#1d4ed8">${fmt(hsnTotCGST)}</td>
        <td></td>
        <td style="text-align:right;color:#1d4ed8">${fmt(hsnTotSGST)}</td>
        <td></td>
        <td style="text-align:right;color:#7c3aed">${hsnTotIGST > 0 ? fmt(hsnTotIGST) : '—'}</td>
        <td style="text-align:right;color:#a16207;font-weight:800">${fmt(hsnTotTax)}</td>
        <td style="text-align:right;color:#1e40af;font-weight:900">${fmt(hsnTotTaxable+hsnTotTax)}</td>
      </tr>
    </tfoot>
  </table>
</div>

<div class="summary">
  <div class="summary-box">
    <div class="summary-row"><span>Total Taxable Value</span><span>${fmt(totalTaxable)}</span></div>
    <div class="summary-row"><span>CGST</span><span>${fmt(totalCGST)}</span></div>
    <div class="summary-row"><span>SGST</span><span>${fmt(totalSGST)}</span></div>
    ${totalIGST > 0 ? `<div class="summary-row"><span>IGST</span><span>${fmt(totalIGST)}</span></div>` : ''}
    <div class="summary-row"><span>Total Tax</span><span>${fmt(totalCGST+totalSGST+totalIGST||n(inv.gstTotal))}</span></div>
    <div class="summary-total"><span>Grand Total</span><span>${fmt(inv.grandTotal)}</span></div>
  </div>
</div>
${inv.notes?`<div style="border:1px solid #ccc;border-top:none;padding:10px 16px;font-size:11px;color:#475569"><strong>Notes:</strong> ${inv.notes}</div>`:''}
<div style="margin-top: 40px; display: flex; justify-content: flex-end; padding: 0 20px;">
  <div style="text-align: right;">
    <div style="font-weight: bold; margin-bottom: 5px;">For MANUFACTURING ERP</div>
    <img src="${SIGNATURE_B64}" alt="Signature" style="height: 60px; margin-bottom: 5px;"/>
    <div style="border-top: 1px solid #333; padding-top: 5px; font-size: 12px;">Authorised Signatory</div>
  </div>
</div>
<div class="footer">This is a computer-generated invoice. All disputes subject to Bangalore jurisdiction only.</div>
</div></body></html>`;
}

export default function InvoiceHistoryPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const printRef  = useRef(null);

  const [invoices, setInvoices]     = useState([]);
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('');
  const [viewInv, setViewInv]       = useState(null);
  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');
  const [updating, setUpdating]     = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [migratingHSN, setMigratingHSN] = useState(false);

  // Delivery tracking state
  const [deliveryInv, setDeliveryInv]       = useState(null);   // invoice open in delivery modal
  const [deliveryItems, setDeliveryItems]   = useState([]);     // local editable copy of items
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliverySaved, setDeliverySaved]   = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      if (search) params.search = search;
      const [invRes, statsRes] = await Promise.all([
        poGeneratorApi.listInvoices(params),
        poGeneratorApi.getStats(),
      ]);
      setInvoices(invRes.data || []);
      setStats(statsRes.data || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Fix HSN migration ──────────────────────────────────────────────────────
  const handleMigrateHSN = async () => {
    setMigratingHSN(true);
    try {
      const res = await poGeneratorApi.migrateHSN();
      setSuccessMsg(res.message || 'HSN migration complete');
      fetchAll(); // reload so updated invoices show correct HSN
    } catch (e) {
      setSuccessMsg('HSN migration failed: ' + e.message);
    } finally {
      setMigratingHSN(false);
    }
  };

  useEffect(() => { fetchAll(); }, [filter]);

  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 6000); return () => clearTimeout(t); }
  }, [successMsg]);

  // ── Print invoice ──────────────────────────────────────────────────────────
  const handlePrint = (inv) => {
    const w = window.open('', '_blank');
    w.document.write(buildInvoiceHTML(inv));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const [downloading, setDownloading] = useState(null);

  // ── Download as PDF ────────────────────────────────────────────────────────
  const handleDownload = async (inv) => {
    setDownloading(inv._id);
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    // Create a hidden iframe to render the full invoice HTML
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:900px;height:1200px;border:none;visibility:hidden';
    document.body.appendChild(iframe);

    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = buildInvoiceHTML(inv);
    });

    // Give fonts/images a moment to render
    await new Promise(r => setTimeout(r, 600));

    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const page = doc.querySelector('.page') || doc.body;

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 900,
        logging: false,
      });

      const imgW = canvas.width;
      const imgH = canvas.height;

      // Always use A4 portrait: 210 × 297 mm
      const pageW = 210;
      const pageH = 297;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Scale image to fit page width
      const finalRatio = pageW / (imgW / 2);
      const finalH = (imgH / 2) * finalRatio;

      let yOffset = 0;
      let remaining = finalH;
      let firstPage = true;

      while (remaining > 0) {
        if (!firstPage) pdf.addPage();
        firstPage = false;

        const sliceH = Math.min(remaining, pageH);
        const srcY = yOffset / finalRatio;
        const srcH = sliceH / finalRatio;

        // Crop the canvas slice for this page
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgW;
        sliceCanvas.height = Math.ceil(srcH * 2);
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, Math.floor(srcY * 2), imgW, Math.ceil(srcH * 2), 0, 0, imgW, Math.ceil(srcH * 2));

        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, sliceH);
        yOffset += sliceH;
        remaining -= sliceH;
      }

      pdf.save(`${inv.invoiceNo}.pdf`);
    } finally {
      document.body.removeChild(iframe);
      setDownloading(null);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await poGeneratorApi.updateInvoiceStatus(id, status);
      fetchAll();
      if (viewInv?._id === id) setViewInv(prev => ({ ...prev, status }));
    } catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await poGeneratorApi.deleteInvoice(id);
      setSuccessMsg('Invoice deleted successfully');
      fetchAll();
      if (viewInv?._id === id) setViewInv(null);
      setDeleteConfirm(null);
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  };

  // ── Delivery tracking ──────────────────────────────────────────────────────
  const openDeliveryModal = (inv) => {
    setDeliveryInv(inv);
    setDeliverySaved(false);
    // Build editable items list with current delivery state
    setDeliveryItems((inv.items || []).map(it => ({
      itemId:         it._id,
      itemName:       it.itemName,
      invoicedQty:    it.invoicedQty,
      unit:           it.unit,
      deliveryStatus: it.deliveryStatus || 'Pending',
      deliveredQty:   it.deliveredQty   ?? it.invoicedQty,
      deliveryDate:   it.deliveryDate   ? new Date(it.deliveryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deliveryNotes:  it.deliveryNotes  || '',
    })));
  };

  const updateDeliveryItem = (idx, field, value) => {
    setDeliveryItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const markAllDelivered = () => {
    setDeliveryItems(prev => prev.map(it => ({
      ...it,
      deliveryStatus: 'Delivered',
      deliveredQty:   it.invoicedQty,
      deliveryDate:   it.deliveryDate || new Date().toISOString().split('T')[0],
    })));
  };

  const markAllNotDelivered = () => {
    setDeliveryItems(prev => prev.map(it => ({
      ...it,
      deliveryStatus: 'Not Delivered',
      deliveredQty:   0,
    })));
  };

  const saveDelivery = async () => {
    if (!deliveryInv) return;
    setSavingDelivery(true);
    try {
      const res = await poGeneratorApi.updateDelivery(deliveryInv._id, deliveryItems);
      setDeliverySaved(true);
      // Update the invoice in the list
      setInvoices(prev => prev.map(inv =>
        inv._id === deliveryInv._id ? { ...inv, ...res.data } : inv
      ));
      // Update viewInv if open
      if (viewInv?._id === deliveryInv._id) setViewInv(res.data);
      setTimeout(() => setDeliverySaved(false), 3000);
    } catch (e) { alert(e.message); }
    finally { setSavingDelivery(false); }
  };

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Invoice History</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>All PO-based invoices — view, print, download</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/po-generator/upload')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#1e40af,#172554)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <MdReceipt size={15} /> + New Invoice
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
          <MdCheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total',    value: stats.totalInvoices   || 0, color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Partial',  value: stats.partialInvoices || 0, color: '#a16207', bg: '#fefce8' },
          { label: 'Full',     value: stats.fullInvoices    || 0, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Paid',     value: stats.paidInvoices    || 0, color: '#15803d', bg: '#dcfce7' },
          { label: 'Value',    value: `₹${((stats.totalValue||0)/100000).toFixed(1)}L`, color: '#1e40af', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <MdSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAll()}
            placeholder="Search invoice no, PO ref, vendor..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Approved">Approved</option>
          <option value="Sent">Sent</option>
          <option value="Paid">Paid</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <MdReceipt size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>No invoices yet</div>
            <button onClick={() => navigate('/po-generator/upload')}
              style={{ marginTop: 12, padding: '8px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
              Generate First Invoice
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['#','Invoice No','Source','PO / GRN Ref','Vendor','Type','Grand Total','Status','Date','Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.Draft;
                  const isGRNInvoice = inv.invoiceNo?.startsWith('GRNINV-');
                  return (
                    <tr key={inv._id} style={{ borderBottom: '1px solid #f1f5f9', background: isGRNInvoice ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#fafafa') }}>
                      <td style={{ padding: '11px 12px', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{i+1}</td>
                      <td style={{ padding: '11px 12px', fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{inv.invoiceNo}</td>
                      <td style={{ padding: '11px 12px' }}>
                        {isGRNInvoice ? (
                          <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            🔄 GRN Auto
                          </span>
                        ) : (
                          <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>
                            Manual
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>{inv.poRef||'—'}</td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#1e293b' }}>{inv.vendorName||'—'}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: inv.invoiceType==='partial'?'#fef9c3':'#dcfce7', color: inv.invoiceType==='partial'?'#a16207':'#16a34a' }}>
                          {inv.invoiceType==='partial'?'Partial':'Full'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>₹{Math.round(inv.grandTotal||0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{inv.status}</span>
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => setViewInv(inv)} title="View Invoice"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                            <MdVisibility size={14} /> View
                          </button>
                          <button onClick={() => handlePrint(inv)} title="Print"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                            <MdPrint size={14} /> Print
                          </button>
                          <button onClick={() => handleDownload(inv)} title="Download PDF" disabled={downloading === inv._id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: downloading === inv._id ? '#f1f5f9' : '#fef9c3', color: '#a16207', border: 'none', borderRadius: 7, fontSize: 12, cursor: downloading === inv._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 600, opacity: downloading === inv._id ? 0.6 : 1 }}>
                            <MdDownload size={14} /> {downloading === inv._id ? 'PDF...' : 'PDF'}
                          </button>
                          <button onClick={() => setDeleteConfirm(inv)} title="Delete Invoice" disabled={deleting === inv._id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 7, fontSize: 12, cursor: deleting === inv._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 600, opacity: deleting === inv._id ? 0.6 : 1 }}>
                            <MdDelete size={14} />
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
      </div>

      {/* ── Invoice View Modal ── */}
      <Modal
        open={!!viewInv}
        onClose={() => setViewInv(null)}
        title={`Invoice: ${viewInv?.invoiceNo}`}
        size="xl"
        footer={
          <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {viewInv?.status === 'Draft' && (
                <button onClick={() => handleStatusUpdate(viewInv._id, 'Approved')} disabled={!!updating}
                  style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✓ Approve
                </button>
              )}
              {viewInv?.status === 'Approved' && (
                <button onClick={() => handleStatusUpdate(viewInv._id, 'Paid')} disabled={!!updating}
                  style={{ padding: '8px 16px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ₹ Mark Paid
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => viewInv && handlePrint(viewInv)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <MdPrint size={15} /> Print
              </button>
              <button onClick={() => viewInv && handleDownload(viewInv)} disabled={downloading === viewInv?._id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: downloading === viewInv?._id ? '#f1f5f9' : '#fefce8', color: '#a16207', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: downloading === viewInv?._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: downloading === viewInv?._id ? 0.6 : 1 }}>
                <MdDownload size={15} /> {downloading === viewInv?._id ? 'Generating PDF...' : 'Download PDF'}
              </button>
              <button onClick={() => setViewInv(null)}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Close
              </button>
            </div>
          </div>
        }
      >
        {viewInv && (
          <div>
            {/* Invoice preview rendered inline */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 0 }}
              dangerouslySetInnerHTML={{ __html: buildInvoiceHTML(viewInv) }} />
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Invoice"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <button onClick={() => setDeleteConfirm(null)} disabled={!!deleting}
              style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={() => deleteConfirm && handleDelete(deleteConfirm._id)} disabled={!!deleting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1 }}>
              <MdDelete size={15} /> {deleting ? 'Deleting...' : 'Delete Invoice'}
            </button>
          </div>
        }
      >
        {deleteConfirm && (
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Invoice Details:</div>
              <div style={{ fontSize: 13, color: '#475569' }}>
                <strong>Invoice No:</strong> {deleteConfirm.invoiceNo}<br />
                <strong>PO Ref:</strong> {deleteConfirm.poRef}<br />
                <strong>Vendor:</strong> {deleteConfirm.vendorName}<br />
                <strong>Amount:</strong> ₹{Math.round(deleteConfirm.grandTotal || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
