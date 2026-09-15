import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

function PinKeypad({ value, onChange, disabled = false, label = "PIN", error = "", lockSeconds = 0, maxLength = 6 }) {
  const digits = Array.from({ length: maxLength }, (_, index) => value[index] || "");
  const press = (key) => {
    if (disabled || lockSeconds > 0) return;
    if (key === "delete") onChange(value.slice(0, -1));
    else if (key && value.length < maxLength) onChange(`${value}${key}`);
  };

  return (
    <div className="qp-pin-keypad" aria-label={label}>
      <div className="qp-pin-dots" aria-live="polite">
        {digits.map((digit, index) => <i key={index} className={digit ? "filled" : ""}><span className="qp-sr-only">{digit ? "Kiritildi" : "Bo‘sh"}</span></i>)}
      </div>
      {error ? <div className="qp-pin-feedback is-error" role="alert">{error}</div> : null}
      {lockSeconds > 0 ? <div className="qp-pin-feedback is-locked" role="status">Ko‘p noto‘g‘ri urinish. {lockSeconds} soniyadan keyin qayta urinib ko‘ring.</div> : null}
      <div className="qp-pin-keys">
        {KEYS.map((key, index) => key ? (
          <button key={key} type="button" disabled={disabled || lockSeconds > 0} onClick={() => press(key)} aria-label={key === "delete" ? "Oxirgi raqamni o‘chirish" : `${key} raqami`}>
            {key === "delete" ? <Delete size={22} /> : key}
          </button>
        ) : <span key={`empty-${index}`} aria-hidden="true" />)}
      </div>
    </div>
  );
}

export default PinKeypad;
