import { useEffect, useState } from 'react'
import { createExpense, updateExpense, deleteExpense } from '../../lib/expenses'
import { categoriesForTrip, categoryMeta, CATS_WITH_TIME, CATS_WITH_STATUS } from '../../lib/categories'
import { tripDays } from '../../lib/trips'
import styles from './ExpenseSheet.module.css'

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

export default function ExpenseSheet({ trip, userId, state, onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingExpense ?? null
  const cats = categoriesForTrip(trip)
  const days = tripDays(trip)

  const [cat, setCat] = useState('dining')
  const [label, setLabel] = useState('')
  const [planned, setPlanned] = useState('')
  const [actual, setActual] = useState('')
  const [day, setDay] = useState(1)
  const [time, setTime] = useState('')
  const [llType, setLlType] = useState('multipass')
  const [status, setStatus] = useState(null)
  const [plannedError, setPlannedError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!state) return
    if (editing) {
      setCat(editing.cat)
      setLabel(editing.label || '')
      setPlanned(editing.planned_amt != null ? String(editing.planned_amt) : '')
      setActual(editing.actual_amt != null ? String(editing.actual_amt) : '')
      setDay(editing.day || 1)
      setTime(fmtTimeInput(editing.time))
      setLlType(editing.ll_type || 'multipass')
      setStatus(editing.status || null)
    } else {
      const initialCat = state.presetCat && cats.includes(state.presetCat) ? state.presetCat : cats.find(c => categoryMeta(c).scope === 'day') || cats[0]
      setCat(initialCat)
      setLabel('')
      setPlanned('')
      setActual('')
      setDay(state.presetDay || days[0]?.day || 1)
      setTime('')
      setLlType('multipass')
      setStatus(null)
    }
    setPlannedError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  const meta = categoryMeta(cat)
  const tripLevel = meta.scope === 'trip'
  const showTime = CATS_WITH_TIME.has(cat) || (cat === 'll' && llType === 'singlepass')
  const showLlType = cat === 'll'
  const showStatus = CATS_WITH_STATUS.has(cat)

  function copyPlannedToActual() {
    if (planned) setActual(planned)
  }

  async function handleSave() {
    const plannedNum = planned === '' ? null : Number(planned)
    const actualNum = actual === '' ? null : Number(actual)

    let finalPlanned = plannedNum
    if (finalPlanned == null && actualNum != null) finalPlanned = actualNum
    if (finalPlanned == null) { setPlannedError(true); return }

    const fields = {
      cat,
      // Trip-level entries have no day to fall back on for display, so
      // default to the category name when left blank.
      label: label.trim() || (tripLevel ? meta.label : null),
      planned_amt: finalPlanned,
      actual_amt: actualNum,
      day: tripLevel ? null : day,
      time: showTime ? fmtTimeOutput(time) : null,
      ll_type: showLlType ? llType : null,
      status: showStatus ? status : null,
    }

    setSaving(true)
    const { error } = editing
      ? await updateExpense(editing.id, fields)
      : await createExpense(userId, trip.id, fields)
    setSaving(false)

    if (error) { onError?.(error.message); return }
    onSaved?.(editing ? 'Expense updated' : 'Expense added')
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    const { error } = await deleteExpense(editing.id)
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onDeleted?.(editing)
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.dragWrap}><div className={styles.drag} /></div>
        <div className={styles.hdr}>
          <div className={styles.title}>{editing ? 'Edit expense' : 'Add expense'}</div>
          {editing && (
            <button type="button" className={styles.trash} onClick={handleDelete} title="Delete expense">
              <i className="ti ti-trash" />
            </button>
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Category</div>
            <div className={styles.catScroll}>
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

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Label <span className={styles.optional}>(optional)</span></div>
            <input className={styles.textInp} type="text" placeholder={meta.label} value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          <div className={styles.field}>
            <div className={styles.amtRow}>
              <div>
                <div className={styles.fieldLbl}>Planned</div>
                <div className={`${styles.amtWrap} ${plannedError ? styles.err : ''}`}>
                  <div className={styles.amtPre}>$</div>
                  <input className={styles.amtInp} type="number" min="0" placeholder="0" value={planned}
                    onChange={e => { setPlanned(e.target.value); setPlannedError(false) }} />
                </div>
              </div>
              <button type="button" className={styles.copyBtn} title="Copy planned to actual" onClick={copyPlannedToActual}>
                <i className="ti ti-arrow-right" />
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
          </div>

          {!tripLevel && (
            <div className={styles.field}>
              <div className={styles.fieldLbl}>Day</div>
              <div className={styles.dayGrid}>
                {days.map(d => (
                  <button key={d.day} type="button" className={`${styles.segBtn} ${day === d.day ? styles.sel : ''}`} onClick={() => setDay(d.day)}>
                    Day {d.day}<br />{d.dow}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showLlType && (
            <div className={styles.field}>
              <div className={styles.fieldLbl}>Lightning Lane type</div>
              <div className={styles.seg2}>
                <button type="button" className={`${styles.segBtn} ${llType === 'multipass' ? styles.sel : ''}`} onClick={() => setLlType('multipass')}>Multi Pass</button>
                <button type="button" className={`${styles.segBtn} ${llType === 'singlepass' ? styles.sel : ''}`} onClick={() => setLlType('singlepass')}>Single Pass</button>
              </div>
            </div>
          )}

          {showTime && (
            <div className={styles.field}>
              <div className={styles.fieldLbl}>Time <span className={styles.optional}>(optional)</span></div>
              <input className={styles.textInp} type="time" value={time} onChange={e => setTime(e.target.value)} />
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

          <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
            <i className="ti ti-check" /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}
          </button>
        </div>
      </div>
    </>
  )
}
