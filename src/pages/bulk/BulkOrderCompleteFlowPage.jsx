import { useState, useEffect, useCallback } from 'react';
import { MdCheck, MdAccessTime, MdError, MdLocalShipping, MdDescription, MdCurrencyRupee, MdArrowForward } from 'react-icons/md';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { bulkOrderApi } from '../../api/bulkOrderApi';
import { bulkOrderApprovalApi } from '../../api/bulkOrderApprovalApi';
import { bulkOrderInventoryApi } from '../../api/bulkOrderInventoryApi';
import { bulkOrderInvoiceApi } from '../../api/bulkOrderInvoiceApi';
import { bulkOrderCreditApi } from '../../api/bulkOrderCreditApi';
import { corporateClientApi } from '../../api/corporateClientApi';

const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]';
const BTN_OUTLINE = 'inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]';
const BTN_SM = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg';

const STEPS = [
  { id: 0, label: 'Credit Check',    Icon: MdCurrencyRupee,  color: '#8b5cf6' },
  { id: 1, label: 'Approval',        Icon: MdCheck,       color: '#3b82f6' },
  { id: 2, label: 'Inventory Check', Icon: MdError, color: '#f59e0b' },
  { id: 3, label: 'Work Order',      Icon: MdAccessTime,       color: '#ec4899' },
  { id: 4, label: 'Dispatch',        Icon: MdLocalShipping,       color: '#10b981' },
  { id: 5, label: 'Invoice',         Icon: MdDescription,    color: '#1e40af' },
];

function formatMoney(v) {
  if (typeof v !== 'number') return 'Rs.0';
  return 'Rs.' + v.toLocaleString();
}

function StepDot(props) {
  const step = props.step;
  const current = props.current;
  const done = step < current;
  const active = step === current;
  const s = STEPS[step];
  const Icon = s.Icon;
  const bg = done ? '#10b981' : active ? s.color : '#e2e8f0';
  const fg = (done || active) ? '#fff' : '#94a3b8';
  const lc = active ? s.color : done ? '#10b981' : '#94a3b8';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg, fontWeight: 700 }}>
        {done ? <MdCheck size={16} /> : <Icon size={16} />}
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.3, color: lc }}>{s.label}</span>
    </div>
  );
}

function StepHeader(props) {
  const s = STEPS[props.index];
  const Icon = s.Icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.color, color: '#fff' }}>
        <Icon size={16} />
      </div>
      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>
        Step {props.index + 1}: {s.label}
      </div>
    </div>
  );
}

