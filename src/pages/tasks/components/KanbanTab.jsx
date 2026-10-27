import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import { toast } from '../../../components/common/Toast';
import { taskApi } from '../../../api/taskApi';
import TaskFormModal from './TaskFormModal';
import TaskDetailModal from './TaskDetailModal';

const priorityType = { Urgent: 'danger', High: 'warning', Normal: 'info', Low: 'gray' };
const tagColor = { Inventory: '#3b82f6', Procurement: '#8b5cf6', Production: '#f59e0b', Quality: '#10b981', Finance: '#ef4444', General: '#6b7280' };
const colConfig = [
  { key: 'todo',       label: 'To Do',      color: '#6b7280' },
  { key: 'inProgress', label: 'In Progress', color: '#f59e0b' },
  { key: 'done',       label: 'Done',        color: '#10b981' },
];
const TAGS = ['', 'Procurement', 'Inventory', 'Production', 'Finance', 'Quality', 'General'];
const PRIORITIES = ['', 'Normal', 'High', 'Urgent'];

export default function KanbanTab() {
  const [tasks, setTasks]         = useState({ todo: [], inProgress: [], done: [] });
  const [dragging, setDragging]   = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [editTask, setEditTask]   = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const params = {};
      if (search)         params.search = search;
      if (filterTag)      params.tag = filterTag;
      if (filterPriority) params.priority = filterPriority;
      const res = await taskApi.getAll(params);
      const all = res.data || [];
      setTasks({
        todo:       all.filter(t => t.status === 'todo'),
        inProgress: all.filter(t => t.status === 'inProgress'),
        done:       all.filter(t => t.status === 'done'),
      });
      // Refresh detail if open
      if (detailTask) {
        const updated = all.find(t => t._id === detailTask._id);
        if (updated) setDetailTask(updated);
      }
    } catch (e) { console.error(e); }
  }, [search, filterTag, filterPriority, detailTask?._id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const moveTask = async (taskId, fromCol, toCol) => {
    if (fromCol === toCol) return;
    try {
      await taskApi.updateStatus(taskId, { status: toCol });
      await fetchTasks();
      toast('Moved to ' + (toCol === 'todo' ? 'To Do' : toCol === 'inProgress' ? 'In Progress' : 'Done'));
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleSave = async (form) => {
    if (!form.title) { toast('Task title is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        title:       form.title,
        description: form.description || '',
        priority:    form.priority,
        assignee:    form.assignee || 'Unassigned',
        dueDate:     form.due || undefined,
        tag:         form.tag,
      };
      if (editTask) {
        await taskApi.update(editTask._id, payload);
        toast('Task updated');
      } else {
        await taskApi.create({ ...payload, status: 'todo' });
        toast('Task created');
      }
      setShowForm(false);
      setEditTask(null);
      await fetchTasks();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await taskApi.delete(id);
      await fetchTasks();
      toast('Task deleted');
    } catch (e) { toast(e.message, 'error'); }
  };

  const openEdit = () => {
    setEditTask(detailTask);
    setDetailTask(null);
    setShowForm(true);
  };

  const totalAll = tasks.todo.length + tasks.inProgress.length + tasks.done.length;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          className="form-input text-sm"
          style={{ flex: '1 1 160px', minWidth: 0 }}
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select text-sm" style={{ flex: '1 1 130px', minWidth: 0 }} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="">All Tags</option>
          {TAGS.filter(Boolean).map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="form-select text-sm" style={{ flex: '1 1 130px', minWidth: 0 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map(p => <option key={p}>{p}</option>)}
        </select>
        <div className="w-full sm:w-auto sm:ml-auto">
          <button
            onClick={() => { setEditTask(null); setShowForm(true); }}
            className="w-full sm:w-auto"
            style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-2xl font-black tracking-tight text-gray-800">{totalAll}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">Total Tasks</div>
        </div>
        {colConfig.map(col => (
          <div key={col.key} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-2xl font-black tracking-tight" style={{ color: col.color }}>{tasks[col.key].length}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{col.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {colConfig.map(col => {
          const isDropTarget = dragging && dragging.col !== col.key;
          return (
          <div
            key={col.key}
            className="bg-gray-50 rounded-2xl p-3 border border-gray-200 flex-shrink-0 transition-all"
            style={{
              minWidth: 'min(260px, 80vw)',
              ...(isDropTarget ? { borderColor: col.color, background: col.color + '08' } : {}),
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (dragging) moveTask(dragging.id, dragging.col, col.key); setDragging(null); }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold" style={{ color: col.color }}>{col.label}</span>
              <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: col.color }}>{tasks[col.key].length}</span>
            </div>
            {tasks[col.key].length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No tasks</div>
            )}
            {tasks[col.key].map(task => {
              const isOverdue = task.overdue && task.status !== 'done';
              const isDragging = dragging?.id === task._id;
              return (
                <div
                  key={task._id}
                  className="bg-white rounded-xl p-3.5 mb-2.5 border border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                  style={{
                    ...(isOverdue ? { borderColor: '#fca5a5' } : {}),
                    ...(isDragging ? { opacity: 0.45, transform: 'rotate(2deg) scale(0.97)' } : {}),
                  }}
                  draggable
                  onDragStart={() => setDragging({ id: task._id, col: col.key })}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => setDetailTask(task)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] text-gray-400 font-mono">{task.taskId}</span>
                    <div className="flex items-center gap-1">
                      {isOverdue && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">OVERDUE</span>}
                      <StatusBadge status={task.priority} type={priorityType[task.priority]} />
                    </div>
                  </div>
                  <div className="font-semibold text-[13px] text-gray-800 mb-2 leading-snug">{task.title}</div>
                  {task.description && (
                    <p className="text-[11px] text-gray-400 mb-2 leading-snug line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: (tagColor[task.tag] || '#6b7280') + '20', color: tagColor[task.tag] || '#6b7280' }}>{task.tag}</span>
                    {task.dueDate && <span className={`text-[11px] ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-gradient-to-br from-red-500 to-amber-400">
                        {(task.assignee || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-[11px] text-gray-400">{task.assignee}</span>
                      {(task.comments || []).length > 0 && (
                        <span className="text-[10px] text-gray-400 ml-1">
                          {(task.comments || []).length} comment{(task.comments || []).length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={e => handleDelete(task._id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: 2 }}
                    >x</button>
                  </div>
                  {col.key !== 'done' && (
                    <div className="flex gap-1.5 mt-2">
                      {col.key === 'todo' && (
                        <button
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-amber-100 text-amber-800 font-semibold border-0 cursor-pointer font-[inherit]"
                          onClick={e => { e.stopPropagation(); moveTask(task._id, 'todo', 'inProgress'); }}
                        >Start</button>
                      )}
                      {col.key === 'inProgress' && (
                        <button
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-green-100 text-green-800 font-semibold border-0 cursor-pointer font-[inherit]"
                          onClick={e => { e.stopPropagation(); moveTask(task._id, 'inProgress', 'done'); }}
                        >Complete</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );})}
      </div>

      <TaskFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTask(null); }}
        onSave={handleSave}
        editTask={editTask}
        saving={saving}
      />
      <TaskDetailModal
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onRefresh={fetchTasks}
        onEdit={openEdit}
      />
    </div>
  );
}
