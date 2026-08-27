import styles from './DashboardCard.module.css'

// The one card anatomy every dashboard card shares: 28px/8px icon tile +
// 13px title + 11px sub in the header, "View all" as the only action label,
// white surface, 1px border, 14px radius. Rows are up to each card (icon +
// label/meta + a value or badge varies too much to generalize further).
export default function DashboardCard({ icon, iconBg, iconColor, title, sub, onView, viewLabel = 'View all', children, footer, cardRef, style, dragHandleProps }) {
  return (
    <div ref={cardRef} style={style} className={styles.card}>
      <div className={styles.hdr}>
        <div className={styles.hdrLeft}>
          <div className={styles.iconTile} style={{ background: iconBg }}><i className={`ti ${icon}`} style={{ color: iconColor }} /></div>
          <div>
            <div className={styles.title}>{title}</div>
            {sub && <div className={styles.sub}>{sub}</div>}
          </div>
        </div>
        <div className={styles.hdrRight}>
          {dragHandleProps && (
            <div className={styles.dragHandle} {...dragHandleProps}><i className="ti ti-grip-vertical" /></div>
          )}
          {onView && (
            <div className={styles.viewAll} onClick={onView}>{viewLabel} <i className="ti ti-chevron-right" /></div>
          )}
        </div>
      </div>
      {children}
      {footer}
    </div>
  )
}
