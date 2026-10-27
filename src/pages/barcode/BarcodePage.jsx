import { useState, useEffect, useRef, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import StatusBadge from '../../components/common/StatusBadge';
import { toast } from '../../components/common/Toast';
import { inventoryApi } from '../../api/inventoryApi';
import { itemMasterApi } from '../../api/itemMasterApi';
import { pickingApi } from '../../api/pickingApi';
import { logisticsApi } from '../../api/logisticsApi';
import { useAuth } from '../../auth/AuthContext';

const thCls = 'bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap';
const tdCls = 'px-4 py-3 text-gray-800 align-middle text-sm';
const trCls = 'border-b border-gray-50 last:border-0 hover:bg-red-50/40 transition-colors';

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
      <div style={{ width:28, height:28, border:'3px solid #f1f5f9', borderTop:'3px solid #1e40af', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Barcode Generator ─────────────────────────────────────────────────────────
function BarcodeGenerator({ inventoryItems, userRole }) {
  const svgRef   = useRef(null);
  const [sku,    setSku]    = useState('');
  const [format, setFormat] = useState('CODE128');

  // State for the product's barcode fetched from item master
  const [itemData,    setItemData]    = useState(null);   // full item master record
  const [loadingItem, setLoadingItem] = useState(false);
  const [rendered,    setRendered]    = useState(false);  // barcode SVG drawn?
  const [regenerating, setRegenerating] = useState(false);

  // Map any inventory unit value to the enum accepted by ItemMaster backend
  const toValidUnit = (u = '') => {
    const map = { nos: 'units', pcs: 'piece', pieces: 'piece', pc: 'piece', ltr: 'liter', ltrs: 'liter', litre: 'liter', litres: 'liter', mtr: 'meter', mtrs: 'meter', mtrs: 'meter', bx: 'box', boxes: 'box', packs: 'pack', dz: 'dozen', dozens: 'dozen', kgs: 'kg' };
    const lower = u.toLowerCase().trim();
    return map[lower] || (['units','kg','liter','meter','box','pack','piece','dozen'].includes(lower) ? lower : 'units');
  };

  // When SKU changes, fetch the item master record to get its stored barcode.
  // If no ItemMaster record exists yet, auto-create one so a barcode gets assigned.
  useEffect(() => {
    if (!sku) { setItemData(null); setRendered(false); return; }

    let cancelled = false;
    setLoadingItem(true);
    setRendered(false);

    (async () => {
      try {
        // 1. Try to find existing ItemMaster record
        const res = await itemMasterApi.getBySku(sku);
        if (!cancelled) setItemData(res.data || null);
      } catch (_notFound) {
        // 2. No ItemMaster for this SKU — auto-create one (backend will generate barcode)
        const inv = inventoryItems.find(i => i.sku === sku);
        if (!inv) { if (!cancelled) setItemData(null); return; }
        try {
          const created = await itemMasterApi.create({
            sku: inv.sku,
            name: inv.name || inv.sku,
            unit: toValidUnit(inv.unit),
          });
          if (!cancelled) {
            setItemData(created.data || null);
            toast(`Barcode generated for ${inv.sku}`);
          }
        } catch (createErr) {
          // Could be a race condition — try fetching again in case another request just created it
          try {
            const retry = await itemMasterApi.getBySku(sku);
            if (!cancelled) setItemData(retry.data || null);
          } catch (_) {
            if (!cancelled) setItemData({ sku: inv.sku, name: inv.name, barcode: '' });
            console.error('Barcode auto-create failed:', createErr.message);
          }
        }
      } finally {
        if (!cancelled) setLoadingItem(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sku, inventoryItems]);

  // Draw the barcode SVG whenever itemData or format changes
  useEffect(() => {
    if (!itemData?.barcode || !svgRef.current) { setRendered(false); return; }
    try {
      JsBarcode(svgRef.current, itemData.barcode, {
        format, lineColor: '#1e293b', width: 1.5, height: 60,
        displayValue: true, fontSize: 11, margin: 8, background: '#ffffff',
      });
      svgRef.current.setAttribute('width', '100%');
      svgRef.current.style.maxWidth = '100%';
      svgRef.current.style.height = 'auto';
      svgRef.current.style.display = 'block';
      setRendered(true);
    } catch (_) { setRendered(false); }
  }, [itemData, format]);

  const downloadBarcode = () => {
    if (!rendered || !svgRef.current) { toast('No barcode to download', 'error'); return; }
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      canvas.width = img.width || 300; canvas.height = img.height || 150;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `barcode-${sku}.png`;
      a.href = canvas.toDataURL('image/png'); a.click();
      toast('Barcode downloaded');
    };
    img.src = url;
  };

  const printBarcode = () => {
    if (!rendered || !svgRef.current) { toast('No barcode to print', 'error'); return; }
    const svg = svgRef.current.outerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Print Barcode — ${sku}</title><style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fff;}</style></head><body>${svg}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
  };

  const handleRegenerate = async () => {
    if (!itemData?._id) { toast('Item not found in master', 'error'); return; }
    if (!window.confirm(`Regenerate barcode for ${sku}?\n\nThis will replace the existing barcode (${itemData.barcode}) with a new one. All future transactions will use the new barcode.`)) return;
    setRegenerating(true);
    try {
      const res = await itemMasterApi.regenerateBarcode(itemData._id);
      toast(`New barcode assigned: ${res.data.newBarcode}`);
      // Refresh item data
      const updated = await itemMasterApi.getBySku(sku);
      setItemData(updated.data);
    } catch (e) { toast(e.message || 'Regeneration failed', 'error'); }
    finally { setRegenerating(false); }
  };

  const selectedInv = inventoryItems.find(i => i.sku === sku);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Left — controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
        <div className="text-sm font-bold text-gray-800">Product Barcode</div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Select SKU *</label>
          <select
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]"
            value={sku}
            onChange={e => setSku(e.target.value)}
          >
            <option value="">— Select a product SKU —</option>
            {inventoryItems.map(item => (
              <option key={item._id} value={item.sku}>{item.sku} — {item.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Barcode Format</label>
          <select
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]"
            value={format}
            onChange={e => setFormat(e.target.value)}
          >
            <option value="CODE128">CODE128 (recommended)</option>
            <option value="CODE39">CODE39</option>
            <option value="EAN13">EAN-13</option>
            <option value="UPC">UPC</option>
          </select>
        </div>

        {/* Barcode value display */}
        {loadingItem && (
          <div className="text-xs text-gray-400 text-center py-2">Loading barcode… (auto-creating if missing)</div>
        )}
        {!loadingItem && itemData && (
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${itemData.barcode ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <span>{itemData.barcode ? `Barcode: ${itemData.barcode}` : 'No barcode assigned yet'}</span>
            {itemData.barcode && <span className="text-green-600 font-bold text-base">✓</span>}
          </div>
        )}

        {/* Action buttons */}
        {rendered && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={downloadBarcode}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 bg-white rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all cursor-pointer font-[inherit]">
              ⬇ Download PNG
            </button>
            <button onClick={printBarcode}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-xs font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]">
              🖨 Print Label
            </button>
          </div>
        )}

        {/* Admin-only regenerate */}
        {userRole === 'super_admin' && itemData?.barcode && itemData?._id && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-[10px] text-gray-400 mb-2 font-semibold uppercase tracking-wide">Admin Action</div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-all cursor-pointer font-[inherit] disabled:opacity-60"
            >
              {regenerating ? '⏳ Regenerating…' : '🔄 Regenerate Barcode (Admin Only)'}
            </button>
            <div className="text-[10px] text-amber-600 mt-1.5 text-center">
              Only use this if the barcode is damaged or lost. All future transactions will use the new barcode.
            </div>
          </div>
        )}
      </div>

      {/* Right — barcode preview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[280px]">
        {!sku && (
          <div className="text-center">
            <div className="text-5xl mb-3">🏷️</div>
            <div className="text-sm text-gray-400 font-medium">Select a SKU to view<br />its product barcode</div>
          </div>
        )}
        {sku && loadingItem && (
          <div className="text-sm text-gray-400">Loading…</div>
        )}
        {sku && !loadingItem && itemData && !itemData.barcode && (
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-sm text-amber-600 font-semibold">No barcode assigned</div>
            <div className="text-xs text-gray-400 mt-1">This product was created before barcode auto-generation.<br />Ask an admin to regenerate.</div>
          </div>
        )}
        <div className={`w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${!rendered ? 'hidden' : ''}`}>
          <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }} />
        </div>
        {rendered && itemData && (
          <div className="text-center">
            <div className="text-xs font-bold text-gray-700">{itemData.sku} — {itemData.name}</div>
            <div className="font-mono text-[11px] text-gray-500 mt-1 bg-gray-50 px-3 py-1 rounded-lg">{itemData.barcode}</div>
            {selectedInv && (
              <div className="text-xs text-gray-400 mt-1">
                Stock: {selectedInv.availableQuantity ?? selectedInv.totalQuantity ?? 0} {selectedInv.unit}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Barcode Scanner ───────────────────────────────────────────────────────────
function BarcodeScanner({ inventoryItems }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const detectorRef = useRef(null);

  const [cameraOn,    setCameraOn]    = useState(false);
  const [cameraErr,   setCameraErr]   = useState('');
  const [scanInput,   setScanInput]   = useState('');
  const [scanned,     setScanned]     = useState(null);
  const [scanning,    setScanning]    = useState(false);
  const [hasDetector, setHasDetector] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    setHasDetector('BarcodeDetector' in window);
    return () => stopCamera();
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false); setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment', width:{ ideal:1280 }, height:{ ideal:720 } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
      if ('BarcodeDetector' in window) {
        if (!detectorRef.current) detectorRef.current = new window.BarcodeDetector({ formats:['code_128','code_39','ean_13','ean_8','upc_a','upc_e','qr_code'] });
        setScanning(true);
        const detect = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) { rafRef.current = requestAnimationFrame(detect); return; }
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0) { handleScannedCode(barcodes[0].rawValue); stopCamera(); return; }
          } catch (_) {}          rafRef.current = requestAnimationFrame(detect);
        };
        rafRef.current = requestAnimationFrame(detect);
      }
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? 'Camera permission denied.' : err.name === 'NotFoundError' ? 'No camera found.' : `Camera error: ${err.message}`;
      setCameraErr(msg); toast(msg, 'error');
    }
  }, [stopCamera]);

  const handleScannedCode = useCallback(async (code) => {
    const trimmed = code.trim().toUpperCase();

    // 1. Try to match by barcode value in item master (primary lookup)
    let masterItem = null;
    try {
      const res = await itemMasterApi.getByBarcode(trimmed);
      masterItem = res.data;
    } catch (_) { /* not found by barcode — try SKU fallback */ }

    // 2. Fall back to matching by SKU in inventory
    const invItem = inventoryItems.find(i =>
      i.sku === trimmed ||
      trimmed.includes(i.sku) ||
      (masterItem && i.sku === masterItem.sku)
    );

    const name     = masterItem?.name     || invItem?.name     || 'Unknown Item';
    const sku      = masterItem?.sku      || invItem?.sku      || trimmed;
    const location = invItem?.location
      ? `${invItem.location.zone || ''} ${invItem.location.rack || ''}`.trim() || '—'
      : '—';

    setScanned({
      barcode: trimmed,
      sku,
      name,
      location,
      qty:    invItem?.availableQuantity ?? invItem?.totalQuantity ?? '—',
      unit:   invItem?.unit || masterItem?.unit || '',
      status: invItem?.status || 'Unknown',
      found:  !!(masterItem || invItem),
      _id:    invItem?._id,
    });
    setScanInput(trimmed);
    toast(masterItem || invItem ? `✓ Found: ${name}` : `Barcode scanned: ${trimmed}`);
  }, [inventoryItems]);

  const handleManualLookup = () => {
    if (!scanInput.trim()) { toast('Enter a barcode or SKU', 'error'); return; }
    handleScannedCode(scanInput.trim());
  };

  const handleStockAction = async (action) => {
    if (!scanned?._id) { toast('Item not found in inventory', 'error'); return; }
    setActionLoading(action);
    try {
      if (action === 'Inward') {
        await inventoryApi.createMovement({ type:'Inward', inventoryId: scanned._id, quantity:1, from:'Receiving Dock', to:'Warehouse', reference:`SCAN-${Date.now()}` });
        toast(`Inward movement recorded for ${scanned.sku}`);
      } else if (action === 'Outward') {
        await inventoryApi.createMovement({ type:'Outward', inventoryId: scanned._id, quantity:1, from:'Warehouse', to:'Production/Dispatch', reference:`SCAN-${Date.now()}` });
        toast(`Outward movement recorded for ${scanned.sku}`);
      } else if (action === 'Transfer') {
        await inventoryApi.createMovement({ type:'Transfer', inventoryId: scanned._id, quantity:1, from:'Warehouse', to:'Transfer Zone', reference:`SCAN-${Date.now()}` });
        toast(`Transfer movement recorded for ${scanned.sku}`);
      } else if (action === 'grn') {
        // Log inward movement tagged as GRN receipt
        await inventoryApi.createMovement({ type:'Inward', sku: scanned.sku, qty:1, from:'GRN Dock', to:'Warehouse', ref:`GRN-SCAN-${Date.now()}` });
        toast(`GRN receipt recorded for ${scanned.sku}`, 'success');
      } else if (action === 'picking') {
        // Create a picking list entry for this SKU
        await pickingApi.create({ items:[{ sku: scanned.sku, name: scanned.name, qty:1 }], status:'Pending', source:'Barcode Scan', ref:`PICK-SCAN-${Date.now()}` });
        toast(`Picking list created for ${scanned.sku}`, 'success');
      } else if (action === 'dispatch') {
        // Log outward movement tagged as dispatch
        await inventoryApi.createMovement({ type:'Outward', sku: scanned.sku, qty:1, from:'Warehouse', to:'Dispatch Bay', ref:`DSP-SCAN-${Date.now()}` });
        toast(`Dispatch movement recorded for ${scanned.sku}`, 'success');
      } else if (action === 'transfer') {
        await inventoryApi.createMovement({ type:'Transfer', sku: scanned.sku, qty:1, from:'Warehouse', to:'Transfer Zone', ref:`TRF-SCAN-${Date.now()}` });
        toast(`Stock transfer recorded for ${scanned.sku}`, 'success');
      }
    } catch (e) { toast(e.message || 'Action failed', 'error'); }
    finally { setActionLoading(''); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
        <div className="text-sm font-bold text-gray-800">Barcode Scanner</div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Select SKU</label>
          <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]"
            onChange={e => { if (e.target.value) handleScannedCode(e.target.value); }}>
            <option value="">— Select a SKU to lookup —</option>
            {inventoryItems.map(item => <option key={item._id} value={item.sku}>{item.sku} — {item.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Manual Entry / USB Scanner</label>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]"
              placeholder="Type barcode or SKU, press Enter…"
              value={scanInput} onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualLookup()} />
            <button onClick={handleManualLookup}
              className="px-4 py-2 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-lg text-sm font-semibold border-0 cursor-pointer font-[inherit] whitespace-nowrap">
              Lookup
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">
            Camera Scanner
            {!hasDetector && <span className="ml-2 text-amber-600 font-normal">(auto-detect not supported)</span>}
          </label>
          <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ aspectRatio:'16/9' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted style={{ display:cameraOn?'block':'none' }} />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                <div className="text-4xl">📷</div>
                <div className="text-sm font-medium text-gray-300">Camera is off</div>
                {cameraErr && <div className="text-xs text-red-400 text-center px-4">{cameraErr}</div>}
              </div>
            )}
            {cameraOn && scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-red-400 rounded-lg" style={{ width:'60%', height:'40%', boxShadow:'0 0 0 9999px rgba(0,0,0,0.45)' }} />
                <div className="absolute bottom-3 text-xs text-white bg-black/50 px-3 py-1 rounded-full">Scanning…</div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {!cameraOn ? (
              <button onClick={startCamera} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl text-sm font-semibold border-0 cursor-pointer font-[inherit]">
                📷 Start Camera
              </button>
            ) : (
              <button onClick={stopCamera} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-xl text-sm font-semibold border-0 cursor-pointer font-[inherit]">
                ⏹ Stop Camera
              </button>
            )}
            {scanned && <button onClick={() => { setScanned(null); setScanInput(''); }} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold border-0 cursor-pointer font-[inherit]">Clear</button>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {!scanned ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
            <div className="text-5xl">🔍</div>
            <div className="text-sm font-semibold text-gray-400">No barcode scanned yet</div>
            <div className="text-xs text-gray-400 text-center">Start the camera or type a barcode<br />in the manual entry field</div>
          </div>
        ) : (
          <>
            <div className={`flex items-center gap-2 mb-4 text-sm font-bold ${scanned.found ? 'text-green-600' : 'text-amber-600'}`}>
              {scanned.found ? '✓ Item Found in Inventory' : '⚠ Unknown Barcode'}
            </div>
            <div className="space-y-0 mb-4">
              {[
                ['Barcode',  <span className="font-mono text-xs">{scanned.barcode}</span>],
                ['SKU',      scanned.sku],
                ['Item Name',scanned.name],
                ['Location', scanned.location],
                ['Available Qty', `${scanned.qty} ${scanned.unit}`],
                ['Status',   <StatusBadge status={scanned.status} />],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-2.5 border-b border-gray-100 text-[13px]">
                  <span className="text-gray-400 font-medium">{k}</span>
                  <span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
            {scanned.found && (
              <>
                <div className="flex gap-2 mb-3">
                  {[
                    { label:'Inward',   cls:'bg-gradient-to-br from-green-500 to-green-700 text-white' },
                    { label:'Outward',  cls:'border border-red-600 text-red-700 bg-transparent' },
                    { label:'Transfer', cls:'bg-gray-100 text-gray-700' },
                  ].map(b => (
                    <button key={b.label} onClick={() => handleStockAction(b.label)} disabled={!!actionLoading}
                      className={`flex-1 py-2 text-xs rounded-lg font-semibold border-0 cursor-pointer font-[inherit] disabled:opacity-60 ${b.cls}`}>
                      {actionLoading === b.label ? '...' : b.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label:'📦 GRN Receipt',   cls:'bg-green-50 text-green-800',   action: 'grn'      },
                    { label:'🔍 Picking',        cls:'bg-blue-50 text-blue-800',     action: 'picking'  },
                    { label:'🚚 Dispatch',       cls:'bg-amber-50 text-amber-800',   action: 'dispatch' },
                    { label:'↔ Stock Transfer', cls:'bg-purple-50 text-purple-800', action: 'transfer' },
                  ].map((a, i) => (
                    <button key={i} onClick={() => handleStockAction(a.action)} disabled={!!actionLoading}
                      className={`px-3 py-2 text-xs rounded-lg font-semibold border-0 cursor-pointer font-[inherit] disabled:opacity-60 ${a.cls}`}>
                      {actionLoading === a.action ? '...' : a.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BarcodePage({ initialTab = 0 }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab]           = useState(initialTab);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [movements, setMovements]           = useState([]);
  const [loading, setLoading]               = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      const r = await inventoryApi.getAll();
      setInventoryItems(r.data || []);
    } catch (_) {}
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const r = await inventoryApi.getMovements({ limit: 50 });
      setMovements(r.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);
  useEffect(() => { if (activeTab === 2) loadMovements(); }, [activeTab, loadMovements]);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, marginBottom:20 }}>
        {activeTab === 2 && (
          <button onClick={loadMovements} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'transparent', color:'#1e40af', border:'1.5px solid #1e40af', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>
            ↻ Refresh Logs
          </button>
        )}
      </div>

      {activeTab === 0 && <BarcodeGenerator inventoryItems={inventoryItems} userRole={user?.role} />}
      {activeTab === 1 && <BarcodeScanner inventoryItems={inventoryItems} />}

      {activeTab === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-sm font-bold text-gray-800">Movement Logs</div>
            <div className="text-xs text-gray-400 mt-0.5">{movements.length} recent scan events</div>
          </div>
          {loading ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>{['Movement ID','SKU','Item','Type','From','To','Qty','Operator','Time'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">No movement logs yet. Use the scanner to record stock movements.</td></tr>
                  ) : movements.map((m, i) => (
                    <tr key={i} className={trCls}>
                      <td className={`${tdCls} font-semibold text-red-700 font-mono text-xs`}>{m.movementId}</td>
                      <td className={`${tdCls} font-mono text-xs`}>{m.sku}</td>
                      <td className={`${tdCls} font-semibold`}>{m.itemName || m.name || '—'}</td>
                      <td className={tdCls}><StatusBadge status={m.type} type={m.type==='Inward'?'success':m.type==='Outward'?'danger':'info'} /></td>
                      <td className={tdCls}>{m.from}</td>
                      <td className={tdCls}>{m.to}</td>
                      <td className={`${tdCls} font-bold`}>{m.quantity || m.qty}</td>
                      <td className={tdCls}>{m.performedBy?.name || '—'}</td>
                      <td className={`${tdCls} text-gray-400 text-xs`}>{new Date(m.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
