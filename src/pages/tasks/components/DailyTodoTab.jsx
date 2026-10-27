import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../../components/common/Toast';
import { taskApi } from '../../../api/taskApi';

const PRIORITIES = ['Normal', 'High', 'Urgent'];
const TAGS = ['Procurement', 'Inventory', 'Production', 'Finance', 'Quality', 'General'];
const EMPTY_FORM = { title: '', description: '', priority: 'Normal', assignee: '', due: '', tag: 'General' };

const priorityColor = { Urgent: '#ef4444', High: '#f59e0b', Normal: '#3b82f6', Low: '#6b7280' };
const priorityBg    = { Urgent: '#fef2f2', High: '#fffbeb', Normal: '#eff6ff', Low: '#f9fafb' };

export default function DailyTodoTab() {
  const [tasks, setTasks]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState('all'); // all | pending | done

  const fetchTasks = useCallback(async () => {
    try {
      const res = await taskApi.getAll({ isDailyTodo: 'true' });
      setTasks(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      await taskApi.create({
        title:       form.title,
        description: form.description,
        priority:    form.priority,
        assignee:    form.assignee || 'Unassigned',
        dueDate:     form.due || undefined,
        tag:         form.tag,
        isDailyTodo: true,
        status:      'todo',
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchTasks();
      toast('To-do added');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const toggleDone = async (task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await taskApi.updateStatus(task._id, { status: newStatus });
      await fetchTasks();
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await taskApi.delete(id);
      await fetchTasks();
      toast('Removed');
    } catch (e) { toast(e.message, 'error'); }
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const doneTasks    = tasks.filter(t => t.status === 'done');
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const progress     = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const displayed = filter === 'done' ? doneTasks : filter === 'pending' ? pendingTasks : tasks;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-900">Daily To-Do</h2>
          <p className="text-xs text-gray-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
        >
          {showForm ? 'Cancel' : '+ Add To-Do'}
        </button>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">Today's Progress</span>
            <span className="text-sm font-black text-gray-900">{doneTasks.length}/{tasks.length} done</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: progress === 100 ? '#10b981' : 'linear-gradient(90deg,#ef4444,#f59e0b)' }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1.5 text-right">{progress}% complete</div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">New To-Do Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-gray-600">Title *</label>
              <input className="form-input" placeholder="What needs to be done?" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <input className="form-input" placeholder="Optional notes..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Due Time / Date</label>
              <input type="date" className="form-input" value={form.due} onChange={e => setForm(p => ({ ...p, due: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button className="btn btn-outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Adding...' : 'Add To-Do'}</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[['all', 'All', tasks.length], ['pending', 'Pending', pendingTasks.length], ['done', 'Done', doneTasks.length]].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-4 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer font-[inherit] transition-all"
            style={{
              background: filter === key ? '#1c2833' : '#f1f5f9',
              color: filter === key ? '#fff' : '#64748b',
            }}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Task list */}
      {displayed.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">✓</div>
          <p className="text-sm font-medium">{filter === 'done' ? 'No completed tasks yet' : filter === 'pending' ? 'All done for today!' : 'No to-dos yet. Add one above.'}</p>
        </div>
      )}
      <div className="space-y-2">
        {displayed.map(task => {
          const isDone = task.status === 'done';
          const pc = priorityColor[task.priority] || '#6b7280';
          const pb = priorityBg[task.priority] || '#f9fafb';
          return (
            <div
              key={task._id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-all"
              style={isDone ? { opacity: 0.65 } : {}}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleDone(task)}
                className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all"
                style={{
                  borderColor: isDone ? '#10b981' : '#d1d5db',
                  background: isDone ? '#10b981' : 'transparent',
                }}
              >
                {isDone && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold text-gray-800 ${isDone ? 'line-through text-gray-400' : ''}`}>{task.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: pb, color: pc }}>{task.priority}</span>
                </div>
                {task.description && <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-[11px] text-gray-400">{task.tag}</span>
                  {task.assignee && task.assignee !== 'Unassigned' && (
                    <span className="text-[11px] text-gray-400">Assigned: {task.assignee}</span>
                  )}
                  {task.dueDate && (
                    <span className={`text-[11px] ${task.overdue && !isDone ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(task._id)}
                className="flex-shrink-0 text-gray-300 hover:text-red-400 text-lg border-0 bg-transparent cursor-pointer"
              >x</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
