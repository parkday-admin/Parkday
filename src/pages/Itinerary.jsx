import { useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { fetchExpenses, deleteExpense, createExpense } from '../lib/expenses'
import { categoryMeta } from '../lib/categories'
import { tripDays, dayParkLabel } from '../lib/trips'
import Fab from '../components/Fab/Fab'
import EntryCard from '../components/EntryCard/EntryCard'
import ViewTabs from '../components/ViewTabs/ViewTabs'
import styles from './Itinerary.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDayDate(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Entry times are stored as display strings ("7:30 PM"), so a plain string
// sort would put "10:00 AM" before "7:30 PM" — convert to minutes-since-
// midnight first so Scheduled entries sort chronologically.
function timeSortKey(t) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((t || '').trim())
  if (!m) return 0
  let h = Number(m[1])
  if (m[3]) {
    if (/PM/i.test(m[3]) && h !== 12) h += 12
    if (/AM/i.test(m[3]) && h === 12) h = 0
  }
  return h * 60 + Number(m[2])
}

export default function Itinerary() {
  const outletContext = useOutletContext()
  const { activeTrip, loading, expensesVersion, openExpenseSheet, userId, showToast } = outletContext ?? { activeTrip: null, loading: true }
  const [searchParams] = useSearchParams()
  const [expenses, setExpenses] = useState(null)
  const [error, setError] = useState(null)
  const [dayIndex, setDayIndex] = useState(null)

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

  // Default to the day-param from the dashboard's day rows, else whichever
  // day is "today" if the trip is in progress, else day 1 — but only once,
  // so navigating with the arrows afterward isn't overridden.
  useEffect(() => {
    if (dayIndex !== null || !activeTrip) return
    const days = tripDays(activeTrip)
    const dayParam = Number(searchParams.get('day'))
    if (Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= days.length) {
      setDayIndex(dayParam - 1)
      return
    }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayIdx = days.findIndex(d => sameDate(parseLocalDate(d.date), today))
    setDayIndex(todayIdx >= 0 ? todayIdx : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip, dayIndex])

  if (loading || (activeTrip && (expenses === null || dayIndex === null))) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 70 }} />
        <div className={styles.skelBlock} style={{ height: 110 }} />
        <div className={styles.skelBlock} style={{ height: 240 }} />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-calendar ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No active trip</h1>
        <p className={styles.emptySubhead}>Plan a trip to build your day-by-day itinerary.</p>
      </div>
    )
  }

  const days = tripDays(activeTrip)
  const day = days[dayIndex]
  const dayNum = day.day
  const parkLabel = dayParkLabel(activeTrip, expenses, dayNum)

  const dayEntries = expenses.filter(e => e.day === dayNum && e.cat !== 'park_day')
  const timed = dayEntries.filter(e => e.time).sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time))
  const untimed = dayEntries.filter(e => !e.time)

  const planned = dayEntries.reduce((s, e) => s + (e.planned_amt || 0), 0)
  const paidEntries = dayEntries.filter(e => e.actual_amt != null)
  const actual = paidEntries.reduce((s, e) => s + e.actual_amt, 0)
  const hasPaid = paidEntries.length > 0

  function changeDay(delta) {
    setDayIndex(i => Math.max(0, Math.min(days.length - 1, i + delta)))
    window.scrollTo({ top: 0 })
  }

  async function handleDelete(entry) {
    const { error } = await deleteExpense(entry.id)
    if (error) { showToast?.(error.message); return }
    setExpenses(prev => prev.filter(e => e.id !== entry.id))
    showToast?.('Expense deleted', {
      actionLabel: 'Undo',
      onAction: async () => {
        const { cat, label, time, status, ll_type, planned_amt, actual_amt, day: d } = entry
        await createExpense(userId, activeTrip.id, { cat, label, time, status, ll_type, planned_amt, actual_amt, day: d })
        fetchExpenses(activeTrip.id).then(({ data }) => data && setExpenses(data))
      },
    })
  }

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}

      <ViewTabs active="day" />

      <div className={styles.dayNav}>
        <button type="button" className={styles.dayNavBtn} disabled={dayIndex === 0} onClick={() => changeDay(-1)}>
          <i className="ti ti-chevron-left" />
        </button>
        <div className={styles.dayLabel}>
          <div className={styles.dayLabelTitle}>Day {day.day} · {fmtDayDate(day.date)}</div>
          <div className={styles.dayLabelSub}>{parkLabel}</div>
        </div>
        <button type="button" className={styles.dayNavBtn} disabled={dayIndex === days.length - 1} onClick={() => changeDay(1)}>
          <i className="ti ti-chevron-right" />
        </button>
      </div>

      <div className={styles.daySummary}>
        <div className={styles.dsLbl}>Spent today</div>
        <div className={styles.dsVal}>{hasPaid ? fmt(actual) : '—'}</div>
        <div className={styles.dsSub}>
          {hasPaid ? `${paidEntries.length} of ${dayEntries.length} paid` : dayEntries.length ? `${fmt(planned)} planned · nothing spent yet` : 'Nothing planned yet'}
        </div>
      </div>

      <div className={styles.entries}>
        {dayEntries.length === 0 ? (
          <div className={styles.emptyEntries}>No expenses planned for this day yet.<br />Tap + to add one.</div>
        ) : (
          <>
            {timed.length > 0 && (
              <>
                <div className={styles.sectionLbl}><i className="ti ti-clock" /> Scheduled</div>
                {timed.map(e => <EntryCard key={e.id} entry={e} meta={categoryMeta(e.cat)} onEdit={en => openExpenseSheet?.({ editingExpense: en })} onDelete={handleDelete} />)}
              </>
            )}
            {untimed.length > 0 && (
              <>
                <div className={styles.sectionLbl}><i className="ti ti-list" /> Day costs</div>
                {untimed.map(e => <EntryCard key={e.id} entry={e} meta={categoryMeta(e.cat)} onEdit={en => openExpenseSheet?.({ editingExpense: en })} onDelete={handleDelete} />)}
              </>
            )}
          </>
        )}
      </div>

      <Fab onClick={() => openExpenseSheet?.({ presetCat: 'dining', presetDay: dayNum })} />
    </div>
  )
}
