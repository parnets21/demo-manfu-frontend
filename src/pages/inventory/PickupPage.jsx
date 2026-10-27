import React, { useState, useEffect } from 'react';
import { MdQrCodeScanner, MdCamera, MdCheckCircle, MdLocalShipping, MdLocationOn } from 'react-icons/md';
import docketTrackingApi from '../../api/docketTrackingApi';

export default function PickupPage() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  
  // Pickup form state
  const [pickupForm, setPickupForm] = useState({
    otp: '',
    barcodes: [],
    packages: [],
    photos: [],
    signature: null
  });

  // Load pending pickups
  const loadPickups = async () => {
    setLoading(true);
    try {
      const res = await docketTrackingApi.getAllDockets();
      const pendingPickups = (res.data || []).filter(d => 
        d.transportStatus === 'pickup_pending' || d.transportStatus === 'vehicle_assigned'
      );
      setPickups(pendingPickups);
    } catch (error) {
      console.error('Failed to load pickups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPickups();
  }, []);

  // Handle pickup completion
  const handleCompletePickup = async () => {
    if (!selectedPickup) return;
    
    try {
      // Update docket status to picked_up
      await docketTrackingApi.updateDocketStatus(selectedPickup._id, {
        transportStatus: 'picked_up',
        currentStage: 'IN_TRANSIT',
        pickupCompletedAt: new Date().toISOString(),
        pickupVerification: {
          otp: pickupForm.otp,
          barcodes: pickupForm.barcodes,
          packages: pickupForm.packages,
          photos: pickupForm.photos,
          signature: pickupForm.signature,
          verifiedAt: new Date().toISOString()
        }
      });

      alert('✅ Pickup completed successfully!');
      setShowPickupModal(false);
      setSelectedPickup(null);
      setPickupForm({ otp: '', barcodes: [], packages: [], photos: [], signature: null });
      loadPickups();
    } catch (error) {
      console.error('Pickup completion failed:', error);
      alert('❌ Failed to complete pickup');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Material Return Pickups</h1>
        <p className="text-sm text-gray-600 mt-1">Manage pickup operations for material returns</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Pickups', value: pickups.length, color: 'bg-orange-500' },
          { label: 'Today Pickups', value: 0, color: 'bg-blue-500' },
          { label: 'Completed', value: 0, color: 'bg-green-500' },
          { label: 'In Transit', value: 0, color: 'bg-purple-500' }
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

      {/* Pickup Queue Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Pickup Queue</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Pickup ID', 'Docket ID', 'Return ID', 'Vehicle No', 'Driver', 'Customer', 'Pickup Address', 'SKU', 'Batch', 'Qty', 'Packages', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    Loading pickups...
                  </td>
                </tr>
              ) : pickups.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    No pending pickups found
                  </td>
                </tr>
              ) : (
                pickups.map((pickup, idx) => (
                  <tr key={pickup._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-blue-600">PKP-{String(idx + 1).padStart(4, '0')}</td>
                    <td className="px-4 py-3 text-sm font-mono">{pickup.docketId || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{pickup.mrId || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{pickup.vehicleNumber || 'Not Assigned'}</td>
                    <td className="px-4 py-3 text-sm">{pickup.driverName || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{pickup.supplier || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{pickup.sourceLocation || pickup.pickupLocation || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{pickup.productSku || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">BATCH-{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{pickup.qty || 0}</td>
                    <td className="px-4 py-3 text-sm">{Math.ceil((pickup.qty || 0) / 10)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        {pickup.transportStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedPickup(pickup);
                          setShowPickupModal(true);
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                      >
                        <MdCheckCircle size={14} />
                        Start Pickup
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pickup Modal */}
      {showPickupModal && selectedPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Complete Pickup</h3>
                <p className="text-sm text-gray-600">Docket: {selectedPickup.docketId}</p>
              </div>
              <button
                onClick={() => setShowPickupModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Pickup Details */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">Pickup Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-600">Vehicle:</span> <span className="font-semibold">{selectedPickup.vehicleNumber}</span></div>
                  <div><span className="text-gray-600">Driver:</span> <span className="font-semibold">{selectedPickup.driverName}</span></div>
                  <div><span className="text-gray-600">Customer:</span> <span className="font-semibold">{selectedPickup.supplier}</span></div>
                  <div><span className="text-gray-600">Quantity:</span> <span className="font-semibold">{selectedPickup.qty} units</span></div>
                </div>
              </div>

              {/* OTP Verification */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MdCheckCircle className="inline mr-1" /> OTP Verification
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={pickupForm.otp}
                  onChange={(e) => setPickupForm({ ...pickupForm, otp: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest"
                />
              </div>

              {/* Barcode Scan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MdQrCodeScanner className="inline mr-1" /> Barcode Scan
                </label>
                <button className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <MdQrCodeScanner size={24} className="mx-auto mb-1 text-gray-400" />
                  <span className="text-sm text-gray-600">Tap to scan barcode</span>
                </button>
              </div>

              {/* Package Scan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Package Count: {pickupForm.packages.length}
                </label>
                <button className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                  <span className="text-sm text-gray-600">Scan packages</span>
                </button>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MdCamera className="inline mr-1" /> Photo Upload
                </label>
                <button className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
                  <MdCamera size={24} className="mx-auto mb-1 text-gray-400" />
                  <span className="text-sm text-gray-600">Take photos</span>
                </button>
              </div>

              {/* Customer Signature */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Customer Signature
                </label>
                <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <span className="text-sm text-gray-400">Signature pad</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowPickupModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCompletePickup}
                disabled={!pickupForm.otp || pickupForm.otp.length !== 6}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <MdCheckCircle size={18} />
                Complete Pickup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}