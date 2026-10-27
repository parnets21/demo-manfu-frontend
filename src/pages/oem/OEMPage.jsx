import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../../components/common/Modal';
import { MdDownload, MdAdd, MdBusiness, MdSwapHoriz } from 'react-icons/md';
import { toast } from '../../components/common/Toast';
import { oemApi } from '../../api/oemApi';
import { oemOrderApi } from '../../api/oemOrderApi';
import { oemInvoiceApi } from '../../api/oemInvoiceApi';
import { oemFinishedGoodsApi } from '../../api/oemFinishedGoodsApi';
import { workOrderApi, bomApi } from '../../api/bomApi';

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]';
const btnP = 'inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]';
const btnO = 'inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]';

const EMPTY_BRAND = { name:'', code:'', color:'#1e40af', billingType:'Per Unit', ratePerUnit:'', gstRate:18, paymentTerms:'Net 30', monthlyTarget:'', contactPerson:'', contactEmail:'', contactPhone:'', notes:'', status:'Active' };
const EMPTY_PROD  = { productName:'', oemSku:'', oemPartNo:'', unitPrice:'', leadTimeDays:'', warrantyMonths:'', minOrderQty:1, uom:'Set', bom:'', preferredRegions:'', autoSelectPriority:0, notes:'', status:'Active' };
const EMPTY_WO    = { product:'', qty:'', shift:'General', priority:'Normal', startDate:'', endDate:'', remarks:'' };
const EMPTY_ORDER = { product:'', quantity:'', bomId:'', unit:'Nos', expectedDeliveryDate:'', remarks:'' };

function Spinner() {
  return <div style={{display:'flex',justifyContent:'center',padding:40}}><div style={{width:32,height:32,border:'3px solid #f1f5f9',borderTop:'3px solid #1e40af',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}
function Empty({ msg='No data yet' }) {
  return <div style={{padding:'36px 20px',textAlign:'center',color:'#94a3b8',fontSize:13}}>{msg}</div>;
}
function Badge({ label, color='#64748b' }) {
  return <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:color+'18',color}}>{label}</span>;
}

const INNER_TABS = ['Products', 'Work Orders', 'Orders', 'Invoices', 'Finished Goods', 'Billing'];
const COLORS = ['#1e40af','#8e44ad','#27ae60','#2563eb','#d97706','#0891b2','#be185d'];

