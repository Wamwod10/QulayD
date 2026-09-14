import { ArrowLeft, ArrowUpRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

import SectionNavigation from "../navigation/SectionNavigation";
import { getLabel, getStatusTone } from "../../utils/labels";
import { getDisplayValue } from "../../utils/displayValue";

export function PageShell({ title, description = "", actions = null, children, eyebrow = "" }) {
  return (
    <div className="qp-page">
      <SectionNavigation />
      <div className="qp-page-head">
        <div className="qp-page-title-wrap">
          {eyebrow ? <div className="qp-eyebrow">{getDisplayValue(eyebrow)}</div> : null}
          <h1>{getDisplayValue(title)}</h1>
          {description ? <p>{getDisplayValue(description)}</p> : null}
        </div>
        {actions ? <div className="qp-head-actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function SectionCard({ title = "", description = "", actions = null, children, className = "" }) {
  return (
    <section className={`qp-card ${className}`.trim()}>
      {title || actions ? (
        <div className="qp-card-head">
          <div>
            {title ? <h2>{getDisplayValue(title)}</h2> : null}
            {description ? <p>{getDisplayValue(description)}</p> : null}
          </div>
          {actions ? <div className="qp-card-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return <button className={`qp-button qp-button-primary ${className}`.trim()} {...props}>{children}</button>;
}

export function SecondaryButton({ children, className = "", ...props }) {
  return <button className={`qp-button qp-button-secondary ${className}`.trim()} {...props}>{children}</button>;
}

export function GhostButton({ children, className = "", ...props }) {
  return <button className={`qp-button qp-button-ghost ${className}`.trim()} {...props}>{children}</button>;
}

export function StatusPill({ status, label = "" }) {
  const tone = getStatusTone(status);
  return <span className={`qp-status qp-status-${tone}`}>{getDisplayValue(label || getLabel(status))}</span>;
}

export function SearchBox({ value, onChange, placeholder = "Qidirish..." }) {
  return <input className="qp-input qp-search" type="search" value={value} onChange={onChange} placeholder={placeholder} />;
}

export function Modal({ open, title, description = "", onClose, children, wide = false }) {
  useOverlayLifecycle(open, onClose);
  if (!open) return null;
  return (
    <div className="qp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`qp-modal ${wide ? "qp-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={getDisplayValue(title)}>
        <div className="qp-modal-head">
          <div><h2>{getDisplayValue(title)}</h2>{description ? <p>{getDisplayValue(description)}</p> : null}</div>
          <button className="qp-icon-button qp-overlay-close" type="button" onClick={onClose} aria-label="Yopish"><ArrowLeft className="qp-overlay-back-icon" size={19} /><X className="qp-overlay-x-icon" size={18} /></button>
        </div>
        <div className="qp-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ open, title, description = "", onClose, children, actions = null }) {
  useOverlayLifecycle(open, onClose);
  if (!open) return null;
  return (
    <div className="qp-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="qp-drawer" role="dialog" aria-modal="true" aria-label={getDisplayValue(title)}>
        <div className="qp-drawer-head">
          <div>
            <div className="qp-eyebrow">Tezkor ko‘rinish</div>
            <h2>{getDisplayValue(title)}</h2>
            {description ? <p>{getDisplayValue(description)}</p> : null}
          </div>
          <button className="qp-icon-button qp-overlay-close" type="button" onClick={onClose} aria-label="Yopish"><ArrowLeft className="qp-overlay-back-icon" size={19} /><X className="qp-overlay-x-icon" size={18} /></button>
        </div>
        <div className="qp-drawer-body">{children}</div>
        {actions ? <div className="qp-drawer-actions">{actions}</div> : null}
      </aside>
    </div>
  );
}

function useOverlayLifecycle(open, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}

export function Field({ label, children, hint = "" }) {
  return <label className="qp-field"><span>{getDisplayValue(label)}</span>{children}{hint ? <small>{getDisplayValue(hint)}</small> : null}</label>;
}

export function EmptyBlock({ title = "Ma’lumot yo‘q", description = "Bu yerda hozircha ma’lumot mavjud emas." }) {
  return <div className="qp-empty"><strong>{getDisplayValue(title)}</strong><span>{getDisplayValue(description)}</span></div>;
}

export function SummaryGrid({ children, className = "", compact = false }) {
  return <div className={`qp-summary-grid ${compact ? "qp-summary-grid-compact" : ""} ${className}`.trim()}>{children}</div>;
}

export function SummaryItem({ label, value, hint = "", icon = null, tone = "", className = "" }) {
  return <div className={`qp-summary-card ${tone ? `is-${tone}` : ""} ${className}`.trim()}><div className="qp-summary-card-top qp-metric-top"><span>{getDisplayValue(label)}</span>{icon ? <i>{icon}</i> : null}</div><strong>{getDisplayValue(value)}</strong>{hint ? <small>{getDisplayValue(hint)}</small> : null}</div>;
}

export function Metric({ label, value, hint = "", icon = null }) {
  return <SummaryItem className="qp-metric" label={label} value={value} hint={hint} icon={icon} />;
}

export function QuickLink({ to, title, description, icon }) {
  return (
    <NavLink className="qp-quick-link" to={to}>
      <span className="qp-quick-link-icon">{icon}</span>
      <span className="qp-quick-link-copy"><strong>{title}</strong><small>{description}</small></span>
      <ArrowUpRight size={15} />
    </NavLink>
  );
}
