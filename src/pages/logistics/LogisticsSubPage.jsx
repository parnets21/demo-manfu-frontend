import LogisticsPage from './LogisticsPage';
const TAB_MAP = { dispatch: 0, vehicles: 1, tracking: 2, dc: 3, pendency: 4, courier: 5, docket: 6 };
export default function LogisticsSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <LogisticsPage key={t} initialTab={t} />;
}
