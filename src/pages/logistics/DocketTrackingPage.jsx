import React, { useState, useEffect, useCallback } from 'react';
import { 
  MdSearch, MdVisibility, MdRefresh, MdLocalShipping, MdInventory, MdCheckCircle, 
  MdWarning, MdLocationOn, MdHistory, MdPrint, MdMap, MdPerson, MdPhone, MdAssignment
} from 'react-icons/md';
import PageShell from '../../components/common/PageShell';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import docketTrackingApi from '../../api/docketTrackingApi';

const DocketTrackingPage = () => {
  const [dockets, setDockets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedDocket, setSelectedDocket] = useState(null);

  const fetchDockets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await docketTrackingApi.getAllDockets({
        search: searchTerm,
        stage: statusFilter !== 'all' ? statusFilter : undefined
      });
      setDockets(response.data || []);
    } catch (error) {
      toast('Error fetching dockets', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchDockets();
  }, [fetchDockets]);

  const getStageColor = (stage) => {
    const s = stage?.toUpperCase();
    if (s.includes('DOCKET')) return 'blue';
    if (s.includes('ASSIGN')) return 'amber';
    if (s.includes('PICKUP') || s.includes('TRANSIT')) return 'orange';
    if (s.includes('ARRIVED') || s.includes('RECEIVED')) return 'green';
    return 'gray';
  };

  const columns = [
    {
      key: 'docketId',
      label: 'Docket ID',
      render: (v) => <span className="font-bold text-blue-700">{v || 'TBD'}</span>
    },
    {
      key: 'mrId',
      label: 'MR ID',
      render: (v) => <span className="font-bold">{v}</span>
    },
    {
      key: 'supplierName',
      label: 'Supplier/Party',
      render: (v, row) => (
        <div>
          <div className="font-bold text-gray-800">{v || row.customerName}</div>
          <div className="text-[10px] text-gray-500 uppercase">{row.invoiceNo}</div>
        </div>
      )
    },
    {
      key: 'pickupAddress',
      label: 'Source/Dest',
      render: (v, row) => (
        <div className="text-[11px]">
          <div className="flex items-center gap-1 text-gray-600"><MdLocationOn size={12} className="text-red-500" /> {v || 'Source'}</div>
          <div className="flex items-center gap-1 text-gray-400 mt-1"><MdLocationOn size={12} /> {row.warehouseName || 'Destination'}</div>
        </div>
      )
    },
    {
      key: 'productName',
      label: 'Product/Qty',
      render: (v, row) => (
        <div>
          <div className="text-[11px] font-bold truncate max-w-[150px]">{v}</div>
          <div className="text-[10px] text-gray-500">{row.returnQty} Units • ₹{row.value?.toLocaleString()}</div>
        </div>
      )
    },
    {
      key: 'vehicleNo',
      label: 'Logistics',
      render: (v, row) => (
        <div className="text-[11px]">
          <div className="font-bold">{v || row.courierName || 'Unassigned'}</div>
          <div className="text-gray-500">{row.driverName || row.awbNo || '-'}</div>
        </div>
      )
    },
    {
      key: 'currentStage',
      label: 'Stage/Status',
      render: (v, row) => (
        <div>
          <StatusBadge status={v?.replace(/_/g, ' ')} color={getStageColor(v)} />
          <div className="text-[10px] text-gray-400 mt-1 italic">{row.trackingStatus || 'No status'}</div>
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Aging',
      render: (v) => {
        const days = Math.floor((new Date() - new Date(v)) / (1000 * 60 * 60 * 24));
        return <span className={`text-xs font-bold ${days > 3 ? 'text-red-600' : 'text-gray-600'}`}>{days} Days</span>
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setSelectedDocket(row); setShowViewModal(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="View Details"><MdVisibility size={14} /></button>
          <button onClick={() => { setSelectedDocket(row); setShowTimelineModal(true); }} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all" title="View Timeline"><MdHistory size={14} /></button>
          <button onClick={() => window.print()} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-900 hover:text-white transition-all" title="Print Docket"><MdPrint size={14} /></button>
        </div>
      )
    }
  ];

  return (
    <PageShell title="Docket Tracking" subtitle="Enterprise Logistics & Return Lifecycle Monitoring">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Docket ID, MR ID, Supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-600 outline-none"
          >
            <option value="all">All Stages</option>
            <option value="DOCKET_CREATED">Docket Created</option>
            <option value="VEHICLE_ASSIGNED">Vehicle Assigned</option>
            <option value="OUT_FOR_PICKUP">Out for Pickup</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="ARRIVED">Arrived</option>
            <option value="RECEIVED">Received</option>
          </select>
          
          <button onClick={fetchDockets} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all"><MdRefresh size={20} /></button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <DataTable columns={columns} data={dockets} loading={loading} emptyMessage="No active dockets found in logistics pipeline" />
      </div>

      {/* View Details Modal */}
      <Modal open={showViewModal} onClose={() => setShowViewModal(false)} title={`Docket Details: ${selectedDocket?.docketId}`} size="xl">
        {selectedDocket && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Material Info</h4>
              <DetailItem label="MR ID" value={selectedDocket.mrId} />
              <DetailItem label="Invoice No" value={selectedDocket.invoiceNo} />
              <DetailItem label="Product" value={selectedDocket.productName} />
              <DetailItem label="Qty" value={`${selectedDocket.returnQty} Units`} />
              <DetailItem label="Value" value={`₹${selectedDocket.value?.toLocaleString()}`} />
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest border-b pb-2">Logistics Info</h4>
              <DetailItem label="Vehicle No" value={selectedDocket.vehicleNo || 'TBD'} />
              <DetailItem label="Driver" value={selectedDocket.driverName || 'TBD'} />
              <DetailItem label="Driver Mobile" value={selectedDocket.driverMobile || 'TBD'} />
              <DetailItem label="Courier/AWB" value={selectedDocket.courierName ? `${selectedDocket.courierName} / ${selectedDocket.awbNo}` : 'TBD'} />
              <DetailItem label="ETA" value={selectedDocket.eta ? new Date(selectedDocket.eta).toLocaleDateString() : 'TBD'} />
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black text-green-600 uppercase tracking-widest border-b pb-2">Status & Locations</h4>
              <DetailItem label="Current Stage" value={selectedDocket.currentStage?.replace(/_/g, ' ')} />
              <DetailItem label="Live Status" value={selectedDocket.trackingStatus} />
              <DetailItem label="Pickup From" value={selectedDocket.pickupAddress} />
              <DetailItem label="Destination" value={selectedDocket.warehouseName} />
            </div>
          </div>
        )}
      </Modal>

      {/* Timeline Modal */}
      <Modal open={showTimelineModal} onClose={() => setShowTimelineModal(false)} title="Tracking Timeline" size="lg">
        {selectedDocket && (
          <div className="space-y-6 py-4">
            {selectedDocket.stageTimeline?.map((step, i) => (
              <div key={i} className="flex gap-4 relative">
                {i !== selectedDocket.stageTimeline.length - 1 && <div className="absolute left-2.5 top-6 bottom-[-24px] w-0.5 bg-gray-100" />}
                <div className={`w-5 h-5 rounded-full mt-1 z-10 flex items-center justify-center border-4 border-white shadow-sm ${i === selectedDocket.stageTimeline.length - 1 ? 'bg-green-500 animate-pulse' : 'bg-blue-400'}`} />
                <div>
                  <div className="text-sm font-bold text-gray-800">{step.stage?.replace(/_/g, ' ')}</div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>{new Date(step.timestamp).toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-bold text-blue-600">{step.user}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">{step.remarks}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </PageShell>
  );
};

const DetailItem = ({ label, value }) => (
  <div>
    <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{label}</div>
    <div className="text-sm font-bold text-gray-700 mt-0.5">{value || '—'}</div>
  </div>
);

export default DocketTrackingPage;
