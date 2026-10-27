import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { creditNoteApi } from '../../api/creditNoteApi';
import { toast } from '../../components/common/Toast';
import { useDataEvent, dataEvents } from '../../utils/dataEvents';

export default function CreditNoteTrackingPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [notes, setNotes]         = useState([]);
  const [stats, setStats]         = useState({ openCount: 0, totalValue: 0, overdue: 0, closed: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ party: '', against: '', amount: '', reason: '' });

  const fetchAll = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([creditNoteApi.getAll(), creditNoteApi.getStats()]);
      setNotes(listRes.data || []);
      setStats(statsRes.data || {});
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useDataEvent('creditnote:changed', fetchAll);

  const handleCreate = async () => {
    if (!form.party || !form.amount) { toast('Party and amount are required', 'error'); return; }
    setSaving(true);
    try {
      await creditNoteApi.create({ ...form, amount: parseFloat(form.amount) });
      setShowCreate(false);
      setForm({ party: '', against: '', amount: '', reason: '' });
      dataEvents.emit('creditnote:changed');
      await fetchAll();
      toast('Credit note created');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleReminder = async (id, cnId) => {
    try {
      await creditNoteApi.sendReminder(id);
      toast(`Reminder logged for ${cnId}`);
      dataEvents.emit('creditnote:changed');
      await fetchAll();
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleClose = async (id) => {
    try {
      await creditNoteApi.updateStatus(id, 'Closed');
      toast('Credit note closed');
      dataEvents.emit('creditnote:changed');
      await fetchAll();
    } catch (e) { toast(e.message, 'error'); }
  };

  const agingBuckets = [
    { label: '0–7 days',  count: notes.filter(c => c.daysOpen <= 7  && c.status === 'Open').length, color: '#10b981' },
    { label: '8–15 days', count: notes.filter(c => c.daysOpen > 7  && c.daysOpen <= 15 && c.status === 'Open').length, color: '#f59e0b' },
    { label: '15+ days',  count: notes.filter(c => c.daysOpen > 15 && c.status === 'Open').length, color: '#ef4444' },
  ];

  const overdue = notes.filter(c => c.daysOpen >= 7 && c.status === 'Open');

  return (
    <div>
      {overdue.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <div className="font-bold text-amber-800 text-sm mb-1">Credit Note Reminders</div>
            <div className="text-xs text-amber-700">{overdue.length} credit note{overdue.length > 1 ? 's' : ''} overdue: {overdue.map(c => c.cnId).join(', ')}</div>
          </div>
        </div>
      )}

      {/* Tab switcher + action button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          {['Open Notes', 'Aging Analysis'].map((label, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
                background: activeTab === idx ? '#fff' : 'transparent',
                color: activeTab === idx ? '#1e40af' : '#64748b',
                boxShadow: activeTab === idx ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
          color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        }}>+ New Credit Note</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-2xl font-black tracking-tight text-red-600">{stats.openCount}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">Open Credit Notes</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-2xl font-black tracking-tight text-amber-500">₹{((stats.totalValue || 0) / 100000).toFixed(1)}L</div>
          <div className="text-xs text-gray-500 font-medium mt-1">Total Open Value</div>
        </div>
        {agingBuckets.map((b, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-2xl font-black tracking-tight" style={{ color: b.color }}>{b.count}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{b.label}</div>
          </div>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3.5">Open Credit Notes</div>
          {notes.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No credit notes yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr>{['CN No.', 'Party', 'Against', 'Amount', 'Days Open', 'Reason', 'Status', 'Action'].map(h => (
                    <th key={h} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {notes.map((cn, i) => (
                    <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors ${cn.daysOpen >= 7 && cn.status === 'Open' ? 'bg-amber-50/40' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 font-semibold text-red-700">{cn.cnId}</td>
                      <td className="px-4 py-3 font-semibold">{cn.party}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{cn.against || '—'}</td>
                      <td className="px-4 py-3 font-bold text-green-600">₹{(cn.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-sm ${cn.daysOpen >= 14 ? 'text-red-500' : cn.daysOpen >= 7 ? 'text-amber-500' : 'text-green-600'}`}>{cn.daysOpen}d</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cn.reason || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={cn.status} type={cn.status === 'Closed' ? 'success' : 'warning'} /></td>
                      <td className="px-4 py-3">
                        <div style={{ display: 'flex', gap: 6 }}>
                          {cn.status === 'Open' && (
                            <>
                              <button onClick={() => handleReminder(cn._id, cn.cnId)} className="px-2 py-1 text-[11px] rounded bg-amber-100 text-amber-800 font-semibold border-0 cursor-pointer font-[inherit]">Remind</button>
                              <button onClick={() => handleClose(cn._id)} className="px-2 py-1 text-[11px] rounded bg-green-100 text-green-800 font-semibold border-0 cursor-pointer font-[inherit]">Close</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {overdue.map((cn, i) => (
            <div key={i} className="mt-3 p-3.5 bg-red-50 rounded-lg border border-red-200">
              <div className="font-bold text-sm text-red-800 mb-1">⚠ Overdue — {cn.cnId} ({cn.party})</div>
              <div className="text-xs text-red-700">{cn.daysOpen} days open · ₹{(cn.amount || 0).toLocaleString('en-IN')} · {cn.reason}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-4">Aging Buckets</div>
          {agingBuckets.map((b, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold" style={{ color: b.color }}>{b.label}</span>
                <span className="font-bold">{b.count} notes</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${notes.length ? (b.count / notes.length) * 100 : 0}%`, background: b.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Credit Note"
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          {[['Party *', 'party', 'text', 'Party name'], ['Against (MR/Return ID)', 'against', 'text', 'MR-001'], ['Amount (₹) *', 'amount', 'number', '0'], ['Reason', 'reason', 'text', 'Material return, quality rejection...']].map(([label, key, type, ph]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">{label}</label>
              <input type={type} className="form-input" placeholder={ph} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
