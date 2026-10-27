import { useState, useEffect, useCallback } from 'react';
import Modal from '../../../components/common/Modal';
import { toast } from '../../../components/common/Toast';
import { assetApi } from '../../../api/assetApi';

const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

// Compute lifecycle virtuals for plain objects (localStorage or API without virtuals)
function withVirtuals(a) {
  const pv = a.purchaseValue || 0;
  const cv = a.currentValue  || 0;
  const dep = pv > 0 ? Math.round(((pv - cv) / pv) * 100) : (a.depreciationPct ?? 0);
  const ageMs = a.purchaseDate ? Date.now() - new Date(a.purchaseDate).getTime() : null;
  const age = a.ageYears ?? (ageMs ? (ageMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1) : null);
  let stage = a.lifecycleStage;
  if (!stage) {
    if (dep >= 80) stage = 'End of Life';
    else if (a.status === 'Maintenance') stage = 'Maintenance';
    else if (dep >= 50) stage = 'Aging';
    else stage = 'Active';
  }
  return { ...a, _dep: dep, _age: age, _stage: stage };
}

const stageStyle = {
  'Active':      { bg: '#f0fdf4', color: '#16a34a' },
  'Aging':       { bg: '#fffbeb', color: '#d97706' },
  'Maintenance': { bg: '#fef3c7', color: '#b45309' },
  'End of Life': { bg: '#fef2f2', color: '#dc2626' },
};

export default function LifecycleTab() {
  const [assets, setAssets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('');
  const [disposeTarget, setDisposeTarget] = useState(null);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assetApi.getAll();
      setAssets((res.data || []).map(withVirtuals));
    } catch (e) { /* silently show empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleDispose = async () => {
    if (!disposeTarget) return;
    try {
      await assetApi.update(disposeTarget._id, { status: 'Disposed' });
      setDisposeTarget(null);
      await fetchAssets();
      toast(`${disposeTarget.name} marked as disposed`, 'warning');
    } catch (e) { toast(e.message, 'error'); }
  };

  const displayed = filter ? assets.filter(a => a._stage === filter) : assets;

  const stageCounts = assets.reduce((acc, a) => {
    const s = a._stage || 'Active';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-black text-gray-900">Asset Lifecycle</h2>
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-semibold border-0 cursor-pointer font-[inherit] hover:bg-gray-200"
          >
            Clear filter ×
          </button>
        )}
      </div>

      {/* Stage summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[['Active','#10b981'],['Aging','#f59e0b'],['Maintenance','#b45309'],['End of Life','#ef4444']].map(([stage, color]) => (
          <div
            key={stage}
            className="bg-white rounded-2xl border p-4 shadow-sm cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all"
            style={filter === stage ? { borderColor: color, background: color + '12' } : { borderColor: '#e5e7eb' }}
            onClick={() => setFilter(filter === stage ? '' : stage)}
          >
            <div className="text-2xl font-black" style={{ color }}>{stageCounts[stage] || 0}</div>
            <div className="text-xs font-medium mt-1" style={{ color: filter === stage ? color : '#6b7280' }}>{stage}</div>
            {filter === stage && <div className="text-[10px] font-bold mt-1" style={{ color }}>● Filtered</div>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm font-medium">{filter ? `No assets in "${filter}" stage.` : 'No assets found.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full">
              <thead>
                <tr>
                  {['Asset ID','Asset Name','Purchase Date','Purchase Value','Current Value','Depreciation','Age','Stage','Action'].map(h => (
                    <th key={h} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(a => {
                  const ss = stageStyle[a._stage] || stageStyle['Active'];
                  return (
                    <tr key={a._id} className="border-b border-gray-50 last:border-0 hover:bg-red-50/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-red-700 text-sm">{a.assetId}</td>
                      <td className="px-4 py-3 font-semibold text-sm">{a.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{fmtDate(a.purchaseDate)}</td>
                      <td className="px-4 py-3 font-bold text-sm">{fmt(a.purchaseValue)}</td>
                      <td className="px-4 py-3 font-bold text-green-600 text-sm">{fmt(a.currentValue)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${Math.min(a._dep, 100)}%` }} />
                          </div>
                          <span className="font-bold text-red-500">{a._dep}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{a._age ? `${a._age} yrs` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>{a._stage}</span>
                      </td>
                      <td className="px-4 py-3">
                        {a._stage === 'End of Life' && a.status !== 'Disposed' ? (
                          <button
                            onClick={() => setDisposeTarget(a)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-700 font-semibold border-0 cursor-pointer font-[inherit] hover:bg-red-200"
                          >
                            Dispose
                          </button>
                        ) : a.status === 'Disposed' ? (
                          <span className="text-xs font-bold text-gray-400">Disposed</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
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

      {/* Dispose confirmation */}
      <Modal
        open={!!disposeTarget}
        onClose={() => setDisposeTarget(null)}
        title="Dispose Asset"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDisposeTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDispose}>Confirm Dispose</button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to mark <strong>{disposeTarget?.name}</strong> ({disposeTarget?.assetId}) as disposed? This action marks the asset as end-of-life.
        </p>
      </Modal>
    </div>
  );
}
