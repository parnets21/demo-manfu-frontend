import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../auth/ProtectedRoute';
import ErrorBoundary from '../components/common/ErrorBoundary';

import LoginPage     from '../pages/login/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import OEMPage       from '../pages/oem/OEMPage';
import OrdersPage    from '../pages/orders/OrdersPage';
import DealerOrdersPage from '../pages/orders/DealerOrdersPage';
import SettingsPage  from '../pages/settings/SettingsPage';
import RolePermissionsPage from '../pages/settings/RolePermissionsPage';

// Item Master
import ItemMasterPage from '../pages/master/ItemMasterPage';

// Procurement
import VendorsPage             from '../pages/procurement/VendorsPage';
import ClientsPage             from '../pages/procurement/ClientsPage';
import DealersPage             from '../pages/procurement/DealersPage';
import RFQPage                 from '../pages/procurement/RFQPage';
import PurchaseRequisitionPage from '../pages/procurement/PurchaseRequisitionPage';
import ApprovalsPage           from '../pages/procurement/ApprovalsPage';
import PurchaseOrdersPage      from '../pages/procurement/PurchaseOrdersPage';
import GRNPage                 from '../pages/procurement/GRNPage';
import QualityCheckPage        from '../pages/procurement/QualityCheckPage';
import ExcessPOMonitorPage     from '../pages/procurement/ExcessPOMonitorPage';
import GRNReceiptsInvoicePage  from '../pages/procurement/GRNReceiptsInvoicePage';

// Vendor Portal (Public - No Auth Required)
import VendorQuotationPage from '../pages/vendor/VendorQuotationPage';

// Inventory
import InventorySubPage from '../pages/inventory/InventorySubPage';
import StockEntryInvoicesPage from '../pages/inventory/StockEntryInvoicesPage';

// Production
import ProductionSubPage from '../pages/production/ProductionSubPage';

// Bulk Orders
import BulkSubPage from '../pages/bulk/BulkSubPage';
import ClientsESMEPage from '../pages/bulk/ClientsESMEPage';
import BulkOrderFlowPage from '../pages/bulk/BulkOrderFlowPage';
import BulkOrderCompleteFlowPage from '../pages/bulk/BulkOrderCompleteFlowPage';
import BulkQuotationRequestPage from '../pages/bulk/BulkQuotationRequestPage';
import VendorQuotationsPage from '../pages/bulk/VendorQuotationsPage';

// Logistics
import LogisticsSubPage from '../pages/logistics/LogisticsSubPage';
import RealTimeTrackingPage from '../pages/logistics/RealTimeTrackingPage';

// Returns
import ReturnsSubPage from '../pages/returns/ReturnsSubPage';
import ReturnRequestDetailPage from '../pages/returns/ReturnRequestDetailPage';
import CreditNotePage from '../pages/returns/CreditNotePage';
import DebitNotePage from '../pages/returns/DebitNotePage';

// Finance
import FinanceSubPage from '../pages/finance/FinanceSubPage';
import CreditNoteTrackingPage from '../pages/finance/CreditNoteTrackingPage';
import InvoiceGeneratorPage from '../pages/finance/InvoiceGeneratorPage';
import LedgerDetailPage from '../pages/finance/LedgerDetailPage';

// PO Generator
import POUploadPage         from '../pages/pogenerator/POUploadPage';
import POCompanyPage        from '../pages/pogenerator/POCompanyPage';

// Tally Integration
import TallySubPage from '../pages/tally/TallySubPage';
import TallyDataPage from '../pages/tally/TallyDataPage';
import SalesRegisterPage from '../pages/tally/SalesRegisterPage';

// Forecasting
import ForecastingSubPage from '../pages/forecasting/ForecastingSubPage';

// Reports
import ReportsSubPage from '../pages/reports/ReportsSubPage';

// Assets
import AssetsSubPage from '../pages/assets/AssetsSubPage';

// Barcode
import BarcodeSubPage from '../pages/barcode/BarcodeSubPage';

// Vinculum
import VinculumSubPage from '../pages/vinculum/VinculumSubPage';

// Tasks
import TasksSubPage from '../pages/tasks/TasksSubPage';

// Employee Management
import ProductMasterPage       from '../pages/employee/ProductMasterPage';
import RegisteredEmployeesPage from '../pages/employee/RegisteredEmployeesPage';

