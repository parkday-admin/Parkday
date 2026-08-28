import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/expenses'
import { categoryMeta } from '../lib/categories'
import { dateActiveTrip, tripDays, tripDayNumberForToday, dayTypeInfo } from '../lib/trips'
import styles from './TodayFullView.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function timeSortKey(t) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((t || '').trim())
  if (!m) return -1
  let h = Number(m[1])
  if (m[3]) {
    if (/PM/i.test(m[3]) && h !== 12) h += 12
    if (/AM/i.test(m[3]) && h === 12) h = 0
  }
  return h * 60 + Number(m[2])
}

function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function fmtDayDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const STATUS_STYLE = {
  confirmed: { label: 'Confirmed', cls: 'pillConfirmed' },
  waitlist: { label: 'Waitlist', cls: 'pillWaitlist' },
}

// Read-only day-of reference, opened only from the dashboard's Today card.
// Deliberately has no editing affordances — that's the By Day tab's job.
export default function TodayFullView() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { trips, loading } = outletContext ?? { trips: null, loading: true }
  const [expenses, setExpenses] = useState(null)
  // Bumped on tab focus so "up next" stays current if the app is left open
  // past the next scheduled entry's time.
  const [, setTick] = useState(0)

  const trip = dateActiveTrip(trips)

  useEffect(() => {
    if (!trip) { setExpenses(null); return }
    let cancelled = false
    setExpenses(null)
    fetchExpenses(trip.id).then(({ data }) => { if (!cancelled) setExpenses(data ?? []) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id])

  useEffect(() => {
    function onVisible() { if (document.visibilityState === 'visible') setTick(t => t + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (loading || (trip && expenses === null)) return null

  // No date-active trip (e.g. reached this URL directly outside a trip
  // window) — nothing to show, back to the dashboard.
  if (!trip) { navigate('/dashboard', { replace: true }); return null }

  const days = tripDays(trip)
  const dayNum = tripDayNumberForToday(trip)
  const day = days.find(d => d.day === dayNum)
  const { label } = dayTypeInfo(trip, expenses, dayNum)

  const dayEntries = expenses.filter(e => e.day === dayNum && e.cat !== 'park_day')
  const timed = dayEntries.filter(e => e.time).sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time))
  const untimed = dayEntries.filter(e => !e.time)
  const sorted = [...timed, ...untimed]

  const upNext = timed.find(e => timeSortKey(e.time) > nowMinutes())

  const planned = dayEntries.reduce((s, e) => s + (e.planned_amt || 0), 0)
  const actual = dayEntries.filter(e => e.actual_amt != null).reduce((s, e) => s + e.actual_amt, 0)
  const remaining = planned - actual

  return (
    <div className={styles.page}>
      <div className={styles.hdr}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/dashboard')}>
          <i className="ti ti-arrow-left" />
        </button>
        <div className={styles.hdrCenter}>
          <div className={styles.hdrTitle}><span className={styles.hdrPark}>{label}</span> · {fmtDayDate(day.date)}</div>
        </div>
        <div className={styles.hdrDay}>Day {dayNum} of {days.length}</div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLbl}>Planned</div>
          <div className={styles.summaryVal} style={{ color: 'var(--sky)' }}>{fmt(planned)}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLbl}>Spent</div>
          <div className={styles.summaryVal} style={{ color: 'var(--coral)' }}>{fmt(actual)}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLbl}>Remaining</div>
          <div className={styles.summaryVal} style={{ color: remaining >= 0 ? 'var(--teal)' : 'var(--coral)' }}>{fmt(remaining)}</div>
        </div>
      </div>

      <div className={styles.list}>
        {sorted.length === 0 ? (
          <div className={styles.empty}>
            <i className={`ti ti-calendar-off ${styles.emptyIcon}`} />
            <div className={styles.emptyText}>Nothing planned for today</div>
          </div>
        ) : (
          sorted.map(e => {
            const meta = categoryMeta(e.cat)
            const statusInfo = e.status && STATUS_STYLE[e.status]
            const hasActual = e.actual_amt != null
            const isUpNext = upNext && e.id === upNext.id
            return (
              <div key={e.id} className={`${styles.entry} ${isUpNext ? styles.upNext : ''}`}>
                {isUpNext && <div className={styles.upNextPill}>Up Next</div>}
                <div className={styles.entryIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
                <div className={styles.entryBody}>
                  <div className={styles.entryName}>{e.label || meta.label}</div>
                  <div className={styles.entryMeta}>
                    {e.time && <span>{e.time}</span>}
                    {e.cat === 'll' && e.ll_type && <span className={styles.pill}>{e.ll_type === 'singlepass' ? 'Single Pass' : 'Multi Pass'}</span>}
                    {statusInfo && <span className={`${styles.pill} ${styles[statusInfo.cls]}`}>{statusInfo.label}</span>}
                  </div>
                </div>
                <div className={styles.entryAmts}>
                  {hasActual ? (
                    <div className={styles.entryActual}>{fmt(e.actual_amt)}</div>
                  ) : (
                    <>
                      <div className={styles.entryPlanned}>{fmt(e.planned_amt)}</div>
                      <div className={styles.entryPlannedLbl}>planned</div>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
