import { useEffect, useState } from 'react'
import { fetchPackFavorites, addPackFavorite, removePackFavorite } from '../../lib/familyFavorites'
import Sheet from '../Sheet/Sheet'
import styles from './AlwaysPackSheet.module.css'

// Opened from FamilyMemberSheet as a second sheet stacked on top of it —
// split out into its own drawer, separate from WishFavoritesSheet, so
// neither one has to share scroll space with the other.
export default function AlwaysPackSheet({ userId, member, open, onClose, onError }) {
  const [packFavorites, setPackFavorites] = useState(null)
  const [packInput, setPackInput] = useState('')

  useEffect(() => {
    if (!open || !member) return
    let cancelled = false
    setPackFavorites(null)
    fetchPackFavorites(member.id).then(({ data }) => { if (!cancelled) setPackFavorites(data) })
    return () => { cancelled = true }
  }, [open, member])

  if (!open || !member) return null

  async function handleAddPackFavorite() {
    const label = packInput.trim()
    if (!label) return
    const { data, error } = await addPackFavorite(userId, member.id, label)
    if (error) { onError?.(error.message); return }
    setPackFavorites(prev => [...prev, data])
    setPackInput('')
  }

  async function handleRemovePackFavorite(id) {
    const { error } = await removePackFavorite(id)
    if (error) { onError?.(error.message); return }
    setPackFavorites(prev => prev.filter(f => f.id !== id))
  }

  const firstName = member.name.split(' ')[0]

  return (
    <Sheet open={open} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>Always Pack</div>
      </div>

      <div className={styles.body}>
        <div className={styles.sub}>Personal items added to {firstName}'s packing list on every new trip.</div>

        {packFavorites == null ? (
          <div className={styles.loading}>Loading…</div>
        ) : (
          <div className={styles.pillRow}>
            {packFavorites.map(f => (
              <span key={f.id} className={styles.pill}>
                {f.label}
                <button type="button" onClick={() => handleRemovePackFavorite(f.id)} title="Remove"><i className="ti ti-x" /></button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.addRow}>
          <input
            className={styles.textInp}
            type="text"
            placeholder="e.g. EpiPen"
            value={packInput}
            onChange={e => setPackInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddPackFavorite() }}
          />
          <button type="button" className={styles.addBtn} onClick={handleAddPackFavorite}><i className="ti ti-plus" /></button>
        </div>
      </div>
    </Sheet>
  )
}
