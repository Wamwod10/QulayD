import { Check, Minus } from "lucide-react";

import "./Checkbox.scss";

function Checkbox({ checked = false, indeterminate = false, onChange, disabled = false, ariaLabel = "", className = "", onClick = null }) {
  return (
    <button
      type="button"
      className={`qp-checkbox ${checked || indeterminate ? "is-checked" : ""} ${className}`.trim()}
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      role="checkbox"
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onChange?.(!checked);
      }}
    >
      {indeterminate ? <Minus size={13} strokeWidth={2.5} /> : checked ? <Check size={13} strokeWidth={2.5} /> : null}
    </button>
  );
}

export default Checkbox;
