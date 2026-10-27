import AssetsPage from './AssetsPage';
const TAB_MAP = { register: 0, maintenance: 1, lifecycle: 2 };
export default function AssetsSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <AssetsPage key={t} initialTab={t} />;
}
