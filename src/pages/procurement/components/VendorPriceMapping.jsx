import { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import { vendorPriceApi } from '../../../api/vendorPriceApi';
import { MdAdd, MdEdit, MdDelete, MdClose } from 'react-icons/md';

export default function VendorPriceMapping({ vendorId, vendorName, onClose }) {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    unit: 'pcs',
    unitPrice: 0,
    minOrderQty: 1,
    leadTimeDays: 0,
    isActive: true,
    notes: ''
  });

  useEffect(() => {
    if (vendorId) fetchPrices();
  }, [vendorId]);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const res = await vendorPriceApi.getVendorPrices(vendorId);
      setPrices(res.data || []);
    } catch (e) {
      console.error('Error fetching prices:', e);
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      productName: '',
      productCode: '',
      unit: 'pcs',
      unitPrice: 0,
      minOrderQty: 1,
      leadTimeDays: 0,
      isActive: true,
      notes: ''
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (price) => {
    setFormData({
      productName: price.productName,
      productCode: price.productCode || '',
      unit: price.unit || 'pcs',
      unitPrice: price.unitPrice,
      minOrderQty: price.minOrderQty || 1,
      leadTimeDays: price.leadTimeDays || 0,
      isActive: price.isActive !== false,
      notes: price.notes || ''
    });
    setEditingId(price._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.productName.trim()) {
      alert('Product name is required');
      return;
    }
    if (formData.unitPrice <= 0) {
      alert('Unit price must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await vendorPriceApi.updatePrice(vendorId, editingId, formData);
        alert('✓ Price updated successfully!');
      } else {
        await vendorPriceApi.addPrice(vendorId, formData);
        alert('✓ Price added successfully!');
      }
      setShowForm(false);
      fetchPrices();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (priceId) => {
    if (!window.confirm('Are you sure you want to delete this price entry?')) return;
    try {
      await vendorPriceApi.deletePrice(vendorId, priceId);
      alert('✓ Price deleted successfully!');
      fetchPrices();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Price Mapping for {vendorName}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Manage product prices and rates for this vendor</div>
        </div>
        <button 
          className="btn btn-sm btn-primary" 
          onClick={handleAddNew}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <MdAdd size={16} /> Add Price
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading prices...</div>
      ) : prices.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 10, color: '#94a3b8' }}>
          No prices configured yet. Add your first price entry.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>PRODUCT NAME</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>CODE</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>UNIT PRICE</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>UNIT</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>MIN QTY</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>LEAD TIME</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11 }}>STATUS</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price) => (
                <tr key={price._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{price.productName}</td>
                  <td style={{ padding: '12px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{price.productCode || '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(price.unitPrice).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>{price.unit}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{price.minOrderQty}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>{price.leadTimeDays} days</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: price.isActive ? '#ecfdf5' : '#f3f4f6',
                      color: price.isActive ? '#047857' : '#6b7280'
                    }}>
                      {price.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(price)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: 'inherit'
                      }}
                    >
                      <MdEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(price._id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: 'inherit'
                      }}
                    >
                      <MdDelete size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      <Modal 
        open={showForm} 
        onClose={() => setShowForm(false)} 
        title={editingId ? 'Edit Price Entry' : 'Add Price Entry'}
        footer={
          <>
            <button 
              className="btn btn-outline" 
              onClick={() => setShowForm(false)} 
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Price'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g., Steel Rod 10mm"
              value={formData.productName}
              onChange={e => setFormData({ ...formData, productName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Product Code</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g., SKU-1042"
              value={formData.productCode}
              onChange={e => setFormData({ ...formData, productCode: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Unit Price (₹) *</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="0.00"
              value={formData.unitPrice}
              onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select 
              className="form-select"
              value={formData.unit}
              onChange={e => setFormData({ ...formData, unit: e.target.value })}
            >
              <option>pcs</option>
              <option>kg</option>
              <option>ltr</option>
              <option>mtr</option>
              <option>box</option>
              <option>carton</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Minimum Order Qty</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="1"
              value={formData.minOrderQty}
              onChange={e => setFormData({ ...formData, minOrderQty: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Lead Time (days)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="0"
              value={formData.leadTimeDays}
              onChange={e => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select 
              className="form-select"
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={e => setFormData({ ...formData, isActive: e.target.value === 'active' })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Notes</label>
            <textarea 
              className="form-input" 
              rows={2}
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
