import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { daysUntil } from '../lib/trips'
import { setReminderDone, urgencyLevel, URGENCY_LABEL } from '../lib/reminders'
import ReminderSheet from '../components/ReminderSheet/ReminderSheet'
import styles from './Reminders.module.css'

function dateLabel(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const URGENCY_CLASS = { high: 'upHigh', med: 'upMed', low: 'upLow' }

function ReminderCard({ r, showPill, onToggle, onClick }) {
  const lvl = urgencyLevel(r.daysOut ?? 0)
  const whenLine = r.daysOut != null && r.daysOut > 0 ? `${dateLabel(r.reminder_date)} · in ${r.daysOut} day${r.daysOut === 1 ? '' : 's'}` : dateLabel(r.reminder_date)
  return (
    <div className={`${styles.card} ${r.done ? styles.cardDone : ''}`} onClick={() => onClick(r)}>
      <button
        type="button"
        className={`${styles.check} ${r.done ? styles.checkChecked : ''}`}
        title={r.done ? 'Mark not done' : 'Mark done'}
        onClick={e => { e.stopPropagation(); onToggle(r) }}
      >
        <i className="ti ti-check" />
      </button>
      <div className={styles.icon} style={{ background: r.bg }}><i className={`ti ${r.icon}`} style={{ color: r.color }} /></div>
      <div className={styles.body}>
        <div className={styles.top}>
          <div className={styles.cardTitle}>{r.title}</div>
          {showPill && <span className={`${styles.urgencyPill} ${styles[URGENCY_CLASS[lvl]]}`}>{URGENCY_LABEL[lvl]}</span>}
        </div>
        {r.reminder_date && <div className={styles.when}>{whenLine}</div>}
        {r.description && <div className={styles.desc}>{r.description}</div>}
      </div>
    </div>
  )
}

export default function Reminders() {
  const outletContext = useOutletContext()
  const { activeTrip, loading, userId, showToast, reminders, refetchReminders } = outletContext ?? { activeTrip: null, loading: true, reminders: [] }

  const [sortAsc, setSortAsc] = useState(true)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [sheetState, setSheetState] = useState(null)

  if (loading || (activeTrip && reminders === null)) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 44 }} />
        <div className={styles.skelBlock} style={{ height: 300 }} />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-bell ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No active trip</h1>
        <p className={styles.emptySubhead}>Plan a trip to see reminders.</p>
      </div>
    )
  }

  const withDaysOut = reminders.map(r => ({ ...r, daysOut: r.reminder_date != null ? daysUntil(r.reminder_date) : null }))
  const dir = sortAsc ? 1 : -1
  const active = withDaysOut.filter(r => !r.done).sort((a, b) => ((a.daysOut ?? 0) - (b.daysOut ?? 0)) * dir)
  const completed = withDaysOut.filter(r => r.done)

  async function handleToggle(r) {
    const { error } = await setReminderDone(r.id, !r.done)
    if (error) { showToast?.(error.message); return }
    refetchReminders?.()
  }

  function handleCardClick(r) {
    if (r.system) return
    setSheetState({ editingReminder: r })
  }

  function handleSheetSaved(message) {
    setSheetState(null)
    showToast?.(message)
    refetchReminders?.()
  }
  function handleSheetDeleted() {
    setSheetState(null)
    showToast?.('Reminder removed')
    refetchReminders?.()
  }

  return (
    <div>
      <div className={styles.sortRow}>
        <div className={styles.sortLbl}>Upcoming</div>
        <button type="button" className={styles.sortBtn} onClick={() => setSortAsc(a => !a)}>
          <i className="ti ti-arrows-sort" /> {sortAsc ? 'Soonest first' : 'Latest first'}
        </button>
      </div>

      {active.length === 0 ? (
        <div className={styles.caughtUp}>All caught up.</div>
      ) : (
        active.map(r => <ReminderCard key={r.id} r={r} showPill onToggle={handleToggle} onClick={handleCardClick} />)
      )}

      {completed.length > 0 && (
        <>
          <div className={styles.completedToggle} onClick={() => setCompletedOpen(o => !o)}>
            <i className={`ti ti-chevron-${completedOpen ? 'up' : 'down'}`} />
            <span>Completed ({completed.length})</span>
          </div>
          {completedOpen && completed.map(r => <ReminderCard key={r.id} r={r} showPill={false} onToggle={handleToggle} onClick={handleCardClick} />)}
        </>
      )}

      <button type="button" className={styles.addBtn} onClick={() => setSheetState({})}>
        <i className="ti ti-plus" /> Add reminder
      </button>

      <ReminderSheet
        userId={userId}
        tripId={activeTrip.id}
        state={sheetState}
        onClose={() => setSheetState(null)}
        onSaved={handleSheetSaved}
        onDeleted={handleSheetDeleted}
        onError={msg => showToast?.(msg)}
      />
    </div>
  )
}
