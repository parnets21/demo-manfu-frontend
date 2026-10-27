import { useState, useEffect } from 'react';
import { materialReturnApi } from '../../api/materialReturnApi';
import { toast } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';

const RECEIVE_STATUSES = ['Pending', 'In_Progress', 'Received', 'QC_Required', 'Completed'];

export default function WarehouseReceivePage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showQCModal, setShowQCModal] = useState(false);
  const [qcData, setQcData] = useState({
    receivedQty: 0,
    damageQty: 0,
    missingQty: 0,
    warehouseLocation: '',
    notes: '',
    qcStatus: 'Pass'
  });

  useEffect(() => {
    fetchWarehouseReturns();
  }, []);

  const fetchWarehouseReturns = async () => {
    setLoading(true);
    try {
      const response = await materialReturnApi.getWarehouseReturns();
      setReturns(response.data || []);
    } catch (error) {
      console.error('Error fetching warehouse returns:', error);
      toast('Error loading warehouse returns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveReturn = async (returnId) => {
    try {
      await materialReturnApi.receiveAtWarehouse(returnId, {
        receivedBy: 'Warehouse Team',
        receivedDate: new Date().toISOString(),
        warehouseStatus: 'RECEIVED',
        currentStage: 'QC_PENDING'
      });
      await fetchWarehouseReturns();
      toast('Return received at warehouse - moved to QC Pending');
    } catch (error) {
      toast(error.message || 'Error receiving return', 'error');
    }
  };

  const openQCModal = (returnItem) => {
    setSelectedReturn(returnItem);
    setQcData({
      receivedQty: returnItem.expectedQty || returnItem.returnQty || 0,
      damageQty: 0,
      missingQty: 0,
      warehouseLocation: '',
      notes: '',
      qcStatus: 'Pass'
    });
    setShowQCModal(true);
  };

  const handleQCSubmit = async () => {
    if (!selectedReturn) return;
    
    try {
      const status = qcData.qcStatus === 'Pass' ? 'QC_PASSED' : 'QC_FAILED';
      await materialReturnApi.processQC(selectedReturn._id, {
        ...qcData,
        qcBy: 'QC Team',
        qcDate: new Date().toISOString(),
        currentStage: status
      });

      // If QC Passed, trigger Inventory Update integration
      if (status === 'QC_PASSED') {
        try {
          await materialReturnApi.inventoryUpdate(selectedReturn._id);
          toast('QC Passed & Inventory Updated Automatically');
        } catch (invErr) {
          console.error('Inventory update failed:', invErr);
          toast('QC Passed, but inventory auto-update failed', 'warning');
        }
      } else {
        // If QC Failed or discrepancy found, trigger Loss Tracking integration
        if (qcData.damageQty > 0 || qcData.missingQty > 0 || status === 'QC_FAILED') {
          try {
            await materialReturnApi.processLoss(selectedReturn._id, {
              expectedQty: selectedReturn.expectedQty || selectedReturn.returnQty,
              receivedQty: qcData.receivedQty,
              missingQty: qcData.missingQty,
              damagedQty: qcData.damageQty,
              remarks: qcData.notes || 'QC Discrepancy found'
            });
            toast('Loss Tracking Entry Created Automatically');
          } catch (lossErr) {
            console.error('Loss tracking failed:', lossErr);
          }
        }
      }

      setShowQCModal(false);
      setSelectedReturn(null);
      await fetchWarehouseReturns();
      toast('QC process completed');
    } catch (error) {
      toast(error.message || 'Error processing QC', 'error');
    }
  };

  const getStatusColor = (stage) => {
    const colors = {
      'IN_TRANSIT': '#f59e0b',
      'ARRIVED_AT_WAREHOUSE': '#3b82f6',
      'RECEIVED': '#10b981',
      'QC_PENDING': '#8b5cf6',
      'QC_PASSED': '#059669',
      'QC_FAILED': '#ef4444'
    };
    return colors[stage] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading warehouse returns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Warehouse Receive</h2>
          <p className="text-sm text-gray-600">Manage incoming return products</p>
        </div>
        <div className="text-sm text-gray-500">
          Total Returns: {returns.length}
        </div>
      </div>

      {/* Returns List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">Pending Returns</h3>
        </div>
        
        {returns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No returns pending warehouse receive
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['MR ID', 'Docket ID', 'Product', 'Supplier', 'Expected Qty', 'Stage', 'Actions'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returns.map((item) => (
                  <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-red-700">{item.mrId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.docketId}</td>
                    <td className="px-4 py-3 font-medium">{item.productName || '—'}</td>
                    <td className="px-4 py-3">{item.supplierName}</td>
                    <td className="px-4 py-3 font-semibold">{item.expectedQty || item.returnQty || '—'}</td>
                    <td className="px-4 py-3">
                      <span 
                        className="text-xs font-bold px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: getStatusColor(item.currentStage) }}
                      >
                        {item.currentStage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {(item.currentStage === 'IN_TRANSIT' || item.currentStage === 'ARRIVED_AT_WAREHOUSE') && (
                          <button
                            onClick={() => handleReceiveReturn(item._id)}
                            className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            Receive
                          </button>
                        )}
                        {(item.currentStage === 'RECEIVED') && (
                          <button
                            onClick={() => openQCModal(item)}
                            className="px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          >
                            QC Check
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QC Modal */}
      <Modal 
        open={showQCModal} 
        onClose={() => setShowQCModal(false)} 
        title={`QC Check - ${selectedReturn?.mrId}`}
        footer={
          <>
            <button 
              className="btn btn-outline" 
              onClick={() => setShowQCModal(false)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleQCSubmit}
            >
              Complete QC
            </button>
          </>
        }
      >
        {selectedReturn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Expected Qty
                </label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={selectedReturn.expectedQty || selectedReturn.returnQty || 0}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Received Qty
                </label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={qcData.receivedQty}
                  onChange={(e) => setQcData(prev => ({ ...prev, receivedQty: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Damage Qty
                </label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={qcData.damageQty}
                  onChange={(e) => setQcData(prev => ({ ...prev, damageQty: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Missing Qty
                </label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={qcData.missingQty}
                  onChange={(e) => setQcData(prev => ({ ...prev, missingQty: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Warehouse Location
                </label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="e.g., A-1-B-3"
                  value={qcData.warehouseLocation}
                  onChange={(e) => setQcData(prev => ({ ...prev, warehouseLocation: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  QC Status
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={qcData.qcStatus}
                  onChange={(e) => setQcData(prev => ({ ...prev, qcStatus: e.target.value }))}
                >
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                QC Notes
              </label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                rows={3}
                placeholder="Add any QC observations or notes..."
                value={qcData.notes}
                onChange={(e) => setQcData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}