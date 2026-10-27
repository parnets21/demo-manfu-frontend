import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materialReturnApi } from '../../api/materialReturnApi';
import { toast } from '../../components/common/Toast';
import PageHeader from '../../components/common/PageHeader';

const RETURN_STAGES = [
  { key: 'Initiated', label: 'Initiated', description: 'Return request created' },
  { key: 'Approved', label: 'Approved', description: 'Return approved by manager' },
  { key: 'Pickup_Done', label: 'Pickup done', description: 'Item picked up from location' },
  { key: 'In_Transit', label: 'In transit', description: 'Package in transit' },
  { key: 'QC_Check', label: 'QC check', description: 'Quality check pending' },
  { key: 'Closed', label: 'Closed', description: 'Return process completed' }
];

const FINANCIAL_STATUS_ITEMS = [
  { key: 'creditNote', label: 'Credit note', defaultValue: 'Not generated' },
  { key: 'debitNote', label: 'Debit note', defaultValue: 'N/A' },
  { key: 'gstAdjustment', label: 'GST adjustment', defaultValue: 'Pending' },
  { key: 'tallySync', label: 'Tally sync', defaultValue: 'Pending' },
  { key: 'reconciliation', label: 'Reconciliation', defaultValue: 'Open' }
];

export default function ReturnRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityTimeline, setActivityTimeline] = useState([]);

  useEffect(() => {
    if (id) {
      fetchReturnDetails();
    }
  }, [id]);

  const fetchReturnDetails = async () => {
    setLoading(true);
    try {
      // Since we don't have a specific API for single return, we'll get all and filter
      const response = await materialReturnApi.getAll();
      const returnItem = response.data?.find(item => item._id === id || item.mrId === id);
      
      if (returnItem) {
        setReturnData(returnItem);
        generateActivityTimeline(returnItem);
      } else {
        toast('Return request not found', 'error');
        navigate('/returns');
      }
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast('Error loading return details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateActivityTimeline = (data) => {
    const timeline = [];
    
    // Add initial creation
    timeline.push({
      title: 'Return initiated',
      description: `By ${data.createdBy || 'System'} (${data.partyType || 'Dealer'})`,
      timestamp: data.createdAt || new Date().toISOString(),
      status: 'completed',
      icon: '●'
    });

    // Add approval if approved
    if (data.stage !== 'Initiated') {
      timeline.push({
        title: 'Approved by sales manager',
        description: `${data.approvedBy || 'Ramesh Gupta'} • ${new Date().toLocaleDateString()} • Note: "Valid damage claim"`,
        timestamp: data.approvedAt || new Date().toISOString(),
        status: 'completed',
        icon: '●'
      });
    }

    // Add pickup if beyond approved
    if (['Pickup_Done', 'In_Transit', 'QC_Check', 'Closed'].includes(data.stage)) {
      timeline.push({
        title: 'Courier pickup assigned',
        description: `Delivery • AWB: ${data.awbNo || '1234567890'} • ${new Date().toLocaleDateString()}, 9:00 AM`,
        timestamp: data.pickupAt || new Date().toISOString(),
        status: 'completed',
        icon: '●'
      });
    }

    // Add in transit if current or beyond
    if (['In_Transit', 'QC_Check', 'Closed'].includes(data.stage)) {
      timeline.push({
        title: 'Parcel picked up — in transit',
        description: `Delivery scan at ${data.pickupLocation || 'Bengaluru hub'} • ${new Date().toLocaleDateString()}, 4:45 PM`,
        timestamp: data.transitAt || new Date().toISOString(),
        status: data.stage === 'In_Transit' ? 'current' : 'completed',
        icon: data.stage === 'In_Transit' ? '●' : '●'
      });
    }

    // Add QC pending if current stage or beyond
    if (['QC_Check', 'Closed'].includes(data.stage)) {
      timeline.push({
        title: 'QC inspection — pending',
        description: `Expected arrival: ${new Date(Date.now() + 24*60*60*1000).toLocaleDateString()}`,
        timestamp: data.qcAt || new Date().toISOString(),
        status: data.stage === 'QC_Check' ? 'pending' : 'completed',
        icon: '○'
      });
    }

    setActivityTimeline(timeline);
  };

  const getCurrentStageIndex = () => {
    return RETURN_STAGES.findIndex(stage => stage.key === returnData?.stage) || 0;
  };

  const getFinancialStatusValue = (key) => {
    switch (key) {
      case 'creditNote':
        return returnData?.creditNoteId || 'Not generated';
      case 'debitNote':
        return returnData?.debitNoteId || 'N/A';
      case 'gstAdjustment':
        return returnData?.gstAdjustment || 'Pending';
      case 'tallySync':
        return returnData?.tallySync || 'Pending';
      case 'reconciliation':
        return returnData?.reconciliation || 'Open';
      default:
        return 'N/A';
    }
  };

  const getFinancialStatusColor = (key, value) => {
    if (value === 'Not generated' || value === 'Pending' || value === 'Open') {
      return '#f59e0b'; // Orange
    }
    if (value === 'N/A') {
      return '#6b7280'; // Gray
    }
    return '#10b981'; // Green
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-600">Loading return details...</div>
        </div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-600">Return request not found</div>
          <button 
            onClick={() => navigate('/returns')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Returns
          </button>
        </div>
      </div>
    );
  }

  const currentStageIndex = getCurrentStageIndex();
  const currentStage = RETURN_STAGES[currentStageIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title={returnData.mrId || 'Return Request'}
        subtitle={`Sales return • Created ${new Date(returnData.createdAt).toLocaleDateString()} • By ${returnData.createdBy || 'Priya Sharma'}`}
        onBack={() => navigate('/returns/material')}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Status Badge */}
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
            {currentStage?.label || 'Unknown'}
          </div>
        </div>

        {/* Stage Tracker */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4 overflow-x-auto">
            {RETURN_STAGES.map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;

              return (
                <div key={stage.key} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    {/* Stage Circle */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2
                      ${isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isCurrent 
                          ? 'bg-red-600 border-red-600 text-white' 
                          : 'border-gray-300 text-gray-400 bg-white'
                      }
                    `}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    
                    {/* Stage Label */}
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-semibold ${
                        isCurrent ? 'text-red-700' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {stage.label}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isCurrent ? 'text-red-600 font-semibold' : isCompleted ? 'text-green-500' : 'text-gray-400'
                      }`}>
                        {isCurrent ? 'Now' : isCompleted ? new Date().toLocaleDateString().split('/').slice(0,2).join(' ') : '—'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connector Line */}
                  {index < RETURN_STAGES.length - 1 && (
                    <div className={`h-0.5 w-16 mx-4 ${
                      index < currentStageIndex ? 'bg-green-400' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Party Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">PARTY DETAILS</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Party name</span>
                  <span className="font-semibold">{returnData.supplierName || 'Amit Kumar'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Party type</span>
                  <span className="font-semibold">{returnData.partyType || 'Dealer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice no.</span>
                  <span className="font-semibold text-red-600">{returnData.invoiceNo || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice amount</span>
                  <span className="font-semibold">₹{returnData.invoiceAmount ? returnData.invoiceAmount.toLocaleString('en-IN') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Return amount</span>
                  <span className="font-semibold">₹{returnData.value ? returnData.value.toLocaleString('en-IN') : '—'}</span>
                </div>
              </div>
            </div>

            {/* Items in Return */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">ITEMS IN THIS RETURN</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-semibold text-gray-600">SKU</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-600">Product name</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-600">Return qty</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-600">Unit price</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-600">Total</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-600">Reason</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-600">QC result</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-sm font-semibold">SKU-7644</td>
                      <td className="py-3 text-sm">{returnData.productName || 'Product 764443'}</td>
                      <td className="py-3 text-sm">{returnData.returnQty || 3}</td>
                      <td className="py-3 text-sm">₹{((returnData.value || 4200) / (returnData.returnQty || 3)).toLocaleString('en-IN')}</td>
                      <td className="py-3 text-sm font-semibold">₹{Math.floor((returnData.value || 4200) * 0.7).toLocaleString('en-IN')}</td>
                      <td className="py-3 text-sm">{returnData.reason || 'Damaged'}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold">
                          Pending
                        </span>
                      </td>
                    </tr>
                    {returnData.items > 1 && (
                      <tr className="border-b border-gray-100">
                        <td className="py-3 text-sm font-semibold">SKU-8821</td>
                        <td className="py-3 text-sm">Cloth item</td>
                        <td className="py-3 text-sm">2</td>
                        <td className="py-3 text-sm">₹600</td>
                        <td className="py-3 text-sm font-semibold">₹1,200</td>
                        <td className="py-3 text-sm">Wrong item</td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold">
                            Pending
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Financial Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">FINANCIAL STATUS</h3>
              <div className="space-y-3">
                {FINANCIAL_STATUS_ITEMS.map((item) => {
                  const value = getFinancialStatusValue(item.key);
                  const color = getFinancialStatusColor(item.key, value);
                  
                  return (
                    <div key={item.key} className="flex justify-between">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-semibold" style={{ color }}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">ACTIVITY TIMELINE</h3>
              <div className="space-y-4">
                {activityTimeline.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`
                      w-3 h-3 rounded-full mt-1 flex-shrink-0
                      ${activity.status === 'completed' 
                        ? 'bg-red-600' 
                        : activity.status === 'current' 
                          ? 'bg-blue-600' 
                          : 'bg-gray-300'
                      }
                    `} />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm">
                        {activity.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}