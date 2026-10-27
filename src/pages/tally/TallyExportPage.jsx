/**
 * TallyExportPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified "Export to Tally" page for MANUFACTURING ERP ERP.
 *
 * Features:
 *  • Tab toggle: Sales Export  |  PO Export  — on the same page
 *  • Both modes share the same Connector connection-status widget
 *  • Both modes show live SSE terminal + export report
 *  • Sales Export  → openFullExportStream  (14 entity types)
 *  • PO Export     → openPOExportStream    (PO invoices as Purchase vouchers)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { tallyApi } from '../../api/tallyApi';
import { toast } from '../../components/common/Toast';

// ─── Style constants ──────────────────────────────────────────────────────────
const card = {
  background: '#fff', borderRadius: 16, border: '1.5px solid #f1f5f9',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)', padding: '22px 24px',
};
const mono = { fontFamily: "'Cascadia Code','Fira Mono','Consolas',monospace", fontSize: 12 };

const STATUS_COLORS = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
  failed:  { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  warning: { bg: '#fefce8', border: '#fde047', text: '#a16207' },
  pending: { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8' },
  running: { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
};

// ─── Shared sub-components ───────────────────────────────────────────────────

function Badge({ status, children }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {children}
    </span>
  );
}

function Spinner({ size = 20, color = '#2563eb' }) {
  return (
    <>
      <div style={{
        width: size, height: size,
        border: `3px solid ${color}22`, borderTop: `3px solid ${color}`,
        borderRadius: '50%', animation: 'tally-spin 0.7s linear infinite', flexShrink: 0,
      }} />
      <style>{`@keyframes tally-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

function ProgressBar({ value, color = '#2563eb' }) {
  return (
    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: color, borderRadius: 99, transition: 'width 0.35s ease',
      }} />
    </div>
  );
}

// ─── Connection status widget ─────────────────────────────────────────────────
function ConnectionStatus({ status, openCompany, companyMatch, expectedCompany, onRecheck }) {
  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12 }}>
        <Spinner size={16} color="#2563eb" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>Connecting to Tally…</span>
      </div>
    );
  }
  if (status === 'unreachable') {
    return (
      <div style={{ padding: '14px 16px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderLeft: '4px solid #ef4444', borderRadius: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>⚠️ Cannot connect to Tally</div>
        <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>
          Make sure Tally Prime is running and the HTTP Server is enabled:<br />
          <strong>Tally Prime → F12 → Configure → Advanced Configuration → Enable ODBC/HTTP Server: Yes, Port: 9000</strong>
        </div>
        <button onClick={onRecheck} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#dc2626', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          Retry Connection →
        </button>
      </div>
    );
  }
  if (status === 'wrong-company') {
    return (
      <div style={{ padding: '14px 16px', background: '#fefce8', border: '1.5px solid #fde047', borderLeft: '4px solid #f59e0b', borderRadius: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⚠️ Wrong company open in Tally</div>
        <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
          Expected: <strong>{expectedCompany}</strong><br />
          Currently open: <strong>{openCompany || 'Unknown'}</strong><br />
          Please open <strong>{expectedCompany}</strong> in Tally Prime, then click Retry.
        </div>
        <button onClick={onRecheck} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#92400e', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          Retry after opening correct company →
        </button>
      </div>
    );
  }
  if (status === 'connected') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12 }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Tally connected</span>
          {openCompany && <span style={{ fontSize: 12, color: '#166534', marginLeft: 8 }}>Company: <strong>{openCompany}</strong></span>}
        </div>
        <button onClick={onRecheck} style={{ marginLeft: 'auto', fontSize: 11, color: '#15803d', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Recheck</button>
      </div>
    );
  }
  return null;
}

// ─── Live terminal ────────────────────────────────────────────────────────────
function Terminal({ logs, done, onClose, onCancel, accent = '#1e3a8a', dotColor = '#60a5fa', label = 'Export Complete', runningLabel = 'Exporting to Tally…' }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div style={{ background: '#0f172a', borderRadius: 14, padding: '14px 18px', marginBottom: 20, border: `1.5px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!done
            ? <div style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor, animation: 'tally-pulse 1s infinite' }} />
            : <span style={{ fontSize: 14 }}>✅</span>
          }
          <span style={{ ...mono, color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>
            {done ? label : runningLabel}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: accent, color: dotColor, border: `1px solid ${dotColor}44` }}>
            ERP → Tally
          </span>
        </div>
        {done
          ? <button onClick={onClose} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', ...mono }}>Close</button>
          : <button onClick={onCancel} style={{ background: 'none', border: '1px solid #ef4444', color: '#f87171', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', ...mono }}>Cancel</button>
        }
      </div>
      <div ref={ref} style={{ maxHeight: 260, overflowY: 'auto', ...mono, lineHeight: 1.8, paddingRight: 2 }}>
        {logs.map((l, i) => (
          <div key={i} style={{
            color: l.level === 'error'   ? '#f87171'
                 : l.level === 'warn'    ? '#fbbf24'
                 : l.level === 'success' ? '#4ade80'
                 : l.level === 'phase'   ? '#fbbf24'
                 : '#64748b',
            whiteSpace: 'pre-wrap',
          }}>{l.text}</div>
        ))}
        {!done && <div style={{ color: '#334155' }}>▌</div>}
      </div>
      <style>{`@keyframes tally-pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

// ─── Export Report Table ──────────────────────────────────────────────────────
function ExportReport({ taskResults, stats, duration, startTime }) {
  if (!taskResults?.length) return null;
  const success = taskResults.filter(t => t.ok);
  const failed  = taskResults.filter(t => !t.ok);
  const warned  = taskResults.filter(t => t.ok && t.warning);
  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#1e293b', marginBottom: 4 }}>
            {failed.length === 0 ? '🎉 Export Completed Successfully' : '⚠️ Export Completed with Errors'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {startTime && `Started at ${new Date(startTime).toLocaleTimeString('en-IN')} · `}
            Duration: <strong>{duration}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '10px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#15803d' }}>{stats?.total || taskResults.reduce((s,t)=>s+(t.records||0),0)}</div>
            <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Total Records</div>
          </div>
          <div style={{ textAlign: 'center', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '10px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#15803d' }}>{success.length}</div>
            <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Tasks OK</div>
          </div>
          {warned.length > 0 && (
            <div style={{ textAlign: 'center', background: '#fefce8', border: '1px solid #fde047', borderRadius: 12, padding: '10px 18px', minWidth: 90 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#a16207' }}>{warned.length}</div>
              <div style={{ fontSize: 11, color: '#a16207', fontWeight: 600 }}>Warnings</div>
            </div>
          )}
          {failed.length > 0 && (
            <div style={{ textAlign: 'center', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 18px', minWidth: 90 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#dc2626' }}>{failed.length}</div>
              <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Tasks Failed</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['#', 'Entity', 'Status', 'Records', 'Created', 'Altered', 'Notes'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Records' || h === 'Created' || h === 'Altered' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {taskResults.map((t, i) => (
              <tr key={t.key || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{t.label || t.key}</td>
                <td style={{ padding: '10px 12px' }}>
                  {t.ok
                    ? t.warning ? <Badge status="warning">⚠️ Warning</Badge> : <Badge status="success">✅ Success</Badge>
                    : <Badge status="failed">❌ Failed</Badge>
                  }
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{(t.records || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>{(t.created || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{(t.altered || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', color: t.ok ? '#a16207' : '#dc2626', fontSize: 12, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.error || t.warning || '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td colSpan={3} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>TOTAL</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: '#1e293b' }}>{taskResults.reduce((s, t) => s + (t.records || 0), 0).toLocaleString()}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: '#15803d' }}>{taskResults.reduce((s, t) => s + (t.created || 0), 0).toLocaleString()}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: '#f59e0b' }}>{taskResults.reduce((s, t) => s + (t.altered || 0), 0).toLocaleString()}</td>
              <td style={{ padding: '10px 12px' }} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Export Counts Panel (Sales mode only) ────────────────────────────────────
function ExportCountsPanel({ counts }) {
  if (!counts) return null;
  const tasks = [
    { key: 'units',            icon: '📏', label: 'Units of Measure' },
    { key: 'stockGroups',      icon: '🗂️',  label: 'Stock Groups' },
    { key: 'godowns',          icon: '🏭', label: 'Godowns / Warehouses' },
    { key: 'systemLedgers',    icon: '📒', label: 'Ledger Masters' },
    { key: 'vendorLedgers',    icon: '🏢', label: 'Vendor / Supplier Masters' },
    { key: 'customerLedgers',  icon: '👥', label: 'Customer Masters' },
    { key: 'stockItems',       icon: '📦', label: 'Stock Items + Opening Stock + GST' },
    { key: 'salesInvoices',    icon: '🧾', label: 'Sales Invoices' },
    { key: 'purchaseInvoices', icon: '🛒', label: 'Purchase Invoices' },
    { key: 'creditNotes',      icon: '📝', label: 'Credit Notes' },
    { key: 'debitNotes',       icon: '📋', label: 'Debit Notes' },
    { key: 'paymentVouchers',  icon: '💸', label: 'Payment Vouchers' },
    { key: 'receiptVouchers',  icon: '🧾', label: 'Receipt Vouchers' },
    { key: 'journalVouchers',  icon: '📓', label: 'Journal Vouchers' },
  ];
  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📊 Data to be Exported</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 99, padding: '3px 12px' }}>
          Total: {counts.total?.toLocaleString() || 0} records
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {tasks.map(t => {
          const d = counts[t.key];
          const n = d?.count ?? 0;
          return (
            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d?.label || t.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: n > 0 ? '#1e293b' : '#cbd5e1' }}>{n.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ config, onChange, onSave, saving }) {
  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 16 }}>⚙️ Tally Connection Settings</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
            Tally Local URL <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            value={config.tallyLocalUrl || ''}
            onChange={e => onChange('tallyLocalUrl', e.target.value)}
            placeholder="http://localhost or http://192.168.1.10"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            IP/hostname of the computer running Tally Prime (default port 9000)
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>Port</label>
          <input
            value={config.port || '9000'}
            onChange={e => onChange('port', e.target.value)}
            placeholder="9000"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Tally HTTP server port (default: 9000)</div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
            Company Name in Tally <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            value={config.companyName || ''}
            onChange={e => onChange('companyName', e.target.value)}
            placeholder="MANUFACTURING ERP"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Must match exactly the company name in Tally Prime
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>Authentication</label>
          <select
            value={config.authType || 'None'}
            onChange={e => onChange('authType', e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          >
            <option value="None">None</option>
            <option value="Basic Auth">Basic Auth</option>
            <option value="API Key">API Key</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 14, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
        <strong>How to enable Tally HTTP Server:</strong><br />
        Open Tally Prime → press <kbd style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>F12</kbd> → Configure → Advanced Configuration → set <strong>Enable ODBC/HTTP Server: Yes</strong> → set Port: <strong>9000</strong> → Accept
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: saving ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
        >
          {saving ? <><Spinner size={14} color="#fff" /> Saving…</> : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function TallyExportPage() {
  // ── Export mode: 'sales' | 'po' ────────────────────────────────────────────
  const [exportMode, setExportMode] = useState('sales');

  // ── Shared: Connection state (same connector for both modes) ───────────────
  const [connStatus, setConnStatus]     = useState('idle');
  const [openCompany, setOpenCompany]   = useState(null);
  const [companyMatch, setCompanyMatch] = useState(false);

  // ── Sales Export state ─────────────────────────────────────────────────────
  const [config, setConfig]             = useState({ tallyLocalUrl: '', port: '9000', companyName: 'MANUFACTURING ERP', authType: 'None' });
  const [savingCfg, setSavingCfg]       = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [exportCounts, setExportCounts] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [salesRunning, setSalesRunning] = useState(false);
  const [salesTermOpen, setSalesTermOpen] = useState(false);
  const [salesTermDone, setSalesTermDone] = useState(false);
  const [salesLogs, setSalesLogs]       = useState([]);
  const [salesProgress, setSalesProgress] = useState({ current: 0, total: 14 });
  const [salesTaskResults, setSalesTaskResults] = useState([]);
  const [salesReportStats, setSalesReportStats] = useState(null);
  const [salesReportDuration, setSalesReportDuration] = useState('');
  const [salesStartTime, setSalesStartTime] = useState(null);
  const salesEsRef  = useRef(null);
  const salesBuf    = useRef([]);

  // ── PO Export state ────────────────────────────────────────────────────────
  const [poCount, setPoCount]           = useState(null);
  const [poRunning, setPoRunning]       = useState(false);
  const [poTermOpen, setPoTermOpen]     = useState(false);
  const [poTermDone, setPoTermDone]     = useState(false);
  const [poLogs, setPoLogs]             = useState([]);
  const [poTaskResults, setPoTaskResults] = useState([]);
  const [poReportDuration, setPoReportDuration] = useState('');
  const [poStartTime, setPoStartTime]   = useState(null);
  const poEsRef  = useRef(null);
  const poBuf    = useRef([]);

  // ── Load config + sales counts on mount ────────────────────────────────────
  useEffect(() => {
    loadConfig();
    loadCounts();
    loadPoCount();
  }, []);

  const loadConfig = async () => {
    try {
      await tallyApi.fixConfig().catch(() => {});
      const r = await tallyApi.getConfig();
      if (r.data) setConfig(p => ({ ...p, ...r.data }));
    } catch (_) {}
  };

  const loadCounts = async () => {
    setLoadingCounts(true);
    try {
      const r = await tallyApi.getExportCounts();
      if (r.data) setExportCounts(r.data);
    } catch (_) {} finally { setLoadingCounts(false); }
  };

  const loadPoCount = async () => {
    try {
      const r = await tallyApi.getPOExportCount();
      setPoCount(r.data?.poInvoices?.count ?? 0);
    } catch (_) { setPoCount(0); }
  };

  // ── Shared: Check Tally connection ─────────────────────────────────────────
  const checkConnection = useCallback(async () => {
    setConnStatus('checking');
    try {
      const r = await tallyApi.validateCompany();
      const d = r.data || r;
      if (!d.reachable) {
        setConnStatus('unreachable');
      } else if (!d.companyMatch && config.companyName) {
        setConnStatus('wrong-company');
        setOpenCompany(d.openCompany);
        setCompanyMatch(false);
      } else {
        setConnStatus('connected');
        setOpenCompany(d.openCompany);
        setCompanyMatch(true);
      }
    } catch (_) {
      setConnStatus('unreachable');
    }
  }, [config.companyName]);

  // ── Save settings ──────────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSavingCfg(true);
    try {
      await tallyApi.saveConfig(config);
      toast('Settings saved', 'success');
      setShowSettings(false);
      setConnStatus('idle');
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    } finally { setSavingCfg(false); }
  };

  // ── Sales Export: log helper + start/cancel ────────────────────────────────
  const pushSalesLog = (level, text) => setSalesLogs(p => [...p, { level, text }]);

  const startSalesExport = async () => {
    if (salesRunning) { toast('An export is already in progress', 'error'); return; }
    if (connStatus !== 'connected') { await checkConnection(); return; }

    salesEsRef.current?.close();
    setSalesRunning(true);
    setSalesTermOpen(true);
    setSalesTermDone(false);
    setSalesLogs([]);
    setSalesTaskResults([]);
    setSalesReportStats(null);
    setSalesReportDuration('');
    setSalesProgress({ current: 0, total: 1 });
    salesBuf.current = [];
    setSalesStartTime(Date.now());

    console.log('TallyExportPage: Starting full export, opening SSE stream...');
    const onEvent = (ev) => {
      console.log('TallyExportPage: Received SSE event:', ev);
      switch (ev.event) {
        case 'start':
          pushSalesLog('info', `▶ ${ev.message}`);
          break;
        case 'log':
          pushSalesLog(ev.level || 'info', `  ${ev.entity ? `[${ev.entity}] ` : ''}${ev.message}`);
          break;
        case 'phase_start':
          pushSalesLog('phase', `\n  [${ev.index}/${ev.total}] ⏳ ${ev.entity}`);
          setSalesProgress({ current: ev.index, total: ev.total });
          break;
        case 'phase_done':
          if (ev.ok) {
            pushSalesLog('success', `  ✅ ${ev.entity}: ${ev.records || 0} records exported${ev.warning ? ` ⚠️ ${ev.warning.slice(0, 80)}` : ''}`);
          } else {
            pushSalesLog('error', `  ❌ ${ev.entity}: ${ev.error || 'Failed'}`);
          }
          salesBuf.current.push({
            key: ev.entity?.toLowerCase().replace(/\s+/g, '_') || String(salesBuf.current.length),
            label: ev.entity,
            ok: ev.ok,
            records: ev.records || 0,
            created: ev.created || 0,
            altered: ev.altered || 0,
            error: ev.error,
            warning: ev.warning,
          });
          setSalesTaskResults([...salesBuf.current]);
          break;
        case 'summary':
          pushSalesLog('success', `\n🎉 ${ev.message}`);
          setSalesReportStats(ev.stats);
          setSalesReportDuration(ev.duration || '');
          if (ev.results) {
            salesBuf.current = ev.results;
            setSalesTaskResults([...ev.results]);
          }
          break;
        case 'done':
          setSalesTermDone(true);
          setSalesRunning(false);
          if (ev.stats) setSalesReportStats(ev.stats);
          if (ev.duration) setSalesReportDuration(ev.duration);
          salesEsRef.current?.close();
          loadCounts();
          toast('Export to Tally completed!', 'success');
          break;
        case 'error':
          pushSalesLog('error', `❌ ${ev.message}`);
          if (ev.openCompany && ev.expectedCompany) {
            setConnStatus('wrong-company');
            setOpenCompany(ev.openCompany);
          }
          setSalesTermDone(true);
          setSalesRunning(false);
          salesEsRef.current?.close();
          toast(ev.message, 'error');
          break;
        default:
          break;
      }
    };
    const es = tallyApi.openFullExportStream(onEvent);
    salesEsRef.current = es;
  };

  const cancelSalesExport = () => {
    salesEsRef.current?.close();
    salesEsRef.current = null;
    setSalesRunning(false);
    setSalesTermDone(true);
    pushSalesLog('warn', '\n⚠️ Export cancelled by user');
    toast('Export cancelled', 'warning');
  };

  const closeSalesTerminal = () => { setSalesTermOpen(false); setSalesLogs([]); };

  // ── PO Export: log helper + start/cancel ──────────────────────────────────
  const pushPoLog = (level, text) => setPoLogs(p => [...p, { level, text }]);

  const startPoExport = async () => {
    if (poRunning) { toast('A PO export is already in progress', 'error'); return; }
    if (connStatus !== 'connected') { await checkConnection(); return; }

    poEsRef.current?.close();
    setPoRunning(true);
    setPoTermOpen(true);
    setPoTermDone(false);
    setPoLogs([]);
    setPoTaskResults([]);
    setPoReportDuration('');
    poBuf.current = [];
    setPoStartTime(Date.now());

    const onEvent = (ev) => {
      switch (ev.event) {
        case 'start':
          pushPoLog('info', `▶ ${ev.message}`);
          break;
        case 'log':
          pushPoLog(ev.level || 'info', `  ${ev.entity ? `[${ev.entity}] ` : ''}${ev.message}`);
          break;
        case 'phase_start':
          pushPoLog('phase', `\n  [${ev.index}/${ev.total}] ⏳ ${ev.entity}`);
          break;
        case 'phase_done':
          if (ev.ok) {
            pushPoLog('success', `  ✅ ${ev.entity}: ${ev.records || 0} records exported`);
          } else {
            pushPoLog('error', `  ❌ ${ev.entity}: ${ev.error || 'Failed'}`);
          }
          poBuf.current.push({
            key: ev.entity?.toLowerCase().replace(/\s+/g, '_') || String(poBuf.current.length),
            label: ev.entity,
            ok: ev.ok,
            records: ev.records || 0,
            created: ev.created || 0,
            altered: ev.altered || 0,
            error: ev.error,
            warning: ev.warning,
          });
          setPoTaskResults([...poBuf.current]);
          break;
        case 'summary':
          pushPoLog('success', `\n🎉 ${ev.message}`);
          setPoReportDuration(ev.duration || '');
          if (ev.results) {
            poBuf.current = ev.results;
            setPoTaskResults([...ev.results]);
          }
          break;
        case 'done':
          setPoTermDone(true);
          setPoRunning(false);
          if (ev.duration) setPoReportDuration(ev.duration);
          poEsRef.current?.close();
          loadPoCount();
          toast(ev.ok !== false ? 'PO Export to Tally completed!' : `PO Export failed: ${ev.message}`, ev.ok !== false ? 'success' : 'error');
          break;
        case 'error':
          pushPoLog('error', `❌ ${ev.message}`);
          if (ev.openCompany && ev.expectedCompany) {
            setConnStatus('wrong-company');
            setOpenCompany(ev.openCompany);
          }
          setPoTermDone(true);
          setPoRunning(false);
          poEsRef.current?.close();
          toast(ev.message, 'error');
          break;
        default:
          break;
      }
    };
    const es = tallyApi.openPOExportStream(onEvent);
    poEsRef.current = es;
  };

  const cancelPoExport = () => {
    poEsRef.current?.close();
    poEsRef.current = null;
    setPoRunning(false);
    setPoTermDone(true);
    pushPoLog('warn', '\n⚠️ PO Export cancelled by user');
    toast('PO Export cancelled', 'warning');
  };

  const closePoTerminal = () => { setPoTermOpen(false); setPoLogs([]); };

  // ── Derived ────────────────────────────────────────────────────────────────
  const needsConnection = connStatus === 'idle' || connStatus === 'unreachable' || connStatus === 'wrong-company';
  const salesRunBtn = salesRunning ? cancelSalesExport : (needsConnection ? checkConnection : startSalesExport);
  const poRunBtn    = poRunning    ? cancelPoExport    : (needsConnection ? checkConnection : startPoExport);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 4px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 12, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📤</span>
            Export to Tally
          </h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '5px 0 0 50px', fontWeight: 500 }}>
            Push data into Tally Prime — MANUFACTURING ERP
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {exportMode === 'sales' && (
            <>
              <button
                onClick={() => setShowSettings(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ⚙️ Settings
              </button>
              <button
                onClick={loadCounts}
                disabled={loadingCounts}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#475569', cursor: loadingCounts ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {loadingCounts ? <Spinner size={14} color="#475569" /> : '🔄'} Refresh
              </button>
            </>
          )}
          {exportMode === 'po' && (
            <button
              onClick={loadPoCount}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              🔄 Refresh Count
            </button>
          )}
        </div>
      </div>

      {/* ── Mode toggle tabs ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 22, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 4 }}>
        <button
          onClick={() => setExportMode('sales')}
          style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            background: exportMode === 'sales' ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'transparent',
            color: exportMode === 'sales' ? '#fff' : '#64748b',
            boxShadow: exportMode === 'sales' ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          📤 Sales Export
        </button>
        <button
          onClick={() => setExportMode('po')}
          style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            background: exportMode === 'po' ? 'linear-gradient(135deg,#1e40af,#1e3a8a)' : 'transparent',
            color: exportMode === 'po' ? '#fff' : '#64748b',
            boxShadow: exportMode === 'po' ? '0 2px 8px rgba(192,57,43,0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          🛒 PO Export
        </button>
      </div>

      {/* ── Settings panel (Sales mode only, collapsible) ── */}
      {exportMode === 'sales' && showSettings && (
        <SettingsPanel
          config={config}
          onChange={(k, v) => setConfig(p => ({ ...p, [k]: v }))}
          onSave={saveSettings}
          saving={savingCfg}
        />
      )}

      {/* ── Connection status (shared by both modes) ── */}
      {connStatus !== 'idle' && (
        <div style={{ marginBottom: 16 }}>
          <ConnectionStatus
            status={connStatus}
            openCompany={openCompany}
            companyMatch={companyMatch}
            expectedCompany={config.companyName}
            onRecheck={checkConnection}
          />
        </div>
      )}

      {/* ── Config warning (Sales mode only) ── */}
      {exportMode === 'sales' && !config.tallyLocalUrl && (
        <div style={{ marginBottom: 16, padding: '14px 16px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderLeft: '4px solid #ef4444', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Tally URL not configured</div>
            <div style={{ fontSize: 12, color: '#b91c1c' }}>
              Click <strong>⚙️ Settings</strong> above and enter the Tally Local URL (e.g. <code style={{ background: '#fee2e2', padding: '1px 5px', borderRadius: 4 }}>http://localhost</code> if Tally is on the same computer).
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SALES EXPORT MODE                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {exportMode === 'sales' && (
        <>
          {/* Main export button */}
          <div style={{ marginBottom: 22 }}>
            <button
              onClick={salesRunBtn}
              disabled={salesRunning && false /* cancel is always clickable */}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
                padding: '22px 28px',
                background: salesRunning
                  ? 'linear-gradient(135deg,#1d4ed8,#1e40af)'
                  : connStatus === 'wrong-company'
                  ? '#94a3b8'
                  : 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                cursor: connStatus === 'wrong-company' ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: salesRunning ? 'none' : connStatus === 'wrong-company' ? 'none' : '0 8px 32px rgba(59,130,246,0.38)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!salesRunning && connStatus !== 'wrong-company') { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(59,130,246,0.48)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = salesRunning ? 'none' : '0 8px 32px rgba(59,130,246,0.38)'; }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                {salesRunning ? <Spinner size={24} color="#fff" /> : needsConnection ? '🔍' : '📤'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {salesRunning ? 'Exporting to Tally… (Cancel)' : needsConnection ? 'Connect to Tally' : 'Export to Tally'}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 500, marginTop: 3 }}>
                  {salesRunning
                    ? 'Exporting Sales Invoices to Tally…'
                    : needsConnection
                    ? 'Validate Tally connection and company before export'
                    : 'ERP → Tally · Export Sales Invoices as Sales vouchers to MANUFACTURING ERP'}
                </div>
              </div>
            </button>
            {salesRunning && (
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={(salesProgress.current / salesProgress.total) * 100} color="#3b82f6" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  <span>Step {salesProgress.current} of {salesProgress.total}</span>
                  <span>{Math.round((salesProgress.current / salesProgress.total) * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Live terminal */}
          {salesTermOpen && (
            <Terminal
              logs={salesLogs}
              done={salesTermDone}
              onClose={closeSalesTerminal}
              onCancel={cancelSalesExport}
              accent="#1e3a8a"
              dotColor="#60a5fa"
              label="Sales Export Complete"
              runningLabel="Exporting to Tally…"
            />
          )}

          {/* Export report */}
          {salesTaskResults.length > 0 && (
            <ExportReport
              taskResults={salesTaskResults}
              stats={salesReportStats}
              duration={salesReportDuration}
              startTime={salesStartTime}
            />
          )}

          {/* What gets exported info box */}
          {!salesTermOpen && !salesTaskResults.length && (
            <div style={{ ...card, background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>ℹ️ What Sales Export does</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#64748b', lineHeight: 1.9 }}>
                <li>Exports all <strong>Sales Invoices</strong> with status <strong>Sent / Paid</strong> that have not yet been synced to Tally.</li>
                <li>Each invoice is pushed as a <strong>Sales voucher</strong> in Tally Prime via the connector.</li>
                <li>Customer ledgers are auto-created under <em>Sundry Debtors</em> if they don't exist.</li>
                <li>Once exported, invoices are marked <strong>tallySync = true</strong> and will not be re-exported.</li>
                <li><strong>Sales Export does NOT export PO/Purchase data.</strong> Use the PO Export tab for that.</li>
              </ul>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PO EXPORT MODE                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {exportMode === 'po' && (
        <>
          {/* Pending PO count card */}
          {poCount !== null && (
            <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>📋 Pending PO Invoices</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {poCount === 0
                    ? 'All PO invoices are already synced to Tally.'
                    : `${poCount} invoice${poCount !== 1 ? 's' : ''} ready to push to Tally as Purchase vouchers.`
                  }
                </div>
              </div>
              <span style={{
                fontSize: 28, fontWeight: 900,
                color: poCount > 0 ? '#1e40af' : '#15803d',
                background: poCount > 0 ? '#fef2f2' : '#f0fdf4',
                border: `1.5px solid ${poCount > 0 ? '#fca5a5' : '#86efac'}`,
                borderRadius: 12, padding: '8px 20px',
              }}>
                {poCount}
              </span>
            </div>
          )}

          {/* Main PO export button */}
          <div style={{ marginBottom: 22 }}>
            <button
              onClick={poRunBtn}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
                padding: '22px 28px',
                background: poRunning
                  ? 'linear-gradient(135deg,#1e3a8a,#7b241c)'
                  : connStatus === 'wrong-company'
                  ? '#94a3b8'
                  : needsConnection
                  ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                  : 'linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                cursor: connStatus === 'wrong-company' ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: poRunning || connStatus === 'wrong-company' ? 'none' : needsConnection ? '0 8px 32px rgba(59,130,246,0.38)' : '0 8px 32px rgba(192,57,43,0.38)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!poRunning && connStatus !== 'wrong-company') { e.currentTarget.style.transform = 'translateY(-2px)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                {poRunning ? <Spinner size={24} color="#fff" /> : needsConnection ? '🔍' : '🛒'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {poRunning
                    ? 'Exporting PO Invoices… (Cancel)'
                    : needsConnection
                    ? 'Connect to Tally'
                    : poCount === 0
                    ? 'No Pending PO Invoices'
                    : `Export ${poCount} PO Invoice${poCount !== 1 ? 's' : ''} to Tally`
                  }
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 500, marginTop: 3 }}>
                  {poRunning
                    ? 'Pushing PO invoices as Purchase vouchers via connector…'
                    : needsConnection
                    ? 'Validate Tally connection and company before export'
                    : 'ERP → Tally · Purchase vouchers via same connector as Sales Export'}
                </div>
              </div>
            </button>
          </div>

          {/* Live terminal */}
          {poTermOpen && (
            <Terminal
              logs={poLogs}
              done={poTermDone}
              onClose={closePoTerminal}
              onCancel={cancelPoExport}
              accent="#991b1b"
              dotColor="#f87171"
              label="PO Export Complete"
              runningLabel="Exporting PO Invoices to Tally…"
            />
          )}

          {/* Export report */}
          {poTaskResults.length > 0 && (
            <ExportReport
              taskResults={poTaskResults}
              stats={null}
              duration={poReportDuration}
              startTime={poStartTime}
            />
          )}

          {/* Info box */}
          {!poTermOpen && !poTaskResults.length && (
            <div style={{ ...card, background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>ℹ️ What gets exported</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#64748b', lineHeight: 1.9 }}>
                <li>All PO Invoices with status <strong>Approved / Sent / Paid</strong> that have not yet been synced to Tally.</li>
                <li>Each invoice is pushed as a <strong>Purchase voucher</strong> in Tally Prime via the same connector as Sales Export.</li>
                <li>Vendor ledgers are auto-created under <em>Sundry Creditors</em> if they don't exist.</li>
                <li>Stock items are auto-created if they don't exist in Tally.</li>
                <li>Once exported, invoices are marked <strong>tallySync = true</strong> and will not be re-exported.</li>
                <li><strong>This export does NOT affect the Sales Export.</strong> Both run independently via the same connector.</li>
              </ul>
            </div>
          )}
        </>
      )}

    </div>
  );
}
