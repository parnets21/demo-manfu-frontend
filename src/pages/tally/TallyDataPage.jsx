/**
 * TallyDataPage.jsx
 * Shows all data synced from Tally in one place:
 * - Stock Items, Vendors, Clients, Account Ledgers
 * Each tab fetches from the real API and displays the data.
 */
import { useState, useEffect, useCallback } from 'react';
import { itemMasterApi }     from '../../api/itemMasterApi.js';
import { vendorApi }         from '../../api/vendorApi.js';
import { clientApi }         from '../../api/clientApi.js';
import { accountsLedgerApi } from '../../api/accountsLedgerApi.js';
import { useDataEvent } from '../../utils/dataEvents.js';

const C = {
  red: '#1e40af', redLight: '#fef2f2', redBorder: '#fecaca',
  text: '#0f172a', mid: '#475569', light: '#94a3b8',
  border: '#e8edf2', bg: '#f8fafc', white: '#fff',
  green: '#10b981', blue: '#3b82f6', purple: '#8b5cf6', orange: '#f59e0b',
};

const TABS = [
  { key: 'items',   label: 'Stock Items',    color: C.blue   },
  { key: 'vendors', label: 'Vendors',        color: C.green  },
  { key: 'clients', label: 'Clients',        color: C.purple },
  { key: 'ledgers', label: 'Ledgers',        color: C.orange },
];

function Badge({ text, color = '#475569', bg = '#f1f5f9' }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: bg, color,
    }}>{text}</span>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{
        width: 28, height: 28, border: '3px solid #f1f5f9',
        borderTop: `3px solid ${C.red}`, borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: C.light, fontSize: 14 }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
      {message}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444',
      borderRadius: 10, padding: '12px 16px', marginBottom: 14,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>Failed to load data</div>
        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>{message}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
          Check that the backend is running and you are logged in. If using the cloud server, it may need a moment to wake up — refresh the page.
        </div>
      </div>
    </div>
  );
}

