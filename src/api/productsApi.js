import { itemMasterApi } from './itemMasterApi';
import { grnApi } from './grnApi';
import { poApi } from './poApi';

const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const getToken = () => localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.message || 'Request failed'); return d; };

export const productsApi = {
  // Get all products from different sources for return requests
  getAllForReturns: async () => {
    try {
      const [itemMaster, grns, pos] = await Promise.all([
        itemMasterApi.getDropdown().catch(() => ({ data: [] })),
        grnApi.getAll().catch(() => ({ data: [] })),
        poApi.getAll().catch(() => ({ data: [] }))
      ]);

      const products = [];

      // Add products from Item Master
      if (itemMaster.data) {
        itemMaster.data.forEach(item => {
          products.push({
            id: item._id,
            name: item.itemName || item.name,
            sku: item.skuCode || item.sku,
            source: 'Item Master',
            category: item.category,
            unit: item.unit,
            price: item.price || 0,
            description: item.description,
            brand: item.brand,
            model: item.model,
            specifications: item.specifications
          });
        });
      }

      // Add products from GRNs with detailed information
      if (grns.data) {
        grns.data.forEach(grn => {
          if (grn.items && Array.isArray(grn.items)) {
            grn.items.forEach(item => {
              products.push({
                id: `grn_${grn._id}_${item._id || item.itemId}`,
                name: item.itemName || item.productName || item.name,
                sku: item.skuCode || item.sku,
                source: 'GRN',
                grnId: grn.grnId,
                grnDate: grn.grnDate,
                supplier: grn.supplierName,
                supplierCode: grn.supplierCode,
                receivedQty: item.receivedQty,
                orderedQty: item.orderedQty,
                unit: item.unit,
                price: item.rate || item.price || 0,
                batchNo: item.batchNo,
                expiryDate: item.expiryDate,
                qualityStatus: item.qualityStatus,
                warehouseLocation: item.warehouseLocation,
                poReference: grn.poId,
                invoiceNo: grn.invoiceNo,
                description: item.description,
                brand: item.brand,
                model: item.model,
                specifications: item.specifications
              });
            });
          }
        });
      }

      // Add products from Purchase Orders with detailed information
      if (pos.data) {
        pos.data.forEach(po => {
          if (po.items && Array.isArray(po.items)) {
            po.items.forEach(item => {
              products.push({
                id: `po_${po._id}_${item._id || item.itemId}`,
                name: item.itemName || item.productName || item.name,
                sku: item.skuCode || item.sku,
                source: 'Purchase Order',
                poId: po.poId,
                poDate: po.poDate,
                supplier: po.supplierName,
                supplierCode: po.supplierCode,
                orderedQty: item.quantity,
                pendingQty: item.pendingQty,
                receivedQty: item.receivedQty,
                unit: item.unit,
                price: item.rate || item.price || 0,
                deliveryDate: item.deliveryDate,
                status: po.status,
                description: item.description,
                brand: item.brand,
                model: item.model,
                specifications: item.specifications,
                taxRate: item.taxRate,
                discount: item.discount
              });
            });
          }
        });
      }

      // Remove duplicates based on name and SKU, but keep source information
      const uniqueProducts = products.filter((product, index, self) => 
        index === self.findIndex(p => 
          p.name === product.name && p.sku === product.sku && p.source === product.source
        )
      );

      return { success: true, data: uniqueProducts };
    } catch (error) {
      console.error('Error fetching products for returns:', error);
      return { success: false, data: [], message: error.message };
    }
  },

  // Search products by name or SKU
  searchProducts: async (query) => {
    try {
      const allProducts = await productsApi.getAllForReturns();
      if (!allProducts.success) return allProducts;

      const filteredProducts = allProducts.data.filter(product => 
        product.name?.toLowerCase().includes(query.toLowerCase()) ||
        product.sku?.toLowerCase().includes(query.toLowerCase()) ||
        product.supplier?.toLowerCase().includes(query.toLowerCase()) ||
        product.grnId?.toLowerCase().includes(query.toLowerCase()) ||
        product.poId?.toLowerCase().includes(query.toLowerCase())
      );

      return { success: true, data: filteredProducts };
    } catch (error) {
      return { success: false, data: [], message: error.message };
    }
  }
};