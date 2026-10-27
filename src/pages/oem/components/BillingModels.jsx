import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';

export default function BillingModels() {
  const [billingModels, setBillingModels] = useState([
    {
      id: 'BM001',
      brand: 'Brand A',
      modelType: 'Job Work',
      manufacturingCharge: 150,
      unit: 'Per Unit',
      minOrder: 100,
      leadTime: 15,
      status: 'Active'
    },
    {
      id: 'BM002',
      brand: 'Brand B',
      modelType: 'RM Supplied',
      manufacturingCharge: 120,
      unit: 'Per Unit',
      minOrder: 50,
      leadTime: 10,
      status: 'Active'
    },
    {
      id: 'BM003',
      brand: 'Brand C',
      modelType: 'Full Manufacturing',
      manufacturingCharge: 250,
      unit: 'Per Unit',
      minOrder: 200,
      leadTime: 20,
      status: 'Active'
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({
    brand: '',
    modelType: 'Job Work',
    manufacturingCharge: 0,
    unit: 'Per Unit',
    minOrder: 0,
    leadTime: 0,
    status: 'Active'
  });
  const [saving, setSaving] = useState(false);

  const handleAddModel = () => {
    setEditingModel(null);
    setFormData({
      brand: '',
      modelType: 'Job Work',
      manufacturingCharge: 0,
      unit: 'Per Unit',
      minOrder: 0,
      leadTime: 0,
      status: 'Active'
    });
    setShowModal(true);
  };

  const handleEditModel = (model) => {
    setEditingModel(model);
    setFormData(model);
    setShowModal(true);
  };

  const handleDeleteModel = (id) => {
    if (confirm('Are you sure you want to delete this billing model?')) {
      setBillingModels(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleSaveModel = async () => {
    if (!formData.brand.trim()) {
      alert('Please enter brand name');
      return;
    }

    setSaving(true);
    try {
      if (editingModel) {
        setBillingModels(prev => prev.map(m => m.id === editingModel.id ? { ...formData, id: editingModel.id } : m));
      } else {
        setBillingModels(prev => [...prev, { ...formData, id: `BM${Date.now()}` }]);
      }
      setShowModal(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const modelTypes = [
    { value: 'Job Work', label: 'Job Work (Manufacturing Charges)', description: 'Brand provides materials, we charge for manufacturing' },
    { value: 'RM Supplied', label: 'RM Supplied by Brand', description: 'Brand supplies raw materials, we handle manufacturing' },
    { value: 'Full Manufacturing', label: 'Full Manufacturing', description: 'We handle everything from sourcing to delivery' }
  ];

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>OEM Billing Models</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Manage billing models for different brands</div>
        </div>
        <button className="btn btn-primary" onClick={handleAddModel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MdAdd size={16} /> Add Model
        </button>
      </div>

      {/* Billing Models Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {billingModels.map(model => (
          <div key={model.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{model.brand}</div>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: '#dbeafe',
                  color: '#0c4a6e',
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  {model.modelType}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" style={{ background: '#f1f5f9', color: 'var(--text)', padding: '4px 8px' }}
                  onClick={() => handleEditModel(model)}>
                  <MdEdit size={14} />
                </button>
                <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px' }}
                  onClick={() => handleDeleteModel(model.id)}>
                  <MdDelete size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>MANUFACTURING CHARGE</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                  ₹{model.manufacturingCharge} / {model.unit}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>MIN ORDER</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{model.minOrder} units</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>LEAD TIME</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{model.leadTime} days</div>
                </div>
              </div>

              <div style={{ paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: model.status === 'Active' ? '#dcfce7' : '#fee2e2',
                  color: model.status === 'Active' ? '#166534' : '#991b1b',
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  {model.status}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingModel ? 'Edit Billing Model' : 'Add Billing Model'} size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveModel} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Brand Name *</label>
            <input type="text" className="form-input" value={formData.brand}
              onChange={e => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Enter brand name" />
          </div>

          <div className="form-group">
            <label className="form-label">Billing Model Type *</label>
            <div style={{ display: 'grid', gap: 12 }}>
              {modelTypes.map(type => (
                <div key={type.value} style={{
                  padding: 12,
                  border: formData.modelType === type.value ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: formData.modelType === type.value ? '#f0f9ff' : '#f8fafc',
                  transition: 'all 0.2s'
                }} onClick={() => setFormData({ ...formData, modelType: type.value })}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{type.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Manufacturing Charge (₹) *</label>
              <input type="number" className="form-input" value={formData.manufacturingCharge}
                onChange={e => setFormData({ ...formData, manufacturingCharge: e.target.value })}
                placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                <option>Per Unit</option>
                <option>Per Kg</option>
                <option>Per Litre</option>
                <option>Per Set</option>
                <option>Per Box</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Minimum Order Quantity</label>
              <input type="number" className="form-input" value={formData.minOrder}
                onChange={e => setFormData({ ...formData, minOrder: e.target.value })}
                placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Lead Time (Days)</label>
              <input type="number" className="form-input" value={formData.leadTime}
                onChange={e => setFormData({ ...formData, leadTime: e.target.value })}
                placeholder="0" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          {/* Model Details Summary */}
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Model Summary</div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Brand:</span>
                <span style={{ fontWeight: 600 }}>{formData.brand || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Type:</span>
                <span style={{ fontWeight: 600 }}>{formData.modelType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Charge:</span>
                <span style={{ fontWeight: 600 }}>₹{formData.manufacturingCharge} / {formData.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Min Order:</span>
                <span style={{ fontWeight: 600 }}>{formData.minOrder} units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Lead Time:</span>
                <span style={{ fontWeight: 600 }}>{formData.leadTime} days</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
