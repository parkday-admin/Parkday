import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/expenses'
import { findBudgetRow, isPackageBooking } from '../lib/categories'
import { daysUntil, effectiveFinalPaymentDate } from '../lib/trips'
import { fetchPayments, paymentsPaidTotal, paymentUrgencyLevel, URGENCY_LABEL, deletePayment } from '../lib/payments'
import PaymentSheet from '../components/PaymentSheet/PaymentSheet'
import styles from './Payments.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()
const URGENCY_CLASS = { high: 'upHigh', med: 'upMed', low: 'upLow' }

function dateLabel(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function monthLabel(d) {
  if (!d) return 'Unknown'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function paymentIcon(p) {
  if (p.payment_source?.startsWith('gift:')) return 'ti-gift'
  if (p.payment_source?.startsWith('reward:')) return 'ti-star'
  const m = (p.method || '').toLowerCase()
  if (m.includes('cash')) return 'ti-cash'
  if (m.includes('credit') || m.includes('debit')) return 'ti-credit-card'
  if (m.includes('check')) return 'ti-note'
  if (m.includes('paypal')) return 'ti-brand-paypal'
  return 'ti-receipt-2'
}

export default function Payments() {
  const outletContext = useOutletContext()
  const {
    activeTrip, loading, userId, showToast,
    giftCards, rewardPrograms, refetchGiftFunds,
  } = outletContext ?? { activeTrip: null, loading: true, giftCards: [], rewardPrograms: [] }

  const [expenses, setExpenses] = useState(null)
  const [payments, setPayments] = useState(null)
  const [sheetState, setSheetState] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    if (!confirmDeleteId) return undefined
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmDeleteId])

  function loadPayments() {
    if (!activeTrip) return
    fetchPayments(userId, activeTrip.id).then(({ data }) => setPayments(data))
  }

  useEffect(() => {
    if (!activeTrip) { setExpenses(null); setPayments(null); return }
    fetchExpenses(activeTrip.id).then(({ data }) => setExpenses(data))
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip])

  if (loading || (activeTrip && (expenses === null || payments === null))) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 160 }} />
        <div className={styles.skelBlock} style={{ height: 100 }} />
        <div className={styles.skelBlock} style={{ height: 200 }} />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-receipt-2 ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No active trip</h1>
        <p className={styles.emptySubhead}>Plan a trip to start tracking payments.</p>
      </div>
    )
  }

  if (!isPackageBooking(activeTrip)) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-info-circle ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No package payment plan</h1>
        <p className={styles.emptySubhead}>
          This trip's resort and tickets were booked separately, so there's no single Disney balance to track here.
        </p>
        <Link to="/budget" className={styles.planBtn}>Log payments on the Budget page →</Link>
      </div>
    )
  }

  const packageRow = findBudgetRow(expenses.filter(e => e.cat === 'package'), 'package')
  const totalCost = packageRow?.planned_amt || 0
  const paid = paymentsPaidTotal(payments)
  const remaining = Math.max(0, totalCost - paid)
  const pct = totalCost > 0 ? Math.min(100, Math.round((paid / totalCost) * 100)) : 0
  const finalPaymentDate = effectiveFinalPaymentDate(activeTrip)
  const daysOut = daysUntil(finalPaymentDate)
  const lvl = paymentUrgencyLevel(daysOut ?? 0)
  const paidInFull = remaining <= 0

  function refreshAll() {
    loadPayments()
    fetchExpenses(activeTrip.id).then(({ data }) => setExpenses(data))
    refetchGiftFunds?.()
  }

  function handleSaved(message) {
    setSheetState(null)
    showToast?.(message)
    refreshAll()
  }
  function handleDeleted() {
    setSheetState(null)
    showToast?.('Payment removed')
    refreshAll()
  }

  async function handleDeleteRow(p) {
    if (confirmDeleteId !== p.id) { setConfirmDeleteId(p.id); return }
    setConfirmDeleteId(null)
    const { error } = await deletePayment(p.id)
    if (error) { showToast?.(error.message); return }
    showToast?.('Payment removed')
    refreshAll()
  }

  const sorted = payments.slice().sort((a, b) => new Date(b.date) - new Date(a.date))

  // Group the payment log by calendar month (newest first) instead of one
  // flat list — mirrors the day-grouping pattern used on Budget's All
  // Expenses tab for the same reason: a long log needs chunking.
  const groupedByMonth = []
  for (const p of sorted) {
    const label = monthLabel(p.date)
    let group = groupedByMonth.find(g => g.label === label)
    if (!group) { group = { label, payments: [] }; groupedByMonth.push(group) }
    group.payments.push(p)
  }

  return (
    <div>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroLbl}>Total package cost</div>
            <div className={styles.heroNum}>{fmt(totalCost)}</div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroRightLbl}>Remaining balance</div>
            <div className={styles.heroRightVal}>{fmt(remaining)}</div>
          </div>
        </div>
        <div className={styles.heroBar}><div className={styles.heroBarFill} style={{ transform: `scaleX(${pct / 100})` }} /></div>
        <div className={styles.heroSub}>{fmt(paid)} of {fmt(totalCost)} paid · {pct}%</div>
        <div className={styles.heroFooter}>
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Paid to date</div><div className={styles.heroFooterVal} style={{ color: 'var(--teal)' }}>{fmt(paid)}</div></div>
          <div className={styles.heroFooterDivider} />
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Remaining</div><div className={styles.heroFooterVal} style={{ color: remaining > 0 ? 'var(--coral)' : 'var(--teal)' }}>{fmt(remaining)}</div></div>
          <div className={styles.heroFooterDivider} />
          <div className={styles.heroFooterStat}>
            <div className={styles.heroFooterLbl}>Final payment</div>
            <div className={styles.heroFooterVal} style={{ color: '#fff' }}>{paidInFull ? 'Paid' : `${daysOut}d`}</div>
            {!paidInFull && (
              <span className={`${styles.urgencyPill} ${styles[URGENCY_CLASS[lvl]]}`}>
                {URGENCY_LABEL[lvl]}
              </span>
            )}
          </div>
        </div>
      </div>

      {paidInFull ? (
        <div className={styles.card}>
          <div className={styles.cardHdr}>
            <div className={styles.cardIcon} style={{ background: 'rgba(44,165,141,0.18)' }}><i className="ti ti-circle-check" style={{ color: 'var(--teal-dark)' }} /></div>
            <div className={styles.cardTitle}>Package paid in full</div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.projectionText}>Nothing further will be charged — your {fmt(totalCost)} balance is fully covered.</div>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.cardHdr}>
            <div className={styles.cardIcon} style={{ background: 'rgba(245,181,54,0.18)' }}><i className="ti ti-calendar-due" style={{ color: '#8a5a00' }} /></div>
            <div className={styles.cardTitle}>Projected final payment</div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.projectionText}>
              If you make no additional payments, Disney will charge <strong>{fmt(remaining)}</strong> on <strong>{dateLabel(finalPaymentDate)}</strong>.
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHdr}>
          <div className={styles.cardIcon} style={{ background: 'rgba(42,111,224,0.12)' }}><i className="ti ti-receipt-2" style={{ color: 'var(--sky-dark)' }} /></div>
          <div className={styles.cardTitle}>Payment log</div>
        </div>
        <div className={styles.cardBody}>
          {sorted.length === 0 ? (
            <div className={styles.cardEmpty}>No payments logged yet.</div>
          ) : groupedByMonth.map(group => (
            <div key={group.label}>
              <div className={styles.monthLbl}>{group.label}</div>
              {group.payments.map(p => (
                <div key={p.id} className={styles.pmtRow}>
                  <div className={styles.pmtIcon}><i className={`ti ${paymentIcon(p)}`} /></div>
                  <div className={styles.pmtInfo}>
                    <div className={styles.pmtName}>{fmt(p.amount)}<span className={styles.methodPill}>{p.method}</span></div>
                    <div className={styles.pmtSub}>{dateLabel(p.date)}{p.note ? ` · ${p.note}` : ''}</div>
                  </div>
                  <div className={styles.pmtActions}>
                    <button type="button" className={styles.editBtn} title="Edit payment" onClick={() => setSheetState({ editingPayment: p })}>
                      <i className="ti ti-pencil" />
                    </button>
                    <button
                      type="button"
                      className={`${styles.removeBtn} ${confirmDeleteId === p.id ? styles.removeBtnConfirm : ''}`}
                      title={confirmDeleteId === p.id ? `Tap again to remove ${fmt(p.amount)}` : 'Remove payment'}
                      onClick={() => handleDeleteRow(p)}
                      onBlur={() => setConfirmDeleteId(null)}
                    >
                      <i className={confirmDeleteId === p.id ? 'ti ti-alert-triangle' : 'ti ti-trash'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={() => setSheetState({})}>
            <i className="ti ti-plus" /> Log a payment
          </button>
        </div>
      </div>

      <PaymentSheet
        userId={userId}
        tripId={activeTrip.id}
        giftCards={giftCards}
        rewardPrograms={rewardPrograms}
        remaining={remaining}
        state={sheetState}
        onClose={() => setSheetState(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        onError={msg => showToast?.(msg)}
      />
    </div>
  )
}
