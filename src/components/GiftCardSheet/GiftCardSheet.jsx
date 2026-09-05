import { useEffect, useState } from 'react'
import { createGiftCard, updateGiftCard, deleteGiftCard } from '../../lib/giftFunds'
import Sheet from '../Sheet/Sheet'
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
  const [balanceError, setBalanceError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!state) return
    setSource(editing?.source || '')
    setOriginal(editing ? String(editing.original_amount) : '')
    setBalance(editing ? String(editing.balance) : '')
    setLast4(editing?.last4 || '')
    setDateAdded(editing?.date_added || today())
    setSourceError(false)
    setBalanceError(false)
    setConfirmDelete(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(t)
  }, [confirmDelete])

  if (!state) return null

  async function handleSave() {
    const trimmed = source.trim()
    if (!trimmed) { setSourceError(true); return }

    const originalNum = Number(original) || 0
    const balanceNum = balance === '' ? originalNum : Number(balance) || 0
    if (balanceNum > originalNum) { setBalanceError(true); return }
    setBalanceError(false)

    const fields = {
      source: trimmed,
      original_amount: originalNum,
      balance: balanceNum,
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
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    const { error } = await deleteGiftCard(editing.id)
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onDeleted?.()
  }

  return (
    <Sheet open={!!state} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>{editing ? 'Edit gift card' : 'Add gift card'}</div>
        {editing && (
          <button
            type="button"
            className={`${styles.trash} ${confirmDelete ? styles.trashConfirm : ''}`}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            aria-label={confirmDelete ? 'Tap again to permanently delete this gift card' : 'Remove gift card'}
          >
            <i className={`ti ${confirmDelete ? 'ti-alert-triangle' : 'ti-trash'}`} />
          </button>
        )}
      </div>

      <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.fieldLbl} htmlFor="gc-source">Source</label>
            <input
              id="gc-source"
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
            <label className={styles.fieldLbl} htmlFor="gc-original">Original amount</label>
            <div className={styles.amtWrap}>
              <div className={styles.amtPre}>$</div>
              <input id="gc-original" className={styles.amtInp} type="number" min="0" step="0.01" placeholder="0.00" value={original} onChange={e => setOriginal(e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLbl} htmlFor="gc-balance">Balance remaining</label>
            <div className={`${styles.amtWrap} ${balanceError ? styles.err : ''}`}>
              <div className={styles.amtPre}>$</div>
              <input id="gc-balance" className={styles.amtInp} type="number" min="0" step="0.01" placeholder="0.00" value={balance} onChange={e => { setBalance(e.target.value); setBalanceError(false) }} />
            </div>
            {balanceError && <div className={styles.errMsg}>Balance can't be more than the original amount</div>}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLbl} htmlFor="gc-last4">Last 4 digits <span className={styles.optional}>(optional)</span></label>
            <input id="gc-last4" className={styles.textInp} type="text" inputMode="numeric" maxLength={4} placeholder="e.g. 4821" value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, ''))} />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLbl} htmlFor="gc-date">Date added</label>
            <input id="gc-date" className={styles.textInp} type="date" value={dateAdded} onChange={e => setDateAdded(e.target.value)} />
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
    </Sheet>
  )
}
