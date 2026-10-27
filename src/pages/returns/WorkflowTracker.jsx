import { useState, useEffect } from 'react';
import { materialReturnApi } from '../../api/materialReturnApi';
import { toast } from '../../components/common/Toast';

const WORKFLOW_STAGES = [
  { key: 'Return_Created', label: 'Return Created', color: '#6b7280' },
  { key: 'Invoice_Validation', label: 'Invoice Validation', color: '#f59e0b' },
  { key: 'Tracking_Start', label: 'Tracking Start', color: '#3b82f6' },
  { key: 'Warehouse_Receiving', label: 'Warehouse Receiving', color: '#8b5cf6' },
  { key: 'QC_Check', label: 'QC Check', color: '#10b981' },
  { key: 'Stock_Ledger_Entry', label: 'Stock Ledger Entry', color: '#059669' },
  { key: 'Finance_Settlement', label: 'Finance Settlement', color: '#dc2626' },
  { key: 'Reconciliation_Engine', label: 'Reconciliation Engine', color: '#7c3aed' },
  { key: 'Tally_Sync', label: 'Tally Sync', color: '#16a34a' }
];

export default function WorkflowTracker({ returnId, currentStage, onUpdate }) {
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (returnId) {
      fetchWorkflowData();
    }
  }, [returnId]);

  const fetchWorkflowData = async () => {
    setLoading(true);
    try {
      const response = await materialReturnApi.getWorkflowStatus(returnId);
      setWorkflowData(response.data);
    } catch (error) {
      console.error('Error fetching workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processNextStage = async (stageKey) => {
    setProcessing(true);
    try {
      await materialReturnApi.processWorkflowStage(returnId, stageKey);
      await fetchWorkflowData();
      if (onUpdate) onUpdate();
      toast(`Stage ${stageKey} processed successfully`);
    } catch (error) {
      toast(error.message || 'Error processing stage', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="text-xs text-gray-500">Loading workflow data...</div>
      </div>
    );
  }

  if (!workflowData) {
    return (
      <div className="text-center py-4">
        <div className="text-xs text-gray-500">No workflow data available</div>
      </div>
    );
  }

  const currentStageIndex = WORKFLOW_STAGES.findIndex(stage => 
    workflowData.currentWorkflowStage === stage.key
  );

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-gray-600 mb-2">
        Workflow Progress ({workflowData.currentWorkflowStage})
      </div>
      
      {/* Progress Bar */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-2">
        {WORKFLOW_STAGES.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isNext = index === currentStageIndex + 1;
          
          return (
            <div key={stage.key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center">
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isCurrent 
                        ? 'border-red-600 text-red-700 bg-red-50' 
                        : 'border-gray-200 text-gray-400 bg-white'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div 
                  className={`text-[9px] mt-1 font-medium text-center max-w-[60px] leading-tight ${
                    isCurrent ? 'text-red-700' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </div>
              </div>
              {index < WORKFLOW_STAGES.length - 1 && (
                <div className={`h-0.5 w-4 mx-1 rounded ${
                  index < currentStageIndex ? 'bg-green-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Stage Details */}
      {workflowData.stageDetails && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-700 mb-1">Current Stage Details:</div>
          <div className="text-xs text-gray-600">
            <div>Stage: {workflowData.stageDetails.stageName}</div>
            <div>Status: {workflowData.stageDetails.status}</div>
            {workflowData.stageDetails.assignedTo && (
              <div>Assigned: {workflowData.stageDetails.assignedTo}</div>
            )}
            {workflowData.stageDetails.lastUpdated && (
              <div>Updated: {new Date(workflowData.stageDetails.lastUpdated).toLocaleString()}</div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      {currentStageIndex < WORKFLOW_STAGES.length - 1 && (
        <button
          onClick={() => processNextStage(WORKFLOW_STAGES[currentStageIndex + 1].key)}
          disabled={processing}
          className="w-full py-2 px-3 text-xs font-semibold rounded-lg border-none cursor-pointer transition-all"
          style={{
            background: processing ? '#9ca3af' : 'linear-gradient(135deg,#f59e0b,#d97706)',
            color: '#fff'
          }}
        >
          {processing ? 'Processing...' : `→ Process ${WORKFLOW_STAGES[currentStageIndex + 1].label}`}
        </button>
      )}

      {/* Workflow Complete */}
      {currentStageIndex === WORKFLOW_STAGES.length - 1 && (
        <div className="text-center py-2 px-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-xs font-semibold text-green-700">✓ Workflow Complete</div>
        </div>
      )}
    </div>
  );
}