import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { toast } from '../../components/common/Toast.jsx';
import { tallyApi } from '../../api/tallyApi.js';
import { dataEvents } from '../../utils/dataEvents.js';

// ── Style tokens ──────────────────────────────────────────────────────────────
const inputCls   = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 font-[inherit]';
const selectCls  = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-[inherit]';
const labelCls   = 'text-xs font-semibold text-gray-600';
const fieldCls   = 'flex flex-col gap-1.5 mb-4';
const thCls      = 'bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap';
const tdCls      = 'px-4 py-3 text-gray-800 align-middle text-sm';
const trCls      = 'border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors';
const btnGray    = 'inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all cursor-pointer font-[inherit]';
const btnOutline = 'inline-flex items-center gap-1.5 px-4 py-2 border border-gray-400 text-gray-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all cursor-pointer font-[inherit]';

// small action buttons
const btnImportSm = 'inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold border-0 cursor-pointer font-[inherit] disabled:opacity-40 transition-colors';
const btnExportSm = 'inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold border-0 cursor-pointer font-[inherit] disabled:opacity-40 transition-colors';

// ── What can be imported from Tally ──────────────────────────────────────────
const IMPORT_ENTITIES = [
  { key: 'Items',    label: 'Stock Items',       icon: '📦', desc: 'Products, raw materials, HSN codes, GST rates' },
  { key: 'Ledgers',  label: 'Ledgers & Parties', icon: '📒', desc: 'All ledgers including Vendors and Clients' },
  { key: 'Purchase', label: 'Purchase Vouchers', icon: '🛒', desc: 'All purchase entries from Tally Day Book' },
  { key: 'Sales',    label: 'Sales Vouchers',    icon: '💰', desc: 'All sales entries from Tally Day Book' },
  { key: 'Payment',  label: 'Payment Vouchers',  icon: '💸', desc: 'Payment transactions from Tally' },
  { key: 'Receipt',  label: 'Receipt Vouchers',  icon: '🧾', desc: 'Receipt transactions from Tally' },
  { key: 'Journal',  label: 'Journal Vouchers',  icon: '📋', desc: 'Journal entries from Tally' },
  { key: 'Contra',   label: 'Contra Vouchers',   icon: '🔄', desc: 'Contra entries from Tally (bank transfers, cash deposits)' },
];

// ── What can be exported to Tally ─────────────────────────────────────────────
const EXPORT_ENTITIES = [
  { key: 'masters',  label: 'Masters',           icon: '🗂️',  desc: 'Items, Vendors (Creditors), Clients (Debtors), Ledgers' },
  { key: 'purchase', label: 'Purchase Vouchers', icon: '🛒', desc: 'Approved / received purchase orders' },
  { key: 'sales',    label: 'Sales Vouchers',    icon: '💰', desc: 'Sent / paid invoices' },
  { key: 'payment',  label: 'Payment Vouchers',  icon: '💸', desc: 'ERP payment vouchers not yet in Tally' },
  { key: 'receipt',  label: 'Receipt Vouchers',  icon: '🧾', desc: 'ERP receipt vouchers not yet in Tally' },
];

// Maps UI export key → tallyExportService task key (for selective export stream)
const EXPORT_KEY_MAP = {
  masters:  'stockItems',      // runs stockItems + all ledgers via selective
  purchase: 'purchaseInvoices',
  sales:    'salesInvoices',
  payment:  'paymentVouchers',
  receipt:  'receiptVouchers',
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 26, height: 26, border: '3px solid #f1f5f9', borderTop: '3px solid #16a34a', borderRadius: '50%', animation: 'sp 0.7s linear infinite' }} />
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Confirmation modal ────────────────────────────────────────────────────────
function ConfirmModal({ open, direction, type, onConfirm, onCancel }) {
  if (!open) return null;
  const imp  = direction === 'import';
  const clr  = imp ? '#16a34a' : '#2563eb';
  const arrow = imp ? 'Tally → ERP' : 'ERP → Tally';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '28px 30px', maxWidth: 450, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        {/* direction pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: imp ? '#f0fdf4' : '#eff6ff', border: `1.5px solid ${imp ? '#86efac' : '#93c5fd'}`, borderRadius: 99, padding: '4px 14px', marginBottom: 14, fontSize: 12, fontWeight: 700, color: clr }}>
          <span>{imp ? '📥' : '📤'}</span><span>{arrow}</span>
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
          Confirm {imp ? 'Import from Tally' : 'Export to Tally'}
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
          <strong>Scope:</strong> {type === 'Full' ? 'All data' : type}<br />
          <strong>Direction:</strong> <span style={{ color: clr, fontWeight: 700 }}>{arrow}</span>
        </div>

        <div style={{ background: imp ? '#f0fdf4' : '#eff6ff', border: `1px solid ${imp ? '#86efac' : '#93c5fd'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: imp ? '#14532d' : '#1e3a8a', lineHeight: 1.6 }}>
          {imp
            ? 'ℹ️ Data will be fetched FROM Tally and saved into the ERP database. Nothing is sent to Tally.'
            : 'ℹ️ Data will be pushed FROM the ERP INTO Tally. Records will be created or altered in Tally. Nothing is read from Tally.'}
        </div>

        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '8px 12px', marginBottom: 20, fontSize: 12, color: '#713f12' }}>
          ⚠️ Make sure Tally is running and accessible before proceeding.
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className={btnGray}>Cancel</button>
          <button onClick={onConfirm} style={{ background: `linear-gradient(135deg, ${clr}, ${imp ? '#15803d' : '#1d4ed8'})`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {imp ? '📥 Start Import' : '📤 Start Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live terminal panel ───────────────────────────────────────────────────────
function Terminal({ active, direction, phase, log, progress, done, stats, failedInvoices = [], onClose, onCancel }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log]);
  if (!active) return null;
  const imp  = direction === 'import';
  const dot  = imp ? '#4ade80' : '#60a5fa';

  return (
    <div style={{ background: '#0f172a', borderRadius: 14, padding: '14px 18px', marginBottom: 20, border: `1.5px solid ${imp ? '#14532d' : '#1e3a8a'}`, fontFamily: 'monospace' }}>
      {/* bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!done
            ? <div style={{ width: 9, height: 9, borderRadius: '50%', background: dot, animation: 'pu 1s infinite' }} />
            : <span style={{ fontSize: 14 }}>{(stats?.failed || 0) > 0 ? '⚠️' : '✅'}</span>
          }
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>{imp ? 'Importing from Tally' : 'Exporting to Tally'} — {phase}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: imp ? '#14532d' : '#1e3a8a', color: dot, border: `1px solid ${imp ? '#166534' : '#1d4ed8'}` }}>
            {imp ? 'Tally → ERP' : 'ERP → Tally'}
          </span>
        </div>
        {done
          ? <button onClick={onClose} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>Close</button>
          : <button onClick={onCancel} style={{ background: 'none', border: '1px solid #ef4444', color: '#f87171', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>Cancel</button>
        }
      </div>

      {/* progress bar */}
      {progress && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
            <span>{progress.entity} — step {progress.index}/{progress.total}</span>
            <span>{progress.records} processed</span>
          </div>
          <div style={{ height: 5, background: '#1e293b', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.3s', background: imp ? 'linear-gradient(90deg,#4ade80,#16a34a)' : 'linear-gradient(90deg,#60a5fa,#2563eb)', width: `${Math.min(100, (progress.index / progress.total) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* log */}
      <div ref={ref} style={{ maxHeight: 200, overflowY: 'auto', fontSize: 11, lineHeight: 1.75, paddingRight: 2 }}>
        {log.map((l, i) => (
          <div key={i} style={{ color: l.level === 'error' ? '#f87171' : l.level === 'warn' ? '#fbbf24' : l.level === 'success' ? '#4ade80' : l.level === 'phase' ? '#fbbf24' : '#64748b', whiteSpace: 'pre-wrap' }}>{l.text}</div>
        ))}
        {!done && <div style={{ color: '#334155' }}>▌</div>}
      </div>

      {/* result grid */}
      {done && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Total',   val: stats.total   || 0, color: '#3b82f6' },
            { label: 'Created', val: stats.created || 0, color: '#10b981' },
            { label: 'Updated', val: stats.updated || 0, color: '#f59e0b' },
            { label: 'Skipped', val: stats.skipped || 0, color: '#6b7280' },
            { label: 'Failed',  val: stats.failed  || 0, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1e293b', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Invoices NOT exported — with exact reason for each ── */}
      {done && failedInvoices && failedInvoices.length > 0 && (
        <div style={{ marginTop: 14, background: '#1e1113', border: '1px solid #991b1b', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#3f1214', color: '#fca5a5', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🚫 {failedInvoices.length} invoice{failedInvoices.length > 1 ? 's' : ''} NOT exported to Tally — exact reasons below</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: '#f87171', background: '#991b1b', borderRadius: 99, padding: '2px 8px' }}>
              Fix these &amp; re-run export
            </span>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr style={{ background: '#2a1416' }}>
                  <th style={{ textAlign: 'left', padding: '6px 12px', color: '#fca5a5', fontWeight: 700, whiteSpace: 'nowrap' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '6px 12px', color: '#fca5a5', fontWeight: 700, whiteSpace: 'nowrap' }}>Invoice No</th>
                  <th style={{ textAlign: 'left', padding: '6px 12px', color: '#fca5a5', fontWeight: 700, whiteSpace: 'nowrap' }}>Party</th>
                  <th style={{ textAlign: 'left', padding: '6px 12px', color: '#fca5a5', fontWeight: 700 }}>Why it was NOT exported</th>
                </tr>
              </thead>
              <tbody>
                {failedInvoices.map((f, i) => {
                  // Make the raw error human-readable
                  let reason = f.error || 'Unknown error';
                  if (reason.includes('EXCEPTIONS=') && reason.includes('see RAW RESPONSE')) {
                    const exc = reason.match(/EXCEPTIONS=(\d+)/)?.[1];
                    reason = `Tally rejected this invoice${exc ? ` (${exc} exception${+exc > 1 ? 's' : ''})` : ''} — wrong ledger name, missing GST setup, or invalid item. Check Tally logs for details.`;
                  } else if (reason.includes('Master data error')) {
                    reason = reason.replace('Master data error (nothing created in Tally — fix the master first):', 'Missing master in Tally:');
                  } else if (reason.includes('Validation:')) {
                    reason = reason.replace('Validation:', 'Invalid invoice data:');
                  }
                  return (
                    <tr key={`${f.id}-${i}`} style={{ borderTop: '1px solid #3f1d1d', background: i % 2 === 0 ? 'transparent' : '#1a0f10' }}>
                      <td style={{ padding: '5px 12px', color: '#6b7280', fontSize: 10, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{i + 1}</td>
                      <td style={{ padding: '5px 12px', color: '#fecaca', fontWeight: 800, whiteSpace: 'nowrap', verticalAlign: 'top', letterSpacing: '0.03em' }}>{f.id}</td>
                      <td style={{ padding: '5px 12px', color: '#fbbf24', whiteSpace: 'nowrap', verticalAlign: 'top', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.partyName || f.task || ''}>{f.partyName || f.task || '—'}</td>
                      <td style={{ padding: '5px 12px', color: '#fda4af', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`@keyframes pu{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function TallyPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab]   = useState(initialTab);
  const [loading, setLoading]       = useState(false);
  const navigate = useNavigate();

  // confirm modal
  const [confirm, setConfirm] = useState({ open: false, direction: null, type: null });

  // stream
  const [streamActive, setStreamActive]       = useState(false);
  const [streamDir, setStreamDir]             = useState('import');
  const [streamPhase, setStreamPhase]         = useState('');
  const [streamLog, setStreamLog]             = useState([]);
  const [streamProgress, setStreamProgress]   = useState(null);
  const [streamDone, setStreamDone]           = useState(false);
  const [streamStats, setStreamStats]         = useState(null);
  const [streamRunning, setStreamRunning]     = useState(false);
  // Invoices that were NOT exported, with the exact reason for each.
  const [streamFailedInvoices, setStreamFailedInvoices] = useState([]);
  const esRef = useRef(null);

  // data
  const [stats, setStats]           = useState({});
  const [masterData, setMasterData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [syncLogs, setSyncLogs]     = useState([]);
  const [diagInfo, setDiagInfo]     = useState(null);
  const [logTypeFilter, setLogTypeFilter]     = useState('All Types');
  const [logStatusFilter, setLogStatusFilter] = useState('All Status');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [config, setConfig] = useState({
    port: '9000', companyName: '', tallyLocalUrl: '', authType: 'None',
    financialYearStart: '2026-04-01',
    autoSync: true, syncInterval: 'Every 15 minutes',
    syncPrefs: { masterData: true, purchaseVouchers: true, salesVouchers: true, paymentVouchers: true, receiptVouchers: true, journalVouchers: false },
  });
  const [connectorStatus, setConnectorStatus] = useState(null);
  const [registeredConnectors, setRegisteredConnectors] = useState([]);

  // re-export invoice sync reset
  const [resetInvBusy,    setResetInvBusy]    = useState(false);
  const [resetInvResult,  setResetInvResult]  = useState(null); // { count, error }

  // re-normalize tallyVoucher data (fixes rateOfInvoiceTax / RATEDETAILS in stored data)
  const [remigrBusy,   setRemigrBusy]   = useState(false);
  const [remigrResult, setRemigrResult] = useState(null);

  const [connectorsLoading, setConnectorsLoading] = useState(false);

  const reload = useCallback(async () => {
    try { const r = await tallyApi.getSyncStats();    setStats(r.data || {}); } catch (_) {}
    try { const r = await tallyApi.getMasterData();   setMasterData(r.data || []); } catch (_) {}
    try { const r = await tallyApi.getTransactions(); setTransactions(r.data || []); } catch (_) {}
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      await tallyApi.fixConfig().catch(() => {});
      const r = await tallyApi.getConfig();
      if (r.data) setConfig(p => ({ ...p, ...r.data }));
    } catch (_) {}
  }, []);

  const loadConnectorStatus = useCallback(async () => {
    try {
      const r = await tallyApi.getConnectorStatus();
      setConnectorStatus(r.connectors || null);
    } catch (_) {}
  }, []);

  const loadRegisteredConnectors = useCallback(async () => {
    setConnectorsLoading(true);
    try {
      const r = await tallyApi.listConnectors();
      setRegisteredConnectors(r.data || []);
    } catch (_) {
      setRegisteredConnectors([]);
    } finally {
      setConnectorsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const p = {};
      if (logTypeFilter   !== 'All Types')  p.type   = logTypeFilter;
      if (logStatusFilter !== 'All Status') p.status = logStatusFilter;
      const r = await tallyApi.getSyncLogs(p);
      setSyncLogs(r.data || []);
    } catch (_) {} finally { setLoading(false); }
  }, [logTypeFilter, logStatusFilter]);

  useEffect(() => { reload(); loadConfig(); loadConnectorStatus(); loadRegisteredConnectors(); }, [reload, loadConfig, loadConnectorStatus, loadRegisteredConnectors]);
  useEffect(() => { if (activeTab === 3) loadLogs(); }, [activeTab, loadLogs]);
  useEffect(() => { if (activeTab === 4) loadRegisteredConnectors(); }, [activeTab, loadRegisteredConnectors]);

  // ── request with confirm ──────────────────────────────────────────────────
  const ask = (dir, type) => {
    if (streamRunning) { toast('An operation is already running.', 'error'); return; }
    setConfirm({ open: true, direction: dir, type });
  };

  const go = () => {
    const { direction, type } = confirm;
    setConfirm({ open: false, direction: null, type: null });
    startStream(direction, type);
  };

  // ── stream ────────────────────────────────────────────────────────────────
  const startStream = (dir, type) => {
    esRef.current?.close();
    setStreamRunning(true); setStreamActive(true); setStreamDir(dir);
    setStreamDone(false); setStreamStats(null); setStreamLog([]); setStreamFailedInvoices([]);
    setStreamPhase('Connecting...'); setStreamProgress(null);

    const push = (level, text) => setStreamLog(p => [...p, { level, text }]);

    const onEv = (ev) => {
      switch (ev.event) {
        case 'start':       push('info',    `▶ ${ev.message}`); setStreamPhase('Starting...'); break;
        case 'phase':       push('phase',   `▶ ${ev.message}`); setStreamPhase(ev.message); break;
        case 'phase_start': push('info',    `  [${ev.index}/${ev.total}] ${ev.entity}...`);
                            setStreamProgress({ index: ev.index, total: ev.total, entity: ev.entity, records: 0 });
                            setStreamPhase(`${ev.entity} (${ev.index}/${ev.total})`); break;
        case 'log':         push(ev.level || 'info', `  ${ev.entity ? `[${ev.entity}] ` : ''}${ev.message}`); break;
        case 'phase_done':  ev.ok
                              ? push('success', `  ✅ ${ev.entity}: ${ev.records} records`)
                              : push('error',   `  ❌ ${ev.entity}: ${ev.error || 'failed'}`);
                            // Per-invoice failures for this task (invoice no + exact reason)
                            if (Array.isArray(ev.failedItems) && ev.failedItems.length) {
                              ev.failedItems.forEach(f => push('error', `     ⚠️ Invoice ${f.id} NOT exported — ${f.error}`));
                              setStreamFailedInvoices(prev => {
                                const seen = new Set(prev.map(x => String(x.id)));
                                const add = ev.failedItems.filter(f => !seen.has(String(f.id)));
                                return [...prev, ...add.map(f => ({ id: f.id, error: f.error, task: ev.entity }))];
                              });
                            }
                            setStreamProgress(p => p ? { ...p, records: ev.records || 0 } : p); break;
        case 'summary':     push('success', `🎉 ${ev.message}`); setStreamStats(ev.stats);
                            // Authoritative list of all invoices not exported, with reasons
                            if (Array.isArray(ev.failedInvoices)) {
                              setStreamFailedInvoices(prev => {
                                const merged = [...prev];
                                const seen = new Set(prev.map(x => String(x.id)));
                                ev.failedInvoices.forEach(f => { if (!seen.has(String(f.id))) { merged.push({ id: f.id, error: f.error, task: f.task }); seen.add(String(f.id)); } });
                                return merged;
                              });
                            }
                            toast(ev.message, (ev.stats?.failed || 0) > 0 ? 'warning' : 'success'); break;
        case 'done':        setStreamDone(true); setStreamRunning(false);
                            setStreamPhase(dir === 'import' ? '✅ Import Complete' : '✅ Export Complete');
                            if (ev.stats) setStreamStats(ev.stats);
                            esRef.current?.close(); reload();
                            // Emit data events to refresh all relevant pages!
                            dataEvents.emit('vendor:changed');
                            dataEvents.emit('item:changed');
                            dataEvents.emit('client:changed');
                            dataEvents.emit('ledger:changed');
                            if (activeTab === 3) loadLogs(); break;
        case 'error':       push('error', `❌ ${ev.message}`);
                            setStreamDone(true); setStreamRunning(false); setStreamPhase('❌ Failed');
                            esRef.current?.close(); toast(ev.message, 'error'); break;
        default: break;
      }
    };

    const es = dir === 'export'
      ? (type === 'Full' || !type
          ? tallyApi.openFullExportStream(onEv)
          : tallyApi.openSelectiveExportStream(EXPORT_KEY_MAP[type] || type, onEv))
      : tallyApi.openImportStream(type, onEv);
    esRef.current = es;
  };

  const cancelStream = () => {
    esRef.current?.close(); esRef.current = null;
    setStreamRunning(false); setStreamDone(true); setStreamPhase('Cancelled');
    setStreamLog(p => [...p, { level: 'warn', text: '⚠️ Cancelled by user' }]);
  };

  const closeTerminal = () => { setStreamActive(false); setStreamLog([]); setStreamStats(null); setStreamFailedInvoices([]); };

  const handleTestConnection = async () => {
    setDiagInfo(null);
    try {
      const r = await tallyApi.testConnection();
      const d = r.data || {};
      setDiagInfo(d);
      d.status === 'Connected'
        ? toast(`✅ Connected — ${d.url}`, 'success')
        : toast(`❌ ${d.error || 'Not reachable'}`, 'error');
    } catch (e) { toast(e.message || 'Test failed', 'error'); }
  };

  const handleSaveConfig = async () => {
    try { await tallyApi.saveConfig(config); toast('Configuration saved'); }
    catch (e) { toast(e.message || 'Save failed', 'error'); }
  };

  const handleGenerateCredentials = async () => {
    try {
      await tallyApi.generateConnectorCredentials();
      await loadConfig();
      await loadConnectorStatus();
      toast('Connector credentials generated', 'success');
    } catch (e) { toast(e.message || 'Failed to generate credentials', 'error'); }
  };

  const handleSetDefault = async (connectorId, computerName) => {
    if (!window.confirm(`Set "${computerName || connectorId}" as the active connector?\n\nAll Tally data requests will be routed to this device.`)) return;
    try {
      await tallyApi.setDefaultConnector(connectorId);
      await loadConfig();
      await loadRegisteredConnectors();
      toast(`Active connector set to ${computerName || connectorId}`, 'success');
    } catch (e) { toast(e.message || 'Failed to set active connector', 'error'); }
  };

  const handleRemoveConnector = async (connectorId, computerName) => {
    if (!window.confirm(`Remove connector "${computerName || connectorId}"?\n\nThis device will need to re-register to connect again.`)) return;
    try {
      await tallyApi.removeConnector(connectorId);
      await loadRegisteredConnectors();
      toast('Connector removed', 'success');
    } catch (e) { toast(e.message || 'Failed to remove connector', 'error'); }
  };

  // ── Reset invoice tallySync flags so already-exported invoices get re-exported ──
  const handleResetInvoiceSync = async () => {
    if (!window.confirm(
      'This will mark ALL previously exported invoices as "not synced".\n\n' +
      'The next Sales Invoice export will update them in Tally using ACTION="Alter" — ' +
      'adding the missing item names and correct Ship To details.\n\n' +
      'No duplicates will be created. Proceed?'
    )) return;
    setResetInvBusy(true);
    setResetInvResult(null);
    try {
      const r = await tallyApi.resetInvoiceSyncFlags();
      setResetInvResult({ count: r.data?.reset ?? 0, error: null });
      toast(`Reset ${r.data?.reset ?? 0} invoice(s). Run "Export to Tally → Sales Invoices" to update them.`, 'success');
    } catch (e) {
      setResetInvResult({ count: 0, error: e.message });
      toast(e.message || 'Reset failed', 'error');
    } finally {
      setResetInvBusy(false);
    }
  };

  // ── Re-normalize tallyVoucher data — fixes rateOfInvoiceTax / RATEDETAILS ──
  const handleRemigrateGst = async () => {
    if (!window.confirm(
      'This will re-normalize all invoice tallyVoucher data using the latest code.\n\n' +
      'It fixes the "Tax amount does not match" issue by removing rateOfInvoiceTax and RATEDETAILS.\n\n' +
      'After this, click "Reset Sync Flags" and then re-export to Tally. Proceed?'
    )) return;
    setRemigrBusy(true);
    setRemigrResult(null);
    try {
      const r = await tallyApi.remigrateGstFields();
      setRemigrResult({ count: r.data?.succeeded ?? 0, error: null });
      toast(`Re-normalized ${r.data?.succeeded ?? 0} invoice(s). Now reset sync flags and re-export.`, 'success');
    } catch (e) {
      setRemigrResult({ count: 0, error: e.message });
      toast(e.message || 'Re-normalize failed', 'error');
    } finally {
      setRemigrBusy(false);
    }
  };

  const TABS = [
    { label: '📊 Overview',          color: '#6b7280' },
    { label: '📥 Import from Tally', color: '#16a34a' },
    { label: '📤 Export to Tally',   color: '#2563eb' },
    { label: '📋 Logs',              color: '#6b7280' },
    { label: '⚙️ Settings',          color: '#6b7280' },
  ];

  return (
    <div>
      <ConfirmModal open={confirm.open} direction={confirm.direction} type={confirm.type} onConfirm={go} onCancel={() => setConfirm({ open: false, direction: null, type: null })} />

      {/* ── Page title ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>Tally Integration</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0', fontWeight: 500 }}>
            Manual import &amp; export — choose a direction explicitly
          </p>
        </div>
        <button onClick={() => navigate('/tally/data')} className={btnOutline} style={{ fontSize: 12 }}>📋 View Imported Data</button>
      </div>

      {/* ── THREE BIG BUTTONS — always visible ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>

        {/* IMPORT — untouched */}
        <button
          onClick={() => ask('import', 'Full')}
          disabled={streamRunning}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '20px 22px',
            background: streamRunning && streamDir === 'import' ? '#15803d' : 'linear-gradient(135deg,#22c55e 0%,#15803d 100%)',
            color: '#fff', border: 'none', borderRadius: 18,
            cursor: streamRunning ? 'not-allowed' : 'pointer',
            opacity: streamRunning && streamDir !== 'import' ? 0.55 : 1,
            fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(34,197,94,0.32)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!streamRunning) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(34,197,94,0.42)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 24px rgba(34,197,94,0.32)'; }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {streamRunning && streamDir === 'import' ? '⏳' : '📥'}
          </div>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.4px' }}>
              {streamRunning && streamDir === 'import' ? 'Importing…' : 'Import from Tally'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 500, marginTop: 3 }}>
              Tally → ERP &nbsp;·&nbsp; Fetch all vendors, clients, ledgers &amp; vouchers
            </div>
          </div>
        </button>

        {/* SALES EXPORT — untouched, exactly as before */}
        <button
          onClick={() => ask('export', 'Full')}
          disabled={streamRunning}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '20px 22px',
            background: streamRunning && streamDir === 'export' ? '#1d4ed8' : 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)',
            color: '#fff', border: 'none', borderRadius: 18,
            cursor: streamRunning ? 'not-allowed' : 'pointer',
            opacity: streamRunning && streamDir !== 'export' ? 0.55 : 1,
            fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(59,130,246,0.32)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!streamRunning) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(59,130,246,0.42)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 24px rgba(59,130,246,0.32)'; }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {streamRunning && streamDir === 'export' ? '⏳' : '📤'}
          </div>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.4px' }}>
              {streamRunning && streamDir === 'export' ? 'Exporting…' : 'Sales Export'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 500, marginTop: 3 }}>
              ERP → Tally &nbsp;·&nbsp; Push sales invoices &amp; masters
            </div>
          </div>
        </button>

        {/* PO EXPORT — separate, uses its own SSE endpoint, does NOT touch salesExport */}
        <button
          onClick={() => navigate('/tally/po-export')}
          disabled={streamRunning}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '20px 22px',
            background: 'linear-gradient(135deg,#1e40af 0%,#172554 100%)',
            color: '#fff', border: 'none', borderRadius: 18,
            cursor: streamRunning ? 'not-allowed' : 'pointer',
            opacity: streamRunning ? 0.55 : 1,
            fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(192,57,43,0.32)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!streamRunning) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(192,57,43,0.42)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 24px rgba(192,57,43,0.32)'; }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            🛒
          </div>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.4px' }}>PO Export</div>
            <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 500, marginTop: 3 }}>
              ERP → Tally &nbsp;·&nbsp; Push purchase orders only
            </div>
          </div>
        </button>

      </div>

      {/* ── Live terminal ── */}
      <Terminal
        active={streamActive} direction={streamDir} phase={streamPhase}
        log={streamLog} progress={streamProgress} done={streamDone}
        stats={streamStats} failedInvoices={streamFailedInvoices}
        onClose={closeTerminal} onCancel={cancelStream}
      />

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            style={{
              padding: '9px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === i ? t.color : '#9ca3af',
              borderBottom: activeTab === i ? `2.5px solid ${t.color}` : '2.5px solid transparent',
              marginBottom: -2, transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          TAB 0 — Overview
      ════════════════════════════════════════ */}
      {activeTab === 0 && (
        <div>
          {/* warnings */}
          {stats.connectionStatus && stats.connectionStatus !== 'Connected' && (
            <div style={{ background: '#fff', border: '1.5px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Tally is not reachable</div>
                <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.6 }}>Open Tally Prime → F12 → Configure → Advanced Config → Enable ODBC/HTTP Server: Yes, Port: 9000.</div>
                <button onClick={handleTestConnection} style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#92400e', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Test Connection →</button>
              </div>
            </div>
          )}
          {!config.tallyLocalUrl && (
            <div style={{ background: '#fff', border: '1.5px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔧</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Tally URL not configured</div>
                <div style={{ fontSize: 12, color: '#ef4444' }}>Go to Settings tab → set Tally Local URL (e.g. <code>http://192.168.1.10</code>)</div>
                <button onClick={() => setActiveTab(4)} style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#dc2626', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Go to Settings →</button>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '🔗', label: 'Connection',   val: stats.connectionStatus || 'Unknown', color: stats.connectionStatus === 'Connected' ? '#10b981' : '#ef4444' },
              { icon: '📥', label: 'Last Import',  val: stats.lastImportAt ? new Date(stats.lastImportAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Never', color: '#16a34a' },
              { icon: '📤', label: 'Last Export',  val: stats.lastExportAt  ? new Date(stats.lastExportAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Never', color: '#2563eb' },
              { icon: '📊', label: "Today's Ops",  val: stats.todayTotal  || 0, color: '#8b5cf6' },
              { icon: '✅', label: 'Succeeded',    val: stats.todaySuccess || 0, color: '#10b981' },
              { icon: '❌', label: 'Failed',       val: stats.todayFailed  || 0, color: '#ef4444' },
            ].map((k, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #f1f5f9', padding: '16px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{k.icon}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: k.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{k.val}</span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Quick nav */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 4 }}>
            {[
              { label: 'Stock Items', icon: '📦', path: '/item-master',         clr: '#3b82f6' },
              { label: 'Vendors',     icon: '🏭', path: '/procurement/vendors', clr: '#10b981' },
              { label: 'Ledgers',     icon: '📒', path: '/finance/tally-ledger',clr: '#f59e0b' },
              { label: 'Vouchers',    icon: '📥', path: '/finance/tally-ledger',clr: '#1e40af' },
            ].map(c => (
              <button key={c.label} onClick={() => navigate(c.path)}
                style={{ background: '#fff', border: `1.5px solid ${c.clr}25`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = c.clr + '12'; e.currentTarget.style.borderColor = c.clr; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = c.clr + '25'; }}>
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Import History Table — all modules that have been imported */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: '20px 22px', marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Import History</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>All modules imported from Tally — updates after every sync</div>
              </div>
              <button onClick={reload} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>↻ Refresh</button>
            </div>
            {masterData.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No data imported yet. Click <strong>Import from Tally</strong> to begin.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Module', 'Type', 'Total Records', 'Imported', 'Pending', 'Last Sync', 'Status', ''].map(h => (
                        <th key={h} className={thCls}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {masterData.map((m, i) => (
                      <tr key={i} className={trCls}>
                        <td className={tdCls}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{m.icon || '📄'}</span>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{m.category}</span>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                            background: m.moduleType === 'master' ? '#eff6ff' : '#f0fdf4',
                            color: m.moduleType === 'master' ? '#2563eb' : '#16a34a' }}>
                            {m.moduleType === 'master' ? 'Master' : 'Voucher'}
                          </span>
                        </td>
                        <td className={tdCls} style={{ fontWeight: 700 }}>{m.total.toLocaleString('en-IN')}</td>
                        <td className={tdCls} style={{ fontWeight: 700, color: '#16a34a' }}>{m.synced.toLocaleString('en-IN')}</td>
                        <td className={tdCls} style={{ color: m.pending > 0 ? '#f59e0b' : '#94a3b8', fontWeight: m.pending > 0 ? 700 : 400 }}>{m.pending || '—'}</td>
                        <td className={tdCls} style={{ fontSize: 11, color: '#94a3b8' }}>{m.lastSync}</td>
                        <td className={tdCls}>
                          <StatusBadge
                            status={m.status}
                            type={m.status === 'Synced' ? 'success' : m.status === 'Partial' ? 'warning' : m.status === 'Not Imported' ? 'danger' : 'warning'}
                          />
                        </td>
                        <td className={tdCls}>
                          <button className={btnImportSm}
                            onClick={() => ask('import', m.voucherType || m.category)}
                            disabled={streamRunning}>
                            📥
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 1 — IMPORT FROM TALLY
      ════════════════════════════════════════ */}
      {activeTab === 1 && (
        <div>
          {/* section header */}
          <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', borderRadius: 16, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📥</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#14532d', letterSpacing: '-0.3px' }}>Import from Tally</div>
                <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Direction: Tally → ERP &nbsp;·&nbsp; Nothing is pushed to Tally</div>
              </div>
            </div>
            <button
              onClick={() => ask('import', 'Full')}
              disabled={streamRunning}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: streamRunning ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: streamRunning ? 0.6 : 1, boxShadow: '0 3px 12px rgba(22,163,74,0.35)' }}
            >
              <span style={{ fontSize: 18 }}>{streamRunning && streamDir === 'import' ? '⏳' : '📥'}</span>
              {streamRunning && streamDir === 'import' ? 'Importing…' : 'Import All from Tally'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#14532d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20, lineHeight: 1.7 }}>
            <strong>One-way import only.</strong> Data is fetched <em>from</em> Tally and saved into the ERP database. Existing ERP records are matched by Tally GUID to avoid duplicates. Nothing is sent back to Tally.
          </div>

          {/* entity cards — 2 col grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12, marginBottom: 24 }}>
            {/* ── Sales Register shortcut card ── */}
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '2px solid #16a34a', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📊</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#14532d' }}>Sales Register</div>
                  <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>Import by date range (April–June)</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/tally/sales-register')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                📊 Open
              </button>
            </div>

            {IMPORT_ENTITIES.map(e => (
              <div key={e.key} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, transition: 'border-color 0.15s' }}
                onMouseEnter={ev => ev.currentTarget.style.borderColor = '#86efac'}
                onMouseLeave={ev => ev.currentTarget.style.borderColor = '#e2e8f0'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{e.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{e.desc}</div>
                  </div>
                </div>
                <button className={btnImportSm} onClick={() => ask('import', e.key)} disabled={streamRunning}>
                  📥 Import
                </button>
              </div>
            ))}
          </div>

          {/* status table */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Import Status</div>
          {masterData.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No data imported yet. Run <strong>Import All from Tally</strong> above to populate.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Module', 'Type', 'Total', 'Imported', 'Pending', 'Failed', 'Last Import', 'Status', ''].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {masterData.map((m, i) => (
                    <tr key={i} className={trCls}>
                      <td className={tdCls}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 17 }}>{m.icon || '📄'}</span>
                          <span style={{ fontWeight: 700 }}>{m.category}</span>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: m.moduleType === 'master' ? '#eff6ff' : '#f0fdf4',
                          color: m.moduleType === 'master' ? '#2563eb' : '#16a34a' }}>
                          {m.moduleType === 'master' ? 'Master' : 'Voucher'}
                        </span>
                      </td>
                      <td className={tdCls} style={{ fontWeight: 700 }}>{(m.total || 0).toLocaleString('en-IN')}</td>
                      <td className={tdCls} style={{ fontWeight: 700, color: '#16a34a' }}>{(m.synced || 0).toLocaleString('en-IN')}</td>
                      <td className={tdCls} style={{ color: m.pending > 0 ? '#f59e0b' : '#94a3b8', fontWeight: m.pending > 0 ? 700 : 400 }}>{m.pending > 0 ? m.pending : '—'}</td>
                      <td className={tdCls} style={{ color: m.failed > 0 ? '#ef4444' : '#94a3b8', fontWeight: m.failed > 0 ? 700 : 400 }}>{m.failed > 0 ? m.failed : '—'}</td>
                      <td className={tdCls} style={{ fontSize: 11, color: '#94a3b8' }}>{m.lastSync}</td>
                      <td className={tdCls}>
                        <StatusBadge status={m.status} type={m.status === 'Synced' ? 'success' : m.status === 'Partial' ? 'warning' : 'danger'} />
                      </td>
                      <td className={tdCls}>
                        <button className={btnImportSm}
                          onClick={() => ask('import', m.voucherType || m.category)}
                          disabled={streamRunning}>
                          📥
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 2 — EXPORT TO TALLY
      ════════════════════════════════════════ */}
      {activeTab === 2 && (
        <div>
          {/* section header */}
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #93c5fd', borderRadius: 16, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📤</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.3px' }}>Export to Tally</div>
                <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginTop: 2 }}>Direction: ERP → Tally &nbsp;·&nbsp; Nothing is fetched from Tally</div>
              </div>
            </div>
            <button
              onClick={() => ask('export', 'Full')}
              disabled={streamRunning}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: streamRunning ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: streamRunning ? 0.6 : 1, boxShadow: '0 3px 12px rgba(37,99,235,0.35)' }}
            >
              <span style={{ fontSize: 18 }}>{streamRunning && streamDir === 'export' ? '⏳' : '📤'}</span>
              {streamRunning && streamDir === 'export' ? 'Exporting…' : 'Export All to Tally'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#1e3a8a', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 12, lineHeight: 1.7 }}>
            <strong>One-way export only.</strong> Data is pushed <em>from</em> this ERP <em>into</em> Tally using the XML import API. Records are created or altered in Tally. Nothing is read from Tally.
          </div>
          <div style={{ fontSize: 12, color: '#713f12', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '8px 14px', marginBottom: 20, lineHeight: 1.7 }}>
            ⚠️ Export modifies Tally data. Uses <code>ACTION="Create"</code> for new and <code>ACTION="Alter"</code> for GUID-matched records. A confirmation dialog will appear.
          </div>

          {/* entity cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12, marginBottom: 24 }}>
            {EXPORT_ENTITIES.map(e => (
              <div key={e.key} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, transition: 'border-color 0.15s' }}
                onMouseEnter={ev => ev.currentTarget.style.borderColor = '#93c5fd'}
                onMouseLeave={ev => ev.currentTarget.style.borderColor = '#e2e8f0'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{e.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{e.desc}</div>
                  </div>
                </div>
                <button className={btnExportSm} onClick={() => ask('export', e.key)} disabled={streamRunning}>
                  📤 Export
                </button>
              </div>
            ))}
          </div>

          {/* transaction status table */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Export Status</div>
          {transactions.length === 0 ? <Spinner /> : (
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Transaction Type', 'Today', 'Synced', 'Pending', 'Failed', 'Last Export', 'Status', ''].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} className={trCls}>
                      <td className={tdCls} style={{ fontWeight: 600 }}>{t.type}</td>
                      <td className={tdCls} style={{ fontWeight: 700 }}>{t.today}</td>
                      <td className={tdCls} style={{ fontWeight: 700, color: '#2563eb' }}>{t.synced}</td>
                      <td className={tdCls} style={{ color: t.pending > 0 ? '#f59e0b' : '#94a3b8', fontWeight: t.pending > 0 ? 700 : 400 }}>{t.pending}</td>
                      <td className={tdCls} style={{ color: t.failed > 0 ? '#ef4444' : '#94a3b8', fontWeight: t.failed > 0 ? 700 : 400 }}>{t.failed}</td>
                      <td className={tdCls} style={{ fontSize: 11, color: '#94a3b8' }}>{t.lastSync}</td>
                      <td className={tdCls}><StatusBadge status={t.status} type={t.status === 'Synced' ? 'success' : t.status === 'Pending' ? 'warning' : 'danger'} /></td>
                      <td className={tdCls}>
                        <button className={btnExportSm} onClick={() => ask('export', t.type.replace(' Vouchers', '').toLowerCase())} disabled={streamRunning}>📤</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 3 — LOGS
      ════════════════════════════════════════ */}
      {activeTab === 3 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Operation Logs</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>All Import (Tally→ERP) and Export (ERP→Tally) history</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none bg-white font-[inherit]" value={logTypeFilter} onChange={e => setLogTypeFilter(e.target.value)}>
                {['All Types','Full','Purchase','Sales','Payment','Receipt','Journal','Item Master','Ledger'].map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none bg-white font-[inherit]" value={logStatusFilter} onChange={e => setLogStatusFilter(e.target.value)}>
                {['All Status','Success','Failed','Partial'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={loadLogs} className={btnGray} style={{ fontSize: 12 }}>↻ Refresh</button>
            </div>
          </div>

          {loading ? <Spinner /> : (
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['', 'ID', 'Type', 'Direction', 'Status', 'Records', 'Time', 'Duration', 'Error', ''].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {syncLogs.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No logs yet. Run an import or export to see history here.</td></tr>
                  ) : syncLogs.map((log, i) => {
                    const isExp = (log.direction || '').includes('ERP');
                    const isExpanded = expandedLogId === log._id || expandedLogId === log.syncId;
                    const hasModules = log.modules && log.modules.length > 0;
                    return (
                      <>
                        <tr key={log._id || i} className={trCls} style={{ cursor: 'pointer' }} onClick={() => setExpandedLogId(isExpanded ? null : log._id || log.syncId)}>
                          <td className={tdCls} style={{ width: 30, textAlign: 'center' }}>
                            {hasModules ? (isExpanded ? '▼' : '▶') : ''}
                          </td>
                          <td className={tdCls} style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: isExp ? '#2563eb' : '#16a34a', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.syncId}</td>
                          <td className={tdCls}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: isExp ? '#eff6ff' : '#f0fdf4', color: isExp ? '#2563eb' : '#16a34a' }}>{log.type}</span>
                          </td>
                          <td className={tdCls}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: isExp ? '#dbeafe' : '#dcfce7', color: isExp ? '#1d4ed8' : '#15803d' }}>
                              {log.direction || (isExp ? 'ERP → Tally' : 'Tally → ERP')}
                            </span>
                          </td>
                          <td className={tdCls}><StatusBadge status={log.status} type={log.status === 'Success' ? 'success' : log.status === 'Partial' ? 'warning' : 'danger'} /></td>
                          <td className={tdCls} style={{ fontWeight: 700 }}>{log.records || 0}</td>
                          <td className={tdCls} style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(log.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                          <td className={tdCls} style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.duration || '—'}</td>
                          <td className={tdCls} style={{ fontSize: 11, color: log.error ? '#ef4444' : '#94a3b8', fontWeight: log.error ? 600 : 400, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.error || '—'}</td>
                          <td className={tdCls}>
                            {log.status === 'Failed' && (
                              <button className={isExp ? btnExportSm : btnImportSm} disabled={streamRunning}
                                onClick={(e) => { e.stopPropagation(); const isE = (log.direction||'').includes('ERP'); ask(isE ? 'export' : 'import', log.type || 'Full'); }}>
                                ↺ Retry
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && hasModules && (
                          <tr>
                            <td colSpan={10} style={{ padding: 0 }}>
                              <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Module Details</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                                  {log.modules.map((mod, j) => (
                                    <div key={j} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{mod.name}</div>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); navigate(mod.route); }}
                                          className={btnImportSm}
                                          style={{ fontSize: 11, padding: '4px 8px' }}>
                                          👁 View
                                        </button>
                                      </div>
                                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>
                                          Count: <span style={{ fontWeight: 700, color: '#3b82f6' }}>{mod.count}</span>
                                        </div>
                                        {mod.created !== undefined && mod.created > 0 && (
                                          <div style={{ fontSize: 11, color: '#64748b' }}>
                                            Created: <span style={{ fontWeight: 700, color: '#10b981' }}>{mod.created}</span>
                                          </div>
                                        )}
                                        {mod.updated !== undefined && mod.updated > 0 && (
                                          <div style={{ fontSize: 11, color: '#64748b' }}>
                                            Updated: <span style={{ fontWeight: 700, color: '#f59e0b' }}>{mod.updated}</span>
                                          </div>
                                        )}
                                        {mod.failed !== undefined && mod.failed > 0 && (
                                          <div style={{ fontSize: 11, color: '#64748b' }}>
                                            Failed: <span style={{ fontWeight: 700, color: '#ef4444' }}>{mod.failed}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                        {new Date(mod.timestamp).toLocaleString('en-IN')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 4 — SETTINGS
      ════════════════════════════════════════ */}
      {activeTab === 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>

          {/* Connection */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Tally Connection</div>

            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#14532d', lineHeight: 1.6 }}>
              This URL is used for both <strong>Import</strong> (fetching) and <strong>Export</strong> (pushing).
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>Tally Local URL <span style={{ color: '#ef4444' }}>*</span></label>
              <input className={inputCls} value={config.tallyLocalUrl || ''} onChange={e => setConfig(p => ({ ...p, tallyLocalUrl: e.target.value }))} placeholder="http://192.168.1.50" />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                Same LAN: <code>ipconfig</code> on Tally PC → IPv4.<br />
                Remote: Cloudflare tunnel → paste HTTPS URL.
              </div>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Port</label>
              <input className={inputCls} value={config.port || ''} onChange={e => setConfig(p => ({ ...p, port: e.target.value }))} placeholder="9000" />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Company Name <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
              <input className={inputCls} value={config.companyName || ''} onChange={e => setConfig(p => ({ ...p, companyName: e.target.value }))} placeholder="Leave blank = active company" />
              <div style={{ fontSize: 11, color: config.companyName ? '#f59e0b' : '#16a34a', marginTop: 3 }}>
                {config.companyName ? 'Must match Tally exactly (case-sensitive)' : 'Uses whichever company is currently open in Tally'}
              </div>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Financial Year Start <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="date"
                className={inputCls}
                value={config.financialYearStart ? new Date(config.financialYearStart).toISOString().split('T')[0] : '2026-04-01'}
                onChange={e => setConfig(p => ({ ...p, financialYearStart: e.target.value }))}
              />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                First day of your Tally company's financial year (e.g. 01 Apr 2026). Voucher import starts from this date.
              </div>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Authentication</label>
              <select className={selectCls} value={config.authType || 'None'} onChange={e => setConfig(p => ({ ...p, authType: e.target.value }))}>
                {['None','Basic Auth','API Key'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleTestConnection} className={btnOutline}>Test Connection</button>
              <button onClick={handleSaveConfig} style={{ padding: '9px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
            </div>

            {diagInfo && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: diagInfo.status === 'Connected' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${diagInfo.status === 'Connected' ? '#86efac' : '#fecaca'}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: diagInfo.status === 'Connected' ? '#166534' : '#dc2626' }}>
                  {diagInfo.status === 'Connected' ? '✅ Connected' : '❌ Not Reachable'}
                </div>
                <table style={{ fontSize: 11, width: '100%', borderCollapse: 'collapse' }}>
                  {[['URL', diagInfo.url],['HTTP Status', diagInfo.httpStatus||'—'],['Error', diagInfo.error||'—'],['Preview', diagInfo.responsePreview||'—']].map(([k,v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '3px 8px 3px 0', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', width: 100, verticalAlign: 'top' }}>{k}</td>
                      <td style={{ padding: '3px 0', fontFamily: 'monospace', color: '#1e293b', wordBreak: 'break-all' }}>{v}</td>
                    </tr>
                  ))}
                </table>
              </div>
            )}

            {/* ── Multi-Connector Management ── */}
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1.5px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>Connected Devices</div>
                <button
                  onClick={loadRegisteredConnectors}
                  style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  ↻ Refresh
                </button>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1e3a8a', lineHeight: 1.6 }}>
                Each PC with <strong>Manufacturing ERP Connector</strong> installed registers independently. Only the <strong>Active</strong> device routes Tally data. Install the connector on any PC — it will appear here automatically.
              </div>

              {connectorsLoading ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Loading connectors…</div>
              ) : registeredConnectors.length === 0 ? (
                <div style={{ padding: '20px 14px', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔌</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>No connectors registered yet</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Install and run the Manufacturing ERP Connector app on the PC where Tally is installed.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {registeredConnectors.map(c => {
                    const isOnline  = c.online;
                    const isDefault = c.isDefault;
                    return (
                      <div key={c.connectorId} style={{
                        background: isDefault ? '#f0fdf4' : '#fafafa',
                        border: `1.5px solid ${isDefault ? '#86efac' : '#e2e8f0'}`,
                        borderRadius: 12, padding: '14px 16px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Name row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                                💻 {c.computerName || 'Unknown PC'}
                              </span>
                              {/* Online / Offline pill */}
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                                background: isOnline ? '#dcfce7' : '#fee2e2',
                                color: isOnline ? '#15803d' : '#dc2626',
                              }}>
                                {isOnline ? '● Online' : '○ Offline'}
                              </span>
                              {/* Active badge */}
                              {isDefault && (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#16a34a', color: '#fff' }}>
                                  ★ Active
                                </span>
                              )}
                            </div>
                            {/* Details grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 12px', fontSize: 11, color: '#64748b' }}>
                              <span style={{ fontWeight: 600 }}>User:</span>
                              <span>{c.windowsUsername || '—'}</span>
                              <span style={{ fontWeight: 600 }}>OS:</span>
                              <span>{c.operatingSystem || '—'}</span>
                              <span style={{ fontWeight: 600 }}>Version:</span>
                              <span>Connector v{c.connectorVersion || '?'}{c.tallyVersion ? ` · Tally ${c.tallyVersion}` : ''}</span>
                              <span style={{ fontWeight: 600 }}>Last seen:</span>
                              <span>{c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}</span>
                              <span style={{ fontWeight: 600 }}>ID:</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{c.connectorId}</span>
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                            {!isDefault && (
                              <button
                                onClick={() => handleSetDefault(c.connectorId, c.computerName)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #16a34a', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                ★ Set Active
                              </button>
                            )}
                            {isDefault && (
                              <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, padding: '6px 12px', background: '#dcfce7', borderRadius: 8, textAlign: 'center' }}>
                                ✓ Routing here
                              </div>
                            )}
                            <button
                              onClick={() => handleRemoveConnector(c.connectorId, c.computerName)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                              🗑 Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 14, padding: '10px 14px', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
                <strong>How to add a device:</strong> Install the Manufacturing ERP Connector app on the new PC. It will auto-register and appear here. Then click <strong>Set Active</strong> to route Tally requests through it.
              </div>
            </div>
          </div>

          {/* Auto-import */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Auto-Import Schedule</div>

            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#713f12', lineHeight: 1.6 }}>
              ⚠️ <strong>Auto-import only (Tally → ERP).</strong> The scheduler never auto-exports — export must always be triggered manually by the user.
            </div>

            <div className={fieldCls}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!config.autoSync} onChange={e => setConfig(p => ({ ...p, autoSync: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#16a34a' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Enable Auto-Import (Tally → ERP)</span>
              </label>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, marginLeft: 24 }}>Automatically pull latest data from Tally at the selected interval</div>
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>Import Interval</label>
              <select className={selectCls} value={config.syncInterval || 'Every 15 minutes'} onChange={e => setConfig(p => ({ ...p, syncInterval: e.target.value }))}>
                {['Every 30 seconds','Every 1 minute','Every 5 minutes','Every 15 minutes','Every 30 minutes','Every 1 hour','Manual only'].map(s => <option key={s}>{s}</option>)}
              </select>
              {(config.syncInterval === 'Every 30 seconds' || config.syncInterval === 'Every 1 minute') && (
                <div style={{ fontSize: 11, color: '#b45309', marginTop: 3 }}>⚠ Very short intervals increase server load. Use only on same LAN.</div>
              )}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10, marginTop: 4 }}>What to Auto-Import</div>
            {[
              ['masterData',      'Master Data (Items, Ledgers)'],
              ['purchaseVouchers','Purchase Vouchers'],
              ['salesVouchers',   'Sales Vouchers'],
              ['paymentVouchers', 'Payment Vouchers'],
              ['receiptVouchers', 'Receipt Vouchers'],
              ['journalVouchers', 'Journal Vouchers'],
              ['contraVouchers',  'Contra Vouchers'],
            ].map(([key, lbl]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{lbl}</span>
                <input type="checkbox" checked={!!config.syncPrefs?.[key]} onChange={e => setConfig(p => ({ ...p, syncPrefs: { ...p.syncPrefs, [key]: e.target.checked } }))} style={{ width: 16, height: 16, accentColor: '#16a34a' }} />
              </div>
            ))}

            <button onClick={handleSaveConfig} style={{ marginTop: 16, width: '100%', padding: '11px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Save Settings
            </button>
          </div>

          {/* ── Re-export Invoices card ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #fde68a', padding: '20px 22px', alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>🔄</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Re-export Sales Invoices</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>Fix item names &amp; Ship To in already-exported invoices</div>
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', lineHeight: 1.7, marginBottom: 16 }}>
              <strong>When to use:</strong> After fixing the <em>Item Name</em> or <em>Ship To</em> export issues, previously exported invoices still show incorrect data in Tally. This action resets their sync flag so the next export run will update them.<br /><br />
              <strong>Safe:</strong> Uses <code>ACTION="Alter"</code> — updates existing Tally vouchers in-place. No duplicates created.
            </div>

            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              <strong>Steps to fix "Tax amount does not match" warning:</strong>
              <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 2 }}>
                <li>Click <strong>"Step 1: Re-normalize Invoice Data"</strong> below</li>
                <li>Click <strong>"Step 2: Reset Sync Flags"</strong></li>
                <li>Go to <strong>Export to Tally → Sales Invoices</strong></li>
              </ol>
            </div>

            {/* ── Step 1: Re-normalize ── */}
            {remigrResult && (
              <div style={{
                marginBottom: 10, padding: '10px 14px', borderRadius: 10,
                background: remigrResult.error ? '#fef2f2' : '#eff6ff',
                border: `1px solid ${remigrResult.error ? '#fecaca' : '#93c5fd'}`,
                fontSize: 12, fontWeight: 600,
                color: remigrResult.error ? '#dc2626' : '#1d4ed8',
              }}>
                {remigrResult.error ? `❌ Error: ${remigrResult.error}` : `✅ ${remigrResult.count} invoice(s) re-normalized. Now reset sync flags.`}
              </div>
            )}
            <button
              onClick={handleRemigrateGst}
              disabled={remigrBusy}
              style={{
                width: '100%', padding: '11px', border: 'none', borderRadius: 10,
                background: remigrBusy ? '#bfdbfe' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: remigrBusy ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: remigrBusy ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 10,
              }}
            >
              {remigrBusy ? '⏳ Re-normalizing…' : '🔧 Step 1: Re-normalize Invoice Data'}
            </button>

            {resetInvResult && (
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 10,
                background: resetInvResult.error ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${resetInvResult.error ? '#fecaca' : '#86efac'}`,
                fontSize: 12, fontWeight: 600,
                color: resetInvResult.error ? '#dc2626' : '#15803d',
              }}>
                {resetInvResult.error
                  ? `❌ Error: ${resetInvResult.error}`
                  : `✅ ${resetInvResult.count} invoice(s) reset. Now run Export → Sales Invoices.`
                }
              </div>
            )}

            <button
              onClick={handleResetInvoiceSync}
              disabled={resetInvBusy}
              style={{
                width: '100%', padding: '11px', border: 'none', borderRadius: 10,
                background: resetInvBusy ? '#fde68a' : 'linear-gradient(135deg,#f59e0b,#d97706)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: resetInvBusy ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: resetInvBusy ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {resetInvBusy ? '⏳ Resetting…' : '🔄 Reset Sync Flags'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
