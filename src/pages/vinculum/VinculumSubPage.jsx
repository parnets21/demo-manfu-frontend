import VinculumPage from './VinculumPage';
const TAB_MAP = { config: 0, logs: 1, sku: 2, sync: 3 };
export default function VinculumSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <VinculumPage key={t} initialTab={t} />;
}
