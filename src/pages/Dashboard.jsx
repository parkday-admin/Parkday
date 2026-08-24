import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/trips'
import { CATEGORY_ORDER, categoryMeta } from '../lib/categories'
import styles from './Dashboard.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDayDate(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDOW(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

function dateForDay(arrivalDate, dayNum) {
  const d = parseLocalDate(arrivalDate)
  d.setDate(d.getDate() + (dayNum - 1))
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function countdown(trip) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const arrival = parseLocalDate(trip.arrival_date)
  const departure = parseLocalDate(trip.departure_date)
  const daysToArrival = Math.round((arrival - today) / 86400000)

  if (daysToArrival > 0) return { big: String(daysToArrival), label: daysToArrival === 1 ? 'day until your trip' : 'days until your trip' }
  if (today <= departure) return { big: '🎉', label: "you're at Disney!" }
  return { big: '✓', label: 'trip complete' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { activeTrip, loading } = outletContext ?? { activeTrip: null, loading: true }
  const [expenses, setExpenses] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeTrip) { setExpenses(null); return }
    let cancelled = false
    setExpenses(null)
    fetchExpenses(activeTrip.id).then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      else setExpenses(data)
    })
    return () => { cancelled = true }
  }, [activeTrip])

  if (loading) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 90 }} />
        <div className={styles.skelBlock} style={{ height: 220 }} />
        <div className={styles.skelBlock} style={{ height: 160 }} />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-map-pin ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>Ready to plan your park day?</h1>
        <p className={styles.emptySubhead}>Set up your first trip to get started.</p>
        <button className={styles.planBtn} onClick={() => navigate('/configurator')}>
          Plan a trip
        </button>
      </div>
    )
  }

  if (expenses === null) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 90 }} />
        <div className={styles.skelBlock} style={{ height: 220 }} />
        <div className={styles.skelBlock} style={{ height: 160 }} />
      </div>
    )
  }

  const catRows = expenses.filter(e => e.day === null)
  const dayRows = expenses.filter(e => e.day !== null).sort((a, b) => a.day - b.day)

  const budgeted = catRows.reduce((s, e) => s + (e.planned_amt || 0), 0)
  const spent = catRows.reduce((s, e) => s + (e.actual_amt || 0), 0)
  const remaining = budgeted - spent
  const pct = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0

  const cats = CATEGORY_ORDER
    .map(cat => ({ cat, row: catRows.find(r => r.cat === cat) }))
    .filter(({ row }) => row)

  const cd = countdown(activeTrip)
  const plannedCount = expenses.filter(e => e.actual_amt > 0).length
  const planPct = expenses.length > 0 ? Math.round((plannedCount / expenses.length) * 100) : 0

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.countdownCard}>
        <div className={styles.cdLeft}>
          <div className={styles.cdBig}>{cd.big}</div>
          <div className={styles.cdLbl}>{cd.label}</div>
        </div>
        <div className={styles.cdRight}>
          <div className={styles.cdTripName}>{activeTrip.name}</div>
          <div className={styles.cdTripDates}>
            {fmtDayDate(activeTrip.arrival_date)} – {fmtDayDate(activeTrip.departure_date)}
            {activeTrip.accommodation ? ` · ${activeTrip.accommodation}` : ''}
          </div>
        </div>
        <div className={styles.cdBarTrack}><div className={styles.cdBarFill} style={{ width: `${planPct}%` }} /></div>
      </div>

      <div className={styles.budgetCard}>
        <div className={styles.bcHeader} onClick={() => navigate('/budget')}>
          <div className={styles.bcTop}>
            <div>
              <div className={styles.bcLbl}>Trip budget</div>
              <div className={styles.bcNum}>{fmt(budgeted)}</div>
            </div>
            <div className={styles.bcRight}>
              <div className={styles.bcRemainingLbl}>Remaining</div>
              <div className={styles.bcRemaining}>{fmt(remaining)}</div>
            </div>
          </div>
          <div className={styles.bcBarTrack}><div className={styles.bcBarFill} style={{ width: `${pct}%` }} /></div>
          <div className={styles.bcSub}>{fmt(budgeted)} planned · {fmt(spent)} spent · {pct}% of budget spent</div>
          <div className={styles.bcFooter}>
            <div className={styles.bcFooterStat}><div className={styles.bcFooterLbl}>Budgeted</div><div className={styles.bcFooterVal} style={{ color: 'var(--gold)' }}>{fmt(budgeted)}</div></div>
            <div className={styles.bcDivider} />
            <div className={styles.bcFooterStat}><div className={styles.bcFooterLbl}>Planned</div><div className={styles.bcFooterVal} style={{ color: 'var(--sky)' }}>{fmt(budgeted)}</div></div>
            <div className={styles.bcDivider} />
            <div className={styles.bcFooterStat}><div className={styles.bcFooterLbl}>Spent</div><div className={styles.bcFooterVal} style={{ color: 'var(--coral)' }}>{fmt(spent)}</div></div>
            <div className={styles.bcDivider} />
            <div className={styles.bcFooterStat}><div className={styles.bcFooterLbl}>Remaining</div><div className={styles.bcFooterVal} style={{ color: 'var(--teal)' }}>{fmt(remaining)}</div></div>
          </div>
        </div>
        <div className={styles.bcBody}>
          {cats.length === 0 ? (
            <div className={styles.bcEmpty}>No budget categories yet.</div>
          ) : cats.map(({ cat, row }) => {
            const meta = categoryMeta(cat)
            const rowPct = row.planned_amt > 0 ? Math.min(100, Math.round(((row.actual_amt || 0) / row.planned_amt) * 100)) : 0
            return (
              <div key={cat} className={styles.bcCatRow} onClick={() => navigate('/budget')}>
                <div className={styles.bcCatLeft}>
                  <div className={styles.bcCatDot} style={{ background: meta.color }} />
                  <div className={styles.bcCatName}>{meta.label}</div>
                </div>
                <div className={styles.bcCatRight}>
                  <span className={styles.bcCatSpent}>{fmt(row.actual_amt)} / {fmt(row.planned_amt)}</span>
                  <div className={styles.bcCatProg}><div className={styles.bcCatProgFill} style={{ width: `${rowPct}%`, background: meta.color }} /></div>
                </div>
              </div>
            )
          })}
        </div>
        <div className={styles.bcView} onClick={() => navigate('/budget')}>View full budget <i className="ti ti-chevron-right" style={{ fontSize: 12 }} /></div>
      </div>

      <div className={styles.itinCard}>
        <div className={styles.itinHdr}>
          <div className={styles.itinHdrL}>
            <div className={styles.itinIcon}><i className="ti ti-calendar" /></div>
            <div>
              <div className={styles.itinTitle}>Itinerary</div>
              <div className={styles.itinSub}>{dayRows.length} park day{dayRows.length !== 1 ? 's' : ''} planned</div>
            </div>
          </div>
          <div className={styles.itinView} onClick={() => navigate('/itinerary')}>View <i className="ti ti-chevron-right" /></div>
        </div>
        <div className={styles.dashDayRows}>
          {dayRows.length === 0 ? (
            <div className={styles.bcEmpty}>No park days planned yet.</div>
          ) : dayRows.map(d => {
            const date = dateForDay(activeTrip.arrival_date, d.day)
            const hasSpend = d.actual_amt > 0
            return (
              <div key={d.id} className={styles.dayRow}>
                <div className={styles.dayChip}>
                  <div className={styles.dayChipNum}>{d.day}</div>
                  <div className={styles.dayChipLbl}>{fmtDOW(date)}</div>
                </div>
                <div className={styles.dayInfo}>
                  <div className={styles.dayPark}>{d.label}</div>
                  <div className={styles.dayDate}>{fmtDayDate(date)}</div>
                </div>
                <div className={styles.dayStatus}>
                  <span className={`${styles.pill} ${hasSpend ? styles.pg : styles.pz}`}>{hasSpend ? 'Logged' : 'Planned'}</span>
                  {d.planned_amt > 0 && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fmt(d.planned_amt)} planned</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
