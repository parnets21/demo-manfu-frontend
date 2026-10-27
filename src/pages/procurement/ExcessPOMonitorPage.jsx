import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { poApi } from '../../api/poApi';
import { prApi } from '../../api/prApi';

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]';

const WARN_THRESHOLD  = 10;   // %
const CRIT_THRESHOLD  = 25;   // %
const MAX_COVER_DAYS  = 45;   // days

function fmtINR(val) {
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Normalise item name for matching: lowercase, trim, collapse spaces */
const norm = (s = '') => s.toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * Build poLoadData rows by joining PO items with PR items on normalised name.
 * planned = total approved PR qty for that item name
 * poQty   = total PO qty for that item name (across all non-cancelled POs)
 */
function buildPoLoadData(pos, prs) {
  // Aggregate planned qty from approved PRs
  const plannedMap = {};   // normName -> qty
  prs.forEach(pr => {
    if (pr.status !== 'Approved') return;
    (pr.items || []).forEach(item => {
      const key = norm(item.name);
      plannedMap[key] = (plannedMap[key] || 0) + (item.qty || 0);
    });
  });

  // Aggregate PO qty per (vendor, item)
  const poMap = {};  // key: `${vendorName}||${normName}` -> { supplier, sku, item, poQty, basePrice }
  pos.forEach(po => {
    if (po.status === 'Cancelled') return;
    const supplier = po.vendor?.companyName || po.vendor || 'Unknown';
    (po.items || []).forEach(item => {
      const key = `${supplier}||${norm(item.name)}`;
      if (!poMap[key]) {
        poMap[key] = { supplier, sku: po.poId, item: item.name, poQty: 0, basePrice: item.basePrice || 0 };
      }
      poMap[key].poQty += item.qty || 0;
    });
  });

  return Object.values(poMap).map((row, idx) => {
    const planned = plannedMap[norm(row.item)] || 0;
    const excess  = Math.max(0, row.poQty - planned);
    const excessPct = planned > 0 ? ((row.poQty - planned) / planned) * 100 : 0;
    // Rough forecast cover: assume 30-day consumption = planned qty
    const forecastCover = planned > 0 ? Math.round((row.poQty / planned) * 30) : 0;

    let status = 'OK';
    if (row.poQty < planned) status = 'Under';
    else if (excessPct >= CRIT_THRESHOLD) status = 'Excess';
    else if (excessPct >= WARN_THRESHOLD) status = 'Excess';

    return { ...row, planned, excess, forecastCover, status, excessPct: Math.round(excessPct) };
  });
}

/** Aggregate poLoadData into supplier-level summary */
function buildSupplierSummary(rows) {
  const map = {};
  rows.forEach(row => {
    if (!map[row.supplier]) {
      map[row.supplier] = { supplier: row.supplier, totalPOVal: 0, plannedVal: 0, excessVal: 0 };
    }
    const price = row.basePrice || 0;
    map[row.supplier].totalPOVal  += row.poQty   * price;
    map[row.supplier].plannedVal  += row.planned  * price;
    map[row.supplier].excessVal   += row.excess   * price;
  });

  return Object.values(map).map(s => {
    const excessPct = s.plannedVal > 0 ? Math.round((s.excessVal / s.plannedVal) * 100) : 0;
    let status = 'OK';
    if (s.excessVal > 0) status = 'Excess';
    else if (s.totalPOVal < s.plannedVal) status = 'Under';
    return {
      supplier:   s.supplier,
      totalPO:    fmtINR(s.totalPOVal),
      planned:    fmtINR(s.plannedVal),
      excess:     fmtINR(s.excessVal),
      excessPct:  excessPct + '%',
      excessRaw:  s.excessVal,
      status,
    };
  }).sort((a, b) => b.excessRaw - a.excessRaw);
}

export default function ExcessPOMonitorPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab]   = useState(initialTab);
  const [showModal, setShowModal]   = useState(false);
  const [selected, setSelected]     = useState(null);
  const [pos, setPOs]               = useState([]);
  const [prs, setPRs]               = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const tabs = ['PO Load Overview', 'Supplier-wise Report', 'Threshold Config'];

  useEffect(() => {
    setLoading(true);
    Promise.all([poApi.getAll(), prApi.getAll()])
      .then(([poRes, prRes]) => {
        setPOs(poRes.data || []);
        setPRs(prRes.data || []);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const poLoadData     = useMemo(() => buildPoLoadData(pos, prs), [pos, prs]);
  const supplierSummary = useMemo(() => buildSupplierSummary(poLoadData), [poLoadData]);

  const excessCount    = poLoadData.filter(r => r.status === 'Excess').length;
  const totalExcessVal = fmtINR(poLoadData.reduce((sum, r) => sum + (r.excess * (r.basePrice || 0)), 0));

  const handleExport = () => {
    if (activeTab === 0) {
      // Export PO Load Overview
      const data = poLoadData.map(row => ({
        'Supplier': row.supplier,
        'SKU': row.sku,
        'Item': row.item,
        'Planned Qty': row.planned || 0,
        'PO Qty': row.poQty,
        'Excess Qty': row.excess,
        'Excess %': row.excessPct + '%',
        'Forecast Cover (days)': row.forecastCover,
        'Status': row.status,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'PO Load Overview');
      XLSX.writeFile(wb, `Excess_PO_Monitor_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (activeTab === 1) {
      // Export Supplier-wise Report
      const data = supplierSummary.map(row => ({
        'Supplier': row.supplier,
        'Total PO Value': row.totalPO,
        'Planned Value': row.planned,
        'Excess Value': row.excess,
        'Excess %': row.excessPct,
        'Status': row.status,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Supplier Summary');
      XLSX.writeFile(wb, `Supplier_Excess_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading PO data…</div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-48 text-red-500 text-sm">Error: {error}</div>
  );

  return (
    <div>
      {/* Warning banner */}
      {excessCount > 0 && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-bold text-red-800 text-sm">{excessCount} SKUs have PO quantities exceeding planned/forecasted limits</div>
            <div className="text-xs text-red-600 mt-0.5">Total excess value: {totalExcessVal}. Review and adjust POs before approval.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total SKUs Monitored',  value: poLoadData.length,                                    color: '#1c2833' },
          { label: 'Excess Load SKUs',       value: excessCount,                                          color: '#ef4444' },
          { label: 'Under-ordered SKUs',     value: poLoadData.filter(r => r.status === 'Under').length,  color: '#f59e0b' },
          { label: 'Total Excess Value',     value: totalExcessVal,                                       color: '#8b5cf6' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="text-2xl font-black tracking-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b-2 border-gray-200 mb-5 overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-0.5 cursor-pointer flex-shrink-0 bg-transparent font-[inherit] ${activeTab === i ? 'text-red-700 border-red-600' : 'text-gray-400 border-transparent hover:text-red-600'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: PO Load Overview */}
      {activeTab === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-gray-800">SKU-wise PO vs Planned Quantity</div>
            <button onClick={handleExport} className="px-3 py-1.5 text-xs rounded-lg border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]">Export</button>
          </div>

          {poLoadData.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No PO data found. Create POs and approved PRs to see excess analysis.</div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr>{['Supplier', 'SKU', 'Item', 'Planned Qty', 'PO Qty', 'Excess Qty', 'Forecast Cover (days)', 'Status', 'Action'].map(h => (
                      <th key={h} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {poLoadData.map((row, i) => (
                      <tr key={i} onClick={() => setSelected(row)}
                        className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${row.status === 'Excess' ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 align-middle font-semibold">{row.supplier}</td>
                        <td className="px-4 py-3 align-middle font-mono text-xs text-red-700">{row.sku}</td>
                        <td className="px-4 py-3 align-middle font-semibold">{row.item}</td>
                        <td className="px-4 py-3 align-middle font-bold text-blue-600">{row.planned || '—'}</td>
                        <td className="px-4 py-3 align-middle font-bold">{row.poQty}</td>
                        <td className={`px-4 py-3 align-middle font-extrabold ${row.excess > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {row.excess > 0 ? `+${row.excess}` : '—'}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className={`font-bold text-sm ${row.forecastCover > MAX_COVER_DAYS ? 'text-red-500' : row.forecastCover > 30 ? 'text-amber-500' : 'text-green-600'}`}>
                            {row.forecastCover > 0 ? `${row.forecastCover}d` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <StatusBadge status={row.status} type={row.status === 'Excess' ? 'danger' : row.status === 'Under' ? 'warning' : 'success'} />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {row.status === 'Excess' && (
                            <button className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 font-semibold border-0 cursor-pointer font-[inherit]">Revise PO</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Inline bar chart for excess */}
              {poLoadData.some(r => r.excess > 0) && (
                <div className="mt-5">
                  <div className="text-sm font-bold text-gray-800 mb-3">Excess Load Visual</div>
                  {poLoadData.filter(r => r.excess > 0).map((row, i) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-700">{row.item}</span>
                        <span className="text-red-500 font-bold">+{row.excess} excess ({row.excessPct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-400 rounded-l-full" style={{ width: `${(row.planned / row.poQty) * 100}%` }} />
                        <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${(row.excess / row.poQty) * 100}%` }} />
                      </div>
                      <div className="flex gap-4 mt-1 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Planned: {row.planned}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Excess: {row.excess}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 1: Supplier-wise Report */}
      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-gray-800">Supplier-wise Excess Load Report</div>
            <button onClick={handleExport} className="px-3 py-1.5 text-xs rounded-lg border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]">Export</button>
          </div>
          {supplierSummary.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No supplier data available.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr>{['Supplier', 'Total PO Value', 'Planned Value', 'Excess Value', 'Excess %', 'Status', 'Action'].map(h => (
                    <th key={h} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {supplierSummary.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors ${row.status === 'Excess' ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 align-middle font-bold">{row.supplier}</td>
                      <td className="px-4 py-3 align-middle font-bold">{row.totalPO}</td>
                      <td className="px-4 py-3 align-middle text-blue-600 font-semibold">{row.planned}</td>
                      <td className={`px-4 py-3 align-middle font-extrabold ${row.excessRaw === 0 ? 'text-green-600' : 'text-red-500'}`}>{row.excess}</td>
                      <td className={`px-4 py-3 align-middle font-bold ${parseFloat(row.excessPct) > 0 ? 'text-red-500' : 'text-green-600'}`}>{row.excessPct}</td>
                      <td className="px-4 py-3 align-middle"><StatusBadge status={row.status} type={row.status === 'Excess' ? 'danger' : row.status === 'Under' ? 'warning' : 'success'} /></td>
                      <td className="px-4 py-3 align-middle">
                        {row.status === 'Excess' && (
                          <button className="px-2 py-1 text-[11px] rounded bg-amber-100 text-amber-800 font-semibold border-0 cursor-pointer font-[inherit]">Send Alert</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Threshold Config */}
      {activeTab === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Excess Load Thresholds</div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Warning Threshold (%)</label>
                <input type="number" className={inp} defaultValue={WARN_THRESHOLD} />
                <span className="text-[10px] text-gray-400">Warn when PO qty exceeds planned by this %</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Critical Threshold (%)</label>
                <input type="number" className={inp} defaultValue={CRIT_THRESHOLD} />
                <span className="text-[10px] text-gray-400">Block approval when PO qty exceeds planned by this %</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Max Forecast Cover (days)</label>
                <input type="number" className={inp} defaultValue={MAX_COVER_DAYS} />
                <span className="text-[10px] text-gray-400">Flag POs that cover more than this many days of demand</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Alert Recipients</label>
                <input className={inp} defaultValue="purchase_manager, management" />
              </div>
              <button className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]">
                Save Thresholds
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Current Rules</div>
            {[
              { rule: `Warn if PO > Planned + ${WARN_THRESHOLD}%`, active: true },
              { rule: `Block approval if PO > Planned + ${CRIT_THRESHOLD}%`, active: true },
              { rule: `Alert if forecast cover > ${MAX_COVER_DAYS} days`, active: true },
              { rule: 'Auto-email supplier on excess detection', active: false },
              { rule: 'Require manager sign-off for excess POs', active: true },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700">{r.rule}</span>
                <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${r.active ? 'bg-green-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${r.active ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Set PO Load Thresholds"
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]" onClick={() => setShowModal(false)}>Save</button>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 mb-4"><label className="text-xs font-semibold text-gray-600">Warning %</label><input type="number" className={inp} defaultValue={WARN_THRESHOLD} /></div>
          <div className="flex flex-col gap-1.5 mb-4"><label className="text-xs font-semibold text-gray-600">Critical %</label><input type="number" className={inp} defaultValue={CRIT_THRESHOLD} /></div>
          <div className="flex flex-col gap-1.5 mb-4"><label className="text-xs font-semibold text-gray-600">Max Cover Days</label><input type="number" className={inp} defaultValue={MAX_COVER_DAYS} /></div>
          <div className="flex flex-col gap-1.5 mb-4"><label className="text-xs font-semibold text-gray-600">Apply to Supplier</label>
            <select className={inp}>
              <option>All Suppliers</option>
              {[...new Set(pos.map(p => p.vendor?.companyName || p.vendor).filter(Boolean))].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
