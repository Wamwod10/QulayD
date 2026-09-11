import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { findNavigationPage, findNavigationSection, getRoutePermission } from "../../app/navigationConfig";
import { useModuleAccess } from "../../hooks/useModuleAccess";
import { usePermissions } from "../../hooks/usePermissions";

function SectionNavigation() {
  const location = useLocation();
  const { isEnabled } = useModuleAccess();
  const { can } = usePermissions();
  const section = findNavigationSection(location.pathname);
  const currentPage = findNavigationPage(location.pathname);
  const tabsRef = useRef(null);
  const [scrollState, setScrollState] = useState({ overflow: false, left: false, right: false });

  const updateScrollState = useCallback(() => {
    const element = tabsRef.current;
    if (!element) return;
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    setScrollState({
      overflow: maxScroll > 4,
      left: element.scrollLeft > 4,
      right: element.scrollLeft < maxScroll - 4,
    });
  }, []);

  useEffect(() => {
    const element = tabsRef.current;
    if (!element) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const active = element.querySelector("a[aria-current='page']");
      active?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "nearest" });
      updateScrollState();
    });

    const onScroll = () => updateScrollState();
    element.addEventListener("scroll", onScroll, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    observer?.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      element.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [location.pathname, section?.key, updateScrollState]);

  if (!section) return null;

  const sectionModule = section.key === "operations" ? "dashboard" : section.key;
  const isModuleHidden = !isEnabled(sectionModule);
  if (isModuleHidden) return null;

  const children = section.children?.filter((child) => (
    can(getRoutePermission(child.to))
    && (child.to !== "/sales/pos" || isEnabled("pos"))
  ));

  const scrollTabs = (direction) => {
    const element = tabsRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(220, Math.round(element.clientWidth * 0.65)), behavior: "smooth" });
  };

  return (
    <div className="qp-section-navigation" aria-label="Bo‘lim ichki navigatsiyasi">
      <div className="qp-breadcrumbs">
        <span>{section.label}</span>
        {currentPage && currentPage.label !== section.label ? (
          <>
            <ChevronRight size={13} strokeWidth={1.9} />
            <strong>{currentPage.label}</strong>
          </>
        ) : null}
      </div>

      {children?.length ? (
        <div className={`qp-section-tabs-shell ${scrollState.overflow ? "is-overflowing" : ""}`}>
          {scrollState.overflow ? (
            <button
              type="button"
              className="qp-section-tabs-scroll qp-section-tabs-scroll-left"
              onClick={() => scrollTabs(-1)}
              disabled={!scrollState.left}
              aria-label="Oldingi bo‘limlarni ko‘rsatish"
            >
              <ChevronLeft size={16} />
            </button>
          ) : null}

          <div ref={tabsRef} className="qp-section-tabs">
            {children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                end
                className={({ isActive }) => (isActive ? "active" : "")}
                title={child.description}
              >
                {child.label}
              </NavLink>
            ))}
          </div>

          {scrollState.overflow ? (
            <button
              type="button"
              className="qp-section-tabs-scroll qp-section-tabs-scroll-right"
              onClick={() => scrollTabs(1)}
              disabled={!scrollState.right}
              aria-label="Keyingi bo‘limlarni ko‘rsatish"
            >
              <ChevronRight size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default SectionNavigation;
