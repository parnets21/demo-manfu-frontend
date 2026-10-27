import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import {
  MdUploadFile, MdInventory2, MdApproval, MdReceipt,
  MdHourglassEmpty, MdHistory, MdArrowForward,
  MdTrendingUp, MdCurrencyRupee, MdDescription, MdPending,
} from 'react-icons/md';

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 44, width = 100 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 4 - (v / max) * (height - 12);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaBottom = `${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${areaBottom}`} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Area / Bar Chart ──────────────────────────────────────────────────────────
function AreaChart({ data, keys, colors, labels, height = 180 }) {
  const W = 520, H = height;
  const PAD = { top: 20, right: 16, bottom: 36, left: 40 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;
  const maxVal = Math.max(...data.flatMap(d => keys.map(k => d[k] || 0)), 1);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xStep = cW / Math.max(data.length - 1, 1);

  const linePoints = (key) => data.map((d, i) => {
    const x = PAD.left + i * xStep;
    const y = PAD.top + cH - ((d[key] || 0) / maxVal) * cH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPoints = (key) => {
    const line = data.map((d, i) => {
      const x = PAD.left + i * xStep;
      const y = PAD.top + cH - ((d[key] || 0) / maxVal) * cH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const last = `${(PAD.left + (data.length - 1) * xStep).toFixed(1)},${(PAD.top + cH).toFixed(1)}`;
    const first = `${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)}`;
    return [...line, last, first].join(' ');
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      <defs>
        {keys.map((k, ki) => (
          <linearGradient key={k} id={`ag-${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[ki]} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colors[ki]} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* Grid lines */}
      {yTicks.map(t => {
        const y = PAD.top + cH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#cbd5e1">{Math.round(maxVal * t)}</text>
          </g>
        );
      })}

      {/* Area fills */}
      {keys.map((k, ki) => (
        <polygon key={k} points={areaPoints(k)} fill={`url(#ag-${k})`} />
      ))}

      {/* Lines */}
      {keys.map((k, ki) => (
        <polyline key={k} points={linePoints(k)} fill="none" stroke={colors[ki]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* Dots on last point */}
      {keys.map((k, ki) => {
        const last = data[data.length - 1];
        const x = PAD.left + (data.length - 1) * xStep;
        const y = PAD.top + cH - ((last?.[k] || 0) / maxVal) * cH;
        return <circle key={k} cx={x} cy={y} r="4" fill={colors[ki]} stroke="#fff" strokeWidth="2" />;
      })}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={PAD.left + i * xStep} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label}</text>
      ))}

      {/* Legend */}
      {keys.map((k, ki) => (
        <g key={k} transform={`translate(${PAD.left + ki * 100}, ${H - 1})`}>
          <rect x="0" y="-8" width="8" height="8" rx="2" fill={colors[ki]} />
          <text x="12" y="0" fontSize="9" fill="#94a3b8">{labels[ki]}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 130 }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.37, inner = size * 0.25;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = -Math.PI / 2;

  const arcs = segments.map(seg => {
    const sweep = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...seg, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => <path key={i} d={arc.d} fill={arc.color} />)}
      <circle cx={cx} cy={cy} r={inner} fill="#fff" />
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize="18" fontWeight="900" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700" letterSpacing="1">TOTAL</text>
    </svg>
  );
}

// ── Module definitions ────────────────────────────────────────────────────────
const MODULES = [
  { icon: MdUploadFile,     label: 'PO Upload',      sub: 'Upload & track PO PDFs',    path: '/po-generator/upload',          accent: '#6366f1', light: '#eef2ff' },
  { icon: MdInventory2,     label: 'Stock Verify',   sub: 'Check stock vs PO items',   path: '/po-generator/stock-verify',    accent: '#059669', light: '#ecfdf5' },
  { icon: MdApproval,       label: 'Approval Queue', sub: 'Approve pending invoices',  path: '/po-generator/approval-queue',  accent: '#d97706', light: '#fffbeb' },
  { icon: MdReceipt,        label: 'Partial Invoice',sub: 'Generate partial invoices', path: '/po-generator/partial-invoice', accent: '#dc2626', light: '#fef2f2' },
  { icon: MdHourglassEmpty, label: 'Pending Orders', sub: 'Track unfulfilled items',   path: '/po-generator/pending-orders',  accent: '#7c3aed', light: '#f5f3ff' },
  { icon: MdHistory,        label: 'Invoice History',sub: 'All generated invoices',    path: '/po-generator/invoice-history', accent: '#0891b2', light: '#ecfeff' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function POGeneratorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    poGeneratorApi.getStats()
      .then(res => setStats(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const trend = stats.trend || Array(7).fill({ label: '—', invoices: 0, partial: 0, full: 0, value: 0, pos: 0 });

  const kpis = [
    {
      label: 'Total POs', value: stats.totalPOs || 0,
      icon: MdDescription, accent: '#6366f1', light: '#eef2ff',
      spark: trend.map(d => d.pos || 0), sub: 'Purchase Orders',
    },
    {
      label: 'Total Invoices', value: stats.totalInvoices || 0,
      icon: MdReceipt, accent: '#059669', light: '#ecfdf5',
      spark: trend.map(d => d.invoices || 0), sub: 'All statuses',
    },
    {
      label: 'Partial Invoices', value: stats.partialInvoices || 0,
      icon: MdPending, accent: '#d97706', light: '#fffbeb',
      spark: trend.map(d => d.partial || 0), sub: 'Partially fulfilled',
    },
    {
      label: 'Full Invoices', value: stats.fullInvoices || 0,
      icon: MdApproval, accent: '#0891b2', light: '#ecfeff',
      spark: trend.map(d => d.full || 0), sub: 'Fully fulfilled',
    },
    {
      label: 'Pending Orders', value: stats.totalPending || 0,
      icon: MdHourglassEmpty, accent: '#dc2626', light: '#fef2f2',
      spark: null, sub: 'Awaiting dispatch',
    },
    {
      label: 'Total Value', value: `₹${((stats.totalValue || 0) / 100000).toFixed(1)}L`,
      icon: MdCurrencyRupee, accent: '#1e40af', light: '#fff5f5',
      spark: trend.map(d => Math.round((d.value || 0) / 1000)), sub: 'Invoice value',
    },
  ];

  const donutSegments = [
    { label: 'Draft',    value: stats.draftInvoices    || 0, color: '#94a3b8' },
    { label: 'Approved', value: stats.approvedInvoices || 0, color: '#059669' },
    { label: 'Paid',     value: stats.paidInvoices     || 0, color: '#6366f1' },
    { label: 'Partial',  value: stats.partialInvoices  || 0, color: '#f59e0b' },
  ].filter(s => s.value > 0);
  if (!donutSegments.length) donutSegments.push({ label: 'No Data', value: 1, color: '#e2e8f0' });

  const fmt = (v) => Number(v || 0).toLocaleString('en-IN');

  return (
    <div style={{ padding: '24px 28px', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'inherit' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .pg-card { background:#fff; border-radius:16px; border:1px solid #e8edf2; box-shadow:0 2px 8px rgba(15,23,42,0.05); }
        .pg-mod-card { background:#fff; border-radius:14px; border:1px solid #e8edf2; box-shadow:0 1px 4px rgba(15,23,42,0.04); padding:18px 16px; cursor:pointer; transition:transform 0.15s,box-shadow 0.15s; display:flex; flex-direction:column; gap:12px; }
        .pg-mod-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(15,23,42,0.10); }
        .pg-kpi-card { background:#fff; border-radius:16px; border:1px solid #e8edf2; box-shadow:0 2px 8px rgba(15,23,42,0.05); padding:18px 20px; animation:fadeUp 0.35s ease both; }
      `}</style>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #172554 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(15,23,42,0.22)',
      }}>
        {/* decorative blobs */}
        <div style={{ position:'absolute', top:-60, right:160, width:220, height:220, borderRadius:'50%', background:'rgba(99,102,241,0.08)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-50, right:60,  width:160, height:160, borderRadius:'50%', background:'rgba(192,57,43,0.10)',  pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-30,  left:300,   width:120, height:120, borderRadius:'50%', background:'rgba(5,150,105,0.06)',   pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:8 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#1e40af,#1e3a8a)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(192,57,43,0.4)' }}>
              <MdReceipt size={26} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:900, color:'#f8fafc', letterSpacing:'-0.5px' }}>PO Generator</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:1 }}>Partial Invoice · Stock Reconciliation · Dispatch Tracking</div>
            </div>
          </div>
          {/* inline stats */}
          <div style={{ display:'flex', gap:20, marginTop:4 }}>
            {[
              { label:'Invoices', value: stats.totalInvoices || 0 },
              { label:'Pending',  value: stats.totalPending  || 0 },
              { label:'Value',    value: `₹${((stats.totalValue || 0)/100000).toFixed(1)}L` },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                <span style={{ fontSize:18, fontWeight:900, color:'#f1f5f9' }}>{loading ? '—' : s.value}</span>
                <span style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* nav buttons */}
        <div style={{ position:'relative', zIndex:1, display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {[
            { label:'PO Upload',       path:'/po-generator/upload',          bg:'rgba(99,102,241,0.15)',  border:'rgba(99,102,241,0.35)',  color:'#c7d2fe' },
            { label:'Stock Verify',    path:'/po-generator/stock-verify',    bg:'rgba(5,150,105,0.15)',   border:'rgba(5,150,105,0.35)',   color:'#6ee7b7' },
            { label:'Approval Queue',  path:'/po-generator/approval-queue',  bg:'rgba(217,119,6,0.15)',   border:'rgba(217,119,6,0.35)',   color:'#fde68a' },
          ].map(b => (
            <button key={b.label} onClick={() => navigate(b.path)}
              style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', background:b.bg, color:b.color, border:`1px solid ${b.border}`, borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', backdropFilter:'blur(4px)', transition:'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity='1'}>
              {b.label} <MdArrowForward size={13} />
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 22 }}>
        {kpis.map((k, idx) => (
          <div key={k.label} className="pg-kpi-card" style={{ animationDelay: `${idx * 0.05}s` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: k.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={20} color={k.accent} />
              </div>
              {k.spark && !loading && (
                <Sparkline data={k.spark} color={k.accent} width={72} height={36} />
              )}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {loading ? <span style={{ color: '#e2e8f0' }}>—</span> : k.value}
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{k.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{k.sub}</div>
            </div>
            <div style={{ marginTop: 10, height: 3, borderRadius: 99, background: k.light, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: k.accent, width: loading ? '0%' : '100%', transition: 'width 1s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Daily Activity */}
        <div className="pg-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Daily Activity</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>POs created vs Invoices — last 7 days</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['#6366f1','POs'],['#059669','Invoices']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c }} />
                  <span style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 180, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:24, height:24, border:'3px solid #e2e8f0', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <AreaChart data={trend} keys={['pos','invoices']} colors={['#6366f1','#059669']} labels={['POs','Invoices']} height={180} />
          )}
        </div>

        {/* Invoice Breakdown */}
        <div className="pg-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Invoice Breakdown</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Partial vs Full invoices — last 7 days</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['#f59e0b','Partial'],['#0891b2','Full']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c }} />
                  <span style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 180, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:24, height:24, border:'3px solid #e2e8f0', borderTopColor:'#f59e0b', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <AreaChart data={trend} keys={['partial','full']} colors={['#f59e0b','#0891b2']} labels={['Partial','Full']} height={180} />
          )}
        </div>
      </div>

      {/* ── Bottom Row: Donut + Value Chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 22 }}>

        {/* Donut */}
        <div className="pg-card" style={{ padding: '20px 22px', display:'flex', flexDirection:'column' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Invoice Status</div>
          {loading ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:140 }}>
              <div style={{ width:24, height:24, border:'3px solid #e2e8f0', borderTopColor:'#1e40af', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
                <DonutChart segments={donutSegments} size={130} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {donutSegments.map(s => (
                  <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:s.color }} />
                      <span style={{ fontSize:12, color:'#475569', fontWeight:500 }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:800, color:s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Value Trend */}
        <div className="pg-card" style={{ padding: '20px 22px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>Invoice Value Trend</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Daily invoice value (₹'000) — last 7 days</div>
            </div>
            <div style={{ background:'#fff5f5', border:'1px solid #fecaca', borderRadius:8, padding:'4px 10px' }}>
              <span style={{ fontSize:12, fontWeight:800, color:'#1e40af' }}>
                ₹{((stats.totalValue||0)/100000).toFixed(1)}L total
              </span>
            </div>
          </div>
          {loading ? (
            <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:24, height:24, border:'3px solid #e2e8f0', borderTopColor:'#1e40af', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <AreaChart
              data={trend.map(d => ({ ...d, valueK: Math.round((d.value||0)/1000) }))}
              keys={['valueK']} colors={['#1e40af']} labels={['₹K']} height={180}
            />
          )}
        </div>
      </div>

      {/* ── Quick Navigation Modules ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 14, display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:4, height:18, borderRadius:2, background:'linear-gradient(180deg,#1e40af,#6366f1)' }} />
          Quick Navigation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {MODULES.map(m => (
            <div key={m.label} className="pg-mod-card" onClick={() => navigate(m.path)}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ width:40, height:40, borderRadius:11, background:m.light, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <m.icon size={20} color={m.accent} />
                </div>
                <div style={{ width:26, height:26, borderRadius:8, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
                  <MdArrowForward size={14} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.4 }}>{m.sub}</div>
              </div>
              <div style={{ height:2, borderRadius:99, background:m.light }}>
                <div style={{ height:'100%', width:'40%', borderRadius:99, background:m.accent, opacity:0.6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
