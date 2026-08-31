import { useEffect, useState } from 'react'
import { addCustomWishListItem, WL_CAT_ORDER, WL_CAT_LABEL, WL_PARK_LABEL, WL_PARK_GROUPS } from '../../lib/wishlist'
import { addCustomWishFavorite } from '../../lib/familyFavorites'
import Sheet from '../Sheet/Sheet'
import styles from './AddCustomItemSheet.module.css'

// Sourced from the same lists the catalog filter/browse UI uses, so a new
// wish list category or park/resort added there shows up here too instead
// of drifting out of sync.
const CATEGORIES = WL_CAT_ORDER.map(value => ({ value, label: WL_CAT_LABEL[value] }))

export default function AddCustomItemSheet({ trip, userId, open, onClose, onSaved, onError, favoritesMode = false, familyMemberId = null }) {
  const [name, setName] = useState('')
  const [park, setPark] = useState('')
  const [category, setCategory] = useState('ride')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [nameError, setNameError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(''); setPark(''); setCategory('ride'); setPrice(''); setNotes(''); setNameError(false)
  }, [open])

  if (!open) return null

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setNameError(true); return }
    const priceNum = Number(price) || 0

    const fields = {
      name: trimmed, park: park || null, category,
      price_label: priceNum ? `~$${priceNum}` : 'No estimate', price_mid: priceNum,
      notes: notes.trim() || null,
    }

    setSaving(true)
    const { data, error } = favoritesMode
      ? await addCustomWishFavorite(userId, familyMemberId, fields)
      : await addCustomWishListItem(userId, trip.id, fields)
    setSaving(false)

    if (error) { onError?.(error.message); return }
    onSaved?.(favoritesMode ? 'Saved as favorite' : 'Added to wish list', data)
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>Add custom item</div>
      </div>

      <div className={styles.body}>
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Name</div>
            <input
              className={`${styles.textInp} ${nameError ? styles.err : ''}`}
              type="text"
              placeholder="e.g. Tiana's Bayou Adventure"
              value={name}
              onChange={e => { setName(e.target.value); setNameError(false) }}
            />
            {nameError && <div className={styles.errMsg}>Enter a name</div>}
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Park <span className={styles.optional}>(optional)</span></div>
            <select className={styles.textInp} value={park} onChange={e => setPark(e.target.value)}>
              <option value="">—</option>
              <option value="All parks">All parks</option>
              {WL_PARK_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map(code => <option key={code} value={code}>{WL_PARK_LABEL[code]}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Category</div>
            <select className={styles.textInp} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Price estimate <span className={styles.optional}>(optional)</span></div>
            <div className={styles.amtWrap}>
              <div className={styles.amtPre}>$</div>
              <input className={styles.amtInp} type="number" min="0" placeholder="0" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Notes <span className={styles.optional}>(optional)</span></div>
            <input className={styles.textInp} type="text" placeholder="Anything you want to remember" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

        <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
          <i className="ti ti-check" /> {saving ? 'Saving…' : favoritesMode ? 'Save as favorite' : 'Save to wish list'}
        </button>
      </div>
    </Sheet>
  )
}
