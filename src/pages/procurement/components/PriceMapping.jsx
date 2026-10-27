import { useState, useEffect } from 'react';
import { vendorApi } from '../../../api/vendorApi';
import Modal from '../../../components/common/Modal';
import { MdEdit, MdDelete, MdAdd } from 'react-icons/md';

export default function PriceMapping() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [prices, setPrices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    basePrice: 0,
    gst: 18,
    effectiveFrom: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await vendorApi.getAll({ status: 'Active' });
      setVendors(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    setPrices(vendor.priceMapping || []);
  };

  const handleAddPrice = () => {
    setEditingPrice(null);
    setFormData({
      itemName: '',
      basePrice: 0,
      gst: 18,
      effectiveFrom: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditPrice = (price) => {
    setEditingPrice(price);
    setFormData(price);
    setShowModal(true);
  };

  const handleDeletePrice = (index) => {
    setPrices(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePrice = async () => {
    if (!formData.itemName.trim()) {
      alert('Please enter item name');
      return;
    }

    setLoading(true);
    try {
      const updatedPrices = editingPrice 
        ? prices.map(p => p === editingPrice ? formData : p)
        : [...prices, { ...formData, id: Date.now() }];

      await vendorApi.update(selectedVendor._id, { priceMapping: updatedPrices });
      setPrices(updatedPrices);
      setShowModal(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (price) => {
    const baseTotal = parseFloat(price.basePrice) || 0;
    const gstAmount = baseTotal * (parseFloat(price.gst) || 0) / 100;
    return baseTotal + gstAmount;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
      {/* Vendor List */}
      <div className="card" style={{ height: 'fit-content' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
          Vendors ({vendors.length})
        </div>
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {vendors.map(vendor => (
            <div
              key={vendor._id}
              onClick={() => handleVendorSelect(vendor)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: selectedVendor?._id === vendor._id ? '#f1f5f9' : 'transparent',
                borderLeft: selectedVendor?._id === vendor._id ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{vendor.companyName}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {vendor.priceMapping?.length || 0} items
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Mapping Details */}
      <div className="card">
        {selectedVendor ? (
          <>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedVendor.companyName}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Price Mapping</div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={handleAddPrice} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdAdd size={16} /> Add Price
              </button>
            </div>

            {prices.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                No price mappings yet. Click "Add Price" to create one.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>ITEM NAME</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>BASE PRICE</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>GST %</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>TOTAL</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>EFFECTIVE FROM</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((price, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{price.itemName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{parseFloat(price.basePrice).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{price.gst}%</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          ₹{Math.round(calculateTotal(price)).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>
                          {new Date(price.effectiveFrom).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button className="btn btn-sm" style={{ background: '#f1f5f9', color: 'var(--text)', padding: '4px 8px' }}
                              onClick={() => handleEditPrice(price)}>
                              <MdEdit size={14} />
                            </button>
                            <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px' }}
                              onClick={() => handleDeletePrice(idx)}>
                              <MdDelete size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            Select a vendor to view price mappings
          </div>
        )}
      </div>

      {/* Add/Edit Price Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingPrice ? 'Edit Price' : 'Add Price Mapping'} size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSavePrice} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </>
        }>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input type="text" className="form-input" value={formData.itemName}
              onChange={e => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="Enter item name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Base Price (₹)</label>
              <input type="number" className="form-input" value={formData.basePrice}
                onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">GST %</label>
              <input type="number" className="form-input" value={formData.gst}
                onChange={e => setFormData({ ...formData, gst: e.target.value })}
                placeholder="18" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Effective From</label>
            <input type="date" className="form-input" value={formData.effectiveFrom}
              onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..." />
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Price (with GST)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
              ₹{Math.round(calculateTotal(formData)).toLocaleString()}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
