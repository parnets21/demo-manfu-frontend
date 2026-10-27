import { useState, useEffect } from 'react';

const TAGS = ['Procurement', 'Inventory', 'Production', 'Finance', 'Quality', 'General'];
const PRIORITIES = ['Normal', 'High', 'Urgent'];
const EMPTY_FORM = { title: '', description: '', priority: 'Normal', assignee: '', due: '', tag: 'Procurement' };

export default function TaskFormModal({ open, onClose, onSave, editTask, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editTask) {
      setForm({
        title:       editTask.title || '',
        description: editTask.description || '',
        priority:    editTask.priority || 'Normal',
        assignee:    editTask.assignee || '',
        due:         editTask.dueDate ? editTask.dueDate.slice(0, 10) : '',
        tag:         editTask.tag || 'Procurement',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editTask, open]);

  if (!open) return null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-base font-black text-gray-900">{editTask ? 'Edit Task' : 'Create New Task'}</span>
          <button className="text-gray-400 text-xl border-0 bg-transparent cursor-pointer" onClick={onClose}>x</button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-semibold text-gray-600">Task Title *</label>
            <input className="form-input" placeholder="Enter task title" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-semibold text-gray-600">Description</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Optional details..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={{ resize: 'vertical', minHeight: 56 }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Assignee</label>
            <input className="form-input" placeholder="Name" value={form.assignee} onChange={e => set('assignee', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Priority</label>
            <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Due Date</label>
            <input type="date" className="form-input" value={form.due} onChange={e => set('due', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Tag</label>
            <select className="form-select" value={form.tag} onChange={e => set('tag', e.target.value)}>
              {TAGS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2.5 justify-end">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving}>
            {saving ? (editTask ? 'Saving...' : 'Creating...') : (editTask ? 'Save Changes' : 'Create Task')}
          </button>
        </div>
      </div>
    </div>
  );
}
