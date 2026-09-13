import { createBrowserRouter, Navigate } from "react-router-dom";
import { getRouteModule, getRoutePermission } from "./navigationConfig";

import AgentsPage from "../features/agents/pages/AgentsPage";
import ChangePasswordPage from "../features/auth/pages/ChangePasswordPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";
import PasswordRecoveryPage from "../features/auth/pages/PasswordRecoveryPage";
import CategoriesPage from "../features/categories/pages/CategoriesPage";
import HelpCenterPage from "../features/help/pages/HelpCenterPage";
import LiveOperationsPage from "../features/operations/pages/LiveOperationsPage";
import CurrencyRatesPage from "../features/currency/pages/CurrencyRatesPage";
import CustomersPage from "../features/customers/pages/CustomersPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import CustomerDebtPage from "../features/debt/pages/CustomerDebtPage";
import CustomerLedgerPage from "../features/debt/pages/CustomerLedgerPage";
import DeliveryPlanningPage from "../features/delivery/pages/DeliveryPlanningPage";
import DeliveryTripsPage from "../features/delivery/pages/DeliveryTripsPage";
import DeliveryWorkspacePage from "../features/delivery/pages/DeliveryWorkspacePage";
import FulfillmentWorkspacePage from "../features/fulfillment/pages/FulfillmentWorkspacePage";
import FinanceOverviewPage from "../features/finance/pages/FinanceOverviewPage";
import PickListsPage from "../features/fulfillment/pages/PickListsPage";
import GoodsReceiptsPage from "../features/inventory/pages/GoodsReceiptsPage";
import InventoryCountsPage from "../features/inventory/pages/InventoryCountsPage";
import InventoryMovementsPage from "../features/inventory/pages/InventoryMovementsPage";
import InventoryPage from "../features/inventory/pages/InventoryPage";
import InventoryReservationsPage from "../features/inventory/pages/InventoryReservationsPage";
import InventoryTransfersPage from "../features/inventory/pages/InventoryTransfersPage";
import StockAdjustmentsPage from "../features/inventory/pages/StockAdjustmentsPage";
import InvoicesPage from "../features/invoices/pages/InvoicesPage";
import NotificationsPage from "../features/notifications/pages/NotificationsPage";
import OrderCreatePage from "../features/orders/pages/OrderCreatePage";
import OrdersPage from "../features/orders/pages/OrdersPage";
import PaymentsPage from "../features/payments/pages/PaymentsPage";
import PosPage from "../features/pos/pages/PosPage";
import PriceListsPage from "../features/pricing/pages/PriceListsPage";
import PricingPage from "../features/pricing/pages/PricingPage";
import ProductsPage from "../features/products/pages/ProductsPage";
import ReturnsPage from "../features/returns/pages/ReturnsPage";
import RoutePlansPage from "../features/routes/pages/RoutePlansPage";
import RoutesMapPage from "../features/routes/pages/RoutesMapPage";
import RouteTemplatesPage from "../features/routes/pages/RouteTemplatesPage";
import SalesPage from "../features/sales/pages/SalesPage";
import SettingsPage from "../features/settings/pages/SettingsPage";
import SuppliersPage from "../features/suppliers/pages/SuppliersPage";
import UnitsPage from "../features/units/pages/UnitsPage";
import UsersPage from "../features/users/pages/UsersPage";
import UserDetailsPage from "../features/users/pages/UserDetailsPage";
import VisitsPage from "../features/visits/pages/VisitsPage";
import WarehousesPage from "../features/warehouses/pages/WarehousesPage";
import GuestRoute from "../guards/GuestRoute";
import ModuleRoute from "../guards/ModuleRoute";
import PermissionRoute from "../guards/PermissionRoute";
import { PERMISSIONS } from "../constants/permissions";
import ProtectedRoute from "../guards/ProtectedRoute";
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import {
  AgentTodayPage,
  ContactsPage,
  DeliveryAssignmentsPage,
  GenericInfoPage,
  PackingPage,
  PickingPage,
  ReadyOrdersPage,
  TerritoriesPage,
} from "../pages/OperationalPages";
import {
  AgentsReportPage,
  DebtReportPage,
  DeliveryReportPage,
  InventoryReportPage,
  ReportsOverviewPage,
  SalesReportPage,
} from "../pages/ReportPages";
import ForbiddenPage from "../pages/ForbiddenPage";
import HomeRedirect from "../pages/HomeRedirect";

const settingSections = ["general", "appearance", "modules", "sales", "pos", "payment-methods", "inventory", "agents", "delivery", "finance", "documents", "notifications", "maps", "locale", "mobile", "data", "system"];
const platformRoles = ["OWNER", "ADMIN", "EMPLOYEE"];

