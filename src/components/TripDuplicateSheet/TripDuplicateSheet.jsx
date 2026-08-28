import { useEffect, useState } from 'react'
import Sheet from '../Sheet/Sheet'
import styles from './TripDuplicateSheet.module.css'

// Step 1 of the trip duplication flow: name the new trip. Step 2 (setting
// new dates and reviewing the rest) happens in the Configurator, which
// onContinue navigates to.
export default function TripDuplicateSheet({ state, onClose, onContinue }) {
  const sourceTrip = state?.sourceTrip ?? null
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sourceTrip) return
    setName(`${sourceTrip.name} (copy)`)
    setLoading(false)
  }, [sourceTrip])

  if (!sourceTrip) return null

  async function handleContinue() {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    await onContinue?.(trimmed)
    setLoading(false)
  }

  return (
    <Sheet open={!!state} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>New trip from {sourceTrip.name}</div>
      </div>
      <div className={styles.body}>
        <div className={styles.field}>
          <div className={styles.fieldLbl}>Trip name</div>
          <input
            className={styles.textInp}
            type="text"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className={styles.note}>You'll set new dates in the next step.</div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.continueBtn} disabled={loading || !name.trim()} onClick={handleContinue}>
            {loading ? 'Loading…' : 'Continue →'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
