import KanbanTab from './components/KanbanTab';
import DailyTodoTab from './components/DailyTodoTab';
import RecurringTab from './components/RecurringTab';
import NotificationsTab from './components/NotificationsTab';

export default function TasksPage({ initialTab = 0 }) {
  return (
    <div>
      {initialTab === 0 && <KanbanTab />}
      {initialTab === 1 && <DailyTodoTab />}
      {initialTab === 2 && <RecurringTab />}
      {initialTab === 3 && <NotificationsTab />}
    </div>
  );
}
