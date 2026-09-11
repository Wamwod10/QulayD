import { Check, ChevronDown, Search } from "lucide-react";
import { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import "./Select.scss";

function flattenOptions(children) {
  return Children.toArray(children)
    .flatMap((child) => Array.isArray(child) ? child : [child])
    .filter((child) => isValidElement(child) && child.type === "option")
    .map((child) => ({ value: String(child.props.value ?? child.props.children ?? ""), label: child.props.children, disabled: Boolean(child.props.disabled) }));
}

function Select({ value = "", onChange, children, placeholder = "Tanlang", disabled = false, searchable = false, className = "", ariaLabel = "", ...triggerProps }) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState({});
  const options = useMemo(() => flattenOptions(children), [children]);
  const selected = options.find((option) => option.value === String(value));
  const filtered = query.trim() ? options.filter((option) => String(option.label ?? "").toLowerCase().includes(query.trim().toLowerCase())) : options;

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;
    const rect = trigger.getBoundingClientRect();
    const gap = 7;
    const desiredHeight = Math.min(360, 56 + Math.min(options.length, 8) * 40);
    const spaceBelow = window.innerHeight - rect.bottom - gap - 10;
    const spaceAbove = rect.top - gap - 10;
    const openUp = spaceBelow < Math.min(220, desiredHeight) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(150, Math.min(desiredHeight, openUp ? spaceAbove : spaceBelow));
    const width = Math.max(rect.width, Math.min(360, Math.max(230, rect.width)));
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
    setMenuStyle({
      position: "fixed",
      left: `${left}px`,
      top: openUp ? "auto" : `${rect.bottom + gap}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + gap}px` : "auto",
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return undefined;
    positionMenu();
    const handleOutside = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const reposition = () => positionMenu();
    window.addEventListener("pointerdown", handleOutside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (open && searchable) window.setTimeout(() => searchRef.current?.focus(), 0);
    if (!open) setQuery("");
  }, [open, searchable]);

  const choose = (option) => {
    if (option.disabled) return;
    onChange?.({ target: { value: option.value } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (["Enter", " ", "ArrowDown"].includes(event.key) && !open) { event.preventDefault(); setOpen(true); return; }
    if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
  };

  const menu = open && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef} className="qp-custom-select-menu qp-custom-select-portal" style={menuStyle} role="listbox">
      {searchable ? <div className="qp-custom-select-search"><Search size={15} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Qidirish..." /></div> : null}
      <div className="qp-custom-select-options">
        {filtered.length ? filtered.map((option) => {
          const active = option.value === String(value);
          return <button type="button" key={`${option.value}-${String(option.label)}`} className={active ? "is-active" : ""} onClick={() => choose(option)} disabled={option.disabled} role="option" aria-selected={active}><span>{option.label}</span>{active ? <Check size={15} /> : null}</button>;
        }) : <div className="qp-custom-select-empty">Natija topilmadi</div>}
      </div>
    </div>, document.body) : null;

  return <>
    <div ref={rootRef} className={`qp-custom-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`.trim()}>
      <button ref={triggerRef} type="button" className="qp-custom-select-trigger" onClick={() => !disabled && setOpen((current) => !current)} onKeyDown={handleKeyDown} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} disabled={disabled} {...triggerProps}>
        <span className={selected ? "" : "qp-custom-select-placeholder"}>{selected?.label ?? placeholder}</span><ChevronDown size={16} strokeWidth={1.9} />
      </button>
    </div>
    {menu}
  </>;
}
export default Select;
