import TasksPage from './TasksPage';
const TAB_MAP = { kanban: 0, todo: 1, recurring: 2, notifs: 3 };
export default function TasksSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <TasksPage key={t} initialTab={t} />;
}
