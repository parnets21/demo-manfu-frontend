import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/axiosConfig';
import { toast } from '../../components/common/Toast';
import { MdRefresh, MdWarning } from 'react-icons/md';
import Pagination from '../../components/common/Pagination';

// ── Design tokens ──────────────────────────────────────────────────────────────
const RED    = '#1e40af';
const GREEN  = '#16a34a';
const AMBER  = '#d97706';
const ORANGE = '#ea580c';
const BORDER = '1px solid #e2e8f0';
const RADIUS = 12;
const TXD    = '#0f172a';
const TXM    = '#475569';
const TXL    = '#94a3b8';
const BGI    = '#f8fafc';

const BUCKET_CFG = [
  { key: '0-30',  label: '0–30 Days',  color: GREEN,  bg: '#dcfce7', badge: '#15803d' },
  { key: '31-60', label: '31–60 Days', color: AMBER,  bg: '#fef3c7', badge: '#92400e' },
  { key: '61-90', label: '61–90 Days', color: ORANGE, bg: '#ffedd5', badge: '#9a3412' },
  { key: '90+',   label: '90+ Days',   color: RED,    bg: '#fee2e2', badge: '#b91c1c' },
];

function bucketCfg(key) {
  return BUCKET_CFG.find(b => b.key === key) || BUCKET_CFG[3];
}

// ── Compute ageing locally from raw inventory items ───────────────────────────
function computeAgeing(items) {
  const now = new Date();
  return items
    .map(item => {
      const refDate = new Date(item.updatedAt || item.createdAt || now);
      const days    = Math.max(0, Math.floor((now - refDate) / 86400000));

      let bucket = '0-30';
      if      (days > 90) bucket = '90+';
      else if (days > 60) bucket = '61-90';
      else if (days > 30) bucket = '31-60';

      let action = 'No Action', actionColor = '#22c55e';
      if      (days > 90) { action = 'Return to Supplier'; actionColor = '#ef4444'; }
      else if (days > 60) { action = 'Offer Discount';     actionColor = '#f59e0b'; }
      else if (days > 30) { action = 'Monitor';            actionColor = '#f59e0b'; }

      const qty   = item.qty || item.quantity || 0;
      const price = item.unitPrice || 0;
      const total = qty * price;
      const value = total > 0
        ? '₹' + Math.round(total).toLocaleString('en-IN')
        : '₹0';

      return {
        sku:       item.sku || '—',
        item:      item.name || item.sku || 'Unknown',
        wh:        item.warehouse || '—',
        whName:    item.warehouseName || item.warehouse || '—',
        qty,
        lastMov:   refDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
        dateSource:'Last Updated',
        days,
        bucket,
        value,
        action,
        actionColor,
      };
    })
    .sort((a, b) => b.days - a.days);
}

