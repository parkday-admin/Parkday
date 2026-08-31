import { useEffect, useState } from 'react'
import { createExpense, updateExpense } from '../../lib/expenses'
import { updateWishListItem, wlCatMeta, seasonalWarning, llTierToExpenseType } from '../../lib/wishlist'
import { tripDays, dayParkLabel } from '../../lib/trips'
import Sheet from '../Sheet/Sheet'
import styles from './AddToTripSheet.module.css'

export default function AddToTripSheet({ trip, expenses, catalog = [], userId, state, onClose, onSaved, onError }) {
  const item = state?.item ?? null
  const days = trip ? tripDays(trip) : []

  const [dayIndex, setDayIndex] = useState(0)
  const [hasCost, setHasCost] = useState(false)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item) return
    const existingExpense = item.planned_expense_id ? expenses.find(e => e.id === item.planned_expense_id) : null
    const initialDay = item.planned_day || days[0]?.day || 1
    setDayIndex(Math.max(0, days.findIndex(d => d.day === initialDay)))
    setHasCost(existingExpense ? !existingExpense.no_cost : false)
    setAmount(String(existingExpense?.planned_amt ?? item.price_mid ?? ''))
    setNotes(item.notes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state || !item) return null

  const meta = wlCatMeta(item.category)
  const day = days[dayIndex]
  const warning = day ? seasonalWarning(item.seasonal, day.date) : null

  async function handleSave() {
    const trimmedNotes = notes.trim()
    const label = item.name + (trimmedNotes ? ` — ${trimmedNotes}` : '')
    const boothName = item.booth_id ? catalog.find(c => c.id === item.booth_id)?.name ?? null : null
    const festival = item.seasonal?.festival ?? null
    const pillFields = {
      booth_name: boothName, festival,
      location_detail: item.location_detail ?? null,
      lightning_lane_tier: item.lightning_lane_tier ?? null,
      dining_tier: item.dining_tier ?? null,
    }
    // Seed ll_type from the ride's catalog tier so a freshly-added ride
    // starts with the right expense-sheet selection instead of its
    // 'multipass' default — only on create, so re-saving an existing entry
    // (e.g. changing the day) never overwrites an ll_type the user already
    // picked by hand.
    if (!item.planned_expense_id && meta.expenseCat === 'll') {
      pillFields.ll_type = llTierToExpenseType(item.lightning_lane_tier)
    }
    const fields = hasCost
      ? { day: day.day, cat: meta.expenseCat, label, planned_amt: Number(amount) || 0, no_cost: false, ...pillFields }
      : { day: day.day, cat: meta.expenseCat, label, planned_amt: null, actual_amt: null, no_cost: true, ...pillFields }

    setSaving(true)
    const { data: expenseRow, error: expenseError } = item.planned_expense_id
      ? await updateExpense(item.planned_expense_id, fields)
      : await createExpense(userId, trip.id, fields)

    if (expenseError) { setSaving(false); onError?.(expenseError.message); return }

    const { data: updatedItem, error: itemError } = await updateWishListItem(item.id, {
      planned_expense_id: expenseRow.id, planned_day: day.day, notes: trimmedNotes || null,
    })
    setSaving(false)

    if (itemError) { onError?.(itemError.message); return }

    const dayLabel = `Day ${day.day} · ${dayParkLabel(trip, expenses, day.day)}`
    onSaved?.(`Added to ${dayLabel}`, updatedItem)
  }

  return (
    <Sheet open={!!state && !!item} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>Add to trip</div>
      </div>

      <div className={styles.body}>
          <div className={styles.field}>
            <div className={styles.itemName}>{item.name}</div>
            <span className={styles.pill} style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Day</div>
            <div className={styles.dayGrid}>
              {days.map((d, i) => (
                <button key={d.day} type="button" className={`${styles.segBtn} ${dayIndex === i ? styles.sel : ''}`} onClick={() => setDayIndex(i)}>
                  Day {d.day}<br /><span className={styles.segSub}>{d.dow}</span>
                </button>
              ))}
            </div>
          </div>

          {warning && (
            <div className={styles.field}>
              <div className={styles.seasonalWarning}>
                <i className="ti ti-alert-triangle" /> {warning}
              </div>
            </div>
          )}

          <div className={styles.field}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleLeft}>
                <div className={styles.toggleName}>Add a cost for this?</div>
                <div className={styles.toggleSub}>
                  {hasCost ? "It'll count toward your budget." : "It'll show on your itinerary but won't count toward your budget."}
                </div>
              </div>
              <button type="button" className={`${styles.toggle} ${hasCost ? styles.on : ''}`} onClick={() => setHasCost(h => !h)} />
            </div>
          </div>

          {hasCost && (
            <div className={styles.field}>
              <div className={styles.fieldLbl}>Planned amount</div>
              <div className={styles.amtWrap}>
                <div className={styles.amtPre}>$</div>
                <input className={styles.amtInp} type="number" min="0" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>
          )}

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Notes <span className={styles.optional}>(optional)</span></div>
            <input className={styles.textInp} type="text" placeholder="e.g. Book ADR 60 days out" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

        <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
          <i className="ti ti-check" /> {saving ? 'Saving…' : 'Add to itinerary'}
        </button>
      </div>
    </Sheet>
  )
}
