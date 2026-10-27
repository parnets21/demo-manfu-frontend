import FinancePage from './FinancePage';
const TAB_MAP = {
  dashboard: 0,
  'accounts-payable': 1,
  'accounts-receivable': 2,
  'supplier-payments': 3,
  'dealer-receipts': 4,
  'supplier-ledger': 5,
  'dealer-ledger': 6,
  'tally-ledger': 7,
  'outstanding-invoices': 8,
  'bank-cash-accounts': 9,
  'payment-history': 10,
  'financial-reports': 11,
  'vendor-credit-notes': 12,
  'vendor-debit-notes': 13,
};
export default function FinanceSubPage({ tab }) {
  const t = TAB_MAP[tab] ?? 0; return <FinancePage key={t} initialTab={t} />;
}
