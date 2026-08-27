import { useEffect, useState } from 'react'
import { createPayment, updatePayment, deletePayment, availablePaymentBalance, paymentSourceLabel } from '../../lib/payments'
import { paymentSourceGroups } from '../../lib/giftFunds'
import Sheet from '../Sheet/Sheet'
import styles from './PaymentSheet.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function today() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default function PaymentSheet({ userId, tripId, giftCards = [], rewardPrograms = [], state, onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingPayment ?? null

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [methodVal, setMethodVal] = useState('manual:Credit card')
  const [note, setNote] = useState('')
  const [amountError, setAmountError] = useState(false)
  const [methodError, setMethodError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!state) return
    setAmount(editing ? String(editing.amount) : '')
    setDate(editing?.date || today())
    setMethodVal(editing?.payment_source || (editing?.method ? `manual:${editing.method}` : 'manual:Credit card'))
    setNote(editing?.note || '')
    setAmountError(false)
    setMethodError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  const pmtGroups = paymentSourceGroups(giftCards, rewardPrograms)
  const allKnownValues = new Set([...pmtGroups.other, ...pmtGroups.gift, ...pmtGroups.reward].map(o => o.value))
  if (methodVal && !allKnownValues.has(methodVal) && methodVal.startsWith('gift:')) {
    const c = giftCards.find(g => `gift:${g.id}` === methodVal)
    if (c) pmtGroups.gift = [...pmtGroups.gift, { value: methodVal, label: `${c.source}${c.last4 ? ` •••• ${c.last4}` : ''} — Depleted` }]
  } else if (methodVal && !allKnownValues.has(methodVal) && methodVal.startsWith('reward:')) {
    const r = rewardPrograms.find(rw => `reward:${rw.id}` === methodVal)
    if (r) pmtGroups.reward = [...pmtGroups.reward, { value: methodVal, label: `${r.program} — $0 left` }]
  }

  async function handleSave() {
    const amountNum = Number(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) { setAmountError(true); return }

    const isManual = methodVal.startsWith('manual:')
    const paymentSource = isManual ? null : methodVal

    if (paymentSource) {
      const available = availablePaymentBalance(paymentSource, giftCards, rewardPrograms, editing?.payment_source, editing?.amount)
      if (amountNum > available) {
        setMethodError(true)
        onError?.(`Only ${fmt(available)} left on ${paymentSourceLabel(paymentSource, giftCards, rewardPrograms)} — reduce the amount or pick another card`)
        return
      }
    }

    const fields = {
      amount: amountNum,
      date: date || today(),
      method: isManual ? methodVal.slice(7) : paymentSourceLabel(paymentSource, giftCards, rewardPrograms),
      payment_source: paymentSource,
      note: note.trim() || null,
    }

    setSaving(true)
    const { error } = editing
      ? await updatePayment(editing.id, fields)
      : await createPayment(userId, tripId, fields)
    setSaving(false)

    if (error) { onError?.(error.message); return }
    onSaved?.(editing ? 'Payment updated' : 'Payment logged')
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    const { error } = await deletePayment(editing.id)
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onDeleted?.()
  }

  return (
    <Sheet open={!!state} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>{editing ? 'Edit payment' : 'Log a payment'}</div>
        {editing && (
          <button type="button" className={styles.trash} onClick={handleDelete} title="Remove payment">
            <i className="ti ti-trash" />
          </button>
        )}
      </div>

      <div className={styles.body}>
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Amount</div>
            <div className={`${styles.amtWrap} ${amountError ? styles.err : ''}`}>
              <div className={styles.amtPre}>$</div>
              <input className={styles.amtInp} type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={e => { setAmount(e.target.value); setAmountError(false) }} />
            </div>
            {amountError && <div className={styles.errMsg}>Enter an amount</div>}
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Date paid</div>
            <input className={styles.textInp} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Payment method</div>
            <select
              className={`${styles.textInp} ${methodError ? styles.err : ''}`}
              value={methodVal}
              onChange={e => { setMethodVal(e.target.value); setMethodError(false) }}
            >
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
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Note <span className={styles.optional}>(optional)</span></div>
            <input className={styles.textInp} type="text" placeholder="e.g. Monthly payment plan installment" value={note} onChange={e => setNote(e.target.value)} />
          </div>

        <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
          <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}
