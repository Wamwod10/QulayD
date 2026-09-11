import styles from "./Card.module.scss";

function Card({
  children,
  className = "",
  padding = "md",
  hoverable = false,
  ...props
}) {
  const classNames = [
    styles.card,
    styles[padding],
    hoverable ? styles.hoverable : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}

export default Card;
