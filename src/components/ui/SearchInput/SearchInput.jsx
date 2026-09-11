import { Search, X } from "lucide-react";

import styles from "./SearchInput.module.scss";

function SearchInput({
  value,
  onChange,
  placeholder = "Qidirish...",
  onClear,
  className = "",
  ...props
}) {
  const hasValue = Boolean(value);

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }

    if (onChange) {
      onChange({
        target: {
          value: "",
        },
      });
    }
  };

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <Search size={17} strokeWidth={1.8} className={styles.searchIcon} />

      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="Qidiruvni tozalash"
        >
          <X size={15} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
