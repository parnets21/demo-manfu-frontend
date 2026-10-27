import React, { useState, useEffect } from 'react';
import { 
  MdClose, 
  MdTrackChanges, 
  MdLocationOn, 
  MdAccessTime,
  MdLocalShipping,
  MdCheckCircle,
  MdWarning,
  MdRefresh
} from 'react-icons/md';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';
import docketTrackingApi from '../../../api/docketTrackingApi';

const TrackShipmentModal = ({ isOpen, docket, onClose }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && docket) {
      fetchTrackingData();
    }
  }, [isOpen, docket]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const response = await docketTrackingApi.getTrackingTimeline(docket.id);
      setTrackingData(response.data);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pickup_pending':
        return <MdAccessTime className="w-5 h-5 text-orange-500" />;
      case 'picked_up':
        return <MdLocalShipping className="w-5 h-5 text-blue-500" />;
      case 'in_transit':
        return <MdLocalShipping className="w-5 h-5 text-purple-500" />;
      case 'reached_hub':
        return <MdLocationOn className="w-5 h-5 text-indigo-500" />;
      case 'out_for_delivery':
        return <MdLocalShipping className="w-5 h-5 text-cyan-500" />;
      case 'delivered':
        return <MdCheckCircle className="w-5 h-5 text-green-500" />;
      case 'delayed':
        return <MdWarning className="w-5 h-5 text-red-500" />;
      default:
        return <MdAccessTime className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pickup_pending': return 'orange';
      case 'picked_up': return 'blue';
      case 'in_transit': return 'purple';
      case 'reached_hub': return 'indigo';
      case 'out_for_delivery': return 'cyan';
      case 'delivered': return 'green';
      case 'delayed': return 'red';
      case 'damaged': return 'red';
      case 'returned': return 'yellow';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  if (!docket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Track Shipment" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-blue-800">{docket.docketId}</h3>
              <p className="text-blue-600">AWB/LR: {docket.awbLrNumber}</p>
              <p className="text-blue-600">Courier: {docket.courierPartner}</p>
            </div>
            <button
              onClick={fetchTrackingData}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
              title="Refresh Tracking"
            >
              <MdRefresh className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MdTrackChanges className="w-5 h-5" />
            Current Status
          </h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(docket.transportStatus)}
              <div>
                <StatusBadge 
                  status={docket.transportStatus} 
                  color={getStatusColor(docket.transportStatus)}
                  size="lg"
                />
                {docket.lastScanLocation && (
                  <p className="text-sm text-gray-600 mt-1">
                    Last seen at: {docket.lastScanLocation}
                  </p>
                )}
              </div>
            </div>
            {docket.lastScanTime && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm font-medium">
                  {new Date(docket.lastScanTime).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Shipment Progress */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-4">Shipment Progress</h4>
          
          {/* Progress Bar */}
          <div className="relative mb-6">
            <div className="flex justify-between items-center">
              {['pickup_pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].map((status, index) => {
                const isCompleted = docket.trackingHistory?.some(event => event.status === status);
                const isCurrent = docket.transportStatus === status;
                
                return (
                  <div key={status} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isCompleted || isCurrent 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'bg-gray-200 border-gray-300 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <MdCheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    <span className="text-xs mt-2 text-center capitalize max-w-16">
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Progress Line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-10">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ 
                  width: `${Math.max(0, Math.min(100, 
                    (['pickup_pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered']
                      .findIndex(s => s === docket.transportStatus) / 4) * 100
                  ))}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Detailed Timeline */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading tracking details...</p>
          </div>
        ) : trackingData && trackingData.length > 0 ? (
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-4">Detailed Timeline</h4>
            <div className="space-y-4">
              {trackingData.map((event, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(event.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium text-gray-800 capitalize">
                          {event.status.replace('_', ' ')}
                        </h5>
                        {event.location && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MdLocationOn className="w-4 h-4" />
                            {event.location}
                          </p>
                        )}
                        {event.remarks && (
                          <p className="text-sm text-gray-600 mt-1">{event.remarks}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(event.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MdTrackChanges className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No tracking information available</p>
          </div>
        )}

        {/* Shipment Details */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Shipment Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">From:</span>
              <p className="font-medium">{docket.pickupLocation}</p>
            </div>
            <div>
              <span className="text-gray-600">To:</span>
              <p className="font-medium">{docket.deliveryLocation}</p>
            </div>
            <div>
              <span className="text-gray-600">Pickup Date:</span>
              <p className="font-medium">{new Date(docket.pickupDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-600">Expected Delivery:</span>
              <p className={`font-medium ${docket.isDelayed ? 'text-red-600' : ''}`}>
                {new Date(docket.estimatedDelivery).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Weight:</span>
              <p className="font-medium">{docket.shipmentWeight} kg</p>
            </div>
            <div>
              <span className="text-gray-600">Packages:</span>
              <p className="font-medium">{docket.packagesCount}</p>
            </div>
          </div>
        </div>

        {/* Delay Information */}
        {docket.isDelayed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <MdWarning className="w-5 h-5" />
              Shipment Delayed
            </h4>
            <p className="text-red-700 text-sm">
              This shipment is delayed beyond the expected delivery date.
            </p>
            {docket.delayReason && (
              <p className="text-red-600 text-sm mt-2">
                <strong>Reason:</strong> {docket.delayReason}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TrackShipmentModal;