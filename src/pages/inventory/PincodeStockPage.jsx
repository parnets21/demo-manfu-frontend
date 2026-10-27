import { useState, useEffect } from 'react';
import { MdLocationOn } from 'react-icons/md';
import { getPincodeStock } from '../../api/pincodeStockApi';
import { toast } from '../../components/common/Toast';

export default function PincodeStockPage() {
  const [pincodeData, setPincodeData] = useState([]);
  const [selectedPincode, setSelectedPincode] = useState(null);
  const [selectedGodown, setSelectedGodown] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getPincodeStock();
        
        console.log('Raw API response:', response);
        
        // Validate response structure
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response format');
        }
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch data');
        }
        
        if (!Array.isArray(response.data)) {
          console.warn('Response data is not an array:', response.data);
          setPincodeData([]);
          setSelectedPincode(null);
          setSelectedGodown(null);
          return;
        }
        
        // Validate and clean data
        const validData = response.data
          .filter(item => {
            if (!item || typeof item !== 'object') return false;
            if (!item.pincode || typeof item.pincode !== 'string') return false;
            if (!Array.isArray(item.godowns) || item.godowns.length === 0) return false;
            return true;
          })
          .map(item => ({
            pincode: String(item.pincode),
            city: String(item.city || 'Unknown'),
            godowns: item.godowns
              .filter(g => g && typeof g === 'object' && g.id && Array.isArray(g.locations))
              .map(g => ({
                id: String(g.id),
                name: String(g.name || 'Godown'),
                locations: g.locations
                  .filter(loc => loc && typeof loc === 'object')
                  .map(loc => ({
                    sku: String(loc.sku || 'N/A'),
                    name: String(loc.itemName || loc.name || 'Item'),
                    availableQty: Number(loc.availableQty || loc.qty || 0),
                    reservedQty: Number(loc.reservedQty || 0),
                    defectiveQty: Number(loc.defectiveQty || 0),
                    batchNo: String(loc.batchNo || 'N/A'),
                    loc: String(loc.loc || 'N/A'),
                    unit: String(loc.unit || 'Nos'),
                    lastUpdated: String(loc.lastUpdated || 'N/A')
                  }))
              }))
          }));
        
        console.log('Cleaned data:', validData);
        
        if (validData.length === 0) {
          setError('No pincode data available');
          setPincodeData([]);
          setSelectedPincode(null);
          setSelectedGodown(null);
          return;
        }
        
        setPincodeData(validData);
        setSelectedPincode(validData[0]);
        setSelectedGodown(validData[0].godowns[0]);
        
      } catch (error) {
        console.error('Error fetching pincode stock:', error);
        setError(error.message || 'Error loading data');
        toast(error.message || 'Error loading pincode stock data');
        setPincodeData([]);
        setSelectedPincode(null);
        setSelectedGodown(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pincode stock data...</p>
        </div>
      </div>
    );
  }

  if (error || !selectedPincode || !selectedGodown) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600">{error || 'No pincode data available'}</p>
        </div>
      </div>
    );
  }

  const filtered = pincodeData.filter(p => {
    if (!p || !p.pincode || !p.city) return false;
    const searchLower = search.toLowerCase();
    return p.pincode.toLowerCase().includes(searchLower) || p.city.toLowerCase().includes(searchLower);
  });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pincode list */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3">Select Pincode</div>
          <input
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit] mb-3"
            placeholder="Search pincode or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="max-h-96 overflow-y-auto">
            {filtered && filtered.length > 0 ? (
              filtered.map((p, i) => (
                <div
                  key={`pincode-${p.pincode}-${i}`}
                  onClick={() => {
                    setSelectedPincode(p);
                    if (p.godowns && p.godowns.length > 0) {
                      setSelectedGodown(p.godowns[0]);
                    }
                  }}
                  className={`p-3 rounded-lg mb-2 cursor-pointer border-2 transition-all ${
                    selectedPincode?.pincode === p.pincode
                      ? 'border-red-600 bg-red-50/60 shadow-sm'
                      : 'border-gray-100 hover:border-red-200 bg-white'
                  }`}
                >
                  <div className="font-black text-sm text-red-700">{p.pincode}</div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    {p.city} ┬╖ {p.godowns?.length || 0} godown{p.godowns?.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 p-3">No pincodes found</div>
            )}
          </div>
        </div>

        {/* Godown list */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3">
            Godowns ΓÇö {selectedPincode?.city || 'N/A'}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {selectedPincode?.godowns && selectedPincode.godowns.length > 0 ? (
              selectedPincode.godowns.map((g, i) => (
                <div
                  key={`godown-${g.id}-${i}`}
                  onClick={() => setSelectedGodown(g)}
                  className={`p-3 rounded-lg mb-2 cursor-pointer border-2 transition-all ${
                    selectedGodown?.id === g.id
                      ? 'border-red-600 bg-red-50/60'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{g.name || 'Godown'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {g.id} ┬╖ {g.locations?.length || 0} SKUs
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 p-3">No godowns available</div>
            )}
          </div>
        </div>

        {/* Stock detail */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3">
            Stock ΓÇö {selectedGodown?.name || 'N/A'}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {selectedGodown?.locations && selectedGodown.locations.length > 0 ? (
              <>
                {selectedGodown.locations.map((loc, i) => {
                  const available = Number(loc.availableQty) || 0;
                  const reserved = Number(loc.reservedQty) || 0;
                  const defective = Number(loc.defectiveQty) || 0;
                  const total = available + reserved + defective;
                  
                  return (
                    <div
                      key={`location-${i}`}
                      className={`p-3 rounded-xl border mb-2 ${
                        available === 0
                          ? 'border-red-200 bg-red-50/30'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-red-700">
                          {loc.sku || 'N/A'}
                        </span>
                        <div className="text-right">
                          <div className={`text-sm font-extrabold ${
                            available === 0 ? 'text-red-500' : available < 20 ? 'text-amber-500' : 'text-green-600'
                          }`}>
                            {available} {loc.unit || 'units'}
                          </div>
                          {reserved > 0 && <div className="text-[10px] text-blue-600 font-bold">Reserved: {reserved}</div>}
                          {defective > 0 && <div className="text-[10px] text-red-500 font-bold">Defective: {defective}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-gray-800 font-bold">
                        {loc.name || 'Unknown Item'}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-2 mt-2 pt-2 border-t border-gray-100">
                        <div className="text-[10px] text-gray-500">
                          <span className="font-semibold">Batch:</span> {loc.batchNo || 'N/A'}
                        </div>
                        <div className="text-[10px] text-gray-500 text-right">
                          <span className="font-semibold">Location:</span> {loc.loc || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="text-[9px] text-gray-400 mt-1 flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <MdLocationOn size={10} /> {selectedPincode?.city} ({selectedPincode?.pincode})
                        </div>
                        <div>
                          Updated: {loc.lastUpdated || 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Total Available Units</span>
                  <span className="font-extrabold text-red-700">
                    {selectedGodown.locations.reduce((sum, loc) => sum + (Number(loc.availableQty) || 0), 0)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-400 p-3">No stock available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}