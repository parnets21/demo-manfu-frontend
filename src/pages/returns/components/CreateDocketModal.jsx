import React, { useState, useEffect } from 'react';
import { MdClose, MdSave, MdDrafts, MdUpload } from 'react-icons/md';
import Modal from '../../../components/common/Modal';
import docketTrackingApi from '../../../api/docketTrackingApi';

const CreateDocketModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    // Basic Details
    mrId: '',
    returnRequestId: '',
    courierPartner: '',
    shipmentType: 'Standard',
    priority: 'Medium',
    
    // Transport Details
    awbLrNumber: '',
    vehicleNumber: '',
    driverName: '',
    driverMobile: '',
    packagesCount: 1,
    shipmentWeight: 0,
    transportCost: 0,
    
    // Pickup & Delivery
    pickupLocation: '',
    deliveryLocation: '',
    pickupDate: new Date().toISOString().split('T')[0],
    estimatedDelivery: '',
    
    // Status & Remarks
    transportStatus: 'pickup_pending',
    podStatus: 'pending',
    damageStatus: 'none',
    delayReason: '',
    remarks: '',
    
    // Material Details
    materialDetails: {
      description: '',
      quantity: 0,
      weight: 0,
      value: 0,
      unit: 'Pieces',
      invoiceNumber: '',
      returnAmount: 0
    },
    
    // Contact Details
    contactDetails: {
      supplierName: '',
      supplierContact: '',
      transporterContact: '',
      driverContact: ''
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // Auto-calculate estimated delivery (pickup date + 2 days)
  useEffect(() => {
    if (formData.pickupDate) {
      const pickupDate = new Date(formData.pickupDate);
      const estimatedDate = new Date(pickupDate);
      estimatedDate.setDate(estimatedDate.getDate() + 2);
      
      setFormData(prev => ({
        ...prev,
        estimatedDelivery: estimatedDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.pickupDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const docketData = {
        ...formData,
        createdBy: 'admin', // This should come from auth context
        attachments: attachments
      };
      
      await docketTrackingApi.createDocket(docketData);
      onSuccess();
    } catch (error) {
      console.error('Error creating docket:', error);
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

  const handleFileUpload = (file, category) => {
    setAttachments(prev => [...prev, {
      file,
      category,
      fileName: file.name,
      fileType: file.type
    }]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Docket" size="2xl">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Section 1: Basic Details */}
        <div>
          <h3 className="text-lg font-semibold text-blue-600 mb-4">Basic Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MR ID *
              </label>
              <input
                type="text"
                value={formData.mrId}
                onChange={(e) => handleInputChange('mrId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="MR-2026-004"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Request ID
              </label>
              <input
                type="text"
                value={formData.returnRequestId}
                onChange={(e) => handleInputChange('returnRequestId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="RR-2026-004"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Courier Partner *
              </label>
              <select
                value={formData.courierPartner}
                onChange={(e) => handleInputChange('courierPartner', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Courier</option>
                <option value="VRL Logistics">VRL Logistics</option>
                <option value="Delhivery">Delhivery</option>
                <option value="Blue Dart">Blue Dart</option>
                <option value="DTDC">DTDC</option>
                <option value="FedEx">FedEx</option>
                <option value="Aramex">Aramex</option>
                <option value="Ecom Express">Ecom Express</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipment Type
              </label>
              <select
                value={formData.shipmentType}
                onChange={(e) => handleInputChange('shipmentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Standard">Standard</option>
                <option value="Express">Express</option>
                <option value="Overnight">Overnight</option>
                <option value="Economy">Economy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
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
            type="button"
            className="px-6 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 flex items-center gap-2"
          >
            <MdDrafts className="w-4 h-4" />
            Save Draft
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <MdSave className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Docket'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateDocketModal;