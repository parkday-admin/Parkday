import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { fetchExpenses, deleteExpense, createExpense, setCategoryBudget } from '../lib/expenses'
import { categoryMeta, categoryTotals } from '../lib/categories'
import { tripDays } from '../lib/trips'
import Fab from '../components/Fab/Fab'
import styles from './CategoryDetail.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function fmtTime(t) {
  return t || ''
}

const STATUS_STYLE = {
  confirmed: { label: 'Confirmed', cls: 'pillConfirmed' },
  waitlist: { label: 'Waitlist', cls: 'pillWaitlist' },
}

function EntryRow({ entry, meta, onEdit, onDelete }) {
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

  return (
    <div className={styles.entryWrap}>
      <div className={styles.entryDeleteReveal} onClick={() => onDelete(entry)}>
        <i className="ti ti-trash" /><span>Delete</span>
      </div>
      <div
        className={`${styles.entry} ${entry.status ? styles[entry.status] : entry.actual_amt != null ? styles.paid : ''} ${swiped ? styles.swiped : ''}`}
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
            {entry.day != null && <span>Day {entry.day}</span>}
            {entry.time && <span>{fmtTime(entry.time)}</span>}
            {entry.cat === 'll' && entry.ll_type && <span className={styles.pill}>{entry.ll_type === 'singlepass' ? 'Single Pass' : 'Multi Pass'}</span>}
            {statusInfo && <span className={`${styles.pill} ${styles[statusInfo.cls]}`}>{statusInfo.label}</span>}
          </div>
        </div>
        <div className={styles.entryAmts}>
          {entry.actual_amt != null ? (
            <>
              <div className={styles.entryStrike}>{fmt(entry.planned_amt)}</div>
              <div className={styles.entryActualAmt}>{fmt(entry.actual_amt)}</div>
            </>
          ) : (
            <>
              <div className={styles.entryPlanned}>{fmt(entry.planned_amt)}</div>
              <div className={styles.entryPlannedLbl}>planned</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CategoryDetail() {
  const navigate = useNavigate()
  const { cat } = useParams()
  const outletContext = useOutletContext()
  const { activeTrip, loading, expensesVersion, openExpenseSheet, userId } = outletContext ?? { activeTrip: null, loading: true }
  const [expenses, setExpenses] = useState(null)
  const [error, setError] = useState(null)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState('')
  const [toast, setToast] = useState(null)

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
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.actionLabel ? 5000 : 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (loading || (activeTrip && expenses === null)) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 110 }} />
        <div className={styles.skelBlock} style={{ height: 300 }} />
      </div>
    )
  }

  if (!activeTrip) return null

  const meta = categoryMeta(cat)
  const es = expenses.filter(e => e.cat === cat)
  const { budgetRow, planned, actual } = categoryTotals(es, cat)
  const entries = es.filter(e => e !== budgetRow)
  const hasSpend = actual > 0

  const tripLevelEntries = entries.filter(e => e.day == null)
  const days = tripDays(activeTrip)
  const byDay = days
    .map(d => ({ day: d.day, dow: d.dow, es: entries.filter(e => e.day === d.day) }))
    .filter(g => g.es.length)

  function startEditBudget() {
    setBudgetDraft(String(budgetRow?.planned_amt || 0))
    setEditingBudget(true)
  }

  async function commitBudget() {
    setEditingBudget(false)
    const amt = Number(budgetDraft) || 0
    const { error } = await setCategoryBudget(userId, activeTrip.id, cat, amt, budgetRow?.id)
    if (error) { setToast({ message: error.message }); return }
    setToast({ message: 'Budget updated' })
    fetchExpenses(activeTrip.id).then(({ data }) => data && setExpenses(data))
  }

  async function handleDelete(entry) {
    const { error } = await deleteExpense(entry.id)
    if (error) { setToast({ message: error.message }); return }
    setExpenses(prev => prev.filter(e => e.id !== entry.id))
    setToast({
      message: 'Expense deleted',
      actionLabel: 'Undo',
      onAction: async () => {
        const { cat: c, label, time, status, ll_type, planned_amt, actual_amt, day } = entry
        await createExpense(userId, activeTrip.id, { cat: c, label, time, status, ll_type, planned_amt, actual_amt, day })
        setToast(null)
        fetchExpenses(activeTrip.id).then(({ data }) => data && setExpenses(data))
      },
    })
  }

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.hdr}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/budget')}>
          <i className="ti ti-arrow-left" /> Budget
        </button>
        <div className={styles.hdrTitle}>
          <span>{meta.label}</span>
          <div className={styles.hdrIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem} onClick={startEditBudget}>
          <div className={styles.summaryLbl}>Budgeted <i className="ti ti-pencil" style={{ fontSize: 9, opacity: 0.5 }} /></div>
          {editingBudget ? (
            <input
              className={styles.budgetInput}
              type="number"
              min="0"
              autoFocus
              value={budgetDraft}
              onChange={e => setBudgetDraft(e.target.value)}
              onBlur={commitBudget}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <div className={styles.summaryVal} style={{ color: 'var(--gold)' }}>{fmt(budgetRow?.planned_amt || 0)}</div>
          )}
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLbl}>Planned</div>
          <div className={styles.summaryVal} style={{ color: 'var(--sky)' }}>{fmt(planned)}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLbl}>Spent</div>
          <div className={styles.summaryVal} style={{ color: 'var(--coral)' }}>{hasSpend ? fmt(actual) : '—'}</div>
        </div>
      </div>

      <div className={styles.entries}>
        {entries.length === 0 ? (
          <div className={styles.emptyEntries}>No {meta.label.toLowerCase()} expenses yet.<br />Tap + to add one.</div>
        ) : (
          <>
            {tripLevelEntries.length > 0 && (
              <>
                <div className={styles.sectionLbl}><i className="ti ti-calendar-event" /> Trip total</div>
                {tripLevelEntries.map(e => <EntryRow key={e.id} entry={e} meta={meta} onEdit={en => openExpenseSheet?.({ editingExpense: en })} onDelete={handleDelete} />)}
              </>
            )}
            {byDay.map(g => (
              <div key={g.day}>
                <div className={styles.sectionLbl}><i className="ti ti-sun" /> Day {g.day} · {g.dow}</div>
                {g.es.map(e => <EntryRow key={e.id} entry={e} meta={meta} onEdit={en => openExpenseSheet?.({ editingExpense: en })} onDelete={handleDelete} />)}
              </div>
            ))}
          </>
        )}
      </div>

      <Fab onClick={() => openExpenseSheet?.({ presetCat: cat })} />

      {toast && (
        <div className={styles.toast}>
          <span>{toast.message}</span>
          {toast.actionLabel && <button type="button" className={styles.toastAction} onClick={toast.onAction}>{toast.actionLabel}</button>}
        </div>
      )}
    </div>
  )
}
