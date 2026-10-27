import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MdPrecisionManufacturing, MdClose, MdWarning, MdSearch,
  MdCheckCircle, MdDeleteOutline, MdEdit, MdVisibility,
  MdRefresh, MdDownload,
} from 'react-icons/md';
import { vendorApi } from '../../api/vendorApi';
import { inventoryApi } from '../../api/inventoryApi';
import { productionApi } from '../../api/productionApi';
import { categoryApi } from '../../api/categoryApi';
import * as XLSX from 'xlsx';

const C = {
  red:'#1e40af', red2:'#ef4444', redBg:'#fef2f2', redBorder:'#fecaca',
  green:'#16a34a', greenBg:'#f0fdf4', greenBorder:'#bbf7d0',
  amber:'#d97706', amberBg:'#fffbeb', amberBorder:'#fde68a',
  blue:'#2563eb', blueBg:'#eff6ff', blueBorder:'#bfdbfe',
  indigo:'#4338ca', indigoBg:'#eef2ff', indigoBorder:'#c7d2fe',
  dark:'#0f172a', mid:'#475569', light:'#94a3b8',
  border:'1px solid #e2e8f0', bg:'#f8fafc', white:'#ffffff',
};
const inp    = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', background:'#fff', color:C.dark, fontFamily:'inherit', boxSizing:'border-box' };
const inpSm  = { ...inp, padding:'7px 10px', fontSize:12 };
const inpRO  = { ...inp, background:'#f0fdf4', color:C.green, fontWeight:600 };
const lbl    = { fontSize:11.5, fontWeight:700, color:C.mid, marginBottom:4, display:'block' };
const secTtl = { fontSize:11, fontWeight:800, color:C.dark, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10, paddingBottom:6, borderBottom:'1px solid #f1f5f9' };

const fmt    = n => Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtQ   = n => (n!=null&&n!=='') ? Number(n).toLocaleString('en-IN') : '—';
const toDay  = () => new Date().toISOString().split('T')[0];
const toMo   = () => new Date().toISOString().slice(0,7);

const SHIFTS   = ['Morning','Evening','Night','General'];
const STATUSES = ['Draft','Completed','Approved','On Hold','Cancelled'];
const UNITS    = ['Nos','Pcs','Kg','Ltr','Mtr','Box','Set','Gm','Ml','Pack'];

const blank = {
  productName:'', productCode:'', category:'', unit:'Nos',
  vendorId:'', companyName:'',
  machineName:'', operatorName:'',
  productionDate:toDay(), shift:'Morning', status:'Completed',
  damageReason:'', remarks:'',
  plannedQty:'', producedQty:'', goodQty:'', damagedQty:'', rejectedQty:'', reworkQty:'',
  sellingPrice:'', costPrice:'', unitPrice:'', gstPct:'',
};

function SBadge({ s }) {
  const m = { Completed:{bg:'#dcfce7',c:'#16a34a',b:'#bbf7d0'}, Approved:{bg:'#dbeafe',c:'#1d4ed8',b:'#bfdbfe'}, Draft:{bg:'#f1f5f9',c:'#475569',b:'#e2e8f0'}, 'On Hold':{bg:'#fef9c3',c:'#a16207',b:'#fde68a'}, Cancelled:{bg:'#fee2e2',c:'#b91c1c',b:'#fecaca'} };
  const t = m[s]||m.Draft;
  return <span style={{padding:'2px 10px',borderRadius:20,fontSize:10.5,fontWeight:700,background:t.bg,color:t.c,border:`1px solid ${t.b}`,whiteSpace:'nowrap'}}>{s||'—'}</span>;
}
function Spin() {
  return <div style={{width:18,height:18,border:'2px solid #fecaca',borderTopColor:C.red,borderRadius:'50%',animation:'_sp .7s linear infinite'}}/>;
}

