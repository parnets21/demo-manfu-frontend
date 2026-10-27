import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../auth/AuthContext';
import { prApi } from '../../api/prApi';
import { poApi } from '../../api/poApi';
import { grnApi } from '../../api/grnApi';
import { approvalApi } from '../../api/approvalApi';
import { qualityCheckApi } from '../../api/qualityCheckApi';
import { vendorApi } from '../../api/vendorApi';
import { inventoryApi } from '../../api/inventoryApi';
import { inventoryFlowApi } from '../../api/inventoryFlowApi';
import { erpDealerOrderApi } from '../../api/erpDealerOrderApi';
import { tallyApi } from '../../api/tallyApi';
import { financeApi } from '../../api/financeApi';
import { MdProductionQuantityLimits, MdSyncAlt, MdAccountBalance, MdReceiptLong, MdAssignmentReturn } from 'react-icons/md';
import { useDataEvent } from '../../utils/dataEvents';

// ── Greeting helper ────────────────────────────────────────────────────────────
function getGreeting() {
  const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false };
  const h = parseInt(new Date().toLocaleString('en-IN', options).split(':')[0], 10);
  if (h < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  if (h < 21) return { text: 'Good Evening', emoji: '🌆' };
  return { text: 'Good Night', emoji: '🌙' };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt  = (n) => n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${(n||0).toLocaleString('en-IN')}`;
const fmtN = (n) => n >= 10000000 ? `${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `${(n/100000).toFixed(1)}L` : (n||0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

// ── Card shell ─────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e8edf2', boxShadow:'0 2px 10px rgba(15,23,42,0.05)', overflow:'hidden', ...style }}>
      {children}
    </div>
  );
}
function CardHead({ title, sub, right, accent }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'16px 18px 0', marginBottom:14, borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{title}</div>
        {sub && <div style={{ fontSize:11.5, color:'#94a3b8', marginTop:2 }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink:0, marginLeft:8 }}>{right}</div>}
    </div>
  );
}
function SectionLabel({ children, color = '#ef4444' }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block' }} />
      {children}
    </div>
  );
}

// ── Stat pill inside a card ────────────────────────────────────────────────────
function StatRow({ label, value, color = '#64748b' }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #f8fafc' }}>
      <span style={{ fontSize:11.5, color:'#64748b' }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color }}>{value}</span>
    </div>
  );
}

