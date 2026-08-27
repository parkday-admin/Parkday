import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/expenses'
import { categoriesForTrip, categoryMeta, categoryTotals, findBudgetRow, isPackageBooking } from '../lib/categories'
import { giftFundsTotals } from '../lib/giftFunds'
import { daysUntil, effectiveFinalPaymentDate } from '../lib/trips'
import { fetchPayments, paymentsPaidTotal, paymentUrgencyLevel } from '../lib/payments'
import { urgencyLevel as reminderUrgencyLevel } from '../lib/reminders'
import Fab from '../components/Fab/Fab'
import DashboardCard from '../components/DashboardCard/DashboardCard'
import ProgressBar from '../components/ProgressBar/ProgressBar'
import useSortableCards from '../hooks/useSortableCards'
import styles from './Dashboard.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()
// Badge tone contract: green = paid/on track, gold = upcoming, coral = over
// budget/urgent only, blue = neutral informational.
const BADGE_CLASS = { green: 'badgeGreen', gold: 'badgeGold', coral: 'badgeCoral', blue: 'badgeBlue', neutral: 'badgeNeutral' }
const REMINDER_BADGE_TONE = { high: 'coral', med: 'gold', low: 'green' }
const REMINDER_BADGE_LABEL = { high: 'Urgent', med: 'Upcoming', low: 'On track' }

function Badge({ tone, children }) {
  return <span className={`${styles.badge} ${styles[BADGE_CLASS[tone]]}`}>{children}</span>
}

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

const DEFAULT_CARD_ORDER = ['itinerary', 'reminders', 'payments', 'gifts', 'budget']
const DEFAULT_COLUMNS = {
  colA: DEFAULT_CARD_ORDER.filter((_, i) => i % 2 === 0),
  colB: DEFAULT_CARD_ORDER.filter((_, i) => i % 2 === 1),
}

function loadColumns(userId) {
  if (!userId) return DEFAULT_COLUMNS
  try {
    const raw = localStorage.getItem(`pkd_dash_cols_${userId}`)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && Array.isArray(parsed.colA) && Array.isArray(parsed.colB) ? parsed : DEFAULT_COLUMNS
  } catch {
    return DEFAULT_COLUMNS
  }
}

// Cards actually visible right now, filtered from the saved column
// layout — any id that just became visible for the first time (e.g. the
// user added their first gift card) gets appended to whichever column is
// currently shorter.
function visibleColumns(columns, cardVisibility) {
  const colA = columns.colA.filter(id => cardVisibility[id])
  const colB = columns.colB.filter(id => cardVisibility[id])
  const known = new Set([...columns.colA, ...columns.colB])
  DEFAULT_CARD_ORDER.forEach(id => {
    if (cardVisibility[id] && !known.has(id)) {
      (colA.length <= colB.length ? colA : colB).push(id)
    }
  })
  return { colA, colB }
}

function interleaveColumns(colA, colB) {
  const out = []
  const len = Math.max(colA.length, colB.length)
  for (let i = 0; i < len; i++) {
    if (colA[i] != null) out.push(colA[i])
    if (colB[i] != null) out.push(colB[i])
  }
  return out
}

