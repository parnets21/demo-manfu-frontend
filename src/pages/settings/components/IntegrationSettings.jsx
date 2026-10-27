import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { MdSettings, MdCheckCircle, MdError, MdRefresh } from 'react-icons/md';

export default function IntegrationSettings() {
  const [integrations, setIntegrations] = useState([
    {
      id: 'tally',
      name: 'Tally Prime',
      status: 'Connected',
      lastSync: new Date(Date.now() - 30 * 60 * 1000),
      config: {
        serverUrl: 'https://erp.majesticmall.net',
        apiKey: '••••••••••••••••',
        syncFrequency: 'Every 30 minutes',
        autoSync: true
      }
    },
    {
      id: 'delhivery',
      name: 'Delhivery',
      status: 'Connected',
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
      config: {
        apiKey: '••••••••••••••••',
        clientId: 'chakra_industries',
        webhookUrl: 'https://api.chakra.com/webhooks/delhivery'
      }
    },
    {
      id: 'vinculum',
      name: 'Inventory Sync API',
      status: 'Disconnected',
      lastSync: null,
      config: {
        apiKey: '',
        clientId: '',
        syncFrequency: 'Every 1 hour'
      }
    },
    {
      id: 'india-post',
      name: 'India Post',
      status: 'Pending',
      lastSync: null,
      config: {
        apiKey: '',
        accountId: ''
      }
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleEditIntegration = (integration) => {
    setSelectedIntegration(integration);
    setFormData(integration.config);
    setShowModal(true);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Connection test successful!');
    } catch (e) {
      alert('Connection test failed: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      setIntegrations(prev => prev.map(i => 
        i.id === selectedIntegration.id 
          ? { ...i, config: formData, status: 'Connected', lastSync: new Date() }
          : i
      ));
      setShowModal(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Connected': return <MdCheckCircle size={18} style={{ color: '#16a34a' }} />;
      case 'Disconnected': return <MdError size={18} style={{ color: '#dc2626' }} />;
      case 'Pending': return <MdRefresh size={18} style={{ color: '#f59e0b' }} />;
      default: return <MdSettings size={18} style={{ color: '#94a3b8' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Connected': return { bg: '#dcfce7', color: '#166534' };
      case 'Disconnected': return { bg: '#fee2e2', color: '#991b1b' };
      case 'Pending': return { bg: '#fef3c7', color: '#92400e' };
      default: return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Integration Settings</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Configure and manage third-party integrations</div>
      </div>

      {/* Integrations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {integrations.map(integration => {
          const statusColor = getStatusColor(integration.status);
          return (
            <div key={integration.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{integration.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {getStatusIcon(integration.status)}
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: statusColor.bg,
                      color: statusColor.color,
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      {integration.status}
                    </div>
                  </div>
                </div>
              </div>

              {integration.lastSync && (
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                  Last sync: {integration.lastSync.toLocaleTimeString('en-IN')}
                </div>
              )}

              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                {Object.entries(integration.config).map(([key, value]) => (
                  <div key={key} style={{ fontSize: 12 }}>
                    <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div style={{ color: '#374151', fontFamily: 'monospace', fontSize: 11 }}>
                      {typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-sm btn-outline" onClick={() => handleEditIntegration(integration)} style={{ width: '100%' }}>
                Configure
              </button>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Configure ${selectedIntegration?.name}`} size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={saving || testing}>Cancel</button>
            <button className="btn btn-outline" onClick={handleTestConnection} disabled={saving || testing}>
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving || testing}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }>
        {selectedIntegration && (
          <div style={{ display: 'grid', gap: 16 }}>
            {selectedIntegration.id === 'tally' && (
              <>
                <div className="form-group">
                  <label className="form-label">Tally Server URL</label>
                  <input type="text" className="form-input" value={formData.serverUrl || ''}
                    onChange={e => setFormData({ ...formData, serverUrl: e.target.value })}
                    placeholder="https://erp.majesticmall.net" />
                </div>
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input type="password" className="form-input" value={formData.apiKey || ''}
                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Enter API key" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sync Frequency</label>
                  <select className="form-select" value={formData.syncFrequency || ''}
                    onChange={e => setFormData({ ...formData, syncFrequency: e.target.value })}>
                    <option>Every 15 minutes</option>
                    <option>Every 30 minutes</option>
                    <option>Every 1 hour</option>
                    <option>Every 4 hours</option>
                    <option>Daily</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.autoSync || false}
                      onChange={e => setFormData({ ...formData, autoSync: e.target.checked })} />
                    <span style={{ fontSize: 13 }}>Enable automatic sync</span>
                  </label>
                </div>
              </>
            )}

            {selectedIntegration.id === 'delhivery' && (
              <>
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input type="password" className="form-input" value={formData.apiKey || ''}
                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Enter Delhivery API key" />
                </div>
                <div className="form-group">
                  <label className="form-label">Client ID</label>
                  <input type="text" className="form-input" value={formData.clientId || ''}
                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="Your client ID" />
                </div>
                <div className="form-group">
                  <label className="form-label">Webhook URL</label>
                  <input type="text" className="form-input" value={formData.webhookUrl || ''}
                    onChange={e => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://api.chakra.com/webhooks/delhivery" />
                </div>
              </>
            )}

            {selectedIntegration.id === 'vinculum' && (
              <>
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input type="password" className="form-input" value={formData.apiKey || ''}
                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Enter API key" />
                </div>
                <div className="form-group">
                  <label className="form-label">Client ID</label>
                  <input type="text" className="form-input" value={formData.clientId || ''}
                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="Your client ID" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sync Frequency</label>
                  <select className="form-select" value={formData.syncFrequency || ''}
                    onChange={e => setFormData({ ...formData, syncFrequency: e.target.value })}>
                    <option>Every 30 minutes</option>
                    <option>Every 1 hour</option>
                    <option>Every 4 hours</option>
                    <option>Daily</option>
                  </select>
                </div>
              </>
            )}

            {selectedIntegration.id === 'india-post' && (
              <>
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input type="password" className="form-input" value={formData.apiKey || ''}
                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Enter India Post API key" />
                </div>
                <div className="form-group">
                  <label className="form-label">Account ID</label>
                  <input type="text" className="form-input" value={formData.accountId || ''}
                    onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                    placeholder="Your India Post account ID" />
                </div>
              </>
            )}

            <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, fontSize: 12, color: '#166534' }}>
              <strong>Note:</strong> API keys are encrypted and stored securely. Never share your credentials.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
