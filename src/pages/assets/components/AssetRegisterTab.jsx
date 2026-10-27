import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import StatusBadge from '../../../components/common/StatusBadge';
import DataTable from '../../../components/tables/DataTable';
import Modal from '../../../components/common/Modal';
import { MdDeleteOutline, MdEdit } from 'react-icons/md';
import { toast } from '../../../components/common/Toast';
import { assetApi } from '../../../api/assetApi';
import AssetFormModal from './AssetFormModal';
import { dataEvents } from '../../../utils/dataEvents';

const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

export default function AssetRegisterTab() {
  const [assets, setAssets]       = useState([]);
  const [summary, setSummary]     = useState({});
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search)         params.search = search;
      if (filterStatus)   params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const [assetsRes, summaryRes] = await Promise.allSettled([
        assetApi.getAll(params),
        assetApi.getSummary(),
      ]);
      if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value.data || []);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data || {});
    } catch (e) { /* API not yet deployed — silently show empty state */ }
    finally { setLoading(false); }
  }, [search, filterStatus, filterCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (form) => {
    if (!form.name || !form.location) { toast('Name and location are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        name:          form.name,
        category:      form.category,
        location:      form.location,
        purchaseDate:  form.purchaseDate || undefined,
        purchaseValue: form.purchaseValue ? Number(form.purchaseValue) : 0,
        currentValue:  form.currentValue  ? Number(form.currentValue)  : 0,
        status:        form.status,
        nextMaintDate: form.nextMaintDate || undefined,
        serialNumber:  form.serialNumber,
        vendor:        form.vendor,
        description:   form.description,
      };
      if (editAsset) {
        await assetApi.update(editAsset._id, payload);
        toast('Asset updated');
      } else {
        await assetApi.create(payload);
        toast('Asset added');
      }
      setShowForm(false);
      setEditAsset(null);
      dataEvents.emit('asset:changed');
      await fetchData();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await assetApi.delete(deleteTarget._id);
      setDeleteTarget(null);
      dataEvents.emit('asset:changed');
      await fetchData();
      toast('Asset deleted', 'warning');
    } catch (e) { toast(e.message, 'error'); setDeleteTarget(null); }
  };

  const handleExport = () => {
    // Read directly from localStorage so export always works even with filters applied
    const allAssets = assets.length ? assets : (JSON.parse(localStorage.getItem('chakra_assets_local') || '[]'));
    if (!allAssets.length) { toast('No assets to export — add some assets first', 'error'); return; }

    // Compute virtuals locally (Mongoose virtuals don't exist on plain objects)
    const withVirtuals = allAssets.map(a => {
      const pv = a.purchaseValue || 0;
      const cv = a.currentValue  || 0;
      const dep = pv > 0 ? Math.round(((pv - cv) / pv) * 100) : 0;
      const ageMs = a.purchaseDate ? Date.now() - new Date(a.purchaseDate).getTime() : null;
      const age = ageMs ? (ageMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1) : '';
      let stage = 'Active';
      if (dep >= 80) stage = 'End of Life';
      else if (a.status === 'Maintenance') stage = 'Maintenance';
      else if (dep >= 50) stage = 'Aging';
      return { ...a, _dep: dep, _age: age, _stage: stage };
    });

    const rows = withVirtuals.map(a => ({
      'Asset ID':           a.assetId || '',
      'Asset Name':         a.name || '',
      'Category':           a.category || '',
      'Location':           a.location || '',
      'Serial Number':      a.serialNumber || '',
      'Vendor / Supplier':  a.vendor || '',
      'Purchase Date':      a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('en-IN') : '',
      'Purchase Value (₹)': a.purchaseValue ?? 0,
      'Current Value (₹)':  a.currentValue ?? 0,
      'Depreciation (%)':   a._dep,
      'Age (Years)':        a._age,
      'Status':             a.status || '',
      'Lifecycle Stage':    a._stage,
      'Next Maintenance':   a.nextMaintDate ? new Date(a.nextMaintDate).toLocaleDateString('en-IN') : '',
      'Description':        a.description || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 10 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
      { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asset Register');

    // Summary sheet
    const count = (s) => allAssets.filter(a => a.status === s).length;
    const summaryRows = [
      { Metric: 'Total Assets',             Value: allAssets.length },
      { Metric: 'Active',                   Value: count('Active') },
      { Metric: 'Under Maintenance',        Value: count('Maintenance') },
      { Metric: 'Inactive',                 Value: count('Inactive') },
      { Metric: 'Disposed',                 Value: count('Disposed') },
      { Metric: 'Total Purchase Value (₹)', Value: allAssets.reduce((s, a) => s + (a.purchaseValue || 0), 0) },
      { Metric: 'Total Current Value (₹)',  Value: allAssets.reduce((s, a) => s + (a.currentValue  || 0), 0) },
      { Metric: 'Exported On',              Value: new Date().toLocaleString('en-IN') },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Use Blob download for browser compatibility with xlsx 0.18.x
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbOut], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Assets_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${allAssets.length} assets to Excel`);
  };

  const kpis = [
    { label: 'Total Assets',      value: summary.total ?? 0,       color: '#3b82f6' },
    { label: 'Active',            value: summary.active ?? 0,      color: '#10b981' },
    { label: 'Under Maintenance', value: summary.maintenance ?? 0, color: '#f59e0b' },
    { label: 'Total Value',       value: fmt(summary.totalCurrentValue), color: '#8b5cf6' },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          className="form-input text-sm"
          style={{ flex: '1 1 160px', minWidth: 0 }}
          placeholder="Search assets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select text-sm" style={{ flex: '1 1 130px', minWidth: 0 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Active</option><option>Maintenance</option><option>Inactive</option><option>Disposed</option>
        </select>
        <select className="form-select text-sm" style={{ flex: '1 1 150px', minWidth: 0 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {['Machinery','Material Handling','Utilities','IT Equipment','Vehicles','Furniture','Other'].map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
          <button onClick={handleExport} className="btn btn-outline text-sm flex-1 sm:flex-none">⬇ Export Excel</button>
          <button
            onClick={() => { setEditAsset(null); setShowForm(true); }}
            className="flex-1 sm:flex-none"
            style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
          >
            + Add Asset
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="text-2xl font-black tracking-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🏭</div>
            <p className="text-sm font-medium">No assets found.</p>
            <p className="text-xs text-gray-300 mt-1">Add your first asset using the button above.</p>
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'assetId',      label: 'Asset ID',    render: v => <span className="font-semibold text-red-700">{v}</span> },
              { key: 'name',         label: 'Asset Name',  render: v => <span className="font-semibold">{v}</span> },
              { key: 'category',     label: 'Category' },
              { key: 'location',     label: 'Location' },
              { key: 'purchaseValue',label: 'Purchase Value', render: v => <span className="font-bold">{fmt(v)}</span> },
              { key: 'currentValue', label: 'Current Value',  render: v => <span className="font-bold text-green-600">{fmt(v)}</span> },
              { key: 'nextMaintDate',label: 'Next Maintenance', render: v => fmtDate(v) },
              { key: 'status',       label: 'Status',      render: v => <StatusBadge status={v} /> },
              { key: '_id',          label: 'Actions',     render: (_, row) => (
                <div className="flex gap-1.5">
                  <button
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-600 border border-blue-200 font-semibold hover:bg-blue-600 hover:text-white transition-all cursor-pointer font-[inherit]"
                    onClick={() => { setEditAsset(row); setShowForm(true); }}
                  ><MdEdit size={14} /></button>
                  <button
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200 font-semibold hover:bg-red-600 hover:text-white transition-all cursor-pointer font-[inherit]"
                    onClick={() => setDeleteTarget(row)}
                  ><MdDeleteOutline size={14} /></button>
                </div>
              )},
            ]}
            data={assets}
          />
        )}
      </div>

      <AssetFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditAsset(null); }}
        onSave={handleSave}
        editAsset={editAsset}
        saving={saving}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Asset"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.assetId})? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
