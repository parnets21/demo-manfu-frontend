import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { reportsApi } from '../../api/reportsApi';
import { inventoryApi } from '../../api/inventoryApi';

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

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }
function fmtCr(n) { return n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${fmt(n)}`; }

export default function ReportsPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab]       = useState(initialTab);
  const [loading, setLoading]           = useState(false);
  const [salesData, setSalesData]       = useState(null);
  const [stockData, setStockData]       = useState([]);
  const [turnoverData, setTurnoverData] = useState([]);
  const [purchaseData, setPurchaseData] = useState([]);
  const [productionData, setProductionData] = useState(null);
  const [returnData, setReturnData]     = useState(null);
  const [warehouseFilter, setWarehouseFilter] = useState('All Warehouses');
  const [monthFilter, setMonthFilter]   = useState(new Date().toISOString().slice(0,7));
  const [warehouses, setWarehouses]     = useState([]);

  // Fetch warehouse list once on mount
  useEffect(() => {
    inventoryApi.getAll().then(r => {
      const whs = [...new Set((r.data || []).map(i => i.warehouse).filter(Boolean))];
      setWarehouses(whs);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 0 || activeTab === 1) {
        const r = await reportsApi.getSalesAnalytics();
        setSalesData(r.data);
      } else if (activeTab === 2) {
        const r = await reportsApi.getInventoryTurnover();
        setTurnoverData(r.data || []);
      } else if (activeTab === 3) {
        const r = await reportsApi.getStockSummary({ warehouse: warehouseFilter });
        setStockData(r.data || []);
      } else if (activeTab === 4) {
        const r = await reportsApi.getPurchaseRegister({ month: monthFilter });
        setPurchaseData(r.data || []);
      } else if (activeTab === 5) {
        const r = await reportsApi.getProductionReport({ month: monthFilter });
        setProductionData(r.data);
      } else if (activeTab === 6) {
        const r = await reportsApi.getReturnReconciliation();
        setReturnData(r.data);
      }
    } catch (e) { toast(e.message || 'Failed to load report', 'error'); }
    finally { setLoading(false); }
  }, [activeTab, warehouseFilter, monthFilter]);

  useEffect(() => { load(); }, [load]);

  const exportExcel = (rows, filename, sheetName = 'Report') => {
    if (!rows.length) { toast('No data to export', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const out = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const blob = new Blob([out], { type:'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${rows.length} rows`);
  };

  const outlineBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'transparent', color:'#1e40af', border:'1.5px solid #1e40af', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' };
  const primaryBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#1e40af)', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', boxShadow:'0 3px 10px rgba(185,28,28,0.3)' };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <button onClick={() => toast('PDF export coming soon', 'info')} style={outlineBtn}>⬇ Export PDF</button>
        <button onClick={() => {
          if (activeTab === 0 && salesData) exportExcel(salesData.byMonth, 'SalesAnalytics', 'Monthly Sales');
          else if (activeTab === 2) exportExcel(turnoverData, 'InventoryTurnover', 'Turnover');
          else if (activeTab === 3) exportExcel(stockData.map(s => ({ SKU: s.sku, Name: s.name, Category: s.category?.name || '—', Warehouse: s.warehouse || '—', 'Total Qty': s.totalQuantity, Available: s.availableQuantity, Reserved: s.reservedQuantity, 'Min Qty': s.minQuantity, Unit: s.unit, 'Unit Price (₹)': s.unitPrice, 'Stock Value (₹)': s.totalValue, Status: s.status })), 'StockSummary', 'Stock');
          else if (activeTab === 4) exportExcel(purchaseData, 'PurchaseRegister', 'Purchases');
          else if (activeTab === 5 && productionData) exportExcel(productionData.workOrders.map(w => ({ WO:w.woId, Product:w.product, Target:w.qty, Produced:w.produced, Rejected:w.rejected, Status:w.status })), 'ProductionReport', 'Production');
          else if (activeTab === 6 && returnData) exportExcel(returnData.returns, 'ReturnReconciliation', 'Returns');
          else toast('No data to export', 'warning');
        }} style={primaryBtn}>⬇ Export Excel</button>
      </div>

      {/* Tab 0: Sales Analytics */}
      {activeTab === 0 && (
        loading ? <Spinner /> : salesData ? (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[
                { label:'Total Revenue',  value: fmtCr(salesData.totalRevenue),  color:'#1e40af' },
                { label:'Total Orders',   value: salesData.totalOrders,           color:'#3b82f6' },
                { label:'Avg Order Value',value: fmtCr(salesData.avgOrderValue),  color:'#8b5cf6' },
                { label:'Top Customer',   value: salesData.topCustomer || '—',    color:'#10b981' },
              ].map((k, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="text-2xl font-black tracking-tight" style={{ color:k.color }}>{k.value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="text-sm font-bold text-gray-800 mb-1">Monthly Revenue Trend</div>
                <div className="text-xs text-gray-400 mt-0.5 mb-3">Current year</div>
                {salesData.byMonth?.length > 0 ? <LineChart data={salesData.byMonth} color="#1e40af" height={180} gradientId="grad_revenue" /> : <div className="text-center py-8 text-gray-400 text-sm">No sales data yet</div>}
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="text-sm font-bold text-gray-800 mb-1">Sales by Customer</div>
                <div className="text-xs text-gray-400 mt-0.5 mb-3">Top 5 customers</div>
                {salesData.topCustomers?.length > 0 ? <BarChart data={salesData.topCustomers} height={180} /> : <div className="text-center py-8 text-gray-400 text-sm">No customer data yet</div>}
              </div>
            </div>
          </div>
        ) : <div className="text-center py-10 text-gray-400">No sales data available</div>
      )}

      {/* Tab 1: P&L — computed from available data */}
      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3.5">P&L Summary</div>
          <div className="text-xs text-gray-400 mb-4">Profit & Loss data is derived from Sales Orders and Purchase Orders. Connect your accounting module for full P&L.</div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead><tr>{['Category','Description','Amount'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {[
                  { cat:'Revenue',          desc:'Total sales orders value',    amt: salesData?.totalRevenue || 0, pos:true },
                  { cat:'Gross Profit',     desc:'Revenue - estimated COGS',    amt: (salesData?.totalRevenue || 0) * 0.35, pos:true },
                  { cat:'Operating Profit', desc:'After overhead deductions',   amt: (salesData?.totalRevenue || 0) * 0.22, pos:true },
                ].map((r, i) => (
                  <tr key={i} className={trCls}>
                    <td className={`${tdCls} font-semibold`}>{r.cat}</td>
                    <td className={`${tdCls} text-gray-500`}>{r.desc}</td>
                    <td className={`${tdCls} font-bold ${r.pos ? 'text-green-600' : 'text-red-500'}`}>{fmtCr(r.amt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Inventory Turnover */}
      {activeTab === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3.5">Inventory Turnover Analysis</div>
          {loading ? <Spinner /> : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead><tr>{['SKU','Item Name','Opening Stock','Closing Stock','Units Sold','Turnover Ratio','Category'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {turnoverData.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No inventory data available</td></tr>
                  ) : turnoverData.map((t, i) => (
                    <tr key={i} className={trCls}>
                      <td className={`${tdCls} font-semibold text-red-700 font-mono`}>{t.sku}</td>
                      <td className={`${tdCls} font-semibold`}>{t.name}</td>
                      <td className={tdCls}>{t.openingStock}</td>
                      <td className={tdCls}>{t.closingStock}</td>
                      <td className={`${tdCls} font-bold`}>{t.sold}</td>
                      <td className={`${tdCls} font-extrabold ${t.status==='Dead'?'text-red-500':t.status==='Fast Moving'?'text-green-600':'text-red-700'}`}>{t.turnover}</td>
                      <td className={tdCls}><StatusBadge status={t.status} type={t.status==='Dead'?'danger':t.status==='Fast Moving'?'success':'info'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Stock Summary */}
      {activeTab === 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-gray-800">Stock Summary Report</div>
              <div className="text-xs text-gray-400 mt-0.5">Current stock position across all warehouses</div>
            </div>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 font-[inherit]"
              value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
              <option>All Warehouses</option>
              {warehouses.map(wh => <option key={wh}>{wh}</option>)}
            </select>
          </div>
          {loading ? <Spinner /> : (
            <>
              {/* Summary KPI strip */}
              {stockData.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {[
                    { label:'Total SKUs',      value: stockData.length,                                                              color:'#3b82f6' },
                    { label:'Total Stock Qty', value: fmt(stockData.reduce((s, r) => s + (r.totalQuantity || 0), 0)),                color:'#8b5cf6' },
                    { label:'Stock Value',     value: fmtCr(stockData.reduce((s, r) => s + (r.totalValue || 0), 0)),                 color:'#1e40af' },
                    { label:'Critical Items',  value: stockData.filter(r => r.status === 'Critical' || r.status === 'Dead').length,  color:'#f59e0b' },
                  ].map((k, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <div className="text-lg font-black tracking-tight" style={{ color:k.color }}>{k.value}</div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">{k.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead><tr>{['SKU','Item Name','Category','Warehouse','Total Qty','Available','Reserved','Min Qty','Unit','Unit Price','Stock Value','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                  <tbody>
                    {stockData.length === 0 ? (
                      <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400 text-sm">No stock data available</td></tr>
                    ) : stockData.map((row, i) => (
                      <tr key={i} className={trCls}>
                        <td className={`${tdCls} font-semibold text-red-700 font-mono text-xs`}>{row.sku}</td>
                        <td className={`${tdCls} font-semibold`}>{row.name}</td>
                        <td className={tdCls}>{row.category?.name || '—'}</td>
                        <td className={`${tdCls} text-gray-500 text-xs`}>{row.warehouse || '—'}</td>
                        <td className={`${tdCls} font-bold text-center`}>{fmt(row.totalQuantity)}</td>
                        <td className={`${tdCls} text-center font-bold ${(row.availableQuantity || 0) <= (row.minQuantity || 0) ? 'text-red-500' : 'text-green-600'}`}>{fmt(row.availableQuantity)}</td>
                        <td className={`${tdCls} text-center text-gray-400`}>{fmt(row.reservedQuantity)}</td>
                        <td className={`${tdCls} text-center text-gray-400`}>{fmt(row.minQuantity)}</td>
                        <td className={`${tdCls} text-center text-gray-400 text-xs`}>{row.unit || '—'}</td>
                        <td className={`${tdCls} text-right`}>₹{fmt(row.unitPrice)}</td>
                        <td className={`${tdCls} font-bold text-right text-red-700`}>₹{fmt(row.totalValue)}</td>
                        <td className={tdCls}><StatusBadge status={row.status} type={row.status==='Critical'?'danger':row.status==='Dead'?'gray':'success'} /></td>
                      </tr>
                    ))}
                    {stockData.length > 0 && (
                      <tr className="bg-red-50 font-bold border-t-2 border-red-200">
                        <td colSpan={4} className="px-4 py-3 text-right text-gray-500 text-xs font-bold uppercase tracking-wide">Total</td>
                        <td className={`${tdCls} font-extrabold text-center`}>{fmt(stockData.reduce((s, r) => s + (r.totalQuantity || 0), 0))}</td>
                        <td className={`${tdCls} font-extrabold text-center text-green-700`}>{fmt(stockData.reduce((s, r) => s + (r.availableQuantity || 0), 0))}</td>
                        <td className={`${tdCls} text-center text-gray-400`}>{fmt(stockData.reduce((s, r) => s + (r.reservedQuantity || 0), 0))}</td>
                        <td colSpan={3} className="px-4 py-3"></td>
                        <td className={`${tdCls} font-extrabold text-right text-red-700`}>₹{fmt(stockData.reduce((s, r) => s + (r.totalValue || 0), 0))}</td>
                        <td className={tdCls}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 4: Purchase Register */}
      {activeTab === 4 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-gray-800">Purchase Register</div>
              <div className="text-xs text-gray-400 mt-0.5">All purchase orders for selected month</div>
            </div>
            <input type="month" className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 font-[inherit]"
              value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
          </div>
          {loading ? <Spinner /> : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead><tr>{['PO No.','Date','Vendor','Items','Taxable Amt','CGST','SGST','IGST','Total','GRN Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {purchaseData.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">No purchase orders for this period</td></tr>
                  ) : purchaseData.map((row, i) => (
                    <tr key={i} className={trCls}>
                      <td className={`${tdCls} font-semibold text-red-700`}>{row.poId}</td>
                      <td className={tdCls}>{row.date}</td>
                      <td className={`${tdCls} font-semibold`}>{row.vendor}</td>
                      <td className={`${tdCls} text-center`}>{row.items}</td>
                      <td className={tdCls}>₹{fmt(row.taxable)}</td>
                      <td className={`${tdCls} text-gray-400`}>₹{fmt(row.cgst)}</td>
                      <td className={`${tdCls} text-gray-400`}>₹{fmt(row.sgst)}</td>
                      <td className={`${tdCls} text-gray-400`}>{row.igst > 0 ? `₹${fmt(row.igst)}` : '—'}</td>
                      <td className={`${tdCls} font-extrabold text-red-700`}>₹{fmt(row.total)}</td>
                      <td className={tdCls}><StatusBadge status={row.grnStatus} type={row.grnStatus==='Completed'?'success':row.grnStatus==='Partial'?'warning':'info'} /></td>
                    </tr>
                  ))}
                  {purchaseData.length > 0 && (
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={4} className="px-4 py-3 text-right text-gray-400">Total</td>
                      <td className={tdCls}>₹{fmt(purchaseData.reduce((s,r) => s + r.taxable, 0))}</td>
                      <td className={tdCls}>₹{fmt(purchaseData.reduce((s,r) => s + r.cgst, 0))}</td>
                      <td className={tdCls}>₹{fmt(purchaseData.reduce((s,r) => s + r.sgst, 0))}</td>
                      <td className={tdCls}>—</td>
                      <td className={`${tdCls} text-red-700`}>₹{fmt(purchaseData.reduce((s,r) => s + r.total, 0))}</td>
                      <td className={tdCls}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Production Report */}
      {activeTab === 5 && (
        <div>
          {loading ? <Spinner /> : productionData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {[
                  { label:'Total Produced',  value: productionData.summary.totalProduced,  color:'#27ae60' },
                  { label:'Total Rejected',  value: productionData.summary.totalRejected,  color:'#ef4444' },
                  { label:'Rejection Rate',  value: productionData.summary.rejectionRate,  color:'#f59e0b' },
                  { label:'Efficiency',      value: `${productionData.summary.efficiency}%`, color:'#8b5cf6' },
                ].map((k, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                    <div className="text-2xl font-black tracking-tight" style={{ color:k.color }}>{k.value}</div>
                    <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-gray-800">Production Report</div>
                    <div className="text-xs text-gray-400 mt-0.5">Work order wise production summary</div>
                  </div>
                  <input type="month" className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 font-[inherit]"
                    value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead><tr>{['WO No.','Product','BOM Ref','Target','Produced','Rejected','Efficiency','Start','End','Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                    <tbody>
                      {productionData.workOrders.length === 0 ? (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">No work orders for this period</td></tr>
                      ) : productionData.workOrders.map((row, i) => {
                        const eff = row.qty > 0 ? Math.round((row.produced / row.qty) * 100) : 0;
                        return (
                          <tr key={i} className={trCls}>
                            <td className={`${tdCls} font-semibold text-red-700`}>{row.woId}</td>
                            <td className={`${tdCls} font-semibold`}>{row.product}</td>
                            <td className={`${tdCls} font-mono text-xs`}>{row.bomId?.bomId || '—'}</td>
                            <td className={`${tdCls} text-center`}>{row.qty}</td>
                            <td className={`${tdCls} text-center font-bold text-green-600`}>{row.produced}</td>
                            <td className={`${tdCls} text-center font-bold ${row.rejected > 0 ? 'text-red-500' : 'text-gray-400'}`}>{row.rejected}</td>
                            <td className={`${tdCls} font-bold ${eff >= 90 ? 'text-green-600' : eff >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{eff}%</td>
                            <td className={tdCls}>{row.startDate ? new Date(row.startDate).toLocaleDateString('en-IN') : '—'}</td>
                            <td className={tdCls}>{row.endDate ? new Date(row.endDate).toLocaleDateString('en-IN') : '—'}</td>
                            <td className={tdCls}><StatusBadge status={row.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <div className="text-center py-10 text-gray-400">No production data available</div>}
        </div>
      )}

      {/* Tab 6: Return Reconciliation */}
      {activeTab === 6 && (
        <div>
          {loading ? <Spinner /> : returnData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {[
                  { label:'Total Returns',       value: returnData.summary.total,                                    color:'#1c2833' },
                  { label:'Total Return Value',  value: `₹${fmt(returnData.summary.totalValue)}`,                   color:'#ef4444' },
                  { label:'Credit Notes Issued', value: returnData.summary.creditIssued,                            color:'#27ae60' },
                  { label:'Unreconciled',        value: returnData.summary.total - returnData.summary.creditIssued, color:'#f59e0b' },
                ].map((k, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                    <div className="text-2xl font-black tracking-tight" style={{ color:k.color }}>{k.value}</div>
                    <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="text-sm font-bold text-gray-800 mb-3.5">Return Reconciliation Report</div>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead><tr>{['Return ID','Docket','Customer','Return Type','Return Value','Credit Note','Stage','Reconciled'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                    <tbody>
                      {returnData.returns.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No returns found</td></tr>
                      ) : returnData.returns.map((row, i) => (
                        <tr key={i} className={trCls}>
                          <td className={`${tdCls} font-semibold text-red-700`}>{row.mrId}</td>
                          <td className={`${tdCls} font-mono text-xs`}>{row.docketId || '—'}</td>
                          <td className={`${tdCls} font-semibold`}>{row.customer}</td>
                          <td className={tdCls}>{row.returnType}</td>
                          <td className={`${tdCls} font-bold`}>₹{fmt(row.value)}</td>
                          <td className={`${tdCls} font-mono text-xs ${row.creditNote ? 'text-green-600' : 'text-amber-500'}`}>{row.creditNote || 'Not issued'}</td>
                          <td className={tdCls}><StatusBadge status={row.stage} /></td>
                          <td className={tdCls}><StatusBadge status={row.reconciled} type={row.reconciled==='Yes'?'success':row.reconciled==='Pending'?'warning':'danger'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <div className="text-center py-10 text-gray-400">No return data available</div>}
        </div>
      )}
    </div>
  );
}
