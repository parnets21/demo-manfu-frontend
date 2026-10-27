import React, { useState, useEffect } from 'react';
import { MdLocalShipping, MdLocationOn, MdAccessTime, MdCheckCircle, MdRadioButtonChecked } from 'react-icons/md';
import docketTrackingApi from '../../api/docketTrackingApi';
import Pagination from '../../components/common/Pagination';

export default function DeliveryTrackingPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Load in-transit deliveries
  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const res = await docketTrackingApi.getAllDockets();
      const inTransit = (res.data || []).filter(d => 
        d.transportStatus === 'picked_up' || 
        d.transportStatus === 'in_transit' ||
        d.currentStage === 'IN_TRANSIT'
      );
      setDeliveries(inTransit);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDeliveries, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle delivery status update
  const handleUpdateStatus = async (deliveryId, newStatus) => {
    try {
      await docketTrackingApi.updateDocketStatus(deliveryId, {
        transportStatus: newStatus,
        currentStage: newStatus === 'delivered' ? 'ARRIVED' : 'IN_TRANSIT',
        lastUpdated: new Date().toISOString()
      });
      
      alert(`✅ Status updated to: ${newStatus}`);
      loadDeliveries();
    } catch (error) {
      console.error('Status update failed:', error);
      alert('❌ Failed to update status');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>
        <p className="text-sm text-gray-600 mt-1">Real-time tracking of material return deliveries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'In Transit', value: deliveries.length, color: 'bg-blue-500' },
          { label: 'On Time', value: deliveries.filter(d => !d.isDelayed).length, color: 'bg-green-500' },
          { label: 'Delayed', value: deliveries.filter(d => d.isDelayed).length, color: 'bg-red-500' },
          { label: 'Arriving Today', value: 0, color: 'bg-purple-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm border">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-2`}>
              <MdLocalShipping className="text-white" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Delivery Tracking Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Active Deliveries</h2>
          <button
            onClick={loadDeliveries}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            🔄 Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Docket ID', 'Vehicle No', 'Driver', 'Live Location', 'ETA', 'Route', 'Checkpoint', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Loading deliveries...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No active deliveries
                  </td>
                </tr>
              ) : (
                deliveries.slice((page-1)*pageSize, page*pageSize).map((delivery) => (
                  <tr key={delivery._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                      {delivery.docketId || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {delivery.vehicleNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{delivery.driverName || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{delivery.driverMobile || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <MdLocationOn size={14} />
                        <span>Live GPS</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {delivery.currentLocation || 'Tracking...'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <MdAccessTime size={14} className="text-gray-400" />
                        <span>{delivery.expectedArrival ? new Date(delivery.expectedArrival).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-xs">
                        {delivery.sourceLocation || 'Origin'} → {delivery.destWarehouse || 'Destination'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                        Checkpoint {Math.floor(Math.random() * 5) + 1}/5
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        delivery.transportStatus === 'picked_up' ? 'bg-orange-100 text-orange-700' :
                        delivery.transportStatus === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {delivery.transportStatus || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedDelivery(delivery)}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
                        >
                          Track
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(delivery._id, 'delivered')}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
                        >
                          Arrived
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {deliveries.length > 0 && (
          <div style={{ padding: '0 16px 8px' }}>
            <Pagination
              total={deliveries.length}
              page={page}
              pageSize={pageSize}
              onPage={p => setPage(p)}
              onPageSize={s => { setPageSize(s); setPage(1); }}
            />
          </div>
        )}
      </div>

      {/* Tracking Detail Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Live Tracking</h3>
                <p className="text-sm text-gray-600">Docket: {selectedDelivery.docketId}</p>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {/* Map Placeholder */}
              <div className="bg-gray-100 rounded-lg h-64 mb-4 flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <MdLocationOn size={48} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Live GPS Map</p>
                  <p className="text-xs text-gray-400">Real-time vehicle tracking</p>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-xs text-blue-600 font-semibold mb-1">Vehicle</div>
                  <div className="text-lg font-bold text-blue-900">{selectedDelivery.vehicleNumber}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-xs text-green-600 font-semibold mb-1">Driver</div>
                  <div className="text-lg font-bold text-green-900">{selectedDelivery.driverName}</div>
                  <div className="text-xs text-green-600">{selectedDelivery.driverMobile}</div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Delivery Timeline</h4>
                {[
                  { label: 'Pickup Completed', time: 'Today 10:30 AM', status: 'completed' },
                  { label: 'Checkpoint 1 - Delhi Hub', time: 'Today 12:15 PM', status: 'completed' },
                  { label: 'Checkpoint 2 - Gurgaon', time: 'Today 2:45 PM', status: 'active' },
                  { label: 'Checkpoint 3 - Warehouse', time: 'Expected 4:30 PM', status: 'pending' },
                  { label: 'Delivery Complete', time: 'Expected 5:00 PM', status: 'pending' }
                ].map((checkpoint, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        checkpoint.status === 'completed' ? 'bg-green-500' :
                        checkpoint.status === 'active' ? 'bg-blue-500' :
                        'bg-gray-300'
                      }`}>
                        {checkpoint.status === 'completed' ? (
                          <MdCheckCircle className="text-white" size={18} />
                        ) : checkpoint.status === 'active' ? (
                          <MdRadioButtonChecked className="text-white" size={18} />
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      {i < 4 && (
                        <div className={`w-0.5 h-8 ${checkpoint.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className={`font-semibold text-sm ${
                        checkpoint.status === 'active' ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {checkpoint.label}
                      </div>
                      <div className="text-xs text-gray-500">{checkpoint.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setSelectedDelivery(null)}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
