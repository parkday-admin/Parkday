import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/expenses'
import { updateTripSavingsGoal } from '../lib/trips'
import { giftFundsTotals, usesFor, REWARD_TYPE_ICON, REWARD_TYPE_LABEL } from '../lib/giftFunds'
import GiftCardSheet from '../components/GiftCardSheet/GiftCardSheet'
import RewardSheet from '../components/RewardSheet/RewardSheet'
import UsageSheet from '../components/UsageSheet/UsageSheet'
import styles from './Gifts.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function dateLabel(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Gifts() {
  const location = useLocation()
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const {
    activeTrip, loading, userId, showToast, openExpenseSheet,
    giftCards, rewardPrograms, refetchGiftFunds, expensesVersion,
  } = outletContext ?? { activeTrip: null, loading: true, giftCards: [], rewardPrograms: [] }

  const [expenses, setExpenses] = useState(null)
  const [cardSheet, setCardSheet] = useState(null)
  const [rewardSheet, setRewardSheet] = useState(null)
  const [usageState, setUsageState] = useState(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  useEffect(() => {
    if (!activeTrip) { setExpenses(null); return }
    fetchExpenses(activeTrip.id).then(({ data }) => setExpenses(data))
  }, [activeTrip, expensesVersion])

  // Dashboard's "Add a gift card" empty-state CTA lands here and asks the
  // sheet to open immediately. Consume the nav state once so a back/forward
  // visit or refresh doesn't reopen it.
  useEffect(() => {
    if (location.state?.openAddGiftCard) {
      setCardSheet({})
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  if (loading || (activeTrip && (giftCards === null || rewardPrograms === null || expenses === null))) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 160 }} />
        <div className={styles.skelBlock} style={{ height: 200 }} />
        <div className={styles.skelBlock} style={{ height: 200 }} />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-gift ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No active trip</h1>
        <p className={styles.emptySubhead}>Plan a trip to start tracking gift cards & rewards.</p>
      </div>
    )
  }

  const totals = giftFundsTotals(giftCards, rewardPrograms)
  const goal = activeTrip.gc_savings_goal || 0
  const pct = goal > 0 ? Math.min(100, Math.round((totals.totalValue / goal) * 100)) : 0

  function startEditGoal() {
    setGoalInput(String(goal))
    setEditingGoal(true)
  }

  async function commitGoal() {
    setEditingGoal(false)
    const val = parseFloat(goalInput)
    if (isNaN(val) || val < 0) return
    const rounded = Math.round(val)
    if (rounded === goal) return
    const { error } = await updateTripSavingsGoal(activeTrip.id, rounded)
    if (error) { showToast?.(error.message); return }
    showToast?.('Savings goal updated')
    outletContext?.refetchTrips?.()
  }

  function refreshAll() {
    refetchGiftFunds?.()
    fetchExpenses(activeTrip.id).then(({ data }) => setExpenses(data))
  }

  function handleGiftCardSaved(message) {
    setCardSheet(null)
    showToast?.(message)
    refreshAll()
  }
  function handleGiftCardDeleted() {
    setCardSheet(null)
    showToast?.('Gift card removed')
    refreshAll()
  }
  function handleRewardSaved(message) {
    setRewardSheet(null)
    showToast?.(message)
    refreshAll()
  }
  function handleRewardDeleted() {
    setRewardSheet(null)
    showToast?.('Reward removed')
    refreshAll()
  }

  function jumpToExpense(expense) {
    setUsageState(null)
    openExpenseSheet?.({ editingExpense: expense })
  }

  return (
    <div>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroLbl}>Savings goal</div>
            {editingGoal ? (
              <input
                className={styles.goalInp}
                type="number"
                min="0"
                autoFocus
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onBlur={commitGoal}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              />
            ) : (
              <div className={styles.goalDisp} onClick={startEditGoal} title="Tap to edit">
                {fmt(goal)} <i className="ti ti-pencil" />
              </div>
            )}
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroRightLbl}>Total card value</div>
            <div className={styles.heroRightVal}>{fmt(totals.totalValue)}</div>
          </div>
        </div>
        <div className={styles.heroBar}><div className={styles.heroBarFill} style={{ transform: `scaleX(${pct / 100})` }} /></div>
        <div className={styles.heroSub}>{fmt(totals.totalValue)} of {fmt(goal)} goal · {pct}% there</div>
        <div className={styles.heroFooter}>
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Total value</div><div className={styles.heroFooterVal} style={{ color: 'var(--gold)' }}>{fmt(totals.totalValue)}</div></div>
          <div className={styles.heroFooterDivider} />
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Spent</div><div className={styles.heroFooterVal} style={{ color: 'var(--coral)' }}>{fmt(totals.spent)}</div></div>
          <div className={styles.heroFooterDivider} />
          <div className={styles.heroFooterStat}><div className={styles.heroFooterLbl}>Remaining</div><div className={styles.heroFooterVal} style={{ color: 'var(--teal)' }}>{fmt(totals.remaining)}</div></div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHdr}>
          <div className={styles.cardIcon} style={{ background: 'rgba(42,111,224,0.12)' }}><i className="ti ti-credit-card" style={{ color: 'var(--sky-dark)' }} /></div>
          <div className={styles.cardTitle}>Gift cards</div>
        </div>
        <div className={styles.cardBody}>
          {giftCards.length === 0 ? (
            <div className={styles.cardEmpty}>No gift cards yet.</div>
          ) : giftCards.map(c => {
            const depleted = c.balance <= 0
            const uses = usesFor(expenses, 'gift', c.id).length
            return (
              <div key={c.id} className={styles.gcRow}>
                <div className={styles.gcRowTop} onClick={() => setCardSheet({ editingCard: c })}>
                  <div className={`${styles.gcIcon} ${depleted ? styles.depleted : ''}`}><i className="ti ti-credit-card" /></div>
                  <div className={styles.gcInfo}>
                    <div className={styles.gcName}>{c.source}{c.last4 && <span className={styles.last4Pill}>•••• {c.last4}</span>}</div>
                    <div className={styles.gcSub}>Added {dateLabel(c.date_added)}</div>
                  </div>
                  <div className={styles.gcAmts}>
                    <div className={`${styles.gcBalance} ${depleted ? styles.depleted : ''}`}>{depleted ? 'Depleted' : fmt(c.balance)}</div>
                    <div className={`${styles.gcOriginal} ${depleted ? styles.struck : ''}`}>{fmt(c.original_amount)} original</div>
                  </div>
                </div>
                {uses > 0 && (
                  <button type="button" className={styles.viewBtn} onClick={() => setUsageState({ kind: 'gift', source: c })}>
                    <i className="ti ti-receipt" /> View {uses} use{uses === 1 ? '' : 's'} of this card
                  </button>
                )}
              </div>
            )
          })}
          <button type="button" className={styles.addBtn} onClick={() => setCardSheet({})}>
            <i className="ti ti-plus" /> Add gift card
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHdr}>
          <div className={styles.cardIcon} style={{ background: 'rgba(126,214,196,0.2)' }}><i className="ti ti-star" style={{ color: 'var(--teal-dark)' }} /></div>
          <div>
            <div className={styles.cardTitle}>Rewards</div>
            <div className={styles.cardSub}>Points, dollars &amp; credits — not physical cards</div>
          </div>
        </div>
        <div className={styles.cardBody}>
          {rewardPrograms.length === 0 ? (
            <div className={styles.cardEmpty}>No rewards yet.</div>
          ) : rewardPrograms.map(r => {
            const uses = usesFor(expenses, 'reward', r.id).length
            const depleted = r.value <= 0
            return (
              <div key={r.id} className={styles.rwRow}>
                <div className={styles.gcRowTop} onClick={() => setRewardSheet({ editingReward: r })}>
                  <div className={`${styles.rwIcon} ${depleted ? styles.depleted : ''}`}><i className={`ti ${REWARD_TYPE_ICON[r.type]}`} /></div>
                  <div className={styles.gcInfo}>
                    <div className={styles.gcName}>{r.program}</div>
                    <div className={styles.gcSub}>{r.detail || REWARD_TYPE_LABEL[r.type]}</div>
                  </div>
                  <div className={styles.gcAmts}>
                    <div className={`${styles.gcBalance} ${depleted ? styles.depleted : ''}`}>{depleted ? 'Depleted' : fmt(r.value)}</div>
                    <div className={`${styles.gcOriginal} ${depleted ? styles.struck : ''}`}>{fmt(r.original_value)} original</div>
                  </div>
                </div>
                {uses > 0 && (
                  <button type="button" className={styles.viewBtn} onClick={() => setUsageState({ kind: 'reward', source: r })}>
                    <i className="ti ti-receipt" /> View {uses} use{uses === 1 ? '' : 's'} of this reward
                  </button>
                )}
              </div>
            )
          })}
          <button type="button" className={styles.addBtn} onClick={() => setRewardSheet({})}>
            <i className="ti ti-plus" /> Add reward
          </button>
        </div>
      </div>

      <GiftCardSheet
        userId={userId}
        tripId={activeTrip.id}
        state={cardSheet}
        onClose={() => setCardSheet(null)}
        onSaved={handleGiftCardSaved}
        onDeleted={handleGiftCardDeleted}
        onError={msg => showToast?.(msg)}
      />

      <RewardSheet
        userId={userId}
        tripId={activeTrip.id}
        state={rewardSheet}
        onClose={() => setRewardSheet(null)}
        onSaved={handleRewardSaved}
        onDeleted={handleRewardDeleted}
        onError={msg => showToast?.(msg)}
      />

      <UsageSheet
        trip={activeTrip}
        expenses={expenses || []}
        state={usageState}
        onClose={() => setUsageState(null)}
        onJump={jumpToExpense}
      />
    </div>
  )
}
