import styles from "./PageHeader.module.scss";

function PageHeader({ title, description, eyebrow, actions, children }) {
  return (
    <div className={styles.pageHeader}>
      <div className={styles.content}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}

        <div className={styles.titleGroup}>
          <h1>{title}</h1>

          {description && <p>{description}</p>}
        </div>

        {children}
      </div>

      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export default PageHeader;
