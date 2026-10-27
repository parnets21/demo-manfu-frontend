import ForecastingPage from './ForecastingPage';
const TAB_MAP = { demand: 0, planning: 1, inventory: 2, seasonal: 3 };
export default function ForecastingSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <ForecastingPage key={t} initialTab={t} />;
}
