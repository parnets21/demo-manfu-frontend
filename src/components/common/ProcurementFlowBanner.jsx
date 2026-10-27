/**
 * ProcurementFlowBanner — shows the 8-step procurement pipeline
 * with the current step highlighted.
 *
 * Usage:
 *   <ProcurementFlowBanner currentStep="pr" />
 *
 * Valid step keys: vendor | pr | rfq | po | grn | qc | approval
 */

const STEPS = [
  { key: 'vendor',   label: 'Vendor',    icon: '🏢', short: 'Vendor Onboarding' },
  { key: 'pr',       label: 'PR',        icon: '📋', short: 'Purchase Requisition' },
  { key: 'rfq',      label: 'RFQ',       icon: '📩', short: 'Request for Quotation' },
  { key: 'po',       label: 'PO',        icon: '🧾', short: 'Purchase Order' },
  { key: 'grn',      label: 'GRN',       icon: '📦', short: 'Goods Receipt' },
  { key: 'qc',       label: 'QC',        icon: '🔍', short: 'Quality Check' },
  { key: 'approval', label: 'Approval',  icon: '✅', short: 'Final Approval' },
];

export default function ProcurementFlowBanner({ currentStep }) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
      border: '1px solid #fecaca',
      borderRadius: 12,
      padding: '12px 16px',
      marginBottom: 16,
      overflowX: 'auto',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
        Procurement Flow
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 'max-content' }}>
        {STEPS.map((step, idx) => {
          const isCurrent = step.key === currentStep;
          const isDone    = idx < currentIdx;
          const isFuture  = idx > currentIdx;

          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Step node */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '6px 10px', borderRadius: 10,
                background: isCurrent ? '#1e40af' : isDone ? '#dcfce7' : 'transparent',
                border: isCurrent ? '2px solid #991b1b' : isDone ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                minWidth: 64,
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{step.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: isCurrent ? '#fff' : isDone ? '#16a34a' : '#94a3b8',
                  whiteSpace: 'nowrap',
                }}>{step.label}</span>
                {isCurrent && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, color: '#fecaca',
                    whiteSpace: 'nowrap', marginTop: -2,
                  }}>← You are here</span>
                )}
              </div>

              {/* Connector arrow */}
              {idx < STEPS.length - 1 && (
                <div style={{
                  width: 28, height: 2,
                  background: isDone ? '#86efac' : '#e2e8f0',
                  position: 'relative', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
                    width: 0, height: 0,
                    borderTop: '4px solid transparent',
                    borderBottom: '4px solid transparent',
                    borderLeft: `6px solid ${isDone ? '#86efac' : '#e2e8f0'}`,
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation rules hint */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { rule: 'PR must be Approved before creating RFQ', active: currentStep === 'rfq' || currentStep === 'pr' },
          { rule: 'PO must be Approved before creating GRN', active: currentStep === 'grn' || currentStep === 'po' },
          { rule: 'GRN required before Quality Check', active: currentStep === 'qc' },
          { rule: 'QC must pass before Approval', active: currentStep === 'approval' },
        ].filter(r => r.active).map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#1e40af', fontWeight: 600 }}>
            <span style={{ fontSize: 12 }}>⚠</span> {r.rule}
          </div>
        ))}
      </div>
    </div>
  );
}
