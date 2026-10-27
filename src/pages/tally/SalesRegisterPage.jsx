/**
 * SalesRegisterPage.jsx
 *
 * Dedicated Sales Register import + viewer for MANUFACTURING ERP.
 * Purpose: Import all Sales Register vouchers (April–June) from Tally
 *          and display them with full detail.
 *
 * DB storage: TallyVoucher (voucherType: 'Sales') + Invoice (source: 'Tally')
 * Route: /tally/sales-register
 */
import { useState, useCallback, useEffect } from 'react';
import { tallyApi } from '../../api/tallyApi.js';
import { toast } from '../../components/common/Toast.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { SIGNATURE_B64 } from '../../assets/signatureB64.js';
import { CHAKRA_LOGO_B64 } from '../../assets/chakraLogoB64.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ── Style tokens ─────────────────────────────────────────────────────────────
const th  = 'bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap';
const td  = 'px-4 py-3 text-gray-800 align-middle text-sm';
const tr  = 'border-b border-gray-50 last:border-0 hover:bg-green-50/30 transition-colors';

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', borderRadius: 10,
  background: 'linear-gradient(135deg,#16a34a,#15803d)',
  color: '#fff', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
  boxShadow: '0 3px 10px rgba(22,163,74,0.3)',
};
const outlineBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', borderRadius: 10,
  background: 'transparent', color: '#16a34a',
  border: '1.5px solid #16a34a', cursor: 'pointer',
  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
};
const inputStyle = {
  padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', fontSize: 13,
  fontFamily: 'inherit', outline: 'none', background: '#fff',
};

function fmt(n) {
  if (n == null || n === '') return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #f1f5f9', borderTop: '3px solid #16a34a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Badge({ text, color = '#6b7280', bg = '#f1f5f9' }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color }}>{text}</span>
  );
}

// ── Helper function to format tax rates with proper precision ──
const formatTaxRate = (rate) => {
  if (rate == null) return null;
  // Handle floating-point precision issues, check if it's very close to an integer
  const epsilon = 1e-10;
  const roundedRate = Math.round(rate * 100) / 100; // Round to 2 decimal places first
  if (Math.abs(roundedRate - Math.round(roundedRate)) < epsilon) {
    return Math.round(roundedRate).toString();
  }
  // For non-integers, find the shortest representation
  const fixed2 = roundedRate.toFixed(2);
  const fixed1 = roundedRate.toFixed(1);
  if (Math.abs(parseFloat(fixed1) - roundedRate) < epsilon) return fixed1;
  return fixed2;
};

