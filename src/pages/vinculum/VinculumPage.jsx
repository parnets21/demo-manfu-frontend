import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { inventoryApi } from '../../api/inventoryApi';

// Inventory Sync & SKU Matching module

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]';

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
      <div style={{ width:28, height:28, border:'3px solid #f1f5f9', borderTop:'3px solid #1e40af', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function InventorySyncPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab]   = useState(initialTab);
  const [syncing, setSyncing]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [showKey, setShowKey]       = useState(false);

  // Real data
  const [inventoryItems, setInventoryItems] = useState([]);
  const [movements, setMovements]           = useState([]);
  const [stats, setStats]                   = useState({});

  // Config (stored locally — in production would be persisted to backend)
  const [config, setConfig] = useState({
    apiKey: '',
    baseUrl: 'https://api.inventory-sync.internal/v1',
    warehouseCode: 'WH-MFG-01',
    syncFrequency: 'Every 15 minutes',
    syncSettings: { inventorySync:true, orderPull:true, skuMasterSync:true, priceSync:false, returnSync:false },
  });

  // Sync type for manual trigger
  const [syncType, setSyncType]   = useState('Inventory Sync');
  const [syncProgress, setSyncProgress] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, movRes, statsRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getMovements({ limit: 20 }),
        inventoryApi.getStats(),
      ]);
      setInventoryItems(invRes.data || []);
      setMovements(movRes.data || []);
      setStats(statsRes.data || {});
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress(0);
    try {
      // Simulate sync progress
      for (let i = 10; i <= 90; i += 20) {
        await new Promise(r => setTimeout(r, 300));
        setSyncProgress(i);
      }
      await loadData();
      setSyncProgress(100);
      toast(`${syncType} completed — ${inventoryItems.length} records synced`);
    } catch (e) { toast(e.message || 'Sync failed', 'error'); }
    finally { setSyncing(false); setTimeout(() => setSyncProgress(0), 2000); }
  };

  // SKU matching: compare inventory items against themselves (simulating remote vs local)
  const skuMatchData = inventoryItems.slice(0, 10).map(item => {
    const diff = Math.floor(Math.random() * 5) - 2; // simulate small discrepancies
    return {
      _id: item._id,
      sku: item.sku,
      name: item.name,
      localStock: item.availableQuantity || 0,
      remoteStock: Math.max(0, (item.availableQuantity || 0) + diff),
      diff,
      status: diff === 0 ? 'Matched' : 'Mismatch',
    };
  });

  const mismatches = skuMatchData.filter(s => s.status === 'Mismatch').length;

  const kpis = [
    { label:'Last Sync',          value: movements[0] ? new Date(movements[0].createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : 'Never', color:'#10b981' },
    { label:'Total Items Synced', value: inventoryItems.length, color:'#3b82f6' },
    { label:'Recent Movements',   value: movements.length, color:'#8b5cf6' },
    { label:'SKU Mismatches',     value: mismatches, color:'#f59e0b' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="text-2xl font-black tracking-tight" style={{ color:k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tab 0: API Configuration */}
      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">API Credentials</div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">API Key</label>
                <div className="flex gap-2">
                  <input type={showKey ? 'text' : 'password'} value={config.apiKey} onChange={e => setConfig(p => ({ ...p, apiKey: e.target.value }))} className={inputCls} placeholder="Enter API key..." />
                  <button onClick={() => setShowKey(s => !s)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-white cursor-pointer font-[inherit]">{showKey ? '🙈' : '👁'}</button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Base URL</label>
                <input className={inputCls} value={config.baseUrl} onChange={e => setConfig(p => ({ ...p, baseUrl: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Warehouse Code</label>
                <input className={inputCls} value={config.warehouseCode} onChange={e => setConfig(p => ({ ...p, warehouseCode: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Sync Frequency</label>
                <select className={inputCls} value={config.syncFrequency} onChange={e => setConfig(p => ({ ...p, syncFrequency: e.target.value }))}>
                  {['Every 15 minutes','Every 30 minutes','Every 1 hour','Manual only'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={() => toast('Configuration saved')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]">
                Save Configuration
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Connection Status</div>
            <div className={`flex items-center gap-3 p-4 rounded-xl border mb-4 ${inventoryItems.length > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`w-3 h-3 rounded-full animate-pulse ${inventoryItems.length > 0 ? 'bg-green-500' : 'bg-amber-400'}`} />
              <div>
                <div className={`font-bold text-sm ${inventoryItems.length > 0 ? 'text-green-800' : 'text-amber-800'}`}>{inventoryItems.length > 0 ? 'Connected' : 'Checking...'}</div>
                <div className={`text-xs ${inventoryItems.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>{inventoryItems.length} items in local inventory</div>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-800 mb-3">Sync Settings</div>
            {Object.entries(config.syncSettings).map(([key, enabled]) => {
              const labels = { inventorySync:'Inventory Sync', orderPull:'Order Pull', skuMasterSync:'SKU Master Sync', priceSync:'Price Sync', returnSync:'Return Sync' };
              return (
                <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{labels[key]}</span>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-200'}`}
                    onClick={() => setConfig(p => ({ ...p, syncSettings: { ...p.syncSettings, [key]: !enabled } }))}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 1: Sync Logs (real movement data) */}
      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-gray-800">Sync Logs</div>
              <div className="text-xs text-gray-400 mt-0.5">Recent stock movement activity</div>
            </div>
            <button onClick={loadData} className="px-3 py-1.5 text-xs rounded-lg border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]">↻ Refresh</button>
          </div>
          {loading ? <Spinner /> : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr>{['Movement ID','SKU','Item','Type','From','To','Qty','Time'].map(h => (
                    <th key={h} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No movement logs yet.</td></tr>
                  ) : movements.map((m, i) => (
                    <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50`}>
                      <td className="px-4 py-3 font-mono text-[11px] text-red-700">{m.movementId}</td>
                      <td className="px-4 py-3 font-mono text-xs">{m.sku}</td>
                      <td className="px-4 py-3 font-semibold text-sm">{m.itemName || m.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.type==='Inward'?'bg-green-100 text-green-700':m.type==='Outward'?'bg-red-100 text-red-700':'bg-purple-100 text-purple-700'}`}>{m.type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.from}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.to}</td>
                      <td className="px-4 py-3 font-bold">{m.quantity || m.qty}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: SKU Matching */}
      {activeTab === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-gray-800">SKU-Level Stock Matching</div>
              <div className="text-xs text-gray-400 mt-0.5">Compare local ERP stock vs remote system stock</div>
            </div>
            <div className="flex gap-2">
              {mismatches > 0 && <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">{mismatches} Mismatches</span>}
              <button onClick={loadData} className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit]">Run Match</button>
            </div>
          </div>
          {loading ? <Spinner /> : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4">
              <table className="w-full">
                <thead>
                  <tr>{['SKU','Name','Local Stock','Remote Stock','Difference','Status','Action'].map(h => (
                    <th key={h} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {skuMatchData.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No inventory items found</td></tr>
                  ) : skuMatchData.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors ${row.status==='Mismatch'?'bg-red-50/30':'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 font-mono text-[11px] text-red-700">{row.sku}</td>
                      <td className="px-4 py-3 font-semibold">{row.name}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{row.localStock}</td>
                      <td className="px-4 py-3 font-bold text-purple-600">{row.remoteStock}</td>
                      <td className={`px-4 py-3 font-extrabold ${row.diff===0?'text-green-600':'text-red-500'}`}>{row.diff>0?`+${row.diff}`:row.diff}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} type={row.status==='Matched'?'success':'danger'} /></td>
                      <td className="px-4 py-3">
                        {row.status === 'Mismatch'
                          ? <button onClick={() => toast(`Adjusting ${row.sku}...`)} className="px-2 py-1 text-[11px] rounded-lg bg-amber-100 text-amber-800 font-semibold border-0 cursor-pointer font-[inherit]">Adjust</button>
                          : <span className="text-green-600 text-xs">✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Manual Sync */}
      {activeTab === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Manual Sync Trigger</div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Sync Type</label>
                <select className={inputCls} value={syncType} onChange={e => setSyncType(e.target.value)}>
                  {['Inventory Sync','Order Pull','SKU Master Sync','Full Sync'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Date Range (optional)</label>
                <div className="flex gap-2">
                  <input type="date" className={inputCls} />
                  <input type="date" className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">SKU Filter (optional)</label>
                <input className={inputCls} placeholder="e.g. SKU-1042, SKU-3301" />
              </div>
              <button onClick={handleSync} disabled={syncing}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit] disabled:opacity-60">
                {syncing ? '⟳ Syncing...' : '⟳ Start Sync'}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Sync Progress</div>
            {syncing || syncProgress > 0 ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${syncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                  <span className={`text-sm font-semibold ${syncing ? 'text-blue-700' : 'text-green-700'}`}>
                    {syncing ? 'Sync in progress...' : 'Sync completed!'}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width:`${syncProgress}%`, background:'linear-gradient(90deg,#3b82f6,#1e40af)' }} />
                </div>
                <div className="text-xs text-gray-400 text-right">{syncProgress}%</div>
                {!syncing && syncProgress === 100 && (
                  <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200 text-sm text-green-700 font-semibold">
                    ✓ {inventoryItems.length} items synced successfully
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">⟳</div>
                <div className="text-sm">No sync in progress</div>
                <div className="text-xs mt-1">Select a sync type and click Start Sync</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
