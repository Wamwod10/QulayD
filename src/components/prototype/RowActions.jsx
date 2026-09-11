import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function RowActions({ items = [], ariaLabel = "Yozuv amallari" }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const positionMenu = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 210;
    const estimatedHeight = Math.min(340, Math.max(54, items.filter(Boolean).length * 42 + 14));
    const gap = 7;
    const roomBelow = window.innerHeight - rect.bottom - gap - 8;
    const roomAbove = rect.top - gap - 8;
    const openUp = roomBelow < estimatedHeight && roomAbove > roomBelow;
    const left = Math.min(Math.max(8, rect.right - width), Math.max(8, window.innerWidth - width - 8));

    setStyle({
      position: "fixed",
      zIndex: 2200,
      width: `${width}px`,
      left: `${left}px`,
      top: openUp ? "auto" : `${rect.bottom + gap}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + gap}px` : "auto",
      maxHeight: `${Math.max(120, Math.min(340, openUp ? roomAbove : roomBelow))}px`,
      overflowY: "auto",
    });
  }, [items]);

  useEffect(() => {
    if (!open) return undefined;
    positionMenu();
    const close = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    const reposition = () => positionMenu();
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, positionMenu]);

  const menu = open && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef} className="qp-row-actions-menu qp-row-actions-portal" style={style} role="menu">
      {items.filter(Boolean).map((item) => {
        const Icon = item.icon;
        return (
          <button
            type="button"
            key={item.label}
            className={item.tone === "danger" ? "danger" : ""}
            disabled={item.disabled}
            onClick={() => { setOpen(false); item.onClick?.(); }}
            role="menuitem"
          >
            {Icon ? <Icon size={14} /> : null}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <span className="qp-row-actions-wrap">
        <button ref={triggerRef} type="button" className="qp-icon-button" aria-label={ariaLabel} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <MoreHorizontal size={17} />
        </button>
      </span>
      {menu}
    </>
  );
}

export default RowActions;
