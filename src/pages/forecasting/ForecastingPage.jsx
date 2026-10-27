import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import { toast } from '../../components/common/Toast';
import { forecastingApi } from '../../api/forecastingApi';
import { prApi } from '../../api/prApi';

const thCls = 'bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap';
const tdCls = 'px-4 py-3 text-gray-800 align-middle';
const trCls = 'border-b border-gray-50 last:border-0 hover:bg-red-50/40 transition-colors';

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
      <div style={{ width:32, height:32, border:'3px solid #f1f5f9', borderTop:'3px solid #1e40af', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function ForecastingPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab]           = useState(initialTab);
  const [loading, setLoading]               = useState(false);
  const [historical, setHistorical]         = useState([]);
  const [forecast, setForecast]             = useState([]);
  const [skuForecast, setSkuForecast]       = useState([]);
  const [suggested, setSuggested]           = useState([]);
  const [optimization, setOptimization]     = useState([]);
  const [seasonal, setSeasonal]             = useState([]);
  const [creatingPO, setCreatingPO]         = useState(null);

  const loadDemand = useCallback(async () => {
    setLoading(true);
    try {
      const [demRes, skuRes] = await Promise.all([
        forecastingApi.getDemandForecast(),
        forecastingApi.getSkuForecast(),
      ]);
      setHistorical(demRes.data?.historical || []);
      setForecast(demRes.data?.forecast || []);
      setSkuForecast(skuRes.data || []);
    } catch (e) { toast(e.message || 'Failed to load forecast', 'error'); }
    finally { setLoading(false); }
  }, []);

  const loadPurchasePlanning = useCallback(async () => {
    setLoading(true);
    try { const r = await forecastingApi.getSuggestedPurchases(); setSuggested(r.data || []); }
    catch (e) { toast(e.message || 'Failed to load suggestions', 'error'); }
    finally { setLoading(false); }
  }, []);

  const loadOptimization = useCallback(async () => {
    setLoading(true);
    try { const r = await forecastingApi.getOptimization(); setOptimization(r.data || []); }
    catch (e) { toast(e.message || 'Failed to load optimization', 'error'); }
    finally { setLoading(false); }
  }, []);

  const loadSeasonal = useCallback(async () => {
    try { const r = await forecastingApi.getSeasonalConfig(); setSeasonal(r.data || []); }
    catch (_) {}
  }, []);

  useEffect(() => {
    if (activeTab === 0) loadDemand();
    else if (activeTab === 1) loadPurchasePlanning();
    else if (activeTab === 2) loadOptimization();
    else if (activeTab === 3) loadSeasonal();
  }, [activeTab, loadDemand, loadPurchasePlanning, loadOptimization, loadSeasonal]);

  const handleCreatePO = async (item) => {
    setCreatingPO(item._id);
    try {
      await prApi.create({
        itemName: item.name,
        sku: item.sku,
        quantity: item.suggestedQty,
        department: 'Procurement',
        requestedBy: 'Forecasting System',
        reason: `Forecast-driven reorder — current stock: ${item.currentStock}, forecast demand: ${item.forecastDemand}`,
        priority: item.urgency === 'Critical' ? 'Urgent' : 'Normal',
      });
      toast(`PR created for ${item.name}`);
    } catch (e) { toast(e.message || 'Failed to create PR', 'error'); }
    finally { setCreatingPO(null); }
  };

  const handleAutoGeneratePOs = async () => {
    const criticalItems = suggested.filter(s => s.urgency === 'Critical');
    if (criticalItems.length === 0) { toast('No critical items to generate POs for', 'warning'); return; }
    try {
      const r = await forecastingApi.autoGeneratePOs({ itemIds: criticalItems.map(i => i._id) });
      toast(r.message || `${criticalItems.length} POs queued`);
    } catch (e) { toast(e.message || 'Failed', 'error'); }
  };

  const handleSaveSeasonal = async () => {
    try {
      await forecastingApi.saveSeasonalConfig(seasonal);
      toast('Seasonal config saved');
    } catch (e) { toast(e.message || 'Failed to save', 'error'); }
  };

  const primaryBtn = {
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'8px 16px', borderRadius:10,
    background:'linear-gradient(135deg,#3b82f6,#1e40af)',
    color:'#fff', border:'none', cursor:'pointer',
    fontSize:13, fontWeight:600, fontFamily:'inherit',
    boxShadow:'0 3px 10px rgba(185,28,28,0.3)',
  };

  const stockCoverageData = optimization.slice(0, 8).map(item => ({
    label: item.sku,
    value: Math.min(item.daysOfStock || 0, 120),
    color: (item.daysOfStock || 0) < 7 ? '#ef4444' : (item.daysOfStock || 0) < 30 ? '#f59e0b' : '#27ae60',
  }));

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {activeTab === 0 && <button onClick={loadDemand} style={primaryBtn}>↻ Refresh Forecast</button>}
        {activeTab === 1 && <button onClick={handleAutoGeneratePOs} style={primaryBtn}>Auto-Generate PRs</button>}
        {activeTab === 3 && <button onClick={handleSaveSeasonal} style={primaryBtn}>Save Config</button>}
      </div>

      {/* Tab 0: Demand Forecast */}
      {activeTab === 0 && (
        <div>
          {loading ? <Spinner /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="text-sm font-bold text-gray-800 mb-1">Historical Demand</div>
                  <div className="text-xs text-gray-400 mt-0.5 mb-3">Units — Last 12 months</div>
                  {historical.length > 0 ? <LineChart data={historical} color="#1e40af" height={180} gradientId="grad_historical" /> : <div className="text-center py-8 text-gray-400 text-sm">No historical data yet</div>}
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="text-sm font-bold text-gray-800 mb-1">Demand Forecast</div>
                  <div className="text-xs text-gray-400 mt-0.5 mb-3">Projected — Next 6 months</div>
                  {forecast.length > 0 ? <LineChart data={forecast} color="#f39c12" height={180} gradientId="grad_forecast" /> : <div className="text-center py-8 text-gray-400 text-sm">No forecast data yet</div>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="text-sm font-bold text-gray-800 mb-3.5">SKU-wise Demand Forecast</div>
                {skuForecast.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">No inventory items found</div> : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full">
                      <thead>
                        <tr>
                          {['SKU','Item','Current Stock','This Month','Next Month','+2 Months','+3 Months','Trend'].map(h => <th key={h} className={thCls}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {skuForecast.map((r, i) => (
                          <tr key={i} className={trCls}>
                            <td className={`${tdCls} font-mono text-xs font-semibold text-red-700`}>{r.sku}</td>
                            <td className={`${tdCls} font-semibold`}>{r.name}</td>
                            <td className={`${tdCls} font-bold ${r.currentStock < 50 ? 'text-red-500' : 'text-green-600'}`}>{r.currentStock}</td>
                            <td className={tdCls}>{r.aprActual}</td>
                            <td className={`${tdCls} font-bold text-amber-600`}>{r.m1Forecast}</td>
                            <td className={`${tdCls} font-bold text-amber-600`}>{r.m2Forecast}</td>
                            <td className={`${tdCls} font-bold text-amber-600`}>{r.m3Forecast}</td>
                            <td className={`${tdCls} font-bold text-green-600`}>{r.trend}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 1: Purchase Planning */}
      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-sm font-bold text-gray-800">Suggested Purchase Requisitions</div>
            <span className="text-xs text-gray-400">{suggested.length} items need attention</span>
          </div>
          {loading ? <Spinner /> : suggested.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">All stock levels are healthy — no purchases needed right now.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead><tr>{['SKU','Item Name','Current Stock','Min Stock','Forecast Demand','Suggested Qty','Preferred Vendor','Urgency','Action'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {suggested.map((s, i) => (
                    <tr key={i} className={trCls}>
                      <td className={`${tdCls} font-semibold text-red-700 font-mono`}>{s.sku}</td>
                      <td className={`${tdCls} font-semibold`}>{s.name}</td>
                      <td className={`${tdCls} font-bold ${s.currentStock < s.minStock ? 'text-red-500' : 'text-green-600'}`}>{s.currentStock}</td>
                      <td className={`${tdCls} text-gray-400`}>{s.minStock}</td>
                      <td className={tdCls}>{s.forecastDemand}</td>
                      <td className={`${tdCls} font-bold`}>{s.suggestedQty}</td>
                      <td className={tdCls}>{s.vendor}</td>
                      <td className={tdCls}><StatusBadge status={s.urgency} type={s.urgency==='Critical'?'danger':s.urgency==='High'?'warning':'info'} /></td>
                      <td className={tdCls}>
                        <button onClick={() => handleCreatePO(s)} disabled={creatingPO === s._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit] disabled:opacity-60">
                          {creatingPO === s._id ? 'Creating...' : 'Create PR'}
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

      {/* Tab 2: Inventory Optimization */}
      {activeTab === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-3.5">Inventory Optimization Recommendations</div>
            {loading ? <Spinner /> : optimization.slice(0, 8).map((r, i) => {
              const color = r.action === 'Reorder Immediately' ? '#ef4444' : r.action === 'Reorder Soon' ? '#f59e0b' : r.action === 'Clearance / Write-off' ? '#6b7280' : '#3b82f6';
              return (
                <div key={i} className={`py-3 ${i < Math.min(optimization.length, 8) - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <div className="font-semibold text-sm">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.sku}</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color + '20', color }}>{r.action}</span>
                  </div>
                  <div className="flex gap-4 text-xs mt-1">
                    <span className="text-gray-400">Current: <strong className="text-gray-800">{r.current}</strong></span>
                    <span className="text-gray-400">Optimal: <strong className="text-gray-800">{r.optimal}</strong></span>
                    <span className="text-gray-400">Days left: <strong className="text-gray-800">{r.daysOfStock >= 999 ? '∞' : r.daysOfStock}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-1">Stock Coverage (Days)</div>
            <div className="text-xs text-gray-400 mb-3">Days of stock remaining at current demand rate</div>
            {loading ? <Spinner /> : stockCoverageData.length > 0 ? <BarChart data={stockCoverageData} height={200} /> : <div className="text-center py-8 text-gray-400 text-sm">No data</div>}
          </div>
        </div>
      )}

      {/* Tab 3: Seasonal Trends */}
      {activeTab === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Seasonal Trend Configuration</div>
            <div className="text-xs text-gray-400 mb-4">Set demand multipliers per month to adjust forecasts for seasonal patterns</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {seasonal.map((s, i) => {
                const color = s.multiplier >= 1.4 ? '#ef4444' : s.multiplier >= 1.1 ? '#f59e0b' : '#10b981';
                return (
                  <div key={s.month} className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-500">{s.month}</label>
                    <input type="number" step="0.1" min="0.1" max="3"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit] text-center font-bold"
                      value={s.multiplier}
                      style={{ color }}
                      onChange={e => setSeasonal(prev => prev.map((x, j) => j === i ? { ...x, multiplier: parseFloat(e.target.value) || 1 } : x))}
                    />
                  </div>
                );
              })}
            </div>
            <button onClick={handleSaveSeasonal}
              className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]">
              Save Seasonal Config
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Seasonal Demand Pattern</div>
            {seasonal.length > 0 ? (
              <BarChart data={seasonal.map(s => ({
                label: s.month,
                value: Math.round(s.multiplier * 4200),
                color: s.multiplier >= 1.4 ? '#ef4444' : s.multiplier >= 1.1 ? '#f59e0b' : '#10b981',
              }))} height={200} />
            ) : <Spinner />}
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Peak</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
