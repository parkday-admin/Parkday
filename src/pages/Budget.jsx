import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses, setCategoryBudget, deleteExpense, createExpense } from '../lib/expenses'
import { categoriesForTrip, categoryMeta, categoryTotals } from '../lib/categories'
import { tripDays, fetchTripSourceInfo, dismissStalenessBanner } from '../lib/trips'
import { paymentSourceLabel } from '../lib/payments'
import Fab from '../components/Fab/Fab'
import EntryCard from '../components/EntryCard/EntryCard'
import Sheet from '../components/Sheet/Sheet'
import BudgetPrintView from '../components/BudgetPrintView/BudgetPrintView'
import styles from './Budget.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

// Entry times are stored as display strings ("7:30 PM"); convert to
// minutes-since-midnight so the flat All Expenses list sorts chronologically
// within a day instead of alphabetically.
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

function methodLabel(source, giftCards, rewardPrograms) {
  if (!source) return 'None'
  if (source.startsWith('manual:')) return source.slice(7)
  return paymentSourceLabel(source, giftCards, rewardPrograms)
}

export default function Budget() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { activeTrip, loading, expensesVersion, openExpenseSheet, userId, giftCards, rewardPrograms } = outletContext ?? { activeTrip: null, loading: true }
  const [expenses, setExpenses] = useState(null)
  const [error, setError] = useState(null)
  const [editingCat, setEditingCat] = useState(null)
  const [budgetDraft, setBudgetDraft] = useState('')
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('summary')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterCats, setFilterCats] = useState([])
  const [filterDays, setFilterDays] = useState([])
  const [filterMethods, setFilterMethods] = useState([])
  const [exporting, setExporting] = useState(false)
  const [staleSource, setStaleSource] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Loads the source trip's name/year for the "budget targets carried over"
  // banner — only when this trip was actually duplicated and hasn't already
  // had the banner dismissed (persisted, so it doesn't reappear on reload).
  useEffect(() => {
    setBannerDismissed(false)
    if (!activeTrip?.duplicated_from || activeTrip.staleness_banner_dismissed) { setStaleSource(null); return }
    let cancelled = false
    fetchTripSourceInfo(activeTrip.duplicated_from).then(({ data }) => { if (!cancelled) setStaleSource(data) })
    return () => { cancelled = true }
  }, [activeTrip?.id, activeTrip?.duplicated_from, activeTrip?.staleness_banner_dismissed])

  function dismissBanner() {
    setBannerDismissed(true)
    if (activeTrip) dismissStalenessBanner(activeTrip.id)
  }

  // Renders BudgetPrintView into the DOM, waits a frame for it to paint,
  // then opens the print dialog — cleaned up on 'afterprint' (fires whether
  // the user saved a PDF or cancelled) rather than immediately after
  // calling print(), since print() doesn't block until the dialog closes.
  useEffect(() => {
    if (!exporting) return
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
    function onAfterPrint() { setExporting(false) }
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [exporting])

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
    const t = setTimeout(() => setToast(null), toast?.actionLabel ? 5000 : 2200)
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

  // All Expenses tab: every real logged entry (budget-target rows and the
  // auto-generated park_day placeholders aren't transactions), sorted the
  // same way the Itinerary's day view sorts a day's Scheduled section.
  const allEntries = expenses
    .filter(e => !e.is_budget && e.cat !== 'park_day')
    .sort((a, b) => {
      const dayA = a.day ?? -1, dayB = b.day ?? -1
      if (dayA !== dayB) return dayA - dayB
      return timeSortKey(a.time) - timeSortKey(b.time)
    })

  const methodOptions = Array.from(new Set(allEntries.map(e => e.payment_source || '')))
    .map(source => ({ value: source, label: methodLabel(source, giftCards ?? [], rewardPrograms ?? []) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const filteredEntries = allEntries.filter(e => {
    if (filterCats.length && !filterCats.includes(e.cat)) return false
    if (filterDays.length) {
      const dayKey = e.day == null ? 'trip' : e.day
      if (!filterDays.includes(dayKey)) return false
    }
    if (filterMethods.length && !filterMethods.includes(e.payment_source || '')) return false
    return true
  })

  const activeFilterCount = filterCats.length + filterDays.length + filterMethods.length

  function toggleFilter(setter, value) {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  function clearFilters() {
    setFilterCats([]); setFilterDays([]); setFilterMethods([])
  }

  async function handleDeleteEntry(entry) {
    const { error } = await deleteExpense(entry.id)
    if (error) { setToast(error.message); return }
    setExpenses(prev => prev.filter(e => e.id !== entry.id))
    setToast({
      message: 'Expense deleted',
      actionLabel: 'Undo',
      onAction: async () => {
        const { cat, label, time, status, ll_type, planned_amt, actual_amt, day, payment_source } = entry
        await createExpense(userId, activeTrip.id, { cat, label, time, status, ll_type, planned_amt, actual_amt, day, payment_source })
        setToast(null)
        fetchExpenses(activeTrip.id).then(({ data }) => data && setExpenses(data))
      },
    })
  }

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}

      {staleSource && !bannerDismissed && totalBudgeted > 0 && (
        <div className={styles.staleBanner}>
          <div className={styles.staleBannerText}>
            <strong>Heads up — budget targets carried over from {staleSource.name} ({staleSource.arrival_date?.slice(0, 4)})</strong>
            <div>Disney pricing changes year to year. Worth a quick review before you start planning.</div>
          </div>
          <button type="button" className={styles.staleBannerClose} onClick={dismissBanner} title="Dismiss"><i className="ti ti-x" /></button>
        </div>
      )}

      <div className={styles.topBar}>
        <div className={styles.subTabs}>
          <button type="button" className={`${styles.subTab} ${tab === 'summary' ? styles.subTabActive : ''}`} onClick={() => setTab('summary')}>Summary</button>
          <button type="button" className={`${styles.subTab} ${tab === 'all' ? styles.subTabActive : ''}`} onClick={() => setTab('all')}>All Expenses</button>
        </div>
        <button type="button" className={styles.exportBtn} onClick={() => setExporting(true)} title="Export PDF">
          <i className="ti ti-file-download" /> <span>Export PDF</span>
        </button>
      </div>

      {tab === 'summary' && (
      <>
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
      </>
      )}

      {tab === 'all' && (
        <div>
          <div className={styles.filterBar}>
            <button type="button" className={styles.filterBtn} onClick={() => setFilterOpen(true)}>
              <i className="ti ti-filter" /> Filters
              {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
            </button>
            {activeFilterCount > 0 && (
              <button type="button" className={styles.clearFiltersBtn} onClick={clearFilters}>Clear all</button>
            )}
          </div>

          {filteredEntries.length === 0 ? (
            <div className={styles.allEmpty}>
              {allEntries.length === 0 ? 'No expenses logged yet.' : 'No expenses match these filters.'}
            </div>
          ) : (
            <div className={styles.allList}>
              {filteredEntries.map(e => {
                const meta = categoryMeta(e.cat)
                const dayLabel = e.day == null ? 'Trip level' : `Day ${e.day}`
                return (
                  <EntryCard
                    key={e.id}
                    entry={e}
                    meta={meta}
                    dayLabel={dayLabel}
                    onEdit={en => openExpenseSheet?.({ editingExpense: en })}
                    onDelete={handleDeleteEntry}
                  />
                )
              })}
            </div>
          )}

          <Sheet open={filterOpen} onClose={() => setFilterOpen(false)}>
            <div className={styles.filterHdr}>
              <div className={styles.filterTitle}>Filters</div>
              {activeFilterCount > 0 && <button type="button" className={styles.filterClearLink} onClick={clearFilters}>Clear all</button>}
            </div>
            <div className={styles.filterBody}>
              <div className={styles.filterSection}>
                <div className={styles.filterSectionLbl}>Category</div>
                <div className={styles.filterChips}>
                  {cats.map(c => {
                    const cm = categoryMeta(c)
                    const sel = filterCats.includes(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`${styles.filterChip} ${sel ? styles.filterChipSel : ''}`}
                        style={sel ? { borderColor: cm.color, background: cm.bg, color: cm.color } : undefined}
                        onClick={() => toggleFilter(setFilterCats, c)}
                      >
                        <i className={`ti ${cm.icon}`} /> {cm.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={styles.filterSection}>
                <div className={styles.filterSectionLbl}>Park day</div>
                <div className={styles.filterChips}>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${filterDays.includes('trip') ? styles.filterChipSel : ''}`}
                    onClick={() => toggleFilter(setFilterDays, 'trip')}
                  >
                    Trip level
                  </button>
                  {tripDays(activeTrip).map(d => (
                    <button
                      key={d.day}
                      type="button"
                      className={`${styles.filterChip} ${filterDays.includes(d.day) ? styles.filterChipSel : ''}`}
                      onClick={() => toggleFilter(setFilterDays, d.day)}
                    >
                      Day {d.day}
                    </button>
                  ))}
                </div>
              </div>

              {methodOptions.length > 0 && (
                <div className={styles.filterSection}>
                  <div className={styles.filterSectionLbl}>Payment method</div>
                  <div className={styles.filterChips}>
                    {methodOptions.map(o => (
                      <button
                        key={o.value}
                        type="button"
                        className={`${styles.filterChip} ${filterMethods.includes(o.value) ? styles.filterChipSel : ''}`}
                        onClick={() => toggleFilter(setFilterMethods, o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" className={styles.filterApplyBtn} onClick={() => setFilterOpen(false)}>
                Show {filteredEntries.length} {filteredEntries.length === 1 ? 'expense' : 'expenses'}
              </button>
            </div>
          </Sheet>
        </div>
      )}

      <Fab onClick={() => openExpenseSheet?.({})} />

      {toast && (
        <div className={styles.toast}>
          <span>{typeof toast === 'string' ? toast : toast.message}</span>
          {toast?.actionLabel && <button type="button" className={styles.toastAction} onClick={toast.onAction}>{toast.actionLabel}</button>}
        </div>
      )}

      {exporting && createPortal(
        <BudgetPrintView
          trip={activeTrip}
          rows={rows}
          entries={allEntries}
          totals={{ budgeted: totalBudgeted, planned: totalPlanned, actual: totalActual, remaining }}
          giftCards={giftCards ?? []}
          rewardPrograms={rewardPrograms ?? []}
        />,
        document.body
      )}
    </div>
  )
}
