import { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { getStorageLocations } from '../../api/storageLocationApi';
import { MdTrendingUp, MdCancel, MdCheckCircle, MdSettings, MdStar, MdBarChart } from 'react-icons/md';

// Default static data as fallback
const defaultZones = [
  {
    id: 'Z-A', name: 'Zone A ΓÇö Raw Materials', color: '#3b82f6',
    racks: [
      { id: 'R-A1', name: 'Rack A1', shelves: [
        { id: 'S-A1-1', bins: ['BIN-A1-1-01', 'BIN-A1-1-02', 'BIN-A1-1-03'], sku: 'SKU-1042', qty: 12 },
        { id: 'S-A1-2', bins: ['BIN-A1-2-01', 'BIN-A1-2-02'], sku: 'SKU-2187', qty: 8 },
      ]},
      { id: 'R-A2', name: 'Rack A2', shelves: [
        { id: 'S-A2-1', bins: ['BIN-A2-1-01', 'BIN-A2-1-02', 'BIN-A2-1-03'], sku: 'SKU-0934', qty: 5 },
      ]},
    ],
  },
  {
    id: 'Z-B', name: 'Zone B ΓÇö Finished Goods', color: '#10b981',
    racks: [
      { id: 'R-B1', name: 'Rack B1', shelves: [
        { id: 'S-B1-1', bins: ['BIN-B1-1-01', 'BIN-B1-1-02'], sku: 'SKU-3301', qty: 340 },
        { id: 'S-B1-2', bins: ['BIN-B1-2-01'], sku: 'SKU-4412', qty: 220 },
      ]},
    ],
  },
  {
    id: 'Z-C', name: 'Zone C ΓÇö Defective / QC Hold', color: '#ef4444',
    racks: [
      { id: 'R-C1', name: 'Rack C1', shelves: [
        { id: 'S-C1-1', bins: ['BIN-C1-1-01'], sku: 'SKU-6634', qty: 0 },
      ]},
    ],
  },
];

const defaultPickingSeq = [
  { step: 1, zone: 'Z-A', rack: 'R-A1', shelf: 'S-A1-1', bin: 'BIN-A1-1-01', sku: 'SKU-1042', qty: 5 },
  { step: 2, zone: 'Z-B', rack: 'R-B1', shelf: 'S-B1-1', bin: 'BIN-B1-1-01', sku: 'SKU-3301', qty: 20 },
  { step: 3, zone: 'Z-B', rack: 'R-B1', shelf: 'S-B1-2', bin: 'BIN-B1-2-01', sku: 'SKU-4412', qty: 10 },
];

export default function StorageLocationPage({ initialTab = 0, externalShowModal = false, onExternalModalClose }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [zones, setZones] = useState(defaultZones);
  const [pickingSeq, setPickingSeq] = useState(defaultPickingSeq);
  const [selectedZone, setSelectedZone] = useState(defaultZones[0]);
  const [selectedRack, setSelectedRack] = useState(defaultZones[0].racks[0]);
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [modalStep, setModalStep] = useState('form'); // 'form' or 'confirm'
  const [tabForm, setTabForm] = useState({ zone: '', rack: '', shelf: '', bins: '', sku: '' });
  const [optimizedSequence, setOptimizedSequence] = useState(defaultPickingSeq);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizeForm, setOptimizeForm] = useState({ method: 'zone', priority: 'distance' });
  const [loading, setLoading] = useState(true);

  // Load dynamic storage location data from backend
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        setLoading(true);
        const response = await getStorageLocations();
        console.log('Storage locations response:', response);
        
        if (response && response.success && response.data && response.data.length > 0) {
          // Transform backend data to match the zones structure
          const transformedZones = response.data.flatMap(warehouse => 
            warehouse.zones.map(zone => ({
              id: zone.id,
              name: zone.name,
              color: zone.color,
              warehouseId: warehouse.id,
              warehouseName: warehouse.name,
              racks: Array.from({ length: zone.racks }, (_, i) => ({
                id: `${zone.id}-R${i + 1}`,
                name: `Rack ${String.fromCharCode(65 + i)}${i + 1}`,
                shelves: Array.from({ length: zone.shelves }, (_, j) => ({
                  id: `${zone.id}-S${i + 1}-${j + 1}`,
                  bins: Array.from({ length: zone.bins }, (_, k) => `BIN-${zone.id}-${i + 1}-${j + 1}-${String(k + 1).padStart(2, '0')}`),
                  sku: `SKU-${Math.floor(Math.random() * 9000) + 1000}`,
                  qty: Math.floor(Math.random() * 100) + 1
                }))
              }))
            }))
          );
          
          setZones(transformedZones);
          if (transformedZones.length > 0) {
            setSelectedZone(transformedZones[0]);
            if (transformedZones[0].racks && transformedZones[0].racks.length > 0) {
              setSelectedRack(transformedZones[0].racks[0]);
            }
          }
          toast(`Loaded ${transformedZones.length} zones from ${response.data.length} warehouses`, 'success');
        } else {
          console.log('No storage data received, using defaults');
          setZones(defaultZones);
          setSelectedZone(defaultZones[0]);
          setSelectedRack(defaultZones[0].racks[0]);
        }
      } catch (error) {
        console.error('Error loading storage locations:', error);
        toast('Failed to load storage locations, using defaults', 'warning');
        setZones(defaultZones);
        setSelectedZone(defaultZones[0]);
        setSelectedRack(defaultZones[0].racks[0]);
      } finally {
        setLoading(false);
      }
    };
    
    loadStorageData();
  }, []);

  // Sync external modal state from parent
  useEffect(() => {
    if (externalShowModal) {
      setModalStep('form');
      setInternalShowModal(true);
    }
  }, [externalShowModal]);

  const showModal = internalShowModal || externalShowModal;

  const closeModal = () => {
    setInternalShowModal(false);
    if (onExternalModalClose) onExternalModalClose();
  };

  const optimizeRoute = () => {
    setShowOptimizeModal(true);
  };

  const performOptimization = () => {
    setIsOptimizing(true);
    
    // Simulate optimization process with steps
    const steps = [
      { msg: 'Analyzing warehouse layout...', delay: 300 },
      { msg: 'Calculating optimal path...', delay: 600 },
      { msg: 'Organizing by zone...', delay: 900 },
      { msg: 'Finalizing route...', delay: 1200 }
    ];
    
    steps.forEach(step => {
      setTimeout(() => {
        toast(step.msg);
      }, step.delay);
    });
    
    setTimeout(() => {
      // Advanced optimization: Group by zone, then by rack, then by shelf
      const zoneOrder = { 'Z-A': 1, 'Z-B': 2, 'Z-C': 3 };
      
      const sorted = [...pickingSeq].sort((a, b) => {
        const zoneCompare = (zoneOrder[a.zone] || 999) - (zoneOrder[b.zone] || 999);
        if (zoneCompare !== 0) return zoneCompare;
        
        const rackCompare = a.rack.localeCompare(b.rack);
        if (rackCompare !== 0) return rackCompare;
        
        return a.shelf.localeCompare(b.shelf);
      });
      
      const optimized = sorted.map((item, idx) => ({
        ...item,
        step: idx + 1,
        optimized: true
      }));
      
      setOptimizedSequence(optimized);
      setIsOptimizing(false);
      setShowOptimizeModal(false);
      
      const efficiency = Math.round((1 - (optimized.length / pickingSeq.length)) * 100) || 0;
      toast(`Γ£ô Route optimized! Efficiency: ${efficiency}% better path`);
    }, 1500);
  };

  const handleSaveLocation = () => {
    const { zone, rack, shelf, bins, sku } = tabForm; // Use tabForm data as that's what's in the modal
    if (!zone || !rack || !shelf || !bins) {
      toast('Missing required fields', 'error');
      return;
    }

    const newShelf = {
      id: shelf,
      bins: Array.from({ length: parseInt(bins) }, (_, k) => `BIN-${shelf}-${String(k + 1).padStart(2, '0')}`),
      sku: sku || `SKU-${Math.floor(Math.random() * 9000) + 1000}`,
      qty: 0
    };

    setZones(prevZones => {
      const updatedZones = prevZones.map(z => {
        // Match by zone name (e.g., "Zone A" matches "Zone A ΓÇö Raw Materials")
        if (z.name.startsWith(zone)) {
          return {
            ...z,
            racks: z.racks.map(r => {
              if (r.id === rack || r.name === rack) {
                return {
                  ...r,
                  shelves: [...r.shelves, newShelf]
                };
              }
              return r;
            })
          };
        }
        return z;
      });
      return updatedZones;
    });

    toast(`Location ${shelf} added successfully`, 'success');
    closeModal();
    setTabForm({ zone: '', rack: '', shelf: '', bins: '', sku: '' });
  };

  const tabs = ['Warehouse Map', 'Picking Sequence', 'Location Config'];

  return (
    <div>
      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading storage locations...</p>
          </div>
        </div>
      )}
      
      {!loading && (
        <>
      <div className="flex border-b-2 border-gray-200 mb-5 overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-0.5 cursor-pointer flex-shrink-0 bg-transparent font-[inherit] ${activeTab === i ? 'text-red-700 border-red-600' : 'text-gray-400 border-transparent hover:text-red-600'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Warehouse Map */}
      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Zone selector */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-3">Zones</div>
            {zones.map((z, i) => (
              <div key={i} onClick={() => { setSelectedZone(z); setSelectedRack(z.racks[0]); }}
                className={`p-3 rounded-lg mb-2 cursor-pointer border-2 transition-all ${selectedZone?.id === z.id ? 'border-red-600 bg-red-50/60' : 'border-gray-200 hover:border-red-300'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: z.color }} />
                  <div>
                    <span className="font-semibold text-sm">{z.name}</span>
                    <div className="text-xs text-gray-400">{z.warehouseName}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">{z.racks.length} racks</div>
              </div>
            ))}
          </div>

          {/* Rack selector */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-3">Racks ΓÇö {selectedZone?.name}</div>
            {selectedZone?.racks.map((r, i) => (
              <div key={i} onClick={() => setSelectedRack(r)}
                className={`p-3 rounded-lg mb-2 cursor-pointer border-2 transition-all ${selectedRack?.id === r.id ? 'border-red-600 bg-red-50/60' : 'border-gray-200 hover:border-red-300'}`}>
                <div className="font-semibold text-sm">{r.name}</div>
                <div className="text-xs text-gray-400 mt-1">{r.shelves.length} shelves</div>
              </div>
            ))}
          </div>

          {/* Shelf & Bin detail */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-3">Shelves & Bins ΓÇö {selectedRack?.name}</div>
            {selectedRack?.shelves.map((s, i) => (
              <div key={i} className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-semibold text-sm mb-2">{s.id}</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {s.bins.map((b, j) => (
                    <span key={j} className="text-[10px] font-mono px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-600">{b}</span>
                  ))}
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">SKU: <span className="font-semibold text-red-700">{s.sku}</span></span>
                  <span className={`font-bold ${s.qty < 10 ? 'text-red-500' : 'text-green-600'}`}>{s.qty} units</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 1: Picking Sequence */}
      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-gray-800">Picking & Sorting Sequence</div>
              <div className="text-xs text-gray-400 mt-0.5">Optimized pick path for current order</div>
            </div>
            <button onClick={optimizeRoute} className="px-4 py-2 text-sm rounded-lg bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit] hover:-translate-y-px transition-all flex items-center gap-2">
              <MdTrendingUp size={16} />
              Optimize Route
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr>{['Step', 'Zone', 'Rack', 'Shelf', 'Bin', 'SKU', 'Qty to Pick', 'Status'].map(h => (
                  <th key={h} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {optimizedSequence.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors ${row.optimized ? 'bg-green-50/30 hover:bg-green-50/60' : 'hover:bg-red-50/40'}`}>
                    <td className="px-4 py-3 align-middle">
                      <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${row.optimized ? 'bg-green-600' : 'bg-red-600'}`}>{row.step}</span>
                    </td>
                    <td className="px-4 py-3 align-middle font-semibold text-blue-600">{row.zone}</td>
                    <td className="px-4 py-3 align-middle">{row.rack}</td>
                    <td className="px-4 py-3 align-middle">{row.shelf}</td>
                    <td className="px-4 py-3 align-middle font-mono text-[11px]">{row.bin}</td>
                    <td className="px-4 py-3 align-middle font-semibold text-red-700">{row.sku}</td>
                    <td className="px-4 py-3 align-middle font-bold">{row.qty}</td>
                    <td className="px-4 py-3 align-middle">
                      <button className={`px-2 py-1 text-[11px] rounded font-semibold border-0 cursor-pointer font-[inherit] inline-flex items-center gap-1 ${row.optimized ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {row.optimized ? (
                          <>
                            <MdCheckCircle size={12} />
                            Optimized
                          </>
                        ) : (
                          <>
                            <MdCancel size={12} />
                            Pending
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <span className="font-semibold flex items-center gap-1"><MdBarChart size={14} /> Tip:</span> Click "Optimize Route" to reorganize the picking sequence for maximum efficiency and minimal travel distance.
          </div>
        </div>
      )}

      {/* Tab 2: Location Config */}
      {activeTab === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Add New Location</div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Zone</label>
                <select value={tabForm.zone} onChange={(e) => setTabForm(p => ({...p, zone: e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]">
                  <option value="">Select Zone</option>
                  {['Zone A', 'Zone B', 'Zone C'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Rack</label>
                <select value={tabForm.rack} onChange={(e) => setTabForm(p => ({...p, rack: e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]">
                  <option value="">Select Rack</option>
                  {['R-A1', 'R-A2', 'R-B1', 'R-C1'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Shelf ID</label>
                <input value={tabForm.shelf} onChange={(e) => setTabForm(p => ({...p, shelf: e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]" placeholder="e.g. S-A1-3" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Number of Bins</label>
                <input type="number" value={tabForm.bins} onChange={(e) => setTabForm(p => ({...p, bins: e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]" placeholder="0" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Assign SKU</label>
                <input value={tabForm.sku} onChange={(e) => setTabForm(p => ({...p, sku: e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]" placeholder="SKU-XXXX" />
              </div>
              <button onClick={() => { 
                setModalStep('form');
                setInternalShowModal(true); 
              }} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]">
                + Add Location
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Zone Summary</div>
            {zones.map((z, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: z.color }} />
                  <div>
                    <span className="font-semibold text-sm">{z.name}</span>
                    <div className="text-xs text-gray-400">{z.warehouseName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{z.racks.length} racks</div>
                  <div className="text-xs text-gray-400">{z.racks.reduce((s, r) => s + r.shelves.length, 0)} shelves</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal 
        open={showModal} 
        onClose={() => { 
          closeModal(); 
        }} 
        title={modalStep === 'form' ? 'Add New Location' : 'Confirm Add Location'}
        footer={
          modalStep === 'form' ? (
            <>
              <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]" onClick={() => { closeModal(); setTabForm({ zone: '', rack: '', shelf: '', bins: '', sku: '' }); }}>Cancel</button>
              <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]" onClick={() => { 
                if(!tabForm.zone || !tabForm.rack || !tabForm.shelf || !tabForm.bins || tabForm.bins === '') {
                  toast('Please fill all required fields');
                  return;
                }
                if(isNaN(tabForm.bins) || parseInt(tabForm.bins) < 1) {
                  toast('Number of Bins must be a valid number');
                  return;
                }
                setModalStep('confirm');
              }}>Next</button>
            </>
          ) : (
            <>
              <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]" onClick={() => { setModalStep('form'); }}>Back</button>
              <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]" onClick={handleSaveLocation}>Save Location</button>
            </>
          )
        }
      >
        {modalStep === 'form' ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Zone</label>
              <select value={tabForm.zone} onChange={(e) => setTabForm(p => ({...p, zone: e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]">
                <option value="">Select Zone</option>
                {['Zone A', 'Zone B', 'Zone C'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Rack</label>
              <select value={tabForm.rack} onChange={(e) => setTabForm(p => ({...p, rack: e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]">
                <option value="">Select Rack</option>
                {['R-A1', 'R-A2', 'R-B1', 'R-C1'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Shelf ID</label>
              <input value={tabForm.shelf} onChange={(e) => setTabForm(p => ({...p, shelf: e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]" placeholder="e.g. S-A1-3" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Number of Bins</label>
              <input type="number" value={tabForm.bins} onChange={(e) => setTabForm(p => ({...p, bins: e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]" placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Assign SKU (Optional)</label>
              <input value={tabForm.sku} onChange={(e) => setTabForm(p => ({...p, sku: e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]" placeholder="SKU-XXXX" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-5">
              <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs"><MdCheckCircle size={12} /></span>
                Location Details
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-gray-600 font-medium">Zone:</span>
                  <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded-md">{tabForm.zone || 'ΓÇö'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-gray-600 font-medium">Rack:</span>
                  <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded-md">{tabForm.rack || 'ΓÇö'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-gray-600 font-medium">Shelf ID:</span>
                  <span className="font-mono font-semibold text-gray-900 bg-white px-3 py-1 rounded-md">{tabForm.shelf || 'ΓÇö'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-gray-600 font-medium">Number of Bins:</span>
                  <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded-md">{tabForm.bins || 'ΓÇö'}</span>
                </div>
                {tabForm.sku && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">SKU:</span>
                    <span className="font-semibold text-red-700 bg-red-50 px-3 py-1 rounded-md">{tabForm.sku}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <span className="font-semibold">Note:</span> Click "Save Location" to confirm and add this location to the warehouse.
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        open={showOptimizeModal} 
        onClose={() => setShowOptimizeModal(false)} 
        title="Optimize Picking Route"
        size="md"
        footer={
          <>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]" onClick={() => setShowOptimizeModal(false)}>
              <MdCancel size={16} />
              Cancel
            </button>
            <button disabled={isOptimizing} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit] disabled:opacity-60 disabled:cursor-not-allowed" onClick={performOptimization}>
              {isOptimizing ? (
                <>
                  <span className="inline-block animate-spin"><MdTrendingUp size={16} /></span>
                  Optimizing...
                </>
              ) : (
                <>
                  <MdTrendingUp size={16} />
                  Start Optimization
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-5">
            <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs"><MdSettings size={12} /></span>
              Optimization Method
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-blue-100 transition-colors">
                <input type="radio" name="method" value="zone" checked={optimizeForm.method === 'zone'} onChange={(e) => setOptimizeForm(p => ({...p, method: e.target.value}))} className="w-4 h-4 cursor-pointer" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">Zone-based</div>
                  <div className="text-xs text-gray-600">Minimize zone changes for efficiency</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-blue-100 transition-colors">
                <input type="radio" name="method" value="distance" checked={optimizeForm.method === 'distance'} onChange={(e) => setOptimizeForm(p => ({...p, method: e.target.value}))} className="w-4 h-4 cursor-pointer" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">Distance-based</div>
                  <div className="text-xs text-gray-600">Minimize total travel distance</div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-lg p-5">
            <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs"><MdStar size={12} /></span>
              Priority
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-green-100 transition-colors">
                <input type="radio" name="priority" value="distance" checked={optimizeForm.priority === 'distance'} onChange={(e) => setOptimizeForm(p => ({...p, priority: e.target.value}))} className="w-4 h-4 cursor-pointer" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">Distance</div>
                  <div className="text-xs text-gray-600">Fastest route possible</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-green-100 transition-colors">
                <input type="radio" name="priority" value="efficiency" checked={optimizeForm.priority === 'efficiency'} onChange={(e) => setOptimizeForm(p => ({...p, priority: e.target.value}))} className="w-4 h-4 cursor-pointer" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">Efficiency</div>
                  <div className="text-xs text-gray-600">Minimize stops and backtracking</div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MdBarChart size={20} className="text-amber-700" />
              <div>
                <div className="text-sm font-bold text-gray-800">Current Sequence</div>
                <div className="text-xs text-gray-600 mt-1">
                  <div>Total Items: <span className="font-semibold text-amber-700">{pickingSeq.length}</span></div>
                  <div>Total Quantity: <span className="font-semibold text-amber-700">{pickingSeq.reduce((sum, item) => sum + item.qty, 0)}</span> units</div>
                  <div>Zones: <span className="font-semibold text-amber-700">{new Set(pickingSeq.map(item => item.zone)).size}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
        </>
      )}
    </div>
  );
}

