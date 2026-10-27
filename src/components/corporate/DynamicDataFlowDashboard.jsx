import React, { useState, useEffect } from 'react';
import { corporateClientApi } from '../../api/corporateClientApi';

const DynamicDataFlowDashboard = () => {
  const [clients, setClients] = useState([]);
  const [pendingSync, setPendingSync] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    synced: 0,
    pending: 0,
    failed: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, pendingRes] = await Promise.all([
        corporateClientApi.getAll(),
        corporateClientApi.getPendingSync()
      ]);

      if (clientsRes.success) {
        setClients(clientsRes.data);
        calculateStats(clientsRes.data);
      }

      if (pendingRes.success) {
        setPendingSync(pendingRes.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (clientData) => {
    const total = clientData.length;
    const synced = clientData.filter(c => c.tallySync?.synced).length;
    const failed = clientData.filter(c => c.tallySync?.syncStatus === 'Failed').length;
    const pending = total - synced - failed;

    setStats({ total, synced, pending, failed });
  };

  const handleBulkSync = async () => {
    setLoading(true);
    try {
      const response = await corporateClientApi.bulkSync();
      if (response.success) {
        alert(`Bulk sync completed! ${response.data.totalClients} clients processed.`);
        await loadData();
      }
    } catch (error) {
      alert('Bulk sync failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleSync = async (clientId) => {
    setLoading(true);
    try {
      const response = await corporateClientApi.syncWithTally(clientId);
      if (response.success) {
        alert('Client synced successfully!');
        await loadData();
      }
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const totalModules = Object.keys(status).length;
    const integratedModules = Object.values(status).filter(Boolean).length;
    
    if (integratedModules === totalModules) return 'bg-green-100 text-green-800';
    if (integratedModules > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getIntegrationStatusText = (status) => {
    if (!status) return 'Not Integrated';
    
    const totalModules = Object.keys(status).length;
    const integratedModules = Object.values(status).filter(Boolean).length;
    
    if (integratedModules === totalModules) return 'Fully Integrated';
    if (integratedModules > 0) return `Partial (${integratedModules}/${totalModules})`;
    return 'Not Integrated';
  };

  const getTallySyncStatusColor = (syncStatus) => {
    switch (syncStatus) {
      case 'Success': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dynamic Data Flow Dashboard</h2>
        <button
          onClick={handleBulkSync}
          disabled={loading || pendingSync.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Syncing...' : `Bulk Sync (${pendingSync.length} pending)`}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-600">Total Clients</h3>
          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-600">Synced</h3>
          <p className="text-2xl font-bold text-green-900">{stats.synced}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-600">Pending</h3>
          <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-red-600">Failed</h3>
          <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
        </div>
      </div>

      {/* Data Flow Visualization */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Flow Process</h3>
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <span className="ml-2 text-sm font-medium">Corporate Onboarding</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <span className="ml-2 text-sm font-medium">Quotation Module</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <span className="ml-2 text-sm font-medium">Invoice Module</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
            <span className="ml-2 text-sm font-medium">Accounts Ledger</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
            <span className="ml-2 text-sm font-medium">Tally Sync</span>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Client ID</th>
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Company Name</th>
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Tier</th>
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Integration Status</th>
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Tally Sync</th>
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Last Sync</th>
              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client._id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2 text-sm">{client.clientId}</td>
                <td className="border border-gray-200 px-4 py-2 text-sm font-medium">{client.name}</td>
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    client.tier === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                    client.tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {client.tier}
                  </span>
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getIntegrationStatusColor(client.integrationStatus)}`}>
                    {getIntegrationStatusText(client.integrationStatus)}
                  </span>
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getTallySyncStatusColor(client.tallySync?.syncStatus)}`}>
                    {client.tallySync?.syncStatus || 'Pending'}
                  </span>
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                  {client.tallySync?.lastSyncAt 
                    ? new Date(client.tallySync.lastSyncAt).toLocaleDateString('en-IN')
                    : 'Never'
                  }
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm">
                  <button
                    onClick={() => handleSingleSync(client._id)}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    Sync
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clients.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No corporate clients found. Create your first client to see the dynamic data flow in action.
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default DynamicDataFlowDashboard;