import { useEffect, useRef, useState } from 'react'
import { LL_TYPE_LABEL } from '../../lib/categories'
import { LL_TIER_LABEL, DINING_TIER_LABEL, llTierToExpenseType } from '../../lib/wishlist'
import styles from './EntryCard.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

// Swipe-to-delete has no visible hint of its own existence — the app's
// bare first entry card briefly peeks the reveal once per session so the
// gesture is discoverable without an intrusive tutorial. Module-level flag
// (not per-instance state) so exactly one card across the whole app claims
// it, regardless of which list mounts first.
const SWIPE_HINT_KEY = 'pkd_swipe_hint_shown'
let swipeHintClaimedThisLoad = false
function claimSwipeHint() {
  if (swipeHintClaimedThisLoad) return false
  try {
    if (sessionStorage.getItem(SWIPE_HINT_KEY)) return false
    sessionStorage.setItem(SWIPE_HINT_KEY, '1')
  } catch { /* storage unavailable — still show it once for this load */ }
  swipeHintClaimedThisLoad = true
  return true
}

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

  // The catalog's lightning_lane_tier pill (with real tier granularity) and
  // the expense's own ll_type pill (what was actually booked) usually agree
  // — only show ll_type when it diverges from what the tier implies (e.g.
  // the guest bought a Premier Pass for a Multi Pass ride), so a matching
  // pair doesn't render as two identical-looking pills.
  const impliedLlType = llTierToExpenseType(entry.lightning_lane_tier)
  const showLlTypePill = entry.cat === 'll' && entry.ll_type && entry.ll_type !== impliedLlType

  const statusInfo = entry.status && STATUS_STYLE[entry.status]
  const hasActual = entry.actual_amt != null
  const delta = hasActual ? (entry.planned_amt || 0) - entry.actual_amt : 0
  const underBudget = delta >= 0

  useEffect(() => {
    if (entry.no_cost || !claimSwipeHint()) return
    const peek = setTimeout(() => setDx(-28), 500)
    const settle = setTimeout(() => setDx(0), 1050)
    return () => { clearTimeout(peek); clearTimeout(settle) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.entryWrap}>
      <div className={styles.entryDeleteReveal} onClick={() => onDelete(entry)}>
        <i className="ti ti-trash" /><span>Delete</span>
      </div>
      <div
        className={`${styles.entry} ${swiped ? styles.swiped : ''}`}
        style={dx ? { transform: `translateX(${dx}px)`, transition: dragging.current ? 'none' : undefined } : undefined}
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
            {showLlTypePill && <span className={styles.pill}>{LL_TYPE_LABEL[entry.ll_type] || entry.ll_type}</span>}
            {statusInfo && <span className={`${styles.pill} ${styles[statusInfo.cls]}`}>{statusInfo.label}</span>}
            {entry.lightning_lane_tier && (
              <span className={styles.pill} style={{ background: 'rgba(44,165,141,0.18)', color: 'var(--teal-dark)' }}>
                <i className="ti ti-bolt" /> {LL_TIER_LABEL[entry.lightning_lane_tier] || entry.lightning_lane_tier}
              </span>
            )}
            {entry.dining_tier && (
              <span className={styles.pill} style={{ background: 'rgba(245,181,54,0.18)', color: 'var(--gold-dark)' }}>
                {DINING_TIER_LABEL[entry.dining_tier] || entry.dining_tier}
              </span>
            )}
            {entry.booth_name && (
              <span className={styles.pill} style={{ background: 'var(--steel-bg)', color: 'var(--sky-dark)' }}>
                <i className="ti ti-tent" /> {entry.booth_name}
              </span>
            )}
            {entry.festival && (
              <span className={styles.pill} style={{ background: 'var(--sunset-bg)', color: 'var(--sunset-dark)' }}>
                <i className="ti ti-confetti" /> {entry.festival}
              </span>
            )}
            {entry.location_detail && (
              <span className={styles.pill} style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>
                <i className="ti ti-map-pin" /> {entry.location_detail}
              </span>
            )}
          </div>
        </div>
        {!entry.no_cost && (
          <div className={styles.entryAmts}>
            {hasActual ? (
              <>
                <div className={styles.entryStrike}>{fmt(entry.planned_amt)}</div>
                <div className={styles.entryPaidRow}>
                  <span className={styles.entryActualAmt} style={{ color: underBudget ? 'var(--teal-dark)' : 'var(--coral)' }}>{fmt(entry.actual_amt)}</span>
                  {delta !== 0 && (
                    <span className={`${styles.entryDelta} ${underBudget ? styles.deltaUnder : styles.deltaOver}`}>
                      {underBudget ? '-' : '+'}{fmt(Math.abs(delta))}
                    </span>
                  )}
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
