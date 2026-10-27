import { useCallback, useEffect, useState, useRef } from 'react';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  MdPictureAsPdf, MdClose, MdTableChart,
  MdRefresh, MdDelete, MdBusiness,
  MdCheckCircle, MdSave, MdUploadFile, MdInfoOutline, MdVisibility,
} from 'react-icons/md';

const money = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateTime = (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
// Absolute URL for a stored PDF path (served under /uploads by the backend)
const API_ORIGIN = (import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : '')).replace(/\/api\/?$/, '');
const fileUrl = (p) => (p ? (p.startsWith('http') ? p : `${API_ORIGIN}${p}`) : '');

// ── PDF text extraction ───────────────────────────────────────────────────────
async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const allItems = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const vp = page.getViewport({ scale: 1 });
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      allItems.push({ str: item.str.trim(), x: Math.round(item.transform[4]), y: Math.round(vp.height - item.transform[5]), page: p });
    }
  }
  const lines = [];
  for (const item of allItems) {
    const ex = lines.find(l => l.page === item.page && Math.abs(l.y - item.y) <= 12);
    if (ex) { ex.tokens.push(item); ex.tokens.sort((a, b) => a.x - b.x); }
    else lines.push({ y: item.y, page: item.page, tokens: [item] });
  }
  lines.sort((a, b) => a.page !== b.page ? a.page - b.page : a.y - b.y);
  const flatText = lines.map(l => l.tokens.map(t => t.str).join(' ')).join('\n');
  return { flatText, lines };
}

