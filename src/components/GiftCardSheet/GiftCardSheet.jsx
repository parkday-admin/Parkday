import { useEffect, useState } from 'react'
import { createGiftCard, updateGiftCard, deleteGiftCard } from '../../lib/giftFunds'
import styles from './GiftCardSheet.module.css'

const SOURCE_OPTIONS = ['Target', "Sam's Club", 'Disney Store', 'Received as gift']

function today() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default function GiftCardSheet({ userId, tripId, state, onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingCard ?? null

  const [source, setSource] = useState('')
  const [original, setOriginal] = useState('')
  const [balance, setBalance] = useState('')
  const [last4, setLast4] = useState('')
  const [dateAdded, setDateAdded] = useState(today())
  const [sourceError, setSourceError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!state) return
    setSource(editing?.source || '')
    setOriginal(editing ? String(editing.original_amount) : '')
    setBalance(editing ? String(editing.balance) : '')
    setLast4(editing?.last4 || '')
    setDateAdded(editing?.date_added || today())
    setSourceError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  async function handleSave() {
    const trimmed = source.trim()
    if (!trimmed) { setSourceError(true); return }

    const originalNum = Number(original) || 0
    const fields = {
      source: trimmed,
      original_amount: originalNum,
      balance: balance === '' ? originalNum : Number(balance) || 0,
      last4: last4.trim().slice(0, 4) || null,
      date_added: dateAdded || today(),
    }
    fields.depleted = fields.balance <= 0

    setSaving(true)
    const { error } = editing
      ? await updateGiftCard(editing.id, fields)
      : await createGiftCard(userId, tripId, fields)
    setSaving(false)

    if (error) { onError?.(error.message); return }
    onSaved?.(editing ? 'Gift card updated' : 'Gift card added')
  }

  async function handleMarkDepleted() {
    if (!editing) return
    setSaving(true)
    const { error } = await updateGiftCard(editing.id, { balance: 0, depleted: true })
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onSaved?.('Marked as depleted')
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    const { error } = await deleteGiftCard(editing.id)
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onDeleted?.()
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.dragWrap}><div className={styles.drag} /></div>
        <div className={styles.hdr}>
          <div className={styles.title}>{editing ? 'Edit gift card' : 'Add gift card'}</div>
          {editing && (
            <button type="button" className={styles.trash} onClick={handleDelete} title="Remove gift card">
              <i className="ti ti-trash" />
            </button>
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Source</div>
            <input
              className={`${styles.textInp} ${sourceError ? styles.err : ''}`}
              type="text"
              list="gc-source-options"
              placeholder="e.g. Target"
              value={source}
              onChange={e => { setSource(e.target.value); setSourceError(false) }}
            />
            <datalist id="gc-source-options">
              {SOURCE_OPTIONS.map(o => <option key={o} value={o} />)}
            </datalist>
            {sourceError && <div className={styles.errMsg}>Enter a source</div>}
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Original amount</div>
            <div className={styles.amtWrap}>
              <div className={styles.amtPre}>$</div>
              <input className={styles.amtInp} type="number" min="0" step="0.01" placeholder="0.00" value={original} onChange={e => setOriginal(e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Balance remaining</div>
            <div className={styles.amtWrap}>
              <div className={styles.amtPre}>$</div>
              <input className={styles.amtInp} type="number" min="0" step="0.01" placeholder="0.00" value={balance} onChange={e => setBalance(e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Last 4 digits <span className={styles.optional}>(optional)</span></div>
            <input className={styles.textInp} type="text" inputMode="numeric" maxLength={4} placeholder="e.g. 4821" value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, ''))} />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Date added</div>
            <input className={styles.textInp} type="date" value={dateAdded} onChange={e => setDateAdded(e.target.value)} />
          </div>

          <div className={styles.footerRow}>
            {editing && (
              <button type="button" className={styles.depleteBtn} disabled={saving} onClick={handleMarkDepleted}>Mark depleted</button>
            )}
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
              <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
