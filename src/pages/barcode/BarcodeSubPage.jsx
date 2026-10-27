import BarcodePage from './BarcodePage';
const TAB_MAP = { generate: 0, scan: 1, logs: 2 };
export default function BarcodeSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <BarcodePage key={t} initialTab={t} />;
}
