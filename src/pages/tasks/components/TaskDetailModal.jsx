import { useState } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import { toast } from '../../../components/common/Toast';
import { taskApi } from '../../../api/taskApi';

const priorityType = { Urgent: 'danger', High: 'warning', Normal: 'info', Low: 'gray' };
const tagColor = { Inventory: '#3b82f6', Procurement: '#8b5cf6', Production: '#f59e0b', Quality: '#10b981', Finance: '#ef4444', General: '#6b7280' };

export default function TaskDetailModal({ task, onClose, onRefresh, onEdit }) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!task) return null;

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await taskApi.addComment(task._id, { text: comment.trim(), author: 'You' });
      setComment('');
      await onRefresh();
      toast('Comment added');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await taskApi.deleteComment(task._id, commentId);
      await onRefresh();
      toast('Comment removed');
    } catch (e) { toast(e.message, 'error'); }
  };

  const tagC = tagColor[task.tag] || '#6b7280';
  const isOverdue = task.overdue && task.status !== 'done';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-gray-400 font-mono">{task.taskId}</span>
              <StatusBadge status={task.priority} type={priorityType[task.priority]} />
              {isOverdue && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">OVERDUE</span>
              )}
            </div>
            <h2 className="text-base font-black text-gray-900 leading-snug">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-semibold border-0 cursor-pointer font-[inherit] hover:bg-gray-200"
            >
              Edit
            </button>
            <button className="text-gray-400 text-xl border-0 bg-transparent cursor-pointer" onClick={onClose}>x</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Status</div>
              <div className="text-sm font-bold text-gray-700 capitalize">
                {task.status === 'inProgress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : 'Done'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Assignee</div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold bg-gradient-to-br from-red-500 to-amber-400">
                  {(task.assignee || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span className="text-sm font-semibold text-gray-700">{task.assignee || 'Unassigned'}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Tag</div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: tagC + '20', color: tagC }}>{task.tag}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Due Date</div>
              <div className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : 'No due date'}
              </div>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Description</div>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Comments */}
          <div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">
              Comments ({(task.comments || []).length})
            </div>
            {(task.comments || []).length === 0 && (
              <p className="text-xs text-gray-400 italic">No comments yet.</p>
            )}
            <div className="space-y-2 mb-3">
              {(task.comments || []).map(c => (
                <div key={c._id} className="bg-gray-50 rounded-xl p-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-gray-700">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    <p className="text-xs text-gray-600">{c.text}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(c._id)}
                    className="text-gray-300 hover:text-red-400 text-sm border-0 bg-transparent cursor-pointer flex-shrink-0"
                  >x</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="form-input flex-1 text-sm"
                placeholder="Add a comment..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              />
              <button
                onClick={handleAddComment}
                disabled={submitting || !comment.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white border-0 cursor-pointer font-[inherit]"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#1e40af)', opacity: (!comment.trim() || submitting) ? 0.5 : 1 }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
