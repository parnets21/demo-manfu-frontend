import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import {
  MdArrowBack, MdBusiness, MdRefresh, MdUploadFile, MdSearch,
  MdExpandMore, MdExpandLess, MdPictureAsPdf, MdSave, MdEdit, MdChevronRight,
} from 'react-icons/md';

const money = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateTime = (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const API_ORIGIN = (import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : '')).replace(/\/api\/?$/, '');
const fileUrl = (p) => (p ? (p.startsWith('http') ? p : `${API_ORIGIN}${p}`) : '');

const STATUS_COLORS = {
  Completed: { bg: '#f0fdf4', color: '#15803d' },
  Partial:   { bg: '#eff6ff', color: '#1d4ed8' },
  Pending:   { bg: '#fef9c3', color: '#92400e' },
};

export default function POCompanyPage() {
  const { companyId: paramId } = useParams();
  const navigate = useNavigate();

  // ── Company list (level 1) ──────────────────────────────────────────────────
  const [companies, setCompanies]               = useState([]);   // summary rows
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [search, setSearch]                     = useState('');

  // ── Selected company detail (level 2) ───────────────────────────────────────
  const [selectedId, setSelectedId]       = useState(paramId || '');
  const [detail, setDetail]               = useState(null); // { company, totals, pos }
  const [detailLoading, setDetailLoading] = useState(false);
  const [expanded, setExpanded]           = useState({});   // poId -> bool
  const [editing, setEditing]             = useState(null); // { poId, itemId }
  const [editVal, setEditVal]             = useState(0);
  const [savingItem, setSavingItem]       = useState(false);

  // ── Load company summaries ──────────────────────────────────────────────────
  const loadCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const res = await poGeneratorApi.getPOCompaniesSummary();
      setCompanies(res.data || []);
    } catch { /* non-critical */ }
    finally { setCompaniesLoading(false); }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return; }
    setDetailLoading(true);
    try { const res = await poGeneratorApi.getPOCompanyDetail(id); setDetail(res.data || null); }
    catch { setDetail(null); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  // Keep URL in sync with the selection, and load the chosen company's detail.
  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
      navigate(`/po-generator/companies/${selectedId}`, { replace: true });
    } else {
      setDetail(null);
      navigate('/po-generator/companies', { replace: true });
    }
  }, [selectedId]); // eslint-disable-line

  const openCompany = (id) => setSelectedId(String(id || 'none'));
  const backToList  = () => setSelectedId('');

  const filteredCompanies = companies.filter(c =>
    !search.trim() || (c.companyName || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggleExpand = (poId) => setExpanded(prev => ({ ...prev, [poId]: !prev[poId] }));

  const startEdit = (poId, item) => {
    setEditing({ poId, itemId: item._id });
    setEditVal(Number(item.sentQty) || 0);
  };

  const saveSent = async (poId, item) => {
    setSavingItem(true);
    try {
      const capped = Math.max(0, Math.min(Number(editVal) || 0, Number(item.requiredQty) || 0));
      await poGeneratorApi.updatePOUploadItem(poId, item._id, { sentQty: capped });
      setDetail(prev => {
        if (!prev) return prev;
        const pos = prev.pos.map(po => {
          if (String(po._id) !== String(poId)) return po;
          const items = po.items.map(it => String(it._id) === String(item._id)
            ? { ...it, sentQty: capped, remaining: Math.max(0, (it.requiredQty || 0) - capped) }
            : it);
          const totalRequired = items.reduce((s, i) => s + (i.requiredQty || 0), 0);
          const totalSent = items.reduce((s, i) => s + (i.sentQty || 0), 0);
          const totalRemaining = Math.max(0, totalRequired - totalSent);
          return { ...po, items, totalRequired, totalSent, totalRemaining, status: totalRemaining === 0 && totalRequired > 0 ? 'Completed' : totalSent > 0 ? 'Partial' : 'Pending' };
        });
        const totalRequired = pos.reduce((s, p) => s + (p.totalRequired || 0), 0);
        const totalSent = pos.reduce((s, p) => s + (p.totalSent || 0), 0);
        return { ...prev, pos, totals: { ...prev.totals, totalRequired, totalSent, totalRemaining: Math.max(0, totalRequired - totalSent) } };
      });
      setEditing(null);
    } catch (e) { alert(e.message || 'Save failed'); }
    finally { setSavingItem(false); }
  };

  const totals = detail?.totals || { poCount: 0, totalRequired: 0, totalSent: 0, totalRemaining: 0 };
  const pct = totals.totalRequired > 0 ? Math.round((totals.totalSent / totals.totalRequired) * 100) : 0;

  const inputSm = { padding: '6px 9px', border: '1.5px solid #86efac', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', width: 70, background: '#f0fdf4' };
  const card = { background: '#fff', borderRadius: 16, border: '1px solid #e8edf2', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' };

  const showDetail = !!selectedId;

  return (
    <div style={{ padding: '24px 28px', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'inherit' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => showDetail ? backToList() : navigate('/po-generator/upload')}
            style={{ width: 36, height: 36, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
            title={showDetail ? 'Back to companies' : 'Back to upload'}>
            <MdArrowBack size={18} />
          </button>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
            <MdBusiness size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {showDetail ? (detail?.company?.companyName || 'Company') : 'Companies'}
            </h1>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {showDetail ? 'All uploaded POs with item Required / Sent / Remaining' : 'Click a company to view its POs and item status'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/po-generator/upload')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <MdUploadFile size={16} /> Upload PO
        </button>
      </div>

      {/* ══════════════ LEVEL 1 — COMPANY LIST ══════════════ */}
      {!showDetail && (
        <>
          {/* Search */}
          <div style={{ ...card, padding: '16px 20px', marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <MdSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company by name… (e.g. GRT Jewellers)"
                  style={{ width: '100%', height: 42, padding: '0 14px 0 38px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={loadCompanies}
                style={{ height: 42, width: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', color: '#475569', cursor: 'pointer' }}>
                <MdRefresh size={17} style={{ animation: companiesLoading ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

          {/* Company cards grid */}
          {companiesLoading ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>Loading companies…</div>
          ) : filteredCompanies.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              {search ? 'No company matches your search.' : 'No companies with uploaded POs yet. Upload a PO first.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
              {filteredCompanies.map(co => {
                const cpct = co.totalRequired > 0 ? Math.round((co.totalSent / co.totalRequired) * 100) : 0;
                return (
                  <div key={co.companyId || 'none'} onClick={() => openCompany(co.companyId || 'none')}
                    style={{ ...card, padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(14,165,233,0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = 'none'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MdBusiness size={19} color="#fff" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{co.companyName || 'Unassigned'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{co.poCount} PO{co.poCount === 1 ? '' : 's'} · updated {formatDateTime(co.lastUpload)}</div>
                      </div>
                      <MdChevronRight size={20} color="#cbd5e1" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                      {[['Ordered', co.totalRequired, '#0f172a'], ['Sent', co.totalSent, '#16a34a'], ['Remaining', co.totalRemaining, '#1e40af']].map(([l, v, c]) => (
                        <div key={l} style={{ background: '#f8fafc', border: '1px solid #eef2f6', borderRadius: 9, padding: '7px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 17, fontWeight: 900, color: c }}>{v}</div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>Dispatch</span>
                      <span style={{ fontSize: 10.5, fontWeight: 900, color: cpct === 100 ? '#16a34a' : '#0284c7' }}>{cpct}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 99, background: '#e0f2fe', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${cpct}%`, background: cpct === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#0ea5e9,#0284c7)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════ LEVEL 2 — SELECTED COMPANY DETAIL ══════════════ */}
      {showDetail && (
        <>
          {/* Back to companies bar */}
          <button onClick={backToList}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', color: '#0284c7', border: '1.5px solid #bae6fd', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
            <MdArrowBack size={15} /> All Companies
          </button>

          {/* Company totals */}
          {detail && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
              {[
                ['Total POs', totals.poCount, '#6366f1'],
                ['Total Ordered', totals.totalRequired, '#0f172a'],
                ['Total Sent', totals.totalSent, '#16a34a'],
                ['Total Remaining', totals.totalRemaining, '#1e40af'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ ...card, padding: '14px 18px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color, marginTop: 4 }}>{value}</div>
                </div>
              ))}
              <div style={{ ...card, padding: '14px 18px', gridColumn: 'span 2', minWidth: 220 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Dispatch progress</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: pct === 100 ? '#16a34a' : '#0284c7' }}>{pct}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 99, background: '#e0f2fe', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, transition: 'width 0.6s ease', background: pct === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#0ea5e9,#0284c7)' }} />
                </div>
              </div>
            </div>
          )}

          {/* PO list — each expandable to item detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {detailLoading && <div style={{ textAlign: 'center', padding: 40, color: '#6366f1', fontWeight: 600 }}>Loading…</div>}

            {!detailLoading && detail && detail.pos.length === 0 && (
              <div style={{ ...card, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                No POs uploaded for this company yet.
              </div>
            )}

            {!detailLoading && detail && detail.pos.map(po => {
              const sc = STATUS_COLORS[po.status] || STATUS_COLORS.Pending;
              const isOpen = !!expanded[po._id];
              return (
                <div key={po._id} style={{ ...card, overflow: 'hidden' }}>
                  {/* PO header row */}
                  <div onClick={() => toggleExpand(po._id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', flexWrap: 'wrap' }}>
                    <button style={{ width: 30, height: 30, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isOpen ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{po.poNumber || '(no PO number)'}</div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{(po.items || []).length} item(s) · uploaded {formatDateTime(po.createdAt)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 18, fontSize: 12.5, fontWeight: 700, flexWrap: 'wrap' }}>
                      <span style={{ color: '#475569' }}>Required <b>{po.totalRequired}</b></span>
                      <span style={{ color: '#16a34a' }}>Sent <b>{po.totalSent}</b></span>
                      <span style={{ color: '#1e40af' }}>Remaining <b>{po.totalRemaining}</b></span>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 800, background: sc.bg, color: sc.color }}>{po.status}</span>
                    {po.pdfFile && (
                      <a href={fileUrl(po.pdfFile)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, textDecoration: 'none', fontSize: 12.5 }}>
                        <MdPictureAsPdf size={16} /> PDF
                      </a>
                    )}
                  </div>

                  {/* Item detail table */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '4px 0', background: '#fafbfc' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['#', 'Item', 'HSN', 'Unit', 'Rate', 'Required', 'Sent', 'Remaining', 'Action'].map(h => (
                              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(po.items || []).map((it, i) => {
                            const remaining = it.remaining ?? Math.max(0, (it.requiredQty || 0) - (it.sentQty || 0));
                            const isEditing = editing && String(editing.poId) === String(po._id) && String(editing.itemId) === String(it._id);
                            return (
                              <tr key={it._id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '9px 12px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                                <td style={{ padding: '9px 12px', color: '#334155', fontWeight: 500, minWidth: 180 }}>{it.name}</td>
                                <td style={{ padding: '9px 12px', color: '#64748b' }}>{it.hsn || '—'}</td>
                                <td style={{ padding: '9px 12px', color: '#64748b' }}>{it.unit || 'Nos'}</td>
                                <td style={{ padding: '9px 12px', color: '#475569', whiteSpace: 'nowrap' }}>{money(it.rate)}</td>
                                <td style={{ padding: '9px 12px', color: '#0f172a', fontWeight: 700 }}>{it.requiredQty}</td>
                                <td style={{ padding: '9px 12px' }}>
                                  {isEditing
                                    ? <input type="number" min={0} max={it.requiredQty} value={editVal} onChange={e => setEditVal(e.target.value)} style={inputSm} autoFocus />
                                    : <span style={{ color: '#16a34a', fontWeight: 700 }}>{it.sentQty}</span>}
                                </td>
                                <td style={{ padding: '9px 12px' }}>
                                  <span style={{ fontWeight: 800, color: remaining === 0 ? '#16a34a' : '#1e40af' }}>{isEditing ? Math.max(0, (it.requiredQty || 0) - (Number(editVal) || 0)) : remaining}</span>
                                </td>
                                <td style={{ padding: '9px 12px' }}>
                                  {isEditing
                                    ? (
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => saveSent(po._id, it)} disabled={savingItem}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: savingItem ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                          <MdSave size={13} /> {savingItem ? '…' : 'Save'}
                                        </button>
                                        <button onClick={() => setEditing(null)} style={{ padding: '5px 10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                                      </div>
                                    )
                                    : (
                                      <button onClick={() => startEdit(po._id, it)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                        <MdEdit size={13} /> Sent
                                      </button>
                                    )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
