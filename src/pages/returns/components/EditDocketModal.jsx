import React, { useState, useEffect } from 'react';
import { MdClose, MdSave, MdEdit } from 'react-icons/md';
import Modal from '../../../components/common/Modal';
import docketTrackingApi from '../../../api/docketTrackingApi';

const EditDocketModal = ({ isOpen, docket, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (docket) {
      setFormData({
        ...docket,
        pickupDate: docket.pickupDate ? new Date(docket.pickupDate).toISOString().split('T')[0] : '',
        estimatedDelivery: docket.estimatedDelivery ? new Date(docket.estimatedDelivery).toISOString().split('T')[0] : '',
        actualDeliveryDate: docket.actualDeliveryDate ? new Date(docket.actualDeliveryDate).toISOString().split('T')[0] : ''
      });
    }
  }, [docket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await docketTrackingApi.updateDocket(docket.id, formData);
      onSuccess();
    } catch (error) {
      console.error('Error updating docket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Docket" size="2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div>
          <h3 className="text-lg font-semibold text-blue-600 mb-4">Basic Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Docket ID
              </label>
              <input
                type="text"
                value={formData.docketId || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MR ID
              </label>
              <input
                type="text"
                value={formData.mrId || ''}
                onChange={(e) => handleInputChange('mrId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWB/LR Number
              </label>
              <input
                type="text"
                value={formData.awbLrNumber || ''}
                onChange={(e) => handleInputChange('awbLrNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Transport Details */}
        <div>
          <h3 className="text-lg font-semibold text-blue-600 mb-4">Transport Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Courier Partner
              </label>
              <select
                value={formData.courierPartner || ''}
                onChange={(e) => handleInputChange('courierPartner', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Courier</option>
                <option value="VRL Logistics">VRL Logistics</option>
                <option value="Delhivery">Delhivery</option>
                <option value="Blue Dart">Blue Dart</option>
                <option value="DTDC">DTDC</option>
                <option value="FedEx">FedEx</option>
                <option value="Aramex">Aramex</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Number
              </label>
              <input
                type="text"
                value={formData.vehicleNumber || ''}
                onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Driver Name
              </label>
              <input
                type="text"
                value={formData.driverName || ''}
                onChange={(e) => handleInputChange('driverName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Status Updates */}
        <div>
          <h3 className="text-lg font-semibold text-blue-600 mb-4">Status & Remarks</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport Status
              </label>
              <select
                value={formData.transportStatus || ''}
                onChange={(e) => handleInputChange('transportStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
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
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority || ''}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              value={formData.remarks || ''}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Add any remarks or notes..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <MdSave className="w-4 h-4" />
            {loading ? 'Updating...' : 'Update Docket'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditDocketModal;