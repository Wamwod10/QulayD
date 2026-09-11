import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { findNavigationSection } from "../../app/navigationConfig";
import Sidebar from "../../components/navigation/Sidebar";
import MobileBottomNav from "../../components/mobile/MobileBottomNav";
import MobilePinGate from "../../components/mobile/MobilePinGate";
import Topbar from "../../components/navigation/Topbar/Topbar";
import { useLocalDb } from "../../services/localDb";

import styles from "./AppLayout.module.scss";

function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const modules = useLocalDb((db) => db.settings.modules);
  const location = useLocation();
  const navigate = useNavigate();
  const isPosMode = location.pathname === "/sales/pos";

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => { if (event.key === "Escape") setIsMobileMenuOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const section = findNavigationSection(location.pathname);
    if (!section) return;
    if (["dashboard", "settings"].includes(section.key)) return;
    if (modules?.[section.key] === false) navigate("/dashboard", { replace: true });
    if (section.key === "sales" && location.pathname === "/sales/pos" && modules?.pos === false) navigate("/dashboard", { replace: true });
  }, [location.pathname, modules, navigate]);

  return (
    <>
    <MobilePinGate />
    <div data-pos-mode={isPosMode ? "true" : "false"} data-sidebar-collapsed={isSidebarCollapsed ? "true" : "false"} className={`${styles.appLayout} ${isSidebarCollapsed ? styles.sidebarCollapsed : ""} ${isPosMode ? styles.posMode : ""}`}>
      {!isPosMode ? <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      /> : null}
      <div className={styles.workspace}>
        {!isPosMode ? <Topbar onOpenMenu={() => setIsMobileMenuOpen(true)} /> : null}
        <main className={styles.main}><Outlet /></main>
        {!isPosMode ? <MobileBottomNav onOpenMenu={() => setIsMobileMenuOpen(true)} /> : null}
      </div>
    </div>
    </>
  );
}

export default AppLayout;
