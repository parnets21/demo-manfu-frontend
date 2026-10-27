/**
 * POTallyExportPage.jsx
 * Exact same layout and flow as TallyExportPage (Sales Export).
 * Uses tallyApi.openPOExportStream → /api/tally/po-export-stream (SSE).
 * Does NOT touch TallyExportPage or Sales export in any way.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tallyApi } from '../../api/tallyApi';
import { toast } from '../../components/common/Toast';

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

function Spinner({ size = 20, color = '#1e40af' }) {
  return (
    <>
      <div style={{
        width: size, height: size,
        border: `3px solid ${color}22`, borderTop: `3px solid ${color}`,
        borderRadius: '50%', animation: 'po-spin 0.7s linear infinite', flexShrink: 0,
      }} />
      <style>{`@keyframes po-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

// ─── Connection status widget (same as TallyExportPage) ──────────────────────
function ConnectionStatus({ status, openCompany, onRecheck }) {
  if (status === 'checking') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'#eff6ff', border:'1.5px solid #93c5fd', borderRadius:12 }}>
        <Spinner size={16} color="#2563eb" />
        <span style={{ fontSize:13, fontWeight:600, color:'#1d4ed8' }}>Connecting to Tally…</span>
      </div>
    );
  }
  if (status === 'unreachable') {
    return (
      <div style={{ padding:'14px 16px', background:'#fef2f2', border:'1.5px solid #fca5a5', borderLeft:'4px solid #ef4444', borderRadius:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:6 }}>⚠️ Cannot connect to Tally</div>
        <div style={{ fontSize:12, color:'#991b1b', lineHeight:1.6 }}>
          Make sure Tally Prime is running and the HTTP Server is enabled or the Connector is online.
        </div>
        <button onClick={onRecheck} style={{ marginTop:8, fontSize:12, fontWeight:700, color:'#dc2626', textDecoration:'underline', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
          Retry Connection →
        </button>
      </div>
    );
  }
  if (status === 'connected') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:12 }}>
        <span style={{ fontSize:20 }}>✅</span>
        <div>
          <span style={{ fontSize:13, fontWeight:700, color:'#15803d' }}>Tally connected</span>
          {openCompany && <span style={{ fontSize:12, color:'#166534', marginLeft:8 }}>Company: <strong>{openCompany}</strong></span>}
        </div>
        <button onClick={onRecheck} style={{ marginLeft:'auto', fontSize:11, color:'#15803d', textDecoration:'underline', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Recheck</button>
      </div>
    );
  }
  return null;
}

// ─── Live terminal (same as TallyExportPage, colour accent = red) ─────────────
function Terminal({ logs, done, onClose, onCancel }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div style={{ background:'#0f172a', borderRadius:14, padding:'14px 18px', marginBottom:20, border:'1.5px solid #991b1b' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {!done
            ? <div style={{ width:9, height:9, borderRadius:'50%', background:'#f87171', animation:'po-pulse 1s infinite' }} />
            : <span style={{ fontSize:14 }}>✅</span>
          }
          <span style={{ ...mono, color:'#e2e8f0', fontWeight:700, fontSize:13 }}>
            {done ? 'PO Export Complete' : 'Exporting PO Invoices to Tally…'}
          </span>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'#991b1b', color:'#fca5a5', border:'1px solid #991b1b' }}>
            ERP → Tally
          </span>
        </div>
        {done
          ? <button onClick={onClose} style={{ background:'none', border:'1px solid #334155', color:'#94a3b8', borderRadius:6, padding:'3px 10px', cursor:'pointer', ...mono }}>Close</button>
          : <button onClick={onCancel} style={{ background:'none', border:'1px solid #ef4444', color:'#f87171', borderRadius:6, padding:'3px 10px', cursor:'pointer', ...mono }}>Cancel</button>
        }
      </div>
      <div ref={ref} style={{ maxHeight:260, overflowY:'auto', ...mono, lineHeight:1.8, paddingRight:2 }}>
        {logs.map((l, i) => (
          <div key={i} style={{
            color: l.level === 'error'   ? '#f87171'
                 : l.level === 'warn'    ? '#fbbf24'
                 : l.level === 'success' ? '#4ade80'
                 : l.level === 'phase'   ? '#fbbf24'
                 : '#64748b',
            whiteSpace:'pre-wrap',
          }}>{l.text}</div>
        ))}
        {!done && <div style={{ color:'#334155' }}>▌</div>}
      </div>
      <style>{`@keyframes po-pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

// ─── Export result table (same structure as TallyExportPage report) ──────────
function ExportReport({ taskResults, duration }) {
  if (!taskResults?.length) return null;
  const failed = taskResults.filter(t => !t.ok);
  return (
    <div style={{ ...card, marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:900, color:'#1e293b', marginBottom:4 }}>
            {failed.length === 0 ? '🎉 PO Export Completed Successfully' : '⚠️ PO Export Completed with Errors'}
          </div>
          {duration && <div style={{ fontSize:12, color:'#94a3b8' }}>Duration: <strong>{duration}</strong></div>}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ textAlign:'center', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'10px 18px', minWidth:90 }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#15803d' }}>{taskResults.reduce((s,t)=>s+(t.records||0),0)}</div>
            <div style={{ fontSize:11, color:'#15803d', fontWeight:600 }}>Total Records</div>
          </div>
          <div style={{ textAlign:'center', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'10px 18px', minWidth:90 }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#15803d' }}>{taskResults.reduce((s,t)=>s+(t.created||0),0)}</div>
            <div style={{ fontSize:11, color:'#15803d', fontWeight:600 }}>Created</div>
          </div>
          <div style={{ textAlign:'center', background:'#fefce8', border:'1px solid #fde047', borderRadius:12, padding:'10px 18px', minWidth:90 }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#a16207' }}>{taskResults.reduce((s,t)=>s+(t.altered||0),0)}</div>
            <div style={{ fontSize:11, color:'#a16207', fontWeight:600 }}>Altered</div>
          </div>
        </div>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background:'#f8fafc' }}>
            {['Entity','Status','Records','Created','Altered','Notes'].map(h => (
              <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1.5px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {taskResults.map((t, i) => (
            <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
              <td style={{ padding:'10px 12px', fontWeight:600, color:'#1e293b' }}>{t.label || t.entity || 'PO Invoices'}</td>
              <td style={{ padding:'10px 12px' }}>
                {t.ok ? <Badge status="success">✅ Success</Badge> : <Badge status="failed">❌ Failed</Badge>}
              </td>
              <td style={{ padding:'10px 12px', fontWeight:700, color:'#1e293b' }}>{(t.records||0).toLocaleString()}</td>
              <td style={{ padding:'10px 12px', color:'#15803d', fontWeight:600 }}>{(t.created||0).toLocaleString()}</td>
              <td style={{ padding:'10px 12px', color:'#f59e0b', fontWeight:600 }}>{(t.altered||0).toLocaleString()}</td>
              <td style={{ padding:'10px 12px', color: t.ok ? '#94a3b8' : '#dc2626', fontSize:12 }}>{t.error || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — mirrors TallyExportPage exactly, wired to PO SSE endpoint
// ═══════════════════════════════════════════════════════════════════════════════
export default function POTallyExportPage() {
  const navigate = useNavigate();

  // ── Connection state ────────────────────────────────────────────────────────
  const [connStatus, setConnStatus] = useState('idle'); // idle | checking | connected | unreachable
  const [openCompany, setOpenCompany] = useState(null);

  // ── Pending count ───────────────────────────────────────────────────────────
  const [pendingCount, setPendingCount] = useState(null);

  // ── Stream state ────────────────────────────────────────────────────────────
  const [running, setRunning]   = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [termDone, setTermDone] = useState(false);
  const [logs, setLogs]         = useState([]);

  // ── Report ──────────────────────────────────────────────────────────────────
  const [taskResults, setTaskResults]     = useState([]);
  const [reportDuration, setReportDuration] = useState('');

  const esRef   = useRef(null);
  const taskBuf = useRef([]);

  // ── Load pending count on mount ────────────────────────────────────────────
  const loadCount = useCallback(async () => {
    try {
      const r = await tallyApi.getPOExportCount();
      setPendingCount(r.data?.poInvoices?.count ?? 0);
    } catch (_) { setPendingCount(0); }
  }, []);

  useEffect(() => { loadCount(); }, [loadCount]);

  // ── Check connection — same call as TallyExportPage ───────────────────────
  const checkConnection = useCallback(async () => {
    setConnStatus('checking');
    try {
      const r = await tallyApi.validateCompany();
      const d = r.data || r; // handle both { data: {...} } and flat response shapes
      if (!d.reachable) {
        setConnStatus('unreachable');
      } else {
        setConnStatus('connected');
        setOpenCompany(d.openCompany || null);
      }
    } catch {
      setConnStatus('unreachable');
    }
  }, []);

  const pushLog = (level, text) => setLogs(p => [...p, { level, text }]);

  // ── Start PO Export — same flow as TallyExportPage.startExport ──────────────
  const startExport = async () => {
    if (running) { toast('An export is already in progress', 'error'); return; }

    // Validate connection first (same as Sales export)
    if (connStatus !== 'connected') {
      await checkConnection();
      return; // let user click again after seeing status
    }

    esRef.current?.close();
    setRunning(true);
    setTermOpen(true);
    setTermDone(false);
    setLogs([]);
    setTaskResults([]);
    setReportDuration('');
    taskBuf.current = [];

    const onEvent = (ev) => {
      switch (ev.event) {
        case 'start':
          pushLog('info', `▶ ${ev.message}`);
          break;
        case 'log':
          pushLog(ev.level || 'info', `  ${ev.entity ? `[${ev.entity}] ` : ''}${ev.message}`);
          break;
        case 'phase_start':
          pushLog('phase', `\n  [${ev.index}/${ev.total}] ⏳ ${ev.entity}`);
          break;
        case 'phase_done':
          if (ev.ok) {
            pushLog('success', `  ✅ ${ev.entity}: ${ev.records || 0} records exported`);
          } else {
            pushLog('error', `  ❌ ${ev.entity}: ${ev.error || 'Failed'}`);
          }
          taskBuf.current.push({
            entity: ev.entity, label: ev.entity,
            ok: ev.ok, records: ev.records || 0,
            created: ev.created || 0, altered: ev.altered || 0,
            error: ev.error,
          });
          setTaskResults([...taskBuf.current]);
          break;
        case 'done':
          setTermDone(true);
          setRunning(false);
          if (ev.duration) setReportDuration(ev.duration);
          esRef.current?.close();
          loadCount();
          toast(ev.ok ? 'PO Export to Tally completed!' : `PO Export failed: ${ev.message}`, ev.ok ? 'success' : 'error');
          break;
        case 'error':
          pushLog('error', `❌ ${ev.message}`);
          setTermDone(true);
          setRunning(false);
          esRef.current?.close();
          toast(ev.message, 'error');
          break;
        default:
          break;
      }
    };

    // Uses po-export-stream endpoint — same SSE pattern as full-export-stream
    const es = tallyApi.openPOExportStream(onEvent);
    esRef.current = es;
  };

  const cancelExport = () => {
    esRef.current?.close();
    esRef.current = null;
    setRunning(false);
    setTermDone(true);
    pushLog('warn', '\n⚠️ Export cancelled by user');
    toast('PO Export cancelled', 'warning');
  };

  const closeTerminal = () => { setTermOpen(false); setLogs([]); };

  const canExport = connStatus === 'connected' && !running;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 4px' }}>

      {/* ── Page header — same structure as TallyExportPage ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:900, color:'#1e293b', margin:0, letterSpacing:'-0.5px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ background:'linear-gradient(135deg,#1e40af,#1e3a8a)', borderRadius:12, width:40, height:40, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🛒</span>
            PO Export to Tally
          </h2>
          <p style={{ fontSize:12, color:'#94a3b8', margin:'5px 0 0 50px', fontWeight:500 }}>
            Push PO Invoices (Purchase Orders) into Tally Prime as Purchase vouchers — same connector flow as Sales Export
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button
            onClick={() => navigate('/tally/export')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer', fontFamily:'inherit' }}>
            ← Sales Export
          </button>
          <button
            onClick={() => navigate('/tally/overview')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer', fontFamily:'inherit' }}>
            📊 Tally Overview
          </button>
        </div>
      </div>

      {/* ── Connection status — same widget as TallyExportPage ── */}
      <div style={{ marginBottom:20 }}>
        <ConnectionStatus status={connStatus} openCompany={openCompany} onRecheck={checkConnection} />
        {connStatus === 'idle' && (
          <button
            onClick={checkConnection}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', background:'linear-gradient(135deg,#1e40af,#1e3a8a)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 14px rgba(192,57,43,0.3)' }}>
            🔍 Check Tally Connection
          </button>
        )}
      </div>

      {/* ── Pending count badge ── */}
      {pendingCount !== null && (
        <div style={{ ...card, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'#1e293b', marginBottom:4 }}>📋 Pending PO Invoices</div>
            <div style={{ fontSize:12, color:'#64748b' }}>
              {pendingCount === 0
                ? 'All PO invoices are already synced to Tally.'
                : `${pendingCount} invoice${pendingCount !== 1 ? 's' : ''} ready to push to Tally as Purchase vouchers.`
              }
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{
              fontSize:28, fontWeight:900,
              color: pendingCount > 0 ? '#1e40af' : '#15803d',
              background: pendingCount > 0 ? '#fef2f2' : '#f0fdf4',
              border: `1.5px solid ${pendingCount > 0 ? '#fca5a5' : '#86efac'}`,
              borderRadius:12, padding:'8px 20px',
            }}>
              {pendingCount}
            </span>
            <button onClick={loadCount} style={{ padding:'8px 14px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer', fontFamily:'inherit' }}>
              🔄 Refresh
            </button>
          </div>
        </div>
      )}

      {/* ── Main export button — same style as TallyExportPage ── */}
      <div style={{ ...card, marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:800, color:'#1e293b', marginBottom:16 }}>
          🛒 Export PO Invoices to Tally
        </div>

        {!running ? (
          <button
            onClick={startExport}
            disabled={running}
            style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'16px 28px',
              background: connStatus === 'connected' && pendingCount > 0
                ? 'linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%)'
                : '#e2e8f0',
              color: connStatus === 'connected' && pendingCount > 0 ? '#fff' : '#94a3b8',
              border:'none', borderRadius:14,
              fontSize:16, fontWeight:800,
              cursor: connStatus === 'connected' && pendingCount > 0 ? 'pointer' : 'not-allowed',
              fontFamily:'inherit',
              boxShadow: connStatus === 'connected' && pendingCount > 0 ? '0 6px 20px rgba(192,57,43,0.35)' : 'none',
              transition:'all 0.2s',
            }}
            onMouseEnter={e => { if (canExport && pendingCount > 0) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(192,57,43,0.45)'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow = connStatus==='connected' && pendingCount>0 ? '0 6px 20px rgba(192,57,43,0.35)' : 'none'; }}
          >
            <span style={{ fontSize:24 }}>🛒</span>
            <div style={{ textAlign:'left' }}>
              <div>
                {connStatus !== 'connected'
                  ? 'Check Connection First'
                  : pendingCount === 0
                    ? 'No Pending PO Invoices'
                    : `Export ${pendingCount} PO Invoice${pendingCount !== 1 ? 's' : ''} to Tally`
                }
              </div>
              <div style={{ fontSize:12, opacity:0.8, fontWeight:500, marginTop:2 }}>
                ERP → Tally · Purchase vouchers via connector
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={cancelExport}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 28px', background:'#fff', border:'1.5px solid #e2e8f0', color:'#dc2626', borderRadius:14, fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            <Spinner size={20} color="#dc2626" /> Exporting… (Cancel)
          </button>
        )}

        {connStatus !== 'connected' && connStatus !== 'idle' && (
          <div style={{ marginTop:12, fontSize:12, color:'#94a3b8' }}>
            Check Tally connection above before exporting.
          </div>
        )}
        {connStatus === 'idle' && (
          <div style={{ marginTop:12, fontSize:12, color:'#94a3b8' }}>
            Click <strong>Check Tally Connection</strong> above first, then export.
          </div>
        )}
      </div>

      {/* ── Live terminal — appears when export starts, same as TallyExportPage ── */}
      {termOpen && (
        <Terminal
          logs={logs}
          done={termDone}
          onClose={closeTerminal}
          onCancel={cancelExport}
        />
      )}

      {/* ── Export report — appears after completion ── */}
      {taskResults.length > 0 && (
        <ExportReport taskResults={taskResults} duration={reportDuration} />
      )}

      {/* ── Info box ── */}
      <div style={{ ...card, background:'#f8fafc', border:'1.5px solid #e2e8f0' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#475569', marginBottom:10 }}>ℹ️ What gets exported</div>
        <ul style={{ margin:0, paddingLeft:20, fontSize:13, color:'#64748b', lineHeight:1.9 }}>
          <li>All PO Invoices with status <strong>Approved / Sent / Paid</strong> that have not yet been synced to Tally.</li>
          <li>Each invoice is pushed as a <strong>Purchase voucher</strong> in Tally Prime via the same connector as Sales Export.</li>
          <li>Vendor ledgers are auto-created under <em>Sundry Creditors</em> if they don't exist.</li>
          <li>Stock items are auto-created if they don't exist in Tally.</li>
          <li>Once exported, invoices are marked <strong>tallySync = true</strong> and will not be re-exported.</li>
          <li><strong>This export does NOT affect the Sales Export.</strong> Both run independently.</li>
        </ul>
      </div>

    </div>
  );
}
