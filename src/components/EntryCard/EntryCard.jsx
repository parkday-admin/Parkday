import { useRef, useState } from 'react'
import { LL_TYPE_LABEL } from '../../lib/categories'
import styles from './EntryCard.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

const STATUS_STYLE = {
  confirmed: { label: 'Confirmed', cls: 'pillConfirmed' },
  waitlist: { label: 'Waitlist', cls: 'pillWaitlist' },
}

// Shared entry row for both CategoryDetail (grouped by day, one category) and
// Itinerary (grouped by day, all categories) — swipe-to-delete, tap-to-edit,
// and the planned/actual amount + delta display are identical in both.
export default function EntryCard({ entry, meta, dayLabel, onEdit, onDelete }) {
  const [dx, setDx] = useState(0)
  const [swiped, setSwiped] = useState(false)
  const dragging = useRef(false)
  const start = useRef({ x: 0, y: 0 })

  function onPointerDown(e) {
    dragging.current = true
    start.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerMove(e) {
    if (!dragging.current) return
    const deltaX = e.clientX - start.current.x
    const deltaY = e.clientY - start.current.y
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
      setDx(Math.max(-80, deltaX))
      setSwiped(false)
    }
  }
  function onPointerUp(e) {
    if (!dragging.current) return
    dragging.current = false
    const deltaX = e.clientX - start.current.x
    if (deltaX < -50) { setSwiped(true); setDx(0) } else { setSwiped(false); setDx(0) }
  }

  const statusInfo = entry.status && STATUS_STYLE[entry.status]
  const hasActual = entry.actual_amt != null
  const delta = hasActual ? (entry.planned_amt || 0) - entry.actual_amt : 0
  const underBudget = delta >= 0

  return (
    <div className={styles.entryWrap}>
      <div className={styles.entryDeleteReveal} onClick={() => onDelete(entry)}>
        <i className="ti ti-trash" /><span>Delete</span>
      </div>
      <div
        className={`${styles.entry} ${entry.status ? styles[entry.status] : hasActual ? styles.paid : ''} ${swiped ? styles.swiped : ''}`}
        style={dx ? { transform: `translateX(${dx}px)`, transition: 'none' } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => !swiped && dx === 0 && onEdit(entry)}
      >
        <div className={styles.entryIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
        <div className={styles.entryBody}>
          <div className={styles.entryName}>{entry.label || meta.label}</div>
          <div className={styles.entryMeta}>
            {dayLabel && <span>{dayLabel}</span>}
            {entry.time && <span>{entry.time}</span>}
            {entry.cat === 'll' && entry.ll_type && <span className={styles.pill}>{LL_TYPE_LABEL[entry.ll_type] || entry.ll_type}</span>}
            {statusInfo && <span className={`${styles.pill} ${styles[statusInfo.cls]}`}>{statusInfo.label}</span>}
          </div>
        </div>
        {!entry.no_cost && (
          <div className={styles.entryAmts}>
            {hasActual ? (
              <>
                <div className={styles.entryStrike}>{fmt(entry.planned_amt)}</div>
                <div className={styles.entryPaidRow}>
                  <span className={styles.entryActualAmt} style={{ color: underBudget ? 'var(--teal-dark)' : 'var(--coral)' }}>{fmt(entry.actual_amt)}</span>
                  <span className={`${styles.entryDelta} ${underBudget ? styles.deltaUnder : styles.deltaOver}`}>
                    {underBudget ? '-' : '+'}{fmt(Math.abs(delta))}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.entryPlanned}>{fmt(entry.planned_amt)}</div>
                <div className={styles.entryPlannedLbl}>planned</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
