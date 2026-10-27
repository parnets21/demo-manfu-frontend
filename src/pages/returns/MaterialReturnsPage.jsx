import { useEffect, useMemo, useState } from "react";
import {
  MdInventory2 as Package,
  MdLocalShipping as Truck,
  MdSearch as Search,
  MdCurrencyRupee as DollarSign,
  MdCheckBox as CheckSquare,
  MdWarning as AlertTriangle,
  MdCheckCircle as CheckCircle,
  MdCancel as XCircle,
  MdDownload as Download,
  MdRefresh as RefreshCw,
  MdAdd as Plus,
  MdVisibility as Eye,
  MdEdit as Pencil,
  MdMoreHoriz as MoreHorizontal,
  MdClose as X,
  MdPrint as Printer,
  MdLocationOn as MapPin,
  MdAttachFile as Paperclip,
  MdAssignment as ClipboardList,
  MdChevronLeft as ChevronLeft,
  MdChevronRight as ChevronRight,
  MdArrowForward as ArrowRight,
  MdDescription as FileText,
  MdLayers as Layers,
  MdBarChart as BarChart2,
  MdTrendingUp as TrendingUp,
  MdShowChart as Activity,
} from "react-icons/md";
import { materialReturnApi } from "../../api/materialReturnApi";
import { invoiceApi } from "../../api/invoiceApi";

const STAGE_FLOW = [
  "REQUEST_RAISED",
  "APPROVED",
  "DOCKET_CREATED",
  "VEHICLE_ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "ARRIVED_AT_WAREHOUSE",
  "RECEIVED",
  "QC_PENDING",
  "QC_PASSED",
  "QC_FAILED",
  "FINANCE_PENDING",
  "CLOSED"
];

const STAGE_NAMES = {
  REQUEST_RAISED: "Request Raised",
  APPROVED: "Approved",
  DOCKET_CREATED: "Docket Created",
  VEHICLE_ASSIGNED: "Vehicle Assigned",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  ARRIVED_AT_WAREHOUSE: "Arrived At Warehouse",
  RECEIVED: "Received",
  QC_PENDING: "QC Pending",
  QC_PASSED: "QC Passed",
  QC_FAILED: "QC Failed",
  FINANCE_PENDING: "Finance Pending",
  CLOSED: "Closed"
};

const STAGE_COLORS = {
  REQUEST_RAISED: { bg: "#f3f4f6", text: "#6b7280" },
  APPROVED: { bg: "#d1fae5", text: "#065f46" },
  DOCKET_CREATED: { bg: "#dbeafe", text: "#1d4ed8" },
  VEHICLE_ASSIGNED: { bg: "#fef3c7", text: "#92400e" },
  PICKED_UP: { bg: "#fef3c7", text: "#92400e" },
  IN_TRANSIT: { bg: "#dbeafe", text: "#1d4ed8" },
  ARRIVED_AT_WAREHOUSE: { bg: "#d1fae5", text: "#065f46" },
  RECEIVED: { bg: "#d1fae5", text: "#065f46" },
  QC_PENDING: { bg: "#fef3c7", text: "#92400e" },
  QC_PASSED: { bg: "#d1fae5", text: "#065f46" },
  QC_FAILED: { bg: "#fee2e2", text: "#991b1b" },
  FINANCE_PENDING: { bg: "#fef3c7", text: "#92400e" },
  CLOSED: { bg: "#f3f4f6", text: "#374151" }
};

// ── INIT_RETURNS removed — page loads live data via materialReturnApi.getAll() ──



const ACTIVITY_LOGS = [
  { initials: "PS", color: "#ef4444", name: "Priya Sharma", detail: "Return created", date: "12 May 2026 10:30 AM" },
  { initials: "RM", color: "#3b82f6", name: "Ramesh Mehta", detail: "Approved by Manager", date: "12 May 2026 11:00 AM" },
  { initials: "TS", color: "#8b5cf6", name: "Transport Team", detail: "Transport Assigned", date: "12 May 2026 02:15 PM" },
  { initials: "BL", color: "#f59e0b", name: "Blue Dart", detail: "Shipment in Transit", date: "12 May 2026 05:45 PM" },
];

const ATTACHMENTS = [
  { name: "Invoice Copy.pdf", size: "1.2 MB" },
  { name: "Damage Images.zip", size: "4.5 MB" },
  { name: "LR Copy.pdf", size: "1.1 MB" },
  { name: "Other Documents.pdf", size: "0.8 MB" },
];

// ── Badges ──────────────────────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color, backgroundColor: bg, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}
function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] || { bg: "#f3f4f6", text: "#374151" };
  return <Badge label={STAGE_NAMES[stage] || stage} color={c.text} bg={c.bg} />;
}
function QCBadge({ s }) {
  const m = { Pending: ["#92400e", "#fef3c7"], In_Progress: ["#1d4ed8", "#dbeafe"], Completed: ["#065f46", "#d1fae5"], Failed: ["#991b1b", "#fee2e2"] };
  const [c, bg] = m[s] || ["#374151", "#f3f4f6"];
  return <Badge label={s?.replace(/_/g, " ")} color={c} bg={bg} />;
}
function FinBadge({ s }) {
  const m = { Pending: ["#9a3412", "#fee2e2"], Partial: ["#6d28d9", "#ede9fe"], Reconciled: ["#065f46", "#d1fae5"], Written_Off: ["#374151", "#f3f4f6"] };
  const [c, bg] = m[s] || ["#374151", "#f3f4f6"];
  return <Badge label={s} color={c} bg={bg} />;
}
function PriBadge({ s }) {
  const m = { High: ["#991b1b", "#fee2e2"], Medium: ["#92400e", "#fef3c7"], Low: ["#166534", "#dcfce7"] };
  const [c, bg] = m[s] || ["#374151", "#f3f4f6"];
  return <Badge label={s} color={c} bg={bg} />;
}
function RecBadge({ s }) {
  const m = { "In Progress": ["#1d4ed8", "#dbeafe"], Completed: ["#065f46", "#d1fae5"], Pending: ["#9a3412", "#fee2e2"] };
  const [c, bg] = m[s] || ["#374151", "#f3f4f6"];
  return <Badge label={s} color={c} bg={bg} />;
}

const mapStage = (stage = "") => ({
  Return_Request_Create: "Initiated",
  Manager_Approval: "Approved",
  Docket_Create: "Transport_Pickup",
  Transport_Tracking: "In_Transit",
  Warehouse_Receive: "Received_At_Warehouse",
  QC_Verification: "QC_In_Progress",
  Finance_Reconciliation: "QC_Completed",
  Tally_Sync: "Closed",
}[stage] || stage || "Initiated");

