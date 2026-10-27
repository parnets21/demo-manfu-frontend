import { useState, useCallback, useEffect } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import DealersTab from './components/DealersTab';
import { dealerApi } from '../../api/dealerApi';
import { useDataEvent } from '../../utils/dataEvents';
import { MdPerson, MdCheckCircle, MdWarning } from 'react-icons/md';

export default function DealersPage() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await dealerApi.getAll({});
      const list = res.data || [];
      setStats({
        total:    list.length,
        active:   list.filter(d => d.isActive).length,
        inactive: list.filter(d => !d.isActive).length,
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useDataEvent('dealer:changed', fetchStats);

  const kpis = [
    { label: 'Total Dealers', value: stats.total,    icon: <MdPerson size={18} />,       color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Active',        value: stats.active,   icon: <MdCheckCircle size={18} />,  color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    { label: 'Inactive',      value: stats.inactive, icon: <MdWarning size={18} />,      color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
  ];

  return (
    <div>
      <PageHeader
        title="Dealer Management"
        breadcrumb="Procurement › Dealers"
      />
      <KpiStrip kpis={kpis} />
      <PageCard>
        <DealersTab onStatsChange={fetchStats} />
      </PageCard>
    </div>
  );
}