// ── Sync health badge ──────────────────────────────────────────────────────────
function SyncBadge({ status }) {
  const map = { Connected:{ bg:'#dcfce7', color:'#16a34a', dot:'#22c55e' }, Disconnected:{ bg:'#fee2e2', color:'#dc2626', dot:'#ef4444' }, Unknown:{ bg:'#fef3c7', color:'#b45309', dot:'#f59e0b' } };
  const s = map[status] || map.Unknown;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:s.bg, color:s.color, borderRadius:20, padding:'3px 9px', fontSize:10.5, fontWeight:700 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot }} />
      {status || 'Unknown'}
    </span>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go       = (path) => navigate(path);
  const greeting = getGreeting();
  const today    = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // ── ERP state ──────────────────────────────────────────────────────────────
  const [loading,           setLoading]           = useState(true);
  const [tallyLoading,      setTallyLoading]      = useState(true);
  const [prStats,           setPrStats]           = useState({ total:0, pending:0, approved:0 });
  const [poStats,           setPoStats]           = useState({ total:0, pending:0, approved:0, totalValue:0 });
  const [grnStats,          setGrnStats]          = useState({ total:0, pending:0 });
  const [approvalStats,     setApprovalStats]     = useState({ pending:0, approved:0, total:0 });
  const [qcStats,           setQcStats]           = useState({ total:0, passed:0, pending:0, partial:0, rejected:0 });
  const [vendorStats,       setVendorStats]       = useState({ total:0, active:0 });
  const [inventoryStats,    setInventoryStats]    = useState({ total:0, critical:0 });
  const [dealerOrderStats,  setDealerOrderStats]  = useState({});
  const [recentPOs,         setRecentPOs]         = useState([]);
  const [pendingApprovals,  setPendingApprovals]  = useState([]);
  const [lowStock,          setLowStock]          = useState([]);
  const [flowData,          setFlowData]          = useState(null);
  const [financeStats,      setFinanceStats]      = useState(null);

  // ── Tally state ────────────────────────────────────────────────────────────
  const [tallyStats, setTallyStats] = useState(null); // full dashboard-stats response

  // ── ERP fetch ──────────────────────────────────────────────────────────────
  const fetchERP = useCallback(async () => {
    setLoading(true);
    try {
      const [prRes, poRes, grnRes, approvalRes, qcRes, vendorRes, invStatsRes, invItemsRes, appListRes, flowRes, dealerStatsRes, finRes] = await Promise.allSettled([
        prApi.getAll(),
        poApi.getAll(),
        grnApi.getAll(),
        approvalApi.getStats(),
        qualityCheckApi.getStats(),
        vendorApi.getAll(),
        inventoryApi.getStats(),
        inventoryApi.getAll(),
        approvalApi.getAll({ status: 'Pending' }),
        inventoryFlowApi.getDashboard(),
        erpDealerOrderApi.getDashboardStats(),
        financeApi.getDashboardStats(),
      ]);

      if (prRes.status === 'fulfilled') {
        const prs = prRes.value.data || [];
        setPrStats({ total: prs.length, pending: prs.filter(p => p.status==='Pending').length, approved: prs.filter(p => p.status==='Approved').length });
      }
      if (poRes.status === 'fulfilled') {
        const pos = poRes.value.data || [];
        setPoStats({ total: pos.length, pending: pos.filter(p => p.status==='Pending').length, approved: pos.filter(p => p.status==='Approved').length, totalValue: pos.reduce((s,p) => s+(p.grandTotal||0), 0) });
        setRecentPOs(pos.slice(0,5));
      }
      if (grnRes.status === 'fulfilled') {
        const grns = grnRes.value.data || [];
        setGrnStats({ total: grns.length, pending: grns.filter(g => g.qcStatus==='Pending'||g.qcStatus==='Not Started').length });
      }
      if (approvalRes.status === 'fulfilled') setApprovalStats(approvalRes.value.data || {});
      if (qcRes.status === 'fulfilled') setQcStats(qcRes.value.data || {});
      if (vendorRes.status === 'fulfilled') {
        const v = vendorRes.value.data || [];
        setVendorStats({ total: v.length, active: v.filter(x => x.status==='Active').length });
      }
      if (invStatsRes.status === 'fulfilled') {
        const s = invStatsRes.value.data || {};
        setInventoryStats({ total: s.total||0, critical: s.critical||0 });
      }
      if (invItemsRes.status === 'fulfilled') {
        const items = invItemsRes.value.data || [];
        if (invStatsRes.status !== 'fulfilled') setInventoryStats({ total: items.length, critical: items.filter(i => i.status==='Critical').length });
        setLowStock(items.filter(i => i.status==='Critical'||(i.minQty>0&&i.qty<i.minQty)).slice(0,4));
      }
      if (appListRes.status === 'fulfilled') setPendingApprovals((appListRes.value.data||[]).slice(0,4));
      if (flowRes.status === 'fulfilled') setFlowData(flowRes.value.data||null);
      if (dealerStatsRes.status === 'fulfilled') setDealerOrderStats(dealerStatsRes.value.data||{});
      if (finRes.status === 'fulfilled') setFinanceStats(finRes.value.data||null);
    } catch (e) { console.error('ERP fetch error:', e); }
    finally { setLoading(false); }
  }, []);

  // ── Tally fetch ────────────────────────────────────────────────────────────
  const fetchTally = useCallback(async () => {
    setTallyLoading(true);
    try {
      const res = await tallyApi.getDashboardStats();
      if (res.success) setTallyStats(res.data || null);
    } catch (e) { console.error('Tally fetch error:', e); }
    finally { setTallyLoading(false); }
  }, []);

  useEffect(() => { fetchERP(); fetchTally(); }, [fetchERP, fetchTally]);

  // Re-fetch on module events
  useDataEvent('pr:changed',           fetchERP);
  useDataEvent('po:changed',           fetchERP);
  useDataEvent('grn:changed',          fetchERP);
  useDataEvent('vendor:changed',       fetchERP);
  useDataEvent('approval:changed',     fetchERP);
  useDataEvent('qc:changed',           fetchERP);
  useDataEvent('inventory:changed',    fetchERP);
  useDataEvent('dealer-order:changed', fetchERP);
  useDataEvent('tally:synced',         fetchTally);

  // ── Derived values ─────────────────────────────────────────────────────────
  const tv = tallyStats?.tallyVouchers;
  const tm = tallyStats?.tallyMasters;
  const es = tallyStats?.erpStats;
  const fs = tallyStats?.financeStats;
  const sh = tallyStats?.syncHealth;

  const procurementDonut = [
    { label:'Approved PRs', value: prStats.approved||0,  color:'#22c55e' },
    { label:'Pending PRs',  value: prStats.pending||0,   color:'#f59e0b' },
    { label:'Approved POs', value: poStats.approved||0,  color:'#3b82f6' },
    { label:'Pending POs',  value: poStats.pending||0,   color:'#ef4444' },
  ].filter(d => d.value > 0);

  const qcBar = [
    { label:'Passed',  value: qcStats.passed||0,  color:'#22c55e' },
    { label:'Partial', value: qcStats.partial||0, color:'#f59e0b' },
    { label:'Pending', value: qcStats.pending||0, color:'#3b82f6' },
    { label:'Reject',  value: qcStats.rejected||0,color:'#ef4444' },
  ];

  const tallyVoucherBar = tv ? [
    { label:'Sales',    value: tv.sales?.count||0,    color:'#22c55e' },
    { label:'Purchase', value: tv.purchase?.count||0, color:'#ef4444' },
    { label:'Payment',  value: tv.payment?.count||0,  color:'#f59e0b' },
    { label:'Receipt',  value: tv.receipt?.count||0,  color:'#3b82f6' },
    { label:'Journal',  value: tv.journal?.count||0,  color:'#8b5cf6' },
    { label:'Debit',    value: tv.debitNote?.count||0, color:'#06b6d4' },
    { label:'Credit',   value: tv.creditNote?.count||0,color:'#a855f7' },
  ] : [];

  return (
    <>
      <style>{`
        .db-wrap { display:flex; flex-direction:column; gap:16px; }

        .db-banner {
          background: linear-gradient(135deg,#0f172a 0%,#1e1b4b 55%,#0f172a 100%);
          border-radius:16px; padding:20px 22px;
          display:flex; align-items:center; justify-content:space-between;
          position:relative; overflow:hidden;
          box-shadow:0 6px 24px rgba(15,23,42,0.18); gap:16px;
        }
        .db-banner-stats { display:flex; gap:10px; flex-shrink:0; flex-wrap:wrap; }
        .db-banner-chip {
          background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);
          border-radius:12px; padding:10px 14px; text-align:center; min-width:70px;
        }

        /* KPI grids */
        .db-kpi-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(min-width:640px)  { .db-kpi-grid { grid-template-columns:repeat(3,1fr); } }
        @media(min-width:1100px) { .db-kpi-grid { grid-template-columns:repeat(6,1fr); } }

        .db-tally-kpi { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(min-width:640px)  { .db-tally-kpi { grid-template-columns:repeat(4,1fr); } }
        @media(min-width:1100px) { .db-tally-kpi { grid-template-columns:repeat(4,1fr); } }

        .db-charts-1 { display:grid; grid-template-columns:1fr; gap:14px; }
        @media(min-width:768px) { .db-charts-1 { grid-template-columns:2fr 1fr; } }

        .db-charts-2 { display:grid; grid-template-columns:1fr; gap:14px; }
        @media(min-width:768px) { .db-charts-2 { grid-template-columns:1fr 1fr; } }

        .db-charts-3 { display:grid; grid-template-columns:1fr; gap:14px; }
        @media(min-width:900px) { .db-charts-3 { grid-template-columns:3fr 2fr; } }

        .db-alerts { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(min-width:768px) { .db-alerts { grid-template-columns:repeat(5,1fr); } }

        .db-bottom { display:grid; grid-template-columns:1fr; gap:14px; }
        @media(min-width:900px) { .db-bottom { grid-template-columns:2fr 1fr; } }

        .db-tally-vouchers { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        @media(min-width:640px) { .db-tally-vouchers { grid-template-columns:repeat(4,1fr); } }
        @media(min-width:1024px){ .db-tally-vouchers { grid-template-columns:repeat(4,1fr); } }

        @media(max-width:480px) {
          .db-banner { flex-direction:column; align-items:flex-start; }
          .db-banner-stats { width:100%; }
        }
        .db-kpi-card { transition:transform 0.15s, box-shadow 0.15s; }
        .db-kpi-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(15,23,42,0.1) !important; }
      `}</style>

      <div className="db-wrap">

        {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
        <div className="db-banner">
          <div style={{ position:'absolute', top:-40, right:80, width:160, height:160, borderRadius:'50%', background:'rgba(239,68,68,0.1)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-20, right:30, width:100, height:100, borderRadius:'50%', background:'rgba(168,85,247,0.08)', pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:1, minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:600, color:'rgba(148,163,184,0.8)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:6 }}>{greeting.text} {greeting.emoji}</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.4px', marginBottom:4, lineHeight:1.2 }}>
              {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'MANUFACTURING ERP ERP'}
            </div>
            <div style={{ fontSize:11.5, color:'#64748b' }}>{today}</div>
            {user?.role && (
              <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'3px 10px' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e' }} />
                <span style={{ fontSize:10.5, color:'#94a3b8', fontWeight:600, textTransform:'capitalize' }}>{user.role.replace(/_/g,' ')}</span>
              </div>
            )}
          </div>

          <div className="db-banner-stats" style={{ position:'relative', zIndex:1 }}>
            {[
              { label:'Total POs',      value: loading ? '—' : poStats.total,                          color:'#ef4444' },
              { label:'Dealer Orders',  value: loading ? '—' : dealerOrderStats.totalOrders||0,        color:'#8b5cf6' },
              { label:'Pending Appr',   value: loading ? '—' : approvalStats.pending||0,              color:'#f59e0b' },
              { label:'QC Passed',      value: loading ? '—' : qcStats.passed||0,                     color:'#22c55e' },
              { label:'Tally Vouchers', value: tallyLoading ? '—' : fmtN(tv?.totalCount||0),          color:'#06b6d4' },
              { label:'Tally Ledgers',  value: tallyLoading ? '—' : fmtN(tm?.ledgers?.total||0),      color:'#a855f7' },
            ].map((s, i) => (
              <div key={i} className="db-banner-chip">
                <div style={{ fontSize:17, fontWeight:800, color:s.color, letterSpacing:'-0.3px' }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2, fontWeight:500, whiteSpace:'nowrap' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section: ERP Operations KPIs ───────────────────────────────────── */}
        <SectionLabel color="#ef4444">ERP Operations</SectionLabel>
        <div className="db-kpi-grid">
          {[
            { label:'Total PO Value',    value: fmt(poStats.totalValue),                sub:`${poStats.total} purchase orders`,       gradient:'linear-gradient(135deg,#3b82f6,#1e40af)', icon:<SalesIcon />,   link:'/procurement/po' },
            { label:'Pending Approvals', value: String(approvalStats.pending||0),       sub:`${approvalStats.total||0} total`,         gradient:'linear-gradient(135deg,#f59e0b,#d97706)', icon:<OrderIcon />,   link:'/procurement/approvals' },
            { label:'Dealer Orders',     value: String(dealerOrderStats.totalOrders||0),sub:`${dealerOrderStats.pendingApprovals||0} pending`, gradient:'linear-gradient(135deg,#8b5cf6,#6d28d9)', icon:<TruckIcon />,   link:'/orders/dealers' },
            { label:'Inventory Items',   value: String(inventoryStats.total||0),        sub:`${inventoryStats.critical||0} critical`,  gradient:'linear-gradient(135deg,#22c55e,#15803d)', icon:<BoxIcon />,     link:'/inventory/stock' },
            { label:'Active Vendors',    value: String(vendorStats.active||0),          sub:`${vendorStats.total||0} total`,           gradient:'linear-gradient(135deg,#a855f7,#7c3aed)', icon:<FactoryIcon />, link:'/procurement/vendors' },
            { label:'GRNs Pending QC',   value: String(grnStats.pending||0),            sub:`${grnStats.total||0} total GRNs`,         gradient:'linear-gradient(135deg,#3b82f6,#1d4ed8)', icon:<TruckIcon />,   link:'/procurement/grn' },
          ].map((k, i) => (
            <div key={i} className="db-kpi-card" onClick={() => go(k.link)} style={{
              background:'#fff', borderRadius:14, border:'1px solid #e8edf2', padding:'16px',
              boxShadow:'0 2px 8px rgba(15,23,42,0.05)', position:'relative', overflow:'hidden', cursor:'pointer',
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.gradient, borderRadius:'14px 14px 0 0' }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:k.gradient, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>{k.icon}</div>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px', lineHeight:1 }}>
                {loading ? <span style={{ color:'#e2e8f0' }}>—</span> : k.value}
              </div>
              <div style={{ fontSize:11.5, color:'#64748b', fontWeight:500, marginTop:4 }}>{k.label}</div>
              <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:2 }}>{loading ? '...' : k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Section: Tally Data Overview ───────────────────────────────────── */}
        <SectionLabel color="#06b6d4">Tally Accounting Data</SectionLabel>

        {/* Tally sync status bar */}
        <Card style={{ padding:'14px 18px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <MdSyncAlt size={22} color="#06b6d4" />
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>Tally Sync Status</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                  {sh?.companyName || 'MANUFACTURING ERP'} · {sh?.syncDirection || 'Bi-directional'} · {sh?.syncInterval || 'Every 15 min'}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <SyncBadge status={sh?.connectionStatus || 'Unknown'} />
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#22c55e' }}>{sh?.todaySuccess||0}</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>Today Success</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#ef4444' }}>{sh?.todayFailed||0}</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>Today Failed</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#3b82f6' }}>{sh?.todayTotal||0}</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>Today Total</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{sh?.lastSyncAt ? fmtDate(sh.lastSyncAt) : '—'}</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>Last Synced</div>
              </div>
              <button onClick={() => go('/tally')} style={{ fontSize:11.5, fontWeight:600, color:'#06b6d4', background:'rgba(6,182,212,0.08)', border:'none', padding:'5px 12px', borderRadius:8, cursor:'pointer' }}>
                Manage Sync →
              </button>
            </div>
          </div>
        </Card>

        {/* Tally voucher KPI cards */}
        <div className="db-tally-kpi">
          {[
            { label:'Sales Vouchers',    count: tv?.sales?.count||0,    total: tv?.sales?.total||0,    color:'#22c55e', gradient:'linear-gradient(135deg,#22c55e,#15803d)', icon:'💰', last: tv?.sales?.last },
            { label:'Purchase Vouchers', count: tv?.purchase?.count||0, total: tv?.purchase?.total||0, color:'#ef4444', gradient:'linear-gradient(135deg,#3b82f6,#1e40af)', icon:'🛒', last: tv?.purchase?.last },
            { label:'Payment Vouchers',  count: tv?.payment?.count||0,  total: tv?.payment?.total||0,  color:'#f59e0b', gradient:'linear-gradient(135deg,#f59e0b,#d97706)', icon:'💸', last: tv?.payment?.last },
            { label:'Receipt Vouchers',  count: tv?.receipt?.count||0,  total: tv?.receipt?.total||0,  color:'#3b82f6', gradient:'linear-gradient(135deg,#3b82f6,#1d4ed8)', icon:'🧾', last: tv?.receipt?.last },
          ].map((k, i) => (
            <div key={i} className="db-kpi-card" onClick={() => go('/tally')} style={{
              background:'#fff', borderRadius:14, border:'1px solid #e8edf2', padding:'16px',
              boxShadow:'0 2px 8px rgba(15,23,42,0.05)', position:'relative', overflow:'hidden', cursor:'pointer',
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.gradient, borderRadius:'14px 14px 0 0' }} />
              <div style={{ fontSize:24, marginBottom:8 }}>{k.icon}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color, letterSpacing:'-0.5px', lineHeight:1 }}>
                {tallyLoading ? <span style={{ color:'#e2e8f0' }}>—</span> : fmtN(k.count)}
              </div>
              <div style={{ fontSize:11.5, color:'#64748b', fontWeight:500, marginTop:4 }}>{k.label}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'#1e293b', marginTop:4 }}>{tallyLoading ? '—' : fmt(k.total)}</div>
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>Last: {k.last ? fmtDate(k.last) : '—'}</div>
            </div>
          ))}
        </div>

        {/* Tally charts + masters side by side */}
        <div className="db-charts-2">
          {/* Voucher type distribution bar chart */}
          <Card>
            <CardHead title="Tally Voucher Distribution" sub="All voucher types synced from Tally" accent="#06b6d4" />
            <div style={{ padding:'0 18px 18px' }}>
              {tallyVoucherBar.some(d => d.value > 0)
                ? <BarChart data={tallyVoucherBar} height={150} />
                : <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>{tallyLoading ? 'Loading...' : 'No Tally vouchers synced yet'}</div>
              }
            </div>
          </Card>

          {/* Tally master data + ERP sync status */}
          <Card>
            <CardHead title="Master Data Sync" sub="Tally ↔ ERP entity counts" accent="#06b6d4" />
            <div style={{ padding:'0 18px 18px' }}>
              {[
                { label:'Ledgers',  total: tm?.ledgers?.total||0,  synced: tm?.ledgers?.synced||0,  color:'#3b82f6' },
                { label:'Vendors',  total: tm?.vendors?.total||0,  synced: tm?.vendors?.synced||0,  color:'#a855f7' },
                { label:'Clients',  total: tm?.clients?.total||0,  synced: tm?.clients?.synced||0,  color:'#22c55e' },
                { label:'Items',    total: tm?.items?.total||0,    synced: tm?.items?.synced||0,    color:'#f59e0b' },
              ].map((row, i) => {
                const pct = row.total > 0 ? Math.round((row.synced/row.total)*100) : 0;
                return (
                  <div key={i} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{row.label}</span>
                      <span style={{ fontSize:11, color:'#64748b' }}>{tallyLoading ? '—' : `${row.synced}/${row.total}`} ({pct}%)</span>
                    </div>
                    <div style={{ height:6, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:row.color, borderRadius:4, transition:'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop:16, paddingTop:12, borderTop:'1px solid #f1f5f9' }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:'#0f172a', marginBottom:8 }}>ERP → Tally Sync</div>
                <StatRow label="Invoices Synced" value={`${es?.invoices?.syncedToTally||0}/${es?.invoices?.total||0}`} color="#22c55e" />
                <StatRow label="POs Synced"      value={`${es?.purchaseOrders?.syncedToTally||0}/${es?.purchaseOrders?.total||0}`} color="#3b82f6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Other Tally vouchers row: Journal, Debit Note, Credit Note, Contra */}
        {tv && (tv.journal?.count > 0 || tv.debitNote?.count > 0 || tv.creditNote?.count > 0 || tv.contra?.count > 0) && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:12 }}>
            {[
              { label:'Journal Vouchers',      count: tv.journal?.count||0,    total: tv.journal?.total||0,    color:'#8b5cf6', icon:'📋' },
              { label:'Contra Vouchers',        count: tv.contra?.count||0,     total: tv.contra?.total||0,     color:'#06b6d4', icon:'🔄' },
              { label:'Debit Note Vouchers',    count: tv.debitNote?.count||0,  total: tv.debitNote?.total||0,  color:'#f97316', icon:'📉' },
              { label:'Credit Note Vouchers',   count: tv.creditNote?.count||0, total: tv.creditNote?.total||0, color:'#a855f7', icon:'📈' },
            ].filter(k => k.count > 0).map((k, i) => (
              <div key={i} className="db-kpi-card" onClick={() => go('/tally')} style={{
                background:'#fff', borderRadius:12, border:`1px solid ${k.color}22`, padding:'14px',
                boxShadow:'0 2px 8px rgba(15,23,42,0.04)', cursor:'pointer',
                display:'flex', alignItems:'center', gap:12,
              }}>
                <div style={{ fontSize:28 }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{fmtN(k.count)}</div>
                  <div style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{k.label}</div>
                  <div style={{ fontSize:11.5, fontWeight:700, color:'#1e293b', marginTop:2 }}>{fmt(k.total)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Tally Vouchers activity feed */}
        {tv?.recent?.length > 0 && (
          <Card>
            <CardHead
              title="Recent Tally Activity"
              sub="Latest vouchers synced from Tally"
              accent="#06b6d4"
              right={<button onClick={() => go('/tally')} style={{ fontSize:11.5, fontWeight:600, color:'#06b6d4', background:'rgba(6,182,212,0.08)', border:'none', padding:'4px 10px', borderRadius:7, cursor:'pointer' }}>View all →</button>}
            />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:460 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Type','Party','Amount','Voucher No','Date'].map(h => (
                      <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:10.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tv.recent.map((v, i) => {
                    const tclr = { Sales:'#22c55e', Purchase:'#ef4444', Payment:'#f59e0b', Receipt:'#3b82f6', Journal:'#8b5cf6', Contra:'#06b6d4', 'Debit Note':'#f97316', 'Credit Note':'#a855f7' };
                    const c = tclr[v.type] || '#64748b';
                    return (
                      <tr key={i} style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer' }} onClick={() => go('/tally')}
                        onMouseEnter={e => e.currentTarget.style.background='#f0fdfe'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <td style={{ padding:'10px 16px' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:c, background:`${c}18`, padding:'2px 8px', borderRadius:20 }}>{v.type}</span>
                        </td>
                        <td style={{ padding:'10px 16px', fontSize:12, color:'#1e293b', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.party}</td>
                        <td style={{ padding:'10px 16px', fontSize:12, fontWeight:700, color:'#1e293b' }}>{fmt(Math.abs(v.amount))}</td>
                        <td style={{ padding:'10px 16px', fontSize:11.5, color:'#64748b' }}>{v.number}</td>
                        <td style={{ padding:'10px 16px', fontSize:11.5, color:'#94a3b8' }}>{fmtDate(v.date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Section: Finance Overview ────────────────────────────────────── */}
        <SectionLabel color="#16a34a">Finance Overview</SectionLabel>
        <div className="db-charts-2">
          <Card>
            <CardHead title="Accounts Summary" sub="Payable vs Receivable" accent="#16a34a" />
            <div style={{ padding:'0 18px 18px' }}>
              {[
                { label:'Accounts Payable (Outstanding)',  value: fmt(financeStats?.totalAccountsPayable||fs?.accountsPayable?.total||0),    color:'#ef4444', icon:<MdAccountBalance size={16}/> },
                { label:'Accounts Receivable (Outstanding)', value: fmt(financeStats?.totalAccountsReceivable||fs?.accountsReceivable?.total||0), color:'#22c55e', icon:<MdReceiptLong size={16}/> },
                { label:'Overdue Supplier Invoices',       value: String(financeStats?.overdueSupplierInvoices||0),  color:'#f97316', icon:'⚠️' },
                { label:'Overdue Dealer Invoices',         value: String(financeStats?.overdueDealerInvoices||0),    color:'#f97316', icon:'⚠️' },
                { label:'Payments Made Today',             value: String(financeStats?.paymentsMadeToday||0),        color:'#3b82f6', icon:'💸' },
                { label:'Receipts Today',                  value: String(financeStats?.paymentsReceivedToday||0),    color:'#22c55e', icon:'🧾' },
              ].map((row, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f8fafc' }}>
                  <div style={{ fontSize:16, minWidth:20 }}>{typeof row.icon === 'string' ? row.icon : row.icon}</div>
                  <div style={{ flex:1, fontSize:12, color:'#64748b' }}>{row.label}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:row.color }}>{loading ? '—' : row.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* ERP Invoice status */}
          <Card>
            <CardHead title="ERP Invoice Status" sub="Invoice lifecycle overview" accent="#16a34a" />
            <div style={{ padding:'0 18px 18px' }}>
              <StatRow label="Total Invoices"        value={es?.invoices?.total||0}             color="#0f172a" />
              <StatRow label="Paid"                  value={es?.invoices?.paid||0}              color="#22c55e" />
              <StatRow label="Overdue"               value={es?.invoices?.overdue||0}           color="#ef4444" />
              <StatRow label="Synced to Tally"       value={es?.invoices?.syncedToTally||0}     color="#06b6d4" />
              <div style={{ marginTop:14, borderTop:'1px solid #f1f5f9', paddingTop:12 }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Sales Orders</div>
                <StatRow label="Total Orders"         value={es?.salesOrders?.total||0}         color="#0f172a" />
                <StatRow label="Pending Approval"     value={es?.salesOrders?.pendingApproval||0} color="#f59e0b" />
              </div>
              <div style={{ marginTop:14, borderTop:'1px solid #f1f5f9', paddingTop:12 }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Work Orders</div>
                <StatRow label="Total"       value={es?.workOrders?.total||0}       color="#0f172a" />
                <StatRow label="In Progress" value={es?.workOrders?.inProgress||0}  color="#f59e0b" />
                <StatRow label="Completed"   value={es?.workOrders?.completed||0}   color="#22c55e" />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Section: Procurement + QC ────────────────────────────────────── */}
        <SectionLabel color="#3b82f6">Procurement & Quality</SectionLabel>
        <div className="db-charts-1">
          <Card>
            <CardHead
              title="Procurement Flow"
              sub="PR & PO status breakdown"
              accent="#3b82f6"
              right={
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:'#ef4444', letterSpacing:'-0.4px' }}>{loading ? '—' : fmt(poStats.totalValue)}</div>
                  <div style={{ fontSize:10.5, fontWeight:600, color:'#64748b' }}>Total PO value</div>
                </div>
              }
            />
            <div style={{ padding:'0 18px 18px' }}>
              {procurementDonut.length > 0
                ? <DonutChart data={procurementDonut} size={110} />
                : <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>{loading ? 'Loading...' : 'No procurement data yet'}</div>
              }
            </div>
          </Card>

          <Card>
            <CardHead title="Quality Check Status" sub="Inspection results" accent="#3b82f6" />
            <div style={{ padding:'0 18px 18px' }}>
              <BarChart data={qcBar} height={140} />
            </div>
          </Card>
        </div>

        {/* ── Operational Alerts ───────────────────────────────────────────── */}
        <div className="db-alerts">
          {[
            { label:'Pending PRs',           value: prStats.pending,                    color:'#f59e0b', bg:'rgba(245,158,11,0.1)',  icon:<ClipboardIcon />,                        link:'/procurement/pr' },
            { label:'Pending Dealer Approv.', value: dealerOrderStats.pendingApprovals||0, color:'#8b5cf6', bg:'rgba(139,92,246,0.1)',icon:<TruckIcon size={24}/>,                   link:'/orders/dealers' },
            { label:'Pending Approvals',     value: approvalStats.pending||0,           color:'#ef4444', bg:'rgba(239,68,68,0.1)',   icon:<MdAssignmentReturn size={24}/>,               link:'/procurement/approvals' },
            { label:'QC Pending',            value: qcStats.pending||0,                 color:'#22c55e', bg:'rgba(34,197,94,0.1)',   icon:<TruckDispatchIcon />,                    link:'/procurement/qc' },
            { label:'Critical Stock',        value: inventoryStats.critical||0,         color:'#a855f7', bg:'rgba(168,85,247,0.1)',  icon:<MdProductionQuantityLimits size={24}/>,  link:'/inventory/stock' },
          ].map((a, i) => (
            <Card key={i} style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={() => go(a.link)}>
              <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:a.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{a.icon}</div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color:a.color, letterSpacing:'-0.5px', lineHeight:1 }}>{loading ? '—' : a.value}</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:3, fontWeight:500 }}>{a.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Inventory Flow Pipeline ──────────────────────────────────────── */}
        {flowData && (
          <Card>
            <CardHead title="Inventory Flow Pipeline" sub="GRN → Inventory → Sales → Production → Returns → Final Stock" accent="#22c55e" />
            <div style={{ padding:'0 18px 18px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12 }}>
                {[
                  { label:'GRN Received',  value: flowData.grnStats?.today||0,                    icon:'📦', color:'#3b82f6' },
                  { label:'Inventory ↑',   value: flowData.flowTimeline?.grnReceived||0,           icon:'⬆️', color:'#22c55e' },
                  { label:'Sales ↓',       value: flowData.flowTimeline?.salesOutward||0,          icon:'📉', color:'#ef4444' },
                  { label:'Production',    value: flowData.flowTimeline?.productionUsage||0,       icon:'🏭', color:'#f59e0b' },
                  { label:'Returns ↑',     value: flowData.flowTimeline?.returnsInward||0,         icon:'↩️', color:'#a855f7' },
                  { label:'Final Stock',   value: flowData.inventoryStats?.availableQuantity||0,   icon:'📊', color:'#06b6d4' },
                ].map((item, i) => (
                  <div key={i} style={{ background:'linear-gradient(135deg,#f8fafc,#f1f5f9)', border:`2px solid ${item.color}`, borderRadius:12, padding:14, textAlign:'center' }}>
                    <div style={{ fontSize:24, marginBottom:6 }}>{item.icon}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:item.color }}>{loading ? '—' : item.value}</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:4, fontWeight:600 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── Warehouse breakdown ──────────────────────────────────────────── */}
        {flowData && Object.keys(flowData.warehouseBreakdown||{}).length > 0 && (
          <Card>
            <CardHead title="Warehouse Stock Distribution" sub="Inventory levels by warehouse" />
            <div style={{ padding:'0 18px 14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                {Object.entries(flowData.warehouseBreakdown).map(([whName, data], i) => (
                  <div key={i} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:8 }}>{whName}</div>
                    <StatRow label="Items"     value={data.items}      color="#1e293b" />
                    <StatRow label="Total Qty" value={data.totalQty}   color="#1e293b" />
                    <StatRow label="Available" value={data.availableQty} color="#22c55e" />
                    <StatRow label="Reserved"  value={data.reservedQty}  color="#f59e0b" />
                    <StatRow label="Value"     value={fmt(data.value)}   color="#ef4444" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── Bottom: Recent POs + Low Stock + Pending Approvals ───────────── */}
        <div className="db-bottom">
          <Card>
            <CardHead
              title="Recent Purchase Orders"
              sub="Latest POs in the system"
              right={<button onClick={() => go('/procurement/po')} style={{ fontSize:11.5, fontWeight:600, color:'#ef4444', background:'rgba(239,68,68,0.08)', border:'none', padding:'4px 10px', borderRadius:7, cursor:'pointer' }}>View all →</button>}
            />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:460 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['PO ID','Vendor','Grand Total','Status','Date'].map(h => (
                      <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:10.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.7px', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Loading...</td></tr>
                  ) : recentPOs.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>No purchase orders yet</td></tr>
                  ) : recentPOs.map((po, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer' }} onClick={() => go('/procurement/po')}
                      onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#ef4444' }}>{po.poId}</td>
                      <td style={{ padding:'11px 16px', fontSize:12, color:'#1e293b' }}>{po.vendor?.companyName||'—'}</td>
                      <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#1e293b' }}>{fmt(po.grandTotal)}</td>
                      <td style={{ padding:'11px 16px' }}><StatusBadge status={po.status} /></td>
                      <td style={{ padding:'11px 16px', fontSize:11.5, color:'#94a3b8' }}>{new Date(po.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Card>
              <CardHead title="Low / Critical Stock" sub="Items needing attention" right={<StatusBadge status="Critical" />} />
              <div style={{ padding:'0 18px 14px' }}>
                {loading ? (
                  <div style={{ padding:16, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Loading...</div>
                ) : lowStock.length === 0 ? (
                  <div style={{ padding:16, textAlign:'center', color:'#22c55e', fontSize:13 }}>✓ All stock levels healthy</div>
                ) : lowStock.map((s, i) => (
                  <div key={i} onClick={() => go('/inventory/stock')} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', cursor:'pointer', borderBottom:i<lowStock.length-1?'1px solid #f1f5f9':'none' }}>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'#1e293b' }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{s.sku} · {s.warehouse||'WH-01'}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:'#ef4444' }}>{s.qty}</div>
                      <div style={{ fontSize:10, color:'#94a3b8' }}>min: {s.minQty||0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead
                title="Pending Approvals"
                sub="Awaiting action"
                right={<button onClick={() => go('/procurement/approvals')} style={{ fontSize:11.5, fontWeight:600, color:'#ef4444', background:'rgba(239,68,68,0.08)', border:'none', padding:'4px 10px', borderRadius:7, cursor:'pointer' }}>View all →</button>}
              />
              <div style={{ padding:'0 18px 14px' }}>
                {loading ? (
                  <div style={{ padding:16, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Loading...</div>
                ) : pendingApprovals.length === 0 ? (
                  <div style={{ padding:16, textAlign:'center', color:'#22c55e', fontSize:13 }}>✓ No pending approvals</div>
                ) : pendingApprovals.map((a, i) => {
                  const typeColor = { GRN:'#ef4444', PO:'#f59e0b', PR:'#a855f7', QC:'#3b82f6' };
                  const c = typeColor[a.docType]||'#64748b';
                  return (
                    <div key={i} onClick={() => go('/procurement/approvals')} style={{ padding:'9px 0', cursor:'pointer', borderBottom:i<pendingApprovals.length-1?'1px solid #f1f5f9':'none' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:c }}>{a.docRef||a.approvalId}</span>
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:20, background:'rgba(239,68,68,0.08)', color:'#ef4444' }}>{a.docType}</span>
                      </div>
                      <div style={{ fontSize:11.5, color:'#64748b' }}>{a.requestedBy||'Procurement'} · {a.department}</div>
                      <div style={{ fontSize:12.5, fontWeight:700, color:'#f59e0b', marginTop:3 }}>{a.amount ? fmt(a.amount) : '—'}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Recent Tally Sync Logs ────────────────────────────────────────── */}
        {sh?.recentLogs?.length > 0 && (
          <Card>
            <CardHead
              title="Recent Sync Activity"
              sub="Latest Tally synchronisation logs"
              accent="#06b6d4"
              right={<button onClick={() => go('/tally')} style={{ fontSize:11.5, fontWeight:600, color:'#06b6d4', background:'rgba(6,182,212,0.08)', border:'none', padding:'4px 10px', borderRadius:7, cursor:'pointer' }}>View logs →</button>}
            />
            <div style={{ padding:'0 18px 14px' }}>
              {sh.recentLogs.map((log, i) => {
                const sc = { Success:'#22c55e', Failed:'#ef4444', Partial:'#f59e0b' };
                const c  = sc[log.status]||'#64748b';
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:i<sh.recentLogs.length-1?'1px solid #f1f5f9':'none' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:c, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{log.type}</span>
                      <span style={{ fontSize:11, color:'#94a3b8', marginLeft:8 }}>{log.records||0} records</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:c }}>{log.status}</span>
                    <span style={{ fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' }}>{fmtDate(log.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

      </div>
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function SalesIcon()         { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
function OrderIcon()         { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>; }
function BoxIcon()           { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>; }
function FactoryIcon()       { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20V8l6-4v4l6-4v4l6-4v16H2z"/></svg>; }
function TruckIcon()         { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>; }
function ClipboardIcon()     { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="16" x2="15" y2="16"/></svg>; }
function TruckDispatchIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>; }
