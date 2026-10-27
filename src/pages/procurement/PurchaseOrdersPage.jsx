import { useState, useEffect, useCallback } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import PurchaseOrdersTab from './components/PurchaseOrdersTab';
import { poApi } from '../../api/poApi';
import { MdShoppingCart, MdHourglassEmpty, MdCheckCircle, MdLocalShipping, MdAdd } from 'react-icons/md';
import { useDataEvent } from '../../utils/dataEvents';


export default function PurchaseOrdersPage() {
  const [showPOModal, setShowPOModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, totalValue: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await poApi.getAll();
      const list = res.data || [];
      const totalValue = list.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
      setStats({
        total:      list.length,
        pending:    list.filter(p => p.status === 'Pending').length,
        approved:   list.filter(p => p.status === 'Approved').length,
        totalValue,
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useDataEvent('po:changed', fetchStats);

  const fmt = (n) => n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : `₹${n.toLocaleString('en-IN')}`;

  const kpis = [
    { label: 'Total POs',   value: stats.total,          icon: <MdShoppingCart size={18} />,   color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Pending',     value: stats.pending,        icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
    { label: 'Approved',    value: stats.approved,       icon: <MdCheckCircle size={18} />,    color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    { label: 'Total Value', value: fmt(stats.totalValue), icon: <MdLocalShipping size={18} />,  color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)' },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        breadcrumb="Procurement › PO Management"
        action={
          <button onClick={() => setShowPOModal(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
          }}>
            <MdAdd size={16} /> Create PO
          </button>
        }
      />

      <KpiStrip kpis={kpis} />

      <PageCard noPad>
        <div style={{ padding: '20px' }}>
          <PurchaseOrdersTab
            showPOModal={showPOModal}
            setShowPOModal={setShowPOModal}
            onSaved={fetchStats}
          />
        </div>
      </PageCard>
    </div>
  );
}