const formatDisplayDate = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return value || "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const normalizeMaterialReturn = (r) => {
  const value = Number(r.value || r.refundAmount || r.invoiceAmount || 0);
  const recoveredAmt = Number(r.recoveredAmt || r.creditNoteAmount || (r.reconciliationStatus === "Completed" ? value : 0));
  const debitNote = Number(r.debitNote || r.debitNoteAmount || (r.debitNoteId ? value : 0));
  const creditNote = Number(r.creditNote || r.creditNoteAmount || (r.creditNoteId ? recoveredAmt : 0));
  return {
    ...r,
    mrId: r.mrId || r.id || r._id,
    docketId: r.docketId || r.awbNo || "-",
    invoiceNo: r.invoiceNo || "",
    supplierName: r.supplierName || r.customerName || "Unknown Party",
    productName: r.productName || r.items?.[0]?.productName || "Return Material",
    returnQty: Number(r.returnQty || r.expectedQty || r.items?.[0]?.returnQty || 0),
    stage: mapStage(r.stage || r.currentWorkflowStage),
    qcStatus: r.qcStatus === "In Progress" ? "In_Progress" : r.qcStatus || "Pending",
    finStatus: r.finStatus || (r.reconciliationStatus === "Completed" ? "Reconciled" : r.ledgerStatus === "Updated" ? "Partial" : "Pending"),
    priority: r.priority || "Medium",
    value,
    returnReason: r.returnReason || r.reason || "Material return",
    pickupAddress: r.pickupAddress || r.address || "-",
    awbNo: r.awbNo || r.lrNumber || "-",
    vehicle: r.vehicle || r.vehicleNumber || "-",
    transport: r.transport || r.courierPartner || "-",
    driverName: r.driverName || "-",
    driverMobile: r.driverMobile || "-",
    currentLocation: r.currentLocation || r.lastScanLocation || "-",
    expectedDelivery: formatDisplayDate(r.expectedDelivery || r.estimatedDelivery),
    eta: formatDisplayDate(r.expectedDelivery || r.estimatedDelivery),
    createdOn: formatDisplayDate(r.createdAt || r.returnDate),
    createdBy: r.createdBy || r.requestedBy || "System",
    invoiceValue: Number(r.invoiceValue || r.invoiceAmount || value),
    returnValue: value,
    recoverableAmt: Number(r.recoverableAmt || value),
    recoveredAmt,
    debitNote,
    creditNote,
    pendingAmt: Math.max(0, Number(r.recoverableAmt || value) - recoveredAmt),
    financialClosure: r.finStatus === "Reconciled" || r.reconciliationStatus === "Completed" ? "Yes" : "No",
    recoveryStatus: r.finStatus === "Reconciled" || r.reconciliationStatus === "Completed" ? "Completed" : recoveredAmt > 0 ? "In Progress" : "Pending",
    returnType: r.returnType || r.reason || "Material Return",
  };
};

