import { useEffect, useRef, useState } from 'react'
import { createExpense, updateExpense, deleteExpense } from '../../lib/expenses'
import { categoriesForTrip, categoryMeta, CATS_WITH_TIME, CATS_WITH_STATUS } from '../../lib/categories'
import { tripDays } from '../../lib/trips'
import { paymentSourceGroups } from '../../lib/giftFunds'
import { catalogItemsForExpenseCat, llTierToExpenseType } from '../../lib/wishlist'
import Sheet from '../Sheet/Sheet'
import styles from './ExpenseSheet.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function fmtTimeInput(t) {
  // stored as free text (e.g. "7:30 PM"); <input type=time> wants "HH:MM"
  if (!t) return ''
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(t.trim())
  if (!m) return ''
  let h = Number(m[1])
  if (m[3]) {
    if (/PM/i.test(m[3]) && h !== 12) h += 12
    if (/AM/i.test(m[3]) && h === 12) h = 0
  }
  return String(h).padStart(2, '0') + ':' + m[2]
}

function fmtTimeOutput(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export default function ExpenseSheet({ trip, userId, state, giftCards = [], rewardPrograms = [], catalog = [], onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingExpense ?? null
  const cats = categoriesForTrip(trip)
  const days = tripDays(trip)

  const [cat, setCat] = useState('dining')
  const [label, setLabel] = useState('')
  const [planned, setPlanned] = useState('')
  const [actual, setActual] = useState('')
  const [day, setDay] = useState(1)
  const [time, setTime] = useState('')
  const [timeDirty, setTimeDirty] = useState(false)
  const [rawTimeFallback, setRawTimeFallback] = useState(null)
  const [llType, setLlType] = useState('multipass')
  const [status, setStatus] = useState(null)
  const [paymentSource, setPaymentSource] = useState('')
  const [noCost, setNoCost] = useState(false)
  const [plannedError, setPlannedError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(null)
  const suggestBlurTimer = useRef(null)

  useEffect(() => {
    if (!confirmingDelete) return undefined
    const t = setTimeout(() => setConfirmingDelete(false), 3000)
    return () => clearTimeout(t)
  }, [confirmingDelete])

  useEffect(() => {
    if (!state) return
    if (editing) {
      setCat(editing.cat)
      setLabel(editing.label || '')
      setPlanned(editing.planned_amt != null ? String(editing.planned_amt) : '')
      setActual(editing.actual_amt != null ? String(editing.actual_amt) : '')
      setDay(editing.day ?? null)
      const parsedTime = fmtTimeInput(editing.time)
      setTime(parsedTime)
      // A stored time that doesn't parse into <input type="time">'s HH:MM
      // format would otherwise be silently wiped on save (the input can
      // only ever produce a value it understands) — keep the original raw
      // string so an unedited field still round-trips it.
      setRawTimeFallback(editing.time && !parsedTime ? editing.time : null)
      setTimeDirty(false)
      setLlType(editing.ll_type || 'multipass')
      setStatus(editing.status || null)
      setPaymentSource(editing.payment_source || '')
      setNoCost(!!editing.no_cost)
    } else {
      const initialCat = state.presetCat && cats.includes(state.presetCat) ? state.presetCat : cats.find(c => categoryMeta(c).scope === 'day') || cats[0]
      setCat(initialCat)
      setLabel('')
      setPlanned('')
      setActual('')
      // A preset day (e.g. adding from a specific day's view) always wins.
      // Otherwise default to a real day for day-ish categories and leave it
      // blank (trip expense) for ones that are usually trip-level — either
      // way it's just a starting point, not a lock; the picker below always
      // has the "Trip expense" option too.
      setDay(state.presetDay || (categoryMeta(initialCat).scope === 'day' ? (days[0]?.day || 1) : null))
      setTime('')
      setTimeDirty(false)
      setRawTimeFallback(null)
      setLlType('multipass')
      setStatus(null)
      setPaymentSource('')
      setNoCost(false)
    }
    setPlannedError(false)
    setConfirmingDelete(false)
    setSuggestOpen(false)
    setJustSaved(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  const meta = categoryMeta(cat)
  const showTime = CATS_WITH_TIME.has(cat) || (cat === 'll' && llType === 'singlepass')
  const showLlType = cat === 'll'
  const showStatus = CATS_WITH_STATUS.has(cat)

  function copyPlannedToActual() {
    if (planned) setActual(planned)
  }

  // Catalog-backed label suggestions — Parkday already maintains detailed
  // catalogs (rides, dining, snacks, experiences) elsewhere in the app;
  // surfacing them here means logging a Lightning Lane purchase or a
  // festival snack means picking the real thing instead of retyping it.
  const catalogMatches = catalogItemsForExpenseCat(catalog, cat)
  const labelSearch = label.trim().toLowerCase()
  const suggestions = labelSearch.length >= 1
    ? catalogMatches.filter(c => c.name.toLowerCase().includes(labelSearch)).slice(0, 6)
    : []

  function selectSuggestion(item) {
    setLabel(item.name)
    if (planned === '' && item.price_mid) setPlanned(String(Math.round(item.price_mid)))
    if (cat === 'll') {
      const impliedType = llTierToExpenseType(item.lightning_lane_tier)
      if (impliedType) setLlType(impliedType)
    }
    setSuggestOpen(false)
  }

  function handleLabelBlur() {
    // A short delay so a click on a suggestion (which blurs the input
    // first) still registers before the list unmounts.
    clearTimeout(suggestBlurTimer.current)
    suggestBlurTimer.current = setTimeout(() => setSuggestOpen(false), 150)
  }

  const pmtGroups = paymentSourceGroups(giftCards, rewardPrograms)
  // Keep the currently-selected source selectable even if its balance has
  // since hit $0 or it's a manual label not in the preset list — otherwise
  // editing an expense would silently drop the saved value from the menu.
  const allKnownValues = new Set([...pmtGroups.other, ...pmtGroups.gift, ...pmtGroups.reward].map(o => o.value))
  let currentSourceExtra = null
  if (paymentSource && !allKnownValues.has(paymentSource)) {
    if (paymentSource.startsWith('gift:')) {
      const c = giftCards.find(g => `gift:${g.id}` === paymentSource)
      if (c) currentSourceExtra = { group: 'gift', option: { value: paymentSource, label: `${c.source}${c.last4 ? ` •••• ${c.last4}` : ''} — Depleted` } }
    } else if (paymentSource.startsWith('reward:')) {
      const r = rewardPrograms.find(rw => `reward:${rw.id}` === paymentSource)
      if (r) currentSourceExtra = { group: 'reward', option: { value: paymentSource, label: `${r.program} — $0 left` } }
    } else {
      currentSourceExtra = { group: 'other', option: { value: paymentSource, label: paymentSource.replace(/^manual:/, '') } }
    }
  }
  if (currentSourceExtra) pmtGroups[currentSourceExtra.group] = [...pmtGroups[currentSourceExtra.group], currentSourceExtra.option]

  async function handleSave() {
    const plannedNum = planned === '' ? null : Number(planned)
    const actualNum = actual === '' ? null : Number(actual)

    let finalPlanned = plannedNum
    if (finalPlanned == null && actualNum != null) finalPlanned = actualNum

    // A no-cost entry (e.g. added from the wish list with the cost toggle
    // off) has no amount by design — only require one when the entry isn't
    // staying no-cost, so editing other fields (like adding a time) doesn't
    // force the user to enter a planned/actual amount.
    const stayingNoCost = noCost && finalPlanned == null
    if (finalPlanned == null && !stayingNoCost) { setPlannedError(true); return }

    const finalLabel = label.trim() || (day == null ? meta.label : null)

    const fields = {
      cat,
      // A dayless (trip-level) entry has no day to fall back on for
      // display, so default to the category name when left blank.
      label: finalLabel,
      planned_amt: stayingNoCost ? null : finalPlanned,
      actual_amt: stayingNoCost ? null : actualNum,
      no_cost: stayingNoCost,
      day,
      // An unedited time that never successfully parsed into the native
      // time input keeps its original raw value instead of being wiped —
      // only an intentional clear (dirtied, then emptied) saves as null.
      time: showTime ? (fmtTimeOutput(time) || (!timeDirty ? rawTimeFallback : null)) : null,
      ll_type: showLlType ? llType : null,
      status: showStatus ? status : null,
      payment_source: paymentSource || null,
    }

    setSaving(true)
    const { error } = editing
      ? await updateExpense(editing.id, fields)
      : await createExpense(userId, trip.id, fields)
    setSaving(false)

    if (error) { onError?.(error.message); return }

    // A brief "stamped ticket" confirmation before the drawer closes — the
    // moment of committing real spend gets a beat of its own instead of
    // vanishing straight into a toast.
    const dayLabel = day == null ? 'Trip expense' : `Day ${day}`
    setJustSaved({ amount: fmt(finalPlanned ?? 0), label: finalLabel || meta.label, dayLabel })
    // No message here — the receipt view just shown is this save's only
    // confirmation, so the caller shouldn't also fire a toast for it.
    setTimeout(() => onSaved?.(), 900)
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    setConfirmingDelete(false)
    setSaving(true)
    const { error } = await deleteExpense(editing.id)
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onDeleted?.(editing)
  }

  if (justSaved) {
    return (
      <Sheet open={!!state} onClose={onClose}>
        <div className={styles.receipt}>
          <div className={styles.receiptCheck}><i className="ti ti-check" /></div>
          <div className={styles.receiptAmt}>{justSaved.amount}</div>
          <div className={styles.receiptMeta}>{justSaved.label} · {justSaved.dayLabel}</div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet open={!!state} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>{editing ? 'Edit' : 'Add'} {meta.label} expense</div>
        {editing && (
          <button
            type="button"
            className={`${styles.trash} ${confirmingDelete ? styles.trashConfirm : ''}`}
            onClick={handleDelete}
            onBlur={() => setConfirmingDelete(false)}
            aria-label={confirmingDelete ? 'Tap again to delete expense' : 'Delete expense'}
          >
            <i aria-hidden="true" className={confirmingDelete ? 'ti ti-alert-triangle' : 'ti ti-trash'} />
          </button>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.field}>
          <div className={styles.fieldLbl}>Category</div>
          <div className={styles.catGrid}>
            {cats.map(c => {
              const cm = categoryMeta(c)
              return (
                <button
                  key={c}
                  type="button"
                  className={`${styles.catPill} ${cat === c ? styles.sel : ''}`}
                  style={cat === c ? { borderColor: cm.color, background: cm.bg, color: cm.color } : undefined}
                  onClick={() => setCat(c)}
                >
                  <i className={`ti ${cm.icon}`} /> {cm.label}
                </button>
              )
            })}
          </div>
        </div>

        {showLlType && (
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Lightning Lane type</div>
            <div className={styles.seg2}>
              <button type="button" className={`${styles.segBtn} ${llType === 'multipass' ? styles.sel : ''}`} onClick={() => setLlType('multipass')}>Multi Pass</button>
              <button type="button" className={`${styles.segBtn} ${llType === 'singlepass' ? styles.sel : ''}`} onClick={() => setLlType('singlepass')}>Single Pass</button>
              <button type="button" className={`${styles.segBtn} ${llType === 'premierpass' ? styles.sel : ''}`} onClick={() => setLlType('premierpass')}>Premier Pass</button>
            </div>
          </div>
        )}

        <div className={`${styles.field} ${styles.labelField}`}>
          <div className={styles.fieldLbl}>Label <span className={styles.optional}>(optional)</span></div>
          <input
            className={styles.textInp}
            type="text"
            placeholder={meta.label}
            value={label}
            onChange={e => { setLabel(e.target.value); setSuggestOpen(true) }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={handleLabelBlur}
          />
          {suggestOpen && suggestions.length > 0 && (
            <div className={styles.suggestList}>
              {suggestions.map(item => (
                <button type="button" key={item.id} className={styles.suggestItem} onMouseDown={() => selectSuggestion(item)}>
                  <span className={styles.suggestName}>{item.name}</span>
                  {item.price_label && <span className={styles.suggestPrice}>{item.price_label}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {showTime && (
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Time <span className={styles.optional}>(optional)</span></div>
            <input className={styles.textInp} type="time" value={time} onChange={e => { setTime(e.target.value); setTimeDirty(true) }} />
          </div>
        )}

        {showStatus && (
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Status</div>
            <div className={styles.seg3}>
              <button type="button" className={`${styles.statusBtn} ${status === 'confirmed' ? styles.selConfirmed : ''}`} onClick={() => setStatus('confirmed')}>Confirmed</button>
              <button type="button" className={`${styles.statusBtn} ${status === 'waitlist' ? styles.selWaitlist : ''}`} onClick={() => setStatus('waitlist')}>Waitlist</button>
              <button type="button" className={`${styles.statusBtn} ${!status ? styles.selPlanned : ''}`} onClick={() => setStatus(null)}>Planned</button>
            </div>
          </div>
        )}

        <div className={styles.field}>
          <div className={styles.fieldLbl}>Day <span className={styles.optional}>(optional)</span></div>
          <div className={styles.dayGrid}>
            <button type="button" className={`${styles.segBtn} ${day == null ? styles.sel : ''}`} onClick={() => setDay(null)}>
              Trip<br />expense
            </button>
            {days.map(d => (
              <button key={d.day} type="button" className={`${styles.segBtn} ${day === d.day ? styles.sel : ''}`} onClick={() => setDay(d.day)}>
                Day {d.day}<br />{d.dow}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.amtRow}>
            <div>
              <div className={styles.fieldLbl}>Planned</div>
              <div className={`${styles.amtWrap} ${plannedError ? styles.err : ''}`}>
                <div className={styles.amtPre}>$</div>
                <input className={styles.amtInp} type="number" min="0" placeholder="" value={planned}
                  onChange={e => { setPlanned(e.target.value); setPlannedError(false) }} />
              </div>
            </div>
            <button type="button" className={styles.copyBtn} aria-label="Copy planned to actual" onClick={copyPlannedToActual}>
              <i aria-hidden="true" className="ti ti-arrow-right" />
            </button>
            <div>
              <div className={styles.fieldLbl}>Actual <span className={styles.optional}>(if spent)</span></div>
              <div className={styles.amtWrap}>
                <div className={styles.amtPre}>$</div>
                <input className={styles.amtInp} type="number" min="0" placeholder="—" value={actual} onChange={e => setActual(e.target.value)} />
              </div>
            </div>
          </div>
          {plannedError && <div className={styles.errMsg}>Enter a planned or actual amount</div>}
          {!plannedError && noCost && planned === '' && actual === '' && (
            <div className={styles.optional} style={{ marginTop: 5 }}>No cost — leave blank to keep it off the budget.</div>
          )}
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLbl}>Payment source <span className={styles.optional}>(optional)</span></div>
          <div className={styles.selectWrap}>
            <select className={styles.textInp} value={paymentSource} onChange={e => setPaymentSource(e.target.value)}>
              <option value="">None — not tracked</option>
              <optgroup label="Other">
                {pmtGroups.other.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
              {pmtGroups.gift.length > 0 && (
                <optgroup label="Gift cards">
                  {pmtGroups.gift.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              )}
              {pmtGroups.reward.length > 0 && (
                <optgroup label="Rewards">
                  {pmtGroups.reward.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              )}
            </select>
            <i aria-hidden="true" className={`ti ti-chevron-down ${styles.selectChevron}`} />
          </div>
        </div>

        <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
          <i className="ti ti-check" /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}
        </button>
      </div>
    </Sheet>
  )
}