function parsePOFromText({ flatText, lines }) {
  const text = flatText;
  const result = { poNumber: '', vendor: '', buyerName: '', buyerAddress: '', buyerGSTIN: '', shipToName: '', shipToAddress: '', items: [], total: '', taxTotal: '', subTotal: '' };

  const toNum = (v) => {
    const cleaned = String(v || '').replace(/[₹]/g, '').replace(/\bRs\.?\s*/gi, '').replace(/\bINR\s*/gi, '').replace(/,/g, '').trim();
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  };

  const GSTIN_RE = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][Z][A-Z0-9])\b/;
  const UOM_RE   = /^(Nos?\.?|Numbers?|Pcs?\.?|Kgs?\.?|Units?|EA|Sets?|Ltrs?\.?|Mtrs?\.?|Boxes?|Rolls?|Pairs?|Bags?|Sheets?|MT|MTs?|Ton|Tons?|Tonne|Tonnes?|Quintal|Quintals?|Sqft|Sqm|RMT|Mtr|Mtrs?|Ltr|Ltrs?|Gms?|Grams?|Dozen|Bale|Bundle|Coil|Drum|Packet|Pkt)$/i;
  const DATE_TOK_RE = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})$/i;

  const poM = text.match(/(?:PO\s+(?:No\.?|Number|#)|Purchase\s+Order\s+(?:No\.?|Number))\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-]{2,29})/i)
    || text.match(/Order\s+(?:No\.?|Number)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-]{2,29})/i);
  if (poM && /\d/.test(poM[1])) result.poNumber = poM[1].trim();

  const vendM = text.match(/Vendor\s+Name\s*[:\-]\s*([^\n]{3,80})/i)
    || text.match(/Supplier\s*[:\-]\s*([^\n]{3,80})/i)
    || text.match(/Vendor\s*[:\-]\s*([^\n,]{3,80})/i);
  if (vendM) {
    let v = vendM[1].trim().replace(/\s*Purchase\s+Order.*$/i, '').replace(/\s*(PO\s*No\.?)\s*[:\-].*$/i, '').trim();
    if (v.length >= 3) result.vendor = v.slice(0, 80);
  }

  const EMDI_RE = /^[\u2013\u2014\-]+$/;
  const extractSection = (labelRe, maxLines = 6) => {
    const idx = text.search(labelRe);
    if (idx === -1) return [];
    const block = text.slice(idx, idx + 500).split('\n').slice(1, maxLines + 1);
    return block.map(l => l.trim()).filter(l => l && !EMDI_RE.test(l));
  };

  const billLines = extractSection(/(?:BILL\s+TO|BILLING\s+ADDRESS|BILLING\s*:)/i);
  if (billLines.length) {
    for (const ln of billLines) {
      if (GSTIN_RE.test(ln)) { result.buyerGSTIN = ln.match(GSTIN_RE)[1]; continue; }
      if (/^(GSTIN|GST\s*No|PAN|CIN|Tel|Mob|Email)/i.test(ln)) {
        const gm = ln.match(/GSTIN\s*[:\-]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][Z][A-Z0-9])/i);
        if (gm) result.buyerGSTIN = gm[1];
        continue;
      }
      if (!result.buyerName && ln.length >= 3) { result.buyerName = ln.slice(0, 120); continue; }
      if (result.buyerName && !result.buyerAddress) { result.buyerAddress = ln.slice(0, 200); }
    }
  }

  const shipLines = extractSection(/(?:SHIP\s+TO|SHIPPING\s+ADDRESS|DELIVER\s+TO)/i);
  if (shipLines.length) {
    for (const ln of shipLines) {
      if (GSTIN_RE.test(ln)) continue;
      if (/^(GSTIN|GST\s*No|PAN|CIN|Tel|Mob|Email)/i.test(ln)) continue;
      if (!result.shipToName && ln.length >= 3) { result.shipToName = ln.slice(0, 120); continue; }
      if (result.shipToName && !result.shipToAddress) { result.shipToAddress = ln.slice(0, 200); }
    }
  }

  if (!result.buyerGSTIN) {
    const allGSTINs = [...text.matchAll(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][Z][A-Z0-9])\b/g)].map(m => m[1]);
    result.buyerGSTIN = allGSTINs.length > 1 ? allGSTINs[1] : (allGSTINs[0] || '');
  }

  const findBestTotal = (re) => {
    const matches = [...text.matchAll(new RegExp(re.source, re.flags + 'g'))];
    if (!matches.length) return '';
    const vals = matches.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(n => isFinite(n) && n > 0);
    return vals.length ? String(Math.max(...vals)) : '';
  };

  result.total = findBestTotal(/Net\s+Amount\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i)
    || findBestTotal(/Amount\s+Payable\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i)
    || findBestTotal(/Grand\s+Total\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i)
    || findBestTotal(/Invoice\s+Total\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i)
    || findBestTotal(/Total\s+Amount\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i);

  result.subTotal = findBestTotal(/Total\s+(?:Base|Taxable)\s+(?:Value|Amount)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i)
    || findBestTotal(/Sub\s*Total\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i);

  const COL_KEYWORDS = {
    sl:      ['sl','sl.','slno','slno.','sno','sno.','srno','srno.','#','no.'],
    desc:    ['description','descriptionhsncode','item','itemdescription','product','material','particulars','goods','namedescription','itemname'],
    hsn:     ['hsn','sac','hsncode','saccode','hsnsac','hsnno'],
    qty:     ['qty','qty.','quantity','nos','nos.','pcs','pcs.'],
    uom:     ['uom','unit','units','uomunit'],
    rate:    ['unitprice','rate','unitrate','basicrate','ratepers','price'],
    mrp:     ['mrp','listprice','maxretailprice'],
    needby:  ['needby','deliverydate','requiredby','expecteddelivery','deliveryon','shipby'],
    disc:    ['disc','disc.','discount','disc%','discount%'],
    cgstPct: ['cgst%','cgst'],
    cgstVal: ['cgstvalue','cgstval','cgstamt','cgstamount','cgstrs'],
    sgstPct: ['sgst%','sgst'],
    sgstVal: ['sgstvalue','sgstval','sgstamt','sgstamount','sgstrs'],
    igstPct: ['igst%','igst'],
    igstVal: ['igstvalue','igstval','igstamt','igstamount','igstrs'],
    taxable: ['taxablevalue','taxableamt','taxableamount','baseamount','assessable','taxable','taxablebvalue','basicvalue','basicamt'],
    taxAmt:  ['taxamount','taxamt','totaltax','totalgst'],
    total:   ['totalamount','linetotal','total','nettotal','netamount','nettaxableamount'],
  };

  const norm = (s) => String(s || '').toLowerCase().replace(/[\s\/\-\.]/g, '');
  let colMap = {};
  let headerLineIdx = -1;

  const tryMatchHeader = (toks) => {
    const found = {};
    for (let ti = 0; ti < toks.length; ti++) {
      for (let len = 1; len <= 3 && ti + len - 1 < toks.length; len++) {
        const combined = norm(toks.slice(ti, ti + len).map(t => t.str).join(''));
        for (const [col, keywords] of Object.entries(COL_KEYWORDS)) {
          if (!found[col] && keywords.includes(combined)) {
            const midTok = toks[ti + Math.floor((len - 1) / 2)];
            found[col] = midTok.x;
          }
        }
      }
    }
    return found;
  };

  for (let i = 0; i < lines.length; i++) {
    let found = tryMatchHeader(lines[i].tokens);
    if (Object.keys(found).length < 3 && i + 1 < lines.length) {
      const merged = [...lines[i].tokens, ...lines[i + 1].tokens].sort((a, b) => a.x - b.x);
      const mergedFound = tryMatchHeader(merged);
      if (Object.keys(mergedFound).length > Object.keys(found).length) found = mergedFound;
    }
    if (Object.keys(found).length >= 3) { colMap = found; headerLineIdx = i; break; }
  }

  if (headerLineIdx >= 0 && Object.keys(colMap).length >= 3) {
    const nearestCol = (x) => {
      let best = null, bestDist = Infinity;
      for (const [col, cx] of Object.entries(colMap)) {
        const d = Math.abs(x - cx);
        if (d < bestDist) { bestDist = d; best = col; }
      }
      return bestDist <= 120 ? best : null;
    };

    const FOOTER_RE = /^(total\s*base|total\s*taxable|sub\s*total|grand\s*total|net\s*amount|amount\s*payable|cgst\s*amount|sgst\s*amount|igst\s*amount|amount\s*in\s*words|terms|dear\s*sir|authorized|page\s*\d)/i;
    const dataLines = [];
    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const ls = lines[i].tokens.map(t => t.str).join(' ').trim();
      if (!ls) continue;
      if (FOOTER_RE.test(ls)) break;
      dataLines.push(lines[i]);
    }

    const slX = colMap.sl ?? colMap.desc ?? -1;
    const itemRows = [];
    let cur = [];
    for (const line of dataLines) {
      const ft = line.tokens[0];
      const isSerial = ft && /^\d{1,3}\.?$/.test(ft.str.trim()) && (slX < 0 ? true : Math.abs(ft.x - slX) < 120);
      if (isSerial && cur.length > 0) { itemRows.push(cur); cur = []; }
      cur.push(line);
    }
    if (cur.length > 0) itemRows.push(cur);

    for (const rowLines of itemRows) {
      const allToks = rowLines.flatMap(l => l.tokens);
      const colVals = {};
      for (const tok of allToks) {
        const col = nearestCol(tok.x);
        if (col === 'mrp' || col === 'needby') continue;
        if (DATE_TOK_RE.test(tok.str.trim())) continue;
        if (col) { if (!colVals[col]) colVals[col] = []; colVals[col].push(tok.str.trim()); }
      }

      const getStr = (col) => (colVals[col] || []).join(' ').trim();
      const getN   = (col) => toNum(getStr(col));

      let name = getStr('desc');
      if (name.length < 2) {
        const qtyX = colMap.qty ?? colMap.uom ?? colMap.rate ?? 999;
        const nameToks = allToks.filter(t => t.x < qtyX - 20 && !/^[\d,]+(\.\d+)?$/.test(t.str.trim()) && !/^\d{1,3}\.?$/.test(t.str.trim())).sort((a, b) => a.x - b.x || a.y - b.y).map(t => t.str.trim());
        name = nameToks.join(' ').trim();
      }

      const hsnM = name.match(/\/\s*(\d{6,10})(?:\s|$)/);
      let hsn = getStr('hsn') || (hsnM ? hsnM[1] : '');
      if (hsnM) name = name.replace(hsnM[0], '').trim();
      name = name.replace(/\s+/g, ' ').replace(/[^\w\s\-\/\.&,()]/g, '').trim();
      if (name.length < 2) continue;

      const uom = getStr('uom') || 'Nos';
      const disc = getN('disc') || 0;
      const cgstPct = getN('cgstPct'), cgstVal = getN('cgstVal');
      const sgstPct = getN('sgstPct'), sgstVal = getN('sgstVal');
      const igstPct = getN('igstPct'), igstVal = getN('igstVal');
      let qty = getN('qty'), rate = getN('rate'), taxable = getN('taxable');
      const lineAmtRaw = getN('total');
      if (!taxable && qty && rate) taxable = +(qty * rate * (1 - disc / 100)).toFixed(2);
      if (qty && !rate && taxable > 0) rate = +(taxable / qty).toFixed(2);
      if (rate && !qty && taxable > 0) qty = Math.round(taxable / rate) || 1;
      if (!rate && !qty && taxable > 0) { qty = 1; rate = taxable; }
      const lineAmt = lineAmtRaw || taxable || (qty && rate ? +(qty * rate).toFixed(2) : 0);
      if (!qty || !rate || !lineAmt) continue;
      if (!taxable) taxable = +(rate * qty * (1 - disc / 100)).toFixed(2);
      const fCgstVal = cgstVal || +(taxable * cgstPct / 100).toFixed(2);
      const fSgstVal = sgstVal || +(taxable * sgstPct / 100).toFixed(2);
      const fIgstVal = igstVal || +(taxable * igstPct / 100).toFixed(2);
      result.items.push({ name, qty, unit: uom, hsn, rate, discount: disc, cgst: cgstPct, cgstVal: fCgstVal, sgst: sgstPct, sgstVal: fSgstVal, igst: igstPct, igstVal: fIgstVal, gst: cgstPct + sgstPct + igstPct, taxableValue: taxable, lineAmount: lineAmt });
    }
  }

  if (result.items.length === 0) {
    const SKIP = /total|subtotal|grand|net\s+amount|amount\s+payable|tax\s+amount|in\s+words|terms|dear\s+sir|authorized|page\s+\d|cgst\s+amount|sgst\s+amount|igst\s+amount/i;
    const isIGST = /\bIGST\b/.test(text);
    for (const line of lines) {
      const toks = line.tokens.map(t => t.str);
      if (SKIP.test(toks.join(' '))) continue;
      if (!/^\d{1,3}\.?$/.test(toks[0])) continue;
      const nums = toks.map(t => toNum(t)).filter(n => n > 0);
      if (nums.length < 3) continue;
      const uomTok = toks.find(t => UOM_RE.test(t)) || 'Nos';
      const firstNumIdx = toks.findIndex((t, i) => i > 0 && toNum(t) > 0);
      let name = toks.slice(1, firstNumIdx > 0 ? firstNumIdx : 5).join(' ').trim().replace(/\/\s*\d{6,10}/, '').replace(UOM_RE, '').trim();
      if (name.length < 2) continue;
      const lineAmt = nums[nums.length - 1];
      let taxable = 0, taxAmt = 0, qty = 0, rate = 0;
      if (nums.length >= 4) {
        taxAmt = nums[nums.length - 2]; taxable = nums[nums.length - 3];
        const candidates = nums.slice(0, nums.length - 3);
        for (let a = 0; a < candidates.length && !qty; a++) {
          for (let b = a + 1; b < candidates.length && !qty; b++) {
            const prod = +(candidates[a] * candidates[b]).toFixed(2);
            if (taxable > 0 && Math.abs(prod - taxable) / taxable < 0.05) { qty = Math.min(candidates[a], candidates[b]); rate = Math.max(candidates[a], candidates[b]); }
          }
        }
        if (!qty && candidates.length >= 2) { qty = candidates[0]; rate = candidates[1]; if (!taxable) taxable = +(qty * rate).toFixed(2); }
        else if (!qty && candidates.length === 1) { qty = 1; rate = candidates[0]; if (!taxable) taxable = rate; }
      } else if (nums.length === 3) { qty = nums[0]; rate = nums[1]; taxable = +(qty * rate).toFixed(2); taxAmt = +(lineAmt - taxable).toFixed(2); }
      else { qty = 1; rate = nums[0]; taxable = rate; taxAmt = +(lineAmt - taxable).toFixed(2); }
      if (!qty || !rate) continue;
      const gstPct = taxable > 0 && taxAmt > 0 ? Math.round(taxAmt / taxable * 100) : 18;
      result.items.push({ name, qty, unit: uomTok, hsn: '', rate, discount: 0, cgst: isIGST ? 0 : gstPct / 2, cgstVal: isIGST ? 0 : +(taxable * gstPct / 200).toFixed(2), sgst: isIGST ? 0 : gstPct / 2, sgstVal: isIGST ? 0 : +(taxable * gstPct / 200).toFixed(2), igst: isIGST ? gstPct : 0, igstVal: isIGST ? taxAmt : 0, gst: gstPct, taxableValue: taxable, lineAmount: lineAmt });
    }
  }

  return result;
}