export default function BulkOrderCompleteFlowPage() {
  const [tab, setTab] = useState(0);
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [stepBusy, setStepBusy] = useState(false);
  const [credit, setCredit] = useState(null);
  const [inv, setInv] = useState(null);
  const [invoice, setInvoice] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [a, b, c] = await Promise.allSettled([
        corporateClientApi.getAll({ status: 'Active' }),
        bulkOrderApi.getQuotations(),
        bulkOrderApi.getClients(),
      ]);
      if (a.status === 'fulfilled') setClients(a.value.data || []);
      if (b.status === 'fulfilled') setQuotes(b.value.data || []);
      if (c.status === 'fulfilled') setOrders(c.value.data || []);
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startFlow(row) {
    setOrder(row);
    setStep(0);
    setCredit(null);
    setInv(null);
    setInvoice(null);
    setOpen(true);
  }

  async function doCreditCheck() {
    if (!order) return;
    setStepBusy(true);
    try {
      const r = await bulkOrderCreditApi.checkCreditLimit(order.clientId || order._id, order.grandTotal || 0);
      setCredit(r.data);
      await bulkOrderCreditApi.reserveCredit(order._id).catch(() => {});
      toast('Credit step done');
      setStep(1);
    } catch (e) { toast(e.message || 'Credit check failed', 'error'); }
    finally { setStepBusy(false); }
  }

  async function doApproval() {
    if (!order) return;
    setStepBusy(true);
    try {
      const r = await bulkOrderApprovalApi.createApprovalWorkflow({ orderId: order._id, clientId: order.clientId, orderValue: order.grandTotal });
      await bulkOrderApprovalApi.approveAtLevel(r.data && r.data._id, 'Auto-approved');
      toast('Approved');
      setStep(2);
    } catch (e) { toast(e.message || 'Approval failed', 'error'); }
    finally { setStepBusy(false); }
  }

  async function doInventory() {
    if (!order) return;
    setStepBusy(true);
    try {
      const r = await bulkOrderInventoryApi.checkInventory(order._id);
      setInv(r.data);
      toast('Inventory checked');
      setStep(3);
    } catch (e) { toast(e.message || 'Inventory check failed', 'error'); }
    finally { setStepBusy(false); }
  }

  async function doWorkOrder() {
    if (!order) return;
    setStepBusy(true);
    try {
      if (inv && inv.hasShortage) {
        await bulkOrderInventoryApi.createWorkOrderForShortage(order._id);
        toast('Work order created');
      } else {
        await bulkOrderInventoryApi.reserveInventory(order._id);
        toast('Inventory reserved');
      }
      setStep(4);
    } catch (e) { toast(e.message || 'Step failed', 'error'); }
    finally { setStepBusy(false); }
  }

  async function doDispatch() {
    if (!order) return;
    setStepBusy(true);
    try {
      await bulkOrderApi.convertToDispatch(order._id).catch(() => {});
      toast('Dispatched');
      setStep(5);
    } catch (e) { toast(e.message || 'Dispatch failed', 'error'); }
    finally { setStepBusy(false); }
  }

  async function doInvoice() {
    if (!order) return;
    setStepBusy(true);
    try {
      const r = await bulkOrderInvoiceApi.generateInvoiceFromBulkOrder(order._id);
      setInvoice(r.data);
      toast('Invoice generated');
      setStep(6);
      load();
    } catch (e) { toast(e.message || 'Invoice failed', 'error'); }
    finally { setStepBusy(false); }
  }

  const ACTIONS = [
    { label: 'Run Credit Check',  fn: doCreditCheck },
    { label: 'Process Approval',  fn: doApproval },
    { label: 'Check Inventory',   fn: doInventory },
    { label: 'Create Work Order', fn: doWorkOrder },
    { label: 'Dispatch Order',    fn: doDispatch },
    { label: 'Generate Invoice',  fn: doInvoice },
  ];

  const TABS = [
    { label: 'Corporate Clients', count: clients.length },
    { label: 'Quotations',        count: quotes.length },
    { label: 'Order Flow',        count: orders.length },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 4 }}>
        {TABS.map(function(t, i) {
          return (
            <button
              key={i}
              onClick={function() { setTab(i); }}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 9, border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                background: tab === i ? '#fff' : 'transparent',
                color: tab === i ? '#1e40af' : '#64748b',
                boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
              {t.count > 0 && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({t.count})</span>}
            </button>
          );
        })}
      </div>

      {/* Tab 0 — Clients */}
      {tab === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3.5">Corporate Clients</div>
          {busy ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No corporate clients found.</div>
          ) : (
            <DataTable
              columns={[
                { key: 'name',        label: 'Company',      render: function(v) { return <span className="font-semibold">{v}</span>; } },
                { key: 'contact',     label: 'Contact' },
                { key: 'city',        label: 'City' },
                { key: 'tier',        label: 'Tier',         render: function(v) { return <StatusBadge status={v} />; } },
                { key: 'creditLimit', label: 'Credit Limit', render: function(v) { return <span className="font-bold">{formatMoney(v)}</span>; } },
                { key: 'status',      label: 'Status',       render: function(v) { return <StatusBadge status={v} />; } },
              ]}
              data={clients}
            />
          )}
        </div>
      )}

      {/* Tab 1 — Quotations */}
      {tab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3.5">Bulk Quotations</div>
          {busy ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No quotations found.</div>
          ) : (
            <DataTable
              columns={[
                { key: 'quoteId',    label: 'Quote ID',   render: function(v) { return <span className="font-semibold text-red-700">{v}</span>; } },
                { key: 'clientName', label: 'Client',     render: function(v) { return <span className="font-semibold">{v}</span>; } },
                { key: 'grandTotal', label: 'Value',      render: function(v) { return <span className="font-bold text-red-700">{formatMoney(v)}</span>; } },
                { key: 'packaging',  label: 'Packaging' },
                { key: 'status',     label: 'Status',     render: function(v) { return <StatusBadge status={v} />; } },
                { key: '_id',        label: 'Actions',    render: function(_, row) {
                  return (
                    <button
                      onClick={function() { setTab(2); startFlow(row); }}
                      className={BTN_SM + ' bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit]'}
                    >
                      <MdArrowForward size={12} /> Start Flow
                    </button>
                  );
                }},
              ]}
              data={quotes}
            />
          )}
        </div>
      )}

      {/* Tab 2 — Order Flow */}
      {tab === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="text-sm font-bold text-gray-800">Complete Order Flow</div>
            <div className="text-xs text-gray-400">Select a quotation to run through the full flow</div>
          </div>
          {busy ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : (quotes.length === 0 && orders.length === 0) ? (
            <div className="text-center py-8 text-gray-400 text-sm">No orders or quotations found.</div>
          ) : (
            <DataTable
              columns={[
                { key: 'quoteId',    label: 'Quote / Order ID', render: function(v) { return <span className="font-semibold text-red-700">{v}</span>; } },
                { key: 'clientName', label: 'Client',           render: function(v) { return <span className="font-semibold">{v}</span>; } },
                { key: 'grandTotal', label: 'Value',            render: function(v) { return <span className="font-bold">{formatMoney(v)}</span>; } },
                { key: 'status',     label: 'Status',           render: function(v) { return <StatusBadge status={v} />; } },
                { key: '_id',        label: 'Actions',          render: function(_, row) {
                  return (
                    <button
                      onClick={function() { startFlow(row); }}
                      className={BTN_SM + ' bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit]'}
                    >
                      <MdArrowForward size={12} /> Run Flow
                    </button>
                  );
                }},
              ]}
              data={quotes.concat(orders)}
            />
          )}
        </div>
      )}

      {/* Flow Modal */}
      <Modal
        open={open}
        onClose={function() { setOpen(false); }}
        title={'Complete Order Flow' + (order ? ' — ' + (order.quoteId || order.clientName || '') : '')}
        size="lg"
        footer={
          step < 6 ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={BTN_OUTLINE} onClick={function() { setOpen(false); }}>Close</button>
              <button
                className={BTN_PRIMARY}
                onClick={ACTIONS[step] ? ACTIONS[step].fn : undefined}
                disabled={stepBusy}
              >
                {stepBusy ? 'Processing...' : (ACTIONS[step] ? ACTIONS[step].label : '')}
              </button>
            </div>
          ) : (
            <button className={BTN_PRIMARY} onClick={function() { setOpen(false); }}>
              <MdCheck size={14} /> Done
            </button>
          )
        }
      >
        {order && (
          <div>
            {/* Summary */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 13 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 2 }}>Client</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{order.clientName || '—'}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 2 }}>Order Value</span>
                  <span style={{ fontWeight: 700, color: '#1e40af' }}>{formatMoney(order.grandTotal)}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 2 }}>Status</span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>

            {/* Step progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
              {STEPS.map(function(s, i) {
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <StepDot step={i} current={step} />
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 28, height: 2, margin: '0 2px', flexShrink: 0, background: i < step ? '#10b981' : '#e2e8f0' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current step card */}
            {step < 6 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <StepHeader index={step} />

                {step === 0 && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Verify the client has sufficient credit limit for this order value of {formatMoney(order.grandTotal)}.
                  </p>
                )}
                {step === 0 && credit && (
                  <div style={{ marginTop: 8, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, background: credit.creditCheckPassed ? '#f0fdf4' : '#fffbeb', color: credit.creditCheckPassed ? '#16a34a' : '#d97706' }}>
                    {credit.creditCheckPassed ? 'Credit check passed' : 'Credit limit may be exceeded — proceeding to approval'}
                  </div>
                )}
                {step === 1 && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Create and auto-approve the approval workflow for this bulk order.
                  </p>
                )}
                {step === 2 && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Check if sufficient inventory is available to fulfill this order.
                  </p>
                )}
                {step === 2 && inv && (
                  <div style={{ marginTop: 8, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, background: !inv.hasShortage ? '#f0fdf4' : '#fffbeb', color: !inv.hasShortage ? '#16a34a' : '#d97706' }}>
                    {!inv.hasShortage ? 'Sufficient inventory available' : 'Shortage detected — work order will be created'}
                  </div>
                )}
                {step === 3 && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    {inv && inv.hasShortage ? 'Create a work order to produce the shortage items.' : 'Reserve the available inventory for this order.'}
                  </p>
                )}
                {step === 4 && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Mark the order as dispatched and create a dispatch record.
                  </p>
                )}
                {step === 5 && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                    Generate the final invoice for this bulk order.
                  </p>
                )}
              </div>
            )}

            {/* Completed */}
            {step === 6 && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <MdCheck size={32} color="#16a34a" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Order Flow Complete!</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  All steps completed successfully for {order.clientName}.
                </div>
                {invoice && (
                  <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                    Invoice generated: {invoice.invoiceNo || invoice._id}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