function P({ element }) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"     element={<LoginPage />} />
      
      {/* Public Vendor Portal - No Auth Required */}
      <Route path="/vendor/quotation/:rfqId" element={<VendorQuotationPage />} />
      
      <Route path="/"          element={<P element={<DashboardPage />} />} />
      <Route path="/dashboard" element={<P element={<DashboardPage />} />} />

      {/* Masters */}
      <Route path="/masters"       element={<Navigate to="/masters/items" replace />} />
      <Route path="/masters/items" element={<P element={<ItemMasterPage />} />} />

      {/* Procurement */}
      <Route path="/procurement"              element={<Navigate to="/procurement/vendors" replace />} />
      <Route path="/procurement/vendors"      element={<P element={<VendorsPage />} />} />
      <Route path="/procurement/clients"      element={<P element={<ClientsPage />} />} />
      <Route path="/procurement/dealers"      element={<P element={<DealersPage />} />} />
      <Route path="/procurement/rfq"          element={<P element={<RFQPage />} />} />
      <Route path="/procurement/pr"           element={<P element={<PurchaseRequisitionPage />} />} />
      <Route path="/procurement/approvals"    element={<P element={<ApprovalsPage />} />} />
      <Route path="/procurement/po"           element={<P element={<PurchaseOrdersPage />} />} />
      <Route path="/procurement/grn"          element={<P element={<GRNPage />} />} />
      <Route path="/procurement/qc"           element={<P element={<QualityCheckPage />} />} />
      <Route path="/procurement/grn-invoices" element={<P element={<GRNReceiptsInvoicePage />} />} />
      <Route path="/procurement/excess"       element={<P element={<ExcessPOMonitorPage />} />} />

      {/* Inventory */}
      <Route path="/inventory"             element={<Navigate to="/inventory/dashboard" replace />} />
      <Route path="/inventory/dashboard"   element={<P element={<ErrorBoundary><InventorySubPage tab="dashboard" /></ErrorBoundary>} />} />
      <Route path="/inventory/stock"       element={<P element={<ErrorBoundary><InventorySubPage tab="stock" /></ErrorBoundary>} />} />
      <Route path="/inventory/warehouses"  element={<P element={<ErrorBoundary><InventorySubPage tab="warehouses" /></ErrorBoundary>} />} />
      <Route path="/inventory/movement"    element={<P element={<ErrorBoundary><InventorySubPage tab="movement" /></ErrorBoundary>} />} />
      <Route path="/inventory/picking"     element={<P element={<ErrorBoundary><InventorySubPage tab="picking" /></ErrorBoundary>} />} />
      <Route path="/inventory/packing"     element={<P element={<ErrorBoundary><InventorySubPage tab="packing" /></ErrorBoundary>} />} />
      <Route path="/inventory/batch"       element={<P element={<ErrorBoundary><InventorySubPage tab="batch" /></ErrorBoundary>} />} />
      <Route path="/inventory/ageing"      element={<P element={<ErrorBoundary><InventorySubPage tab="ageing" /></ErrorBoundary>} />} />
      <Route path="/inventory/defective"   element={<P element={<ErrorBoundary><InventorySubPage tab="defective" /></ErrorBoundary>} />} />
      <Route path="/inventory/storage"     element={<P element={<ErrorBoundary><InventorySubPage tab="storage" /></ErrorBoundary>} />} />
      <Route path="/inventory/pincode"     element={<P element={<ErrorBoundary><InventorySubPage tab="pincode" /></ErrorBoundary>} />} />
      <Route path="/inventory/stock-items" element={<P element={<ErrorBoundary><InventorySubPage tab="stock-items" /></ErrorBoundary>} />} />
      <Route path="/inventory/returns"     element={<P element={<ErrorBoundary><InventorySubPage tab="returns" /></ErrorBoundary>} />} />
      <Route path="/inventory/production-manage" element={<P element={<ErrorBoundary><InventorySubPage tab="production-manage" /></ErrorBoundary>} />} />
      <Route path="/inventory/stock-invoices" element={<P element={<StockEntryInvoicesPage />} />} />

      {/* Production */}
      <Route path="/production"             element={<Navigate to="/production/bom" replace />} />
      <Route path="/production/bom"         element={<P element={<ProductionSubPage tab="bom" />} />} />
      <Route path="/production/mrp"         element={<P element={<ProductionSubPage tab="mrp" />} />} />
      <Route path="/production/planning"    element={<P element={<ProductionSubPage tab="planning" />} />} />
      <Route path="/production/scheduling"  element={<P element={<ProductionSubPage tab="scheduling" />} />} />
      <Route path="/production/workorders"  element={<P element={<ProductionSubPage tab="workorders" />} />} />
      <Route path="/production/wip"         element={<P element={<ProductionSubPage tab="wip" />} />} />
      <Route path="/production/tracking"    element={<P element={<ProductionSubPage tab="tracking" />} />} />
      <Route path="/production/qc"          element={<P element={<ProductionSubPage tab="qc" />} />} />
      <Route path="/production/wastage"     element={<P element={<ProductionSubPage tab="wastage" />} />} />
      <Route path="/production/efficiency"  element={<P element={<ProductionSubPage tab="efficiency" />} />} />

      {/* OEM & Orders — single pages */}
      <Route path="/oem"                element={<P element={<OEMPage />} />} />
      <Route path="/orders"             element={<P element={<OrdersPage />} />} />
      <Route path="/orders/dealer"      element={<P element={<DealerOrdersPage />} />} />

      {/* Bulk Orders */}
      <Route path="/bulk"                    element={<Navigate to="/bulk/clients" replace />} />
      <Route path="/bulk/clients"            element={<P element={<BulkSubPage tab="clients" />} />} />
      <Route path="/bulk/clientsESME"        element={<P element={<ClientsESMEPage />} />} />
      <Route path="/bulk/quotations"         element={<P element={<BulkSubPage tab="quotations" />} />} />
      <Route path="/bulk/packaging"          element={<P element={<BulkSubPage tab="packaging" />} />} />
      <Route path="/bulk/delivery"           element={<P element={<BulkSubPage tab="delivery" />} />} />
      <Route path="/bulk/order-flow"         element={<P element={<BulkOrderFlowPage />} />} />
      <Route path="/bulk/complete-flow"      element={<P element={<BulkOrderCompleteFlowPage />} />} />
      <Route path="/bulk/quotation-requests" element={<P element={<BulkQuotationRequestPage />} />} />
      <Route path="/bulk/vendor-quotations"  element={<P element={<VendorQuotationsPage />} />} />

      {/* Logistics */}
      <Route path="/logistics"           element={<Navigate to="/logistics/dispatch" replace />} />
      <Route path="/logistics/dispatch"  element={<P element={<LogisticsSubPage tab="dispatch" />} />} />
      <Route path="/logistics/vehicles"  element={<P element={<LogisticsSubPage tab="vehicles" />} />} />
      <Route path="/logistics/tracking"  element={<P element={<LogisticsSubPage tab="tracking" />} />} />
      <Route path="/logistics/dc"        element={<P element={<LogisticsSubPage tab="dc" />} />} />
      <Route path="/logistics/pendency"  element={<P element={<LogisticsSubPage tab="pendency" />} />} />
      <Route path="/logistics/courier"   element={<P element={<LogisticsSubPage tab="courier" />} />} />
      <Route path="/logistics/docket"    element={<P element={<LogisticsSubPage tab="docket" />} />} />
      <Route path="/logistics/livetrack" element={<P element={<RealTimeTrackingPage />} />} />

      {/* Returns */}
      <Route path="/returns"                element={<Navigate to="/returns/dashboard" replace />} />
      <Route path="/returns/dashboard"      element={<P element={<ReturnsSubPage tab="dashboard" />} />} />
      <Route path="/returns/requests"       element={<P element={<ReturnsSubPage tab="requests" />} />} />
      <Route path="/returns/approval"       element={<P element={<ReturnsSubPage tab="approval" />} />} />
      <Route path="/returns/transport"      element={<P element={<ReturnsSubPage tab="transport" />} />} />
      <Route path="/returns/warehouse"      element={<P element={<ReturnsSubPage tab="warehouse" />} />} />
      <Route path="/returns/qc"             element={<P element={<ReturnsSubPage tab="qc" />} />} />
      <Route path="/returns/debitcredit"    element={<P element={<ReturnsSubPage tab="debitcredit" />} />} />
      <Route path="/returns/reconciliation" element={<P element={<ReturnsSubPage tab="reconciliation" />} />} />
      <Route path="/returns/loss"           element={<P element={<ReturnsSubPage tab="loss" />} />} />
      <Route path="/returns/detail/:id"     element={<P element={<ReturnRequestDetailPage />} />} />
      <Route path="/returns/credit-note"    element={<P element={<CreditNotePage />} />} />
      <Route path="/returns/debit-note"     element={<P element={<DebitNotePage />} />} />

      {/* Finance */}
      <Route path="/finance"                    element={<Navigate to="/finance/dashboard" replace />} />
      <Route path="/finance/dashboard"          element={<P element={<FinanceSubPage tab="dashboard" />} />} />
      <Route path="/finance/accounts-payable"   element={<P element={<FinanceSubPage tab="accounts-payable" />} />} />
      <Route path="/finance/accounts-receivable" element={<P element={<FinanceSubPage tab="accounts-receivable" />} />} />
      <Route path="/finance/supplier-payments"  element={<P element={<FinanceSubPage tab="supplier-payments" />} />} />
      <Route path="/finance/dealer-receipts"    element={<P element={<FinanceSubPage tab="dealer-receipts" />} />} />
      <Route path="/finance/supplier-ledger"    element={<P element={<FinanceSubPage tab="supplier-ledger" />} />} />
      <Route path="/finance/dealer-ledger"      element={<P element={<FinanceSubPage tab="dealer-ledger" />} />} />
      <Route path="/finance/tally-ledger"       element={<P element={<FinanceSubPage tab="tally-ledger" />} />} />
      <Route path="/finance/outstanding-invoices" element={<P element={<FinanceSubPage tab="outstanding-invoices" />} />} />
      <Route path="/finance/bank-cash-accounts" element={<P element={<FinanceSubPage tab="bank-cash-accounts" />} />} />
      <Route path="/finance/payment-history"    element={<P element={<FinanceSubPage tab="payment-history" />} />} />
      <Route path="/finance/financial-reports"  element={<P element={<FinanceSubPage tab="financial-reports" />} />} />
      <Route path="/finance/ledger/:id"         element={<P element={<LedgerDetailPage />} />} />
      <Route path="/finance/cntracks"           element={<P element={<CreditNoteTrackingPage />} />} />
      <Route path="/finance/invoices"           element={<Navigate to="/finance/invoices/single" replace />} />
      <Route path="/finance/invoices/single"    element={<P element={<InvoiceGeneratorPage type="single" />} />} />
      <Route path="/finance/invoices/multi"     element={<P element={<InvoiceGeneratorPage type="multi" />} />} />

      {/* PO Generator — only two pages: Upload + Company Details */}
      <Route path="/po-generator"                      element={<Navigate to="/po-generator/upload" replace />} />
      <Route path="/po-generator/upload"               element={<P element={<POUploadPage />} />} />
      <Route path="/po-generator/companies"            element={<P element={<POCompanyPage />} />} />
      <Route path="/po-generator/companies/:companyId" element={<P element={<POCompanyPage />} />} />
      {/* Legacy routes — redirect removed pages to Upload */}
      <Route path="/po-generator/stock-verify/:poId"   element={<Navigate to="/po-generator/upload" replace />} />
      <Route path="/po-generator/approval/:poId"       element={<Navigate to="/po-generator/upload" replace />} />
      <Route path="/po-generator/partial-invoice"      element={<Navigate to="/po-generator/upload" replace />} />
      <Route path="/po-generator/pending-orders"       element={<Navigate to="/po-generator/upload" replace />} />
      <Route path="/po-generator/invoice-history"      element={<Navigate to="/po-generator/upload" replace />} />

      {/* Forecasting */}
      <Route path="/forecasting"            element={<Navigate to="/forecasting/demand" replace />} />
      <Route path="/forecasting/demand"     element={<P element={<ForecastingSubPage tab="demand" />} />} />
      <Route path="/forecasting/planning"   element={<P element={<ForecastingSubPage tab="planning" />} />} />
      <Route path="/forecasting/inventory"  element={<P element={<ForecastingSubPage tab="inventory" />} />} />
      <Route path="/forecasting/seasonal"   element={<P element={<ForecastingSubPage tab="seasonal" />} />} />

      {/* Reports */}
      <Route path="/reports"            element={<Navigate to="/reports/sales" replace />} />
      <Route path="/reports/sales"      element={<P element={<ReportsSubPage tab="sales" />} />} />
      <Route path="/reports/pl"         element={<P element={<ReportsSubPage tab="pl" />} />} />
      <Route path="/reports/turnover"   element={<P element={<ReportsSubPage tab="turnover" />} />} />
      <Route path="/reports/stock"      element={<P element={<ReportsSubPage tab="stock" />} />} />
      <Route path="/reports/purchase"   element={<P element={<ReportsSubPage tab="purchase" />} />} />
      <Route path="/reports/production" element={<P element={<ReportsSubPage tab="production" />} />} />
      <Route path="/reports/returns"    element={<P element={<ReportsSubPage tab="returns" />} />} />

      {/* Assets */}
      <Route path="/assets"             element={<Navigate to="/assets/register" replace />} />
      <Route path="/assets/register"    element={<P element={<AssetsSubPage tab="register" />} />} />
      <Route path="/assets/maintenance" element={<P element={<AssetsSubPage tab="maintenance" />} />} />
      <Route path="/assets/lifecycle"   element={<P element={<AssetsSubPage tab="lifecycle" />} />} />

      {/* Barcode */}
      <Route path="/barcode"          element={<Navigate to="/barcode/generate" replace />} />
      <Route path="/barcode/generate" element={<P element={<BarcodeSubPage tab="generate" />} />} />
      <Route path="/barcode/scan"     element={<P element={<BarcodeSubPage tab="scan" />} />} />
      <Route path="/barcode/logs"     element={<P element={<BarcodeSubPage tab="logs" />} />} />

      {/* Vinculum */}
      <Route path="/vinculum"          element={<Navigate to="/vinculum/config" replace />} />
      <Route path="/vinculum/config"   element={<P element={<VinculumSubPage tab="config" />} />} />
      <Route path="/vinculum/logs"     element={<P element={<VinculumSubPage tab="logs" />} />} />
      <Route path="/vinculum/sku"      element={<P element={<VinculumSubPage tab="sku" />} />} />
      <Route path="/vinculum/sync"     element={<P element={<VinculumSubPage tab="sync" />} />} />

      {/* Tasks */}
      <Route path="/tasks"           element={<Navigate to="/tasks/kanban" replace />} />
      <Route path="/tasks/kanban"    element={<P element={<TasksSubPage tab="kanban" />} />} />
      <Route path="/tasks/todo"      element={<P element={<TasksSubPage tab="todo" />} />} />
      <Route path="/tasks/recurring" element={<P element={<TasksSubPage tab="recurring" />} />} />
      <Route path="/tasks/notifs"    element={<P element={<TasksSubPage tab="notifs" />} />} />

      {/* Employee Management */}
      <Route path="/employee-management"             element={<Navigate to="/employee-management/registered" replace />} />
      <Route path="/employee-management/registered"  element={<P element={<RegisteredEmployeesPage />} />} />
      <Route path="/employee-management/products"    element={<P element={<ProductMasterPage />} />} />

      {/* Tally Integration */}
      <Route path="/tally"              element={<Navigate to="/tally/overview" replace />} />
      <Route path="/tally/overview"     element={<P element={<TallySubPage tab="overview" />} />} />
      <Route path="/tally/import"       element={<P element={<TallySubPage tab="import" />} />} />
      <Route path="/tally/export"       element={<P element={<TallySubPage tab="export" />} />} />
      <Route path="/tally/data"         element={<P element={<TallyDataPage />} />} />
      <Route path="/tally/logs"         element={<P element={<TallySubPage tab="logs" />} />} />
      <Route path="/tally/settings"     element={<P element={<TallySubPage tab="settings" />} />} />
      <Route path="/tally/sales-register" element={<P element={<SalesRegisterPage />} />} />
      <Route path="/tally/po-export"    element={<Navigate to="/tally/export" replace />} />
      {/* legacy routes — redirect to new paths */}
      <Route path="/tally/dashboard"    element={<Navigate to="/tally/overview" replace />} />
      <Route path="/tally/master"       element={<Navigate to="/tally/import" replace />} />
      <Route path="/tally/transactions" element={<Navigate to="/tally/export" replace />} />
      <Route path="/tally/config"       element={<Navigate to="/tally/settings" replace />} />

      <Route path="/settings"       element={<P element={<SettingsPage />} />} />
      <Route path="/settings/roles" element={<P element={<RolePermissionsPage />} />} />
      <Route path="/item-master"    element={<P element={<ItemMasterPage />} />} />
      <Route path="*"               element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}