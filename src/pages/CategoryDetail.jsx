import { useEffect, useState } from 'react'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { fetchExpenses, deleteExpense, createExpense, setCategoryBudget } from '../lib/expenses'
import { categoryMeta, categoryTotals } from '../lib/categories'
import { tripDays } from '../lib/trips'
import Fab from '../components/Fab/Fab'
import EntryCard from '../components/EntryCard/EntryCard'
import styles from './CategoryDetail.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

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
  const entries = es.filter(e => e !== budgetRow && !e.no_cost)
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
          {cat === 'package' && (
            <button type="button" className={styles.paymentPlanPill} onClick={() => navigate('/payments')} title="View payment plan">
              <i className="ti ti-calendar-due" /> Payment plan
            </button>
          )}
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
                {tripLevelEntries.map(e => <EntryCard key={e.id} entry={e} meta={meta} dayLabel={e.day != null ? `Day ${e.day}` : null} onEdit={en => openExpenseSheet?.({ editingExpense: en })} onDelete={handleDelete} />)}
              </>
            )}
            {byDay.map(g => (
              <div key={g.day}>
                <div className={styles.sectionLbl}><i className="ti ti-sun" /> Day {g.day} · {g.dow}</div>
                {g.es.map(e => <EntryCard key={e.id} entry={e} meta={meta} dayLabel={e.day != null ? `Day ${e.day}` : null} onEdit={en => openExpenseSheet?.({ editingExpense: en })} onDelete={handleDelete} />)}
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
