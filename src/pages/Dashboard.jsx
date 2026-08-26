import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/expenses'
import { categoriesForTrip, categoryMeta, categoryTotals, findBudgetRow, isPackageBooking } from '../lib/categories'
import { giftFundsTotals } from '../lib/giftFunds'
import { daysUntil, effectiveFinalPaymentDate } from '../lib/trips'
import { fetchPayments, paymentsPaidTotal, paymentUrgencyLevel } from '../lib/payments'
import { urgencyLevel as reminderUrgencyLevel, URGENCY_LABEL as REMINDER_URGENCY_LABEL } from '../lib/reminders'
import Fab from '../components/Fab/Fab'
import styles from './Dashboard.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()
const URGENCY_CLASS = { high: 'upHigh', med: 'upMed', low: 'upLow' }

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
  const { activeTrip, loading, expensesVersion, openExpenseSheet, giftCards, rewardPrograms, reminders, userId } = outletContext ?? { activeTrip: null, loading: true }
  const [expenses, setExpenses] = useState(null)
  const [payments, setPayments] = useState(null)
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
  }, [activeTrip, expensesVersion])

  useEffect(() => {
    if (!activeTrip || !isPackageBooking(activeTrip)) { setPayments(null); return }
    let cancelled = false
    fetchPayments(userId, activeTrip.id).then(({ data }) => { if (!cancelled) setPayments(data) })
    return () => { cancelled = true }
  }, [activeTrip, userId])

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

  const dayRows = expenses.filter(e => e.cat === 'park_day').sort((a, b) => a.day - b.day)
  const dayTotals = dayNum => {
    const es = expenses.filter(e => e.day === dayNum && e.cat !== 'park_day')
    return { planned: es.reduce((s, e) => s + (e.planned_amt || 0), 0), count: es.length }
  }

  const cats = categoriesForTrip(activeTrip)
    .map(cat => {
      const es = expenses.filter(e => e.cat === cat)
      const { budgeted, planned, actual } = categoryTotals(es, cat)
      return { cat, budgeted, planned, actual }
    })
    .filter(c => c.budgeted > 0 || c.planned > 0)

  const budgeted = cats.reduce((s, c) => s + c.budgeted, 0)
  const planned = cats.reduce((s, c) => s + c.planned, 0)
  const spent = cats.reduce((s, c) => s + c.actual, 0)
  const remaining = budgeted - spent
  const pct = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0

  const cd = countdown(activeTrip)
  const plannedCount = expenses.filter(e => e.actual_amt > 0).length
  const planPct = expenses.length > 0 ? Math.round((plannedCount / expenses.length) * 100) : 0

  const remindersWithDaysOut = (reminders ?? [])
    .filter(r => !r.done && r.reminder_date != null)
    .map(r => ({ ...r, daysOut: daysUntil(r.reminder_date) }))
  const urgentReminders = remindersWithDaysOut.filter(r => r.daysOut <= 6)
  const upcomingReminders = remindersWithDaysOut.slice().sort((a, b) => a.daysOut - b.daysOut).slice(0, 2)

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}

      {urgentReminders.length > 0 && (
        <div className={styles.urgencyStrip} onClick={() => navigate('/reminders')}>
          <div className={styles.urgencyDot} />
          <div className={styles.urgencyText}>{urgentReminders.length} urgent reminder{urgentReminders.length === 1 ? '' : 's'}</div>
          <i className="ti ti-chevron-right" style={{ fontSize: 12, color: 'rgba(30,42,68,0.35)' }} />
        </div>
      )}

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
          <div className={styles.bcSub}>{fmt(planned)} planned · {fmt(spent)} spent · {pct}% of budget spent</div>
          <div className={styles.bcFooter}>
            <div className={styles.bcFooterStat}><div className={styles.bcFooterLbl}>Budgeted</div><div className={styles.bcFooterVal} style={{ color: 'var(--gold)' }}>{fmt(budgeted)}</div></div>
            <div className={styles.bcDivider} />
            <div className={styles.bcFooterStat}><div className={styles.bcFooterLbl}>Planned</div><div className={styles.bcFooterVal} style={{ color: 'var(--sky)' }}>{fmt(planned)}</div></div>
            <div className={styles.bcDivider} />
            <div className={styles.bcFooterStat}><div className={styles.bcFooterLbl}>Spent</div><div className={styles.bcFooterVal} style={{ color: 'var(--coral)' }}>{fmt(spent)}</div></div>
            <div className={styles.bcDivider} />
            <div className={styles.bcFooterStat}><div className={styles.bcFooterLbl}>Remaining</div><div className={styles.bcFooterVal} style={{ color: 'var(--teal)' }}>{fmt(remaining)}</div></div>
          </div>
        </div>
        <div className={styles.bcBody}>
          {cats.length === 0 ? (
            <div className={styles.bcEmpty}>No budget categories yet.</div>
          ) : cats.map(c => {
            const meta = categoryMeta(c.cat)
            const rowPct = c.budgeted > 0 ? Math.min(100, Math.round((c.actual / c.budgeted) * 100)) : 0
            return (
              <div key={c.cat} className={styles.bcCatRow} onClick={() => navigate(`/budget/${c.cat}`)}>
                <div className={styles.bcCatLeft}>
                  <div className={styles.bcCatDot} style={{ background: meta.color }} />
                  <div className={styles.bcCatName}>{meta.label}</div>
                </div>
                <div className={styles.bcCatRight}>
                  <span className={styles.bcCatSpent}>{fmt(c.actual)} / {fmt(c.budgeted)}</span>
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
          <div className={styles.itinView} onClick={() => navigate('/itinerary?day=1')}>View all <i className="ti ti-chevron-right" /></div>
        </div>
        <div className={styles.dashDayRows}>
          {dayRows.length === 0 ? (
            <div className={styles.bcEmpty}>No park days planned yet.</div>
          ) : dayRows.map(d => {
            const date = dateForDay(activeTrip.arrival_date, d.day)
            const { planned: dayPlanned, count } = dayTotals(d.day)
            return (
              <div key={d.id} className={styles.dayRow} onClick={() => navigate(`/itinerary?day=${d.day}`)}>
                <div className={styles.dayChip}>
                  <div className={styles.dayChipNum}>{d.day}</div>
                  <div className={styles.dayChipLbl}>{fmtDOW(date)}</div>
                </div>
                <div className={styles.dayInfo}>
                  <div className={styles.dayPark}>{d.label}</div>
                  <div className={styles.dayDate}>{fmtDayDate(date)}</div>
                </div>
                <div className={styles.dayStatus}>
                  <span className={styles.pill}>{dayPlanned > 0 ? fmt(dayPlanned) : '—'}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{count} {count === 1 ? 'entry' : 'entries'}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.itinCard}>
        <div className={styles.itinHdr}>
          <div className={styles.itinHdrL}>
            <div className={styles.itinIcon} style={{ background: 'rgba(224,83,63,0.12)' }}><i className="ti ti-bell" style={{ color: 'var(--coral)' }} /></div>
            <div className={styles.itinTitle}>Upcoming reminders</div>
          </div>
          <div className={styles.itinView} onClick={() => navigate('/reminders')}>View all <i className="ti ti-chevron-right" /></div>
        </div>
        <div className={styles.dashDayRows}>
          {upcomingReminders.length === 0 ? (
            <div className={styles.bcEmpty} style={{ padding: '16px 15px' }}>No upcoming reminders.</div>
          ) : upcomingReminders.map(r => {
            const lvl = reminderUrgencyLevel(r.daysOut)
            return (
              <div key={r.id} className={styles.drrRow} onClick={() => navigate('/reminders')}>
                <div className={styles.drrIcon} style={{ background: r.bg }}><i className={`ti ${r.icon}`} style={{ color: r.color }} /></div>
                <div className={styles.dayInfo}>
                  <div className={styles.dayPark}>{r.title}</div>
                  <div className={styles.dayDate}>{r.daysOut > 0 ? `in ${r.daysOut} day${r.daysOut === 1 ? '' : 's'}` : r.daysOut === 0 ? 'Today' : 'Past due'}</div>
                </div>
                <span className={`${styles.urgencyPill} ${styles[URGENCY_CLASS[lvl]]}`}>{REMINDER_URGENCY_LABEL[lvl]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {isPackageBooking(activeTrip) && payments && (() => {
        const packageRow = findBudgetRow(expenses.filter(e => e.cat === 'package'), 'package')
        const totalCost = packageRow?.planned_amt || 0
        const paid = paymentsPaidTotal(payments)
        const remaining = Math.max(0, totalCost - paid)
        const finalPaymentDate = effectiveFinalPaymentDate(activeTrip)
        const daysOut = daysUntil(finalPaymentDate) ?? 0
        const lvl = paymentUrgencyLevel(daysOut)
        const dueColor = remaining <= 0 ? 'var(--teal-dark)' : lvl === 'high' ? 'var(--coral)' : lvl === 'med' ? '#8a5a00' : 'var(--text-tertiary)'
        return (
          <div className={styles.itinCard}>
            <div className={styles.itinHdr}>
              <div className={styles.itinHdrL}>
                <div className={styles.itinIcon}><i className="ti ti-receipt-2" /></div>
                <div className={styles.itinTitle}>Resort Package payments</div>
              </div>
              <div className={styles.itinView} onClick={() => navigate('/payments')}>View <i className="ti ti-chevron-right" /></div>
            </div>
            <div className={styles.dprBody}>
              <div className={styles.dprRow}>
                <div><div className={styles.dprLbl}>Paid to date</div><div className={styles.dprSub}>{payments.length} payment{payments.length === 1 ? '' : 's'} logged</div></div>
                <div><div className={styles.dprAmt}>{fmt(paid)}</div><div className={styles.dprStatus} style={{ color: 'var(--teal-dark)' }}>of {fmt(totalCost)}</div></div>
              </div>
              <div className={styles.dprRow}>
                <div><div className={styles.dprLbl}>{remaining <= 0 ? 'Package paid in full' : 'Remaining balance'}</div><div className={styles.dprSub}>{remaining <= 0 ? 'Nothing further will be charged' : `Final payment ${finalPaymentDate ? new Date(finalPaymentDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`}</div></div>
                <div><div className={styles.dprAmt}>{fmt(remaining)}</div><div className={styles.dprStatus} style={{ color: dueColor }}>{remaining <= 0 ? 'Paid' : `Due in ${daysOut}d`}</div></div>
              </div>
            </div>
          </div>
        )
      })()}

      {(giftCards?.length > 0 || rewardPrograms?.length > 0) && (
        <div className={styles.itinCard}>
          <div className={styles.itinHdr}>
            <div className={styles.itinHdrL}>
              <div className={styles.itinIcon}><i className="ti ti-gift" /></div>
              <div className={styles.itinTitle}>Gift cards & rewards</div>
            </div>
            <div className={styles.itinView} onClick={() => navigate('/gifts')}>View <i className="ti ti-chevron-right" /></div>
          </div>
          <div className={styles.dashDayRows}>
            {giftCards.map(c => (
              <div key={c.id} className={styles.dayRow} onClick={() => navigate('/gifts')}>
                <div className={styles.dayInfo}>
                  <div className={styles.dayPark}>{c.source}</div>
                  <div className={styles.dayDate}>Gift card</div>
                </div>
                <span className={styles.pill}>{c.balance <= 0 ? 'Depleted' : fmt(c.balance)}</span>
              </div>
            ))}
            {rewardPrograms.map(r => (
              <div key={r.id} className={styles.dayRow} onClick={() => navigate('/gifts')}>
                <div className={styles.dayInfo}>
                  <div className={styles.dayPark}>{r.program}</div>
                  <div className={styles.dayDate}>Reward</div>
                </div>
                <span className={styles.pill}>{fmt(r.value)}</span>
              </div>
            ))}
          </div>
          <div className={styles.bcView} onClick={() => navigate('/gifts')}>
            Total available: {fmt(giftFundsTotals(giftCards, rewardPrograms).totalAvailable)}
          </div>
        </div>
      )}

      <Fab onClick={() => openExpenseSheet?.({ presetCat: 'dining', presetDay: 1 })} />
    </div>
  )
}
