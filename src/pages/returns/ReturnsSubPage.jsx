import ReturnsPage from './ReturnsPage';

const TAB_MAP = {
  dashboard:      0,
  requests:       1,
  approval:       2,
  transport:      3,
  warehouse:      4,
  qc:             5,
  debitcredit:    6,
  reconciliation: 7,
  loss:           8,
};

export default function ReturnsSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0;
  return <ReturnsPage key={t} initialTab={t} />;
}
