import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../../components/common/Modal';
import { invoiceApi } from '../../api/invoiceApi';
import { toast } from '../../components/common/Toast';
import { MdUpload, MdDownload, MdPrint, MdDelete, MdDeleteSweep, MdVisibility, MdWarning, MdCheckCircle, MdError, MdShare, MdContentCopy } from 'react-icons/md';
import { MdWhatsapp, MdEmail as MdEnvelope } from 'react-icons/md';
import { CHAKRA_LOGO_B64 } from '../../assets/chakraLogoB64.js';
import { SIGNATURE_B64 } from '../../assets/signatureB64.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import SingleProductInvoices from './components/SingleProductInvoices';
import MultipleProductInvoices from './components/MultipleProductInvoices';

// Design tokens
const RED = '#1e40af';
const RED_LIGHT = '#ef4444';
const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const TEXT_DARK = '#0f172a';
const TEXT_MID = '#475569';
const TEXT_LIGHT = '#94a3b8';

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 10,
  background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
  color: '#fff', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
};

const btnOutline = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 10,
  background: 'transparent', color: RED,
  border: `1.5px solid ${RED}`, cursor: 'pointer',
  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
};

export default function InvoiceGeneratorPage({ type = 'single' }) {
  const [invoices, setInvoices] = useState([]);
  const [singleInvoices, setSingleInvoices] = useState([]);
  const [multiInvoices, setMultiInvoices] = useState([]);
  const [singleTotal, setSingleTotal] = useState(0);
  const [multiTotal, setMultiTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showView, setShowView] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  const [uploadPreviewData, setUploadPreviewData] = useState(null);
  const [shareMenuInv, setShareMenuInv] = useState(null);
  const fileInputRef = useRef(null);

  // Pagination
  const PAGE_SIZE = 20;
  const [singlePage, setSinglePage] = useState(1);
  const [multiPage, setMultiPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  // Derived: sliced invoices for current page
  const pagedSingleInvoices = singleInvoices.slice((singlePage - 1) * PAGE_SIZE, singlePage * PAGE_SIZE);
  const pagedMultiInvoices  = multiInvoices.slice((multiPage - 1) * PAGE_SIZE, multiPage * PAGE_SIZE);

  // Keep legacy `page` alias so handleDelete still works
  const page = type === 'single' ? singlePage : multiPage;

  const fetchAll = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      // limit=0 → backend returns ALL records; frontend handles pagination
      const params = { limit: 0 };
      if (q.trim()) params.search = q.trim();

      const [allRes, statsRes] = await Promise.all([
        invoiceApi.getAll(params),
        invoiceApi.getStats(),
      ]);

      const all = allRes.data || [];
      // Only show ERP-created and Excel-uploaded invoices on this page.
      // Invoices imported from Tally (source === 'Tally' or 'tally') belong
      // in the Tally-imported data section and must never appear here.
      // Invoices from dealer orders (invoiceSource === 'sales_order') belong
      // in /orders/dealers page only.
      const erpInvoices = all.filter(inv =>
        inv.source !== 'Tally' && inv.source !== 'tally' &&
        inv.invoiceSource !== 'sales_order'
      );
      const single = erpInvoices.filter(inv => (inv.items?.length || 0) <= 1);
      const multi  = erpInvoices.filter(inv => (inv.items?.length || 0) > 1);

      setSingleInvoices(single);
      setSingleTotal(single.length);
      setMultiInvoices(multi);
      setMultiTotal(multi.length);
      setTotalCount(all.length);
      setStats(statsRes.data || {});
    } catch (e) {
      console.error(e);
      toast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search — wait 400ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => {
      setSinglePage(1);
      setMultiPage(1);
      fetchAll(1, search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line
  useEffect(() => { fetchAll(1, ''); }, [fetchAll]); // eslint-disable-line

  // Close share dropdown when clicking outside
  useEffect(() => {
    const close = () => setShareMenuInv(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Parse GRT Invoice Excel format ───────────────────────────────────────
  // Format: Invoice No | Invoice Date | Bill To | Add1 | Add2 | GSTIN | PO NO | PO DATE |
  //         Item Name | HSN | Qty | Unit Rate | Basic | cgst | sgst | igst | Total Value
  // Rows are grouped by invoice — header fields only on first item row, blank on subsequent rows.
  const parseGRTExcel = (rows) => {
    const valid = [];
    const errors = [];

    const getField = (row, ...keys) => {
      for (const k of keys) {
        // 1. Exact match
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') return String(row[k]).trim();
        // 2. Trimmed case-insensitive exact match
        const lower = k.toLowerCase();
        const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === lower);
        if (found !== undefined && row[found] !== undefined && row[found] !== '') return String(row[found]).trim();
        // 3. Starts-with match (handles 'cgst 2.5%', 'sgst 2.5%', 'igst 5%', etc.)
        const startsWith = Object.keys(row).find(rk => rk.trim().toLowerCase().startsWith(lower));
        if (startsWith !== undefined && row[startsWith] !== undefined && row[startsWith] !== '') return String(row[startsWith]).trim();
      }
      return '';
    };

    const parseNum = (v) => parseFloat(String(v).replace(/,/g, '')) || 0;

    const parseDateField = (val) => {
      if (!val && val !== 0) return new Date().toISOString().split('T')[0];

      // Helper: convert Excel serial number to YYYY-MM-DD
      const serialToDate = (n) => {
        // Excel serial: days since 1900-01-00 (with leap-year bug: 1900 treated as leap)
        const serial = Number(n);
        if (!serial || serial < 1) return new Date().toISOString().split('T')[0];
        // Adjust for Excel's 1900 leap-year bug (serial 60 = fake Feb 29 1900)
        const adjusted = serial > 59 ? serial - 1 : serial;
        const msPerDay = 86400000;
        const epoch = new Date(Date.UTC(1900, 0, 1)); // Jan 1 1900
        const d = new Date(epoch.getTime() + (adjusted - 1) * msPerDay);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      if (typeof val === 'number') return serialToDate(val);

      const s = String(val).trim();
      if (!s) return new Date().toISOString().split('T')[0];

      // Pure numeric string → treat as Excel serial
      if (/^\d+$/.test(s)) return serialToDate(Number(s));

      // MM/DD/YYYY (Excel US format)
      const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m1) {
        const yr = m1[3].length === 2 ? '20' + m1[3] : m1[3];
        return `${yr}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`;
      }
      // DD-MM-YYYY or DD.MM.YYYY
      const m2 = s.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{2,4})$/);
      if (m2) {
        const yr = m2[3].length === 2 ? '20' + m2[3] : m2[3];
        return `${yr}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
      }
      return s;
    };

    let currentInvoice = null;
    let _salesLedgerLogged = false; // log once to confirm field detection

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;

      const invoiceNo  = getField(row, 'Invoice No', 'InvoiceNo', 'Invoice No.');
      const billTo     = getField(row, 'Bill To', 'BillTo', 'Party Name');
      const itemName   = getField(row, 'Item Name', 'ItemName', 'Description', 'Item');
      const hsn        = getField(row, 'HSN', 'HSN Code', 'HSN/SAC');

      // New invoice starts when Invoice No is present
      if (invoiceNo) {
        // Save previous invoice
        if (currentInvoice && currentInvoice.items.length > 0) {
          valid.push(currentInvoice);
        }

        const add1 = getField(row, 'Bill to Add1', 'Bill To Add1', 'BillToAdd1', 'Add1', 'Address1', 'Address 1');
        const add2 = getField(row, 'Bill to Add 2', 'Bill To Add 2', 'BillToAdd2', 'Add 2', 'Add2', 'Address2', 'Address 2');
        const rawAddress = [add1, add2].filter(Boolean).join(', ');

        // Extract pincode from address — 6-digit Indian postal code
        // e.g. "Ulsoor, Bangalore-560042" → pincode="560042", address="Ulsoor, Bangalore"
        const pincodeMatch = rawAddress.match(/\b(\d{6})\b/);
        const billToPincode = pincodeMatch ? pincodeMatch[1] : '';
        // Remove the pincode (and any trailing dash/space before it) from the address lines
        const address = rawAddress.replace(/[-\s]*\b\d{6}\b/g, '').replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();

        // Ship To — read dedicated ship-to columns
        const shipAdd1 = getField(row, 'Ship to Add1', 'Ship To Add1', 'ShipToAdd1', 'Ship To Address1', 'ShipToAddress1');
        const shipAdd2 = getField(row, 'Ship to Add 2', 'Ship To Add 2', 'ShipToAdd2', 'Ship To Address2', 'ShipToAddress2');
        const shipAddress = [shipAdd1, shipAdd2].filter(Boolean).join(', ') || address;
        const shipName = getField(row, 'Ship To Name', 'ShipToName', 'Ship To') || billTo;

        // Extract ship-to state from address text
        const extractStateFromText = (text) => {
          if (!text) return '';
          const t = text.toLowerCase();
          const states = [
            ['andhra pradesh','Andhra Pradesh'],['arunachal','Arunachal Pradesh'],
            ['assam','Assam'],['bihar','Bihar'],['chhattisgarh','Chhattisgarh'],
            ['goa','Goa'],['gujarat','Gujarat'],['haryana','Haryana'],
            ['himachal','Himachal Pradesh'],['jharkhand','Jharkhand'],
            ['karnataka','Karnataka'],['kerala','Kerala'],
            ['madhya pradesh','Madhya Pradesh'],['maharashtra','Maharashtra'],
            ['manipur','Manipur'],['meghalaya','Meghalaya'],['mizoram','Mizoram'],
            ['nagaland','Nagaland'],['odisha','Odisha'],['punjab','Punjab'],
            ['rajasthan','Rajasthan'],['sikkim','Sikkim'],
            ['tamil nadu','Tamil Nadu'],['telangana','Telangana'],
            ['tripura','Tripura'],['uttar pradesh','Uttar Pradesh'],
            ['uttarakhand','Uttarakhand'],['west bengal','West Bengal'],
            ['delhi','Delhi'],['jammu','Jammu and Kashmir'],
            ['chandigarh','Chandigarh'],
            ['mumbai','Maharashtra'],['pune','Maharashtra'],
            ['bangalore','Karnataka'],['bengaluru','Karnataka'],
            ['hyderabad','Telangana'],['chennai','Tamil Nadu'],
            ['kolkata','West Bengal'],['ahmedabad','Gujarat'],
            ['jaipur','Rajasthan'],['lucknow','Uttar Pradesh'],
            ['gorakhpur','Uttar Pradesh'],['noida','Uttar Pradesh'],
            ['patna','Bihar'],['bhopal','Madhya Pradesh'],
            ['ranchi','Jharkhand'],['raipur','Chhattisgarh'],
            ['bhubaneswar','Odisha'],['guwahati','Assam'],
            ['visakhapatnam','Andhra Pradesh'],['vijayawada','Andhra Pradesh'],
          ];
          for (const [kw, state] of states) {
            if (t.includes(kw)) return state;
          }
          return '';
        };

        const shipToState = getField(row, 'Ship To State', 'ShipToState', 'Ship to State', 'shipToState') || extractStateFromText(shipAddress) || extractStateFromText(shipName);
        const billToState = getField(row, 'Bill To State', 'BillToState', 'Bill to State', 'billToState') || extractStateFromText(rawAddress);
        
        // Normalize state to official Title Case (Tally rejects lowercase state names)
        // e.g. "karnataka" → "Karnataka", "uttar pradesh" → "Uttar Pradesh"
        const toTitleCase = (s) => s ? s.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : '';
        const normalizedBillToState = toTitleCase(billToState);
        const normalizedShipToState = toTitleCase(shipToState);

        // Extract city from dedicated columns (e-Invoice validation requirement)
        // Trim leading/trailing spaces (e.g. " BALLIA" → "Ballia")
        const billToCity = toTitleCase(getField(row, 'Bill To City', 'BillToCity', 'Bill to City', 'Buyer City') || '');
        const shipToCity = toTitleCase(getField(row, 'Ship To City', 'ShipToCity', 'Ship to City', 'Consignee City') || '');

        currentInvoice = {
          invoiceNo:        invoiceNo,
          partyName:        billTo,
          partyAddress:     address,
          partyGST:         getField(row, 'GSTIN', 'GST', 'GST No', 'GSTIN No'),
          partyState:       normalizedBillToState,
          partyCity:        billToCity,
          partyEmail:       '',
          partyPhone:       '',
          billToName:       billTo,
          billToAddress:    address,
          billToCity:       billToCity,
          billToGST:        getField(row, 'GSTIN', 'GST', 'GST No', 'GSTIN No'),
          billToState:      normalizedBillToState,
          billToPincode:    billToPincode,
          shipToName:       shipName,
          shipToAddress:    shipAddress,
          shipToCity:       shipToCity,
          shipToState:      normalizedShipToState,
          invoiceDate:      parseDateField(getField(row, 'Invoice Date', 'InvoiceDate', 'Date')),
          dueDate:          '',
          purchaseOrderRef: getField(row, 'PO NO', 'PO No', 'PO Number', 'PO NO.'),
          poDate:           (() => {
            const raw = getField(row, 'PO DATE', 'PO Date', 'PODate');
            return raw ? parseDateField(raw) : '';
          })(),
          notes:            '',
          terms:            'Payment due within 30 days.',
          items:            [],
        };
      }

      // Add item to current invoice
      if (currentInvoice && itemName) {
        const qty      = parseNum(getField(row, 'Qty', 'Quantity', 'QTY'));
        const rate     = parseNum(getField(row, 'Unit Rate', 'UnitRate', 'Rate', 'Unit Price'));
        const basic    = parseFloat(parseNum(getField(row, 'Basic', 'Taxable', 'Basic Amount')).toFixed(2));
        const cgst     = parseFloat(parseNum(getField(row, 'cgst', 'CGST', 'CGST Amount')).toFixed(2));
        const sgst     = parseFloat(parseNum(getField(row, 'sgst', 'SGST', 'SGST Amount')).toFixed(2));
        const igst     = parseFloat(parseNum(getField(row, 'igst', 'IGST', 'IGST Amount')).toFixed(2));
        const total    = parseFloat((basic + cgst + sgst + igst).toFixed(2));

        // Compute tax rate from amounts — use parseFloat to preserve decimals like 2.5
        const taxAmt   = cgst + sgst + igst;
        const taxRate  = basic > 0 ? parseFloat(((taxAmt / basic) * 100).toFixed(2)) : 0;

        // Unit column — use exact match only to avoid fuzzy-matching 'Unit Rate'
        const unitVal = (row['Unit'] !== undefined && row['Unit'] !== null && String(row['Unit']).trim() !== '')
          ? String(row['Unit']).trim()
          : (row['UOM'] !== undefined && row['UOM'] !== null && String(row['UOM']).trim() !== '')
            ? String(row['UOM']).trim()
            : 'Nos';

        // Read per-item Sales Ledger from the Excel column (GRT format).
        // This is the Tally sales ledger name that must be sent in GSTLEDGERSOURCE
        // so the voucher routes to ALLINVENTORYENTRIES.LIST (inventory path).
        const itemSalesLedger = getField(row, 'Sales Ledger', 'SalesLedger', 'Tally Sales Ledger', 'TallySalesLedger', 'Ledger', 'Sales Ledger Name');

        // Log once so we can confirm the column is being read correctly
        if (!_salesLedgerLogged) {
          console.log('[parseGRTExcel] Row keys:', Object.keys(row));
          console.log('[parseGRTExcel] First item Sales Ledger resolved to:', JSON.stringify(itemSalesLedger));
          _salesLedgerLogged = true;
        }

        currentInvoice.items.push({
          description:      itemName,
          hsn:              hsn,
          qty:              qty || 1,
          unit:             unitVal,
          rate:             rate || (qty > 0 ? basic / qty : basic),
          basic:            basic,
          discount:         0,
          taxRate:          taxRate,
          cgst,
          sgst,
          igst,
          total,
          tallySalesLedger: itemSalesLedger,
        });
      } else if (!currentInvoice && itemName) {
        errors.push({ row: rowNum, field: 'Invoice No', message: `Row ${rowNum}: Item found without invoice header` });
      }
    });

    // Push last invoice
    if (currentInvoice && currentInvoice.items.length > 0) {
      valid.push(currentInvoice);
    }

    // Validate
    valid.forEach((inv, i) => {
      if (!inv.partyName) errors.push({ row: i + 1, field: 'Bill To', message: `Invoice ${inv.invoiceNo}: Missing Bill To` });
    });

    return { valid, errors };
  };
  // ── Parse Orders Excel ────────────────────────────────────────────────────
  // Groups rows by PurchaseOrder — same PO = one invoice with multiple items.
  const parseOrdersExcel = (rows) => {
    const valid = [];
    const errors = [];
    const invoiceMap = {}; // key: PurchaseOrder → invoice object

    const getField = (row, ...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return String(row[k]).trim();
        const lower = k.toLowerCase();
        const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === lower);
        if (found !== undefined && row[found] !== undefined && String(row[found]).trim() !== '') return String(row[found]).trim();
      }
      return '';
    };

    const parseDateField = (val) => {
      if (!val && val !== 0) return new Date().toISOString().split('T')[0];

      const serialToDate = (n) => {
        const serial = Number(n);
        if (!serial || serial < 1) return new Date().toISOString().split('T')[0];
        const adjusted = serial > 59 ? serial - 1 : serial;
        const d = new Date(Date.UTC(1900, 0, 1) + (adjusted - 1) * 86400000);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      };

      if (typeof val === 'number') return serialToDate(val);
      const s = String(val).trim();
      if (!s) return new Date().toISOString().split('T')[0];
      if (/^\d+$/.test(s)) return serialToDate(Number(s));
      const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m1) { const yr = m1[3].length === 2 ? '20'+m1[3] : m1[3]; return `${yr}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`; }
      const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
      if (m2) { const yr = m2[3].length === 2 ? '20'+m2[3] : m2[3]; return `${yr}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`; }
      return s;
    };

    const parseNum = (v) => parseFloat(String(v || '0').replace(/,/g, '')) || 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;

      const po          = getField(row, 'PurchaseOrder', 'Purchase Order', 'PO');
      const uniqueId    = getField(row, 'UniqueId', 'UniqueID', 'Unique Id');
      const shipToName  = getField(row, 'ShipToName', 'Ship To Name');
      const productDesc = getField(row, 'ProductDescription', 'Product Description', 'ProductName', 'Product Name', 'Description', 'ItemDescription', 'Item Description', 'ItemName', 'Item Name');
      const productCode = getField(row, 'ProductCode', 'Product Code', 'BIPartNumber', 'BI Part Number');

      if (!po && !uniqueId) { errors.push({ row: rowNum, field: 'PurchaseOrder', message: 'Missing PO and UniqueId' }); return; }
      if (!shipToName)      { errors.push({ row: rowNum, field: 'ShipToName',    message: `Row ${rowNum}: Missing ShipToName` }); return; }
      if (!productDesc && !productCode) { errors.push({ row: rowNum, field: 'ProductDescription', message: `Row ${rowNum}: Missing product` }); return; }

      // Tax values
      const cgst = parseNum(getField(row, 'CGST', 'cgst'));
      const sgst = parseNum(getField(row, 'SGST', 'sgst'));
      const igst = parseNum(getField(row, 'IGST', 'igst'));
      const qty  = parseNum(getField(row, 'Quantity', 'Qty')) || 1;
      const rate = parseNum(getField(row, 'UnitPrice', 'Unit Price', 'Rate'));

      // HSN from dedicated column
      const hsnCode = getField(row, 'HSN Code', 'HSN', 'HSNCode', 'hsn') || productCode;

      // Tax rate from amounts
      const taxableBase = rate * qty;
      const totalTaxAmt = cgst + sgst + igst;
      const taxRate = taxableBase > 0 && totalTaxAmt > 0 ? Math.round((totalTaxAmt / taxableBase) * 100) : 0;

      // Group key — use PurchaseOrder as the invoice grouping key
      const groupKey = po || uniqueId;

      if (!invoiceMap[groupKey]) {
        // Build address
        const addrParts = [
          getField(row, 'ShipToAddress1', 'Ship To Address1'),
          getField(row, 'ShipToAddress2', 'Ship To Address2'),
          getField(row, 'ShipToAddress3', 'Ship To Address3'),
          getField(row, 'ShipToAddress4', 'Ship To Address4'),
          getField(row, 'City'),
          getField(row, 'State'),
          getField(row, 'Postal'),
          getField(row, 'Country'),
        ].filter(Boolean);

        // Phone/email
        const rawPhone = getField(row, 'Phone');
        const phoneMatch = rawPhone.match(/\(D\)([^\s(]+)/);
        const emailMatch = rawPhone.match(/\(E\)([^\s(]+)/);
        const phone = phoneMatch ? phoneMatch[1].replace(/\//g,'') : rawPhone.replace(/[^0-9+]/g,'').slice(0,15);
        const emailFromPhone = emailMatch ? emailMatch[1] : '';
        const email = getField(row, 'Email') || emailFromPhone;

        const billToName    = getField(row, 'Bill To', 'BillTo');
        const billToAddress = getField(row, 'Bill To add', 'BillToAdd', 'BillToAddress');
        const billToGST     = getField(row, 'GSTin', 'GSTIN', 'GST', 'GSTIn');

        invoiceMap[groupKey] = {
          partyName:    shipToName,
          partyAddress: addrParts.join(', '),
          partyGST:     billToGST,
          partyEmail:   email,
          partyPhone:   phone,
          partyCity:    getField(row, 'City'),
          partyState:   getField(row, 'State'),
          partyPostal:  getField(row, 'Postal'),
          partyCountry: getField(row, 'Country'),
          // Ship To fields — added to ensure they are exported to Tally
          shipToName:       shipToName,
          shipToAddress:    addrParts.join(', '),
          shipToState:      getField(row, 'State'),
          shipToCity:       getField(row, 'City'),
          // Bill To fields
          billToName,
          billToAddress,
          billToGST,
          invoiceDate:      parseDateField(getField(row, 'PODate', 'PO Date', 'InvoiceDate', 'Invoice Date')),
          dueDate:          '',
          purchaseOrderRef: po,
          // FIX: Parse PO Date properly so it's stored in correct format
          poDate:           (() => {
            const raw = getField(row, 'PODate', 'PO Date');
            return raw ? parseDateField(raw) : '';
          })(),
          uniqueId,
          vendorCode:       getField(row, 'VendorCode', 'Vendor Code'),
          accountNumber:    getField(row, 'AccountNumber', 'Account Number'),
          programNumber:    getField(row, 'ProgramNumber', 'Program Number'),
          brandName:        getField(row, 'BrandName', 'Brand Name'),
          orderStatus:      getField(row, 'OrderStatus', 'Order Status'),
          biwpo:            getField(row, 'BIWPO'),
          dispatchDate:     getField(row, 'DispatchDate', 'Dispatch Date'),
          awb:              getField(row, 'AWB'),
          courierName:      getField(row, 'CourierName', 'Courier Name'),
          vendorInvoiceNumber: getField(row, 'VendorInvoiceNumber', 'Vendor Invoice Number'),
          deliveryDate:     getField(row, 'DeliveryDate', 'Delivery Date'),
          weightKg:         parseNum(getField(row, 'Weight (in Kg)', 'WeightKg', 'Weight')),
          modeOfTransport:  getField(row, 'Mode of Transportation', 'ModeOfTransportation', 'Mode'),
          lbh:              getField(row, 'LBH'),
          podSharedLink:    getField(row, 'PodSharedLink', 'POD Shared Link', 'Pod Shared Link'),
          notes:            getField(row, 'Comments'),
          terms:            'Payment due within 30 days.',
          items:            [],
        };
      }

      // Add this row's product as a line item
      invoiceMap[groupKey].items.push({
        description: productDesc || productCode,
        hsn:         hsnCode,
        qty,
        unit:        getField(row, 'UOM', 'Unit') || 'EA',
        rate,
        discount:    0,
        taxRate,
        cgst,
        sgst,
        igst,
      });
    });

    // Convert map to array
    Object.values(invoiceMap).forEach(inv => {
      if (inv.items.length > 0) valid.push(inv);
    });

    return { valid, errors };
  };

  // ── Excel Upload Handler ──────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: false });

      // Find the "Orders" sheet or fall back to first sheet
      const sheetName = workbook.SheetNames.find(n => /orders/i.test(n)) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Read as raw arrays to find the real header row (handles blank first column)
      const rawArrays = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (!rawArrays.length) {
        toast('Excel file is empty or unreadable', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Find the header row — it's the first row that contains known column names
      const knownColsOrders = ['uniqueid','purchaseorder','shiptoname','productdescription','productname','vendorcode','bipartnumber'];
      const knownColsGRT    = ['invoice no','bill to','item name','hsn','unit rate','total value'];
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(5, rawArrays.length); i++) {
        const rowLower = rawArrays[i].map(c => String(c).trim().toLowerCase());
        if (knownColsOrders.some(k => rowLower.includes(k)) || knownColsGRT.some(k => rowLower.includes(k))) {
          headerRowIdx = i;
          break;
        }
      }

      // Build header map: colIndex -> trimmed header name
      const headers = rawArrays[headerRowIdx].map(h => String(h).trim());
      console.log('[Invoice Upload] Sheet:', sheetName, '| Header row:', headerRowIdx);
      console.log('[Invoice Upload] Headers:', headers);

      // Convert data rows to objects using our clean headers
      const rows = [];
      for (let i = headerRowIdx + 1; i < rawArrays.length; i++) {
        const arr = rawArrays[i];
        // Skip completely empty rows
        if (arr.every(c => c === '' || c === null || c === undefined)) continue;
        const obj = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = arr[idx] !== undefined ? arr[idx] : '';
        });
        rows.push(obj);
      }

      console.log('[Invoice Upload] Data rows:', rows.length);
      if (rows.length > 0) console.log('[Invoice Upload] First data row:', rows[0]);

      if (!rows.length) {
        toast('No data rows found in Excel', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Detect format
      const firstRow = rows[0];
      const allKeys = Object.keys(firstRow).map(k => k.toLowerCase().trim());
      const isOrdersFormat = allKeys.some(k => ['purchaseorder','uniqueid','shiptoname','bipartnumber','productdescription','productname'].includes(k));
      const isGRTFormat    = allKeys.some(k => ['invoice no','bill to','item name'].includes(k));

      let parsed;
      if (isOrdersFormat) {
        parsed = parseOrdersExcel(rows);
      } else if (isGRTFormat) {
        parsed = parseGRTExcel(rows);
      } else {
        // Legacy generic format
        const invoicesToCreate = [];
        let currentInvoice = null;
        rows.forEach(row => {
          if (row.PartyName && row.PartyName !== currentInvoice?.partyName) {
            if (currentInvoice) invoicesToCreate.push(currentInvoice);
            currentInvoice = {
              partyName: row.PartyName || '',
              partyAddress: row.PartyAddress || '',
              partyGST: row.PartyGST || '',
              partyEmail: row.PartyEmail || '',
              partyPhone: row.PartyPhone || '',
              invoiceDate: row.InvoiceDate || new Date().toISOString().split('T')[0],
              dueDate: row.DueDate || '',
              items: [],
              notes: row.Notes || '',
              terms: row.Terms || 'Payment due within 30 days.',
            };
          }
          if (currentInvoice && row.ItemDescription) {
            currentInvoice.items.push({
              description: row.ItemDescription || '',
              hsn: row.HSN || '',
              qty: parseFloat(row.Qty) || 1,
              unit: row.Unit || 'Nos',
              rate: parseFloat(row.Rate) || 0,
              discount: parseFloat(row.Discount) || 0,
              taxRate: parseFloat(row.TaxRate) || 18,
            });
          }
        });
        if (currentInvoice) invoicesToCreate.push(currentInvoice);
        parsed = { valid: invoicesToCreate, errors: [] };
      }

      if (!parsed.valid.length && !parsed.errors.length) {
        toast('No data found in Excel', 'warning');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Show preview/validation modal before submitting
      setUploadPreviewData(parsed);
      setShowUploadPreview(true);
    } catch (e) {
      console.error(e);
      toast(e.message || 'Failed to read Excel file', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Confirm Upload after preview ─────────────────────────────────────────
  const handleConfirmUpload = async () => {
    if (!uploadPreviewData?.valid?.length) return;
    setUploading(true);
    try {
      const res = await invoiceApi.bulkUpload({ invoices: uploadPreviewData.valid });
      toast(`${res.data.created} invoice${res.data.created !== 1 ? 's' : ''} created successfully`);
      if (res.data.errors?.length) {
        toast(`${res.data.errors.length} rows had server-side errors`, 'warning');
      }
      setShowUploadPreview(false);
      setUploadPreviewData(null);
      setSinglePage(1);
      setMultiPage(1);
      await fetchAll(1);
    } catch (e) {
      console.error(e);
      toast(e.message || 'Failed to upload invoices', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Print/Download Invoice ────────────────────────────────────────────────
  const handlePrint = (invoice) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateInvoiceHTML(invoice));
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = async (invoice) => {
    toast('Generating PDF…', 'info');
    try {
      await generateInvoicePDF(invoice);
      toast(`Invoice ${invoice.invoiceNo}.pdf downloaded`);
    } catch (err) {
      console.error(err);
      // Fallback to HTML download
      const html = generateInvoiceHTML(invoice);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNo}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Invoice downloaded as HTML (PDF failed)', 'warning');
    }
  };

  const generateInvoiceHTML = (inv) => {
    const fmtDate = (d) => {
      if (!d) return '—';
      try {
        // If it's already YYYY-MM-DD, parse as local date to avoid UTC shift
        const iso = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (iso) {
          const dt = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
          return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch { return String(d) || '—'; }
    };
    const fmtAmt  = (n) => `₹ ${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtNum  = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Compute per-item tax breakdown for HSN summary table
    const hsnMap = {};
    (inv.items || []).forEach(item => {
      const key        = item.hsn || '—';
      const taxableAmt = (item.qty || 0) * (item.rate || 0) * (1 - (item.discount || 0) / 100);

      // Use stored amounts from Excel if present, otherwise compute from taxRate
      const storedCGST = Number(item.cgst) || 0;
      const storedSGST = Number(item.sgst) || 0;
      const storedIGST = Number(item.igst) || 0;
      // Check if tax data was actually provided (non-zero) vs genuinely absent
      const hasTaxData = (item.cgst != null && item.cgst !== '') || (item.sgst != null && item.sgst !== '') || (item.igst != null && item.igst !== '');

      let cgstAmt, sgstAmt, igstAmt, cgstRate, sgstRate, igstRate;
      if (storedIGST > 0) {
        // Inter-state: IGST only
        igstAmt  = storedIGST;
        cgstAmt  = 0; sgstAmt = 0;
        igstRate = taxableAmt > 0 ? parseFloat(((igstAmt / taxableAmt) * 100).toFixed(2)) : (item.taxRate || 0);
        cgstRate = 0; sgstRate = 0;
      } else if (hasTaxData && (storedCGST > 0 || storedSGST > 0)) {
        // Intra-state: CGST + SGST from stored values
        cgstAmt  = storedCGST; sgstAmt = storedSGST; igstAmt = 0;
        cgstRate = taxableAmt > 0 ? parseFloat(((cgstAmt / taxableAmt) * 100).toFixed(2)) : (item.taxRate || 0) / 2;
        sgstRate = cgstRate; igstRate = 0;
      } else if (item.taxRate > 0) {
        // Fallback: compute from taxRate only when no stored tax data at all
        const halfRate = (item.taxRate || 0) / 2;
        cgstRate = halfRate; sgstRate = halfRate; igstRate = 0;
        cgstAmt  = taxableAmt * cgstRate / 100;
        sgstAmt  = taxableAmt * sgstRate / 100;
        igstAmt  = 0;
      } else {
        // Truly zero tax
        cgstAmt = 0; sgstAmt = 0; igstAmt = 0;
        cgstRate = 0; sgstRate = 0; igstRate = 0;
      }

      if (!hsnMap[key]) hsnMap[key] = { taxable: 0, cgstRate, sgstRate, igstRate, cgst: 0, sgst: 0, igst: 0 };
      hsnMap[key].taxable += taxableAmt;
      hsnMap[key].cgst    += cgstAmt;
      hsnMap[key].sgst    += sgstAmt;
      hsnMap[key].igst    += igstAmt;
    });
    const hsnRows      = Object.entries(hsnMap);
    const totalTaxable = hsnRows.reduce((s, [, v]) => s + v.taxable, 0);
    const totalCGST    = hsnRows.reduce((s, [, v]) => s + v.cgst, 0);
    const totalSGST    = hsnRows.reduce((s, [, v]) => s + v.sgst, 0);
    const totalIGST    = hsnRows.reduce((s, [, v]) => s + v.igst, 0);
    const totalTax     = totalCGST + totalSGST + totalIGST;
    const hasIGST      = true;   // always show all tax columns
    const hasCGSTSGST  = true;

    // Amount in words
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const toWords = (n) => {
      n = Math.round(n);
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toWords(n%100) : '');
      if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
      if (n < 10000000) return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + toWords(n%100000) : '');
      return toWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + toWords(n%10000000) : '');
    };
    const grand = Number(inv.grandTotal) || 0;
    const rupees = Math.floor(grand);
    const paise  = Math.round((grand - rupees) * 100);
    const amtWords = toWords(rupees) + ' Rupees' + (paise > 0 ? ' and ' + toWords(paise) + ' Paise' : ' Only');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${inv.invoiceNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; color: #111; font-size: 12px; }
  .page { max-width: 820px; margin: 0 auto; padding: 24px 28px; border: 1px solid #ccc; overflow: hidden; }

  /* ── Top label ── */
  .top-label { text-align: right; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 10px; }
  .top-label span { border: 1px solid #999; padding: 2px 10px; font-size: 10px; margin-left: 8px; }

  /* ── Header ── */
  .header { display: flex; align-items: flex-start; gap: 14px; padding-bottom: 14px; border-bottom: 2px solid #111; margin-bottom: 0; }
  .logo-wrap { flex-shrink: 0; }
  .logo-wrap img { width: 64px; height: 64px; object-fit: contain; border-radius: 6px; }
  .company-info { flex: 1; }
  .company-name { font-size: 18px; font-weight: 900; color: #111; }
  .company-detail { font-size: 11px; color: #333; line-height: 1.6; margin-top: 3px; }
  .inv-box { text-align: right; min-width: 200px; }
  .inv-box table { margin-left: auto; border-collapse: collapse; }
  .inv-box td { padding: 2px 6px; font-size: 12px; }
  .inv-box td:first-child { font-weight: 700; text-align: right; }
  .inv-box td:last-child { font-weight: 400; text-align: left; }

  /* ── Bill/Ship grid ── */
  .party-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #ccc; border-top: none; }
  .party-cell { padding: 10px 12px; }
  .party-cell + .party-cell { border-left: 1px solid #ccc; }
  .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 4px; }
  .party-name { font-size: 13px; font-weight: 800; color: #111; margin-bottom: 3px; }
  .party-line { font-size: 11px; color: #333; line-height: 1.55; }

  /* ── Items table ── */
  .items-wrap { border: 1px solid #ccc; border-top: none; }
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table th { background: #f0f0f0; padding: 7px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #ccc; text-align: left; }
  .items-table th.r { text-align: right; }
  .items-table td { padding: 7px 10px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  .items-table td.r { text-align: right; }
  .items-table td.mono { font-family: monospace; font-size: 11px; }
  .items-table tbody tr:last-child td { border-bottom: none; }
  .tax-row td { background: #fafafa; font-size: 11px; color: #444; border-bottom: 1px solid #eee; }
  .total-row td { font-weight: 800; font-size: 13px; background: #f5f5f5; border-top: 2px solid #ccc; }

  /* ── HSN summary ── */
  .hsn-wrap { border: 1px solid #ccc; border-top: none; overflow-x: hidden; }
  .hsn-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .hsn-table th { background: #f0f0f0; padding: 4px 5px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #ccc; text-align: left; word-break: break-word; }
  .hsn-table th.r { text-align: right; }
  .hsn-table td { padding: 4px 5px; font-size: 9.5px; border-bottom: 1px solid #eee; word-break: break-word; overflow: hidden; }
  .hsn-table td.r { text-align: right; }
  .hsn-table .total-row td { font-weight: 700; background: #f5f5f5; border-top: 1px solid #ccc; border-bottom: none; }

  /* ── Amount in words ── */
  .amt-words { border: 1px solid #ccc; border-top: none; padding: 8px 12px; font-size: 11px; }
  .amt-words strong { font-size: 11px; }

  /* ── Footer grid ── */
  .footer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #ccc; border-top: none; }
  .footer-cell { padding: 10px 12px; }
  .footer-cell + .footer-cell { border-left: 1px solid #ccc; }
  .footer-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 6px; }
  .footer-line { font-size: 11px; color: #333; line-height: 1.6; }
  .footer-line strong { font-weight: 700; }

  /* ── Sig ── */
  .sig-cell { text-align: right; display: flex; flex-direction: column; justify-content: space-between; }
  .sig-line { border-top: 1px solid #999; margin-top: 36px; padding-top: 5px; font-size: 11px; color: #555; text-align: center; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { border: none; padding: 10px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- TAX INVOICE label -->
  <div class="top-label">TAX INVOICE <span>ORIGINAL</span></div>

  <!-- Company Header -->
  <div class="header">
    <div class="logo-wrap">
      <img src="${CHAKRA_LOGO_B64}" alt="MANUFACTURING ERP" />
    </div>
    <div class="company-info">
      <div class="company-name">MANUFACTURING ERP</div>
      <div class="company-detail">
        ${inv.companyAddress || '#13/14, Azeez Sait Industrial Estate, Mysore Road, Nayandahalli, Bangalore - 560039'}<br/>
        ${inv.companyGST ? `GSTIN: ${inv.companyGST}` : 'GSTIN: 29ABWFS0002M1ZR'}
      </div>
    </div>
    <div class="inv-box">
      <table>
        <tr><td>Invoice No.</td><td>${inv.invoiceNo}</td></tr>
        <tr><td>Invoice Date</td><td>${fmtDate(inv.invoiceDate)}</td></tr>
        ${inv.purchaseOrderRef ? `<tr><td>PO No.</td><td>${inv.purchaseOrderRef}</td></tr>` : ''}
        ${inv.poDate ? `<tr><td>PO Date</td><td>${fmtDate(inv.poDate)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <!-- E-Invoice Details -->
  ${(inv.irn || inv.ackNo) ? `
  <div style="border: 1px solid #ccc; border-top: none; padding: 12px 12px; background: #f8fafc;">
    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">E-Invoice Details</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      ${inv.irn ? `<div style="font-size: 11px;"><span style="color: #64748b;">IRN:</span> <span style="font-weight: 700; color: #0f172a; word-break: break-all;">${inv.irn}</span></div>` : ''}
      ${inv.ackNo ? `<div style="font-size: 11px;"><span style="color: #64748b;">Ack No:</span> <span style="font-weight: 700; color: #0f172a;">${inv.ackNo}</span></div>` : ''}
      ${inv.ackDate ? `<div style="font-size: 11px;"><span style="color: #64748b;">Ack Date:</span> <span style="font-weight: 700; color: #0f172a;">${fmtDate(inv.ackDate)}</span></div>` : ''}
    </div>
  </div>` : ''}

  <!-- Bill To / Ship To -->
  ${(() => {
    // Place of Supply = Ship To state (GST law) → fallback to bill-to state → never hardcode
    const placeOfSupply = inv.shipToState || inv.partyState || inv.billToState || '';
    const billGstin = inv.billToGST || inv.partyGST || '';
    const shipState = inv.shipToState || '';
    const shipAddr  = inv.shipToAddress || inv.partyAddress || '';
    return `<div class="party-grid">
    <div class="party-cell">
      <div class="party-label">Bill To</div>
      <div class="party-name">${inv.billToName || inv.partyName}</div>
      <div class="party-line">
        ${inv.billToAddress ? `Address: ${inv.billToAddress}<br/>` : (inv.partyAddress ? `Address: ${inv.partyAddress}<br/>` : '')}
        ${inv.billToState || inv.partyState ? `State: ${inv.billToState || inv.partyState}<br/>` : ''}
        ${billGstin ? `GSTIN: ${billGstin}<br/>` : ''}
        ${placeOfSupply ? `Place of Supply: ${placeOfSupply}<br/>` : ''}
        ${inv.partyPhone ? `Mobile: ${inv.partyPhone}` : ''}
      </div>
    </div>
    <div class="party-cell">
      <div class="party-label">Ship To</div>
      <div class="party-name">${inv.shipToName || inv.partyName}</div>
      <div class="party-line">
        ${shipAddr ? `Address: ${shipAddr}<br/>` : ''}
        ${shipState ? `State: ${shipState}` : ''}
      </div>
    </div>
  </div>`;
  })()}

  <!-- Items Table -->
  <div class="items-wrap">
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:36px">S.NO.</th>
          <th>ITEMS</th>
          <th>HSN</th>
          <th class="r">QTY.</th>
          <th class="r">RATE</th>
          <th class="r">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${(inv.items || []).map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description || '—'}</td>
          <td class="mono">${item.hsn || '—'}</td>
          <td class="r">${item.qty}</td>
          <td class="r">${fmtNum(item.rate)}</td>
          <td class="r">${fmtNum(item.basic || ((item.qty || 0) * (item.rate || 0)))}</td>
        </tr>`).join('')}

        <!-- Tax rows -->
        ${hasCGSTSGST ? `
        <tr class="tax-row">
          <td colspan="5" style="text-align:right;padding-right:12px;">CGST @${hsnRows[0]?.[1]?.cgstRate || 0}%</td>
          <td class="r">₹ ${fmtNum(totalCGST)}</td>
        </tr>
        <tr class="tax-row">
          <td colspan="5" style="text-align:right;padding-right:12px;">SGST @${hsnRows[0]?.[1]?.sgstRate || 0}%</td>
          <td class="r">₹ ${fmtNum(totalSGST)}</td>
        </tr>` : ''}
        ${hasIGST ? `
        <tr class="tax-row">
          <td colspan="5" style="text-align:right;padding-right:12px;">IGST @${hsnRows[0]?.[1]?.igstRate || 0}%</td>
          <td class="r">₹ ${fmtNum(totalIGST)}</td>
        </tr>` : ''}

        <!-- Total row -->
        <tr class="total-row">
          <td colspan="3" style="text-align:right;font-weight:800;">TOTAL</td>
          <td class="r">${(inv.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0)}</td>
          <td></td>
          <td class="r">₹ ${fmtNum(grand)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- HSN/SAC Tax Summary -->
  <div class="hsn-wrap">
    <table class="hsn-table">
      <colgroup>
        <col style="width:11%"/>
        <col style="width:13%"/>
        <col style="width:8%"/>
        <col style="width:11%"/>
        <col style="width:8%"/>
        <col style="width:11%"/>
        <col style="width:8%"/>
        <col style="width:11%"/>
        <col style="width:19%"/>
      </colgroup>
      <thead>
        <tr>
          <th>HSN/SAC</th>
          <th class="r">Taxable Value</th>
          ${hasCGSTSGST ? `<th class="r">CGST Rate</th><th class="r">CGST Amount</th><th class="r">SGST Rate</th><th class="r">SGST Amount</th>` : ''}
          ${hasIGST     ? `<th class="r">IGST Rate</th><th class="r">IGST Amount</th>` : ''}
          <th class="r">Total Tax Amount</th>
        </tr>
      </thead>
      <tbody>
        ${hsnRows.map(([hsn, v]) => `
        <tr>
          <td>${hsn}</td>
          <td class="r">${fmtNum(v.taxable)}</td>
          ${hasCGSTSGST ? `<td class="r">${v.cgstRate}%</td><td class="r">${fmtNum(v.cgst)}</td><td class="r">${v.sgstRate}%</td><td class="r">${fmtNum(v.sgst)}</td>` : ''}
          ${hasIGST     ? `<td class="r">${v.igstRate}%</td><td class="r">${fmtNum(v.igst)}</td>` : ''}
          <td class="r">₹ ${fmtNum(v.cgst + v.sgst + v.igst)}</td>
        </tr>`).join('')}
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="r">${fmtNum(totalTaxable)}</td>
          ${hasCGSTSGST ? `<td></td><td class="r">${fmtNum(totalCGST)}</td><td></td><td class="r">${fmtNum(totalSGST)}</td>` : ''}
          ${hasIGST     ? `<td></td><td class="r">${fmtNum(totalIGST)}</td>` : ''}
          <td class="r"><strong>₹ ${fmtNum(totalTax)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Amount in Words -->
  <div class="amt-words">
    <strong>Total Amount (in words)</strong><br/>
    ${amtWords}
  </div>

  <!-- Footer: Terms | Signature -->
  <div class="footer-grid" style="grid-template-columns:1fr 1fr;">
    <div class="footer-cell">
      <div class="footer-label">Terms and Conditions</div>
      <div class="footer-line">
        1. Goods once sold will not be taken back or exchanged<br/>
        2. All disputes are subject to Bangalore jurisdiction only<br/>
        3. This is computer generated invoice &amp; doesn't require any signature.
      </div>
    </div>
    <div class="footer-cell sig-cell">
      <div>
        <div class="footer-label">For MANUFACTURING ERP</div>
      </div>
      <div style="text-align:right;">
        <img src="${SIGNATURE_B64}" alt="Signature" style="height:60px;margin-bottom:5px;"/>
      </div>
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>

</div>
</body>
</html>`.trim();
  };

  const handleStatusChange = async (id, status) => {
    try {
      await invoiceApi.updateStatus(id, status);
      toast('Status updated');
      await fetchAll(1, search);
    } catch (e) {
      toast(e.message || 'Failed to update status', 'error');
    }
  };

  // ── Delete All Invoices ───────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (!window.confirm(`This will permanently delete all ${totalCount} invoices. This cannot be undone. Continue?`)) return;
    try {
      const res = await invoiceApi.deleteAll();
      toast(`${res.deleted} invoices deleted`);
      setSinglePage(1);
      setMultiPage(1);
      await fetchAll(1);
    } catch (e) {
      toast(e.message || 'Failed to delete all invoices', 'error');
    }
  };

  // ── Delete Invoice ────────────────────────────────────────────────────────
  const handleDelete = async (id, invoiceNo) => {
    if (!window.confirm(`Delete invoice ${invoiceNo}?`)) return;
    try {
      await invoiceApi.delete(id);
      toast('Invoice deleted');
      // If we deleted the last item on this page, go back one page
      const currentList = type === 'single' ? singleInvoices : multiInvoices;
      const currentPage = type === 'single' ? singlePage : multiPage;
      const setCurrentPage = type === 'single' ? setSinglePage : setMultiPage;
      const newPage = currentList.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await fetchAll(1, search);
    } catch (e) {
      toast(e.message || 'Failed to delete', 'error');
    }
  };

  // ── Share Invoice ─────────────────────────────────────────────────────────
  // Note: shareMenuInv state is declared at the top of the component

  const handleShare = (inv) => {
    // Always show our custom dropdown (WhatsApp, Gmail, Copy)
    setShareMenuInv(shareMenuInv?._id === inv._id ? null : inv);
  };

  const shareViaWhatsApp = async (inv) => {
    setShareMenuInv(null);
    try {
      // Generate the PDF as a blob
      const pdf = await renderInvoiceToPDF(inv);
      const pdfBlob = pdf.output('blob');
      const fileName = `${inv.invoiceNo}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Use Web Share API to share only the PDF file (no text message)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
      } else {
        // Fallback: download PDF directly if Web Share API not supported
        pdf.save(fileName);
        alert('PDF downloaded. Please share it manually via WhatsApp.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[shareViaWhatsApp]', err);
        alert('Failed to share PDF. Please try downloading and sharing manually.');
      }
    }
  };

  // ── Core PDF renderer — returns jsPDF object, never downloads ────────────
  const renderInvoiceToPDF = async (inv) => {
    const container = document.createElement('div');
    // Use 794px width (A4 at 96 DPI) for proper 1:1 scale rendering
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;padding:0;margin:0;';
    container.innerHTML = generateInvoiceHTML(inv);
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, {
        scale: 2.5, useCORS: true, backgroundColor: '#ffffff', logging: false,
        width: 794,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW   = pdf.internal.pageSize.getWidth();  // 210mm
      const pageH   = pdf.internal.pageSize.getHeight(); // 297mm
      // Scale image to fit A4 width with small margins
      const margin  = 5; // 5mm margins on each side
      const usableW = pageW - margin * 2;
      const imgH    = (canvas.height * usableW) / canvas.width;
      let yPos = 0, remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, 'JPEG', margin, margin - yPos, usableW, imgH);
        remaining -= (pageH - margin * 2); yPos += (pageH - margin * 2);
        if (remaining > 0) pdf.addPage();
      }
      return pdf;
    } finally {
      document.body.removeChild(container);
    }
  };

  // ── Download button — explicitly saves the PDF ────────────────────────────
  const generateInvoicePDF = async (inv) => {
    const pdf = await renderInvoiceToPDF(inv);
    pdf.save(`${inv.invoiceNo}.pdf`);
  };

  // ── Gmail — opens Gmail compose with professional body (original approach) ─
  const shareViaGmail = async (inv) => {
    setShareMenuInv(null);

    const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d || ''; } };
    const fmtAmt  = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const item    = inv.items?.[0] || {};

    // Step 1 — silently generate & download the PDF
    const filename = `${inv.invoiceNo}.pdf`;
    try {
      const pdf = await renderInvoiceToPDF(inv);
      pdf.save(filename);
    } catch (e) {
      console.error('PDF generation failed:', e);
    }

    // Step 2 — build professional email body
    const lines = [
      `Dear ${inv.partyName},`,
      ``,
      `Greetings from MANUFACTURING ERP!`,
      ``,
      `Please find the invoice PDF (${filename}) attached to this email for your records.`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  INVOICE DETAILS`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  Invoice No.    : ${inv.invoiceNo}`,
      `  Invoice Date   : ${fmtDate(inv.invoiceDate)}`,
      inv.purchaseOrderRef ? `  Purchase Order : ${inv.purchaseOrderRef}` : null,
      inv.poDate           ? `  PO Date        : ${inv.poDate}` : null,
      inv.uniqueId         ? `  Unique ID      : ${inv.uniqueId}` : null,
      inv.vendorCode       ? `  Vendor Code    : ${inv.vendorCode}` : null,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  PRODUCT DETAILS`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      item.description     ? `  Product        : ${item.description}` : null,
      item.hsn             ? `  Product Code   : ${item.hsn}` : null,
      inv.brandName        ? `  Brand          : ${inv.brandName}` : null,
      item.qty != null     ? `  Quantity       : ${item.qty} ${item.unit || ''}`.trim() : null,
      inv.grandTotal       ? `  Grand Total    : ${fmtAmt(inv.grandTotal)}` : null,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  SHIPMENT DETAILS`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      inv.orderStatus      ? `  Order Status   : ${inv.orderStatus}` : null,
      inv.dispatchDate     ? `  Dispatch Date  : ${inv.dispatchDate}` : null,
      inv.awb              ? `  AWB No.        : ${inv.awb}` : null,
      inv.courierName      ? `  Courier        : ${inv.courierName}` : null,
      inv.deliveryDate     ? `  Delivery Date  : ${inv.deliveryDate}` : null,
      inv.podSharedLink    ? `  POD Link       : ${inv.podSharedLink}` : null,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Kindly review and confirm receipt. For any queries, please reply to this email.`,
      ``,
      `Terms: ${inv.terms || 'Payment due within 30 days.'}`,
      ``,
      `Warm regards,`,
      `MANUFACTURING ERP`,
      `ERP & Operations Team`,
    ].filter(l => l !== null).join('\n');

    // Step 3 — open Gmail compose (pre-filled)
    const to      = inv.partyEmail ? encodeURIComponent(inv.partyEmail) : '';
    const subject = encodeURIComponent(`Invoice ${inv.invoiceNo} from MANUFACTURING ERP — ${inv.partyName}`);
    const body    = encodeURIComponent(lines);
    window.open(
      `https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}&body=${body}`,
      '_blank'
    );

    // Step 4 — guide the user
    toast(`📎 ${filename} downloaded — Gmail is open. Click the paperclip icon in Gmail to attach it.`, 'success');
  };

  const shareViaCopy = (inv) => {
    const text = `Invoice ${inv.invoiceNo} | ${inv.partyName} | PO: ${inv.purchaseOrderRef || '—'} | Product: ${inv.items?.[0]?.description || '—'} | Qty: ${inv.items?.[0]?.qty || '—'} | AWB: ${inv.awb || '—'} | Courier: ${inv.courierName || '—'} | Status: ${inv.orderStatus || inv.status}`;
    navigator.clipboard.writeText(text).then(() => {
      toast('Invoice details copied to clipboard');
    });
    setShareMenuInv(null);
  };

  // ── Manual Invoice Creation ───────────────────────────────────────────────
  const [showCreate, setShowCreate]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const emptyItem = { description: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, discount: 0, taxRate: 18 };
  const [createForm, setCreateForm]   = useState({
    partyName: '', partyAddress: '', partyGST: '', partyEmail: '', partyPhone: '',
    invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '',
    purchaseOrderRef: '', poDate: '', notes: '', terms: 'Payment due within 30 days.',
  });
  const [createItems, setCreateItems] = useState([{ ...emptyItem }]);

  const resetCreateForm = () => {
    setCreateForm({
      partyName: '', partyAddress: '', partyGST: '', partyEmail: '', partyPhone: '',
      invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '',
      purchaseOrderRef: '', poDate: '', notes: '', terms: 'Payment due within 30 days.',
    });
    setCreateItems([{ ...emptyItem }]);
  };

  const updateCreateItem = (i, field, val) =>
    setCreateItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const createItemSubtotal = createItems.reduce((s, it) => {
    const base = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
    const disc = base * ((parseFloat(it.discount) || 0) / 100);
    return s + base - disc;
  }, 0);
  const createItemTax = createItems.reduce((s, it) => {
    const base = (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0);
    const disc = base * ((parseFloat(it.discount) || 0) / 100);
    const taxable = base - disc;
    return s + taxable * ((parseFloat(it.taxRate) || 0) / 100);
  }, 0);
  const createGrandTotal = createItemSubtotal + createItemTax;

  const handleCreateInvoice = async () => {
    if (!createForm.partyName.trim()) { toast('Party name is required', 'error'); return; }
    if (createItems.some(it => !it.description.trim())) { toast('Fill item description for all rows', 'error'); return; }
    setSaving(true);
    try {
      await invoiceApi.create({
        ...createForm,
        items: createItems.map(it => ({
          description: it.description.trim(),
          hsn: it.hsn.trim(),
          qty: parseFloat(it.qty) || 1,
          unit: it.unit,
          rate: parseFloat(it.rate) || 0,
          discount: parseFloat(it.discount) || 0,
          taxRate: parseFloat(it.taxRate) || 0,
        })),
      });
      toast('Invoice created successfully', 'success');
      setShowCreate(false);
      resetCreateForm();
      setSinglePage(1);
      setMultiPage(1);
      await fetchAll(1);
    } catch (e) {
      toast(e.message || 'Failed to create invoice', 'error');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>
            {type === 'single' ? 'Single Product Invoices' : 'Multiple Products Invoices'}
          </h1>
          <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: '4px 0 0' }}>
            {type === 'single'
              ? 'Invoices with one product per customer order'
              : 'Invoices with multiple / bulk products per order'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ ...btnOutline, opacity: uploading ? 0.6 : 1 }}
          >
            <MdUpload size={16} />
            {uploading ? 'Uploading...' : 'Upload Excel'}
          </button>

          {totalCount > 0 && (
            <button
              onClick={handleDeleteAll}
              style={{ ...btnOutline, color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
            >
              <MdDeleteSweep size={16} />
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {(type === 'single' ? [
          { label: 'Single Product Invoices', value: singleTotal, color: '#16a34a' },
          { label: 'Paid', value: stats.paid || 0, color: GREEN },
          { label: 'Overdue', value: stats.overdue || 0, color: RED_LIGHT },
          { label: 'Total Value', value: `₹${((stats.totalValue || 0) / 100000).toFixed(2)}L`, color: RED },
        ] : [
          { label: 'Multi-Product Invoices', value: multiTotal, color: '#1d4ed8' },
          { label: 'Paid', value: stats.paid || 0, color: GREEN },
          { label: 'Overdue', value: stats.overdue || 0, color: RED_LIGHT },
          { label: 'Total Value', value: `₹${((stats.totalValue || 0) / 100000).toFixed(2)}L`, color: RED },
        ]).map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #e8edf2', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Invoice Sections: Single + Multi ── */}
      {type === 'single' && (
        <SingleProductInvoices
          invoices={pagedSingleInvoices}
          total={singleTotal}
          page={singlePage}
          PAGE_SIZE={PAGE_SIZE}
          search={search}
          setSearch={setSearch}
          searchRef={searchRef}
          setPage={setSinglePage}
          handleStatusChange={handleStatusChange}
          handlePrint={handlePrint}
          handleDownload={handleDownload}
          handleShare={handleShare}
          shareMenuInv={shareMenuInv}
          shareViaWhatsApp={shareViaWhatsApp}
          shareViaGmail={shareViaGmail}
          shareViaCopy={shareViaCopy}
          handleDelete={handleDelete}
          setSelectedInvoice={setSelectedInvoice}
          setShowView={setShowView}
          onTallySent={(updated) => {
            // Update the invoice in local state so the ✅ badge shows immediately
            setSingleInvoices(prev => prev.map(inv => inv._id === updated._id ? { ...inv, tallySync: updated.tallySync, tallySyncAt: updated.tallySyncAt } : inv));
          }}
        />
      )}

      {type === 'multi' && (
        <MultipleProductInvoices
          invoices={pagedMultiInvoices}
          total={multiTotal}
          page={multiPage}
          PAGE_SIZE={PAGE_SIZE}
          setPage={setMultiPage}
          search={search}
          setSearch={setSearch}
          searchRef={searchRef}
          handleStatusChange={handleStatusChange}
          handlePrint={handlePrint}
          handleDownload={handleDownload}
          handleShare={handleShare}
          shareMenuInv={shareMenuInv}
          shareViaWhatsApp={shareViaWhatsApp}
          shareViaGmail={shareViaGmail}
          shareViaCopy={shareViaCopy}
          handleDelete={handleDelete}
          setSelectedInvoice={setSelectedInvoice}
          setShowView={setShowView}
          onTallySent={(updated) => {
            setMultiInvoices(prev => prev.map(inv => inv._id === updated._id ? { ...inv, tallySync: updated.tallySync, tallySyncAt: updated.tallySyncAt } : inv));
          }}
        />
      )}

      {/* Create Invoice Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetCreateForm(); }}
        title="New Invoice"
        size="xl"
        footer={
          <>
            <button onClick={() => { setShowCreate(false); resetCreateForm(); }} style={btnOutline}>Cancel</button>
            <button onClick={handleCreateInvoice} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Party Details ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: RED, borderRadius: 2 }} /> Bill To
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                ['Party Name *', 'partyName', 'text', 'Customer / Company name'],
                ['GSTIN', 'partyGST', 'text', '29ABCDE1234F1Z5'],
                ['Phone', 'partyPhone', 'text', '+91 98765 43210'],
                ['Email', 'partyEmail', 'email', 'customer@email.com'],
                ['Invoice Date *', 'invoiceDate', 'date', ''],
                ['Due Date', 'dueDate', 'date', ''],
                ['PO Number', 'purchaseOrderRef', 'text', 'PO-2024-001'],
                ['PO Date', 'poDate', 'date', ''],
              ].map(([label, key, type, ph]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{label}</label>
                  <input type={type} placeholder={ph}
                    value={createForm[key]}
                    onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b' }}
                    onFocus={e => e.target.style.borderColor = RED}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              ))}
              <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Address</label>
                <textarea rows={2} placeholder="#13/14, Street, City, State - PIN"
                  value={createForm.partyAddress}
                  onChange={e => setCreateForm(f => ({ ...f, partyAddress: e.target.value }))}
                  style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = RED}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>
          </div>

          {/* ── Items Table ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 14, background: RED, borderRadius: 2 }} /> Items *
              </div>
              <button
                onClick={() => setCreateItems(p => [...p, { ...emptyItem }])}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7, border: `1.5px solid ${RED}`, background: '#fef2f2', color: RED, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + Add Row
              </button>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'Description *', 'HSN', 'Qty', 'Unit', 'Rate (₹)', 'Disc %', 'Tax %', 'Amount (₹)', ''].map((h, i) => (
                      <th key={i} style={{ padding: '8px 10px', textAlign: i >= 3 && i <= 8 ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {createItems.map((item, i) => {
                    const base    = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                    const disc    = base * ((parseFloat(item.discount) || 0) / 100);
                    const taxable = base - disc;
                    const tax     = taxable * ((parseFloat(item.taxRate) || 0) / 100);
                    const total   = taxable + tax;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', color: '#94a3b8', fontWeight: 700, fontSize: 11, textAlign: 'center', width: 28 }}>{i + 1}</td>
                        <td style={{ padding: '6px 8px', minWidth: 180 }}>
                          <input style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                            placeholder="Item description" value={item.description}
                            onChange={e => updateCreateItem(i, 'description', e.target.value)}
                            onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                        </td>
                        <td style={{ padding: '6px 8px', width: 90 }}>
                          <input style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                            placeholder="73211110" value={item.hsn}
                            onChange={e => updateCreateItem(i, 'hsn', e.target.value)}
                            onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                        </td>
                        <td style={{ padding: '6px 8px', width: 70 }}>
                          <input type="number" style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit', textAlign: 'right' }}
                            value={item.qty} onChange={e => updateCreateItem(i, 'qty', e.target.value)}
                            onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                        </td>
                        <td style={{ padding: '6px 8px', width: 80 }}>
                          <select style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                            value={item.unit} onChange={e => updateCreateItem(i, 'unit', e.target.value)}>
                            {['Nos', 'Pcs', 'Kg', 'Grams', 'Litre', 'ML', 'Metre', 'Set', 'Box', 'Carton', 'Dozen', 'EA'].map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px', width: 100 }}>
                          <input type="number" style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit', textAlign: 'right' }}
                            value={item.rate} onChange={e => updateCreateItem(i, 'rate', e.target.value)}
                            onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                        </td>
                        <td style={{ padding: '6px 8px', width: 70 }}>
                          <input type="number" style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit', textAlign: 'right' }}
                            value={item.discount} onChange={e => updateCreateItem(i, 'discount', e.target.value)}
                            onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                        </td>
                        <td style={{ padding: '6px 8px', width: 80 }}>
                          <select style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit', textAlign: 'right' }}
                            value={item.taxRate} onChange={e => updateCreateItem(i, 'taxRate', Number(e.target.value))}>
                            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px', width: 100, textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: 12 }}>
                          ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '6px 8px', width: 36, textAlign: 'center' }}>
                          <button onClick={() => setCreateItems(p => p.filter((_, idx) => idx !== i))}
                            disabled={createItems.length === 1}
                            style={{ background: 'none', border: 'none', cursor: createItems.length === 1 ? 'not-allowed' : 'pointer', color: createItems.length === 1 ? '#cbd5e1' : '#ef4444', fontSize: 16, lineHeight: 1, padding: 2 }}>
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={8} style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                      Subtotal: ₹{createItemSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} &nbsp;|&nbsp;
                      Tax: ₹{createItemTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: RED }}>
                      ₹{createGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Notes ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Notes</label>
              <textarea rows={2} placeholder="Any special instructions..."
                value={createForm.notes}
                onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Terms</label>
              <textarea rows={2}
                value={createForm.terms}
                onChange={e => setCreateForm(f => ({ ...f, terms: e.target.value }))}
                style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

        </div>
      </Modal>

      {/* View Invoice Modal */}
      {selectedInvoice && (
        <Modal
          open={showView}
          onClose={() => { setShowView(false); setSelectedInvoice(null); }}
          title={`Invoice ${selectedInvoice.invoiceNo}`}
          size="xl"
          footer={
            <>
              <button onClick={() => { setShowView(false); setSelectedInvoice(null); }} style={btnOutline}>Close</button>
              <button
                onClick={() => shareViaWhatsApp(selectedInvoice)}
                style={{ ...btnOutline, color: '#25D366', borderColor: '#bbf7d0', gap: 6 }}
              >
                <MdWhatsapp size={15} /> WhatsApp
              </button>
              <button
                onClick={() => shareViaGmail(selectedInvoice)}
                style={{ ...btnOutline, color: '#EA4335', borderColor: '#fecaca', gap: 6 }}
              >
                <MdEnvelope size={14} /> Gmail
              </button>
              <button onClick={() => handlePrint(selectedInvoice)} style={btnPrimary}>
                <MdPrint size={16} /> Print
              </button>
            </>
          }
        >
          <div dangerouslySetInnerHTML={{ __html: generateInvoiceHTML(selectedInvoice) }} />
        </Modal>
      )}

      {/* Upload Preview / Validation Modal */}
      {uploadPreviewData && (
        <Modal
          open={showUploadPreview}
          onClose={() => { setShowUploadPreview(false); setUploadPreviewData(null); }}
          title="Excel Upload Preview"
          size="xl"
          footer={
            <>
              <button
                onClick={() => { setShowUploadPreview(false); setUploadPreviewData(null); }}
                style={btnOutline}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading || !uploadPreviewData.valid.length}
                style={{ ...btnPrimary, opacity: (uploading || !uploadPreviewData.valid.length) ? 0.6 : 1 }}
              >
                {uploading ? 'Creating...' : `Create ${uploadPreviewData.valid.length} Invoice${uploadPreviewData.valid.length !== 1 ? 's' : ''}`}
              </button>
            </>
          }
        >
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {/* Total valid */}
            <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <MdCheckCircle size={20} color="#22c55e" />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{uploadPreviewData.valid.length}</div>
                <div style={{ fontSize: 11, color: '#15803d' }}>Total valid invoices to create</div>
              </div>
            </div>
            {/* Single-product split */}
            <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>🟢 Single Product</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
                {uploadPreviewData.valid.filter(inv => (inv.items?.length || 0) <= 1).length}
              </div>
              <div style={{ fontSize: 10, color: '#15803d', marginTop: 2 }}>→ Single Product Invoices section</div>
            </div>
            {/* Multi-product split */}
            <div style={{ flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>🔵 Multiple Products</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>
                {uploadPreviewData.valid.filter(inv => (inv.items?.length || 0) > 1).length}
              </div>
              <div style={{ fontSize: 10, color: '#1d4ed8', marginTop: 2 }}>→ Multiple Products Invoices section</div>
            </div>
            {/* Errors */}
            {uploadPreviewData.errors.length > 0 && (
              <div style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <MdError size={20} color="#ef4444" />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{uploadPreviewData.errors.length}</div>
                  <div style={{ fontSize: 11, color: '#b91c1c' }}>Rows with errors (skipped)</div>
                </div>
              </div>
            )}
          </div>

          {/* Errors list */}
          {uploadPreviewData.errors.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdWarning size={16} color="#f59e0b" /> Validation Errors
              </div>
              <div style={{ background: '#fef9f0', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', maxHeight: 160, overflowY: 'auto' }}>
                {uploadPreviewData.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#92400e', padding: '3px 0', borderBottom: i < uploadPreviewData.errors.length - 1 ? '1px solid #fde68a' : 'none' }}>
                    <span style={{ fontWeight: 700 }}>Row {err.row}</span> — {err.field}: {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid invoices preview table */}
          {uploadPreviewData.valid.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK, marginBottom: 8 }}>Invoices to be Created</div>
              <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto', border: '1px solid #e8edf2', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                    <tr>
                      {['#', 'Type', 'Unique ID', 'PO Number', 'PO Date', 'Ship To', 'City', 'State', 'Product(s)', 'Brand', 'Qty', 'Dispatch Date', 'AWB', 'Courier', 'Order Status'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e8edf2', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadPreviewData.valid.map((inv, i) => {
                      const item = inv.items?.[0] || {};
                      const isSingle = (inv.items?.length || 0) <= 1;
                      const totalQty = inv.items?.reduce((s, it) => s + (Number(it.qty) || 0), 0) ?? 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '7px 12px', color: TEXT_LIGHT, fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                            {isSingle
                              ? <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>Single</span>
                              : <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>Multi ({inv.items?.length})</span>
                            }
                          </td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: TEXT_MID, whiteSpace: 'nowrap' }}>{inv.uniqueId || '—'}</td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: BLUE, whiteSpace: 'nowrap' }}>{inv.purchaseOrderRef || '—'}</td>
                          <td style={{ padding: '7px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.poDate || '—'}</td>
                          <td style={{ padding: '7px 12px', fontWeight: 600, color: TEXT_DARK, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.partyName}>{inv.partyName}</td>
                          <td style={{ padding: '7px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.partyCity || '—'}</td>
                          <td style={{ padding: '7px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.partyState || '—'}</td>
                          <td style={{ padding: '7px 12px', color: TEXT_MID, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={inv.items?.map(it => it.description).join(', ')}>
                            {item.description || '—'}
                            {inv.items?.length > 1 && (
                              <span style={{ marginLeft: 4, fontSize: 10, background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, padding: '1px 5px', fontWeight: 700 }}>+{inv.items.length - 1}</span>
                            )}
                          </td>
                          <td style={{ padding: '7px 12px', color: TEXT_MID, whiteSpace: 'nowrap' }}>{inv.brandName || '—'}</td>
                          <td style={{ padding: '7px 12px', color: TEXT_DARK, fontWeight: 600, textAlign: 'center' }}>{totalQty || item.qty || '—'}</td>
                          <td style={{ padding: '7px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.dispatchDate || '—'}</td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: TEXT_MID, whiteSpace: 'nowrap' }}>{inv.awb || '—'}</td>
                          <td style={{ padding: '7px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.courierName || '—'}</td>
                          <td style={{ padding: '7px 12px', color: TEXT_MID, whiteSpace: 'nowrap', fontSize: 11 }}>{inv.orderStatus || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {uploadPreviewData.valid.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: TEXT_LIGHT }}>
              <MdError size={40} color="#fca5a5" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: RED }}>No valid invoices found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Please fix the errors above and re-upload.</div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
