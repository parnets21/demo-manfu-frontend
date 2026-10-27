import { useState, useEffect } from 'react';
import { MdSync, MdCheckCircle, MdError, MdWarning, MdRefresh } from 'react-icons/md';

export default function SyncStatus() {
  const [syncData, setSyncData] = useState({
    lastSync: new Date(Date.now() - 5 * 60 * 1000),
    status: 'success',
    pendingItems: 12,
    totalItems: 1250,
    successCount: 1238,
    failedCount: 0,
    syncLogs: [
      { id: 1, timestamp: new Date(Date.now() - 2 * 60 * 1000), status: 'success', message: 'Synced 150 items', duration: '2.3s' },
      { id: 2, timestamp: new Date(Date.now() - 5 * 60 * 1000), status: 'success', message: 'Synced 200 items', duration: '3.1s' },
      { id: 3, timestamp: new Date(Date.now() - 10 * 60 * 1000), status: 'warning', message: 'Synced 180 items with 2 warnings', duration: '2.8s' },
      { id: 4, timestamp: new Date(Date.now() - 15 * 60 * 1000), status: 'success', message: 'Synced 220 items', duration: '3.5s' },
    ]
  });
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSyncData(prev => ({
        ...prev,
        lastSync: new Date(),
        status: 'success',
        pendingItems: 0,
        syncLogs: [
          { id: Date.now(), timestamp: new Date(), status: 'success', message: 'Manual sync completed', duration: '2.1s' },
          ...prev.syncLogs
        ]
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <MdCheckCircle size={20} style={{ color: '#16a34a' }} />;
      case 'error': return <MdError size={20} style={{ color: '#dc2626' }} />;
      case 'warning': return <MdWarning size={20} style={{ color: '#f59e0b' }} />;
      default: return <MdSync size={20} style={{ color: '#3b82f6' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return { bg: '#dcfce7', color: '#166534' };
      case 'error': return { bg: '#fee2e2', color: '#991b1b' };
      case 'warning': return { bg: '#fef3c7', color: '#92400e' };
      default: return { bg: '#dbeafe', color: '#0c4a6e' };
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-IN');
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Sync Status Overview */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Inventory Sync Status</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Real-time inventory synchronization</div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={handleManualSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdRefresh size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>LAST SYNC</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{formatTime(syncData.lastSync)}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{syncData.lastSync.toLocaleTimeString('en-IN')}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {getStatusIcon(syncData.status)}
              <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{syncData.status}</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>PENDING ITEMS</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: syncData.pendingItems > 0 ? '#f59e0b' : '#16a34a' }}>
              {syncData.pendingItems}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>of {syncData.totalItems} items</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>SUCCESS RATE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
              {Math.round((syncData.successCount / syncData.totalItems) * 100)}%
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{syncData.successCount} / {syncData.totalItems}</div>
          </div>
        </div>
      </div>

      {/* Sync Progress Bar */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Sync Progress</div>
          <div style={{ background: '#e2e8f0', borderRadius: 8, height: 8, overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(90deg, #16a34a, #22c55e)',
              height: '100%',
              width: `${(syncData.successCount / syncData.totalItems) * 100}%`,
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
          <span>{syncData.successCount} synced</span>
          <span>{syncData.pendingItems} pending</span>
          <span>{syncData.failedCount} failed</span>
        </div>
      </div>

      {/* Sync Logs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
          Recent Sync Logs
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {syncData.syncLogs.map((log) => {
            const colors = getStatusColor(log.status);
            return (
              <div key={log.id} style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: log.id === syncData.syncLogs[0].id ? '#f0fdf4' : 'transparent'
              }}>
                <div style={{
                  background: colors.bg,
                  color: colors.color,
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  minWidth: 60,
                  textAlign: 'center'
                }}>
                  {log.status}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{log.message}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {log.timestamp.toLocaleTimeString('en-IN')} • {log.duration}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Logs (if any) */}
      {syncData.failedCount > 0 && (
        <div className="card" style={{ padding: 16, background: '#fee2e2', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>
            {syncData.failedCount} Items Failed to Sync
          </div>
          <div style={{ fontSize: 12, color: '#dc2626' }}>
            Check the error logs and retry failed items. Contact support if the issue persists.
          </div>
        </div>
      )}
    </div>
  );
}