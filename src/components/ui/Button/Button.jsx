import styles from "./Button.module.scss";

function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    loading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}

      {!loading && iconLeft && <span className={styles.icon}>{iconLeft}</span>}

      <span className={styles.label}>{children}</span>

      {!loading && iconRight && (
        <span className={styles.icon}>{iconRight}</span>
      )}
    </button>
  );
}

export default Button;