const th = {
  padding: '10px 16px', textAlign: 'left', fontSize: 10.5,
  fontWeight: 700, color: C.light, textTransform: 'uppercase',
  letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`,
  whiteSpace: 'nowrap', background: C.bg,
};
const td = { padding: '11px 16px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' };

// ── Items Tab ─────────────────────────────────────────────────────────────────
function ItemsTab() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await itemMasterApi.getAll();
      setData(r.data || []);
    } catch (e) {
      setError(e.message || 'Failed to fetch stock items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useDataEvent('item:changed', fetchData);

  const rows = data.filter(x =>
    !search || x.name?.toLowerCase().includes(search.toLowerCase()) || x.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input placeholder="Search name or SKU..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 240 }} />
        <span style={{ fontSize: 13, color: C.mid }}>{rows.length} items</span>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : error ? null : rows.length === 0 ? <EmptyState message="No stock items found. Run the Tally sync to populate." /> : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {['Item ID', 'SKU', 'Name', 'Unit', 'Cost Price', 'GST%', 'Status', 'Tally Synced'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((item, i) => (
                <tr key={item._id || i} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
                  <td style={{...td, fontFamily:'monospace', fontWeight:700, color:C.red, fontSize:11}}>{item.itemId}</td>
                  <td style={{...td, fontFamily:'monospace', fontSize:12, color:C.mid}}>{item.sku}</td>
                  <td style={{...td, fontWeight:600}}>{item.name}</td>
                  <td style={{...td, color:C.mid}}>{item.unit}</td>
                  <td style={{...td, fontWeight:600, color:C.blue}}>₹{item.costPrice || 0}</td>
                  <td style={{...td, color:C.mid}}>{item.gst || 0}%</td>
                  <td style={td}><Badge text={item.status || 'Active'} color={item.status==='Active'?'#047857':'#6b7280'} bg={item.status==='Active'?'#ecfdf5':'#f3f4f6'} /></td>
                  <td style={td}><Badge text={item.tallySynced?'✅ Yes':'—'} color={item.tallySynced?'#047857':C.light} bg={item.tallySynced?'#ecfdf5':C.bg} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Vendors Tab ───────────────────────────────────────────────────────────────
function VendorsTab() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await vendorApi.getAll();
      setData(r.data || []);
    } catch (e) {
      setError(e.message || 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useDataEvent('vendor:changed', fetchData);

  const rows = data.filter(x =>
    !search || x.companyName?.toLowerCase().includes(search.toLowerCase()) || x.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input placeholder="Search company or city..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 240 }} />
        <span style={{ fontSize: 13, color: C.mid }}>{rows.length} vendors</span>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : error ? null : rows.length === 0 ? <EmptyState message="No vendors found. Run the Tally sync to populate." /> : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {['Vendor ID', 'Company Name', 'Contact', 'Phone', 'City', 'GST No.', 'Status', 'Tally Synced'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((v, i) => (
                <tr key={v._id || i} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
                  <td style={{...td, fontFamily:'monospace', fontWeight:700, color:C.red, fontSize:11}}>{v.vendorId}</td>
                  <td style={{...td, fontWeight:600}}>{v.companyName}</td>
                  <td style={{...td, color:C.mid}}>{v.contactPerson}</td>
                  <td style={{...td, fontFamily:'monospace', fontSize:12}}>{v.phone}</td>
                  <td style={{...td, color:C.mid}}>{v.city}</td>
                  <td style={{...td, fontFamily:'monospace', fontSize:12}}>{v.gstNumber || '—'}</td>
                  <td style={td}><Badge text={v.status} color={v.status==='Active'?'#047857':v.status==='Blacklisted'?'#dc2626':'#6b7280'} bg={v.status==='Active'?'#ecfdf5':v.status==='Blacklisted'?'#fef2f2':'#f3f4f6'} /></td>
                  <td style={td}><Badge text={v.tallySynced?'✅ Yes':'—'} color={v.tallySynced?'#047857':C.light} bg={v.tallySynced?'#ecfdf5':C.bg} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Clients Tab ───────────────────────────────────────────────────────────────
function ClientsTab() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await clientApi.getAll();
      setData(r.data || []);
    } catch (e) {
      setError(e.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useDataEvent('client:changed', fetchData);

  const rows = data.filter(x =>
    !search || x.name?.toLowerCase().includes(search.toLowerCase()) || x.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input placeholder="Search name or city..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 240 }} />
        <span style={{ fontSize: 13, color: C.mid }}>{rows.length} clients</span>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : error ? null : rows.length === 0 ? <EmptyState message="No clients found. Run the Tally sync to populate." /> : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {['Client ID', 'Name', 'Contact', 'Phone', 'City', 'Category', 'GST No.', 'Status', 'Tally Synced'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c._id || i} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
                  <td style={{...td, fontFamily:'monospace', fontWeight:700, color:C.red, fontSize:11}}>{c.clientId}</td>
                  <td style={{...td, fontWeight:600}}>{c.name}</td>
                  <td style={{...td, color:C.mid}}>{c.contact}</td>
                  <td style={{...td, fontFamily:'monospace', fontSize:12}}>{c.phone}</td>
                  <td style={{...td, color:C.mid}}>{c.city}</td>
                  <td style={td}><Badge text={c.category} color='#1e40af' bg='#dbeafe' /></td>
                  <td style={{...td, fontFamily:'monospace', fontSize:12}}>{c.gstNumber || '—'}</td>
                  <td style={td}><Badge text={c.status} color={c.status==='Active'?'#047857':'#6b7280'} bg={c.status==='Active'?'#ecfdf5':'#f3f4f6'} /></td>
                  <td style={td}><Badge text={c.tallySynced?'✅ Yes':'—'} color={c.tallySynced?'#047857':C.light} bg={c.tallySynced?'#ecfdf5':C.bg} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Ledgers Tab ───────────────────────────────────────────────────────────────
function LedgersTab() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await accountsLedgerApi.getAll();
      setData(r.data || []);
    } catch (e) {
      setError(e.message || 'Failed to fetch ledgers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useDataEvent('ledger:changed', fetchData);

  const rows = data.filter(x => {
    const matchSearch = !search || x.ledgerName?.toLowerCase().includes(search.toLowerCase());
    const matchGroup  = !groupFilter || x.ledgerGroup === groupFilter;
    return matchSearch && matchGroup;
  });

  const fmt = n => n != null ? '₹' + Number(n).toLocaleString('en-IN') : '—';

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Search ledger name..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 220 }} />
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
          <option value="">All Groups</option>
          <option value="Sundry Debtors">Sundry Debtors</option>
          <option value="Sundry Creditors">Sundry Creditors</option>
          <option value="Cash">Cash</option>
          <option value="Bank">Bank</option>
        </select>
        <span style={{ fontSize: 13, color: C.mid }}>{rows.length} ledgers</span>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : error ? null : rows.length === 0 ? <EmptyState message="No ledgers found. Run the Tally sync to populate." /> : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {['Ledger Code', 'Name', 'Group', 'GST No.', 'Opening Bal.', 'Synced'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((l, i) => (
                <tr key={l._id || i} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
                  <td style={{...td, fontFamily:'monospace', fontWeight:700, color:C.red, fontSize:11}}>{l.ledgerCode}</td>
                  <td style={{...td, fontWeight:600}}>{l.ledgerName}</td>
                  <td style={td}>
                    <Badge
                      text={l.ledgerGroup || '—'}
                      color={l.ledgerGroup==='Sundry Debtors'?'#1e40af':l.ledgerGroup==='Sundry Creditors'?'#9d174d':C.mid}
                      bg={l.ledgerGroup==='Sundry Debtors'?'#dbeafe':l.ledgerGroup==='Sundry Creditors'?'#fce7f3':'#f1f5f9'}
                    />
                  </td>
                  <td style={{...td, fontFamily:'monospace', fontSize:12}}>{l.gstNumber || '—'}</td>
                  <td style={{...td, fontWeight:600, color:(l.openingBalance||0)>=0?C.green:C.red}}>{fmt(l.openingBalance)}</td>
                  <td style={td}><Badge text={l.syncedWithTally?'✅ Yes':'—'} color={l.syncedWithTally?'#047857':C.light} bg={l.syncedWithTally?'#ecfdf5':C.bg} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TallyDataPage() {
  const [active, setActive] = useState('items');
  const [counts, setCounts] = useState({ items: '…', vendors: '…', clients: '…', ledgers: '…' });

  const loadCounts = useCallback(async () => {
    const [i, v, c, l] = await Promise.allSettled([
      itemMasterApi.getAll(),
      vendorApi.getAll(),
      clientApi.getAll(),
      accountsLedgerApi.getAll(),
    ]);
    setCounts({
      items:   i.status === 'fulfilled' ? (i.value.data || []).length : '?',
      vendors: v.status === 'fulfilled' ? (v.value.data || []).length : '?',
      clients: c.status === 'fulfilled' ? (c.value.data || []).length : '?',
      ledgers: l.status === 'fulfilled' ? (l.value.data || []).length : '?',
    });
  }, []);

  // Load counts once on mount and when data changes
  useEffect(() => { loadCounts(); }, [loadCounts]);
  useDataEvent('vendor:changed', loadCounts);
  useDataEvent('item:changed', loadCounts);
  useDataEvent('client:changed', loadCounts);
  useDataEvent('ledger:changed', loadCounts);

  return (
    <div style={{ padding: 20 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Tally Synced Data</h1>
        <p style={{ fontSize: 13, color: C.light, margin: '4px 0 0 0' }}>
          All data pulled from Tally ERP — MANUFACTURING ERP
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActive(t.key)}
            style={{
              background: active === t.key ? t.color : C.white,
              border: `2px solid ${active === t.key ? t.color : C.border}`,
              borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: active === t.key ? C.white : t.color, lineHeight: 1 }}>
              {counts[t.key]}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: active === t.key ? 'rgba(255,255,255,0.85)' : C.mid, marginTop: 4 }}>
              {t.label}
            </div>
          </button>
        ))}
      </div>

      {/* Content card */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `2px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)} style={{
              padding: '7px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              border: 'none', background: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
              color: active === t.key ? t.color : C.mid,
              borderBottom: active === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              marginBottom: -2,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {active === 'items'   && <ItemsTab />}
        {active === 'vendors' && <VendorsTab />}
        {active === 'clients' && <ClientsTab />}
        {active === 'ledgers' && <LedgersTab />}
      </div>
    </div>
  );
}