function useIsDesktop() {
  const query = '(min-width: 1024px)'
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = e => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

function countdown(trip) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const arrival = parseLocalDate(trip.arrival_date)
  const departure = parseLocalDate(trip.departure_date)
  const daysToArrival = Math.round((arrival - today) / 86400000)

  if (daysToArrival > 0) return { big: String(daysToArrival), label: daysToArrival === 1 ? 'day out' : 'days out' }
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
  const [columns, setColumns] = useState(() => loadColumns(userId))

  useEffect(() => { setColumns(loadColumns(userId)) }, [userId])

  function reorderColumns(next) {
    setColumns(next)
    if (userId) {
      try { localStorage.setItem(`pkd_dash_cols_${userId}`, JSON.stringify(next)) } catch { /* ignore */ }
    }
  }

  const { dragId, setCardRef, handleDragStart } = useSortableCards(reorderColumns)
  const isDesktop = useIsDesktop()

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
        <div className={styles.skelBlock} style={{ height: 140 }} />
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
        <div className={styles.skelBlock} style={{ height: 140 }} />
        <div className={styles.skelBlock} style={{ height: 220 }} />
        <div className={styles.skelBlock} style={{ height: 160 }} />
      </div>
    )
  }

  const dayRows = expenses.filter(e => e.cat === 'park_day').sort((a, b) => a.day - b.day)
  const dayTotals = dayNum => {
    const es = expenses.filter(e => e.day === dayNum && e.cat !== 'park_day')
    return {
      planned: es.reduce((s, e) => s + (e.planned_amt || 0), 0),
      actual: es.filter(e => e.actual_amt != null).reduce((s, e) => s + e.actual_amt, 0),
      count: es.length,
    }
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

  const cardVisibility = {
    itinerary: true,
    reminders: true,
    payments: isPackageBooking(activeTrip) && !!payments,
    gifts: giftCards != null && rewardPrograms != null,
    budget: cats.length > 0,
  }
  const { colA, colB } = visibleColumns(columns, cardVisibility)

  function sortProps(id) {
    return {
      key: id,
      cardRef: setCardRef(id),
      style: dragId === id ? { opacity: 0.35 } : undefined,
      dragHandleProps: { onPointerDown: e => handleDragStart(id, { colA, colB }, e) },
    }
  }

  const remindersWithDaysOut = (reminders ?? [])
    .filter(r => !r.done && r.reminder_date != null)
    .map(r => ({ ...r, daysOut: daysUntil(r.reminder_date) }))
  const urgentReminders = remindersWithDaysOut.filter(r => r.daysOut <= 6)
  const upcomingReminders = remindersWithDaysOut.slice().sort((a, b) => a.daysOut - b.daysOut).slice(0, 2)

  const nodes = {}

  nodes.itinerary = (
    <DashboardCard
      {...sortProps('itinerary')}
      icon="ti-calendar" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)"
      title="Itinerary" sub={`${dayRows.length} park day${dayRows.length !== 1 ? 's' : ''} planned`}
      onView={() => navigate('/itinerary?day=1')}
    >
      {dayRows.length === 0 ? (
        <div className={styles.cardEmpty}>No park days planned yet.</div>
      ) : (
        <div className={styles.dayGrid}>
          {dayRows.map(d => {
            const date = dateForDay(activeTrip.arrival_date, d.day)
            const { planned: dayPlanned, actual: dayActual, count } = dayTotals(d.day)
            const dayPct = dayPlanned > 0 ? Math.round((dayActual / dayPlanned) * 100) : 0
            return (
              <div key={d.id} className={styles.dayCard} onClick={() => navigate(`/itinerary?day=${d.day}`)}>
                <div className={styles.dayCardTop}>
                  <div className={styles.dayCardLeft}>
                    <div className={styles.dayChip}>
                      <div className={styles.dayChipNum}>{d.day}</div>
                      <div className={styles.dayChipLbl}>{fmtDOW(date)}</div>
                    </div>
                    <div>
                      <div className={styles.rowLabel}>{d.label}</div>
                      <div className={styles.rowMeta}>{fmtDayDate(date)} · {count} {count === 1 ? 'entry' : 'entries'}</div>
                    </div>
                  </div>
                  <div className={styles.rowValue}>{dayPlanned > 0 ? fmt(dayPlanned) : '—'}</div>
                </div>
                <ProgressBar value={dayPct} tone="teal" height={3} />
              </div>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )

  nodes.reminders = (
    <DashboardCard
      {...sortProps('reminders')}
      icon="ti-bell" iconBg="rgba(224,83,63,0.1)" iconColor="var(--coral)"
      title="Reminders" sub={`${remindersWithDaysOut.length} upcoming`}
      onView={() => navigate('/reminders')}
    >
      {upcomingReminders.length === 0 ? (
        <div className={styles.cardEmpty}>No upcoming reminders.</div>
      ) : upcomingReminders.map(r => {
        const lvl = reminderUrgencyLevel(r.daysOut)
        return (
          <div key={r.id} className={styles.row} onClick={() => navigate('/reminders')}>
            <div className={styles.rowIcon} style={{ background: r.bg }}><i className={`ti ${r.icon}`} style={{ color: r.color }} /></div>
            <div className={styles.rowBody}>
              <div className={styles.rowLabel}>{r.title}</div>
              <div className={styles.rowMeta}>{r.daysOut > 0 ? `in ${r.daysOut} day${r.daysOut === 1 ? '' : 's'}` : r.daysOut === 0 ? 'Today' : 'Past due'}</div>
            </div>
            <Badge tone={REMINDER_BADGE_TONE[lvl]}>{REMINDER_BADGE_LABEL[lvl]}</Badge>
          </div>
        )
      })}
    </DashboardCard>
  )

  if (cardVisibility.payments) {
    const packageRow = findBudgetRow(expenses.filter(e => e.cat === 'package'), 'package')
    const totalCost = packageRow?.planned_amt || 0
    const paid = paymentsPaidTotal(payments)
    const payRemaining = Math.max(0, totalCost - paid)
    const finalPaymentDate = effectiveFinalPaymentDate(activeTrip)
    const daysOut = daysUntil(finalPaymentDate) ?? 0
    const lvl = paymentUrgencyLevel(daysOut)
    const paidInFull = payRemaining <= 0
    nodes.payments = (
      <DashboardCard
        {...sortProps('payments')}
        icon="ti-receipt-2" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)"
        title="Resort package" sub={`${payments.length} payment${payments.length === 1 ? '' : 's'} logged`}
        onView={() => navigate('/payments')}
      >
        <div className={styles.row}>
          <div className={styles.rowIcon} style={{ background: 'rgba(44,165,141,0.15)' }}><i className="ti ti-check" style={{ color: 'var(--teal-dark)' }} /></div>
          <div className={styles.rowBody}>
            <div className={styles.rowLabel}>Paid to date</div>
            <div className={styles.rowMeta}>of {fmt(totalCost)} total</div>
          </div>
          <div className={styles.rowValue}>{fmt(paid)}</div>
        </div>
        <div className={styles.row}>
          <div className={styles.rowIcon} style={{ background: 'var(--border-light)' }}><i className="ti ti-wallet" style={{ color: 'var(--text-tertiary)' }} /></div>
          <div className={styles.rowBody}>
            <div className={styles.rowLabel}>{paidInFull ? 'Package paid in full' : 'Remaining balance'}</div>
            <div className={styles.rowMeta}>{paidInFull ? 'Nothing further will be charged' : `Final payment ${finalPaymentDate ? new Date(finalPaymentDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={styles.rowValue}>{fmt(payRemaining)}</div>
            {paidInFull ? <Badge tone="green">Paid</Badge> : <Badge tone={REMINDER_BADGE_TONE[lvl]}>{`Due in ${daysOut}d`}</Badge>}
          </div>
        </div>
      </DashboardCard>
    )
  }

  if (cardVisibility.gifts) {
    const fundedCards = giftCards.filter(c => c.balance > 0)
    const fundedRewards = rewardPrograms.filter(r => r.value > 0)
    const hasFunds = fundedCards.length > 0 || fundedRewards.length > 0
    const totalAvailable = giftFundsTotals(fundedCards, fundedRewards).totalAvailable
    nodes.gifts = (
      <DashboardCard
        {...sortProps('gifts')}
        icon="ti-gift" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)"
        title="Gift cards & rewards" sub={hasFunds ? `${fmt(totalAvailable)} available` : undefined}
        onView={() => navigate('/gifts')}
      >
        {hasFunds ? (
          <>
            {fundedCards.map(c => (
              <div key={c.id} className={styles.row} onClick={() => navigate('/gifts')}>
                <div className={styles.rowIcon} style={{ background: 'rgba(245,181,54,0.15)' }}><i className="ti ti-credit-card" style={{ color: 'var(--gold-dark)' }} /></div>
                <div className={styles.rowBody}>
                  <div className={styles.rowLabel}>{c.source}</div>
                  <div className={styles.rowMeta}>Gift card</div>
                </div>
                <div className={styles.rowValue}>{fmt(c.balance)}</div>
              </div>
            ))}
            {fundedRewards.map(r => (
              <div key={r.id} className={styles.row} onClick={() => navigate('/gifts')}>
                <div className={styles.rowIcon} style={{ background: 'rgba(245,181,54,0.15)' }}><i className="ti ti-credit-card" style={{ color: 'var(--gold-dark)' }} /></div>
                <div className={styles.rowBody}>
                  <div className={styles.rowLabel}>{r.program}</div>
                  <div className={styles.rowMeta}>Reward</div>
                </div>
                <div className={styles.rowValue}>{fmt(r.value)}</div>
              </div>
            ))}
          </>
        ) : (
          <div className={styles.fundsEmpty}>
            <div className={styles.cardEmpty} style={{ padding: '4px 0 12px' }}>No funds added yet.</div>
            <button type="button" className={styles.fundsEmptyBtn} onClick={() => navigate('/gifts', { state: { openAddGiftCard: true } })}>
              <i className="ti ti-plus" /> Add a gift card
            </button>
          </div>
        )}
      </DashboardCard>
    )
  }

  if (cardVisibility.budget) {
    nodes.budget = (
      <DashboardCard
        {...sortProps('budget')}
        icon="ti-chart-pie" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)"
        title="Budget by category" sub="Actual vs. budgeted, by category"
        onView={() => navigate('/budget')}
      >
        {cats.map(c => {
          const meta = categoryMeta(c.cat)
          const rowPct = c.budgeted > 0 ? Math.min(100, Math.round((c.actual / c.budgeted) * 100)) : 0
          const over = c.actual > c.budgeted
          return (
            <div key={c.cat} className={styles.row} onClick={() => navigate(`/budget/${c.cat}`)}>
              <div className={styles.rowIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
              <div className={styles.rowBody}>
                <div className={styles.rowTop}>
                  <div className={styles.rowLabel}>{meta.label}</div>
                  <div className={styles.rowMeta}>{fmt(c.actual)} / {fmt(c.budgeted)}</div>
                </div>
                <ProgressBar value={rowPct} tone={over ? 'coral' : 'teal'} height={3} />
              </div>
            </div>
          )
        })}
      </DashboardCard>
    )
  }

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

      {/* Merged countdown + budget hero — one navy surface, one set of numbers. */}
      <div className={styles.hero}>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroLbl}>Countdown</div>
            <div className={styles.heroCountRow}>
              <div className={styles.heroCount}>{cd.big}</div>
              <div className={styles.heroCountLbl}>{cd.label}</div>
            </div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroLbl}>Trip budget</div>
            <div className={styles.heroNum} style={{ color: 'var(--gold)' }}>{fmt(budgeted)}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroLbl}>Spent</div>
            <div className={styles.heroNum} style={{ color: 'var(--coral)' }}>{fmt(spent)}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroLbl}>Remaining</div>
            <div className={styles.heroNum} style={{ color: 'var(--teal)' }}>{fmt(remaining)}</div>
          </div>
        </div>
        <div className={styles.heroFoot}>
          <ProgressBar value={pct} tone="gold" dark height={4} />
          <div className={styles.heroFootRow}>
            <div className={styles.heroFootText}>{pct}% of budget spent · {fmt(planned)} still planned</div>
            <div className={styles.heroFootText}>
              {fmtDayDate(activeTrip.arrival_date)} – {fmtDayDate(activeTrip.departure_date)}
              {activeTrip.accommodation ? ` · ${activeTrip.accommodation}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.cardGrid}>
        {isDesktop ? (
          <div className={styles.cardCols}>
            <div className={styles.cardCol}>{colA.map(id => nodes[id])}</div>
            <div className={styles.cardCol}>{colB.map(id => nodes[id])}</div>
          </div>
        ) : (
          interleaveColumns(colA, colB).map(id => nodes[id])
        )}
      </div>

      <Fab onClick={() => openExpenseSheet?.({ presetCat: 'dining', presetDay: 1 })} />
    </div>
  )
}
