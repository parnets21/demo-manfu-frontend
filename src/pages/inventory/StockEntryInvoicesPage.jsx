import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import { stockInvoiceArchiveApi } from '../../api/invoiceApi';
import { CHAKRA_LOGO_B64 } from '../../assets/chakraLogoB64';
import Modal from '../../components/common/Modal';
import {
  MdReceipt, MdSearch, MdPrint, MdDownload, MdVisibility, MdDelete,
  MdCurrencyRupee, MdFilterList, MdInventory2,
} from 'react-icons/md';
import Pagination from '../../components/common/Pagination';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n) => `\u20B9${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtD = (d) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '\u2014'; }
};

const STATUS_STYLE = {
  Draft:     { bg: '#f1f5f9', color: '#64748b' },
  Approved:  { bg: '#dcfce7', color: '#16a34a' },
  Sent:      { bg: '#dbeafe', color: '#1d4ed8' },
  Paid:      { bg: '#f0fdf4', color: '#15803d' },
  Cancelled: { bg: '#fee2e2', color: '#dc2626' },
};

// ── printable invoice HTML ────────────────────────────────────────────────────
function buildHTML(inv) {
  const n   = (v) => Number(v) || 0;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const items  = inv.items || [];
  const rows   = items.map((it, i) => {
    const taxable = n(it.basic) || n(it.amount) || n(it.qty) * n(it.rate);
    const tax     = n(it.taxAmount);
    const total   = n(it.total) || taxable + tax;
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${esc(it.description)}</td>
      <td style="text-align:center">${esc(it.hsn || '')}</td>
      <td style="text-align:right">${n(it.qty)} ${esc(it.unit || '')}</td>
      <td style="text-align:right">${fmt(it.rate)}</td>
      <td style="text-align:right">${fmt(taxable)}</td>
      <td style="text-align:right">${n(it.taxRate)}%</td>
      <td style="text-align:right;color:#1d4ed8">${fmt(n(it.cgst))}</td>
      <td style="text-align:right;color:#1d4ed8">${fmt(n(it.sgst))}</td>
      <td style="text-align:right;font-weight:700;color:#1e40af">${fmt(total)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Manual Stock Invoice &mdash; ${esc(inv.invoiceNo)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:10px;color:#111}
.page{max-width:860px;margin:0 auto;padding:16px 18px;border:1px solid #ccc}
.header{display:flex;align-items:flex-start;gap:12px;padding-bottom:10px;border-bottom:2px solid #111;margin-bottom:8px}
.logo img{width:46px;height:46px;object-fit:contain;border-radius:5px}
.co-name{font-size:14px;font-weight:900}
.co-sub{font-size:8.5px;color:#555;line-height:1.5;margin-top:2px}
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:9px;font-weight:700;background:#fef3c7;color:#92400e;border:1px solid #fde68a;margin-top:4px}
.inv-box{text-align:right;min-width:160px}
.inv-box table{margin-left:auto;border-collapse:collapse}
.inv-box td{padding:2px 4px;font-size:9px}
.inv-box td:first-child{font-weight:700;text-align:right}
.party-row{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ccc;border-top:none;margin-bottom:0}
.party-cell{padding:7px 10px}
.party-cell+.party-cell{border-left:1px solid #ccc}
.party-label{font-size:8px;font-weight:700;text-transform:uppercase;color:#777;margin-bottom:2px}
.party-name{font-size:11px;font-weight:800}
.party-detail{font-size:8.5px;color:#444;line-height:1.5}
table.items{width:100%;border-collapse:collapse}
table.items th{background:#1e293b;color:#e2e8f0;padding:5px 4px;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #334155;white-space:nowrap}
table.items td{padding:5px 4px;font-size:9px;border-bottom:1px solid #eee}
.tot-row td{font-weight:800;background:#f8fafc;border-top:2px solid #ccc}
.summary{display:flex;justify-content:flex-end;border:1px solid #ccc;border-top:none;padding:10px 14px}
.summary-box{min-width:230px}
.sr{display:flex;justify-content:space-between;margin-bottom:3px;font-size:10.5px}
.sr-total{display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:6px;font-size:13px;font-weight:900;color:#1e40af}
.footer{border:1px solid #ccc;border-top:none;padding:6px 14px;font-size:8.5px;color:#666;text-align:center}
@media print{@page{size:A4;margin:8mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{border:none;padding:0}}
</style></head><body><div class="page">
<div class="header">
  <div class="logo"><img src="${CHAKRA_LOGO_B64}" alt="Manufacturing ERP"/></div>
  <div style="flex:1">
    <div class="co-name">Manufacturing ERP</div>
    <div class="co-sub">#13/14, Azeez Sait Industrial Estate, Mysore Road, Nayandahalli, Bangalore - 560039<br/>GSTIN: 29ABWFS0002M1ZR</div>
    <span class="badge">Manual Stock Entry Invoice</span>
  </div>
  <div class="inv-box">
    <table>
      <tr><td>Invoice No.</td><td><strong>${esc(inv.invoiceNo)}</strong></td></tr>
      <tr><td>Date</td><td>${fmtD(inv.invoiceDate || inv.createdAt)}</td></tr>
      <tr><td>Type</td><td>Manual Stock Entry</td></tr>
    </table>
  </div>
</div>
<div class="party-row">
  <div class="party-cell">
    <div class="party-label">Entry By</div>
    <div class="party-name">Manufacturing ERP</div>
    <div class="party-detail">${esc(inv.companyAddress || '')}</div>
  </div>
  <div class="party-cell">
    <div class="party-label">Notes</div>
    <div class="party-detail">${esc(inv.notes || '&mdash;')}</div>
  </div>
</div>
<div style="border:1px solid #ccc;border-top:none;overflow:hidden">
<table class="items">
  <thead><tr>
    <th>#</th><th>Item Description</th><th style="text-align:center">HSN</th>
    <th style="text-align:right">Qty</th><th style="text-align:right">Rate</th>
    <th style="text-align:right">Taxable</th><th style="text-align:right">GST%</th>
    <th style="text-align:right">CGST</th><th style="text-align:right">SGST</th>
    <th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="tot-row">
    <td colspan="5" style="text-align:right;padding-right:8px">TOTALS</td>
    <td style="text-align:right">${fmt(inv.subtotal)}</td>
    <td></td>
    <td style="text-align:right;color:#1d4ed8">${fmt(n(inv.totalTax) / 2)}</td>
    <td style="text-align:right;color:#1d4ed8">${fmt(n(inv.totalTax) / 2)}</td>
    <td style="text-align:right;color:#1e40af">${fmt(inv.grandTotal)}</td>
  </tr></tfoot>
</table>
</div>
<div class="summary">
  <div class="summary-box">
    <div class="sr"><span>Subtotal (Taxable)</span><span>${fmt(inv.subtotal)}</span></div>
    <div class="sr"><span>Total GST</span><span>${fmt(inv.totalTax)}</span></div>
    <div class="sr-total"><span>Grand Total</span><span>${fmt(inv.grandTotal)}</span></div>
  </div>
</div>
${inv.notes ? `<div style="border:1px solid #ccc;border-top:none;padding:6px 14px;font-size:9.5px;color:#475569"><strong>Notes:</strong> ${esc(inv.notes)}</div>` : ''}
<div class="footer">Manual Stock Entry Invoice &middot; Auto-generated by Manufacturing ERP</div>
</div></body></html>`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StockEntryInvoicesPage() {
  const navigate    = useNavigate();
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewInv, setViewInv]     = useState(null);
  const [updating, setUpdating]   = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const searchTimer = useRef(null);
  const initialLoadDone = useRef(false);

  // KPI stats from dedicated endpoint
  const [stats, setStats] = useState({ total: 0, draft: 0, approved: 0, paid: 0, totalValue: 0 });

  // Server-side paginated fetch
  const fetchInvoices = useCallback(async (p = 1, size = 25, q = '', status = '') => {
    setLoading(true);
    try {
      const params = { page: p, limit: size };
      if (q.trim()) params.search = q.trim();
      if (status) params.status = status;

      const res = await stockInvoiceArchiveApi.getAll(params);
      setInvoices(res.data || []);
      setTotalRecords(res.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await stockInvoiceArchiveApi.getStats();
      if (res.success) setStats(res.data);
    } catch (e) { console.error(e); }
  }, []);

  // Initial load — auto-sync archive if empty then fetch
  useEffect(() => {
    const initLoad = async () => {
      try {
        // Try syncing archive from main invoices collection (backfills any missing)
        await stockInvoiceArchiveApi.sync();
      } catch (e) { console.warn('Archive sync skipped:', e.message); }
      fetchStats();
      fetchInvoices(page, pageSize, search, statusFilter);
    };
    initLoad();
  }, []); // eslint-disable-line

  // Refetch when page or pageSize changes (after initial load)
  useEffect(() => {
    if (!initialLoadDone.current) { initialLoadDone.current = true; return; }
    fetchInvoices(page, pageSize, search, statusFilter);
  }, [page, pageSize]); // eslint-disable-line

  // Debounced search — refetch from page 1
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchInvoices(1, pageSize, search, statusFilter);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search, statusFilter]); // eslint-disable-line

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await stockInvoiceArchiveApi.updateStatus(id, status);
      setInvoices(prev => prev.map(inv => inv._id === id ? { ...inv, status } : inv));
      if (viewInv?._id === id) setViewInv(prev => ({ ...prev, status }));
      fetchStats(); // refresh KPI
    } catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  };

  const handleDelete = async (id, invoiceNo) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNo}? This cannot be undone.`)) return;
    try {
      await stockInvoiceArchiveApi.delete(id);
      setInvoices(prev => prev.filter(inv => inv._id !== id));
      setTotalRecords(prev => prev - 1);
      if (viewInv?._id === id) setViewInv(null);
      fetchStats();
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const handlePrint = (inv) => {
    const w = window.open('', '_blank');
    w.document.write(buildHTML(inv));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const handleDownload = async (inv) => {
    setDownloading(inv._id);
    try {
      const { default: jsPDF }       = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:860px;height:1100px;border:none;visibility:hidden';
      document.body.appendChild(iframe);
      await new Promise(r => { iframe.onload = r; iframe.srcdoc = buildHTML(inv); });
      await new Promise(r => setTimeout(r, 500));
      try {
        const doc    = iframe.contentDocument || iframe.contentWindow.document;
        const page   = doc.querySelector('.page') || doc.body;
        const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
        const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW  = 210;
        const ratio  = pageW / (canvas.width / 2);
        const h      = (canvas.height / 2) * ratio;
        let y = 0; let first = true;
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
    } catch (e) { alert('PDF generation failed: ' + e.message); }
    finally { setDownloading(null); }
  };

  const kpis = [
    { label: 'Total Invoices', value: stats.total,    icon: <MdReceipt size={18} />,        color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.2)' },
    { label: 'Total Value', value: fmt(stats.totalValue || 0), icon: <MdCurrencyRupee size={18} />, color: '#7c3aed', color2: '#8b5cf6', glow: 'rgba(124,58,237,0.2)' },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Entry Invoices"
        breadcrumb="Inventory › Stock Entry Invoices"
        action={
          <button
            onClick={() => navigate('/inventory/stock-items')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(185,28,28,0.3)' }}
          >
            <MdInventory2 size={15} /> Add Stock Item
          </button>
        }
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
              placeholder="Search invoice no., SKU, item name…"
              style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <MdFilterList size={16} color="#94a3b8" />
            {['', 'Draft', 'Approved', 'Paid', 'Cancelled'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', background: statusFilter === s ? '#1e40af' : '#f1f5f9', color: statusFilter === s ? '#fff' : '#475569' }}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <MdReceipt size={42} style={{ color: '#e2e8f0', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>No stock entry invoices yet</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              Invoices are created automatically when a stock item is added with a quantity &gt; 0.<br />
              Go to <strong>Stock Items</strong> and add an item with initial quantity to generate the first invoice.
            </div>
            <button onClick={() => navigate('/inventory/stock-items')}
              style={{ marginTop: 16, padding: '8px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
              Go to Stock Items
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['#', 'Invoice No.', 'Item', 'Qty', 'Unit Price', 'Grand Total', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => {
                    const sc   = STATUS_STYLE[inv.status] || STATUS_STYLE.Draft;
                    const item = inv.items?.[0] || {};
                    const rowNum = (page - 1) * pageSize + i + 1;
                    return (
                      <tr key={inv._id} style={{ borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '11px 12px', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{rowNum}</td>
                        <td style={{ padding: '11px 12px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{inv.invoiceNo}</span>
                          <span style={{ marginLeft: 6, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>
                            📦 Stock Entry
                          </span>
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 13, color: '#1e293b', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description || '\u2014'}
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 13, color: '#1e293b', fontWeight: 700 }}>
                          {item.qty ?? '\u2014'} <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.unit}</span>
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 13, color: '#475569' }}>
                          {item.rate ? fmt(item.rate) : '\u2014'}
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                          {fmt(inv.grandTotal)}
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {fmtD(inv.invoiceDate || inv.createdAt)}
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => setViewInv(inv)} title="View"
                              style={{ padding: '5px 10px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MdVisibility size={13} /> View
                            </button>
                            <button onClick={() => handlePrint(inv)} title="Print"
                              style={{ padding: '5px 10px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MdPrint size={13} />
                            </button>
                            <button onClick={() => handleDownload(inv)} disabled={downloading === inv._id} title="PDF"
                              style={{ padding: '5px 10px', background: downloading === inv._id ? '#f1f5f9' : '#fef9c3', color: '#a16207', border: 'none', borderRadius: 7, fontSize: 12, cursor: downloading === inv._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: downloading === inv._id ? 0.6 : 1 }}>
                              <MdDownload size={13} /> {downloading === inv._id ? '…' : 'PDF'}
                            </button>
                            <button onClick={() => handleDelete(inv._id, inv.invoiceNo)} title="Delete"
                              style={{ padding: '5px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MdDelete size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              total={totalRecords}
              page={page}
              pageSize={pageSize}
              onPage={p => setPage(p)}
              onPageSize={s => { setPageSize(s); setPage(1); }}
            />
          </>
        )}
      </PageCard>

      {/* ΓöÇΓöÇ View / Approve Modal ΓöÇΓöÇ */}
      <Modal
        open={!!viewInv}
        onClose={() => setViewInv(null)}
      title={`Stock Entry Invoice — ${viewInv?.invoiceNo}`}
        size="xl"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {viewInv?.status === 'Draft' && (
                <button onClick={() => handleStatusUpdate(viewInv._id, 'Approved')} disabled={!!updating}
                  style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✔ Approve
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
                style={{ padding: '8px 14px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <MdPrint size={15} /> Print
              </button>
                <button onClick={() => viewInv && handleDownload(viewInv)} disabled={downloading === viewInv?._id}
                style={{ padding: '8px 14px', background: '#fefce8', color: '#a16207', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: downloading === viewInv?._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: downloading === viewInv?._id ? 0.6 : 1 }}>
                <MdDownload size={15} /> {downloading === viewInv?._id ? 'Generating…' : 'PDF'}
              </button>
              <button onClick={() => setViewInv(null)}
                style={{ padding: '8px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Close
              </button>
            </div>
          </div>
        }
      >
        {viewInv && (
          <>
            {/* Summary strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Invoice No.', value: viewInv.invoiceNo, mono: true },
                { label: 'Item',        value: viewInv.items?.[0]?.description || '\u2014' },
                { label: 'Qty',         value: `${viewInv.items?.[0]?.qty ?? '\u2014'} ${viewInv.items?.[0]?.unit || ''}` },
                { label: 'Grand Total', value: fmt(viewInv.grandTotal), bold: true, color: '#1e40af' },
                { label: 'Status', value: viewInv.status },
                { label: 'Date', value: fmtD(viewInv.invoiceDate || viewInv.createdAt) },
              ].map(({ label, value, mono, bold, color }) => (
                <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: color || '#1e293b', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
                </div>
              ))}
            </div>
            {/* Invoice preview */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: buildHTML(viewInv) }}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
