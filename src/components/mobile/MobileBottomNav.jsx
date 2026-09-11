import { Home, Menu, ScanLine, ShoppingBag, Users } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useModuleAccess } from "../../hooks/useModuleAccess";
import { useLocalDb } from "../../services/localDb";
import { openPosWorkspace } from "../../utils/pwa";

function MobileBottomNav({ onOpenMenu }) {
  const { isEnabled } = useModuleAccess();
  const compactBottomNav = useLocalDb((db) => db.settings.mobile?.compactBottomNav !== false);
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { key: "home", label: "Bosh", to: "/dashboard", icon: Home, visible: true },
    { key: "orders", label: "Buyurtma", to: "/orders", icon: ShoppingBag, visible: isEnabled("sales") },
    { key: "pos", label: "Kassa", to: "/sales/pos", icon: ScanLine, visible: isEnabled("sales") && isEnabled("pos"), action: "pos" },
    { key: "customers", label: "Mijoz", to: "/customers", icon: Users, visible: isEnabled("partners") },
    { key: "menu", label: "Menyu", icon: Menu, visible: true, action: "menu" },
  ].filter((item) => item.visible);

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
