import { useState, useEffect, useCallback } from 'react';
import { MdCheck, MdClose, MdAccessTime, MdError, MdLocalShipping, MdDescription, MdCurrencyRupee, MdArrowForward } from 'react-icons/md';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { bulkOrderApi } from '../../api/bulkOrderApi';
import { bulkOrderApprovalApi } from '../../api/bulkOrderApprovalApi';
import { bulkOrderInventoryApi } from '../../api/bulkOrderInventoryApi';
import { bulkOrderInvoiceApi } from '../../api/bulkOrderInvoiceApi';
import { bulkOrderCreditApi } from '../../api/bulkOrderCreditApi';
import { deliveryScheduleApi } from '../../api/deliveryScheduleApi';

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]";
const btnPrimary = "inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]";
const btnOutline = "inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]";
const labelCls = "text-xs font-semibold text-gray-600";
const thCls = "bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap";
const tdCls = "px-4 py-3 text-gray-800 align-middle";
const trCls = "border-b border-gray-50 last:border-0 hover:bg-red-50/40 transition-colors";

export default function BulkOrderFlowPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flowSteps, setFlowSteps] = useState([]);
  const [creditCheck, setCreditCheck] = useState(null);
  const [inventoryCheck, setInventoryCheck] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [deliveryForm, setDeliveryForm] = useState({
    deliveryDate: '',
    slot: 'Morning (9AM-12PM)',
    warehouse: 'WH-01',
    vehicle: ''
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bulkOrderApi.getQuotations();
      setOrders(res.data || []);
    } catch (err) {
      toast('Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewFlow = async (order) => {
    setSelectedOrder(order);
    setCurrentStep(1);
    setCreditCheck(null);
    setInventoryCheck(null);
    setFlowSteps([
      { step: 1, name: 'Credit Check', status: order.creditCheckPassed ? 'Completed' : 'Pending', icon: MdCurrencyRupee },
      { step: 2, name: 'Approval Workflow', status: order.approvalStatus === 'Approved' ? 'Completed' : 'Pending', icon: MdCheck },
      { step: 3, name: 'Inventory Check', status: order.inventoryStatus !== 'Not Checked' ? 'Completed' : 'Pending', icon: MdLocalShipping },
      { step: 4, name: 'Production (if needed)', status: order.workOrderId ? 'Completed' : 'Skipped', icon: MdDescription },
      { step: 5, name: 'Delivery Scheduled', status: order.deliveryScheduleId ? 'Completed' : 'Pending', icon: MdLocalShipping },
      { step: 6, name: 'Invoice Generated', status: order.invoiceId ? 'Completed' : 'Pending', icon: MdDescription }
    ]);
    setShowFlowModal(true);
  };

  const handleCheckCredit = async () => {
    if (!selectedOrder) return;
    try {
      const res = await bulkOrderCreditApi.checkCreditLimit(selectedOrder.clientId, selectedOrder.grandTotal);
      setCreditCheck(res.data?.data);
      if (res.data?.data?.creditCheckPassed) {
        toast.success('Credit check passed');
        await bulkOrderCreditApi.reserveCredit(selectedOrder._id);
        setCurrentStep(2);
      } else {
        toast.error('Insufficient credit limit');
      }
    } catch (err) {
      toast.error('Credit check failed');
    }
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    try {
      const approvalRes = await bulkOrderApprovalApi.createApprovalWorkflow({
        quotationId: selectedOrder.quotationId,
        clientId: selectedOrder.clientId,
        orderValue: selectedOrder.grandTotal
      });
      
      await bulkOrderApprovalApi.approveAtLevel(approvalRes.data?.data?._id, 'Auto-approved');
      
      toast.success('Approval workflow completed');
      setCurrentStep(3);
      fetchOrders();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleCheckInventory = async () => {
    if (!selectedOrder) return;
    try {
      const res = await bulkOrderInventoryApi.checkInventory(selectedOrder._id);
      setInventoryCheck(res.data?.data);
      toast.success('Inventory check completed');
      
      if (res.data?.data?.inventoryStatus === 'In Stock') {
        setCurrentStep(5);
      } else if (res.data?.data?.inventoryStatus === 'Partial Stock' || res.data?.data?.inventoryStatus === 'Out of Stock') {
        setCurrentStep(4);
      }
    } catch (err) {
      toast.error('Inventory check failed');
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!selectedOrder) return;
    try {
      await bulkOrderInventoryApi.createWorkOrderForShortage(selectedOrder._id);
      toast.success('Work order created for shortage');
      setCurrentStep(5);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to create work order');
    }
  };

  const handleScheduleDelivery = async () => {
    if (!selectedOrder || !deliveryForm.deliveryDate) {
      toast.error('Please fill all delivery details');
      return;
    }
    try {
      const scheduleRes = await deliveryScheduleApi.createSchedule({
        quotationId: selectedOrder.quotationId,
        client: selectedOrder.clientName,
        items: selectedOrder.items || [],
        totalItems: Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0,
        totalQty: Array.isArray(selectedOrder.items) ? selectedOrder.items.reduce((sum, item) => sum + (item.qty || 0), 0) : 0,
        deliveryDate: deliveryForm.deliveryDate,
        slot: deliveryForm.slot,
        warehouse: deliveryForm.warehouse,
        vehicle: deliveryForm.vehicle || 'Pending',
        status: 'Confirmed'
      });

      await bulkOrderApi.update(selectedOrder._id, {
        deliveryScheduleId: scheduleRes.data?.data?._id,
        status: 'Dispatched'
      });

      toast.success('Delivery scheduled successfully');
      setCurrentStep(6);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to schedule delivery');
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;
    try {
      await bulkOrderInvoiceApi.generateInvoiceFromBulkOrder(selectedOrder._id);
      toast.success('Invoice generated successfully');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    }
  };

  const columns = [
    { key: 'orderId', label: 'Order ID', width: '10%' },
    { key: 'clientName', label: 'Client', width: '15%' },
    { key: 'grandTotal', label: 'Value', width: '10%', render: (v) => `₹${v?.toLocaleString('en-IN') || 0}` },
    { key: 'status', label: 'Status', width: '12%', render: (v) => <StatusBadge status={v} /> },
    { key: 'approvalStatus', label: 'Approval', width: '12%', render: (v) => <StatusBadge status={v} /> },
    { key: 'inventoryStatus', label: 'Inventory', width: '12%', render: (v) => <StatusBadge status={v} /> },
    { 
      key: 'actions', 
      label: 'Actions', 
      width: '12%',
      render: (_, row) => (
        <button onClick={() => handleViewFlow(row)} className={btnOutline}>
          View Flow
        </button>
      )
    }
  ];

  const getStepStatus = (step) => {
    if (step < currentStep) return 'Completed';
    if (step === currentStep) return 'Active';
    return 'Pending';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Order Complete Flow</h1>
        <p className="text-sm text-gray-600 mt-1">6-Step Integrated Order Processing</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable columns={columns} data={orders} loading={loading} />
      </div>

      {showFlowModal && selectedOrder && (
        <Modal title={`Order Flow: ${selectedOrder.orderId}`} onClose={() => setShowFlowModal(false)}>
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Flow Steps */}
            <div className="space-y-3">
              {flowSteps.map((step, idx) => {
                const status = getStepStatus(step.step);
                const Icon = step.icon;
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        status === 'Completed' ? 'bg-green-500' : 
                        status === 'Active' ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        {status === 'Completed' ? <MdCheck /> : status === 'Active' ? <MdAccessTime /> : step.step}
                      </div>
                      {idx < flowSteps.length - 1 && <div className="w-0.5 h-12 bg-gray-300 mt-2" />}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <Icon className="text-blue-600" /> {step.name}
                      </p>
                      <p className={`text-xs ${
                        status === 'Completed' ? 'text-green-600' :
                        status === 'Active' ? 'text-blue-600' : 'text-gray-500'
                      }`}>{status}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 1: Credit Check */}
            {currentStep === 1 && (
              <div className="border-t pt-4 bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MdCurrencyRupee className="text-blue-600" /> Step 1: Credit Check
                </h3>
                {creditCheck ? (
                  <div className="space-y-2 text-sm">
                    <p>Credit Limit: <span className="font-semibold">₹{creditCheck.creditLimit?.toLocaleString('en-IN')}</span></p>
                    <p>Outstanding: <span className="font-semibold">₹{creditCheck.outstanding?.toLocaleString('en-IN')}</span></p>
                    <p>Available: <span className="font-semibold">₹{creditCheck.availableCredit?.toLocaleString('en-IN')}</span></p>
                    <p className={creditCheck.creditCheckPassed ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {creditCheck.creditCheckPassed ? '✓ Credit Check Passed' : '✗ Credit Check Failed'}
                    </p>
                  </div>
                ) : (
                  <button onClick={handleCheckCredit} className={btnPrimary}>
                    Check Credit Limit
                  </button>
                )}
              </div>
            )}

            {/* Step 2: Approval */}
            {currentStep === 2 && (
              <div className="border-t pt-4 bg-amber-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MdCheck className="text-amber-600" /> Step 2: Approval Workflow
                </h3>
                <p className="text-sm text-gray-600 mb-3">Multi-level approval based on order value and client tier</p>
                <button onClick={handleApprove} className={btnPrimary}>
                  Proceed with Approval
                </button>
              </div>
            )}

            {/* Step 3: Inventory Check */}
            {currentStep === 3 && (
              <div className="border-t pt-4 bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MdLocalShipping className="text-orange-600" /> Step 3: Inventory Check
                </h3>
                {inventoryCheck ? (
                  <div className="space-y-2">
                    {inventoryCheck.items?.map((item, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-orange-200 text-sm">
                        <p className="font-semibold">{item.itemName} ({item.sku})</p>
                        <p className="text-gray-600">Required: {item.required} | Available: {item.available}</p>
                        <p className={item.status === 'In Stock' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {item.status}
                        </p>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      {inventoryCheck.inventoryStatus === 'In Stock' && (
                        <button onClick={() => setCurrentStep(5)} className={btnPrimary}>
                          Proceed to Delivery
                        </button>
                      )}
                      {(inventoryCheck.inventoryStatus === 'Partial Stock' || inventoryCheck.inventoryStatus === 'Out of Stock') && (
                        <button onClick={handleCreateWorkOrder} className={btnPrimary}>
                          Create Work Order
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={handleCheckInventory} className={btnPrimary}>
                    Check Inventory
                  </button>
                )}
              </div>
            )}

            {/* Step 4: Production */}
            {currentStep === 4 && (
              <div className="border-t pt-4 bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Step 4: Production Work Order</h3>
                <p className="text-sm text-gray-600 mb-3">Work order created for shortage. Waiting for production completion...</p>
                <button onClick={() => setCurrentStep(5)} className={btnPrimary}>
                  Production Complete - Proceed to Delivery
                </button>
              </div>
            )}

            {/* Step 5: Delivery Scheduling */}
            {currentStep === 5 && (
              <div className="border-t pt-4 bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MdLocalShipping className="text-green-600" /> Step 5: Delivery Scheduling
                </h3>
                <div className="space-y-3">
                  {/* Auto-populated items */}
                  <div className="bg-white p-3 rounded border border-green-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">📦 ORDER ITEMS (Auto-populated)</p>
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span>{item.itemName} ({item.sku})</span>
                        <span className="font-semibold">Qty: {item.qty}</span>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t font-semibold text-sm text-green-700">
                      Total Items: {selectedOrder.items?.length} | Total Qty: {selectedOrder.items?.reduce((sum, i) => sum + i.qty, 0)}
                    </div>
                  </div>

                  {/* Delivery form */}
                  <div className="space-y-2">
                    <div>
                      <label className={labelCls}>Delivery Date</label>
                      <input
                        type="date"
                        value={deliveryForm.deliveryDate}
                        onChange={(e) => setDeliveryForm({...deliveryForm, deliveryDate: e.target.value})}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Time Slot</label>
                      <select
                        value={deliveryForm.slot}
                        onChange={(e) => setDeliveryForm({...deliveryForm, slot: e.target.value})}
                        className={inputCls}
                      >
                        <option>Morning (9AM-12PM)</option>
                        <option>Afternoon (12PM-3PM)</option>
                        <option>Evening (3PM-6PM)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Warehouse</label>
                      <select
                        value={deliveryForm.warehouse}
                        onChange={(e) => setDeliveryForm({...deliveryForm, warehouse: e.target.value})}
                        className={inputCls}
                      >
                        <option>WH-01</option>
                        <option>WH-02</option>
                        <option>WH-03</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Vehicle (Optional)</label>
                      <input
                        type="text"
                        placeholder="Vehicle ID or leave blank for auto-assign"
                        value={deliveryForm.vehicle}
                        onChange={(e) => setDeliveryForm({...deliveryForm, vehicle: e.target.value})}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <button onClick={handleScheduleDelivery} className={btnPrimary}>
                    Schedule Delivery
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Invoice */}
            {currentStep === 6 && (
              <div className="border-t pt-4 bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MdDescription className="text-purple-600" /> Step 6: Invoice Generation
                </h3>
                {selectedOrder.invoiceId ? (
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-green-600 font-semibold">✓ Invoice Generated</p>
                    <p className="text-sm text-gray-600">Invoice ID: {selectedOrder.invoiceId}</p>
                  </div>
                ) : (
                  <button onClick={handleGenerateInvoice} className={btnPrimary}>
                    Generate Invoice & Sync to Tally
                  </button>
                )}
              </div>
            )}

            {/* Completion */}
            {currentStep > 6 && (
              <div className="border-t pt-4 bg-green-50 p-4 rounded-lg text-center">
                <p className="text-lg font-bold text-green-600">✓ Order Processing Complete!</p>
                <p className="text-sm text-gray-600 mt-2">All 6 steps completed successfully</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
