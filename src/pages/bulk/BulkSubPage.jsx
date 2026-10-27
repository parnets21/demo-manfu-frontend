import BulkOrdersPage from './BulkOrdersPage';
const TAB_MAP = { clients: 0, quotations: 1, packaging: 2, delivery: 3 };
export default function BulkSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <BulkOrdersPage key={t} initialTab={t} />;
}
