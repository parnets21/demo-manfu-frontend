import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import { toast } from '../../../components/common/Toast';
import { assetApi } from '../../../api/assetApi';
import MaintenanceModal from './MaintenanceModal';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

// Build calendar maintenance days from assets
function getMaintenanceDays(assets) {
  const now = new Date();
  const days = {};
  assets.forEach(a => {
    if (a.nextMaintDate) {
      const d = new Date(a.nextMaintDate);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        days[d.getDate()] = days[d.getDate()] || [];
        days[d.getDate()].push(a.name);
      }
    }
    (a.maintenanceLogs || []).forEach(log => {
      if (log.date) {
        const ld = new Date(log.date);
        if (ld.getMonth() === now.getMonth() && ld.getFullYear() === now.getFullYear()) {
          days[ld.getDate()] = days[ld.getDate()] || [];
          days[ld.getDate()].push(a.name);
        }
      }
    });
  });
  return days;
}

export default function MaintenanceTab() {
  const [assets, setAssets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assetApi.getAll();
      setAssets(res.data || []);
    } catch (e) { /* API not yet deployed — silently show empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleSchedule = async (form) => {
    if (!selectedAsset) return;
    setSaving(true);
    try {
      await assetApi.addMaintenance(selectedAsset._id, {
        type:          form.type,
        technician:    form.technician,
        description:   form.description,
        cost:          form.cost ? Number(form.cost) : 0,
        date:          form.date || undefined,
        status:        form.status,
        nextMaintDate: form.nextMaintDate || undefined,
      });
      setShowModal(false);
      setSelectedAsset(null);
      await fetchAssets();
      toast('Maintenance scheduled');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const openScheduleForAsset = (asset) => {
    setSelectedAsset(asset);
    setShowPicker(false);
    setShowModal(true);
  };

  const now = new Date();
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const maintDays = getMaintenanceDays(assets);
  const today = now.getDate();

  // Upcoming maintenance (next 30 days)
  const upcoming = assets
    .filter(a => a.nextMaintDate)
    .map(a => ({ ...a, nextMaintDate: new Date(a.nextMaintDate) }))
    .filter(a => a.nextMaintDate >= now)
    .sort((a, b) => a.nextMaintDate - b.nextMaintDate)
    .slice(0, 10);

  // All maintenance logs flattened
  const allLogs = assets.flatMap(a =>
    (a.maintenanceLogs || []).map(log => ({ ...log, assetName: a.name, assetId: a.assetId }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-black text-gray-900">Maintenance Calendar</h2>
        <button
          onClick={() => assets.length === 0 ? toast('Add assets first', 'error') : setShowPicker(true)}
          className="w-full sm:w-auto"
          style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
        >
          + Schedule Maintenance
        </button>
      </div>

      {/* Asset picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm" onClick={() => setShowPicker(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <span className="text-base font-black text-gray-900">Select Asset</span>
              <button className="text-gray-400 text-xl border-0 bg-transparent cursor-pointer" onClick={() => setShowPicker(false)}>×</button>
            </div>
            <div className="px-4 py-3 max-h-80 overflow-y-auto">
              {assets.filter(a => a.status !== 'Disposed').map(a => (
                <button
                  key={a._id}
                  onClick={() => openScheduleForAsset(a)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 border-0 bg-transparent cursor-pointer font-[inherit] mb-1 transition-colors"
                >
                  <div className="font-semibold text-sm text-gray-800">{a.name}</div>
                  <div className="text-xs text-gray-400">{a.assetId} · {a.category} · {a.location}</div>
                </button>
              ))}
              {assets.filter(a => a.status !== 'Disposed').length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No active assets found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-4">{monthName}</div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
              <div
                key={d}
                title={maintDays[d] ? maintDays[d].join(', ') : undefined}
                className={`text-center px-0.5 py-1.5 rounded-md text-xs cursor-default
                  ${d === today ? 'bg-red-700 text-white font-bold' : maintDays[d] ? 'bg-amber-400 text-white font-bold cursor-pointer' : 'text-gray-800'}`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3 text-[11px]">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Maintenance</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-700" /> Today</div>
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3.5">Upcoming Maintenance</div>
          {loading && <div className="text-xs text-gray-400 py-4 text-center">Loading...</div>}
          {!loading && upcoming.length === 0 && (
            <div className="text-xs text-gray-400 py-4 text-center">No upcoming maintenance scheduled.</div>
          )}
          {upcoming.map((a, i) => (
            <div key={a._id} className={`flex items-center gap-3 py-2.5 ${i < upcoming.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex flex-col items-center justify-center flex-shrink-0">
                <div className="text-sm font-extrabold text-red-700">{a.nextMaintDate.getDate()}</div>
                <div className="text-[9px] text-gray-400">{a.nextMaintDate.toLocaleString('en-IN', { month: 'short' }).toUpperCase()}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] text-gray-800 truncate">{a.name}</div>
                <div className="text-[11px] text-gray-400">{a.assetId} · {a.location}</div>
              </div>
              <button
                onClick={() => { setSelectedAsset(a); setShowModal(true); }}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold cursor-pointer font-[inherit] hover:bg-amber-100"
              >
                Log
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance history */}
      {allLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3.5">Maintenance History</div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full">
              <thead>
                <tr>
                  {['Date','Asset','Type','Technician','Cost','Status'].map(h => (
                    <th key={h} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLogs.map((log, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(log.date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-gray-800">{log.assetName}</div>
                      <div className="text-[11px] text-gray-400">{log.assetId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.technician || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{log.cost ? `₹${Number(log.cost).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MaintenanceModal
        open={showModal}
        onClose={() => { setShowModal(false); setSelectedAsset(null); }}
        onSave={handleSchedule}
        saving={saving}
        assetName={selectedAsset?.name}
      />
    </div>
  );
}
