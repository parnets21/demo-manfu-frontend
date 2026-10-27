import { useState, useEffect, useRef } from 'react';
import { getDefectiveStock } from '../../api/defectiveStockApi';
import { toast } from '../../components/common/Toast';
import { MdBrokenImage, MdCheckCircle, MdWarningAmber } from 'react-icons/md';
import Pagination from '../../components/common/Pagination';

export default function DefectiveStockPage() {
  const [defectiveData, setDefectiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const refreshRef = useRef(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getDefectiveStock();
      if (response.success && response.data) {
        setDefectiveData(response.data);
      }
    } catch (error) {
      toast('Error loading defective stock data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function globally for other components
  useEffect(() => {
    window.refreshDefectiveStock = fetchData;
    refreshRef.current = fetchData;
    return () => {
      delete window.refreshDefectiveStock;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading defective stock data...</p>
        </div>
      </div>
    );
  }

  const statuses = ['All', 'QC Hold', 'In Repair', 'Disposed', 'Pending Review'];
  const filtered = filter === 'All' ? defectiveData : defectiveData.filter(item => item.action === filter);

  const stats = {
    total: defectiveData.length,
    qcHold: defectiveData.filter(item => item.action === 'QC Hold').length,
    inRepair: defectiveData.filter(item => item.action === 'In Repair').length,
    disposed: defectiveData.filter(item => item.action === 'Disposed').length,
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-600 uppercase mb-2">Total Defective</div>
          <div className="text-3xl font-bold text-red-600">{stats.total}</div>
          <div className="text-xs text-gray-400 mt-1">units</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-600 uppercase mb-2">QC Hold</div>
          <div className="text-3xl font-bold text-amber-600">{stats.qcHold}</div>
          <div className="text-xs text-gray-400 mt-1">awaiting review</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-600 uppercase mb-2">In Repair</div>
          <div className="text-3xl font-bold text-blue-600">{stats.inRepair}</div>
          <div className="text-xs text-gray-400 mt-1">being fixed</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-600 uppercase mb-2">Disposed</div>
          <div className="text-3xl font-bold text-gray-600">{stats.disposed}</div>
          <div className="text-xs text-gray-400 mt-1">written off</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-gray-800">Defective Stock Inventory</div>
            <div className="text-xs text-gray-400 mt-0.5">Track and manage defective items</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === s
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['SKU', 'Item Name', 'Qty', 'Warehouse', 'Category', 'Location', 'Unit Price', 'Total Value', 'Date Added', 'Action'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page-1)*pageSize, page*pageSize).map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-red-700">{row.sku}</td>
                  <td className="px-4 py-3 text-sm">{row.name}</td>
                  <td className="px-4 py-3 text-sm font-bold">{row.qty}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.warehouseName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.location}</td>
                  <td className="px-4 py-3 text-sm font-semibold">₹{row.unitPrice}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-800">₹{row.totalValue}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.dateAdded}</td>
                  <td className="px-4 py-3">
                    <button className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-all">
                      {row.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPage={p => setPage(p)}
          onPageSize={s => { setPageSize(s); setPage(1); }}
        />
      </div>
    </div>
  );
}