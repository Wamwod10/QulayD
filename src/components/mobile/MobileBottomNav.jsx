import { BarChart3, CircleDollarSign, Home, Menu, ScanLine, ShoppingBag, Users, Warehouse } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useModuleAccess } from "../../hooks/useModuleAccess";
import { useAuth } from "../../hooks/useAuth";
import { EMPLOYEE_WORKSPACES, EMPLOYEE_WORKSPACE_KEYS } from "../../config/employeeWorkspaces";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import { useLocalDb } from "../../services/localDb";
import { openPosWorkspace } from "../../utils/pwa";

function MobileBottomNav({ onOpenMenu }) {
  const { isEnabled } = useModuleAccess();
  const { user } = useAuth();
  const { can } = usePermissions();
  const compactBottomNav = useLocalDb((db) => db.settings.mobile?.compactBottomNav !== false);
  const navigate = useNavigate();
  const location = useLocation();

  const activeWorkspaceKey = (user?.modules || []).find((key) => EMPLOYEE_WORKSPACE_KEYS.includes(key));
  const activeWorkspace = activeWorkspaceKey ? EMPLOYEE_WORKSPACES[activeWorkspaceKey] : null;
  const workspaceShortcuts = {
    agent_workspace: [
      { key: "workspace", label: "Ish joyi", to: activeWorkspace?.path, icon: Home },
      { key: "orders", label: "Buyurtma", to: "/orders", icon: ShoppingBag },
      { key: "customers", label: "Mijoz", to: "/customers", icon: Users },
    ],
    warehouse_workspace: [
      { key: "workspace", label: "Ish joyi", to: activeWorkspace?.path, icon: Home },
      { key: "inventory", label: "Ombor", to: "/inventory", icon: Warehouse },
    ],
    fulfillment_workspace: [
      { key: "workspace", label: "Tayyorlash", to: activeWorkspace?.path, icon: Home },
    ],
    driver_workspace: [
      { key: "workspace", label: "Yetkazish", to: activeWorkspace?.path, icon: Home },
    ],
    sales_operator_workspace: [
      { key: "workspace", label: "Ish joyi", to: activeWorkspace?.path, icon: Home },
      { key: "orders", label: "Buyurtma", to: "/orders", icon: ShoppingBag },
      { key: "customers", label: "Mijoz", to: "/customers", icon: Users },
    ],
    cashier_workspace: [
      { key: "workspace", label: "Kassa", to: activeWorkspace?.path, icon: Home },
      { key: "finance", label: "To‘lov", to: "/payments", icon: CircleDollarSign },
    ],
  };

  const candidates = activeWorkspace && !user?.roles?.some((role) => ["OWNER", "ADMIN"].includes(role))
    ? (workspaceShortcuts[activeWorkspaceKey] || [])
    : [
      { key: "home", label: "Bosh", to: "/dashboard", icon: Home, visible: isEnabled("dashboard") && can(PERMISSIONS.DASHBOARD_VIEW) },
      { key: "orders", label: "Buyurtma", to: "/orders", icon: ShoppingBag, visible: isEnabled("sales") && can(PERMISSIONS.ORDERS_VIEW) },
      { key: "pos", label: "Kassa", to: "/sales/pos", icon: ScanLine, visible: isEnabled("pos") && can(PERMISSIONS.POS_CREATE), action: "pos" },
      { key: "inventory", label: "Ombor", to: "/inventory", icon: Warehouse, visible: isEnabled("inventory") && can(PERMISSIONS.INVENTORY_VIEW) },
      { key: "reports", label: "Hisobot", to: "/reports", icon: BarChart3, visible: isEnabled("reports") && can(PERMISSIONS.REPORTS_VIEW) },
      { key: "finance", label: "Moliya", to: "/finance", icon: CircleDollarSign, visible: isEnabled("finance") && can(PERMISSIONS.FINANCE_VIEW) },
      { key: "customers", label: "Mijoz", to: "/customers", icon: Users, visible: isEnabled("partners") && can(PERMISSIONS.CUSTOMERS_VIEW) },
    ].filter((item) => item.visible);
  const primaryItems = candidates.slice(0, 4);
  const items = [...primaryItems, { key: "menu", label: "Menyu", icon: Menu, action: "menu" }];

  if (!compactBottomNav) return null;

  return (
    <nav className="qp-mobile-bottom-nav" aria-label="Mobil tezkor navigatsiya" style={{ "--qp-mobile-nav-count": items.length }}>
      {items.map((item) => {
        const Icon = item.icon;
        if (item.action === "menu") {
          return <button key={item.key} type="button" onClick={onOpenMenu}><Icon size={20}/><span>{item.label}</span></button>;
        }
        if (item.action === "pos") {
          const active = location.pathname === item.to;
          return <button key={item.key} type="button" className={active ? "active qp-mobile-pos-action" : "qp-mobile-pos-action"} onClick={() => openPosWorkspace(navigate)}><Icon size={21}/><span>{item.label}</span></button>;
        }
        return <NavLink key={item.key} to={item.to} className={({ isActive }) => isActive ? "active" : ""}><Icon size={20}/><span>{item.label}</span></NavLink>;
      })}
    </nav>
  );
}

export default MobileBottomNav;
