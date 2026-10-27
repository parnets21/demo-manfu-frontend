import { useState, useEffect, useCallback } from 'react';
import { taskApi } from '../../../api/taskApi';

const tagColor = { Inventory: '#3b82f6', Procurement: '#8b5cf6', Production: '#f59e0b', Quality: '#10b981', Finance: '#ef4444', General: '#6b7280' };

function NotifCard({ icon, color, bg, title, subtitle, badge, badgeColor, badgeBg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: bg, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-800">{title}</span>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: badgeBg, color: badgeColor }}>{badge}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function NotificationsTab() {
  const [allTasks, setAllTasks] = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      const res = await taskApi.getAll();
      setAllTasks(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const in3Days  = new Date(today); in3Days.setDate(in3Days.getDate() + 3);

  const overdue    = allTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < today);
  const dueToday   = allTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow);
  const dueSoon    = allTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) >= tomorrow && new Date(t.dueDate) <= in3Days);
  const unassigned = allTasks.filter(t => t.status !== 'done' && (!t.assignee || t.assignee === 'Unassigned'));
  const urgent     = allTasks.filter(t => t.status !== 'done' && t.priority === 'Urgent');
  const recentDone = allTasks.filter(t => t.status === 'done').slice(0, 5);

  const totalAlerts = overdue.length + dueToday.length + urgent.length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-900">Task Notifications</h2>
          <p className="text-xs text-gray-400 mt-0.5">Alerts and activity across all tasks</p>
        </div>
        {totalAlerts > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100">
            <span className="text-red-500 text-sm">!</span>
            <span className="text-xs font-bold text-red-600">{totalAlerts} alert{totalAlerts !== 1 ? 's' : ''} need attention</span>
          </div>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Overdue',    count: overdue.length,    color: '#ef4444', bg: '#fef2f2' },
          { label: 'Due Today',  count: dueToday.length,   color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Due in 3d',  count: dueSoon.length,    color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Urgent',     count: urgent.length,     color: '#8b5cf6', bg: '#f5f3ff' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-center">
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.count}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Overdue ({overdue.length})</h3>
          <div className="space-y-2">
            {overdue.map(t => (
              <NotifCard
                key={t._id}
                icon="!"
                color="#ef4444"
                bg="#fef2f2"
                title={t.title}
                subtitle={`${t.taskId} · Assigned to ${t.assignee} · Due ${new Date(t.dueDate).toLocaleDateString('en-IN')}`}
                badge="OVERDUE"
                badgeColor="#ef4444"
                badgeBg="#fef2f2"
              />
            ))}
          </div>
        </div>
      )}

      {/* Due today */}
      {dueToday.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Due Today ({dueToday.length})</h3>
          <div className="space-y-2">
            {dueToday.map(t => (
              <NotifCard
                key={t._id}
                icon="⏰"
                color="#f59e0b"
                bg="#fffbeb"
                title={t.title}
                subtitle={`${t.taskId} · ${t.tag} · Assigned to ${t.assignee}`}
                badge="TODAY"
                badgeColor="#f59e0b"
                badgeBg="#fffbeb"
              />
            ))}
          </div>
        </div>
      )}

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Due in 3 Days ({dueSoon.length})</h3>
          <div className="space-y-2">
            {dueSoon.map(t => (
              <NotifCard
                key={t._id}
                icon="📅"
                color="#3b82f6"
                bg="#eff6ff"
                title={t.title}
                subtitle={`${t.taskId} · Due ${new Date(t.dueDate).toLocaleDateString('en-IN')} · ${t.assignee}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Urgent */}
      {urgent.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-2">Urgent Priority ({urgent.length})</h3>
          <div className="space-y-2">
            {urgent.map(t => (
              <NotifCard
                key={t._id}
                icon="🔴"
                color="#8b5cf6"
                bg="#f5f3ff"
                title={t.title}
                subtitle={`${t.taskId} · ${t.tag} · ${t.status === 'todo' ? 'Not started' : 'In progress'}`}
                badge="URGENT"
                badgeColor="#8b5cf6"
                badgeBg="#f5f3ff"
              />
            ))}
          </div>
        </div>
      )}

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Unassigned Tasks ({unassigned.length})</h3>
          <div className="space-y-2">
            {unassigned.map(t => (
              <NotifCard
                key={t._id}
                icon="👤"
                color="#6b7280"
                bg="#f9fafb"
                title={t.title}
                subtitle={`${t.taskId} · ${t.tag} · ${t.priority} priority`}
                badge="UNASSIGNED"
                badgeColor="#6b7280"
                badgeBg="#f1f5f9"
              />
            ))}
          </div>
        </div>
      )}

      {/* Recently completed */}
      {recentDone.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">Recently Completed</h3>
          <div className="space-y-2">
            {recentDone.map(t => (
              <NotifCard
                key={t._id}
                icon="✓"
                color="#10b981"
                bg="#f0fdf4"
                title={t.title}
                subtitle={`${t.taskId} · ${t.tag} · Completed`}
                badge="DONE"
                badgeColor="#10b981"
                badgeBg="#f0fdf4"
              />
            ))}
          </div>
        </div>
      )}

      {totalAlerts === 0 && overdue.length === 0 && dueToday.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sm font-medium">All clear! No urgent notifications.</p>
        </div>
      )}
    </div>
  );
}
