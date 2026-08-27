import { useEffect, useState } from 'react'
import { createRewardProgram, updateRewardProgram, deleteRewardProgram, REWARD_TYPE_LABEL, REWARD_TYPE_PROGRAM_DEFAULT } from '../../lib/giftFunds'
import Sheet from '../Sheet/Sheet'
import styles from './RewardSheet.module.css'

export default function RewardSheet({ userId, tripId, state, onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingReward ?? null

  const [type, setType] = useState('visa')
  const [program, setProgram] = useState('')
  const [detail, setDetail] = useState('')
  const [value, setValue] = useState('')
  const [programError, setProgramError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!state) return
    setType(editing?.type || 'visa')
    setProgram(editing?.program || REWARD_TYPE_PROGRAM_DEFAULT.visa)
    setDetail(editing?.detail || '')
    setValue(editing ? String(editing.value) : '')
    setProgramError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  function handleTypeChange(newType) {
    setType(newType)
    // Only auto-fill the program name if it still matches the previous
    // type's default — once the user has typed their own name, leave it.
    if (!editing && (program === '' || Object.values(REWARD_TYPE_PROGRAM_DEFAULT).includes(program))) {
      setProgram(REWARD_TYPE_PROGRAM_DEFAULT[newType])
    }
  }

  async function handleSave() {
    const trimmed = program.trim()
    if (!trimmed) { setProgramError(true); return }

    const fields = { type, program: trimmed, detail: detail.trim() || null, value: Number(value) || 0 }

    setSaving(true)
    const { error } = editing
      ? await updateRewardProgram(editing.id, fields)
      : await createRewardProgram(userId, tripId, fields)
    setSaving(false)

    if (error) { onError?.(error.message); return }
    onSaved?.(editing ? 'Reward updated' : 'Reward added')
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    const { error } = await deleteRewardProgram(editing.id)
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onDeleted?.()
  }

  return (
    <Sheet open={!!state} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>{editing ? 'Edit reward' : 'Add reward'}</div>
        {editing && (
          <button type="button" className={styles.trash} onClick={handleDelete} title="Remove reward">
            <i className="ti ti-trash" />
          </button>
        )}
      </div>

      <div className={styles.body}>
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Type</div>
            <select className={styles.textInp} value={type} onChange={e => handleTypeChange(e.target.value)}>
              {Object.entries(REWARD_TYPE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Program name</div>
            <input
              className={`${styles.textInp} ${programError ? styles.err : ''}`}
              type="text"
              placeholder="e.g. Chase Disney Visa"
              value={program}
              onChange={e => { setProgram(e.target.value); setProgramError(false) }}
            />
            {programError && <div className={styles.errMsg}>Enter a program name</div>}
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Detail <span className={styles.optional}>(optional)</span></div>
            <input className={styles.textInp} type="text" placeholder="e.g. 1,200 points" value={detail} onChange={e => setDetail(e.target.value)} />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>$ value</div>
            <div className={styles.amtWrap}>
              <div className={styles.amtPre}>$</div>
              <input className={styles.amtInp} type="number" min="0" step="0.01" placeholder="0.00" value={value} onChange={e => setValue(e.target.value)} />
            </div>
          </div>

        <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
          <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}
