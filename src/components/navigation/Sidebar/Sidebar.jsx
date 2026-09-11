import { Fragment, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Boxes,
  Building2,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  CircleHelp,
  LayoutDashboard,
  Package,
  Route,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Workflow,
  Warehouse,
  X,
} from "lucide-react";

import { findNavigationPage, getNavigationDefaultPath, navigationConfig } from "../../../app/navigationConfig";
import { useModuleAccess } from "../../../hooks/useModuleAccess";
import { openPosWorkspace } from "../../../utils/pwa";
import styles from "./Sidebar.module.scss";

const icons = {
  dashboard: LayoutDashboard,
  operations: Workflow,
  sales: ShoppingCart,
  catalog: Package,
  inventory: Warehouse,
  partners: Building2,
  agents: Users,
  routes: Route,
  fulfillment: ClipboardList,
  delivery: Truck,
  finance: CreditCard,
  reports: Boxes,
  help: CircleHelp,
  settings: Settings,
};

function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen = false, onCloseMobile = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isEnabled } = useModuleAccess();
  const [hoveredKey, setHoveredKey] = useState(null);
  const closeTimerRef = useRef(null);
  const showLabels = !isCollapsed || isMobileOpen;

  const visibleNavigation = useMemo(
    () => navigationConfig
      .map((item) => {
        if (item.key === "sales") {
          const children = item.children.filter((child) => child.to !== "/sales/pos" || isEnabled("pos"));
          return { ...item, children };
        }
        return item;
      })
      .filter((item) => isEnabled(item.key)),
    [isEnabled],
  );

  const activeFlyout = useMemo(
    () => visibleNavigation.find((item) => item.key === hoveredKey && item.children?.length),
    [hoveredKey, visibleNavigation],
  );
  const currentPage = useMemo(() => findNavigationPage(location.pathname), [location.pathname]);
  const isItemActive = (item) => item.to
    ? location.pathname === item.to
    : item.children?.some((child) => child.to === currentPage?.to);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openFlyout = (key) => {
    cancelClose();
    setHoveredKey(key);
  };

  const scheduleClose = (delay = 360) => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredKey(null);
      closeTimerRef.current = null;
    }, delay);
  };

  const openPosWindow = (event) => {
    event?.preventDefault?.();
    openPosWorkspace(navigate);
    closeNow();
    onCloseMobile();
  };

  const closeNow = () => {
    cancelClose();
    setHoveredKey(null);
  };

  return (
    <>
      {isMobileOpen ? (
        <button
          className={styles.mobileOverlay}
          type="button"
          aria-label="Menyuni yopish"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""} ${isMobileOpen ? styles.mobileOpen : ""}`}
        onMouseEnter={cancelClose}
        onMouseLeave={() => scheduleClose()}
      >
        <div className={styles.sidebarInner}>
          <div className={styles.brand}>
            <NavLink to="/dashboard" className={styles.logo} onClick={onCloseMobile}>
              <span className={styles.logoMark}>Q</span>
              {showLabels ? <span className={styles.logoText}>Qulay</span> : null}
            </NavLink>
            <button className={styles.mobileClose} type="button" onClick={onCloseMobile} aria-label="Yopish">
              <X size={18} />
            </button>
          </div>

          <nav className={styles.navigation} aria-label="Asosiy navigatsiya">
            {visibleNavigation.map((item) => {
              const Icon = icons[item.icon] || Boxes;
              const active = isItemActive(item);

              if (item.to) {
                return (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    onClick={() => {
                      closeNow();
                      onCloseMobile();
                    }}
                    onMouseEnter={closeNow}
                    className={`${styles.navItem} ${active ? styles.active : ""}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className={styles.iconWrap}><Icon size={19} strokeWidth={1.8} /></span>
                    {showLabels ? <span className={styles.navLabel}>{item.label}</span> : null}
                  </NavLink>
                );
              }

              return (
                <Fragment key={item.key}>
                  <button
                    type="button"
                    className={`${styles.navItem} ${active ? styles.active : ""} ${hoveredKey === item.key ? styles.hovered : ""}`}
                    onMouseEnter={() => openFlyout(item.key)}
                    onMouseLeave={() => scheduleClose(430)}
                    onFocus={() => openFlyout(item.key)}
                    onClick={() => {
                      const target = getNavigationDefaultPath(item);
                      if (target === "/sales/pos") openPosWorkspace(navigate);
                      else navigate(target);
                      closeNow();
                      onCloseMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    aria-expanded={hoveredKey === item.key}
                  >
                    <span className={styles.iconWrap}><Icon size={19} strokeWidth={1.8} /></span>
                    {showLabels ? <span className={styles.navLabel}>{item.label}</span> : null}
                    {showLabels ? <span className={styles.navHint}>•••</span> : null}
                  </button>

                  {isMobileOpen && hoveredKey === item.key ? (
                    <div className={styles.mobileSubmenu}>
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={`${styles.mobileSubmenuLink} ${currentPage?.to === child.to ? styles.mobileSubmenuLinkActive : ""}`}
                          onClick={(event) => {
                            if (child.to === "/sales/pos") { openPosWindow(event); return; }
                            closeNow();
                            onCloseMobile();
                          }}
                        >
                          <strong>{child.label}</strong>
                          <span>{child.description}</span>
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <button
              type="button"
              className={styles.collapseButton}
              onClick={() => {
                onToggleCollapse();
                closeNow();
              }}
            >
              <ChevronLeft size={18} strokeWidth={1.8} className={isCollapsed ? styles.rotate : ""} />
              {showLabels ? <span>Yig‘ish</span> : null}
            </button>
          </div>
        </div>

        {activeFlyout ? (
          <div
            className={styles.flyout}
            onMouseEnter={() => openFlyout(activeFlyout.key)}
            onMouseLeave={() => scheduleClose(430)}
          >
            <div className={styles.flyoutBridge} aria-hidden="true" />
            <div className={styles.flyoutHeader}>
              <span className={styles.flyoutEyebrow}>Bo‘lim</span>
              <h2>{activeFlyout.label}</h2>
              <p>{activeFlyout.children.length} ta ishchi sahifa</p>
            </div>
            <div className={styles.flyoutLinks}>
              {activeFlyout.children.map((child) => {
                const active = currentPage?.to === child.to;
                return (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    className={`${styles.flyoutLink} ${active ? styles.flyoutLinkActive : ""}`}
                    onClick={(event) => {
                      if (child.to === "/sales/pos") { openPosWindow(event); return; }
                      closeNow();
                      onCloseMobile();
                    }}
                  >
                    <span className={styles.flyoutLinkTitle}>{child.label}</span>
                    <span className={styles.flyoutDescription}>{child.description}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export default Sidebar;