export default function AgeingStockPage() {
  const [ageingData, setAgeingData] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState('All');
  const [search,     setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchAgeingData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Primary: dedicated ageing endpoint
      const res = await api.get('/inventory-data/ageing');
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        setAgeingData(res.data);
        return;
      }

      // Fallback: compute ageing from main inventory
      const invRes = await api.get('/inventory');
      const items  = invRes?.data || [];
      if (items.length > 0) {
        setAgeingData(computeAgeing(items));
        toast('Computed ageing from inventory data', 'info');
        return;
      }

      setAgeingData([]);
      toast('No inventory data found', 'info');
    } catch (err) {
      console.error('Ageing fetch error:', err);
      setError(err.message || 'Failed to load ageing data');
      toast('Failed to load ageing stock data', 'error');
      setAgeingData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgeingData(); }, [fetchAgeingData]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const displayed = ageingData
    .filter(row => filter === 'All' || row.bucket === filter)
    .filter(row => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.sku?.toLowerCase().includes(q)  ||
        row.item?.toLowerCase().includes(q) ||
        (row.whName || row.wh)?.toLowerCase().includes(q)
      );
    });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 14 }}>
        <div style={{ width: 44, height: 44, border: '4px solid #fecaca', borderTopColor: RED, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: TXM, fontSize: 14, fontWeight: 600 }}>Loading ageing stock data…</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 12 }}>
        <MdWarning size={40} color={AMBER} />
        <div style={{ fontSize: 14, fontWeight: 700, color: TXD }}>Could not load ageing data</div>
        <div style={{ fontSize: 12, color: TXM, maxWidth: 360, textAlign: 'center' }}>{error}</div>
        <button onClick={fetchAgeingData}
          style={{ padding: '8px 22px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${RED},#b91c1c)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Bucket Summary Cards ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
        {BUCKET_CFG.map(({ key, label, color, bg }) => {
          const count = ageingData.filter(i => i.bucket === key).length;
          const pct   = ageingData.length > 0 ? (count / ageingData.length) * 100 : 0;
          return (
            <div key={key}
              onClick={() => setFilter(filter === key ? 'All' : key)}
              style={{ background: filter === key ? bg : '#fff', border: filter === key ? `1.5px solid ${color}` : BORDER, borderRadius: RADIUS, padding: '16px 18px', boxShadow: '0 2px 10px rgba(15,23,42,0.05)', cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: TXM, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</span>
                <span style={{ fontSize: 26, fontWeight: 800, color }}>{count}</span>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .5s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: TXL, marginTop: 6 }}>
                {pct.toFixed(0)}% of {ageingData.length} items
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Table Card ────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: BORDER, borderRadius: RADIUS, overflow: 'hidden', boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>

        {/* Toolbar */}
        <div style={{ padding: '12px 20px', borderBottom: BORDER, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TXD }}>Ageing Stock Analysis</div>
            <div style={{ fontSize: 11, color: TXL, marginTop: 2 }}>Items grouped by days since last movement / GRN</div>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SKU, item, warehouse…"
            style={{ padding: '7px 12px', border: BORDER, borderRadius: 8, fontSize: 12, outline: 'none', background: BGI, color: TXD, fontFamily: 'inherit', width: 210 }}
          />

          {/* Bucket filter buttons */}
          {['All', ...BUCKET_CFG.map(b => b.key)].map(b => {
            const cfg    = BUCKET_CFG.find(x => x.key === b);
            const active = filter === b;
            return (
              <button key={b} onClick={() => setFilter(b)}
                style={{ padding: '6px 13px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                  background: active ? (cfg?.color || RED) : BGI,
                  color: active ? '#fff' : TXM,
                }}>
                {b === 'All' ? 'All' : b}
                {b !== 'All' && (
                  <span style={{ marginLeft: 5, background: 'rgba(0,0,0,.15)', color: active ? '#fff' : TXM, borderRadius: 20, padding: '0 5px', fontSize: 10 }}>
                    {ageingData.filter(i => i.bucket === b).length}
                  </span>
                )}
              </button>
            );
          })}

          {/* Refresh */}
          <button onClick={fetchAgeingData}
            title="Refresh data"
            style={{ padding: '7px', borderRadius: 8, border: BORDER, background: BGI, color: TXM, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <MdRefresh size={17} />
          </button>

          {/* Count badge */}
          <span style={{ padding: '4px 12px', background: '#fef2f2', color: RED, borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {displayed.length} items
          </span>
        </div>

        {/* Empty state */}
        {displayed.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: TXL }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TXM }}>
              {ageingData.length === 0 ? 'No ageing stock data available' : 'No items match the selected filter'}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {ageingData.length === 0
                ? 'Stock items will appear here once inventory is recorded'
                : 'Try changing the bucket filter or clearing the search'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, fontSize: 13 }}>
              <thead>
                <tr style={{ background: BGI }}>
                  {['#', 'SKU', 'Item Name', 'Warehouse', 'Qty', 'Last Movement', 'Days Old', 'Age Bucket', 'Value', 'Action'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: TXL, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: BORDER, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.slice((page-1)*pageSize, page*pageSize).map((row, i) => {
                  const rowNum = (page-1)*pageSize + i + 1;
                  const cfg = bucketCfg(row.bucket);
                  return (
                    <tr key={`${row.sku}-${i}`}
                      onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ borderBottom: '1px solid #f8fafc', transition: 'background .1s' }}>
                      <td style={{ padding: '10px 12px', color: TXL, fontWeight: 700 }}>{rowNum}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: RED }}>{row.sku}</td>
                      <td style={{ padding: '10px 12px', color: TXD, fontWeight: 500, maxWidth: 200 }}>{row.item}</td>
                      <td style={{ padding: '10px 12px', color: TXM }}>{row.whName || row.wh || '—'}</td>
                      <td style={{ padding: '10px 12px', color: TXD, fontWeight: 700 }}>{(row.qty || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 12px', color: TXM, whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12 }}>{row.lastMov}</div>
                        {row.dateSource && <div style={{ fontSize: 10, color: TXL, marginTop: 1 }}>{row.dateSource}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: cfg.color }}>{row.days}d</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.badge }}>
                          {row.bucket} days
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: TXD, fontWeight: 600 }}>{row.value}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: row.actionColor === '#22c55e' ? '#dcfce7' : row.actionColor === '#f59e0b' ? '#fef3c7' : '#fee2e2',
                          color:      row.actionColor === '#22c55e' ? '#15803d' : row.actionColor === '#f59e0b' ? '#92400e' : '#b91c1c',
                        }}>
                          {row.action}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {displayed.length > 0 && (
          <Pagination
            total={displayed.length}
            page={page}
            pageSize={pageSize}
            onPage={p => setPage(p)}
            onPageSize={s => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}