export default function OEMPage() {
  const [brands, setBrands]           = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [products, setProducts]       = useState([]);
  const [wos, setWos]                 = useState([]);
  const [orders, setOrders]           = useState([]);
  const [invoices, setInvoices]       = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [bomList, setBomList]         = useState([]);
  const [stats, setStats]             = useState(null);
  const [innerTab, setInnerTab]       = useState('Products');
  const [loading, setLoading]         = useState(false);

  // Modals
  const [showBrandModal, setShowBrandModal]   = useState(false);
  const [editBrand, setEditBrand]             = useState(null);
  const [showProdModal, setShowProdModal]     = useState(false);
  const [editProd, setEditProd]               = useState(null);
  const [showWOModal, setShowWOModal]         = useState(false);
  const [showOrderModal, setShowOrderModal]   = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(null);
  const [progressVal, setProgressVal]         = useState('');
  const [showAutoSelect, setShowAutoSelect]   = useState(false);
  const [autoQuery, setAutoQuery]             = useState({ productName:'', region:'' });
  const [autoResult, setAutoResult]           = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [bomDetails, setBomDetails]           = useState(null);

  // Forms
  const [brandForm, setBrandForm] = useState(EMPTY_BRAND);
  const [prodForm, setProdForm]   = useState(EMPTY_PROD);
  const [woForm, setWoForm]       = useState(EMPTY_WO);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER);

  //  Loaders 
  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, sRes, bomRes] = await Promise.all([
        oemApi.getBrands(),
        oemApi.getStats(),
        bomApi.getAll(),
      ]);
      const list = bRes.data || [];
      setBrands(list);
      setStats(sRes.data || null);
      setBomList(bomRes.data || []);
      if (list.length > 0 && !activeBrand) setActiveBrand(list[0]);
      else if (activeBrand) {
        const updated = list.find(b => b._id === activeBrand._id);
        if (updated) setActiveBrand(updated);
      }
    } catch (e) { toast(e.message || 'Failed to load OEM data', 'error'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  const loadBrandData = useCallback(async (brand) => {
    if (!brand) return;
    try {
      const [pRes, wRes, oRes, iRes, fRes] = await Promise.all([
        oemApi.getProductsByBrand(brand._id),
        oemApi.getWOsByBrand(brand._id),
        oemOrderApi.getByBrand(brand._id),
        oemInvoiceApi.getByBrand(brand._id),
        oemFinishedGoodsApi.getByBrand(brand._id),
      ]);
      setProducts(pRes.data || []);
      setWos(wRes.data || []);
      setOrders(oRes.data || []);
      setInvoices(iRes.data || []);
      setFinishedGoods(fRes.data || []);
    } catch (e) { toast(e.message || 'Failed to load brand data', 'error'); }
  }, []);

  useEffect(() => { loadBrands(); }, [loadBrands]);
  useEffect(() => { if (activeBrand) loadBrandData(activeBrand); }, [activeBrand, loadBrandData]);

  //  Brand CRUD 
  const openAddBrand = () => { setBrandForm(EMPTY_BRAND); setEditBrand(null); setShowBrandModal(true); };
  const openEditBrand = (b) => { setBrandForm({ name:b.name, code:b.code, color:b.color||'#1e40af', billingType:b.billingType, ratePerUnit:b.ratePerUnit||'', gstRate:b.gstRate||18, paymentTerms:b.paymentTerms||'Net 30', monthlyTarget:b.monthlyTarget||'', contactPerson:b.contactPerson||'', contactEmail:b.contactEmail||'', contactPhone:b.contactPhone||'', notes:b.notes||'' }); setEditBrand(b); setShowBrandModal(true); };
  const handleSaveBrand = async () => {
    if (!brandForm.name.trim()) { toast('Brand name is required', 'error'); return; }
    if (!brandForm.code.trim()) { toast('Brand code is required', 'error'); return; }
    try {
      if (editBrand) { await oemApi.updateBrand(editBrand._id, brandForm); toast('OEM brand updated'); }
      else { await oemApi.createBrand(brandForm); toast('OEM brand created'); }
      setShowBrandModal(false); loadBrands();
    } catch (e) { toast(e.message || 'Failed to save brand', 'error'); }
  };
  const handleDeleteBrand = async (b) => {
    if (!window.confirm(`Delete OEM brand "${b.name}"? All product mappings must be removed first.`)) return;
    try { await oemApi.deleteBrand(b._id); toast('OEM brand deleted'); if (activeBrand?._id === b._id) setActiveBrand(null); loadBrands(); }
    catch (e) { toast(e.message || 'Failed to delete brand', 'error'); }
  };

  //  Product CRUD 
  const openAddProd = () => { setProdForm(EMPTY_PROD); setEditProd(null); setShowProdModal(true); };
  const openEditProd = (p) => { setProdForm({ productName:p.productName, oemSku:p.oemSku||'', oemPartNo:p.oemPartNo||'', unitPrice:p.unitPrice||'', leadTimeDays:p.leadTimeDays||'', warrantyMonths:p.warrantyMonths||'', minOrderQty:p.minOrderQty||1, uom:p.uom||'Set', bom:p.bom?._id||'', preferredRegions:(p.preferredRegions||[]).join(', '), autoSelectPriority:p.autoSelectPriority||0, notes:p.notes||'', status:p.status||'Active' }); setEditProd(p); setShowProdModal(true); };
  const handleSaveProd = async () => {
    if (!prodForm.productName.trim()) { toast('Product name is required', 'error'); return; }
    if (!activeBrand) { toast('Select an OEM brand first', 'error'); return; }
    const body = { ...prodForm, oemBrand: activeBrand._id, unitPrice: parseFloat(prodForm.unitPrice)||0, leadTimeDays: parseInt(prodForm.leadTimeDays)||0, warrantyMonths: parseInt(prodForm.warrantyMonths)||0, minOrderQty: parseInt(prodForm.minOrderQty)||1, autoSelectPriority: parseInt(prodForm.autoSelectPriority)||0, bom: prodForm.bom||undefined, preferredRegions: prodForm.preferredRegions ? prodForm.preferredRegions.split(',').map(s=>s.trim()).filter(Boolean) : [] };
    try {
      if (editProd) { await oemApi.updateProduct(editProd._id, body); toast('OEM product updated'); }
      else { await oemApi.createProduct(body); toast('OEM product mapping created'); }
      setShowProdModal(false); loadBrandData(activeBrand);
    } catch (e) { toast(e.message || 'Failed to save product', 'error'); }
  };
  const handleDeleteProd = async (p) => {
    if (!window.confirm(`Remove "${p.productName}" from ${activeBrand?.name}?`)) return;
    try { await oemApi.deleteProduct(p._id); toast('OEM product removed'); loadBrandData(activeBrand); }
    catch (e) { toast(e.message || 'Failed to delete product', 'error'); }
  };

  //  Work Order CRUD 
  const handleCreateWO = async () => {
    if (!woForm.product.trim()) { toast('Product is required', 'error'); return; }
    if (!woForm.qty || parseInt(woForm.qty) < 1) { toast('Quantity must be at least 1', 'error'); return; }
    if (!woForm.startDate || woForm.startDate.trim() === '') { toast('Start date is required', 'error'); return; }
    try {
      const prod = products.find(p => p.productName === woForm.product);
      await workOrderApi.create({ ...woForm, qty: parseInt(woForm.qty), oemBrand: activeBrand._id, oemProduct: prod?._id||undefined, bomId: prod?.bom?._id||undefined });
      toast('Work order created'); setShowWOModal(false); setWoForm(EMPTY_WO); loadBrandData(activeBrand);
    } catch (e) { toast(e.message || 'Failed to create work order', 'error'); }
  };

  const openAddOrder = () => { setOrderForm(EMPTY_ORDER); setShowOrderModal(true); };
  const handleOrderProductChange = (value) => {
    const prod = products.find(p => p.productName === value);
    setOrderForm(prev => ({ ...prev, product: value, bomId: prod?.bom?._id || '' }));
  };
  const handleCreateOrder = async () => {
    if (!orderForm.product.trim()) { toast('Product is required', 'error'); return; }
    if (!orderForm.quantity || parseInt(orderForm.quantity) < 1) { toast('Quantity must be at least 1', 'error'); return; }
    const bomId = orderForm.bomId || products.find(p => p.productName === orderForm.product)?.bom?._id;
    if (!bomId) { toast('BOM is required for OEM order', 'error'); return; }
    try {
      await oemOrderApi.create({
        oemBrand: activeBrand._id,
        product: orderForm.product,
        quantity: parseInt(orderForm.quantity),
        bomId,
        unit: orderForm.unit,
        expectedDeliveryDate: orderForm.expectedDeliveryDate || undefined,
        remarks: orderForm.remarks || undefined,
      });
      toast('OEM order created');
      setShowOrderModal(false);
      setOrderForm(EMPTY_ORDER);
      loadBrandData(activeBrand);
    } catch (e) { toast(e.message || 'Failed to create OEM order', 'error'); }
  };

  const handleUpdateProgress = async () => {
    if (!showProgressModal) return;
    const val = parseInt(progressVal);
    if (isNaN(val) || val < 0) { toast('Enter a valid quantity', 'error'); return; }
    if (val > showProgressModal.qty) { toast(`Cannot exceed target of ${showProgressModal.qty}`, 'error'); return; }
    try {
      const res = await workOrderApi.updateProgress(showProgressModal._id, val);
      setWos(prev => prev.map(w => w._id === res.data._id ? res.data : w));
      toast('Progress updated'); setShowProgressModal(null); setProgressVal('');
    } catch (e) { toast(e.message || 'Failed to update progress', 'error'); }
  };
  const handleDeleteWO = async (wo) => {
    if (!window.confirm(`Delete Work Order ${wo.woId}?`)) return;
    try { await workOrderApi.delete(wo._id); toast('Work order deleted'); loadBrandData(activeBrand); }
    catch (e) { toast(e.message || 'Failed to delete work order', 'error'); }
  };

  // OEM Orders, Invoices, Finished Goods handlers
  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Delete OEM Order ${order.oemOrderId}?`)) return;
    try { await oemOrderApi.delete(order._id); toast('OEM order deleted'); loadBrandData(activeBrand); }
    catch (e) { toast(e.message || 'Failed to delete order', 'error'); }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!window.confirm(`Delete Invoice ${invoice.invoiceNumber}?`)) return;
    try { await oemInvoiceApi.delete(invoice._id); toast('Invoice deleted'); loadBrandData(activeBrand); }
    catch (e) { toast(e.message || 'Failed to delete invoice', 'error'); }
  };

  const handleDeleteFinishedGoods = async (fg) => {
    if (!window.confirm(`Delete Finished Goods ${fg.finishedGoodsId}?`)) return;
    try { await oemFinishedGoodsApi.delete(fg._id); toast('Finished goods deleted'); loadBrandData(activeBrand); }
    catch (e) { toast(e.message || 'Failed to delete finished goods', 'error'); }
  };

  //  Auto-select 
  const handleAutoSelect = async () => {
    if (!autoQuery.productName.trim()) { toast('Enter a product name', 'error'); return; }
    try {
      const res = await oemApi.autoSelect(autoQuery);
      setAutoResult(res);
    } catch (e) { toast(e.message || 'Auto-select failed', 'error'); }
  };

  const handleExpandProduct = async (product) => {
    if (expandedProduct?._id === product._id) {
      setExpandedProduct(null);
      setBomDetails(null);
      return;
    }
    if (!product.bom) {
      toast('No BOM linked to this product', 'info');
      return;
    }
    try {
      const res = await bomApi.getById(product.bom._id || product.bom);
      setBomDetails(res.data);
      setExpandedProduct(product);
    } catch (e) { toast(e.message || 'Failed to load BOM', 'error'); }
  };

  //  Export 
  const handleExport = () => {
    if (!activeBrand) return;
    const wb = XLSX.utils.book_new();
    if (innerTab === 'Products') {
      const rows = products.map(p => ({ 'Product': p.productName, 'OEM SKU': p.oemSku||'', 'Part No': p.oemPartNo||'', 'Unit Price': p.unitPrice||0, 'Lead Time (days)': p.leadTimeDays||0, 'Warranty (months)': p.warrantyMonths||0, 'BOM': p.bom?.bomId||'', 'Status': p.status }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Products');
    } else if (innerTab === 'Work Orders') {
      const rows = wos.map(w => ({ 'WO ID': w.woId, 'Product': w.product, 'Target': w.qty, 'Produced': w.produced, 'Progress %': w.qty>0?Math.round((w.produced/w.qty)*100):0, 'Status': w.status, 'Shift': w.shift }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Work Orders');
    }
    const out = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const url = URL.createObjectURL(new Blob([out], { type:'application/octet-stream' }));
    const a = Object.assign(document.createElement('a'), { href:url, download:`OEM_${activeBrand.name.replace(/\s+/g,'_')}_${innerTab}_${new Date().toISOString().slice(0,10)}.xlsx` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast(`${innerTab} exported`);
  };

  const brandColor = activeBrand?.color || '#1e40af';
  const achieved   = wos.reduce((s,w) => s + (w.produced||0), 0);
  const target     = activeBrand?.monthlyTarget || 0;
  const achPct     = target > 0 ? Math.round((achieved/target)*100) : 0;



  return (
    <div>
      {/*  Action Bar  */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <button onClick={() => setShowAutoSelect(true)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'transparent',color:'#2563eb',border:'1.5px solid #2563eb',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}><MdSwapHoriz size={15}/>Auto-Select OEM</button>
        <button onClick={handleExport} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'transparent',color:'#1e40af',border:'1.5px solid #1e40af',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}><MdDownload size={15}/>Export</button>
        <button onClick={openAddBrand} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'linear-gradient(135deg,#3b82f6,#1e40af)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',boxShadow:'0 3px 10px rgba(185,28,28,0.3)'}}><MdAdd size={15}/>Add OEM Brand</button>
        {innerTab==='Products' && activeBrand && <button onClick={openAddProd} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'transparent',color:'#1e40af',border:'1.5px solid #1e40af',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>+ Add Product</button>}
        {innerTab==='Work Orders' && activeBrand && <button onClick={() => setShowWOModal(true)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'transparent',color:'#1e40af',border:'1.5px solid #1e40af',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>+ New Work Order</button>}
        {innerTab==='Orders' && activeBrand && <button onClick={openAddOrder} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'transparent',color:'#1e40af',border:'1.5px solid #1e40af',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>+ New OEM Order</button>}
      </div>

      {/*  Global Stats  */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[{l:'Active Brands',v:stats.totalBrands,c:'#1e40af'},{l:'OEM Products',v:stats.totalProducts,c:'#2563eb'},{l:'Total WOs',v:stats.totalWOs,c:'#d97706'},{l:'Overall Efficiency',v:`${stats.overallEfficiency}%`,c:'#16a34a'}].map((s,i)=>(
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div style={{fontSize:22,fontWeight:800,color:s.c,letterSpacing:'-0.5px'}}>{s.v}</div>
              <div style={{fontSize:11.5,color:'#64748b',marginTop:3,fontWeight:500}}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/*  Brand Tabs  */}
      {loading ? <Spinner /> : brands.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:16,border:'1px solid #e2e8f0'}}>
          <MdBusiness size={40} color="#e2e8f0" style={{margin:'0 auto 12px'}}/>
          <div style={{fontSize:15,fontWeight:700,color:'#1e293b',marginBottom:6}}>No OEM Brands yet</div>
          <div style={{fontSize:13,color:'#94a3b8',marginBottom:16}}>Click "Add OEM Brand" to get started</div>
 
        </div>
      ) : (
        <>
          <div className="flex gap-2.5 mb-5 flex-wrap">
            {brands.map((b,i) => (
              <button key={b._id} onClick={() => { setActiveBrand(b); setInnerTab('Products'); }}
                className="px-5 py-2 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all font-[inherit] flex items-center gap-2"
                style={{borderColor:activeBrand?._id===b._id?(b.color||COLORS[i%COLORS.length]):'#e2e8f0',background:activeBrand?._id===b._id?(b.color||COLORS[i%COLORS.length]):'#fff',color:activeBrand?._id===b._id?'#fff':'#1c2833'}}>
                {b.name}
                <span style={{fontSize:10,fontWeight:600,opacity:0.8}}>({b.productCount||0})</span>
              </button>
            ))}
          </div>

          {activeBrand && (
            <>
              {/* Brand KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[{l:'Monthly Target',v:(activeBrand.monthlyTarget||0).toLocaleString()},{l:'Achieved (WOs)',v:achieved.toLocaleString()},{l:'Achievement %',v:`${achPct}%`},{l:'Billing Type',v:activeBrand.billingType}].map((k,i)=>(
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
                    <div style={{fontSize:20,fontWeight:800,color:brandColor,letterSpacing:'-0.5px'}}>{k.v}</div>
                    <div style={{fontSize:11.5,color:'#64748b',marginTop:3,fontWeight:500}}>{k.l}</div>
                  </div>
                ))}
              </div>

              {/* Brand header with edit/delete */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,padding:'12px 16px',background:'#fff',borderRadius:12,border:'1px solid #e2e8f0'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:brandColor}}/>
                  <span style={{fontWeight:700,fontSize:14,color:'#1e293b'}}>{activeBrand.name}</span>
                  <span style={{fontSize:11.5,color:'#94a3b8'}}>{activeBrand.brandId}  {activeBrand.code}</span>
                  <Badge label={activeBrand.status} color={activeBrand.status==='Active'?'#16a34a':'#94a3b8'}/>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => openEditBrand(activeBrand)} style={{padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,border:'1px solid #e2e8f0',color:'#64748b',background:'#f8fafc',cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
                  <button onClick={() => handleDeleteBrand(activeBrand)} style={{padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,border:'1px solid #fecaca',color:'#ef4444',background:'#fef2f2',cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
                </div>
              </div>

              {/* Inner Tab Bar */}
              <div style={{display:'flex',gap:4,marginBottom:20,background:'#f8fafc',borderRadius:12,padding:4,width:'fit-content'}}>
                {INNER_TABS.map(t=>(
                  <button key={t} onClick={()=>setInnerTab(t)} style={{padding:'7px 20px',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',transition:'all 0.15s',background:innerTab===t?'#fff':'transparent',color:innerTab===t?brandColor:'#64748b',boxShadow:innerTab===t?'0 1px 6px rgba(0,0,0,0.1)':'none'}}>{t}</button>
                ))}
              </div>

              {/*  Products Tab  */}
              {innerTab==='Products' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div style={{padding:'14px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>OEM Products — {activeBrand.name}</div>
                    <span style={{fontSize:11.5,color:'#94a3b8'}}>{products.length} mappings</span>
                  </div>
                  {products.length===0 ? <Empty msg="No products mapped yet. Click '+ Add Product' to link a product to this OEM brand." /> : (
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                        <thead><tr style={{background:'#f8fafc'}}>{['Product','OEM SKU','Part No','Unit Price','Lead Time','Warranty','BOM','Regions','Status','Actions'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {products.map((p,i)=>(
                            <React.Fragment key={p._id}>
                              <tr style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafafa',cursor:p.bom?'pointer':'default'}} onClick={()=>p.bom&&handleExpandProduct(p)}>
                                <td style={{padding:'10px 14px',fontWeight:700,color:'#1e293b',display:'flex',alignItems:'center',gap:6}}>
                                  {p.bom && <span style={{fontSize:14,color:expandedProduct?._id===p._id?'#1e40af':'#94a3b8'}}>▶</span>}
                                  {p.productName}
                                </td>
                                <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:11.5,color:'#1e40af'}}>{p.oemSku||'—'}</td>
                                <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:11.5,color:'#64748b'}}>{p.oemPartNo||'—'}</td>
                                <td style={{padding:'10px 14px',fontWeight:700}}>₹{(p.unitPrice||0).toLocaleString()}</td>
                                <td style={{padding:'10px 14px',color:'#64748b'}}>{p.leadTimeDays||0}d</td>
                                <td style={{padding:'10px 14px',color:'#64748b'}}>{p.warrantyMonths||0}m</td>
                                <td style={{padding:'10px 14px',fontSize:11.5,color:'#2563eb',fontWeight:600}}>{p.bom?.bomId||'—'}</td>
                                <td style={{padding:'10px 14px',fontSize:11,color:'#64748b'}}>{(p.preferredRegions||[]).join(', ')||'All'}</td>
                                <td style={{padding:'10px 14px'}}><Badge label={p.status} color={p.status==='Active'?'#16a34a':p.status==='Discontinued'?'#ef4444':'#94a3b8'}/></td>
                                <td style={{padding:'10px 14px'}} onClick={e=>e.stopPropagation()}>
                                  <div style={{display:'flex',gap:5}}>
                                    <button onClick={()=>openEditProd(p)} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #e2e8f0',color:'#64748b',background:'#f8fafc',cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
                                    <button onClick={()=>handleDeleteProd(p)} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #fecaca',color:'#ef4444',background:'#fef2f2',cursor:'pointer',fontFamily:'inherit'}}>Remove</button>
                                  </div>
                                </td>
                              </tr>
                              {expandedProduct?._id === p._id && bomDetails && (
                                <tr style={{background:'#f0fdf4',borderBottom:'1px solid #e2e8f0'}}>
                                  <td colSpan="10" style={{padding:'16px 20px'}}>
                                    <div style={{marginBottom:12}}>
                                      <div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginBottom:8}}>
                                        BOM: {bomDetails.bomId} — {bomDetails.product} (v{bomDetails.version})
                                      </div>
                                      <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>
                                        Material Cost: ₹{bomDetails.materialCost?.toLocaleString()||0} | Total Cost: ₹{bomDetails.totalCost?.toLocaleString()||0}
                                      </div>
                                    </div>
                                    <div style={{overflowX:'auto'}}>
                                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11.5,background:'#fff',borderRadius:8,border:'1px solid #dcfce7'}}>
                                        <thead>
                                          <tr style={{background:'#ecfdf5'}}>
                                            {['Item','Code','Qty','Unit','Type','Unit Cost','Total','Vendor/OEM','Alternates'].map(h=>(
                                              <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#16a34a',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #dcfce7',whiteSpace:'nowrap'}}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {bomDetails.components?.map((comp,ci)=>(
                                            <tr key={ci} style={{borderBottom:'1px solid #f1f5f9',background:ci%2===0?'#fff':'#fafafa'}}>
                                              <td style={{padding:'8px 12px',fontWeight:600,color:'#1e293b'}}>{comp.itemName}</td>
                                              <td style={{padding:'8px 12px',fontFamily:'monospace',fontSize:10.5,color:'#64748b'}}>{comp.itemCode||'—'}</td>
                                              <td style={{padding:'8px 12px',fontWeight:700}}>{comp.qty}</td>
                                              <td style={{padding:'8px 12px',color:'#64748b'}}>{comp.unit}</td>
                                              <td style={{padding:'8px 12px',fontSize:10}}>
                                                <span style={{padding:'2px 8px',borderRadius:4,background:comp.type==='Raw'?'#fef3c7':comp.type==='Sub-Assembly'?'#dbeafe':'#f3e8ff',color:comp.type==='Raw'?'#92400e':comp.type==='Sub-Assembly'?'#1e40af':'#6b21a8',fontSize:9,fontWeight:600}}>
                                                  {comp.type}
                                                </span>
                                              </td>
                                              <td style={{padding:'8px 12px',fontWeight:600}}>₹{(comp.unitCost||0).toLocaleString()}</td>
                                              <td style={{padding:'8px 12px',fontWeight:700,color:'#16a34a'}}>₹{((comp.qty||0)*(comp.unitCost||0)).toLocaleString()}</td>
                                              <td style={{padding:'8px 12px',fontSize:10,color:'#2563eb'}}>
                                                {comp.vendorId?'Vendor':comp.oemBrand?'OEM':'—'}
                                              </td>
                                              <td style={{padding:'8px 12px',fontSize:10}}>
                                                {comp.alternates?.length>0?`${comp.alternates.length} alt.`:'—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/*  Work Orders Tab  */}
              {innerTab==='Work Orders' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div style={{padding:'14px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>Work Orders — {activeBrand.name}</div>
                    <span style={{fontSize:11.5,color:'#94a3b8'}}>{wos.length} orders</span>
                  </div>
                  {wos.length===0 ? <Empty msg="No work orders for this OEM brand yet." /> : (
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                        <thead><tr style={{background:'#f8fafc'}}>{['WO ID','Product','Target','Produced','Progress','Shift','Priority','Status','Actions'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {wos.map((wo,i)=>{
                            const pct=wo.qty>0?Math.round((wo.produced/wo.qty)*100):0;
                            const pc=pct>=100?'#16a34a':pct>=50?'#d97706':'#ef4444';
                            return (
                              <tr key={wo._id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafafa'}}>
                                <td style={{padding:'10px 14px',fontWeight:700,color:'#1e40af',fontFamily:'monospace'}}>{wo.woId}</td>
                                <td style={{padding:'10px 14px',fontWeight:600,color:'#1e293b'}}>{wo.product}</td>
                                <td style={{padding:'10px 14px',fontWeight:700}}>{wo.qty}</td>
                                <td style={{padding:'10px 14px',fontWeight:700,color:wo.produced>=wo.qty?'#16a34a':'#1e293b'}}>{wo.produced}</td>
                                <td style={{padding:'10px 14px',minWidth:100}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                                    <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:pc,borderRadius:3}}/></div>
                                    <span style={{fontSize:11,fontWeight:700,color:pc,minWidth:30}}>{pct}%</span>
                                  </div>
                                </td>
                                <td style={{padding:'10px 14px',color:'#64748b'}}>{wo.shift}</td>
                                <td style={{padding:'10px 14px'}}><Badge label={wo.priority} color={wo.priority==='Urgent'?'#ef4444':wo.priority==='High'?'#d97706':'#64748b'}/></td>
                                <td style={{padding:'10px 14px'}}><Badge label={wo.status} color={wo.status==='Completed'?'#16a34a':wo.status==='In-Progress'?'#2563eb':wo.status==='Cancelled'?'#94a3b8':'#d97706'}/></td>
                                <td style={{padding:'10px 14px'}}>
                                  <div style={{display:'flex',gap:5}}>
                                    {wo.status!=='Completed'&&wo.status!=='Cancelled'&&<button onClick={()=>{setShowProgressModal(wo);setProgressVal(String(wo.produced));}} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #1e40af',color:'#1e40af',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}>Update</button>}
                                    <button onClick={()=>handleDeleteWO(wo)} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #fecaca',color:'#ef4444',background:'#fef2f2',cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/*  OEM Orders Tab  */}
              {innerTab==='Orders' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div style={{padding:'14px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>OEM Orders — {activeBrand.name}</div>
                    <span style={{fontSize:11.5,color:'#94a3b8'}}>{orders.length} orders</span>
                  </div>
                  {orders.length===0 ? <Empty msg="No OEM orders yet." /> : (
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                        <thead><tr style={{background:'#f8fafc'}}>{['Order ID','Product','Qty','Status','Inv Status','Prod Status','Est Cost','Actions'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {orders.map((o,i)=>(
                            <tr key={o._id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafafa'}}>
                              <td style={{padding:'10px 14px',fontWeight:700,color:'#1e40af',fontFamily:'monospace'}}>{o.oemOrderId}</td>
                              <td style={{padding:'10px 14px',fontWeight:600,color:'#1e293b'}}>{o.product}</td>
                              <td style={{padding:'10px 14px',fontWeight:700}}>{o.quantity}</td>
                              <td style={{padding:'10px 14px'}}><Badge label={o.status} color={o.status==='Completed'?'#16a34a':o.status==='In-Production'?'#2563eb':'#d97706'}/></td>
                              <td style={{padding:'10px 14px'}}><Badge label={o.inventoryStatus} color={o.inventoryStatus==='Validated'?'#16a34a':'#94a3b8'}/></td>
                              <td style={{padding:'10px 14px'}}><Badge label={o.productionStatus} color={o.productionStatus==='Completed'?'#16a34a':o.productionStatus==='In-Progress'?'#2563eb':'#d97706'}/></td>
                              <td style={{padding:'10px 14px',fontWeight:700}}>₹{(o.estimatedCost||0).toLocaleString()}</td>
                              <td style={{padding:'10px 14px'}} onClick={e=>e.stopPropagation()}>
                                <div style={{display:'flex',gap:5}}>
                                  <button onClick={()=>handleDeleteOrder(o)} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #fecaca',color:'#ef4444',background:'#fef2f2',cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/*  OEM Invoices Tab  */}
              {innerTab==='Invoices' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div style={{padding:'14px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>OEM Invoices — {activeBrand.name}</div>
                    <span style={{fontSize:11.5,color:'#94a3b8'}}>{invoices.length} invoices</span>
                  </div>
                  {invoices.length===0 ? <Empty msg="No OEM invoices yet." /> : (
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                        <thead><tr style={{background:'#f8fafc'}}>{['Invoice #','Amount','Tax','Total','Payment Status','Paid','Pending','Actions'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {invoices.map((inv,i)=>(
                            <tr key={inv._id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafafa'}}>
                              <td style={{padding:'10px 14px',fontWeight:700,color:'#1e40af',fontFamily:'monospace'}}>{inv.invoiceNumber}</td>
                              <td style={{padding:'10px 14px',fontWeight:700}}>₹{(inv.subtotal||0).toLocaleString()}</td>
                              <td style={{padding:'10px 14px',color:'#64748b'}}>₹{(inv.taxAmount||0).toLocaleString()}</td>
                              <td style={{padding:'10px 14px',fontWeight:700,color:'#1e293b'}}>₹{(inv.totalAmount||0).toLocaleString()}</td>
                              <td style={{padding:'10px 14px'}}><Badge label={inv.paymentStatus} color={inv.paymentStatus==='Paid'?'#16a34a':inv.paymentStatus==='Partial'?'#d97706':'#ef4444'}/></td>
                              <td style={{padding:'10px 14px',fontWeight:700,color:'#16a34a'}}>₹{(inv.amountPaid||0).toLocaleString()}</td>
                              <td style={{padding:'10px 14px',fontWeight:700,color:'#ef4444'}}>₹{((inv.totalAmount||0)-(inv.amountPaid||0)).toLocaleString()}</td>
                              <td style={{padding:'10px 14px'}} onClick={e=>e.stopPropagation()}>
                                <div style={{display:'flex',gap:5}}>
                                  <button onClick={()=>handleDeleteInvoice(inv)} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #fecaca',color:'#ef4444',background:'#fef2f2',cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/*  Finished Goods Tab  */}
              {innerTab==='Finished Goods' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div style={{padding:'14px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>Finished Goods — {activeBrand.name}</div>
                    <span style={{fontSize:11.5,color:'#94a3b8'}}>{finishedGoods.length} batches</span>
                  </div>
                  {finishedGoods.length===0 ? <Empty msg="No finished goods yet." /> : (
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                        <thead><tr style={{background:'#f8fafc'}}>{['FG ID','Batch #','Product','Qty','QC Status','Status','Dispatch','Actions'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {finishedGoods.map((fg,i)=>(
                            <tr key={fg._id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafafa'}}>
                              <td style={{padding:'10px 14px',fontWeight:700,color:'#1e40af',fontFamily:'monospace'}}>{fg.finishedGoodsId}</td>
                              <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:11.5,color:'#64748b'}}>{fg.batchNumber}</td>
                              <td style={{padding:'10px 14px',fontWeight:600,color:'#1e293b'}}>{fg.product}</td>
                              <td style={{padding:'10px 14px',fontWeight:700}}>{fg.quantity}</td>
                              <td style={{padding:'10px 14px'}}><Badge label={fg.qcStatus} color={fg.qcStatus==='Passed'?'#16a34a':fg.qcStatus==='Failed'?'#ef4444':'#d97706'}/></td>
                              <td style={{padding:'10px 14px'}}><Badge label={fg.status} color={fg.status==='Dispatch-Ready'?'#2563eb':fg.status==='Dispatched'?'#16a34a':'#94a3b8'}/></td>
                              <td style={{padding:'10px 14px',fontSize:11,color:'#64748b'}}>{fg.trackingNumber||'—'}</td>
                              <td style={{padding:'10px 14px'}} onClick={e=>e.stopPropagation()}>
                                <div style={{display:'flex',gap:5}}>
                                  {(fg.qcStatus==='Failed'||fg.qcStatus==='Rework') && (
                                    <button onClick={async()=>{
                                      try{
                                        await oemFinishedGoodsApi.update(fg._id,{qcStatus:'Rework',status:'In-Storage'});
                                        toast('Sent for Rework/Washing');
                                        loadBrandData(activeBrand);
                                      }catch(e){toast(e.message||'Failed','error');}
                                    }} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #d97706',color:'#d97706',background:'#fffbeb',cursor:'pointer',fontFamily:'inherit'}}>🔄 Rework</button>
                                  )}
                                  {fg.qcStatus==='Passed' && fg.status!=='Dispatch-Ready' && (
                                    <button onClick={async()=>{
                                      try{
                                        await oemFinishedGoodsApi.update(fg._id,{status:'Dispatch-Ready'});
                                        toast('Marked Dispatch-Ready');
                                        loadBrandData(activeBrand);
                                      }catch(e){toast(e.message||'Failed','error');}
                                    }} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #2563eb',color:'#2563eb',background:'#eff6ff',cursor:'pointer',fontFamily:'inherit'}}>✓ Ready</button>
                                  )}
                                  <button onClick={()=>handleDeleteFinishedGoods(fg)} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,border:'1px solid #fecaca',color:'#ef4444',background:'#fef2f2',cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/*  Billing Tab  */}
              {innerTab==='Billing' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b',marginBottom:12}}>Billing Configuration</div>
                    {[['Billing Type',activeBrand.billingType],['Rate per Unit',`₹${(activeBrand.ratePerUnit||0).toLocaleString()}`],['GST Rate',`${activeBrand.gstRate||18}%`],['Payment Terms',activeBrand.paymentTerms||'Net 30'],['Monthly Target',(activeBrand.monthlyTarget||0).toLocaleString()],['Contact',activeBrand.contactPerson||'—'],['Email',activeBrand.contactEmail||'—']].map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #f1f5f9',fontSize:13}}>
                        <span style={{color:'#64748b'}}>{k}</span><span style={{fontWeight:700,color:'#1e293b'}}>{v}</span>
                      </div>
                    ))}
                    <button onClick={()=>openEditBrand(activeBrand)} style={{marginTop:14,width:'100%',padding:'9px',borderRadius:10,background:'linear-gradient(135deg,#3b82f6,#1e40af)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>Edit Billing Config</button>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b',marginBottom:12}}>Production Summary</div>
                    {[['Total WOs',wos.length],['Completed',wos.filter(w=>w.status==='Completed').length],['In-Progress',wos.filter(w=>w.status==='In-Progress').length],['Pending',wos.filter(w=>w.status==='Pending').length],['Total Produced',achieved.toLocaleString()],['Achievement %',`${achPct}%`]].map(([k,v],i,arr)=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<arr.length-1?'1px solid #f1f5f9':'none',fontSize:13}}>
                        <span style={{color:'#64748b'}}>{k}</span><span style={{fontWeight:800,color:brandColor}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/*  MODALS  */}

      {/* Add/Edit Brand */}
      <Modal open={showBrandModal} onClose={()=>setShowBrandModal(false)} title={editBrand?`Edit — ${editBrand.name}`:'Add OEM Brand'}
        footer={<><button className={btnO} onClick={()=>setShowBrandModal(false)}>Cancel</button><button className={btnP} onClick={handleSaveBrand}>{editBrand?'Save Changes':'Add Brand'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Brand Name *</label><input className={inp} placeholder="e.g. Tata Motors" value={brandForm.name} onChange={e=>setBrandForm(p=>({...p,name:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Brand Code *</label><input className={inp} placeholder="e.g. TM" value={brandForm.code} onChange={e=>setBrandForm(p=>({...p,code:e.target.value.toUpperCase()}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Accent Color</label><div style={{display:'flex',gap:8,alignItems:'center'}}><input type="color" value={brandForm.color} onChange={e=>setBrandForm(p=>({...p,color:e.target.value}))} style={{width:36,height:36,border:'none',borderRadius:8,cursor:'pointer',padding:2}}/><span style={{fontSize:12,color:'#64748b'}}>{brandForm.color}</span></div></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Billing Type</label><select className={inp} value={brandForm.billingType} onChange={e=>setBrandForm(p=>({...p,billingType:e.target.value}))}><option>Per Unit</option><option>Per Order</option><option>Monthly</option><option>Lump Sum</option><option>Monthly Contract</option></select></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Rate per Unit (₹)</label><input type="number" className={inp} placeholder="0.00" value={brandForm.ratePerUnit} onChange={e=>setBrandForm(p=>({...p,ratePerUnit:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">GST Rate (%)</label><select className={inp} value={brandForm.gstRate} onChange={e=>setBrandForm(p=>({...p,gstRate:parseInt(e.target.value)}))}><option value={18}>18%</option><option value={12}>12%</option><option value={5}>5%</option><option value={0}>0%</option></select></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Payment Terms</label><select className={inp} value={brandForm.paymentTerms} onChange={e=>setBrandForm(p=>({...p,paymentTerms:e.target.value}))}><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Advance Payment</option><option>COD</option></select></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Monthly Target</label><input type="number" className={inp} placeholder="0" value={brandForm.monthlyTarget} onChange={e=>setBrandForm(p=>({...p,monthlyTarget:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Contact Person</label><input className={inp} placeholder="Name" value={brandForm.contactPerson} onChange={e=>setBrandForm(p=>({...p,contactPerson:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Contact Email</label><input type="email" className={inp} placeholder="email@brand.com" value={brandForm.contactEmail} onChange={e=>setBrandForm(p=>({...p,contactEmail:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Contact Phone</label><input type="tel" className={inp} placeholder="10-digit number" maxLength={10} value={brandForm.contactPhone} onChange={e=>setBrandForm(p=>({...p,contactPhone:e.target.value.replace(/\D/g,'').slice(0,10)}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Status</label><select className={inp} value={brandForm.status||'Active'} onChange={e=>setBrandForm(p=>({...p,status:e.target.value}))}><option>Active</option><option>Inactive</option><option>Suspended</option></select></div>
        </div>
        <div className="flex flex-col gap-1.5 mt-3"><label className="text-xs font-semibold text-gray-600">Notes</label><textarea className={`${inp} resize-y min-h-[60px]`} placeholder="Contract notes..." value={brandForm.notes} onChange={e=>setBrandForm(p=>({...p,notes:e.target.value}))} /></div>
      </Modal>

      {/* Add/Edit Product */}
      <Modal open={showProdModal} onClose={()=>setShowProdModal(false)} title={editProd?`Edit Product — ${editProd.productName}`:`Add Product — ${activeBrand?.name||''}`}
        footer={<><button className={btnO} onClick={()=>setShowProdModal(false)}>Cancel</button><button className={btnP} onClick={handleSaveProd}>{editProd?'Save Changes':'Add Product'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Product Name *</label><input className={inp} placeholder="e.g. Engine Seal Kit" value={prodForm.productName} onChange={e=>setProdForm(p=>({...p,productName:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">OEM SKU (Brand's Part No)</label><input className={inp} placeholder="e.g. TM-ESK-001" value={prodForm.oemSku} onChange={e=>setProdForm(p=>({...p,oemSku:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Internal Part No</label><input className={inp} placeholder="e.g. CI-ESK-001" value={prodForm.oemPartNo} onChange={e=>setProdForm(p=>({...p,oemPartNo:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Unit Price (₹)</label><input type="number" className={inp} placeholder="0.00" value={prodForm.unitPrice} onChange={e=>setProdForm(p=>({...p,unitPrice:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Lead Time (days)</label><input type="number" className={inp} placeholder="0" value={prodForm.leadTimeDays} onChange={e=>setProdForm(p=>({...p,leadTimeDays:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Warranty (months)</label><input type="number" className={inp} placeholder="0" value={prodForm.warrantyMonths} onChange={e=>setProdForm(p=>({...p,warrantyMonths:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Min Order Qty</label><input type="number" className={inp} placeholder="1" value={prodForm.minOrderQty} onChange={e=>setProdForm(p=>({...p,minOrderQty:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Unit of Measure</label><input className={inp} placeholder="Set" value={prodForm.uom} onChange={e=>setProdForm(p=>({...p,uom:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Link BOM</label>
            <select className={inp} value={prodForm.bom} onChange={e=>setProdForm(p=>({...p,bom:e.target.value}))}>
              <option value="">— No BOM —</option>
              {bomList.map(b=><option key={b._id} value={b._id}>{b.bomId} — {b.product}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Auto-Select Priority</label><input type="number" className={inp} placeholder="0 (higher = preferred)" value={prodForm.autoSelectPriority} onChange={e=>setProdForm(p=>({...p,autoSelectPriority:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5 col-span-2"><label className="text-xs font-semibold text-gray-600">Preferred Regions (comma-separated)</label><input className={inp} placeholder="e.g. North, West, South" value={prodForm.preferredRegions} onChange={e=>setProdForm(p=>({...p,preferredRegions:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Status</label><select className={inp} value={prodForm.status} onChange={e=>setProdForm(p=>({...p,status:e.target.value}))}><option>Active</option><option>Inactive</option><option>Discontinued</option></select></div>
        </div>
        <div className="flex flex-col gap-1.5 mt-3"><label className="text-xs font-semibold text-gray-600">Notes</label><input className={inp} placeholder="Optional notes..." value={prodForm.notes} onChange={e=>setProdForm(p=>({...p,notes:e.target.value}))} /></div>
      </Modal>

      {/* New Work Order */}
      <Modal open={showWOModal} onClose={()=>setShowWOModal(false)} title={`New Work Order — ${activeBrand?.name||''}`}
        footer={<><button className={btnO} onClick={()=>setShowWOModal(false)}>Cancel</button><button className={btnP} onClick={handleCreateWO}>Create Work Order</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Product *</label>
            <select className={inp} value={woForm.product} onChange={e=>setWoForm(p=>({...p,product:e.target.value}))}>
              <option value="">— Select Product —</option>
              {products.map(p=><option key={p._id} value={p.productName}>{p.productName}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Target Quantity *</label><input type="number" min="1" className={inp} placeholder="0" value={woForm.qty} onChange={e=>setWoForm(p=>({...p,qty:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Start Date *</label><input type="date" className={inp} value={woForm.startDate} onChange={e=>setWoForm(p=>({...p,startDate:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">End Date</label><input type="date" className={inp} value={woForm.endDate} onChange={e=>setWoForm(p=>({...p,endDate:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Shift</label><select className={inp} value={woForm.shift} onChange={e=>setWoForm(p=>({...p,shift:e.target.value}))}><option>Morning</option><option>General</option><option>Night</option></select></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Priority</label><select className={inp} value={woForm.priority} onChange={e=>setWoForm(p=>({...p,priority:e.target.value}))}><option>Normal</option><option>High</option><option>Urgent</option></select></div>
        </div>
        <div className="flex flex-col gap-1.5 mt-3"><label className="text-xs font-semibold text-gray-600">Remarks</label><textarea className={`${inp} resize-y min-h-[60px]`} placeholder="Additional instructions..." value={woForm.remarks} onChange={e=>setWoForm(p=>({...p,remarks:e.target.value}))} /></div>
      </Modal>

      {/* New OEM Order */}
      <Modal open={showOrderModal} onClose={()=>setShowOrderModal(false)} title={`New OEM Order — ${activeBrand?.name||''}`}
        footer={<><button className={btnO} onClick={()=>setShowOrderModal(false)}>Cancel</button><button className={btnP} onClick={handleCreateOrder}>Create OEM Order</button></>}> 
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Product *</label>
            <select className={inp} value={orderForm.product} onChange={e=>handleOrderProductChange(e.target.value)}>
              <option value="">— Select Product —</option>
              {products.map(p=><option key={p._id} value={p.productName}>{p.productName}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Quantity *</label><input type="number" min="1" className={inp} placeholder="0" value={orderForm.quantity} onChange={e=>setOrderForm(p=>({...p,quantity:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">BOM *</label>
            <select className={inp} value={orderForm.bomId} onChange={e=>setOrderForm(p=>({...p,bomId:e.target.value}))}>
              <option value="">— Select BOM —</option>
              {bomList.map(b=><option key={b._id} value={b._id}>{b.bomId} — {b.product}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Unit</label><input className={inp} value={orderForm.unit} onChange={e=>setOrderForm(p=>({...p,unit:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Expected Delivery</label><input type="date" className={inp} value={orderForm.expectedDeliveryDate} onChange={e=>setOrderForm(p=>({...p,expectedDeliveryDate:e.target.value}))} /></div>
        </div>
        <div className="flex flex-col gap-1.5 mt-3"><label className="text-xs font-semibold text-gray-600">Remarks</label><textarea className={`${inp} resize-y min-h-[60px]`} placeholder="Order notes..." value={orderForm.remarks} onChange={e=>setOrderForm(p=>({...p,remarks:e.target.value}))} /></div>
      </Modal>

      {/* Update Progress */}
      <Modal open={!!showProgressModal} onClose={()=>{setShowProgressModal(null);setProgressVal('');}} title={`Update Progress — ${showProgressModal?.woId||''}`}
        footer={<><button className={btnO} onClick={()=>{setShowProgressModal(null);setProgressVal('');}}>Cancel</button><button className={btnP} onClick={handleUpdateProgress}>Save</button></>}>
        {showProgressModal && (
          <div>
            <div style={{display:'flex',gap:16,marginBottom:16,padding:'12px 16px',background:'#f8fafc',borderRadius:10}}>
              <div><div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>PRODUCT</div><div style={{fontSize:13,fontWeight:700}}>{showProgressModal.product}</div></div>
              <div><div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>TARGET</div><div style={{fontSize:13,fontWeight:700}}>{showProgressModal.qty}</div></div>
              <div><div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>CURRENT</div><div style={{fontSize:13,fontWeight:700,color:'#1e40af'}}>{showProgressModal.produced}</div></div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Produced Quantity (0 – {showProgressModal.qty})</label>
              <input type="number" min="0" max={showProgressModal.qty} className={inp} placeholder="Enter produced qty" value={progressVal} onChange={e=>setProgressVal(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      {/* Auto-Select OEM */}
      <Modal open={showAutoSelect} onClose={()=>{setShowAutoSelect(false);setAutoResult(null);}} title="Auto-Select Best OEM"
        footer={<><button className={btnO} onClick={()=>{setShowAutoSelect(false);setAutoResult(null);}}>Close</button><button className={btnP} onClick={handleAutoSelect}>Find Best OEM</button></>}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Product Name *</label><input className={inp} placeholder="e.g. Engine Seal Kit" value={autoQuery.productName} onChange={e=>setAutoQuery(p=>({...p,productName:e.target.value}))} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-600">Region (optional)</label><input className={inp} placeholder="e.g. North" value={autoQuery.region} onChange={e=>setAutoQuery(p=>({...p,region:e.target.value}))} /></div>
        </div>
        {autoResult && (
          <div style={{padding:'14px 16px',background:'#f0fdf4',borderRadius:10,border:'1px solid #bbf7d0'}}>
            {autoResult.data ? (
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#16a34a',marginBottom:8}}> Best OEM Found</div>
                {[['Brand',autoResult.data.oemBrand?.name],['OEM SKU',autoResult.data.oemSku||'—'],['Unit Price',`₹${(autoResult.data.unitPrice||0).toLocaleString()}`],['Lead Time',`${autoResult.data.leadTimeDays||0} days`],['Warranty',`${autoResult.data.warrantyMonths||0} months`],['Priority Score',autoResult.data.autoSelectPriority]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12.5,padding:'4px 0',borderBottom:'1px solid #dcfce7'}}>
                    <span style={{color:'#64748b'}}>{k}</span><span style={{fontWeight:700,color:'#1e293b'}}>{v}</span>
                  </div>
                ))}
                {autoResult.allCandidates?.length > 1 && <div style={{fontSize:11,color:'#64748b',marginTop:8}}>{autoResult.allCandidates.length} candidates found — showing best match</div>}
              </div>
            ) : (
              <div style={{fontSize:13,color:'#64748b'}}>{autoResult.message || 'No OEM found for this product'}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
