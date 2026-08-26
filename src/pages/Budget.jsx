import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses, setCategoryBudget } from '../lib/expenses'
import { categoriesForTrip, categoryMeta, categoryTotals } from '../lib/categories'
import Fab from '../components/Fab/Fab'
import ViewTabs from '../components/ViewTabs/ViewTabs'
import styles from './Budget.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

export default function Budget() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { activeTrip, loading, expensesVersion, openExpenseSheet, userId } = outletContext ?? { activeTrip: null, loading: true }
  const [expenses, setExpenses] = useState(null)
  const [error, setError] = useState(null)
  const [editingCat, setEditingCat] = useState(null)
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
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (loading || (activeTrip && expenses === null)) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 150 }} />
        <div className={styles.skelBlock} style={{ height: 320 }} />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-chart-pie ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No active trip</h1>
        <p className={styles.emptySubhead}>Plan a trip to start tracking your budget.</p>
        <button className={styles.planBtn} onClick={() => navigate('/configurator')}>Plan a trip</button>
      </div>
    )
  }

  const cats = categoriesForTrip(activeTrip)
  const rows = cats.map(cat => {
    const es = expenses.filter(e => e.cat === cat)
    const { budgetRow, budgeted, planned, actual, count } = categoryTotals(es, cat)
    return { cat, budgetRowId: budgetRow?.id, budgeted, planned, actual, count }
  })

  function startEditBudget(row) {
    setBudgetDraft(String(row.budgeted))
    setEditingCat(row.cat)
  }

  async function commitBudget(row) {
    setEditingCat(null)
    const amt = Number(budgetDraft) || 0
    if (amt === row.budgeted) return
    const { error } = await setCategoryBudget(userId, activeTrip.id, row.cat, amt, row.budgetRowId)
    if (error) { setToast(error.message); return }
    setToast('Budget updated')
    fetchExpenses(activeTrip.id).then(({ data }) => data && setExpenses(data))
  }

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0)
  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0)
  const totalActual = rows.reduce((s, r) => s + r.actual, 0)
  const remaining = totalBudgeted - totalActual
  const pct = totalBudgeted > 0 ? Math.min(100, Math.round((totalActual / totalBudgeted) * 100)) : 0

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}

      <ViewTabs active="category" />

      <div className={styles.hero}>
        <div className={styles.heroHdr}>
          <div className={styles.heroTop}>
            <div>
              <div className={styles.heroLbl}>Trip budget</div>
              <div className={styles.heroNum}>{fmt(totalBudgeted)}</div>
            </div>
            <div className={styles.heroRight}>
              <div className={styles.heroRemainingLbl}>Remaining</div>
              <div className={styles.heroRemaining}>{fmt(remaining)}</div>
            </div>
          </div>
          <div className={styles.heroBarTrack}><div className={styles.heroBarFill} style={{ width: `${pct}%` }} /></div>
          <div className={styles.heroSub}>{pct}% of budget spent</div>
        </div>
        <div className={styles.heroFooter}>
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Budgeted</div><div className={styles.heroFooterVal} style={{ color: 'var(--gold)' }}>{fmt(totalBudgeted)}</div></div>
          <div className={styles.heroDivider} />
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Planned</div><div className={styles.heroFooterVal} style={{ color: 'var(--sky)' }}>{fmt(totalPlanned)}</div></div>
          <div className={styles.heroDivider} />
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Spent</div><div className={styles.heroFooterVal} style={{ color: 'var(--coral)' }}>{fmt(totalActual)}</div></div>
          <div className={styles.heroDivider} />
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Remaining</div><div className={styles.heroFooterVal} style={{ color: 'var(--teal)' }}>{fmt(remaining)}</div></div>
        </div>
      </div>

      <div className={styles.catList}>
        {rows.map(r => {
          const meta = categoryMeta(r.cat)
          const over = r.actual > r.budgeted
          const rowPct = r.budgeted > 0 ? Math.min(100, Math.round((r.actual / r.budgeted) * 100)) : 0
          const editing = editingCat === r.cat
          return (
            <div key={r.cat} className={styles.catRow} onClick={() => !editing && navigate(`/budget/${r.cat}`)}>
              <div className={styles.catIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
              <div className={styles.catInfo}>
                <div className={styles.catName}>{meta.label}</div>
                <div className={styles.catSub}>{fmt(r.actual)} spent · {fmt(r.planned)} planned · {r.count} {r.count === 1 ? 'entry' : 'entries'}</div>
                <div className={styles.catProg}><div className={styles.catProgFill} style={{ width: `${rowPct}%`, background: over ? 'var(--coral)' : meta.prog }} /></div>
              </div>
              <div className={styles.catVals} onClick={e => e.stopPropagation()}>
                {editing ? (
                  <input
                    className={styles.budgetInput}
                    type="number"
                    min="0"
                    autoFocus
                    value={budgetDraft}
                    onChange={e => setBudgetDraft(e.target.value)}
                    onBlur={() => commitBudget(r)}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                ) : (
                  <div className={styles.catBudgeted} style={{ color: over ? 'var(--coral)' : 'var(--ink)' }} onClick={() => startEditBudget(r)} title="Tap to edit">
                    {fmt(r.budgeted)} <i className="ti ti-pencil" />
                  </div>
                )}
                <div className={styles.catPct}>{rowPct}% spent</div>
              </div>
            </div>
          )
        })}
      </div>

      <Fab onClick={() => openExpenseSheet?.({})} />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