// ── Excel parsing ─────────────────────────────────────────────────────────────
// Reads the first sheet. Recognises common column headers: item/description,
// hsn, qty/quantity/required, unit/uom, rate/price, sent/sentqty.
async function parseExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const norm = (k) => String(k || '').toLowerCase().replace(/[\s\/\-\._%]/g, '');
  const pick = (row, keys) => {
    for (const k of Object.keys(row)) {
      if (keys.includes(norm(k))) return row[k];
    }
    return '';
  };
  const items = rows.map(row => {
    const name = String(pick(row, ['item', 'itemname', 'description', 'product', 'material', 'particulars', 'name']) || '').trim();
    if (!name) return null;
    const required = Number(String(pick(row, ['qty', 'quantity', 'required', 'requiredqty', 'orderqty', 'orderedqty', 'poqty']) || 0).toString().replace(/,/g, '')) || 0;
    const sent = Number(String(pick(row, ['sent', 'sentqty', 'dispatched', 'dispatchedqty', 'senquantity']) || 0).toString().replace(/,/g, '')) || 0;
    const rate = Number(String(pick(row, ['rate', 'price', 'unitprice', 'unitrate', 'basicrate']) || 0).toString().replace(/,/g, '')) || 0;
    const unit = String(pick(row, ['unit', 'uom', 'units']) || 'Nos').trim() || 'Nos';
    const hsn = String(pick(row, ['hsn', 'sac', 'hsncode', 'hsnsac']) || '').trim();
    return { name, hsn, qty: required, sentQty: sent, unit, rate };
  }).filter(Boolean);
  return {
    poNumber: '', vendor: '', buyerName: '', buyerAddress: '', buyerGSTIN: '',
    items, fileName: file.name,
  };
}

