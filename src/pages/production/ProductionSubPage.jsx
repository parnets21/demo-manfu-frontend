import ProductionPage from './ProductionPage';

// Tab index map — sidebar shows: bom(0), workorders(1), mrp(2), qc(3), wastage(4)
// Secondary tabs still accessible via direct URL
const TAB_MAP = {
  bom:        0,
  workorders: 1,
  mrp:        2,
  qc:         3,
  wastage:    4,
  // secondary (not in sidebar but URL still works)
  wip:        5,
  tracking:   6,
  planning:   7,
  scheduling: 8,
  efficiency: 9,
};

export default function ProductionSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0;
  return <ProductionPage key={t} initialTab={t} />;
}