// ── Lifecycle Stepper ────────────────────────────────────────────────────────
function LifecycleStepper({ stage }) {
  const idx = STAGE_FLOW.indexOf(stage);
  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: 800 }}>
        {STAGE_FLOW.map((s, i) => {
          const done = i < idx, active = i === idx;
          return (
            <div key={s} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "#10b981" : active ? "#3b82f6" : "#e5e7eb",
                  color: (done || active) ? "#fff" : "#9ca3af", fontSize: 10, fontWeight: 800,
                  boxShadow: active ? "0 0 0 3px #bfdbfe" : "none", flexShrink: 0
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 8, textAlign: "center", marginTop: 4, color: done ? "#059669" : active ? "#1d4ed8" : "#9ca3af", fontWeight: active ? 700 : 500, lineHeight: 1.3, maxWidth: 56 }}>
                  {STAGE_NAMES[s]}
                </div>
              </div>
              {i < STAGE_FLOW.length - 1 && (
                <div style={{ height: 2, flex: 1, marginTop: 11, background: i < idx ? "#10b981" : "#e5e7eb" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#111" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ── Reconciliation Modal ──────────────────────────────────────────────────────
function ReconciliationModal({ r, onClose }) {
  return (
    <Modal title={`Financial Reconciliation — ${r.mrId}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Invoice Value", val: `₹ ${r.invoiceValue?.toLocaleString("en-IN")}` },
          { label: "Return Value", val: `₹ ${r.returnValue?.toLocaleString("en-IN")}` },
          { label: "Recoverable Amount", val: `₹ ${r.recoverableAmt?.toLocaleString("en-IN")}` },
          { label: "Recovered Amount", val: `₹ ${r.recoveredAmt?.toLocaleString("en-IN")}` },
          { label: "Debit Note", val: `₹ ${r.debitNote?.toLocaleString("en-IN")}` },
          { label: "Credit Note", val: `₹ ${r.creditNote?.toLocaleString("en-IN")}` },
          { label: "Pending Amount", val: `₹ ${r.pendingAmt?.toLocaleString("en-IN")}`, red: r.pendingAmt > 0 },
          { label: "Financial Closure", val: r.financialClosure },
        ].map((f, i) => (
          <div key={i} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: f.red ? "#dc2626" : "#111" }}>{f.val}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#eff6ff", borderRadius: 8, padding: 12, border: "1px solid #bfdbfe" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e40af", marginBottom: 8 }}>Recovery Status</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RecBadge s={r.recoveryStatus} />
          <span style={{ fontSize: 12, color: "#374151" }}>Last updated: {r.createdOn}</span>
        </div>
      </div>
    </Modal>
  );
}

// ── QC Report Modal ───────────────────────────────────────────────────────────
function QCReportModal({ r, onClose }) {
  return (
    <Modal title={`QC Report — ${r.mrId}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "QC Status", val: <QCBadge s={r.qcStatus} />, isComp: true },
          { label: "Product", val: r.productName },
          { label: "Return Qty", val: r.returnQty },
          { label: "Accepted Qty", val: r.qcStatus === "Completed" ? r.returnQty : "—" },
          { label: "Rejected Qty", val: r.qcStatus === "Completed" ? 0 : "—" },
          { label: "Damage %", val: r.qcStatus === "Completed" ? "0%" : "—" },
          { label: "QC By", val: r.qcStatus === "Completed" ? "QC Team" : "—" },
          { label: "QC Date", val: r.qcStatus === "Completed" ? r.createdOn : "—" },
          { label: "Remarks", val: r.returnReason },
        ].map((f, i) => (
          <div key={i} style={{ background: "#fffbeb", borderRadius: 8, padding: "10px 14px", border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
            {f.isComp ? f.val : <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{f.val}</div>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Track Shipment Modal ──────────────────────────────────────────────────────
function TrackModal({ r, onClose }) {
  const steps = [
    { label: "Pickup Scheduled", loc: r.pickupAddress, done: true },
    { label: "Picked Up", loc: `Vehicle: ${r.vehicle}`, done: ["Transport_Pickup", "In_Transit", "Out_For_Delivery", "Delivered", "Warehouse_Queue", "Received_At_Warehouse", "QC_In_Progress", "QC_Completed", "Closed"].includes(r.stage) },
    { label: "In Transit", loc: `Current: ${r.currentLocation}`, done: ["In_Transit", "Out_For_Delivery", "Delivered", "Warehouse_Queue", "Received_At_Warehouse", "QC_In_Progress", "QC_Completed", "Closed"].includes(r.stage) },
    { label: "Out for Delivery", loc: `ETA: ${r.eta}`, done: ["Out_For_Delivery", "Delivered", "Warehouse_Queue", "Received_At_Warehouse", "QC_In_Progress", "QC_Completed", "Closed"].includes(r.stage) },
    { label: "Delivered to Warehouse", loc: "Destination Warehouse", done: ["Delivered", "Warehouse_Queue", "Received_At_Warehouse", "QC_In_Progress", "QC_Completed", "Closed"].includes(r.stage) },
  ];
  return (
    <Modal title={`Track Shipment — ${r.awbNo}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[["Transport Partner", r.transport], ["AWB Number", r.awbNo], ["Vehicle No", r.vehicle], ["Driver", r.driverName], ["Driver Mobile", r.driverMobile], ["Expected Delivery", r.expectedDelivery]].map(([k, v]) => (
          <div key={k} style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{v || "—"}</div>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#059669" }}>Tracking Timeline</div>
      <div style={{ position: "relative" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: s.done ? "#10b981" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {s.done ? "✓" : "○"}
              </div>
              {i < steps.length - 1 && <div style={{ width: 2, height: 24, background: s.done ? "#10b981" : "#e5e7eb" }} />}
            </div>
            <div style={{ paddingTop: 2 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.done ? "#059669" : "#9ca3af" }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{s.loc}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Attachments Modal ─────────────────────────────────────────────────────────
function AttachmentsModal({ onClose }) {
  const allDocs = [...ATTACHMENTS, { name: "Inspection Report.pdf", size: "2.1 MB" }, { name: "Supplier Confirmation.pdf", size: "0.9 MB" }];
  return (
    <Modal title="All Attachments" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {allDocs.map((a, i) => (
          <div key={i} style={{ background: "#fff7ed", borderRadius: 10, padding: "12px 14px", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FileText size={20} color="#ea580c" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{a.name}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{a.size}</div>
              </div>
            </div>
            <button onClick={() => alert(`Downloading: ${a.name}`)} style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={12} /> Download
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Print Full Details ────────────────────────────────────────────────────────
function handlePrintDetail(r) {
  const win = window.open("", "_blank");
  const stageIdx = STAGE_FLOW.indexOf(r.stage);
  const stageSteps = STAGE_FLOW.map((s, i) => {
    const done = i < stageIdx, active = i === stageIdx;
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;">
      <div style="width:22px;height:22px;border-radius:50%;background:${done ? "#10b981" : active ? "#3b82f6" : "#e5e7eb"};color:${(done || active) ? "#fff" : "#9ca3af"};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">${done ? "✓" : i + 1}</div>
      <div style="font-size:8px;text-align:center;margin-top:4px;color:${done ? "#059669" : active ? "#1d4ed8" : "#9ca3af"};font-weight:${active ? 700 : 500};max-width:56px;line-height:1.3;">${STAGE_NAMES[s]}</div>
    </div>${i < STAGE_FLOW.length - 1 ? `<div style="height:2px;flex:1;margin-top:10px;background:${i < stageIdx ? "#10b981" : "#e5e7eb"};"></div>` : ""}`;
  }).join("");

  win.document.write(`<!DOCTYPE html><html><head><title>Material Return — ${r.mrId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 28px; font-size: 13px; }
    h1 { font-size: 20px; font-weight: 800; color: #dc2626; }
    h2 { font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #1e293b; border-left: 3px solid #dc2626; padding-left: 8px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 12px; }
    .header-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
    .section { margin-bottom: 20px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
    .label { font-size: 10px; color: #6b7280; margin-bottom: 3px; }
    .value { font-size: 13px; font-weight: 600; color: #111; }
    .value-red { font-size: 13px; font-weight: 700; color: #dc2626; }
    .stepper { display: flex; align-items: flex-start; margin-bottom: 6px; overflow: hidden; }
    .fin-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
    .activity-row { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
    .avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9px; font-weight: 800; flex-shrink: 0; }
    .print-footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
    .green-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px; }
    .yellow-card { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px; }
    .blue-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 12px; }
    @media print { body { padding: 16px; } }
  </style></head><body>
  <div class="header">
    <div>
      <h1>Material Return — ${r.mrId}</h1>
      <div class="header-sub">Docket: ${r.docketId} &nbsp;|&nbsp; Invoice: ${r.invoiceNo} &nbsp;|&nbsp; Created: ${r.createdOn} by ${r.createdBy}</div>
    </div>
    <div style="text-align:right;">
      <div><span class="badge" style="background:#fee2e2;color:#991b1b;">${r.priority} Priority</span></div>
      <div style="margin-top:6px;"><span class="badge" style="background:${STAGE_COLORS[r.stage]?.bg || "#f3f4f6"};color:${STAGE_COLORS[r.stage]?.text || "#374151"};">${STAGE_NAMES[r.stage]}</span></div>
      <div style="font-size:10px;color:#6b7280;margin-top:4px;">Printed: ${new Date().toLocaleString("en-IN")}</div>
    </div>
  </div>

  <div class="section">
    <h2>Return Information</h2>
    <div class="grid4">
      <div class="card"><div class="label">Supplier</div><div class="value">${r.supplierName}</div></div>
      <div class="card"><div class="label">Product</div><div class="value">${r.productName}</div></div>
      <div class="card"><div class="label">Return Qty</div><div class="value">${r.returnQty} units</div></div>
      <div class="card"><div class="label">Return Value</div><div class="value">₹ ${r.returnValue?.toLocaleString("en-IN")}</div></div>
      <div class="card" style="grid-column:1/3"><div class="label">Return Reason</div><div class="value">${r.returnReason}</div></div>
      <div class="card" style="grid-column:3/5"><div class="label">Pickup Address</div><div class="value">${r.pickupAddress}</div></div>
      <div class="card"><div class="label">QC Status</div><div class="value">${r.qcStatus?.replace(/_/g, " ")}</div></div>
      <div class="card"><div class="label">Financial Status</div><div class="value">${r.finStatus}</div></div>
      <div class="card"><div class="label">Recovery Status</div><div class="value">${r.recoveryStatus}</div></div>
      <div class="card"><div class="label">Return Type</div><div class="value">${r.returnType}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Return Lifecycle</h2>
    <div class="stepper">${stageSteps}</div>
  </div>

  <div class="section">
    <h2>Transport Details</h2>
    <div class="grid4">
      <div class="green-card"><div class="label">Transport Partner</div><div class="value">${r.transport || "—"}</div></div>
      <div class="green-card"><div class="label">AWB Number</div><div class="value">${r.awbNo || "—"}</div></div>
      <div class="green-card"><div class="label">Vehicle No</div><div class="value">${r.vehicle || "—"}</div></div>
      <div class="green-card"><div class="label">Driver Name</div><div class="value">${r.driverName || "—"}</div></div>
      <div class="green-card"><div class="label">Driver Mobile</div><div class="value">${r.driverMobile || "—"}</div></div>
      <div class="green-card"><div class="label">Current Location</div><div class="value">${r.currentLocation || "—"}</div></div>
      <div class="green-card"><div class="label">Expected Delivery</div><div class="value">${r.expectedDelivery || "—"}</div></div>
      <div class="green-card"><div class="label">ETA</div><div class="value">${r.eta || "—"}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>QC Details</h2>
    <div class="grid4">
      <div class="yellow-card"><div class="label">QC Status</div><div class="value">${r.qcStatus?.replace(/_/g, " ") || "—"}</div></div>
      <div class="yellow-card"><div class="label">QC By</div><div class="value">${r.qcStatus === "Completed" ? "QC Team" : "—"}</div></div>
      <div class="yellow-card"><div class="label">QC Date</div><div class="value">${r.qcStatus === "Completed" ? r.createdOn : "—"}</div></div>
      <div class="yellow-card"><div class="label">Accepted Qty</div><div class="value">${r.qcStatus === "Completed" ? r.returnQty : "—"}</div></div>
      <div class="yellow-card"><div class="label">Rejected Qty</div><div class="value">${r.qcStatus === "Completed" ? "0" : "—"}</div></div>
      <div class="yellow-card"><div class="label">Damage %</div><div class="value">${r.qcStatus === "Completed" ? "0%" : "—"}</div></div>
      <div class="yellow-card" style="grid-column:3/5"><div class="label">QC Remarks</div><div class="value">${r.returnReason}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Financial Details</h2>
    <div class="grid2">
      <div class="blue-card">
        ${[["Invoice Value", `₹ ${r.invoiceValue?.toLocaleString("en-IN")}`], ["Return Value", `₹ ${r.returnValue?.toLocaleString("en-IN")}`], ["Recoverable Amount", `₹ ${r.recoverableAmt?.toLocaleString("en-IN")}`], ["Recovered Amount", `₹ ${r.recoveredAmt?.toLocaleString("en-IN")}`], ["Debit Note", `₹ ${r.debitNote?.toLocaleString("en-IN")}`], ["Credit Note", `₹ ${r.creditNote?.toLocaleString("en-IN")}`]].map(([k, v]) => `<div class="fin-row"><span style="color:#6b7280">${k}</span><span style="font-weight:700">${v}</span></div>`).join("")}
      </div>
      <div class="blue-card">
        ${[["Pending Amount", `₹ ${r.pendingAmt?.toLocaleString("en-IN")}`, r.pendingAmt > 0], ["Financial Closure", r.financialClosure, false], ["Recovery Status", r.recoveryStatus, false]].map(([k, v, red]) => `<div class="fin-row"><span style="color:#6b7280">${k}</span><span style="font-weight:700;color:${red ? "#dc2626" : "#111"}">${v}</span></div>`).join("")}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Activity Log</h2>
    ${ACTIVITY_LOGS.map(a => `<div class="activity-row">
      <div class="avatar" style="background:${a.color}">${a.initials}</div>
      <div><div style="font-size:12px;font-weight:600;">${a.name}</div><div style="font-size:11px;color:#6b7280;">${a.detail}</div><div style="font-size:10px;color:#9ca3af;">${a.date}</div></div>
    </div>`).join("")}
  </div>

  <div class="section">
    <h2>Attachments</h2>
    <div class="grid4">
      ${ATTACHMENTS.map(a => `<div class="card" style="display:flex;align-items:center;gap:8px;">
        <div style="font-size:12px;font-weight:600;">${a.name}</div>
        <div style="font-size:10px;color:#9ca3af;">${a.size}</div>
      </div>`).join("")}
    </div>
  </div>

  <div class="print-footer">
    <span>Material Return Management System</span>
    <span>Document: ${r.mrId} | Printed on ${new Date().toLocaleString("en-IN")}</span>
  </div>
  <script>window.onload = function(){ window.print(); }</script>
  </body></html>`);
  win.document.close();
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ r, onClose, onMoveNext }) {
  const [activeModal, setActiveModal] = useState(null);
  const nextIdx = STAGE_FLOW.indexOf(r.stage) + 1;
  const nextStage = STAGE_FLOW[nextIdx];

  const handleExportDetail = () => {
    const lines = [`Material Return: ${r.mrId}`, `Docket: ${r.docketId}`, `Invoice: ${r.invoiceNo}`, `Supplier: ${r.supplierName}`, `Product: ${r.productName}`, `Return Qty: ${r.returnQty}`, `Stage: ${STAGE_NAMES[r.stage]}`, `QC Status: ${r.qcStatus}`, `Financial Status: ${r.finStatus}`, `Value: ₹${r.value?.toLocaleString("en-IN")}`, `Priority: ${r.priority}`, `Return Reason: ${r.returnReason}`, `Pickup Address: ${r.pickupAddress}`, `Transport: ${r.transport}`, `AWB No: ${r.awbNo}`, `Vehicle: ${r.vehicle}`, `Driver: ${r.driverName} (${r.driverMobile})`, `Current Location: ${r.currentLocation}`, `ETA: ${r.eta}`, `Created On: ${r.createdOn}`, `Created By: ${r.createdBy}`];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${r.mrId}.txt`; a.click();
  };

  return (
    <>
      {activeModal === "reconciliation" && <ReconciliationModal r={r} onClose={() => setActiveModal(null)} />}
      {activeModal === "qc" && <QCReportModal r={r} onClose={() => setActiveModal(null)} />}
      {activeModal === "track" && <TrackModal r={r} onClose={() => setActiveModal(null)} />}
      {activeModal === "attachments" && <AttachmentsModal onClose={() => setActiveModal(null)} />}

      <div style={{ display: "flex", flexDirection: "column", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", height: "100%", overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#fafafa" }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#dc2626" }}>Return Details — {r.mrId}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleExportDetail} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#374151", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={12} /> Export
            </button>
            <button onClick={() => handlePrintDetail(r)} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#374151", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Printer size={12} /> Print
            </button>
            <button onClick={onClose} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 7, padding: "4px 8px", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          {/* Meta row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
            {[
              { label: "MR ID", val: r.mrId },
              { label: "Docket ID", val: r.docketId },
              { label: "Priority", val: <PriBadge s={r.priority} />, comp: true },
              { label: "Stage", val: <StageBadge stage={r.stage} />, comp: true },
              { label: "Fin. Status", val: <FinBadge s={r.finStatus} />, comp: true },
              { label: "Recovery", val: <RecBadge s={r.recoveryStatus} />, comp: true },
            ].map((f, i) => (
              <div key={i}>
                <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 3 }}>{f.label}</div>
                {f.comp ? f.val : <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "#111" }}>{f.val}</div>}
              </div>
            ))}
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 10 }}>
            {[
              ["Supplier", r.supplierName], ["Product", r.productName], ["Return Qty", r.returnQty],
              ["Return Value", `₹ ${r.returnValue?.toLocaleString("en-IN")}`], ["Created On", r.createdOn], ["Created By", r.createdBy],
            ].map(([label, val], i) => (
              <div key={i}>
                <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Lifecycle */}
          <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "#111" }}>Return Lifecycle</div>
            <LifecycleStepper stage={r.stage} />
          </div>

          {/* Transport + QC */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ padding: "10px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#065f46", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Truck size={13} /> Transport Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                {[["Transport", r.transport], ["AWB No", r.awbNo], ["Vehicle No", r.vehicle], ["Driver", r.driverName], ["Mobile", r.driverMobile], ["Location", r.currentLocation], ["Exp. Delivery", r.expectedDelivery], ["ETA", r.eta]].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 9, color: "#6b7280" }}>{k}</div><div style={{ fontSize: 10, fontWeight: 600, color: "#111" }}>{v || "—"}</div></div>
                ))}
              </div>
              <button onClick={() => setActiveModal("track")} style={{ width: "100%", padding: "6px", background: "#059669", color: "#fff", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <MapPin size={12} /> Track Shipment
              </button>
            </div>
            <div style={{ padding: "10px 12px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#92400e", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle size={13} /> QC Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <div><div style={{ fontSize: 9, color: "#6b7280" }}>QC Status</div><QCBadge s={r.qcStatus} /></div>
                {[["QC By", r.qcStatus === "Completed" ? "QC Team" : "—"], ["QC Date", r.qcStatus === "Completed" ? r.createdOn : "—"], ["Accepted Qty", r.qcStatus === "Completed" ? r.returnQty : "—"], ["Rejected Qty", r.qcStatus === "Completed" ? "0" : "—"], ["Damage %", r.qcStatus === "Completed" ? "0%" : "—"]].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 9, color: "#6b7280" }}>{k}</div><div style={{ fontSize: 10, fontWeight: 600, color: "#111" }}>{v}</div></div>
                ))}
              </div>
              <button onClick={() => setActiveModal("qc")} style={{ width: "100%", padding: "6px", background: "#d97706", color: "#fff", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <ClipboardList size={12} /> View QC Report
              </button>
            </div>
          </div>

          {/* Financial + Attachments + Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ padding: "10px 12px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#1e40af", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <DollarSign size={13} /> Financial
              </div>
              {[["Invoice Value", `₹ ${r.invoiceValue?.toLocaleString("en-IN")}`], ["Return Value", `₹ ${r.returnValue?.toLocaleString("en-IN")}`], ["Recoverable", `₹ ${r.recoverableAmt?.toLocaleString("en-IN")}`], ["Recovered", `₹ ${r.recoveredAmt?.toLocaleString("en-IN")}`], ["Debit Note", `₹ ${r.debitNote?.toLocaleString("en-IN")}`], ["Credit Note", `₹ ${r.creditNote?.toLocaleString("en-IN")}`], ["Pending", `₹ ${r.pendingAmt?.toLocaleString("en-IN")}`], ["Closure", r.financialClosure]].map(([k, v], i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, paddingBottom: 4, borderBottom: i < 7 ? "1px solid #dbeafe" : "none" }}>
                  <span style={{ fontSize: 9, color: "#6b7280" }}>{k}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: k === "Pending" && r.pendingAmt > 0 ? "#dc2626" : "#111" }}>{v}</span>
                </div>
              ))}
              <button onClick={() => setActiveModal("reconciliation")} style={{ width: "100%", marginTop: 6, padding: "5px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                View Reconciliation
              </button>
            </div>

            <div style={{ padding: "10px 12px", background: "#fff7ed", borderRadius: 10, border: "1px solid #fed7aa" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#c2410c", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Paperclip size={13} /> Attachments
              </div>
              {ATTACHMENTS.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, paddingBottom: 6, borderBottom: i < 3 ? "1px solid #fde68a" : "none" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#111", display: "flex", alignItems: "center", gap: 4 }}><FileText size={11} color="#ea580c" />{a.name}</div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>{a.size}</div>
                  </div>
                  <button onClick={() => alert(`Downloading: ${a.name}`)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ea580c", display: "flex" }}><Download size={14} /></button>
                </div>
              ))}
              <button onClick={() => setActiveModal("attachments")} style={{ width: "100%", marginTop: 2, padding: "5px", background: "#ea580c", color: "#fff", border: "none", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                View All Attachments
              </button>
            </div>

            <div style={{ padding: "10px 12px", background: "#f5f3ff", borderRadius: 10, border: "1px solid #ddd6fe" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#6d28d9", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Activity size={13} /> Activity Logs
              </div>
              {ACTIVITY_LOGS.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 7, marginBottom: 8, paddingBottom: 8, borderBottom: i < 3 ? "1px solid #ddd6fe" : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: a.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8, fontWeight: 800, flexShrink: 0 }}>{a.initials}</div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#111" }}>{a.name}</div>
                    <div style={{ fontSize: 9, color: "#6b7280" }}>{a.detail}</div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>{a.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
          <button onClick={onMoveNext} disabled={!nextStage} style={{
            width: "100%", padding: "10px", fontSize: 13, fontWeight: 800, border: "none", borderRadius: 9, cursor: nextStage ? "pointer" : "not-allowed",
            background: nextStage ? "#dc2626" : "#e5e7eb", color: nextStage ? "#fff" : "#9ca3af",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>
            {nextStage ? <><ArrowRight size={15} /> Move to Next Stage → {STAGE_NAMES[nextStage]}</> : <><CheckCircle size={15} /> Return Completed</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Create Return Modal ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  supplierName: "", invoiceNo: "", productName: "", returnQty: 1, value: "",
  priority: "Medium", returnReason: "", pickupAddress: "", awbNo: "", vehicle: "",
  transport: "", driverName: "", driverMobile: "", returnType: "Material Return",
  stage: "Initiated", qcStatus: "Pending", finStatus: "Pending"
};

function CreateReturnModal({ onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [fetching, setFetching] = useState(false);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    invoiceApi.getAll({ limit: 100 }).then(res => {
      setInvoices(res.data || []);
    }).catch(err => console.error("Failed to load invoices", err));
  }, []);

  const upd = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const handleInvoiceChange = async (invoiceNo) => {
    if (!invoiceNo) {
      setForm(EMPTY_FORM);
      return;
    }

    upd("invoiceNo", invoiceNo);
    setFetching(true);
    try {
      const res = await materialReturnApi.getInvoiceContext(invoiceNo);
      if (res.success && res.data) {
        setForm(prev => ({
          ...prev,
          ...res.data,
          invoiceNo, // Ensure invoiceNo stays the same
          customerName: res.data.customerName || res.data.partyName || "",
          supplierName: res.data.supplierName || res.data.partyName || "",
          value: res.data.value || res.data.grandTotal || ""
        }));
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setFetching(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.customerName?.trim() && !form.supplierName?.trim()) e.customerName = "Required";
    if (!form.invoiceNo?.trim()) e.invoiceNo = "Required";
    if (!form.productName?.trim()) e.productName = "Required";
    if (!form.pickupAddress?.trim()) e.pickupAddress = "Required";
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onCreate(form);
  };

  const inp = (style = {}) => ({ style: { width: "100%", padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, boxSizing: "border-box", ...style } });
  const errStyle = { fontSize: 10, color: "#dc2626", marginTop: 2 };

  return (
    <Modal
      title="Create New Material Return"
      onClose={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", border: "1px solid #d1d5db", background: "#fff", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={submit} style={{ padding: "8px 22px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Plus size={13} /> Create Return
          </button>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Invoice No *</label>
          <select
            value={form.invoiceNo}
            onChange={e => handleInvoiceChange(e.target.value)}
            {...inp(errors.invoiceNo ? { borderColor: "#dc2626" } : {})}
            disabled={fetching}
          >
            <option value="">— Select Invoice —</option>
            {invoices.map(inv => (
              <option key={inv._id} value={inv.invoiceNo}>
                {inv.invoiceNo} — {inv.partyName}
              </option>
            ))}
          </select>
          {errors.invoiceNo && <div style={errStyle}>{errors.invoiceNo}</div>}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Supplier Name *</label>
          <input value={form.customerName || form.supplierName} onChange={e => upd("customerName", e.target.value)} placeholder="Customer/Supplier" {...inp(errors.customerName ? { borderColor: "#dc2626" } : {})} />
          {errors.customerName && <div style={errStyle}>{errors.customerName}</div>}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Product Name *</label>
          <input value={form.productName} onChange={e => upd("productName", e.target.value)} placeholder="Enter product name" {...inp(errors.productName ? { borderColor: "#dc2626" } : {})} />
          {errors.productName && <div style={errStyle}>{errors.productName}</div>}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Return Qty</label>
          <input type="number" min="1" value={form.returnQty} onChange={e => upd("returnQty", e.target.value)} {...inp()} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Stage</label>
          <select value={form.stage} onChange={e => upd("stage", e.target.value)} style={{ width: "100%", padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff" }}>
            {STAGE_FLOW.map(s => <option key={s} value={s}>{STAGE_NAMES[s]}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>QC Status</label>
          <select value={form.qcStatus} onChange={e => upd("qcStatus", e.target.value)} style={{ width: "100%", padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff" }}>
            {["Pending", "In_Progress", "Completed", "Failed"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Financial Status</label>
          <select value={form.finStatus} onChange={e => upd("finStatus", e.target.value)} style={{ width: "100%", padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff" }}>
            {["Pending", "Partial", "Reconciled", "Written_Off"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Priority</label>
          <select value={form.priority} onChange={e => upd("priority", e.target.value)} style={{ width: "100%", padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff" }}>
            {["Low", "Medium", "High"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Value (₹)</label>
          <input type="number" min="0" value={form.value} onChange={e => upd("value", e.target.value)} placeholder="0" {...inp()} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Return Type</label>
          <select value={form.returnType} onChange={e => upd("returnType", e.target.value)} style={{ width: "100%", padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff" }}>
            {["Material Return", "Damaged", "Wrong Item", "Excess Qty", "Quality Issue"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Return Reason</label>
          <textarea value={form.returnReason} onChange={e => upd("returnReason", e.target.value)} rows={2} placeholder="Describe the reason for return..." style={{ width: "100%", padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, resize: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Pickup Address *</label>
          <textarea value={form.pickupAddress} onChange={e => upd("pickupAddress", e.target.value)} rows={2} placeholder="Full pickup address..." style={{ width: "100%", padding: "7px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, resize: "none", boxSizing: "border-box", ...(errors.pickupAddress ? { borderColor: "#dc2626" } : {}) }} />
          {errors.pickupAddress && <div style={errStyle}>{errors.pickupAddress}</div>}
        </div>
      </div>
    </Modal>
  );
}

// ── Analytics Charts ──────────────────────────────────────────────────────────
function TrendChart() {
  const pts = [12, 18, 14, 22, 19, 28];
  const labels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const max = 32, w = 260, h = 110, px = 28, py = 18;
  const cx = (i) => px + i * ((w - px * 2) / 5);
  const cy = (v) => h - py - (v / max) * (h - py * 2);
  const path = pts.map((v, i) => (i === 0 ? "M" : "L") + cx(i) + "," + cy(v)).join(" ");
  return (
    <svg width={w} height={h + 20} style={{ overflow: "visible" }}>
      {[0, 10, 20, 30].map(v => <line key={v} x1={px} y1={cy(v)} x2={w - px} y2={cy(v)} stroke="#f3f4f6" strokeWidth={1} />)}
      {labels.map((l, i) => <text key={l} x={cx(i)} y={h + 12} fontSize={9} fill="#9ca3af" textAnchor="middle">{l}</text>)}
      <path d={path} fill="none" stroke="#ef4444" strokeWidth={2} />
      <path d={path + ` L${cx(5)},${h - py} L${cx(0)},${h - py} Z`} fill="#ef4444" opacity={0.1} />
      {pts.map((v, i) => <circle key={i} cx={cx(i)} cy={cy(v)} r={3} fill="#ef4444" />)}
    </svg>
  );
}

function DonutChart() {
  const data = [["In Transit", 25, "#3b82f6"], ["Pending QC", 17, "#f59e0b"], ["Received", 21, "#10b981"], ["Closed", 29, "#8b5cf6"], ["Others", 8, "#6b7280"]];
  let angle = -90;
  const r = 44, cx = 60, cy = 60;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={120} height={120}>
        {data.map(([, pct, color], i) => {
          const sweep = (pct / 100) * 360, a1 = angle * Math.PI / 180, a2 = (angle + sweep) * Math.PI / 180;
          const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1), x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
          const p = `M${cx},${cy} L${x1},${y1} A${r},${r},0,${sweep > 180 ? 1 : 0},1,${x2},${y2} Z`;
          angle += sweep;
          return <path key={i} d={p} fill={color} opacity={0.85} />;
        })}
        <circle cx={cx} cy={cy} r={28} fill="#fff" />
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize={15} fontWeight={800} fill="#111">24</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={8} fill="#6b7280">Total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {data.map(([label, pct, color], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ color: "#374151" }}>{label}</span>
            <span style={{ color: "#9ca3af" }}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Top-returns-by-supplier chart — driven by live returns data passed as props
function HBarChart({ returns = [] }) {
  // Aggregate return counts per supplier from live data
  const supplierCounts = {};
  returns.forEach(r => {
    if (r.supplierName) supplierCounts[r.supplierName] = (supplierCounts[r.supplierName] || 0) + 1;
  });
  const COLORS = ['#ef4444','#f97316','#3b82f6','#10b981','#8b5cf6','#f59e0b','#06b6d4','#ec4899'];
  const data = Object.entries(supplierCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, v], i) => [name, v, COLORS[i % COLORS.length]]);
  const max = data[0]?.[1] || 1;

  if (data.length === 0) {
    return <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>No return data yet</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {data.map(([name, v, color], i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 10, color: "#374151", width: 100, textAlign: "right", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 13 }}>
            <div style={{ width: `${(v / max) * 100}%`, background: color, height: "100%", borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", width: 14 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// Loss vs Recovered chart — driven by live stats passed as props
function LossChart({ lossValue = 0, recoveredValue = 0 }) {
  const h = 110, pad = 20;
  const maxVal = Math.max(lossValue, recoveredValue, 1);
  const lH = Math.max(4, (lossValue / maxVal) * (h - pad));
  const rH = Math.max(4, (recoveredValue / maxVal) * (h - pad));
  const fmtK = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`;
  return (
    <svg width={160} height={h+28}>
      <rect x={32} y={h-pad-lH} width={40} height={lH} fill="#ef4444" rx={3}/>
      {lossValue > 0 && <text x={52} y={h-pad-lH-5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#ef4444">{fmtK(lossValue)}</text>}
      <rect x={88} y={h-pad-rH} width={40} height={rH} fill="#10b981" rx={3}/>
      {recoveredValue > 0 && <text x={108} y={h-pad-rH-5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#10b981">{fmtK(recoveredValue)}</text>}
      <text x={52} y={h+16} textAnchor="middle" fontSize={8} fill="#6b7280">Loss</text>
      <text x={108} y={h+16} textAnchor="middle" fontSize={8} fill="#6b7280">Recovered</text>
    </svg>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, pageSize, totalEntries, onPageChange, onPageSizeChange }) {
  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const from = totalEntries === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalEntries);

  return (
    <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
        {totalEntries === 0 ? "No entries" : `Showing ${from}–${to} of ${totalEntries} entries`}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Prev */}
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 7, background: page === 1 ? "#f9fafb" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#d1d5db" : "#374151" }}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} style={{ width: 30, textAlign: "center", fontSize: 12, color: "#9ca3af", userSelect: "none" }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                width: 30, height: 30, border: p === page ? "2px solid #dc2626" : "1px solid #e5e7eb",
                borderRadius: 7, background: p === page ? "#dc2626" : "#fff",
                color: p === page ? "#fff" : "#374151", fontSize: 12,
                fontWeight: p === page ? 800 : 400, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || totalPages === 0}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 7, background: page === totalPages || totalPages === 0 ? "#f9fafb" : "#fff", cursor: page === totalPages || totalPages === 0 ? "not-allowed" : "pointer", color: page === totalPages || totalPages === 0 ? "#d1d5db" : "#374151" }}
        >
          <ChevronRight size={14} />
        </button>

        {/* Page size selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 8 }}>
          <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>Rows:</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 11, background: "#fff", cursor: "pointer", height: 30 }}
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MaterialReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ supplier: "", stage: "", qcStatus: "", finStatus: "", returnType: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [stats, setStats] = useState({ total: 0, inTransit: 0, pendingQC: 0, pendingFinance: 0, closed: 0, returnValue: 0, lossValue: 0 });

  const loadReturns = async () => {
    setLoading(true);
    try {
      const response = await materialReturnApi.getAll({ search, stage: filters.stage });
      const data = (response.data || []).map(normalizeMaterialReturn);
      setReturns(data);

      const statsRes = await materialReturnApi.getStats();
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load returns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReturns(); }, [search, filters.stage]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => returns.filter(r => {
    if (search) {
      const t = search.toLowerCase();
      if (![r.mrId, r.supplierName, r.productName, r.invoiceNo, r.docketId].some(v => v?.toLowerCase().includes(t))) return false;
    }
    if (filters.supplier && r.supplierName !== filters.supplier) return false;
    if (filters.stage && r.stage !== filters.stage) return false;
    if (filters.qcStatus && r.qcStatus !== filters.qcStatus) return false;
    if (filters.finStatus && r.finStatus !== filters.finStatus) return false;
    if (filters.returnType && r.returnType !== filters.returnType) return false;
    return true;
  }), [returns, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const setFilter = (k, v) => { setFilters(p => ({ ...p, [k]: v })); setPage(1); };
  const setSearchReset = (v) => { setSearch(v); setPage(1); };

  const handleProcessQC = async (qcData) => {
    try {
      const res = await materialReturnApi.processQC(selected._id || selected.id, qcData);
      if (res.success) {
        showToast("QC Processed Successfully");
        loadReturns();
        setSelected(normalizeMaterialReturn(res.data));
      }
    } catch (err) {
      showToast(err.message || "Failed to process QC", "error");
    }
  };

  const handleProcessReconciliation = async (reconData) => {
    try {
      const res = await materialReturnApi.processReconciliation(selected._id || selected.id, reconData);
      if (res.success) {
        showToast("Reconciliation Processed Successfully");
        loadReturns();
        setSelected(normalizeMaterialReturn(res.data));
      }
    } catch (err) {
      showToast(err.message || "Failed to process reconciliation", "error");
    }
  };

  const handleUpdateTransport = async (transportData) => {
    try {
      const res = await materialReturnApi.updateTransport(selected._id || selected.id, transportData);
      if (res.success) {
        showToast("Transport Details Updated");
        loadReturns();
        setSelected(normalizeMaterialReturn(res.data));
      }
    } catch (err) {
      showToast(err.message || "Failed to update transport", "error");
    }
  };

  const kpis = {
    total: stats.total,
    inTransit: stats.inTransit,
    pendingQC: stats.pendingQC,
    finPending: stats.pendingFinance,
    closed: stats.closed,
    returnValue: stats.returnValue,
    lossValue: stats.lossValue
  };

  const kpiCards = [
    { label: "Total Returns", val: kpis.total, sub: "All time", color: "#dc2626", bg: "#fee2e2", Icon: Package },
    { label: "In Transit", val: kpis.inTransit, sub: "Currently moving", color: "#1d4ed8", bg: "#dbeafe", Icon: Truck },
    { label: "Pending QC", val: kpis.pendingQC, sub: "Awaiting check", color: "#7c3aed", bg: "#ede9fe", Icon: Search },
    { label: "Financial Pending", val: kpis.finPending, sub: "Awaiting closure", color: "#92400e", bg: "#fef3c7", Icon: DollarSign },
    { label: "Recovered Amount", val: "₹1,45,230", sub: "This month", color: "#065f46", bg: "#d1fae5", Icon: CheckCircle },
    { label: "Loss Amount", val: "₹24,500", sub: "This month", color: "#991b1b", bg: "#fee2e2", Icon: AlertTriangle },
    { label: "Closed Returns", val: kpis.closed, sub: "Completed", color: "#059669", bg: "#d1fae5", Icon: CheckSquare },
    { label: "Critical Returns", val: kpis.critical, sub: "High priority open", color: "#c2410c", bg: "#ffedd5", Icon: XCircle },
  ];

  const handleMoveNext = () => {
    if (!selected) return;
    const ci = STAGE_FLOW.indexOf(selected.stage);
    if (ci < STAGE_FLOW.length - 1) {
      const ns = STAGE_FLOW[ci + 1];
      setReturns(p => p.map(r => r.mrId === selected.mrId ? { ...r, stage: ns } : r));
      setSelected(p => ({ ...p, stage: ns }));
      showToast(`✓ Moved to ${STAGE_NAMES[ns]}`);
    }
  };

  const handleCreate = async (form) => {
    const val = parseInt(form.value) || 0;
    const nr = {
      ...form,
      mrId: `MR-2026-${String(returns.length + 25).padStart(4, "0")}`,
      docketId: `DKT-${Math.floor(Math.random() * 900000) + 100000}`,
      returnQty: parseInt(form.returnQty) || 1,
      value: val, invoiceValue: val, returnValue: val,
      recoverableAmt: val, recoveredAmt: 0, debitNote: 0, creditNote: 0, pendingAmt: val,
      financialClosure: "No", recoveryStatus: "Pending",
      awbNo: "—", vehicle: "—", transport: "—", driverName: "—", driverMobile: "—",
      currentLocation: "—", expectedDelivery: "—", eta: "—",
      createdOn: "16 May 2026", createdBy: "Current User",
    };
    try {
      const response = await materialReturnApi.create(nr);
      setReturns(p => [normalizeMaterialReturn(response.data || nr), ...p]);
    } catch {
      setReturns(p => [normalizeMaterialReturn(nr), ...p]);
    }
    setShowCreate(false);
    setPage(1);
    showToast("✓ Material Return created successfully!");
  };

  const handleExportAll = () => {
    const headers = "MR ID,Docket ID,Invoice No,Supplier,Product,Qty,Stage,QC Status,Fin Status,Priority,Value";
    const rows = filtered.map(r => [r.mrId, r.docketId, r.invoiceNo, r.supplierName, r.productName, r.returnQty, r.stage, r.qcStatus, r.finStatus, r.priority, r.value].join(","));
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "material_returns.csv"; a.click();
    showToast("✓ CSV exported successfully!");
  };

  const handleRefresh = () => {
    setSearch(""); setFilters({ supplier: "", stage: "", qcStatus: "", finStatus: "", returnType: "" }); setPage(1); loadReturns();
    showToast("✓ Filters cleared & refreshed!");
  };

  const uniqueSuppliers = [...new Set(returns.map(r => r.supplierName))];

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 18, right: 18, zIndex: 9999, padding: "10px 18px", background: toast.type === "success" ? "#059669" : "#dc2626", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 20, color: "#111", margin: 0 }}>Material Returns</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 12 }}>Create and manage material return requests across your supply chain</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExportAll} style={{ padding: "7px 14px", border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "#374151", fontWeight: 600 }}>
            <Download size={13} /> Export
          </button>
          <button onClick={handleRefresh} style={{ padding: "7px 14px", border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "#374151", fontWeight: 600 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} style={{ padding: "7px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(220,38,38,0.3)" }}>
            <Plus size={14} /> Create Return
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "10px 14px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {[
          { label: "Supplier", key: "supplier", opts: uniqueSuppliers },
          { label: "Stage", key: "stage", opts: STAGE_FLOW, names: STAGE_NAMES },
          { label: "QC Status", key: "qcStatus", opts: ["Pending", "In_Progress", "Completed", "Failed"] },
          { label: "Financial Status", key: "finStatus", opts: ["Pending", "Partial", "Reconciled", "Written_Off"] },
          { label: "Return Type", key: "returnType", opts: ["Material Return", "Damaged", "Wrong Item", "Excess Qty", "Quality Issue"] },
        ].map(f => (
          <select key={f.key} value={filters[f.key]} onChange={e => setFilter(f.key, e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, background: "#fff", color: filters[f.key] ? "#111" : "#6b7280" }}>
            <option value="">All {f.label}s</option>
            {f.opts.map(o => <option key={o} value={o}>{f.names ? f.names[o] : o.replace(/_/g, " ")}</option>)}
          </select>
        ))}
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input value={search} onChange={e => setSearchReset(e.target.value)} placeholder="Search MR ID, Invoice, Product, Supplier..."
            style={{ width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, boxSizing: "border-box" }} />
        </div>
        {(search || Object.values(filters).some(v => v)) && (
          <button onClick={handleRefresh} style={{ padding: "6px 12px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 10, marginBottom: 16 }}>
        {kpiCards.map((k, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px solid #f3f4f6" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <k.Icon size={16} color={k.color} />
            </div>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{k.label}</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Table + Detail Panel */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 16 }}>

        {/* Table Card */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>
              Material Returns <span style={{ color: "#dc2626" }}>({filtered.length})</span>
            </span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              Page {page} of {totalPages}
            </span>
          </div>

          <div style={{ overflowX: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["MR ID", "Docket ID", "Invoice No", "Supplier", "Product", "Qty", "Stage", "QC Status", "Fin. Status", "Priority", "Value", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: 10, borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={12} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>{loading ? "Loading material returns..." : "No material returns found"}</td></tr>
                ) : paginated.map((r) => (
                  <tr key={r.mrId}
                    onClick={() => setSelected(p => p?.mrId === r.mrId ? null : r)}
                    style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: selected?.mrId === r.mrId ? "#fef2f2" : "transparent" }}
                    onMouseEnter={e => { if (selected?.mrId !== r.mrId) e.currentTarget.style.background = "#f9fafb"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = selected?.mrId === r.mrId ? "#fef2f2" : "transparent"; }}>
                    <td style={{ padding: "8px 10px", fontWeight: 800, color: "#dc2626", whiteSpace: "nowrap", fontSize: 11 }}>{r.mrId}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}>{r.docketId}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}>{r.invoiceNo}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontSize: 11 }}>{r.supplierName}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontSize: 11 }}>{r.productName}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center", fontSize: 11 }}>{r.returnQty}</td>
                    <td style={{ padding: "8px 10px" }}><StageBadge stage={r.stage} /></td>
                    <td style={{ padding: "8px 10px" }}><QCBadge s={r.qcStatus} /></td>
                    <td style={{ padding: "8px 10px" }}><FinBadge s={r.finStatus} /></td>
                    <td style={{ padding: "8px 10px" }}><PriBadge s={r.priority} /></td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, whiteSpace: "nowrap", fontSize: 11 }}>₹{r.value?.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button onClick={e => { e.stopPropagation(); setSelected(r); }} title="View" style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", display: "flex", padding: 3 }}><Eye size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); showToast("Edit coming soon!"); }} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", padding: 3 }}><Pencil size={13} /></button>
                        <button onClick={e => { e.stopPropagation(); showToast("More options coming soon!"); }} title="More" style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", padding: 3 }}><MoreHorizontal size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Component */}
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalEntries={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          />
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ minHeight: 400 }}>
            <DetailPanel r={selected} onClose={() => setSelected(null)} onMoveNext={handleMoveNext} />
          </div>
        )}
      </div>

      {/* Analytics */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>
            <BarChart2 size={15} color="#dc2626" /> Returns Analytics
          </span>
          <select style={{ padding: "5px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}>
            <option>This Month</option><option>Last Month</option><option>Last 6 Months</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}><TrendingUp size={12} color="#ef4444" /> Returns Trend</div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 8 }}>Last 6 months</div>
            <TrendChart />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}><Layers size={12} color="#3b82f6" /> Returns by Stage</div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 8 }}>This month</div>
            <DonutChart />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:12, color:"#111", marginBottom:2, display:"flex", alignItems:"center", gap:5 }}><BarChart2 size={12} color="#10b981"/> Top Returns by Supplier</div>
            <div style={{ fontSize:10, color:"#9ca3af", marginBottom:12 }}>This month</div>
            <HBarChart returns={returns} />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:12, color:"#111", marginBottom:2, display:"flex", alignItems:"center", gap:5 }}><DollarSign size={12} color="#8b5cf6"/> Loss vs Recovered</div>
            <div style={{ fontSize:10, color:"#9ca3af", marginBottom:8 }}>This month</div>
            <LossChart lossValue={stats.lossValue || 0} recoveredValue={stats.returnValue || 0} />
          </div>
        </div>
      </div>

      {showCreate && <CreateReturnModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