const ownerChildren = [
  { index: true, element: <Navigate to="/dashboard" replace /> },
  { path: "dashboard", element: <DashboardPage /> },
  { path: "operations", element: <LiveOperationsPage /> },
  { path: "orders", element: <OrdersPage /> },
  { path: "orders/new", element: <OrderCreatePage /> },
  { path: "sales", element: <SalesPage /> },
  { path: "returns", element: <ReturnsPage /> },
  { path: "inventory/products", element: <ProductsPage /> },
  { path: "inventory/categories", element: <CategoriesPage /> },
  { path: "inventory/pricing", element: <PricingPage /> },
  { path: "inventory", element: <InventoryPage /> },
  { path: "inventory/receipts", element: <GoodsReceiptsPage /> },
  { path: "inventory/movements", element: <InventoryMovementsPage /> },
  { path: "inventory/reservations", element: <InventoryReservationsPage /> },
  { path: "inventory/transfers", element: <InventoryTransfersPage /> },
  { path: "inventory/counts", element: <InventoryCountsPage /> },
  { path: "inventory/adjustments", element: <StockAdjustmentsPage /> },
  { path: "warehouses", element: <WarehousesPage /> },
  { path: "customers", element: <CustomersPage /> },
  { path: "suppliers", element: <SuppliersPage /> },
  { path: "partners/contacts", element: <ContactsPage /> },
  { path: "agents", element: <AgentsPage /> },
  { path: "agents/territories", element: <TerritoriesPage /> },
  { path: "visits", element: <VisitsPage /> },
  { path: "agents/today", element: <AgentTodayPage /> },
  { path: "routes/today", element: <RoutesMapPage /> },
  { path: "routes/plans", element: <RoutePlansPage /> },
  { path: "routes/templates", element: <RouteTemplatesPage /> },
  { path: "fulfillment", element: <FulfillmentWorkspacePage /> },
  { path: "fulfillment/pick-lists", element: <PickListsPage /> },
  { path: "fulfillment/picking", element: <PickingPage /> },
  { path: "fulfillment/packing", element: <PackingPage /> },
  { path: "fulfillment/ready", element: <ReadyOrdersPage /> },
  { path: "deliveries", element: <DeliveryWorkspacePage /> },
  { path: "deliveries/planning", element: <DeliveryPlanningPage /> },
  { path: "delivery-trips", element: <DeliveryTripsPage /> },
  { path: "deliveries/assignments", element: <DeliveryAssignmentsPage /> },
  { path: "finance", element: <FinanceOverviewPage /> },
  { path: "invoices", element: <InvoicesPage /> },
  { path: "payments", element: <PaymentsPage /> },
  { path: "debt", element: <CustomerDebtPage /> },
  { path: "ledger", element: <CustomerLedgerPage /> },
  { path: "currency-rates", element: <CurrencyRatesPage /> },
  { path: "reports", element: <ReportsOverviewPage /> },
  { path: "reports/sales", element: <SalesReportPage /> },
  { path: "reports/inventory", element: <InventoryReportPage /> },
  { path: "reports/agents", element: <AgentsReportPage /> },
  { path: "reports/debt", element: <DebtReportPage /> },
  { path: "reports/delivery", element: <DeliveryReportPage /> },
  { path: "help", element: <HelpCenterPage /> },
  { path: "help/:articleId", element: <HelpCenterPage /> },
  { path: "settings", element: <Navigate to="/settings/general" replace /> },
  { path: "settings/units", element: <UnitsPage /> },
  { path: "settings/price-lists", element: <PriceListsPage /> },
  ...settingSections.map((section) => ({ path: `settings/${section}`, element: <SettingsPage section={section} /> })),
  { path: "products", element: <Navigate to="/inventory/products" replace /> },
  { path: "categories", element: <Navigate to="/inventory/categories" replace /> },
  { path: "pricing", element: <Navigate to="/inventory/pricing" replace /> },
  { path: "units", element: <Navigate to="/settings/units" replace /> },
  { path: "price-lists", element: <Navigate to="/settings/price-lists" replace /> },
  { path: "catalog", element: <Navigate to="/inventory/products" replace /> },
  { path: "catalog/products", element: <Navigate to="/inventory/products" replace /> },
  { path: "catalog/categories", element: <Navigate to="/inventory/categories" replace /> },
  { path: "catalog/pricing", element: <Navigate to="/inventory/pricing" replace /> },
  { path: "catalog/units", element: <Navigate to="/settings/units" replace /> },
  { path: "catalog/price-lists", element: <Navigate to="/settings/price-lists" replace /> },
  { path: "users", element: <UsersPage /> },
  { path: "users/:userId", element: <UserDetailsPage /> },
  { path: "notifications", element: <NotificationsPage /> },
  {
    path: "*",
    element: <GenericInfoPage eyebrow="Qulay" title="Sahifa topilmadi" description="Bu manzil hali Qulay’ga ulanmagan." items={[{ title: "404", description: "Chap menyu orqali mavjud sahifalardan biriga o‘ting." }]} />,
  },
];


const securedOwnerChildren = ownerChildren.map((route) => {
  if (route.index || route.path === "*") return route;
  return {
    ...route,
    element: <ModuleRoute moduleKey={getRouteModule(route.path)}><PermissionRoute permission={getRoutePermission(route.path)}>{route.element}</PermissionRoute></ModuleRoute>,
  };
});

export const router = createBrowserRouter([
  { path: "/", element: <HomeRedirect /> },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <GuestRoute><LoginPage /></GuestRoute> },
      { path: "/register", element: <GuestRoute><RegisterPage /></GuestRoute> },
      { path: "/forgot-password", element: <GuestRoute><PasswordRecoveryPage /></GuestRoute> },
      { path: "/reset-password", element: <GuestRoute><PasswordRecoveryPage reset /></GuestRoute> },
      { path: "/change-password", element: <ProtectedRoute allowTemporaryPassword><ChangePasswordPage /></ProtectedRoute> },
    ],
  },
  {
    path: "/sales/pos",
    element: <ProtectedRoute allowRoles={platformRoles}><ModuleRoute moduleKey="pos"><PermissionRoute permission={PERMISSIONS.POS_CREATE}><PosPage /></PermissionRoute></ModuleRoute></ProtectedRoute>,
  },
  {
    element: <ProtectedRoute allowRoles={platformRoles}><AppLayout /></ProtectedRoute>,
    children: securedOwnerChildren,
  },
  { path: "/forbidden", element: <ProtectedRoute allowTemporaryPassword><ForbiddenPage /></ProtectedRoute> },
]);

export default router;
