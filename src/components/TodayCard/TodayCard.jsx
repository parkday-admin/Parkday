import { useEffect, useState } from 'react'
import { fetchExpenses } from '../../lib/expenses'
import { categoryMeta } from '../../lib/categories'
import { tripDays, tripDayNumberForToday, dayTypeInfo } from '../../lib/trips'
import styles from './TodayCard.module.css'

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

// Dashboard summary of today's plan for whichever trip is currently
// date-active — see lib/trips.js's dateActiveTrip. Only ever rendered when
// that trip exists, so it always has a real day to describe.
export default function TodayCard({ trip, onOpen }) {
  const [expenses, setExpenses] = useState(null)

  useEffect(() => {
    let cancelled = false
    setExpenses(null)
    fetchExpenses(trip.id).then(({ data }) => { if (!cancelled) setExpenses(data ?? []) })
    return () => { cancelled = true }
  }, [trip.id])

  if (expenses === null) return null

  const dayNum = tripDayNumberForToday(trip)
  const today = tripDays(trip).find(d => d.day === dayNum)
  if (!today) return null

  const { label, icon } = dayTypeInfo(trip, expenses, dayNum)
  const dayEntries = expenses.filter(e => e.day === dayNum && e.cat !== 'park_day')
  const timed = dayEntries.filter(e => e.time).sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time))
  const upNext = timed.find(e => timeSortKey(e.time) > nowMinutes())

  const planned = dayEntries.reduce((s, e) => s + (e.planned_amt || 0), 0)
  const actual = dayEntries.filter(e => e.actual_amt != null).reduce((s, e) => s + e.actual_amt, 0)

  return (
    <div className={styles.card} onClick={onOpen}>
      <div className={styles.hdr}>
        <div className={styles.hdrLeft}>
          {icon && <i className={`ti ${icon} ${styles.hdrIcon}`} />}
          <div className={styles.hdrText}>
            <div className={styles.hdrTitle}>{label}</div>
            <div className={styles.hdrSub}>Day {dayNum} · {fmtDayDate(today.date)}</div>
          </div>
        </div>

        <div className={styles.hdrStats}>
          <div className={styles.hdrStat}>
            <div className={styles.hdrStatLbl}>Planned</div>
            <div className={styles.hdrStatVal} style={{ color: 'var(--sky)' }}>{fmt(planned)}</div>
          </div>
          <div className={styles.hdrStat}>
            <div className={styles.hdrStatLbl}>Spent</div>
            <div className={styles.hdrStatVal} style={{ color: 'var(--coral)' }}>{fmt(actual)}</div>
          </div>
        </div>

        <div className={styles.hdrBadge}>Today</div>
      </div>

      <div className={styles.body}>
        {dayEntries.length === 0 ? (
          <div className={styles.row}>
            <div className={styles.rowText}>Nothing planned for today</div>
            <div className={styles.seeFull}>See full day <i className="ti ti-arrow-right" /></div>
          </div>
        ) : (
          <>
            {upNext && (
              <div className={styles.row}>
                <div className={styles.rowLbl}>Up Next</div>
                <div className={styles.upNext}>
                  <div className={styles.upNextIcon} style={{ background: categoryMeta(upNext.cat).bg }}>
                    <i className={`ti ${categoryMeta(upNext.cat).icon}`} style={{ color: categoryMeta(upNext.cat).color }} />
                  </div>
                  <div className={styles.upNextName}>{upNext.label || categoryMeta(upNext.cat).label}</div>
                  <div className={styles.upNextTime}>{upNext.time}</div>
                </div>
              </div>
            )}

            <div className={styles.row}>
              <div className={styles.rowText}>{dayEntries.length} item{dayEntries.length === 1 ? '' : 's'} planned today</div>
              <div className={styles.seeFull}>See full day <i className="ti ti-arrow-right" /></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
