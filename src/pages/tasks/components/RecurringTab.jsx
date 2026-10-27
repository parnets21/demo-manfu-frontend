import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../../components/common/Toast';
import { taskApi } from '../../../api/taskApi';

const FREQUENCIES = ['daily', 'weekly', 'monthly'];
const TAGS = ['Procurement', 'Inventory', 'Production', 'Finance', 'Quality', 'General'];
const PRIORITIES = ['Normal', 'High', 'Urgent'];
const EMPTY_FORM = { title: '', description: '', priority: 'Normal', assignee: '', tag: 'General', frequency: 'daily', time: '' };

const freqColor = { daily: '#3b82f6', weekly: '#8b5cf6', monthly: '#f59e0b' };
const freqBg    = { daily: '#eff6ff', weekly: '#f5f3ff', monthly: '#fffbeb' };

export default function RecurringTab() {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [filterFreq, setFilterFreq] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      const params = { isRecurring: 'true' };
      if (filterFreq) params.frequency = filterFreq;
      const res = await taskApi.getAll(params);
      setTemplates(res.data || []);
    } catch (e) { console.error(e); }
  }, [filterFreq]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast('Title is required', 'error'); return; }
    if (!form.frequency)    { toast('Frequency is required', 'error'); return; }
    setSaving(true);
    try {
      await taskApi.create({
        title:       form.title,
        description: form.description,
        priority:    form.priority,
        assignee:    form.assignee || 'Unassigned',
        tag:         form.tag,
        isRecurring: true,
        frequency:   form.frequency,
        time:        form.time,
        status:      'todo',
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchTemplates();
      toast('Recurring template created');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await taskApi.delete(id);
      await fetchTemplates();
      toast('Template removed');
    } catch (e) { toast(e.message, 'error'); }
  };

  const grouped = FREQUENCIES.reduce((acc, f) => {
    acc[f] = templates.filter(t => t.frequency === f);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-900">Recurring Templates</h2>
          <p className="text-xs text-gray-400 mt-0.5">Define tasks that repeat on a schedule</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
        >
          {showForm ? 'Cancel' : '+ New Template'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">New Recurring Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-gray-600">Task Title *</label>
              <input className="form-input" placeholder="e.g. Daily stock count" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <input className="form-input" placeholder="Optional instructions..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Frequency *</label>
              <select className="form-select" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Time (optional)</label>
              <input type="time" className="form-input" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Tag</label>
              <select className="form-select" value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))}>
                {TAGS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Assignee</label>
              <input className="form-input" placeholder="Name" value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button className="btn btn-outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Template'}</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {[['', 'All', templates.length], ...FREQUENCIES.map(f => [f, f.charAt(0).toUpperCase() + f.slice(1), grouped[f].length])].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilterFreq(key)}
            className="px-4 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer font-[inherit] transition-all"
            style={{ background: filterFreq === key ? '#1c2833' : '#f1f5f9', color: filterFreq === key ? '#fff' : '#64748b' }}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {templates.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🔄</div>
          <p className="text-sm font-medium">No recurring templates yet. Create one above.</p>
        </div>
      )}

      {(filterFreq ? [filterFreq] : FREQUENCIES).map(freq => {
        const items = grouped[freq];
        if (!items.length) return null;
        const fc = freqColor[freq];
        const fb = freqBg[freq];
        return (
          <div key={freq} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: fb, color: fc }}>
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </span>
              <span className="text-xs text-gray-400">{items.length} template{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(task => (
                <div key={task._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: fb, color: fc }}>
                          {freq}
                        </span>
                        {task.time && <span className="text-[10px] text-gray-400">{task.time}</span>}
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 leading-snug">{task.title}</h4>
                    </div>
                    <button
                      onClick={() => handleDelete(task._id)}
                      className="text-gray-300 hover:text-red-400 text-lg border-0 bg-transparent cursor-pointer flex-shrink-0"
                    >x</button>
                  </div>
                  {task.description && <p className="text-xs text-gray-400 mb-2">{task.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-500">{task.tag}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold bg-gradient-to-br from-red-500 to-amber-400">
                        {(task.assignee || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-[11px] text-gray-400">{task.assignee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
