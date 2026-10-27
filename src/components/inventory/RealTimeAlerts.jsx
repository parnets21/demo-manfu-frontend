import { useState, useEffect } from 'react';
import inventoryApi from '../../api/inventoryApi';

export default function RealTimeAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      let response;
      if (filter === 'all') {
        response = await inventoryApi.getAlerts();
      } else if (filter === 'stock') {
        response = await inventoryApi.getStockAlerts();
      } else if (filter === 'capacity') {
        response = await inventoryApi.getCapacityAlerts();
      } else if (filter === 'expiry') {
        response = await inventoryApi.getExpiryAlerts();
      }
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertColor = (type) => {
    const colors = {
      critical: { bg: '#fee2e2', border: '#fecaca', text: '#dc2626', icon: '🔴' },
      warning: { bg: '#fef3c7', border: '#fde68a', text: '#d97706', icon: '🟡' },
      info: { bg: '#dbeafe', border: '#bfdbfe', text: '#2563eb', icon: '🔵' },
    };
    return colors[type] || colors.info;
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await inventoryApi.acknowledgeAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  if (loading) {
    return <div style={{ padding: 16, color: '#94a3b8' }}>Loading alerts...</div>;
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Real-Time Alerts</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
            fontSize: 12, fontFamily: 'inherit',
          }}
        >
          <option value="all">All Alerts</option>
          <option value="stock">Stock Alerts</option>
          <option value="capacity">Capacity Alerts</option>
          <option value="expiry">Expiry Alerts</option>
        </select>
      </div>

      {alerts.length === 0 ? (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8,
          padding: 16, textAlign: 'center', color: '#22c55e', fontSize: 13,
        }}>
          ✓ No active alerts
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map((alert) => {
            const color = getAlertColor(alert.severity);
            return (
              <div
                key={alert.id}
                style={{
                  background: color.bg,
                  border: `1px solid ${color.border}`,
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{color.icon}</span>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: color.text }}>
                      {alert.title}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: color.text }}>
                    {alert.message}
                  </p>
                  {alert.details && (
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, color: color.text, opacity: 0.8 }}>
                      {alert.details}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, background: 'transparent',
                    border: `1px solid ${color.text}`, color: color.text,
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    marginLeft: 12, whiteSpace: 'nowrap',
                  }}
                >
                  Acknowledge
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
