import React, { useState } from 'react';
import { 
  MdClose, 
  MdLocationOn, 
  MdPerson, 
  MdPhone, 
  MdDirectionsCar,
  MdInventory,
  MdAttachFile,
  MdFileUpload,
  MdTrackChanges,
  MdUpdate
} from 'react-icons/md';
import Modal from '../../../components/common/Modal';
import StatusBadge from '../../../components/common/StatusBadge';

const ViewDocketModal = ({ isOpen, docket, onClose, onStatusUpdate }) => {
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [statusData, setStatusData] = useState({
    status: '',
    location: '',
    remarks: ''
  });

  const handleStatusUpdate = async () => {
    try {
      await onStatusUpdate(docket.id, statusData);
      setShowStatusUpdate(false);
      setStatusData({ status: '', location: '', remarks: '' });
    } catch (error) {
      console.error('Error updating status:', error);
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
      case 'closed': return 'green';
      default: return 'gray';
    }
  };

  if (!docket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Docket Details" size="2xl">
      <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-blue-800">{docket.docketId}</h3>
              <p className="text-blue-600">MR ID: {docket.mrId}</p>
              <p className="text-blue-600">AWB/LR: {docket.awbLrNumber}</p>
            </div>
            <div className="text-right">
              <StatusBadge 
                status={docket.transportStatus} 
                color={getStatusColor(docket.transportStatus)}
                size="lg"
              />
              {docket.isDelayed && (
                <div className="mt-2">
                  <StatusBadge status="DELAYED" color="red" size="sm" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transport & Material Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transport Details */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MdDirectionsCar className="w-5 h-5" />
              Transport Details
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Courier Partner:</span>
                <span className="font-medium">{docket.courierPartner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle Number:</span>
                <span className="font-medium">{docket.vehicleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Driver Name:</span>
                <span className="font-medium">{docket.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Driver Mobile:</span>
                <span className="font-medium">{docket.driverMobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipment Weight:</span>
                <span className="font-medium">{docket.shipmentWeight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Packages Count:</span>
                <span className="font-medium">{docket.packagesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transport Cost:</span>
                <span className="font-medium">₹{docket.transportCost}</span>
              </div>
            </div>
          </div>

          {/* Material Details */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MdInventory className="w-5 h-5" />
              Material Details
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Description:</span>
                <span className="font-medium">{docket.materialDetails?.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{docket.materialDetails?.quantity} {docket.materialDetails?.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Value:</span>
                <span className="font-medium">₹{docket.materialDetails?.value?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Number:</span>
                <span className="font-medium">{docket.materialDetails?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Return Amount:</span>
                <span className="font-medium">₹{docket.materialDetails?.returnAmount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MdLocationOn className="w-5 h-5" />
            Location & Timeline
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Pickup Location:</span>
              <p className="font-medium">{docket.pickupLocation}</p>
            </div>
            <div>
              <span className="text-gray-600">Delivery Location:</span>
              <p className="font-medium">{docket.deliveryLocation}</p>
            </div>
            <div>
              <span className="text-gray-600">Pickup Date:</span>
              <p className="font-medium">{new Date(docket.pickupDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-600">Estimated Delivery:</span>
              <p className={`font-medium ${docket.isDelayed ? 'text-red-600' : ''}`}>
                {new Date(docket.estimatedDelivery).toLocaleDateString()}
              </p>
            </div>
            {docket.lastScanLocation && (
              <div>
                <span className="text-gray-600">Last Scan Location:</span>
                <p className="font-medium">{docket.lastScanLocation}</p>
              </div>
            )}
            {docket.lastScanTime && (
              <div>
                <span className="text-gray-600">Last Scan Time:</span>
                <p className="font-medium">{new Date(docket.lastScanTime).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tracking History */}
        {docket.trackingHistory && docket.trackingHistory.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MdTrackChanges className="w-5 h-5" />
              Tracking Timeline
            </h4>
            <div className="space-y-4">
              {docket.trackingHistory.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1 ${
                    event.status === 'delivered' ? 'bg-green-500' :
                    event.status === 'delayed' ? 'bg-red-500' :
                    event.status === 'in_transit' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-sm capitalize">
                          {event.status.replace('_', ' ')}
                        </span>
                        {event.location && (
                          <span className="text-gray-600 text-sm ml-2">
                            at {event.location}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {event.remarks && (
                      <p className="text-xs text-gray-600 mt-1">{event.remarks}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Update Section */}
        {showStatusUpdate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-3">Update Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  value={statusData.status}
                  onChange={(e) => setStatusData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Status</option>
                  <option value="pickup_pending">Pickup Pending</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="in_transit">In Transit</option>
                  <option value="reached_hub">Reached Hub</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="delayed">Delayed</option>
                  <option value="damaged">Damaged</option>
                  <option value="returned">Returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={statusData.location}
                  onChange={(e) => setStatusData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Current location"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={statusData.remarks}
                onChange={(e) => setStatusData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Add remarks about status update"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowStatusUpdate(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Status
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <button
            onClick={() => setShowStatusUpdate(!showStatusUpdate)}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
          >
            <MdUpdate className="w-4 h-4" />
            Update Status
          </button>
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

export default ViewDocketModal;