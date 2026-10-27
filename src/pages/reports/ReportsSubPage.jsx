import ReportsPage from './ReportsPage';
const TAB_MAP = { sales: 0, pl: 1, turnover: 2, stock: 3, purchase: 4, production: 5, returns: 6 };
export default function ReportsSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <ReportsPage key={t} initialTab={t} />;
}
