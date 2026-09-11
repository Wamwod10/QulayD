import styles from "./StatusBadge.module.scss";

function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}) {
  const classNames = [styles.badge, styles[tone], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classNames}>
      {dot && <span className={styles.dot} aria-hidden="true" />}

      <span>{children}</span>
    </span>
  );
}

export default StatusBadge;