// ── React Component ───────────────────────────────────────────────────────────
export default function POUploadPage() {
  const pdfRef   = useRef(null);
  const excelRef = useRef(null);
  const navigate = useNavigate();

  // Upload / parse state
  const [parsing, setParsing]         = useState(false);
  const [parseError, setParseError]   = useState('');
  const [parsedPO, setParsedPO]       = useState(null);      // { poNumber, vendor, buyerName, ... }
  const [pdfFile, setPdfFile]         = useState(null);      // the raw PDF File (to upload/store)
  const [showPanel, setShowPanel]     = useState(false);
  const [editableItems, setEditableItems] = useState([]);    // [{ name, hsn, qty(required), sentQty, unit, rate }]
  const [assignCompanyId, setAssignCompanyId] = useState('');
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState('');

  // All companies (master list) — used by the "Assign to Company" selector.
  const [companies, setCompanies]     = useState([]);
  // Only companies that actually have uploaded POs — used by "Company Info".
  const [poCompanies, setPoCompanies] = useState([]);

  // Company Info section (opens the existing company filter). Hidden by default.
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyDetail, setCompanyDetail]     = useState(null); // { company, totals, pos }
  const [detailLoading, setDetailLoading]     = useState(false);

  // Recently uploaded POs list
  const [poList, setPoList]           = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const loadCompanies = useCallback(async () => {
    // Full master list for the "Assign to Company" selector
    try { const res = await poGeneratorApi.listCompanies(); setCompanies(res.data || []); }
    catch { /* non-critical */ }
    // Only companies that actually have uploaded POs — for "Company Info"
    try { const res2 = await poGeneratorApi.getPOCompaniesSummary(); setPoCompanies(res2.data || []); }
    catch { /* non-critical */ }
  }, []);

  const loadPOList = useCallback(async () => {
    setListLoading(true);
    try { const res = await poGeneratorApi.listPOUploads(); setPoList(res.data || []); }
    catch { /* non-critical */ }
    finally { setListLoading(false); }
  }, []);

  useEffect(() => { loadCompanies(); loadPOList(); }, [loadCompanies, loadPOList]);

  // ── Company Info section — load detail when a company is chosen ─────────────
  const loadCompanyDetail = useCallback(async (companyId) => {
    if (!companyId) { setCompanyDetail(null); return; }
    setDetailLoading(true);
    try { const res = await poGeneratorApi.getPOCompanyDetail(companyId); setCompanyDetail(res.data || null); }
    catch { setCompanyDetail(null); }
    finally { setDetailLoading(false); }
  }, []);
  useEffect(() => { if (showCompanyInfo) loadCompanyDetail(selectedCompany); }, [showCompanyInfo, selectedCompany, loadCompanyDetail]);

  // ── Map parsed items → editable rows with a Sent column ─────────────────────
  const toEditableRows = (items) => (items.length ? items : [{ name: '', hsn: '', qty: 1, unit: 'Nos', rate: 0 }])
    .map(it => ({
      name: it.name || '',
      hsn:  it.hsn || '',
      qty:  Number(it.qty) || 0,          // required / ordered quantity
      sentQty: Number(it.sentQty) || 0,   // manually entered sent quantity
      unit: it.unit || 'Nos',
      rate: Number(it.rate) || 0,
    }));

  // ── PDF upload handler (kept as-is) ─────────────────────────────────────────
  const handlePDFUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf'))) { setParseError('Please upload a valid PDF file.'); return; }
    setParsing(true); setParseError(''); setParsedPO(null); setSaveMsg('');
    try {
      const extracted = await extractTextFromPDF(file);
      const parsed = parsePOFromText(extracted);
      parsed.fileName = file.name;
      setParsedPO(parsed);
      setPdfFile(file);
      setEditableItems(toEditableRows(parsed.items));
      setAssignCompanyId('');
      setShowPanel(true);
    } catch (err) {
      setParseError(`Failed to read PDF: ${err.message || 'Unknown error'}. Make sure it is a text-based PDF.`);
    } finally { setParsing(false); if (pdfRef.current) pdfRef.current.value = ''; }
  };

  // ── Excel upload handler (new) ──────────────────────────────────────────────
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = /\.(xlsx|xls|csv)$/i.test(file.name || '');
    if (!ok) { setParseError('Please upload a valid Excel file (.xlsx, .xls or .csv).'); return; }
    setParsing(true); setParseError(''); setParsedPO(null); setSaveMsg('');
    try {
      const parsed = await parseExcel(file);
      if (!parsed.items.length) { setParseError('No items found in the Excel. Expected columns: Item, Qty (required), Sent, Unit, Rate, HSN.'); return; }
      setParsedPO(parsed);
      setPdfFile(null);   // Excel upload has no PDF
      setEditableItems(toEditableRows(parsed.items));
      setAssignCompanyId('');
      setShowPanel(true);
    } catch (err) {
      setParseError(`Failed to read Excel: ${err.message || 'Unknown error'}.`);
    } finally { setParsing(false); if (excelRef.current) excelRef.current.value = ''; }
  };

  const updateRow = (idx, field, value) => {
    setEditableItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const addRow = () => setEditableItems(prev => [...prev, { name: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, sentQty: 0 }]);
  const removeRow = (idx) => setEditableItems(prev => prev.filter((_, i) => i !== idx));

  // ── Save PO (records ordered vs sent; stores PDF). No invoice is created. ────
  const handleSavePO = async () => {
    const validItems = editableItems.filter(it => String(it.name).trim() && Number(it.qty) > 0);
    if (!parsedPO || !validItems.length) { setSaveMsg('Add at least one item with a name and required quantity.'); return; }
    setSaving(true); setSaveMsg('');
    try {
      const chosen = assignCompanyId ? companies.find(c => c._id === assignCompanyId) : null;
      const payload = {
        poNumber:    parsedPO.poNumber || '',
        vendorName:  parsedPO.vendor || '',
        buyerName:   chosen ? chosen.companyName : (parsedPO.buyerName || ''),
        buyerAddress: parsedPO.buyerAddress || '',
        buyerGSTIN:  parsedPO.buyerGSTIN || '',
        companyId:   assignCompanyId || undefined,
        source:      pdfFile ? 'pdf' : 'excel',
        notes:       parsedPO.fileName ? `Uploaded: ${parsedPO.fileName}` : '',
        items: validItems.map(it => ({
          name: String(it.name).trim(),
          hsn: String(it.hsn || '').trim(),
          requiredQty: Number(it.qty) || 0,
          sentQty: Math.min(Number(it.sentQty) || 0, Number(it.qty) || 0),
          unit: it.unit || 'Nos',
          rate: Number(it.rate) || 0,
        })),
      };
      const res = await poGeneratorApi.uploadPO(payload, pdfFile);
      setSaveMsg(res.message || 'PO uploaded successfully.');
      await Promise.all([loadCompanies(), loadPOList()]);
    } catch (e) {
      setSaveMsg('Error: ' + (e.message || 'Failed to save PO'));
    } finally { setSaving(false); }
  };

  const resetPanel = () => {
    setShowPanel(false); setParsedPO(null); setPdfFile(null);
    setEditableItems([]); setAssignCompanyId(''); setSaveMsg('');
  };

  const handleDeletePO = async (id) => {
    if (!window.confirm('Remove this PO from the upload list?\n\nIt will still remain in Company Details.')) return;
    try { await poGeneratorApi.deletePOUpload(id); await loadPOList(); }
    catch (e) { alert(e.message || 'Delete failed'); }
  };

  const panelRequired = editableItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const panelSent     = editableItems.reduce((s, i) => s + (Number(i.sentQty) || 0), 0);
  const panelRemaining = Math.max(0, panelRequired - panelSent);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const card = { background: '#fff', borderRadius: 16, border: '1px solid #e8edf2', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' };
  const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  const inputSm = { padding: '7px 9px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '24px 28px', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'inherit' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            <MdUploadFile size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>PO Upload</h1>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Upload a PO (PDF or Excel). Uploading only records what was ordered — enter Sent quantity to track remaining.</p>
          </div>
        </div>
        <button onClick={() => navigate('/po-generator/companies')} style={{ ...btnPrimary, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
          <MdBusiness size={16} /> Company Details
        </button>
      </div>

      {/* Upload options — PDF + Excel side by side (Excel at top as requested) */}
      <div style={{ ...card, padding: '18px 20px', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {/* Excel upload */}
          <label style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', border: '2px dashed #16a34a', borderRadius: 12, background: '#f0fdf4', cursor: 'pointer' }}>
            <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: 'none' }} />
            <MdTableChart size={26} color="#16a34a" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#166534' }}>Upload Excel</div>
              <div style={{ fontSize: 11.5, color: '#15803d' }}>.xlsx / .xls / .csv · columns: Item, Qty, Sent, Unit, Rate, HSN</div>
            </div>
          </label>

          {/* PDF upload (kept as-is) */}
          <label style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', border: '2px dashed #1e40af', borderRadius: 12, background: '#fef2f2', cursor: 'pointer' }}>
            <input ref={pdfRef} type="file" accept="application/pdf" onChange={handlePDFUpload} style={{ display: 'none' }} />
            <MdPictureAsPdf size={26} color="#1e40af" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#991b1b' }}>Upload PO PDF</div>
              <div style={{ fontSize: 11.5, color: '#b91c1c' }}>Text-based PDF — items are auto-detected</div>
            </div>
          </label>
        </div>
        {parsing && <div style={{ marginTop: 12, fontSize: 13, color: '#6366f1', fontWeight: 600 }}>Reading file…</div>}
        {parseError && <div style={{ marginTop: 12, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{parseError}</div>}
      </div>

      {/* Review + Save panel */}
      {showPanel && parsedPO && (
        <div style={{ ...card, padding: '20px 22px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              Review PO {parsedPO.poNumber ? `· ${parsedPO.poNumber}` : ''} {pdfFile ? '(PDF)' : '(Excel)'}
            </div>
            <button onClick={resetPanel} style={{ width: 32, height: 32, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MdClose size={16} /></button>
          </div>

          {/* Header fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            {[['PO Number', parsedPO.poNumber || '—'], ['Vendor', parsedPO.vendor || '—'], ['Buyer', parsedPO.buyerName || '—'], ['GSTIN', parsedPO.buyerGSTIN || '—']].map(([l, v]) => (
              <div key={l} style={{ background: '#f8fafc', border: '1px solid #e8edf2', borderRadius: 10, padding: '9px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Assign to company */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Assign to Company</label>
            <select value={assignCompanyId} onChange={e => setAssignCompanyId(e.target.value)} style={{ ...inputSm, maxWidth: 360, fontWeight: 700 }}>
              <option value="">Auto-detect from Buyer ({parsedPO.buyerName || 'unknown'})</option>
              {companies.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
            </select>
          </div>

          {/* Items table with Sent + Remaining */}
          <div style={{ overflowX: 'auto', border: '1px solid #e8edf2', borderRadius: 12, marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'Item', 'HSN', 'Unit', 'Rate', 'Required', 'Sent', 'Remaining', ''].map(h => (
                    <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editableItems.map((it, i) => {
                  const remaining = Math.max(0, (Number(it.qty) || 0) - (Number(it.sentQty) || 0));
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 10px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '7px 10px', minWidth: 200 }}><input value={it.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="Item name" style={inputSm} /></td>
                      <td style={{ padding: '7px 10px', width: 90 }}><input value={it.hsn} onChange={e => updateRow(i, 'hsn', e.target.value)} style={inputSm} /></td>
                      <td style={{ padding: '7px 10px', width: 70 }}><input value={it.unit} onChange={e => updateRow(i, 'unit', e.target.value)} style={inputSm} /></td>
                      <td style={{ padding: '7px 10px', width: 90 }}><input type="number" value={it.rate} onChange={e => updateRow(i, 'rate', e.target.value)} style={inputSm} /></td>
                      <td style={{ padding: '7px 10px', width: 80 }}><input type="number" value={it.qty} onChange={e => updateRow(i, 'qty', e.target.value)} style={inputSm} /></td>
                      <td style={{ padding: '7px 10px', width: 80 }}><input type="number" min={0} value={it.sentQty} onChange={e => updateRow(i, 'sentQty', e.target.value)} style={{ ...inputSm, borderColor: '#86efac', background: '#f0fdf4' }} /></td>
                      <td style={{ padding: '7px 10px', width: 80 }}>
                        <span style={{ fontWeight: 800, color: remaining === 0 ? '#16a34a' : '#1e40af' }}>{remaining}</span>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <button onClick={() => removeRow(i)} style={{ width: 28, height: 28, border: 'none', borderRadius: 7, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MdDelete size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <button onClick={addRow} style={{ padding: '8px 14px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Item</button>
            <div style={{ display: 'flex', gap: 16, fontSize: 12.5, fontWeight: 700 }}>
              <span style={{ color: '#475569' }}>Required: <b>{panelRequired}</b></span>
              <span style={{ color: '#16a34a' }}>Sent: <b>{panelSent}</b></span>
              <span style={{ color: '#1e40af' }}>Remaining: <b>{panelRemaining}</b></span>
            </div>
          </div>

          {saveMsg && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: saveMsg.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: saveMsg.startsWith('Error') ? '#dc2626' : '#15803d' }}>{saveMsg}</div>
          )}

          {/* Actions — NO "Create Invoice". Save PO + Company Info. */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={handleSavePO} disabled={saving} style={{ ...btnPrimary, background: saving ? '#94a3b8' : 'linear-gradient(135deg,#16a34a,#15803d)', cursor: saving ? 'not-allowed' : 'pointer' }}>
              <MdSave size={16} /> {saving ? 'Saving PO…' : 'Save PO'}
            </button>
            <button onClick={() => { setShowCompanyInfo(true); if (assignCompanyId) setSelectedCompany(assignCompanyId); setTimeout(() => { const el = document.getElementById('company-info-section'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 50); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#fff', color: '#4f46e5', border: '1.5px solid #c7d2fe', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <MdInfoOutline size={16} /> Company Info
            </button>
          </div>
        </div>
      )}

      {/* Uploaded PO PDF preview — shown after a PDF is selected */}
      {showPanel && pdfFile && (
        <div style={{ ...card, padding: '16px 18px', marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdPictureAsPdf size={18} color="#1e40af" /> Uploaded PO: {parsedPO?.fileName}
          </div>
          <iframe title="PO PDF" src={URL.createObjectURL(pdfFile)} style={{ width: '100%', height: 420, border: '1px solid #e8edf2', borderRadius: 10 }} />
        </div>
      )}

      {/* ── Company Info section (existing company filter) — opens on button click ── */}
      {showCompanyInfo && (
        <div id="company-info-section" style={{ ...card, padding: '18px 20px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdBusiness size={18} color="#4f46e5" /> Company Info
            </div>
            <button onClick={() => setShowCompanyInfo(false)} style={{ width: 32, height: 32, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MdClose size={16} /></button>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ ...inputSm, maxWidth: 320, fontWeight: 700 }}>
              <option value="">— Select a company —</option>
              {/* Only companies that actually have uploaded POs */}
              {poCompanies.map(c => (
                <option key={c.companyId || 'none'} value={c.companyId || 'none'}>
                  {c.companyName} ({c.poCount} PO)
                </option>
              ))}
            </select>
            <button onClick={() => navigate('/po-generator/companies')} style={{ ...btnPrimary, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
              <MdVisibility size={15} /> Open Full Company Details
            </button>
            {poCompanies.length === 0 && (
              <span style={{ fontSize: 12, color: '#94a3b8' }}>No company has an uploaded PO yet.</span>
            )}
          </div>

          {detailLoading && <div style={{ fontSize: 13, color: '#6366f1' }}>Loading…</div>}
          {companyDetail && !detailLoading && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 14 }}>
                {[['Total POs', companyDetail.totals.poCount], ['Ordered', companyDetail.totals.totalRequired], ['Sent', companyDetail.totals.totalSent], ['Remaining', companyDetail.totals.totalRemaining]].map(([l, v]) => (
                  <div key={l} style={{ background: '#f8fafc', border: '1px solid #e8edf2', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{companyDetail.pos.length} PO(s) for {companyDetail.company?.companyName}. Open Full Company Details for item-wise Required/Sent/Remaining.</div>
            </div>
          )}
          {!companyDetail && !detailLoading && selectedCompany && <div style={{ fontSize: 13, color: '#94a3b8' }}>No POs found for this company yet.</div>}
        </div>
      )}

      {/* Recently uploaded POs */}
      <div style={{ ...card, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Uploaded POs</div>
          <button onClick={loadPOList} style={{ width: 36, height: 36, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MdRefresh size={17} style={{ animation: listLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid #e8edf2', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['PO Number', 'Company', 'Items', 'Required', 'Sent', 'Remaining', 'Status', 'PDF', 'Uploaded', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {poList.map(po => (
                <tr key={po._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{po.poNumber || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>{po.companyName || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{(po.items || []).length}</td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{po.totalRequired}</td>
                  <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{po.totalSent}</td>
                  <td style={{ padding: '10px 12px', color: '#1e40af', fontWeight: 700 }}>{po.totalRemaining}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: po.status === 'Completed' ? '#f0fdf4' : po.status === 'Partial' ? '#eff6ff' : '#fef9c3', color: po.status === 'Completed' ? '#15803d' : po.status === 'Partial' ? '#1d4ed8' : '#92400e' }}>{po.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {po.pdfFile
                      ? <a href={fileUrl(po.pdfFile)} target="_blank" rel="noreferrer" style={{ color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, textDecoration: 'none' }}><MdPictureAsPdf size={16} /> View</a>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatDateTime(po.createdAt)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => handleDeletePO(po._id)} style={{ width: 30, height: 30, border: 'none', borderRadius: 7, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MdDelete size={15} /></button>
                  </td>
                </tr>
              ))}
              {!poList.length && (
                <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{listLoading ? 'Loading…' : 'No POs uploaded yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
