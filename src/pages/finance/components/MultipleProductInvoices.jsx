import { MdVisibility, MdPrint, MdDownload, MdShare, MdDelete, MdContentCopy } from 'react-icons/md';
import { MdWhatsapp, MdEmail as MdEnvelope } from 'react-icons/md';
import { useState } from 'react';
import { invoiceApi } from '../../../api/invoiceApi';
import { toast } from '../../../components/common/Toast';

const RED = '#1e40af'; const RED_LIGHT = '#ef4444'; const GREEN = '#22c55e';
const BLUE = '#3b82f6'; const TEXT_DARK = '#0f172a'; const TEXT_MID = '#475569'; const TEXT_LIGHT = '#94a3b8';
const ACCENT_COLOR = '#1d4ed8'; const ACCENT_BG = '#eff6ff'; const ACCENT_BORDER = '#bfdbfe';

export default function MultipleProductInvoices({
  invoices, total, page, PAGE_SIZE, setPage,
  search, setSearch, searchRef,
  handleStatusChange, handlePrint, handleDownload, handleShare,
  shareMenuInv, shareViaWhatsApp, shareViaGmail, shareViaCopy,
  handleDelete, setSelectedInvoice, setShowView, onTallySent,
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ background: '#fff', borderRadius: 18, border: `1.5px solid ${ACCENT_BORDER}`, boxShadow: '0 2px 12px rgba(15,23,42,0.06)', overflow: 'hidden', marginBottom: 24 }}>

      {/* ── Header ── */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: ACCENT_BG }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENT_COLOR, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: TEXT_DARK }}>Multiple Products Invoices</div>
            <div style={{ fontSize: 11, color: TEXT_MID, marginTop: 1 }}>Customers with bulk / combined orders</div>
          </div>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fff', color: ACCENT_COLOR, border: `1px solid ${ACCENT_BORDER}` }}>{total} invoices</span>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_LIGHT, fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, invoice no, PO..."
            style={{ paddingLeft: 32, paddingRight: search ? 32 : 12, paddingTop: 7, paddingBottom: 7, border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: TEXT_DARK, background: '#fff', outline: 'none', width: 240, fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = ACCENT_COLOR}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: TEXT_LIGHT, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {invoices.length === 0 ? (
        <div style={{ padding: '36px 20px', textAlign: 'center', color: TEXT_LIGHT, fontSize: 13 }}>No multi-product invoices yet. Upload an Excel file with grouped orders.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', 'Invoice No', 'Unique ID', 'PO Number', 'PO Date', 'Ship To', 'City', 'State', 'Products', 'Brand', 'Total Qty', 'Dispatch Date', 'AWB', 'Courier', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e8edf2', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const item = inv.items?.[0] || {};
                const totalQty = inv.items?.reduce((s, it) => s + (Number(it.qty) || 0), 0) ?? 0;
                return (
                  <tr key={inv._id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                    <td style={{ padding: '9px 12px', color: TEXT_LIGHT, fontWeight: 700, fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, color: RED, whiteSpace: 'nowrap' }}>{inv.invoiceNo}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: TEXT_MID, whiteSpace: 'nowrap' }}>{inv.uniqueId || '—'}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: BLUE, whiteSpace: 'nowrap' }}>{inv.purchaseOrderRef || '—'}</td>
                    <td style={{ padding: '9px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.poDate || '—'}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: TEXT_DARK, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.partyName}>{inv.partyName}</td>
                    <td style={{ padding: '9px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.partyCity || '—'}</td>
                    <td style={{ padding: '9px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.partyState || '—'}</td>
                    <td style={{ padding: '9px 12px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={inv.items?.map(it => it.description).join(', ')}>
                      <span style={{ fontWeight: 600, color: TEXT_DARK }}>{item.description}</span>
                      {inv.items?.length > 1 && (
                        <span style={{ marginLeft: 5, fontSize: 10, background: ACCENT_BG, color: ACCENT_COLOR, borderRadius: 10, padding: '1px 6px', fontWeight: 700, border: `1px solid ${ACCENT_BORDER}` }}>+{inv.items.length - 1} more</span>
                      )}
                    </td>
                    <td style={{ padding: '9px 12px', color: TEXT_MID, whiteSpace: 'nowrap' }}>{inv.brandName || '—'}</td>
                    <td style={{ padding: '9px 12px', color: TEXT_DARK, fontWeight: 700, textAlign: 'center' }}>{totalQty}</td>
                    <td style={{ padding: '9px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.dispatchDate || '—'}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: TEXT_MID, whiteSpace: 'nowrap' }}>{inv.awb || '—'}</td>
                    <td style={{ padding: '9px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.courierName || '—'}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <ActionButtons inv={inv} handlePrint={handlePrint} handleDownload={handleDownload}
                        handleShare={handleShare} shareMenuInv={shareMenuInv}
                        shareViaWhatsApp={shareViaWhatsApp} shareViaGmail={shareViaGmail} shareViaCopy={shareViaCopy}
                        handleDelete={handleDelete} setSelectedInvoice={setSelectedInvoice} setShowView={setShowView}
                        onTallySent={onTallySent} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      <Pagination page={page} setPage={setPage} totalPages={totalPages} total={total} PAGE_SIZE={PAGE_SIZE} accentColor={ACCENT_COLOR} />
    </div>
  );
}

function ActionButtons({ inv, handlePrint, handleDownload, handleShare, shareMenuInv, shareViaWhatsApp, shareViaGmail, shareViaCopy, handleDelete, setSelectedInvoice, setShowView, onTallySent }) {
  const [sending, setSending] = useState(false);

  const handleSendToTally = async () => {
    if (sending) return;
    setSending(true);
    try {
      const result = await invoiceApi.sendToTally(inv._id);
      if (result.success) {
        toast(`✅ ${inv.invoiceNo} sent to Tally`, 'success');
        if (onTallySent) onTallySent(result.data);
      } else {
        toast(result.message || 'Failed to send to Tally', 'error');
      }
    } catch (e) {
      toast(e.message || 'Failed to send to Tally', 'error');
    } finally {
      setSending(false);
    }
  };

  const isSynced = inv.tallySync === true;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button onClick={() => { setSelectedInvoice(inv); setShowView(true); }} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="View"><MdVisibility size={13} color={BLUE} /></button>
      <button onClick={() => handlePrint(inv)} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Print"><MdPrint size={13} color={TEXT_MID} /></button>
      <button onClick={() => handleDownload(inv)} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Download"><MdDownload size={13} color={GREEN} /></button>
      <div style={{ position: 'relative' }}>
        <button onClick={e => { e.stopPropagation(); handleShare(inv); }} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #dbeafe', background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Share"><MdShare size={13} color="#3b82f6" /></button>
        {shareMenuInv?._id === inv._id && (
          <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden' }}>
            <button onClick={() => shareViaWhatsApp(inv)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#1a1a2e', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><MdWhatsapp size={16} color="#25D366" /> WhatsApp</button>
            <button onClick={() => shareViaGmail(inv)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#1a1a2e', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><MdEnvelope size={16} color="#EA4335" /> Gmail</button>
            <button onClick={() => shareViaCopy(inv)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#1a1a2e', fontFamily: 'inherit', borderTop: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><MdContentCopy size={16} color="#64748b" /> Copy Details</button>
          </div>
        )}
      </div>
      {/* ── Send to Tally ── */}
      <button
        onClick={handleSendToTally}
        disabled={sending}
        title={isSynced ? 'Already synced to Tally — click to re-send' : 'Send to Tally'}
        style={{
          padding: '3px 8px', borderRadius: 6, border: 'none', cursor: sending ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
          background: isSynced ? '#f0fdf4' : '#eff6ff',
          color: isSynced ? '#16a34a' : '#2563eb',
          opacity: sending ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {sending ? '⏳' : isSynced ? '✅' : '📤'} {sending ? 'Sending…' : 'Tally'}
      </button>
      <button onClick={() => handleDelete(inv._id, inv.invoiceNo)} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete"><MdDelete size={13} color={RED_LIGHT} /></button>
    </div>
  );
}

function Pagination({ page, setPage, totalPages, total, PAGE_SIZE, accentColor }) {
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e8edf2', background: '#fafafa' }}>
      <div style={{ fontSize: 12, color: TEXT_LIGHT }}>
        {total === 0 ? 'No records' : `Showing ${from}–${to} of ${total}`}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === 1 ? '#f1f5f9' : '#fff', color: page === 1 ? TEXT_LIGHT : TEXT_DARK, cursor: page === 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 600 }}>«</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === 1 ? '#f1f5f9' : '#fff', color: page === 1 ? TEXT_LIGHT : TEXT_DARK, cursor: page === 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 600 }}>‹ Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2).reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...'); acc.push(n); return acc; }, []).map((n, idx) =>
          n === '...' ? <span key={`e-${idx}`} style={{ padding: '5px 6px', fontSize: 12, color: TEXT_LIGHT }}>…</span>
          : <button key={n} onClick={() => setPage(n)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: n === page ? 'none' : '1px solid #e2e8f0', background: n === page ? accentColor : '#fff', color: n === page ? '#fff' : TEXT_DARK, minWidth: 32 }}>{n}</button>
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === totalPages ? '#f1f5f9' : '#fff', color: page === totalPages ? TEXT_LIGHT : TEXT_DARK, cursor: page === totalPages ? 'default' : 'pointer', fontSize: 12, fontWeight: 600 }}>Next ›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === totalPages ? '#f1f5f9' : '#fff', color: page === totalPages ? TEXT_LIGHT : TEXT_DARK, cursor: page === totalPages ? 'default' : 'pointer', fontSize: 12, fontWeight: 600 }}>»</button>
      </div>
    </div>
  );
}
