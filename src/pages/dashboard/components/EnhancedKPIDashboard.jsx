import { useState, useEffect } from 'react';
import { MdShoppingCart, MdWarning, MdTrendingUp, MdCheckCircle, MdHourglassEmpty, MdLocalShipping, MdInventory2, MdBuild } from 'react-icons/md';

export default function EnhancedKPIDashboard() {
  const [kpis, setKpis] = useState({
    pendingPOs: 12,
    stockVariance: 8,
    overdueNotes: 3,
    productionEfficiency: 87,
    logisticsPendency: 5,
    financeReconciliation: 94,
    inventoryAccuracy: 96,
    defectiveStock: 2
  });

  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', title: 'Stock Variance Alert', message: '8 items have stock mismatches', priority: 'high' },
    { id: 2, type: 'error', title: 'Overdue Credit Notes', message: '3 credit notes are overdue', priority: 'critical' },
    { id: 3, type: 'info', title: 'Production Update', message: 'WO001 completed ahead of schedule', priority: 'low' },
    { id: 4, type: 'warning', title: 'Logistics Pending', message: '5 deliveries pending POD capture', priority: 'medium' }
  ]);

  const kpiCards = [
    {
      label: 'Pending POs',
      value: kpis.pendingPOs,
      icon: <MdShoppingCart size={20} />,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      trend: 'up',
      trendValue: '+2'
    },
    {
      label: 'Stock Variance',
      value: kpis.stockVariance,
      icon: <MdWarning size={20} />,
      color: '#dc2626',
      bgColor: '#fee2e2',
      trend: 'down',
      trendValue: '-1'
    },
    {
      label: 'Overdue Credit Notes',
      value: kpis.overdueNotes,
      icon: <MdHourglassEmpty size={20} />,
      color: '#dc2626',
      bgColor: '#fee2e2',
      trend: 'up',
      trendValue: '+1'
    },
    {
      label: 'Production Efficiency',
      value: `${kpis.productionEfficiency}%`,
      icon: <MdBuild size={20} />,
      color: '#16a34a',
      bgColor: '#dcfce7',
      trend: 'up',
      trendValue: '+3%'
    },
    {
      label: 'Logistics Pendency',
      value: kpis.logisticsPendency,
      icon: <MdLocalShipping size={20} />,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      trend: 'down',
      trendValue: '-2'
    },
    {
      label: 'Finance Reconciliation',
      value: `${kpis.financeReconciliation}%`,
      icon: <MdCheckCircle size={20} />,
      color: '#16a34a',
      bgColor: '#dcfce7',
      trend: 'up',
      trendValue: '+2%'
    },
    {
      label: 'Inventory Accuracy',
      value: `${kpis.inventoryAccuracy}%`,
      icon: <MdInventory2 size={20} />,
      color: '#2563eb',
      bgColor: '#dbeafe',
      trend: 'up',
      trendValue: '+1%'
    },
    {
      label: 'Defective Stock',
      value: kpis.defectiveStock,
      icon: <MdWarning size={20} />,
      color: '#8b5cf6',
      bgColor: '#f3e8ff',
      trend: 'down',
      trendValue: '-1'
    }
  ];

  const getAlertColor = (type) => {
    switch (type) {
      case 'error': return { bg: '#fee2e2', border: '#fca5a5', icon: '#dc2626' };
      case 'warning': return { bg: '#fef3c7', border: '#fde047', icon: '#f59e0b' };
      case 'info': return { bg: '#dbeafe', border: '#93c5fd', icon: '#2563eb' };
      default: return { bg: '#f3f4f6', border: '#d1d5db', icon: '#6b7280' };
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* KPI Cards Grid */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Key Performance Indicators</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {kpiCards.map((kpi, idx) => (
            <div key={idx} className="card" style={{ padding: 16, background: kpi.bgColor, border: `1px solid ${kpi.color}20` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div style={{ color: kpi.color }}>{kpi.icon}</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: kpi.trend === 'up' ? '#dc2626' : '#16a34a'
                }}>
                  {kpi.trend === 'up' ? '↑' : '↓'} {kpi.trendValue}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts Section */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Active Alerts & Notifications</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {alerts.map(alert => {
            const colors = getAlertColor(alert.type);
            return (
              <div key={alert.id} style={{
                padding: 12,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                display: 'flex',
                gap: 12,
                alignItems: 'start'
              }}>
                <div style={{ color: colors.icon, marginTop: 2 }}>
                  {alert.type === 'error' && <MdWarning size={18} />}
                  {alert.type === 'warning' && <MdWarning size={18} />}
                  {alert.type === 'info' && <MdCheckCircle size={18} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{alert.message}</div>
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(0,0,0,0.05)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#64748b',
                  whiteSpace: 'nowrap'
                }}>
                  {alert.priority}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <button className="btn btn-outline" style={{ padding: '12px 16px', textAlign: 'center' }}>
            Create PO
          </button>
          <button className="btn btn-outline" style={{ padding: '12px 16px', textAlign: 'center' }}>
            Capture POD
          </button>
          <button className="btn btn-outline" style={{ padding: '12px 16px', textAlign: 'center' }}>
            Sync Inventory
          </button>
          <button className="btn btn-outline" style={{ padding: '12px 16px', textAlign: 'center' }}>
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
}