// ── Modal for viewing invoice details ──
function InvoiceDetailModal({ invoice, isOpen, onClose }) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=900,height=700');
    printWindow.document.write(buildInvoiceHtml(invoice));
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
    setTimeout(() => printWindow.print(), 800);
  };
  // ── Build shared invoice HTML (used by both Print and PDF) ─────────────────
  const buildInvoiceHtml = (inv) => {
    const taxLines = inv.taxLines || (inv.ledgerEntries || []).filter(le =>
      ['cgst','sgst','igst','cess'].some(t => (le.ledgerName||'').toLowerCase().includes(t)));
    const itemRows = (inv.inventoryEntries || inv.items || []).map((it, i) =>
      `<tr><td>${i+1}</td><td>${it.stockItemName||it.description||it.name||'—'}</td>`+
      `<td style="text-align:right">${Number(it.qty||it.quantity||0).toLocaleString('en-IN')} Nos</td>`+
      `<td style="text-align:right">&#8377;${Number(it.rate||it.unitPrice||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}/Nos</td>`+
      `<td>Nos</td><td style="text-align:right">&#8377;${Number(it.amount||it.total||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`
    ).join('');
    const taxRows = taxLines.map(t =>
      `<tr><td colspan="5" style="text-align:right">${t.ledgerName}</td>`+
      `<td style="text-align:right">&#8377;${Number(Math.abs(t.amount||0)).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`
    ).join('');

    // ── Clean up bill-to / ship-to for PDF/Print (same logic as modal display) ──
    // Tally emits "." or "..." or any dot-only string as unexpanded TDL formula placeholders
    const cleanGstin = (g) => {
      if (!g) return '';
      const t = g.trim();
      if (!t || /^\.+$/.test(t) || t.length < 3) return '';
      return t;
    };
    const cleanField = (s) => {
      if (!s) return '';
      const t = s.trim();
      return /^\.+$/.test(t) ? '' : t;
    };
    const norm = (s) => (s || '').trim().toLowerCase();
    const pBillToName = cleanField(inv.billToName) || cleanField(inv.partyName) || '';
    const pBillToMailingName = cleanField(inv.billToMailingName) || '';
    const pBillToAddress = cleanField(inv.billToAddress) || '';
    const pBillToGST = cleanGstin(inv.billToGST)
                    || cleanGstin(inv.partyGstin)
                    || cleanGstin(inv.shipToGST)
                    || '';

    const pRawShipName = cleanField(inv.shipToName || '');
    // Tally sometimes puts the party/ledger name in the address field instead of a real address.
    // Treat shipToAddress as blank if it matches the ship-to name or bill-to name.
    const pRawShipAddrRaw = cleanField(inv.shipToAddress || '');
    const pRawShipAddr = (
      norm(pRawShipAddrRaw) === norm(pRawShipName || pBillToName) ||
      norm(pRawShipAddrRaw) === norm(pBillToName)
    ) ? '' : pRawShipAddrRaw;
    const pRawShipGST  = cleanGstin(inv.shipToGST || '');
    const pRawShipMailingNameRaw = cleanField(inv.shipToMailingName || '');
    // Discard mailing name if it's the party name repeated (Tally artefact)
    const pRawShipMailingName = (
      norm(pRawShipMailingNameRaw) === norm(pRawShipName || pBillToName) ||
      norm(pRawShipMailingNameRaw) === norm(pBillToName)
    ) ? '' : pRawShipMailingNameRaw;

    // Detect truly-same ship-to
    const pShipNameSame = !pRawShipName || norm(pRawShipName) === norm(pBillToName);
    const pShipAddrSame = !pRawShipAddr || norm(pRawShipAddr) === norm(pBillToAddress);
    const pShipGstSame  = !pRawShipGST  || norm(pRawShipGST)  === norm(pBillToGST);
    const pShipSameAsBill = pShipNameSame && pShipAddrSame && pShipGstSame;

    const pShipToName = pRawShipName || pBillToName;
    const pShipToMailingName = (pRawShipMailingName
      && norm(pRawShipMailingName) !== norm(pShipToName)
      && norm(pRawShipMailingName) !== norm(pBillToName))
      ? pRawShipMailingName : '';
    const pShipToAddress = pRawShipAddr || (pShipSameAsBill ? pBillToAddress : '');
    const pShipToState   = cleanField(inv.shipToState)   || (pShipSameAsBill ? cleanField(inv.billToState)   : '');
    const pShipToGST     = pRawShipGST || pBillToGST;
    const pShowBillMailingName = pBillToMailingName && pBillToMailingName !== pBillToName;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
*{-webkit-print-color-adjust:exact!important;color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}
body{font-family:Arial,sans-serif;margin:0;padding:20px;font-size:12px;color:#111827}
.hdr{display:flex;align-items:center;border-bottom:2px solid #16a34a;padding-bottom:12px;margin-bottom:16px;gap:12px}
.hdr img{height:65px;width:auto;flex-shrink:0}
.hdr .ci{flex:1;text-align:center}
.hdr .ci h2{margin:0 0 3px;font-size:18px;color:#111827}
.hdr .ci p{margin:2px 0;font-size:10px;color:#6b7280}
.trow{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.ititle{font-size:15px;font-weight:700;border:1px solid #d1d5db;padding:3px 10px;border-radius:4px}
.imeta{text-align:right;font-size:11px}
.slbl{text-align:center;font-size:12px;font-weight:700;text-decoration:underline;margin-bottom:8px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px}
.pr{display:grid;grid-template-columns:130px 1fr;gap:4px;margin-bottom:3px;font-size:11px}
.pl{color:#6b7280}
.pv{color:#111827;font-weight:700}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px}
th,td{border:1px solid #d1d5db;padding:6px 8px}
th{background:#f3f4f6;font-weight:700;text-transform:uppercase;font-size:10px}
.tw{font-weight:700}
.ssec{margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end}
.sblk{text-align:center}
.sline{border-top:1px solid #374151;padding-top:3px;font-size:10px;color:#374151;margin-top:2px}
@media print{*{-webkit-print-color-adjust:exact!important}body{padding:12px}img{display:block!important;visibility:visible!important}}
</style></head><body>
<div class="hdr">
  <img src="${CHAKRA_LOGO_B64}" alt="MANUFACTURING ERP"/>
  <div class="ci"><h2>MANUFACTURING ERP</h2>
  <p>#13/14, Azeez Sait Industrial Estate, Mysore Road, Nayandahalli, Bangalore - 560039</p>
  <p>GSTIN: 29ABWFS0002M1ZR</p></div>
  <div style="width:80px;flex-shrink:0"></div>
</div>
<div class="trow">
  <div class="ititle">TAX INVOICE</div>
  <div class="imeta"><div><b>Invoice No.:</b> ${inv.invoiceNo||inv.voucherNumber||'—'}</div><div><b>Date:</b> ${fmtDate(inv.invoiceDate||inv.voucherDate)}</div>${inv.buyersOrderNo ? `<div style="margin-top:5px;display:inline-flex;align-items:center;gap:5px;background:#fffbeb;border:1.5px solid #fcd34d;border-radius:6px;padding:3px 8px"><span style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase">PO No.</span><span style="font-size:11px;font-weight:800;color:#78350f">${inv.buyersOrderNo}</span></div>` : ''}</div>
</div>
<div class="slbl">Party Details</div>
<div class="g2">
  <div>
    <div class="pr"><span class="pl">Buyer (Bill to)</span><span class="pv">: ${pBillToName||'—'}</span></div>
    ${pShowBillMailingName ? `<div class="pr"><span class="pl">Mailing Name</span><span>: ${pBillToMailingName}</span></div>` : ''}
    <div class="pr"><span class="pl">Address</span><span>: ${pBillToAddress ? pBillToAddress.replace(/\n/g,'<br/>') : '—'}</span></div>
    ${inv.billToState ? `<div class="pr"><span class="pl">State</span><span>: ${inv.billToState}</span></div>` : ''}
    ${inv.billToGstRegType ? `<div class="pr"><span class="pl">GST Reg Type</span><span>: ${inv.billToGstRegType}</span></div>` : ''}
    <div class="pr"><span class="pl">GSTIN/UIN</span><span>: ${pBillToGST||'—'}</span></div>
  </div>
  <div>
    <div class="pr"><span class="pl">Consignee (Ship to)</span><span class="pv">: ${pShipToName||'—'}</span></div>
    ${pShipSameAsBill
      ? `<div class="pr"><span class="pl">Address</span><span style="color:#6b7280;font-style:italic">: (Same as billing address)</span></div>`
      : `${pShipToMailingName ? `<div class="pr"><span class="pl">Mailing Name</span><span>: ${pShipToMailingName}</span></div>` : ''}
    <div class="pr"><span class="pl">Address</span><span>: ${pShipToAddress ? pShipToAddress.replace(/\n/g,'<br/>') : '—'}</span></div>
    ${pShipToState ? `<div class="pr"><span class="pl">State</span><span>: ${pShipToState}</span></div>` : ''}`
    }
    <div class="pr"><span class="pl">GSTIN/UIN</span><span>: ${pShipToGST||'—'}</span></div>
  </div>
</div>
${inv.placeOfSupply ? `<div style="border-top:1px solid #e5e7eb;padding:5px 0 8px;margin-bottom:10px"><div class="pr"><span class="pl">Place of Supply</span><span class="pv">: ${inv.placeOfSupply}</span></div></div>` : ''}
${(inv.irn || inv.ackNo) && (
  `<div style="margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:8px">
    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px">E-Invoice Details</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${inv.irn ? `<div><span style="font-size:11px;color:#64748b">IRN:</span> <span style="font-size:11px;font-weight:700;color:#0f172a;word-break:break-all">${inv.irn}</span></div>` : ''}
      ${inv.ackNo ? `<div><span style="font-size:11px;color:#64748b">Ack No:</span> <span style="font-size:11px;font-weight:700;color:#0f172a">${inv.ackNo}</span></div>` : ''}
      ${inv.ackDate ? `<div><span style="font-size:11px;color:#64748b">Ack Date:</span> <span style="font-size:11px;font-weight:700;color:#0f172a">${fmtDate(inv.ackDate)}</span></div>` : ''}
    </div>
  </div>`
)}
<table>
  <thead><tr>
    <th style="width:30px">#</th><th>Name of Item</th>
    <th style="width:90px;text-align:right">Qty</th>
    <th style="width:110px;text-align:right">Rate</th>
    <th style="width:35px">Per</th>
    <th style="width:110px;text-align:right">Amount</th>
  </tr></thead>
  <tbody>
    ${itemRows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af">No items</td></tr>'}
    <tr class="tw"><td colspan="5" style="text-align:right">Sub-total</td>
      <td style="text-align:right">&#8377;${Number(inv.subtotal||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>
    ${taxRows}
    <tr class="tw" style="color:#16a34a;font-size:13px">
      <td colspan="5" style="text-align:right">Grand Total</td>
      <td style="text-align:right">&#8377;${Number(inv.grandTotal||inv.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>
  </tbody>
</table>
${inv.narration ? `<div style="font-size:11px;color:#6b7280;margin-bottom:10px"><b>Narration:</b> ${inv.narration}</div>` : ''}
<div class="ssec">
  <div style="font-size:10px;color:#6b7280;max-width:280px"><b>Declaration:</b> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
  <div class="sblk">
    <div style="font-weight:700;font-size:12px;margin-bottom:6px">For MANUFACTURING ERP</div>
    <img src="${SIGNATURE_B64}" alt="Authorised Signature" style="height:65px;width:auto;display:block;margin:0 auto 4px"/>
    <div class="sline">Authorised Signatory</div>
  </div>
</div>
</body></html>`;
  };

  const handleDownloadPDF = async () => {
    try {
      toast('Generating PDF...', 'info');
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = buildInvoiceHtml(invoice);
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '794px';
      document.body.appendChild(tempDiv);
      await new Promise(r => setTimeout(r, 300));
      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice_${invoice.invoiceNo || invoice.voucherNumber || 'document'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast('PDF downloaded!', 'success');
    } catch (err) {
      console.error('PDF error:', err);
      toast('Failed to generate PDF', 'error');
    } finally {
      document.querySelectorAll('div[style*="left: -9999px"]').forEach(d => d.remove());
    }
  };

  // Helper to categorize ledger entries
  const isTaxEntry = (le) => {
    const name = le.ledgerName.toLowerCase();
    return name.includes('cgst') || name.includes('sgst') || name.includes('igst') || name.includes('cess');
  };

  const isPartyEntry = (le) => {
    return le.ledgerName.toLowerCase() === (invoice.partyName || '').toLowerCase();
  };

  const additionalCharges = (invoice.ledgerEntries || []).filter(le => !isTaxEntry(le) && !isPartyEntry(le));
  const taxEntries = (invoice.taxLines || []).length > 0 ? invoice.taxLines : (invoice.ledgerEntries || []).filter(isTaxEntry);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32, maxWidth: 1000, maxHeight: '90vh',
        overflow: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.15)', position: 'relative'
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
          fontSize: 24, cursor: 'pointer', color: '#6b7280', padding: 0
        }}>✕</button>

        {/* Header with Company Info */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: 22, fontWeight: 800 }}>MANUFACTURING ERP</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>#13/14, Azeez Sait Industrial Estate, Mysore Road, Nayandahalli, Bangalore - 560039</p>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>GSTIN: 29ABWFS0002M1ZR</p>
          </div>
        </div>

        {/* E-Invoice Details */}
        {(invoice.irn || invoice.ackNo) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
            {invoice.irn && (
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>IRN</label>
                <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12, wordBreak: 'break-all' }}>{invoice.irn}</p>
              </div>
            )}
            {invoice.ackNo && (
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Ack No</label>
                <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.ackNo}</p>
              </div>
            )}
            {invoice.ackDate && (
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Ack Date</label>
                <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{fmtDate(invoice.ackDate)}</p>
              </div>
            )}
          </div>
        )}

        {/* Invoice Title and Basic Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>TAX INVOICE</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Invoice No.: {invoice.invoiceNo || invoice.voucherNumber}</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>Date: {fmtDate(invoice.invoiceDate || invoice.voucherDate)}</div>
            {invoice.buyersOrderNo && (
              <div style={{
                marginTop: 6,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fffbeb', border: '1.5px solid #fcd34d',
                borderRadius: 8, padding: '4px 10px',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>PO No.</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#78350f' }}>{invoice.buyersOrderNo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Party Details - Bill To & Ship To */}
        {(() => {
          // ── Helpers ───────────────────────────────────────────────────────
          // Clean up "." or "..." or any dot-only junk that Tally emits as unexpanded TDL placeholders
          const cleanGstin = (g) => {
            if (!g) return '';
            const t = g.trim();
            if (!t || /^\.+$/.test(t) || t.length < 3) return '';
            return t;
          };
          const cleanField = (s) => {
            if (!s) return '';
            const t = s.trim();
            return /^\.+$/.test(t) ? '' : t;
          };
          const norm = (s) => (s || '').trim().toLowerCase();

          // ── Resolve Bill-To fields ─────────────────────────────────────
          const billToName        = cleanField(invoice.billToName) || cleanField(invoice.partyName) || '';
          const billToMailingName = cleanField(invoice.billToMailingName) || '';
          const billToAddress     = cleanField(invoice.billToAddress) || '';
          const billToCity        = cleanField(invoice.billToCity) || '';
          const billToState       = cleanField(invoice.billToState) || '';
          const billToCountry     = cleanField(invoice.billToCountry) || '';
          const billToGST = cleanGstin(invoice.billToGST)
                         || cleanGstin(invoice.partyGstin)
                         || cleanGstin(invoice.shipToGST)
                         || '';

          // ── Resolve Ship-To fields ─────────────────────────────────────
          const rawShipName = cleanField(invoice.shipToName || '');
          // Tally sometimes puts the party/ledger name in the address field instead of a real address.
          // Treat shipToAddress as blank if it equals the ship-to name or the bill-to name.
          const rawShipAddrRaw = cleanField(invoice.shipToAddress || '');
          const rawShipAddr = (
            norm(rawShipAddrRaw) === norm(rawShipName || billToName) ||
            norm(rawShipAddrRaw) === norm(billToName)
          ) ? '' : rawShipAddrRaw;
          const rawShipGST  = cleanGstin(invoice.shipToGST || '');

          // Mailing name: only use if different from both the ship name AND bill name
          const rawShipMailingNameRaw = cleanField(invoice.shipToMailingName || '');
          // Also discard mailing name if it's identical to ship name or bill name (Tally artefact)
          const rawShipMailingName = (
            norm(rawShipMailingNameRaw) === norm(rawShipName || billToName) ||
            norm(rawShipMailingNameRaw) === norm(billToName)
          ) ? '' : rawShipMailingNameRaw;

          // Determine if ship-to is truly identical to bill-to:
          // name matches (or ship name is blank), address matches (or ship addr is blank),
          // and GST matches (or ship GST is blank)
          const shipNameSame = !rawShipName || norm(rawShipName) === norm(billToName);
          const shipAddrSame = !rawShipAddr || norm(rawShipAddr) === norm(billToAddress);
          const shipGstSame  = !rawShipGST  || norm(rawShipGST)  === norm(billToGST);
          const shipSameAsBill = shipNameSame && shipAddrSame && shipGstSame;

          const shipToName = rawShipName || billToName;
          // Only show ship mailing name if it's genuinely different from shipToName AND billToName
          const shipToMailingName = (rawShipMailingName
            && norm(rawShipMailingName) !== norm(shipToName)
            && norm(rawShipMailingName) !== norm(billToName))
            ? rawShipMailingName : '';
          const shipToAddress = rawShipAddr || (shipSameAsBill ? billToAddress : '');
          const shipToCity    = cleanField(invoice.shipToCity)    || (shipSameAsBill ? billToCity    : '');
          const shipToState   = cleanField(invoice.shipToState)   || (shipSameAsBill ? billToState   : '');
          const shipToCountry = cleanField(invoice.shipToCountry) || (shipSameAsBill ? billToCountry : '');
          const shipToGST     = rawShipGST || billToGST;

          // Only show mailing name for bill-to if it differs from name
          const showBillToMailingName = billToMailingName && billToMailingName !== billToName;

          return (
        <div style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', textDecoration: 'underline' }}>Party Details</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Bill To */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 12, color: '#374151' }}>Buyer (Bill to)</div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {billToName || '—'}</div>
              </div>
              {showBillToMailingName && (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: '#374151' }}>Mailing Name</div>
                  <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {billToMailingName}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 12, color: '#374151' }}>Address</div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 600, whiteSpace: 'pre-line' }}>: {billToAddress || '—'}</div>
              </div>
              {(billToCity || billToState || billToCountry) && (
                <>
                  {billToCity && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4, paddingLeft: '148px' }}>
                      <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>{billToCity}</div>
                    </div>
                  )}
                  {billToState && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: '#374151' }}>State</div>
                      <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {billToState}</div>
                    </div>
                  )}
                  {billToCountry && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: '#374151' }}>Country</div>
                      <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {billToCountry}</div>
                    </div>
                  )}
                </>
              )}
              {invoice.billToGstRegType && (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: '#374151' }}>GST Registration type</div>
                  <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {invoice.billToGstRegType}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#374151' }}>GSTIN/UIN</div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {billToGST || '—'}</div>
              </div>
            </div>

            {/* Ship To */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 12, color: '#374151' }}>Consignee (Ship to)</div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {shipToName || '—'}</div>
              </div>
              {shipSameAsBill ? (
                /* Ship-to is same party/address as bill-to — show a clean note instead of duplicating */
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: '#374151' }}>Address</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>: (Same as billing address)</div>
                </div>
              ) : (
                <>
                  {shipToMailingName && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: '#374151' }}>Mailing Name</div>
                      <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {shipToMailingName}</div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>Address</div>
                    <div style={{ fontSize: 12, color: '#111827', fontWeight: 600, whiteSpace: 'pre-line' }}>
                      : {shipToAddress || '—'}
                    </div>
                  </div>
                  {(shipToCity || shipToState || shipToCountry) && (
                    <>
                      {shipToCity && (
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4, paddingLeft: '148px' }}>
                          <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>{shipToCity}</div>
                        </div>
                      )}
                      {shipToState && (
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 12, color: '#374151' }}>State</div>
                          <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {shipToState}</div>
                        </div>
                      )}
                      {shipToCountry && (
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 12, color: '#374151' }}>Country</div>
                          <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {shipToCountry}</div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#374151' }}>GSTIN/UIN</div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {shipToGST || '—'}</div>
              </div>
            </div>
          </div>
          {invoice.placeOfSupply && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#374151' }}>Place of Supply</div>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>: {invoice.placeOfSupply}</div>
              </div>
            </div>
          )}
        </div>
          );
        })()}

        {/* Delivery & Reference Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
          {invoice.deliveryNote && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Delivery Note</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.deliveryNote}</p>
            </div>
          )}
          {invoice.referenceNo && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Reference No. & Date</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.referenceNo}{invoice.referenceDate ? ` · ${fmtDate(invoice.referenceDate)}` : ''}</p>
            </div>
          )}
          {invoice.buyersOrderNo && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Buyer's Order No.</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.buyersOrderNo}{invoice.buyersOrderDate ? ` · ${fmtDate(invoice.buyersOrderDate)}` : ''}</p>
            </div>
          )}
          {invoice.dispatchDocNo && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Dispatch Doc No.</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.dispatchDocNo}</p>
            </div>
          )}
          {invoice.dispatchedThrough && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Dispatched Through</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.dispatchedThrough}</p>
            </div>
          )}
          {invoice.destination && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Destination</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.destination}</p>
            </div>
          )}
          {invoice.billOfLadingNo && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Bill of Lading/LR-RR No.</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.billOfLadingNo}</p>
            </div>
          )}
          {invoice.motorVehicleNo && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Motor Vehicle No.</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.motorVehicleNo}</p>
            </div>
          )}
          {invoice.termsOfDelivery && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Terms of Delivery</label>
              <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 12 }}>{invoice.termsOfDelivery}</p>
            </div>
          )}
        </div>

        {/* Narration */}
        {invoice.narration && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Narration</label>
            <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 13 }}>{invoice.narration}</p>
          </div>
        )}

        {/* Items */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Items</label>
          {((invoice.inventoryEntries && invoice.inventoryEntries.length > 0) || (invoice.items && invoice.items.length > 0)) ? (
            <div style={{ background: '#f8fafc', borderRadius: 8, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Item Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>Rate</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>Tax %</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.inventoryEntries || invoice.items || []).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px', color: '#0f172a' }}>{item.stockItemName || item.description || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a' }}>{item.qty || 0}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a' }}>₹{(item.rate || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a' }}>
                        {item.taxRate != null ? formatTaxRate(item.taxRate) + '%' : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>₹{(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: 12 }}>No items found</p>
          )}
        </div>

        {/* Charges & Taxes */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Charges & Taxes</label>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>Subtotal</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{fmt(invoice.subtotal || (invoice.inventoryEntries || invoice.items || []).reduce((sum, item) => sum + (item.amount || 0), 0))}</span>
            </div>
            {additionalCharges.map((charge, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{charge.ledgerName}</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{fmt(Math.abs(charge.amount))}</span>
              </div>
            ))}
            {taxEntries.map((tax, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{tax.ledgerName}</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{fmt(Math.abs(tax.amount))}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12 }}>
              <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Grand Total</span>
              <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 18 }}>{fmt(invoice.grandTotal || invoice.amount)}</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 24, fontSize: 12, color: '#64748b' }}>
          <div><strong>Source:</strong> {invoice.source || 'Tally'}</div>
          <div><strong>Type:</strong> {invoice.voucherType || invoice.invoiceType || 'Sales'}</div>
          {invoice.tallyGuid && <div><strong>Tally GUID:</strong> <code style={{ fontSize: 10 }}>{invoice.tallyGuid.slice(0, 20)}...</code></div>}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0',
            background: '#f8fafc', color: '#64748b', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit'
          }}>Close</button>
          <button onClick={handlePrint} style={{
            ...primaryBtn, background: 'linear-gradient(135deg,#0369a1,#0284c7)'
          }}>🖨️ Print</button>
          <button onClick={handleDownloadPDF} style={primaryBtn}>⬇️ Download PDF</button>
        </div>
      </div>
    </div>
  );
}

export default function SalesRegisterPage() {
  // ── Date range (default: FY April–June current year) ─────────────────────
  const now = new Date();
  const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const defaultFrom = `${fyYear}-04-01`;
  const defaultTo   = `${fyYear}-06-30`;

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate,   setToDate]   = useState(defaultTo);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [activeView, setActiveView] = useState('vouchers'); // 'vouchers' | 'invoices'

  // Vouchers state
  const [vouchers, setVouchers]       = useState([]);
  const [vTotal,   setVTotal]         = useState(0);
  const [vPage,    setVPage]          = useState(1);
  const [vPageSize, setVPageSize]     = useState(25);

  // Invoice state
  const [invoices, setInvoices]       = useState([]);
  const [iTotal,   setITotal]         = useState(0);
  const [iPage,    setIPage]          = useState(1);
  const [iPageSize, setIPageSize]     = useState(25);

  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [error,   setError]           = useState('');
  
  // ── Modal state ──
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ── Load Sales Register data ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    setError('');
    try {
      const res = await tallyApi.getSalesInvoices({
        fromDate,
        toDate,
        ...(search ? { search } : {}),
        page:  activeView === 'vouchers' ? vPage : iPage,
        limit: activeView === 'vouchers' ? vPageSize : iPageSize,
      });
      if (res.success) {
        setVouchers(res.data || []);
        setVTotal(res.total || 0);
        setInvoices(res.invoices || []);
        setITotal(res.invoiceTotal || 0);
      }
    } catch (e) {
      setError(e.message || 'Failed to load Sales Register data');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, search, activeView, vPage, vPageSize, iPage, iPageSize]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── View invoice details ─────────────────────────────────────────────────
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };

  // ── Import Sales Register from Tally ─────────────────────────────────────
  const handleImport = async () => {
    if (!fromDate || !toDate) {
      toast('Please select both From Date and To Date', 'error');
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      toast('From Date must be before To Date', 'error');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      toast(`Importing Sales Register (${fromDate} → ${toDate})…`, 'info');
      const res = await tallyApi.importSalesRegister({ fromDate, toDate });
      setImportResult(res);
      if (res.success) {
        const d = res.data || {};
        toast(`✅ ${res.message}`, 'success');
        await loadData();
      } else {
        toast(`Import failed: ${res.message}`, 'error');
      }
    } catch (e) {
      toast(`Import error: ${e.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  // ── CSV Download ───────────────────────────────────────────────────────────
  const handleDownload = () => {
    const rows = activeView === 'vouchers' ? vouchers : invoices;
    if (rows.length === 0) { toast('No data to download', 'error'); return; }

    const headers = activeView === 'vouchers'
      ? ['Voucher No', 'Date', 'Party', 'Amount', 'Narration', 'Source']
      : ['Invoice No', 'Date', 'Party', 'Total', 'Status', 'Source'];

    const csvRows = rows.map(r =>
      activeView === 'vouchers'
        ? [r.voucherNumber || '', fmtDate(r.voucherDate), `"${(r.partyName||'').replace(/"/g,'""')}"`, r.amount || 0, `"${(r.narration||'').replace(/"/g,'""')}"`, r.source || 'Tally']
        : [r.invoiceNo || '', fmtDate(r.invoiceDate), `"${(r.partyName||'').replace(/"/g,'""')}"`, r.grandTotal || 0, r.status || '', r.source || 'Tally']
    );

    const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-register-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalSales = vTotal + iTotal;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
          📊 Sales Register — Tally Import
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
          Import and view Sri Chakra Sales Register vouchers from Tally (April–June and any date range)
        </p>
      </div>

      {/* ── Import Panel ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
          🔄 Import from Tally — Select Date Range
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>FROM DATE</label>
            <input
              type="date" value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>TO DATE</label>
            <input
              type="date" value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Quick-select buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'Apr–Jun', from: `${fyYear}-04-01`, to: `${fyYear}-06-30` },
              { label: 'Jul–Sep', from: `${fyYear}-07-01`, to: `${fyYear}-09-30` },
              { label: 'Oct–Dec', from: `${fyYear}-10-01`, to: `${fyYear}-12-31` },
              { label: 'Jan–Mar', from: `${fyYear+1}-01-01`, to: `${fyYear+1}-03-31` },
            ].map(q => (
              <button key={q.label}
                onClick={() => { setFromDate(q.from); setToDate(q.to); }}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  background: fromDate === q.from && toDate === q.to ? '#f0fdf4' : '#f8fafc',
                  color: fromDate === q.from && toDate === q.to ? '#16a34a' : '#64748b',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {q.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            style={{ ...primaryBtn, opacity: importing ? 0.6 : 1 }}
          >
            {importing ? '⏳ Importing…' : '⬇️ Import Sales Register'}
          </button>
        </div>

        {/* Import result banner */}
        {importResult && (
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 10,
            background: importResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${importResult.success ? '#bbf7d0' : '#fecaca'}`,
            color: importResult.success ? '#15803d' : '#dc2626',
            fontSize: 13, fontWeight: 600,
          }}>
            {importResult.success ? '✅' : '❌'} {importResult.message}
            {importResult.success && importResult.data && (
              <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 400, color: '#64748b' }}>
                Created: {importResult.data.created ?? 0} · Updated: {importResult.data.updated ?? 0} · Skipped: {importResult.data.skipped ?? 0}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Results Panel ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        {/* Header row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Sales Register: {fromDate} → {toDate}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {vTotal} TallyVoucher records · {iTotal} Invoice records · <strong>{totalSales} total</strong>
            </div>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'vouchers', label: `📋 Vouchers (${vTotal})` },
              { key: 'invoices', label: `🧾 Invoices (${iTotal})` },
            ].map(v => (
              <button key={v.key} onClick={() => setActiveView(v.key)} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                border: activeView === v.key ? '1.5px solid #16a34a' : '1.5px solid #e2e8f0',
                background: activeView === v.key ? '#f0fdf4' : '#f8fafc',
                color: activeView === v.key ? '#16a34a' : '#64748b',
              }}>{v.label}</button>
            ))}
          </div>

          {/* Search */}
          <input
            placeholder="Search party / voucher no…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: 220 }}
          />

          <button style={outlineBtn} onClick={handleDownload}>📥 Download CSV</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? <Spinner /> : (
          <>
            {/* ── Vouchers Table ── */}
            {activeView === 'vouchers' && (
              vouchers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No Sales vouchers found for this date range.</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: '#94a3b8' }}>
                    Click "Import Sales Register" above to pull data from Tally.
                  </div>
                  <div style={{ fontSize: 11, marginTop: 8, color: '#94a3b8' }}>
                    Tip: If import shows 0 records, check Tally → Gateway of Tally → Display → Day Book and verify the Sales voucher type name.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['#', 'Voucher No', 'Date', 'Party', 'PO No.', 'Item Names', 'Amount', 'Actions'].map(h => (
                          <th key={h} className={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((v, i) => (
                        <tr key={v.id || i} className={tr}>
                          <td className={td} style={{ color: '#94a3b8', fontSize: 11 }}>{(vPage - 1) * vPageSize + i + 1}</td>
                          <td className={td} style={{ fontFamily: 'monospace', fontWeight: 700, color: '#15803d', fontSize: 11 }}>{v.voucherNumber || '—'}</td>
                          <td className={td} style={{ whiteSpace: 'nowrap' }}>{fmtDate(v.date || v.voucherDate)}</td>
                          <td className={td} style={{ fontWeight: 600 }}>{v.partyName || '—'}</td>
                          <td className={td} style={{ whiteSpace: 'nowrap' }}>
                            {v.buyersOrderNo
                              ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>{v.buyersOrderNo}</span>
                              : <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                            }
                          </td>
                          <td className={td} style={{ fontSize: 12, color: '#64748b' }}>
                            {v.inventoryEntries?.length > 0 ? (
                              <div style={{ maxWidth: 200 }}>
                                {v.inventoryEntries.slice(0, 2).map((item, idx) => (
                                  <div key={idx} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.stockItemName || '—'}
                                  </div>
                                ))}
                                {v.inventoryEntries.length > 2 && (
                                  <div style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                                    +{v.inventoryEntries.length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td className={td} style={{ fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>{fmt(v.grandTotal || v.amount)}</td>
                          <td className={td}>
                            <button onClick={() => handleViewInvoice(v)} style={{
                              padding: '6px 12px', borderRadius: 6, background: '#0369a1', color: '#fff',
                              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                              fontFamily: 'inherit'
                            }}>View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Invoices Table ── */}
            {activeView === 'invoices' && (
              invoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No Tally-sourced invoices found for this date range.</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: '#94a3b8' }}>Run the import above to populate Invoice records.</div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['#', 'Invoice No', 'Date', 'Party Name', 'PO No.', 'Item Names', 'Grand Total', 'Status', 'Actions'].map(h => (
                          <th key={h} className={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, i) => (
                        <tr key={inv._id || i} className={tr}>
                          <td className={td} style={{ color: '#94a3b8', fontSize: 11 }}>{(iPage - 1) * iPageSize + i + 1}</td>
                          <td className={td} style={{ fontFamily: 'monospace', fontWeight: 700, color: '#15803d', fontSize: 11 }}>{inv.invoiceNo || inv.voucherNumber || '—'}</td>
                          <td className={td} style={{ whiteSpace: 'nowrap' }}>{fmtDate(inv.invoiceDate || inv.voucherDate)}</td>
                          <td className={td} style={{ fontWeight: 600 }}>{inv.partyName || '—'}</td>
                          <td className={td} style={{ whiteSpace: 'nowrap' }}>
                            {inv.buyersOrderNo
                              ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>{inv.buyersOrderNo}</span>
                              : <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                            }
                          </td>
                          <td className={td} style={{ fontSize: 12, color: '#64748b' }}>
                            {(inv.inventoryEntries || inv.items || [])?.length > 0 ? (
                              <div style={{ maxWidth: 200 }}>
                                {(inv.inventoryEntries || inv.items || []).slice(0, 2).map((item, idx) => (
                                  <div key={idx} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.stockItemName || item.description || '—'}
                                  </div>
                                ))}
                                {(inv.inventoryEntries || inv.items || []).length > 2 && (
                                  <div style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                                    +{(inv.inventoryEntries || inv.items || []).length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td className={td} style={{ fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>{fmt(inv.grandTotal || inv.amount)}</td>
                          <td className={td}>
                            <Badge
                              text={inv.status || 'Imported'}
                              color={inv.status === 'Paid' ? '#15803d' : inv.status === 'Sent' ? '#0369a1' : '#6b7280'}
                              bg={inv.status === 'Paid' ? '#f0fdf4' : inv.status === 'Sent' ? '#e0f2fe' : '#f1f5f9'}
                            />
                          </td>
                          <td className={td}>
                            <button onClick={() => handleViewInvoice(inv)} style={{
                              padding: '6px 12px', borderRadius: 6, background: '#0369a1', color: '#fff',
                              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                              fontFamily: 'inherit'
                            }}>View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Pagination */}
            {activeView === 'vouchers' && vTotal > 0 && (
              <Pagination total={vTotal} page={vPage} pageSize={vPageSize} onPage={setVPage} onPageSize={setVPageSize} />
            )}
            {activeView === 'invoices' && iTotal > 0 && (
              <Pagination total={iTotal} page={iPage} pageSize={iPageSize} onPage={setIPage} onPageSize={setIPageSize} />
            )}
          </>
        )}
      </div>

      {/* ── Debug Info Panel ── */}
      <div style={{ background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a', padding: '14px 18px', marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
          🔍 Troubleshooting Guide — If Sales Register shows 0 records after import
        </div>
        <ol style={{ fontSize: 12, color: '#78350f', margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Verify Tally is running and the correct company <strong>"MANUFACTURING ERP"</strong> is open</li>
          <li>In Tally: Gateway of Tally → Display → Day Book → check Sales voucher type name exactly</li>
          <li>The system matches these Sales voucher type names: <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 4 }}>Sales, Sales Invoice, Tax Invoice, GST Invoice, GST Sales Invoice, Invoice, Retail Invoice, Sales Bill, Sales Order</code></li>
          <li>If your Tally uses a <strong>custom voucher type</strong> (e.g., "Sri Chakra Sales"), add it by opening <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 4 }}>tallyFetchEngine.js</code> → find <code>Sales.voucherTypes</code> array and add the exact name</li>
          <li>Check backend logs for: <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 4 }}>[parseVouchers] All voucher types found in XML:</code> to see what types Tally is returning</li>
          <li>Tally DB storage: <strong>TallyVoucher</strong> collection (voucherType: 'Sales') + <strong>Invoice</strong> collection (source: 'Tally')</li>
        </ol>
      </div>

      {/* ── Invoice Detail Modal ── */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}