export default function ProductionManagementPage({ externalShowModal=false, onExternalModalClose }) {
  const [openAdd,  setOpenAdd]  = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const isAdd = externalShowModal || openAdd;

  const [form,     setForm]     = useState({...blank});
  const [editId,   setEditId]   = useState(null);
  const [err,      setErr]      = useState('');
  const [saving,   setSaving]   = useState(false);
  const [prodMode, setProdMode] = useState('item_master'); // 'item_master' | 'manual'

  const [list,       setList]       = useState([]);
  const [vendors,    setVendors]    = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [toast,      setToast]      = useState(null);
  const [listLoad,   setListLoad]   = useState(false);
  const [dropLoad,   setDropLoad]   = useState(false);
  const [priceLoad,  setPriceLoad]  = useState(false);
  const [page,       setPage]       = useState(1);
  const [totPages,   setTotPages]   = useState(1);
  const [total,      setTotal]      = useState(0);
  const PS = 25;

  const [fMonth,   setFMonth]   = useState(toMo());
  const [fSearch,  setFSearch]  = useState('');
  const [fCompany, setFCompany] = useState('');
  const [fProduct, setFProduct] = useState('');
  const [fShift,   setFShift]   = useState('');
  const [fStatus,  setFStatus]  = useState('');

  const companies = useMemo(()=>[...new Set(list.map(i=>i.companyName).filter(Boolean))].sort(),[list]);
  const products  = useMemo(()=>[...new Set(list.map(i=>i.productName).filter(Boolean))].sort(), [list]);

  const toast$ = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const fetchList = useCallback(async (pg=1)=>{
    setListLoad(true);
    try {
      const p={page:pg,limit:PS};
      if(fMonth)   p.month   = fMonth;
      if(fSearch)  p.search  = fSearch;
      if(fCompany) p.company = fCompany;
      if(fProduct) p.product = fProduct;
      if(fShift)   p.shift   = fShift;
      if(fStatus)  p.status  = fStatus;
      const r = await productionApi.getAll(p);
      setList(r.data||[]); setTotal(r.total||0); setTotPages(r.pages||1); setPage(pg);
    } catch(e){ toast$(e.message||'Load failed','error'); }
    finally{ setListLoad(false); }
  },[fMonth,fSearch,fCompany,fProduct,fShift,fStatus]);

  useEffect(()=>{ fetchList(1); },[fetchList]);

  /* load dropdowns whenever any modal opens */
  const anyModal = isAdd || openEdit;
  useEffect(()=>{
    if(!anyModal) return;
    setDropLoad(true);
    Promise.all([
      vendorApi.getAll({limit:200}).catch(()=>({data:[]})),
      inventoryApi.getAll().catch(()=>({data:[]})),
      categoryApi.getAll().catch(()=>({data:[]})),
    ]).then(([vR,iR,cR])=>{
      setVendors(vR.data||vR.vendors||[]);
      const seen=new Set();
      setStockItems((iR.data||[]).filter(i=>{ const k=(i.sku||String(i._id||'')).toUpperCase(); if(seen.has(k))return false; seen.add(k);return true; }));
      setCategories(cR.data||[]);
    }).finally(()=>setDropLoad(false));
  },[anyModal]);

  const hC  = e => setForm(p=>({...p,[e.target.name]:e.target.value}));
  const hQ  = e => setForm(p=>({...p,[e.target.name]:e.target.value.replace(/[^0-9]/g,'')}));
  const rst = () => { setForm({...blank}); setEditId(null); setErr(''); setProdMode('item_master'); };
  const closeAdd  = () => { setOpenAdd(false); onExternalModalClose?.(); rst(); };
  const closeEdit = () => { setOpenEdit(false); rst(); };

  /* product select → auto-fill */
  const hProd = async e => {
    const it = stockItems.find(x=>String(x._id||x.id)===e.target.value);
    if(!it){ setForm(p=>({...p,productName:'',productCode:'',category:'',unit:'Nos',sellingPrice:'',costPrice:'',unitPrice:'',gstPct:'',vendorId:'',companyName:''})); return; }

    /* ── Resolve category from categories list ── */
    const rawCat = it.category;
    let resolvedCat = '';
    if (rawCat) {
      if (typeof rawCat === 'object') {
        // Populated object — use name
        resolvedCat = rawCat.name || rawCat.categoryName || rawCat.label || '';
      } else {
        // Plain string — use as is
        resolvedCat = String(rawCat);
      }
    }

    const pv  = it.vendorId&&typeof it.vendorId==='object'?it.vendorId:null;
    const pvId= pv?String(pv._id||''):'';
    const pvN = pv?(pv.companyName||pv.name||''):'';
    const mv  = pvId?vendors.find(v=>String(v._id||v.id)===pvId):null;
    setForm(p=>({...p,
      productName: it.name||'',
      productCode: it.sku||'',
      category:    resolvedCat,
      unit:        it.unit||'Nos',
      sellingPrice:String(it.sellingPrice||it.unitPrice||0),
      costPrice:   String(it.costPrice||it.unitPrice||0),
      unitPrice:   String(it.unitPrice||0),
      gstPct:      String(it.gst||0),
      vendorId:    mv?String(mv._id||mv.id):pvId,
      companyName: mv?(mv.companyName||mv.name||''):pvN,
    }));
    if(!pvId&&(it.sku||it.name)){
      setPriceLoad(true);
      try{
        const pr=await vendorApi.getPricesByProduct({productCode:it.sku,productName:it.name}).catch(()=>null);
        const px=pr?.data||[];
        if(px.length){ const b=px[0]; const bid=String(b.vendor?._id||b.vendor||''); const bv=vendors.find(v=>String(v._id||v.id)===bid); setForm(p=>({...p,vendorId:bid,companyName:b.vendor?.companyName||bv?.companyName||'',sellingPrice:String(b.unitPrice||p.sellingPrice)})); }
      }catch{}finally{setPriceLoad(false);}
    }
  };

  /* vendor select → fetch prices */
  const hVend = async e => {
    const sid=e.target.value;
    const v=vendors.find(x=>String(x._id||x.id)===sid);
    setForm(p => {
      // Update vendor fields
      const updated = { ...p, vendorId: sid, companyName: v ? (v.companyName || v.name || '') : '' };
      
      // If vendor has a category, set it as the selected category
      if (v?.category) {
        updated.category = v.category;
      } else {
        // If no vendor or vendor has no category, reset category
        updated.category = '';
      }
      
      return updated;
    });
    if(!sid)return;
    setPriceLoad(true);
    try{
      const res=await vendorApi.getPrices(sid).catch(()=>null);
      const px=res?.data||[];
      if(!px.length)return;
      const cc=form.productCode?.trim().toUpperCase();
      const cn=form.productName?.trim().toLowerCase();
      const m=(cc&&px.find(p=>p.productCode?.trim().toUpperCase()===cc))||(cn&&px.find(p=>p.productName?.trim().toLowerCase()===cn));
      if(m) setForm(p=>({...p,sellingPrice:String(m.unitPrice||p.sellingPrice||''),unitPrice:String(m.unitPrice||p.unitPrice||'')}));
    }catch{}finally{setPriceLoad(false);}
  };

  /* live calc */
  const C$ = useMemo(()=>{
    const pr=Number(form.producedQty)||0, pl=Number(form.plannedQty)||0;
    const g=Number(form.goodQty)||0, d=Number(form.damagedQty)||0, r=Number(form.rejectedQty)||0;
    const sp=Number(form.sellingPrice)||0, cp=Number(form.costPrice)||sp;
    const dmg=pr>0?(d/pr*100):0, eff=pl>0?(g/pl*100):0;
    const gv=g*sp, loss=(d+r)*cp, np=gv-loss;
    return {dmg,eff,gv,loss,np};
  },[form]);

  // Get the selected vendor's category
  const selectedVendor = vendors.find(v => String(v._id || v.id) === String(form.vendorId));
  const vendorCategory = selectedVendor?.category;

  const categoryNames = categories.map(c => c.name || c); // Like VendorsPage.jsx does!

  // Filter categories: if vendor selected, show vendor's category first, plus all others (array of strings)
  const filteredCategories = vendorCategory 
    ? [
        // First add the vendor's category (if not already in categoryNames)
        ...(categoryNames.includes(vendorCategory) ? [] : [vendorCategory]),
        // Then add all categoryNames
        ...categoryNames
      ].filter((cat, index, arr) => 
        // Remove duplicates
        index === arr.indexOf(cat)
      )
    : categoryNames;

  const getCategoryName = (catValue) => {
    if (!catValue) return '';
    const matched = categories.find(c => String(c._id||c.id||'') === String(catValue) || (c.name||c.categoryName||'').toLowerCase() === String(catValue).toLowerCase());
    return matched ? (matched.name || matched.categoryName) : catValue;
  };

  const openEdit$ = item => {
    // Resolve category to name
    let resolvedCategory = item.category || '';
    if (resolvedCategory) {
      const matched = categories.find(c =>
        String(c._id||c.id||'') === String(resolvedCategory) ||
        (c.name||c.categoryName||'').toLowerCase() === String(resolvedCategory).toLowerCase()
      );
      if (matched) {
        resolvedCategory = matched.name || matched.categoryName || resolvedCategory;
      }
    }
    setForm({
      productName:item.productName||'', productCode:item.productCode||'',
      category:resolvedCategory, unit:item.unit||'Nos',
      vendorId:item.vendorId||'', companyName:item.companyName||'',
      machineName:item.machineName||'', operatorName:item.operatorName||'',
      productionDate:item.productionDate?item.productionDate.split('T')[0]:toDay(),
      shift:item.shift||'Morning', status:item.status||'Completed',
      damageReason:item.damageReason||'', remarks:item.remarks||'',
      plannedQty:String(item.plannedQty||''), producedQty:String(item.producedQty||''),
      goodQty:String(item.goodQty||''), damagedQty:String(item.damagedQty||''),
      rejectedQty:String(item.rejectedQty||''), reworkQty:String(item.reworkQty||''),
      sellingPrice:String(item.sellingPrice||''), costPrice:String(item.costPrice||''),
      unitPrice:String(item.unitPrice||''), gstPct:String(item.gstPct||''),
    });
    setEditId(item._id||item.id);
    setOpenEdit(true);
    setViewItem(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const company=form.companyName||vendors.find(v=>String(v._id||v.id)===form.vendorId)?.companyName||'';
    if(!form.productName||!company||!form.productionDate){ setErr('Product Name, Company and Date are required.'); return; }
    setSaving(true); setErr('');
    try{
      const pay={
        productName:form.productName, productCode:form.productCode, category:form.category, unit:form.unit||'Nos',
        companyName:company, machineName:form.machineName, operatorName:form.operatorName,
        productionDate:form.productionDate, shift:form.shift, status:form.status||'Completed',
        damageReason:form.damageReason, remarks:form.remarks,
        plannedQty:Number(form.plannedQty)||0, producedQty:Number(form.producedQty)||0,
        goodQty:Number(form.goodQty)||0, damagedQty:Number(form.damagedQty)||0,
        rejectedQty:Number(form.rejectedQty)||0, reworkQty:Number(form.reworkQty)||0,
        sellingPrice:Number(form.sellingPrice)||0, costPrice:Number(form.costPrice)||0,
        unitPrice:Number(form.unitPrice)||0, gstPct:Number(form.gstPct)||0,
      };
      if(editId){ await productionApi.update(editId,pay); toast$('Updated.'); closeEdit(); }
      else      { await productionApi.create(pay);        toast$('Saved.');   closeAdd();  }
      fetchList(1);
    }catch(ex){ setErr(ex.message||'Failed.'); }
    finally{ setSaving(false); }
  };

  const delItem = async id => {
    if(!window.confirm('Delete this entry?'))return;
    try{ await productionApi.remove(id); toast$('Deleted.','error'); fetchList(page); }
    catch(ex){ toast$(ex.message||'Failed','error'); }
  };

  const exportXL = ()=>{
    if(!list.length){ toast$('No data','error'); return; }
    const rows=list.map(r=>({'Prod No':r.productionNo,'Date':(r.productionDate||'').split('T')[0],'Company':r.companyName,'Product':r.productName,'Code':r.productCode,'Shift':r.shift,'Planned':r.plannedQty,'Produced':r.producedQty,'Good':r.goodQty,'Damaged':r.damagedQty,'Rejected':r.rejectedQty,'Rework':r.reworkQty,'Dmg%':r.damagePercentage,'Eff%':r.efficiencyPercentage,'Good Value':r.totalGoodValue,'Loss':r.totalLoss,'Net P/L':r.netProfit,'Status':r.status}));
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Production'); XLSX.writeFile(wb,`Production_${fMonth||'All'}.xlsx`);
    toast$('Exported.');
  };

  const selId = stockItems.find(i=>i.sku===form.productCode)?._id||stockItems.find(i=>i.name===form.productName)?._id||'';

  const QF = ({name,label,color})=>(
    <div>
      <label style={lbl}>{label}</label>
      <input type="text" inputMode="numeric" name={name} value={form[name]} onChange={hQ} placeholder="0"
        style={{...inp,fontWeight:form[name]?700:400,color:form[name]?(color||C.dark):C.light,textAlign:'right'}}/>
      {form[name]&&Number(form[name])>0&&<span style={{fontSize:10,color:color||C.mid,display:'block',textAlign:'right',marginTop:1,fontWeight:600}}>{Number(form[name]).toLocaleString('en-IN')}</span>}
    </div>
  );

  /* ── Form shared between Add and Edit ── */
  const FormBody = ({isEdit}) => (
    <form onSubmit={handleSubmit} style={{padding:'18px 22px 22px'}}>
      {err&&<div style={{marginBottom:12,padding:'9px 13px',background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:7,fontSize:12.5,color:C.red,fontWeight:700,display:'flex',alignItems:'center',gap:6}}><MdWarning size={14}/>{err}</div>}

      {/* ── Product Selection (above Basic Info) ── */}
      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:C.dark,marginBottom:10}}>
          Select Product (from Item Master) <span style={{color:C.red}}>*</span>
        </div>

        {/* Toggle — only shown in Add mode */}
        {!isEdit && (
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <button type="button"
              onClick={()=>{ setProdMode('item_master'); setForm(p=>({...p,productName:'',productCode:'',category:'',unit:'Nos',sellingPrice:'',costPrice:'',unitPrice:'',gstPct:''})); }}
              style={{padding:'7px 20px',borderRadius:8,fontFamily:'inherit',fontSize:12.5,fontWeight:700,cursor:'pointer',
                background: prodMode==='item_master' ? 'linear-gradient(135deg,#3b82f6,#1e40af)' : '#fff',
                color:      prodMode==='item_master' ? '#fff' : C.mid,
                border:     prodMode==='item_master' ? 'none' : '1px solid #e2e8f0',
                boxShadow:  prodMode==='item_master' ? '0 3px 10px rgba(185,28,28,.25)' : 'none',
              }}>
              From Production data auto
            </button>
            <button type="button"
              onClick={()=>{ setProdMode('manual'); setForm(p=>({...p,productName:'',productCode:'',category:'',unit:'Nos',sellingPrice:'',costPrice:'',unitPrice:'',gstPct:''})); }}
              style={{padding:'7px 20px',borderRadius:8,fontFamily:'inherit',fontSize:12.5,fontWeight:700,cursor:'pointer',
                background: prodMode==='manual' ? 'linear-gradient(135deg,#3b82f6,#1e40af)' : '#fff',
                color:      prodMode==='manual' ? '#fff' : C.mid,
                border:     prodMode==='manual' ? 'none' : '1px solid #e2e8f0',
                boxShadow:  prodMode==='manual' ? '0 3px 10px rgba(185,28,28,.25)' : 'none',
              }}>
              Enter Manually
            </button>
          </div>
        )}

        {/* FROM ITEM MASTER: dropdown + read-only preview */}
        {!isEdit && prodMode==='item_master' && (
          <>
            {dropLoad
              ? <div style={{...inp,color:C.light,marginBottom:10}}>Loading products…</div>
              : <select value={selId} onChange={hProd} style={{...inp,marginBottom:10}}>
                  <option value="">— Select Product —</option>
                  {stockItems.map(i=><option key={i._id||i.id} value={i._id||i.id}>{i.name}{i.sku?` (${i.sku})`:''}</option>)}
                </select>
            }
            <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 0.8fr',gap:10}}>
              <div>
                <label style={lbl}>Product Name (auto-filled)</label>
                <input readOnly value={form.productName} placeholder="Auto-filled" style={{...inp,background:'#fff',color:form.productName?C.green:C.light,fontWeight:form.productName?700:400}}/>
              </div>
              <div>
                <label style={lbl}>Product Code</label>
                <input readOnly value={form.productCode} placeholder="Auto-filled" style={{...inp,background:'#fff',color:form.productCode?C.green:C.light,fontWeight:form.productCode?700:400}}/>
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select name="category" value={form.category} onChange={hC} style={{...inp, background:'#fff', color: form.category ? C.green : C.light, fontWeight: form.category ? 700 : 400}}>
                  <option value="">— Select Category —</option>
                  {filteredCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Unit</label>
                <input readOnly value={form.unit} style={{...inp,background:'#fff',color:C.green,fontWeight:700}}/>
              </div>
            </div>
          </>
        )}

        {/* MANUAL / EDIT: all fields editable */}
        {(isEdit || prodMode==='manual') && (
          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 0.8fr',gap:10}}>
            <div>
              <label style={lbl}>Product Name <span style={{color:C.red}}>*</span></label>
              <input type="text" name="productName" value={form.productName} onChange={hC} placeholder="Enter product name" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Product Code</label>
              <input type="text" name="productCode" value={form.productCode} onChange={hC} placeholder="e.g. SKU-001" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Category</label>
              <select name="category" value={form.category} onChange={hC} style={inp}>
                <option value="">— Select Category —</option>
                {filteredCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <select name="unit" value={form.unit} onChange={hC} style={inp}>
                {UNITS.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div style={secTtl}>Basic Information</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1.5fr',gap:12,marginBottom:12}}>
        <div>
          <label style={lbl}>Production Date <span style={{color:C.red}}>*</span></label>
          <input type="date" name="productionDate" value={form.productionDate} onChange={hC} style={inp}/>
        </div>
        <div>
          <label style={lbl}>Shift</label>
          <select name="shift" value={form.shift} onChange={hC} style={inp}>
            <option value="">— Select Shift —</option>
            {SHIFTS.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Company Name <span style={{color:C.red}}>*</span></label>
          {priceLoad
            ? <div style={{...inp,display:'flex',alignItems:'center',gap:6,color:C.light}}><Spin/>Fetching prices…</div>
            : <select name="vendorId" value={form.vendorId} onChange={hVend} style={form.vendorId?inpRO:inp}>
                <option value="">— Select Company —</option>
                {vendors.map(v=><option key={v._id||v.id} value={v._id||v.id}>{v.companyName||v.name}</option>)}
              </select>
          }
          {form.companyName&&!priceLoad&&<span style={{fontSize:10,color:C.green,marginTop:2,display:'flex',alignItems:'center',gap:2,fontWeight:700}}><MdCheckCircle size={10}/>{form.companyName}{form.sellingPrice?<span style={{color:C.blue,marginLeft:4}}>· ₹{Number(form.sellingPrice).toLocaleString('en-IN')}</span>:null}</span>}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
        <div>
          <label style={lbl}>Machine Name</label>
          <textarea name="machineName" value={form.machineName} onChange={hC} placeholder="e.g. CNC-01, Lathe-02" style={{...inp, minHeight:'60px', resize:'both', lineHeight:'1.5'}}/>
        </div>
        <div>
          <label style={lbl}>Operator Name</label>
          <textarea name="operatorName" value={form.operatorName} onChange={hC} placeholder="Operator / Supervisor Name" style={{...inp, minHeight:'60px', resize:'both', lineHeight:'1.5'}}/>
        </div>
        <div>
          <label style={lbl}>Status</label>
          <select name="status" value={form.status} onChange={hC} style={inp}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Production Details */}
      <div style={secTtl}>Production Details</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:12}}>
        <QF name="plannedQty"  label="Planned Quantity *"  color={C.blue}/>
        <QF name="producedQty" label="Produced Quantity *" color={C.dark}/>
        <QF name="goodQty"     label="Good Quantity *"     color={C.green}/>
        <QF name="damagedQty"  label="Damaged Quantity"    color={C.amber}/>
        <QF name="rejectedQty" label="Rejected Quantity"   color={C.red2}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <QF name="reworkQty" label="Rework Quantity" color={C.indigo}/>
        <div>
          <label style={lbl}>Product Selling Price (₹)</label>
          <input type="number" name="sellingPrice" value={form.sellingPrice} onChange={hC} min={0} placeholder="0.00"
            style={(!isEdit && prodMode==='item_master' && form.sellingPrice)?inpRO:inp}/>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Remarks</label>
        <textarea name="remarks" value={form.remarks} onChange={hC} placeholder="Additional notes, observations, or any other relevant details..." style={{...inp, minHeight:'150px', resize:'both', lineHeight:'1.5'}}/>
      </div>

      {/* Auto Calculations */}
      <div style={secTtl}>Auto Calculations</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
        {[['Damage %',`${C$.dmg.toFixed(2)}%`,C$.dmg>10?C.red:C.amber],['Efficiency %',`${C$.eff.toFixed(2)}%`,C$.eff>=80?C.green:C.amber],['Good Value',`₹${fmt(C$.gv)}`,C.green],['Loss',`₹${fmt(C$.loss)}`,C.red]].map(([k,v,col])=>(
          <div key={k} style={{background:C.bg,border:C.border,borderRadius:8,padding:'9px',textAlign:'center'}}>
            <div style={{fontSize:9.5,fontWeight:700,color:C.light,textTransform:'uppercase',marginBottom:2}}>{k}</div>
            <div style={{fontSize:15,fontWeight:900,color:col}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{background:C$.np>=0?C.greenBg:C.redBg,border:`1px solid ${C$.np>=0?C.greenBorder:C.redBorder}`,borderRadius:8,padding:'9px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontSize:11.5,fontWeight:700,color:C.mid}}>Net Profit / Loss</span>
        <span style={{fontSize:17,fontWeight:900,color:C$.np>=0?C.green:C.red}}>₹{fmt(C$.np)}</span>
      </div>

      <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:14,borderTop:'1px solid #f1f5f9'}}>
        <button type="button" onClick={isEdit?closeEdit:closeAdd} disabled={saving}
          style={{padding:'9px 24px',borderRadius:8,border:'1px solid #e2e8f0',background:C.white,color:C.mid,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          style={{padding:'9px 28px',borderRadius:8,border:'none',background:saving?'#94a3b8':'linear-gradient(135deg,#3b82f6,#1e40af)',color:'#fff',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(185,28,28,.28)',display:'flex',alignItems:'center',gap:6}}>
          <MdPrecisionManufacturing size={14}/>{saving?'Saving…':isEdit?'Update Production':'Save Production'}
        </button>
      </div>
    </form>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>

      {toast&&<div style={{position:'fixed',bottom:24,right:24,zIndex:99999,padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.14)',background:toast.type==='error'?C.redBg:C.greenBg,color:toast.type==='error'?C.red:C.green,border:`1px solid ${toast.type==='error'?C.redBorder:C.greenBorder}`}}>{toast.msg}</div>}

      {/* Filter Bar */}
      <div style={{background:C.white,border:C.border,borderRadius:10,padding:'10px 14px',display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <label style={{fontSize:10.5,fontWeight:600,color:C.light}}>Month</label>
          <input type="month" value={fMonth} onChange={e=>{setFMonth(e.target.value);setPage(1);}} style={{...inpSm,width:138}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2,minWidth:130}}>
          <label style={{fontSize:10.5,fontWeight:600,color:C.light}}>Company</label>
          <select value={fCompany} onChange={e=>setFCompany(e.target.value)} style={inpSm}>
            <option value="">All Companies</option>
            {companies.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2,minWidth:130}}>
          <label style={{fontSize:10.5,fontWeight:600,color:C.light}}>Product</label>
          <select value={fProduct} onChange={e=>setFProduct(e.target.value)} style={inpSm}>
            <option value="">All Products</option>
            {products.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2,minWidth:105}}>
          <label style={{fontSize:10.5,fontWeight:600,color:C.light}}>Shift</label>
          <select value={fShift} onChange={e=>setFShift(e.target.value)} style={inpSm}>
            <option value="">All Shifts</option>
            {SHIFTS.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2,minWidth:115}}>
          <label style={{fontSize:10.5,fontWeight:600,color:C.light}}>Status</label>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={inpSm}>
            <option value="">All Status</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2,flex:1,minWidth:170}}>
          <label style={{fontSize:10.5,fontWeight:600,color:C.light}}>Search</label>
          <div style={{display:'flex',alignItems:'center',gap:5,border:'1px solid #e2e8f0',borderRadius:8,padding:'7px 10px',background:'#fff'}}>
            <MdSearch size={13} color={C.light}/>
            <input type="text" value={fSearch} onChange={e=>setFSearch(e.target.value)} placeholder="Search product, code, machine…"
              style={{border:'none',outline:'none',background:'transparent',fontSize:12,color:C.dark,fontFamily:'inherit',width:'100%'}}/>
          </div>
        </div>
        <div style={{display:'flex',gap:6,paddingBottom:1}}>
          <button onClick={()=>{setFSearch('');setFCompany('');setFProduct('');setFShift('');setFStatus('');}}
            style={{padding:'7px 14px',border:C.border,borderRadius:8,background:C.bg,cursor:'pointer',fontSize:12,color:C.mid,fontFamily:'inherit',fontWeight:600}}>Reset</button>
          <button onClick={()=>fetchList(1)} style={{display:'flex',alignItems:'center',gap:3,padding:'7px 11px',border:C.border,borderRadius:8,background:C.bg,cursor:'pointer',fontSize:12,color:C.mid}}>
            <MdRefresh size={13}/>
          </button>
          <button onClick={exportXL} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 13px',border:`1px solid ${C.greenBorder}`,borderRadius:8,background:C.greenBg,cursor:'pointer',fontSize:12,color:C.green,fontWeight:700}}>
            <MdDownload size={13}/>Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{background:C.white,border:C.border,borderRadius:14,overflow:'hidden',boxShadow:'0 2px 10px rgba(15,23,42,.05)'}}>
        <div style={{padding:'10px 16px',borderBottom:C.border,display:'flex',alignItems:'center',gap:8}}>
          <MdPrecisionManufacturing size={14} color={C.red}/>
          <span style={{fontSize:13,fontWeight:800,color:C.dark}}>Production Records</span>
          <span style={{padding:'1px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:C.redBg,color:C.red}}>{total}</span>
        </div>

        {listLoad ? (
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:10,padding:'50px 0'}}><Spin/><span style={{color:C.light,fontSize:13}}>Loading…</span></div>
        ):(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:1500,fontSize:12}}>
            <thead>
              <tr style={{background:C.bg}}>
                {['#','Product Name','Product Code','Company','Production Date','Machine','Operator','Planned Qty','Produced Qty','Good Qty','Damaged Qty','Rejected Qty','Rework Qty','Damage %','Efficiency %','Good Value','Loss','Net P/L','Shift','Status','Action'].map(h=>(
                  <th key={h} style={{padding:'9px 10px',textAlign:'left',fontSize:10,fontWeight:700,color:C.light,textTransform:'uppercase',letterSpacing:'.3px',borderBottom:C.border,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!list.length?(
                <tr><td colSpan={21} style={{padding:'50px 0',textAlign:'center'}}>
                  <MdPrecisionManufacturing size={36} color={C.light} style={{display:'block',margin:'0 auto 8px'}}/>
                  <span style={{color:C.light,fontSize:13}}>No production entries. Click "+ Add Production" to start.</span>
                </td></tr>
              ):list.map((item,i)=>{
                const dmg=parseFloat(item.damagePercentage||0), eff=parseFloat(item.efficiencyPercentage||0);
                const pl=Number(item.netProfit||0), id=item._id||item.id;
                return(
                  <tr key={id} onMouseEnter={e=>e.currentTarget.style.background='#fafbfc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:'9px 10px',color:C.light,fontWeight:700}}>{(page-1)*PS+i+1}</td>
                    <td style={{padding:'9px 10px',color:C.dark,fontWeight:600,whiteSpace:'nowrap'}}>{item.productName||'—'}</td>
                    <td style={{padding:'9px 10px',color:C.mid,fontFamily:'monospace',fontSize:11}}>{item.productCode||'—'}</td>
                    <td style={{padding:'9px 10px',color:C.dark,whiteSpace:'nowrap'}}>{item.companyName||'—'}</td>
                    <td style={{padding:'9px 10px',color:C.dark,whiteSpace:'nowrap'}}>{(item.productionDate||'').split('T')[0]||'—'}</td>
                    <td style={{padding:'9px 10px',color:C.mid}}>{item.machineName||'—'}</td>
                    <td style={{padding:'9px 10px',color:C.mid}}>{item.operatorName||'—'}</td>
                    <td style={{padding:'9px 10px',color:C.blue,  fontWeight:700,textAlign:'right'}}>{fmtQ(item.plannedQty)}</td>
                    <td style={{padding:'9px 10px',color:C.dark,  fontWeight:700,textAlign:'right'}}>{fmtQ(item.producedQty)}</td>
                    <td style={{padding:'9px 10px',color:C.green, fontWeight:700,textAlign:'right'}}>{fmtQ(item.goodQty)}</td>
                    <td style={{padding:'9px 10px',color:C.amber, fontWeight:700,textAlign:'right'}}>{fmtQ(item.damagedQty)}</td>
                    <td style={{padding:'9px 10px',color:C.red2,  fontWeight:700,textAlign:'right'}}>{fmtQ(item.rejectedQty)}</td>
                    <td style={{padding:'9px 10px',color:C.indigo,fontWeight:700,textAlign:'right'}}>{fmtQ(item.reworkQty)}</td>
                    <td style={{padding:'9px 10px'}}><span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:dmg>10?C.redBg:C.amberBg,color:dmg>10?C.red:C.amber}}>{dmg.toFixed(2)}%</span></td>
                    <td style={{padding:'9px 10px'}}><span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:eff>=80?C.greenBg:C.amberBg,color:eff>=80?C.green:C.amber}}>{eff.toFixed(2)}%</span></td>
                    <td style={{padding:'9px 10px',color:C.green, fontWeight:700,whiteSpace:'nowrap',textAlign:'right'}}>₹{fmt(item.totalGoodValue)}</td>
                    <td style={{padding:'9px 10px',color:C.red,   fontWeight:700,whiteSpace:'nowrap',textAlign:'right'}}>₹{fmt(item.totalLoss)}</td>
                    <td style={{padding:'9px 10px',whiteSpace:'nowrap',textAlign:'right'}}><span style={{fontWeight:800,color:pl>=0?C.green:C.red}}>₹{fmt(pl)}</span></td>
                    <td style={{padding:'9px 10px'}}>{item.shift?<span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:C.blueBg,color:C.blue}}>{item.shift}</span>:'—'}</td>
                    <td style={{padding:'9px 10px'}}><SBadge s={item.status}/></td>
                    <td style={{padding:'9px 10px'}}>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>setViewItem(item)} title="View"   style={{width:27,height:27,display:'flex',alignItems:'center',justifyContent:'center',background:C.blueBg, color:C.blue, border:`1px solid ${C.blueBorder}`, borderRadius:6,cursor:'pointer'}}><MdVisibility size={13}/></button>
                        <button onClick={()=>openEdit$(item)}  title="Edit"   style={{width:27,height:27,display:'flex',alignItems:'center',justifyContent:'center',background:C.amberBg,color:C.amber,border:`1px solid ${C.amberBorder}`,borderRadius:6,cursor:'pointer'}}><MdEdit size={13}/></button>
                        <button onClick={()=>delItem(id)}      title="Delete" style={{width:27,height:27,display:'flex',alignItems:'center',justifyContent:'center',background:C.redBg,  color:C.red,  border:`1px solid ${C.redBorder}`,  borderRadius:6,cursor:'pointer'}}><MdDeleteOutline size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {list.length>0&&(
              <tfoot>
                <tr style={{background:'#fafbfc',borderTop:'2px solid #e2e8f0'}}>
                  <td colSpan={7} style={{padding:'9px 10px',fontSize:11,fontWeight:800,color:C.dark}}>TOTALS ({list.length})</td>
                  <td style={{padding:'9px 10px',color:C.blue, fontWeight:800,textAlign:'right'}}>{fmtQ(list.reduce((s,r)=>s+Number(r.plannedQty||0),0))}</td>
                  <td style={{padding:'9px 10px',color:C.dark, fontWeight:800,textAlign:'right'}}>{fmtQ(list.reduce((s,r)=>s+Number(r.producedQty||0),0))}</td>
                  <td style={{padding:'9px 10px',color:C.green,fontWeight:800,textAlign:'right'}}>{fmtQ(list.reduce((s,r)=>s+Number(r.goodQty||0),0))}</td>
                  <td style={{padding:'9px 10px',color:C.amber,fontWeight:800,textAlign:'right'}}>{fmtQ(list.reduce((s,r)=>s+Number(r.damagedQty||0),0))}</td>
                  <td style={{padding:'9px 10px',color:C.red2, fontWeight:800,textAlign:'right'}}>{fmtQ(list.reduce((s,r)=>s+Number(r.rejectedQty||0),0))}</td>
                  <td style={{padding:'9px 10px',color:C.indigo,fontWeight:800,textAlign:'right'}}>{fmtQ(list.reduce((s,r)=>s+Number(r.reworkQty||0),0))}</td>
                  <td colSpan={2}/>
                  <td style={{padding:'9px 10px',color:C.green,fontWeight:800,whiteSpace:'nowrap',textAlign:'right'}}>₹{fmt(list.reduce((s,r)=>s+Number(r.totalGoodValue||0),0))}</td>
                  <td style={{padding:'9px 10px',color:C.red,  fontWeight:800,whiteSpace:'nowrap',textAlign:'right'}}>₹{fmt(list.reduce((s,r)=>s+Number(r.totalLoss||0),0))}</td>
                  <td style={{padding:'9px 10px',fontWeight:800,whiteSpace:'nowrap',textAlign:'right'}}>{(()=>{const t=list.reduce((s,r)=>s+Number(r.netProfit||0),0);return<span style={{color:t>=0?C.green:C.red}}>₹{fmt(t)}</span>;})()}</td>
                  <td colSpan={3}/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        )}
        {totPages>1&&(
          <div style={{padding:'10px 16px',borderTop:C.border,display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end',fontSize:12,color:C.mid}}>
            <span>Showing {(page-1)*PS+1}–{Math.min(page*PS,total)} of {total}</span>
            <div style={{display:'flex',gap:4,marginLeft:10}}>
              <button onClick={()=>fetchList(page-1)} disabled={page<=1} style={{padding:'4px 11px',borderRadius:6,border:C.border,background:page<=1?C.bg:C.white,cursor:page<=1?'default':'pointer',fontSize:12,color:C.mid}}>‹</button>
              {Array.from({length:Math.min(totPages,5)},(_,i)=>{let p=i+1;if(totPages>5){if(page<=3)p=i+1;else if(page>=totPages-2)p=totPages-4+i;else p=page-2+i;}return<button key={p} onClick={()=>fetchList(p)} style={{padding:'4px 10px',borderRadius:6,border:p===page?`2px solid ${C.red}`:C.border,background:p===page?C.redBg:C.white,cursor:'pointer',fontSize:12,fontWeight:p===page?800:400,color:p===page?C.red:C.mid}}>{p}</button>;})}
              <button onClick={()=>fetchList(page+1)} disabled={page>=totPages} style={{padding:'4px 11px',borderRadius:6,border:C.border,background:page>=totPages?C.bg:C.white,cursor:page>=totPages?'default':'pointer',fontSize:12,color:C.mid}}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD Modal ── */}
      {isAdd&&(
        <div onClick={closeAdd} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.55)',zIndex:9999,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:16,width:'100%',maxWidth:860,margin:'auto',marginTop:16,boxShadow:'0 32px 80px rgba(15,23,42,.28)'}}>
            <div style={{padding:'14px 22px',borderBottom:C.border,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:C.white,zIndex:2}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#3b82f6,#1e40af)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(185,28,28,.3)'}}><MdPrecisionManufacturing size={18} color="#fff"/></div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:C.dark}}>Add Production</div>
                  <div style={{fontSize:10.5,color:C.light}}>Fill in production details</div>
                </div>
              </div>
              <button onClick={closeAdd} style={{width:30,height:30,borderRadius:7,border:'1px solid #e2e8f0',background:C.white,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:C.mid}}><MdClose size={15}/></button>
            </div>
            <FormBody isEdit={false}/>
          </div>
        </div>
      )}

      {/* ── EDIT Modal ── */}
      {openEdit&&(
        <div onClick={closeEdit} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.55)',zIndex:9999,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:16,width:'100%',maxWidth:860,margin:'auto',marginTop:16,boxShadow:'0 32px 80px rgba(15,23,42,.28)'}}>
            <div style={{padding:'14px 22px',borderBottom:C.border,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:C.white,zIndex:2}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center'}}><MdEdit size={18} color="#fff"/></div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:C.dark}}>Edit Production</div>
                  <div style={{fontSize:10.5,color:C.light}}>Update production details</div>
                </div>
              </div>
              <button onClick={closeEdit} style={{width:30,height:30,borderRadius:7,border:'1px solid #e2e8f0',background:C.white,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:C.mid}}><MdClose size={15}/></button>
            </div>
            <FormBody isEdit={true}/>
          </div>
        </div>
      )}

      {/* ── VIEW Modal ── */}
      {viewItem&&(
        <div onClick={()=>setViewItem(null)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.55)',zIndex:9999,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:16,width:'100%',maxWidth:680,margin:'auto',marginTop:16,boxShadow:'0 24px 60px rgba(15,23,42,.28)'}}>
            <div style={{padding:'14px 20px',borderBottom:C.border,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:C.white,zIndex:2}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#2563eb,#1d4ed8)',display:'flex',alignItems:'center',justifyContent:'center'}}><MdVisibility size={16} color="#fff"/></div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:C.dark}}>View Production</div>
                  <div style={{fontSize:10.5,color:C.light}}>{viewItem.productionNo}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <SBadge s={viewItem.status}/>
                <button onClick={()=>openEdit$(viewItem)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 12px',borderRadius:7,border:`1px solid ${C.amberBorder}`,background:C.amberBg,color:C.amber,fontSize:11.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><MdEdit size={12}/>Edit</button>
                <button onClick={()=>setViewItem(null)} style={{width:30,height:30,borderRadius:7,border:'1px solid #e2e8f0',background:C.white,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:C.mid}}><MdClose size={15}/></button>
              </div>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={secTtl}>Basic Information</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,marginBottom:14,border:C.border,borderRadius:9,overflow:'hidden'}}>
                {[['Production Date',(viewItem.productionDate||'').split('T')[0]],['Shift',viewItem.shift],['Company',viewItem.companyName],['Product',`${viewItem.productName}${viewItem.productCode?` (${viewItem.productCode})`:''}` ],['Category',viewItem.category],['Unit',viewItem.unit],['Machine',viewItem.machineName],['Operator',viewItem.operatorName]].map(([k,v],idx)=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:idx%2===0?C.bg:C.white,borderBottom:C.border}}>
                    <span style={{fontSize:12,color:C.mid,fontWeight:600}}>{k}</span>
                    <span style={{fontSize:12,color:C.dark,fontWeight:700}}>{v||'—'}</span>
                  </div>
                ))}
              </div>
              <div style={secTtl}>Production Details</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,marginBottom:14}}>
                {[['Planned',viewItem.plannedQty,C.blue],['Produced',viewItem.producedQty,C.dark],['Good',viewItem.goodQty,C.green],['Damaged',viewItem.damagedQty,C.amber],['Rejected',viewItem.rejectedQty,C.red2],['Rework',viewItem.reworkQty,C.indigo]].map(([k,v,col])=>(
                  <div key={k} style={{background:C.bg,border:C.border,borderRadius:8,padding:'8px',textAlign:'center'}}>
                    <div style={{fontSize:9.5,fontWeight:700,color:C.light,textTransform:'uppercase',marginBottom:2}}>{k}</div>
                    <div style={{fontSize:16,fontWeight:900,color:col}}>{fmtQ(v)}</div>
                  </div>
                ))}
              </div>
              {(viewItem.sellingPrice||viewItem.damageReason||viewItem.remarks)&&(
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                  {viewItem.sellingPrice&&(
                    <div style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:C.bg,border:C.border,borderRadius:9}}>
                      <span style={{fontSize:12,color:C.mid,fontWeight:600}}>Selling Price</span>
                      <span style={{fontSize:12,color:C.dark,fontWeight:700}}>₹{fmt(viewItem.sellingPrice)}</span>
                    </div>
                  )}
                  {viewItem.damageReason&&(
                    <div style={{padding:'10px 12px',background:C.bg,border:C.border,borderRadius:9}}>
                      <div style={{fontSize:12,color:C.mid,fontWeight:600,marginBottom:4}}>Damage Reason</div>
                      <div style={{fontSize:12,color:C.dark,whiteSpace:'pre-wrap'}}>{viewItem.damageReason}</div>
                    </div>
                  )}
                  {viewItem.remarks&&(
                    <div style={{padding:'10px 12px',background:C.bg,border:C.border,borderRadius:9}}>
                      <div style={{fontSize:12,color:C.mid,fontWeight:600,marginBottom:4}}>Remarks</div>
                      <div style={{fontSize:12,color:C.dark,whiteSpace:'pre-wrap'}}>{viewItem.remarks}</div>
                    </div>
                  )}
                </div>
              )}
              <div style={secTtl}>Auto Calculations</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
                {[['Damage %',`${(viewItem.damagePercentage||0).toFixed(2)}%`,parseFloat(viewItem.damagePercentage||0)>10?C.red:C.amber],['Efficiency %',`${(viewItem.efficiencyPercentage||0).toFixed(2)}%`,parseFloat(viewItem.efficiencyPercentage||0)>=80?C.green:C.amber],['Good Value',`₹${fmt(viewItem.totalGoodValue)}`,C.green],['Loss',`₹${fmt(viewItem.totalLoss)}`,C.red]].map(([k,v,col])=>(
                  <div key={k} style={{background:C.bg,border:C.border,borderRadius:8,padding:'9px',textAlign:'center'}}>
                    <div style={{fontSize:9.5,fontWeight:700,color:C.light,textTransform:'uppercase',marginBottom:2}}>{k}</div>
                    <div style={{fontSize:14,fontWeight:900,color:col}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:Number(viewItem.netProfit||0)>=0?C.greenBg:C.redBg,border:`1px solid ${Number(viewItem.netProfit||0)>=0?C.greenBorder:C.redBorder}`,borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <span style={{fontSize:12,fontWeight:700,color:C.mid}}>Net Profit / Loss</span>
                <span style={{fontSize:18,fontWeight:900,color:Number(viewItem.netProfit||0)>=0?C.green:C.red}}>₹{fmt(viewItem.netProfit)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <button onClick={()=>setViewItem(null)} style={{padding:'8px 22px',borderRadius:8,border:'1px solid #e2e8f0',background:C.white,color:C.mid,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
