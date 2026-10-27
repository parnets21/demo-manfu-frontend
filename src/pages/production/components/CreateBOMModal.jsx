import { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import { bomApi } from '../../../api/bomApi';
import { inventoryApi } from '../../../api/inventoryApi';
import { toast } from '../../../components/common/Toast';

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]';
const btnP = 'inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all border-0 cursor-pointer font-[inherit]';
const btnO = 'inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all cursor-pointer font-[inherit]';
const btnDanger = 'inline-flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-semibold hover:bg-red-200 transition-all border-0 cursor-pointer font-[inherit]';

export default function CreateBOMModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    projectId: '',
    product: '',
    version: 'v1.0',
    type: 'Finished Good',
    uom: '',
    description: ''
  });

  const [materials, setMaterials] = useState([{ materialId: '', quantity: '', availableStock: 0, loadingStock: false }]);
  const [materialsList, setMaterialsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch materials on modal open
  useEffect(() => {
    if (open) {
      fetchMaterials();
      // Auto-refresh inventory every 30 seconds
      const interval = setInterval(fetchMaterials, 30000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getAll();
      console.log('Inventory items fetched:', res.data);
      
      const items = (res.data || []).map(inv => ({
        _id: inv._id,
        sku: inv.sku,
        name: inv.name,
        unit: inv.unit || 'Nos',
        availableStock: inv.qty || 0
      }));
      
      console.log('Transformed items:', items);
      setMaterialsList(items);
      
      if (items.length === 0) {
        toast('No items found in inventory', 'warning');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast(error.message || 'Failed to fetch inventory items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialChange = async (index, materialId) => {
    try {
      const newMaterials = [...materials];
      newMaterials[index].materialId = materialId;
      newMaterials[index].loadingStock = true;
      setMaterials(newMaterials);

      if (materialId) {
        const selectedMaterial = materialsList.find(m => m._id === materialId);
        if (selectedMaterial) {
          newMaterials[index].quantity = 1;
          newMaterials[index].availableStock = selectedMaterial.availableStock;
        }
        newMaterials[index].loadingStock = false;
      } else {
        newMaterials[index].quantity = '';
        newMaterials[index].availableStock = 0;
        newMaterials[index].loadingStock = false;
      }

      setMaterials(newMaterials);
    } catch (error) {
      const newMaterials = [...materials];
      newMaterials[index].loadingStock = false;
      setMaterials(newMaterials);
      toast(error.message || 'Failed to fetch material details', 'error');
    }
  };

  const handleQuantityChange = (index, quantity) => {
    const newMaterials = [...materials];
    newMaterials[index].quantity = quantity;
    setMaterials(newMaterials);
  };

  const addMaterial = () => {
    setMaterials([...materials, { materialId: '', quantity: '', availableStock: 0, loadingStock: false }]);
  };

  const removeMaterial = (index) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index));
    } else {
      toast('At least one material is required', 'error');
    }
  };

  const validateForm = () => {
    if (!form.projectId || !form.product || !form.uom) {
      toast('Project ID, Product name, and Unit of Measure are required', 'error');
      return false;
    }

    const materialIds = materials.map(m => m.materialId).filter(id => id);
    if (new Set(materialIds).size !== materialIds.length) {
      toast('Duplicate materials not allowed', 'error');
      return false;
    }

    for (const material of materials) {
      if (!material.materialId) {
        toast('All material rows must have a material selected', 'error');
        return false;
      }
      if (!material.quantity || material.quantity <= 0) {
        toast('All materials must have quantity greater than zero', 'error');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = {
        projectId: form.projectId,
        product: form.product,
        version: form.version,
        type: form.type,
        uom: form.uom,
        description: form.description,
        components: materials.map(m => {
          const selectedMaterial = materialsList.find(mat => mat._id === m.materialId);
          return {
            inventoryItemId: m.materialId,
            itemName: selectedMaterial?.name || '',
            itemCode: selectedMaterial?.sku || '',
            qty: parseFloat(m.quantity),
            unit: selectedMaterial?.unit || 'Nos',
            type: 'Raw',
            level: 1,
            unitCost: 0,
            scrapFactor: 0
          };
        })
      };

      await bomApi.create(payload);
      toast('BOM created successfully', 'success');

      setForm({
        projectId: '',
        product: '',
        version: 'v1.0',
        type: 'Finished Good',
        uom: '',
        description: ''
      });
      setMaterials([{ materialId: '', quantity: '', availableStock: 0, loadingStock: false }]);

      onSaved?.();
      onClose();
    } catch (error) {
      toast(error.message || 'Failed to create BOM', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create BOM with Materials"
      size="xl"
      footer={
        <>
          <button className={btnO} onClick={onClose}>Cancel</button>
          <button className={btnP} onClick={handleSubmit} disabled={saving || loading}>
            {saving ? 'Creating...' : 'Create BOM'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* BOM Details */}
        <div>
          <h3 className="text-base font-bold text-gray-800 mb-4">BOM Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Project ID *</label>
              <input
                className={inp}
                placeholder="e.g., PROJ-EA-001"
                value={form.projectId}
                onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Product Name *</label>
              <input
                className={inp}
                placeholder="e.g., Engine Assembly A"
                value={form.product}
                onChange={e => setForm(p => ({ ...p, product: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Version</label>
              <input
                className={inp}
                placeholder="v1.0"
                value={form.version}
                onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Type</label>
              <select
                className={inp}
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                <option>Finished Good</option>
                <option>Sub-Assembly</option>
                <option>Semi-Finished</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Unit of Measure *</label>
              <select
                className={inp}
                value={form.uom}
                onChange={e => setForm(p => ({ ...p, uom: e.target.value }))}
              >
                <option value="">Select Unit</option>
                <option value="KG">KG - Kilogram</option>
                <option value="NOS">NOS - Numbers/Pieces</option>
                <option value="SET">SET - Set</option>
                <option value="BOX">BOX - Box</option>
                <option value="CTN">CTN - Carton</option>
                <option value="PACK">PACK - Pack</option>
                <option value="LTR">LTR - Liter</option>
                <option value="ML">ML - Milliliter</option>
                <option value="MTR">MTR - Meter</option>
                <option value="CM">CM - Centimeter</option>
                <option value="G">G - Gram</option>
                <option value="MG">MG - Milligram</option>
                <option value="PCS">PCS - Pieces (Legacy)</option>
                <option value="UNIT">UNIT - Unit</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Description</label>
          <textarea
            className={`${inp} resize-y min-h-[60px]`}
            placeholder="BOM description..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  );
}
