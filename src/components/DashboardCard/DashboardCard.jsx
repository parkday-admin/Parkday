import styles from './DashboardCard.module.css'

// The one card anatomy every dashboard card shares: 28px/8px icon tile +
// 13px title + 11px sub in the header, "View all" as the only action label,
// white surface, 1px border, 14px radius. Rows are up to each card (icon +
// label/meta + a value or badge varies too much to generalize further).
export default function DashboardCard({ icon, iconBg, iconColor, title, sub, onView, viewLabel = 'View all', children, footer, cardId, cardRef, style, dragHandleProps }) {
  return (
    <div ref={cardRef} style={style} className={styles.card}>
      <div className={styles.hdr}>
        <div className={styles.hdrLeft}>
          <div className={styles.iconTile} style={{ background: iconBg }}><i aria-hidden="true" className={`ti ${icon}`} style={{ color: iconColor }} /></div>
          <div>
            <div className={styles.title}>{title}</div>
            {sub && <div className={styles.sub}>{sub}</div>}
          </div>
        </div>
        <div className={styles.hdrRight}>
          {dragHandleProps && (
            <div
              className={styles.dragHandle}
              role="button"
              tabIndex={0}
              aria-label={`Reorder ${title} card. Use arrow keys to move.`}
              data-drag-handle={cardId}
              {...dragHandleProps}
            ><i aria-hidden="true" className="ti ti-grip-vertical" /></div>
          )}
          {onView && (
            <button type="button" className={styles.viewAll} onClick={onView}>{viewLabel} <i aria-hidden="true" className="ti ti-chevron-right" /></button>
          )}
        </div>
      </div>
      {children}
      {footer}
    </div>
  )
}
