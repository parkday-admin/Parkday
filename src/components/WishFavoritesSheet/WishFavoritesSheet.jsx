import { useEffect, useState } from 'react'
import { fetchCatalog, wlCatMeta } from '../../lib/wishlist'
import { fetchWishFavorites, addCatalogWishFavorite, removeWishFavorite, removeWishFavoriteByCatalogId } from '../../lib/familyFavorites'
import Sheet from '../Sheet/Sheet'
import CatalogGrid from '../CatalogGrid/CatalogGrid'
import AddCustomItemSheet from '../AddCustomItemSheet/AddCustomItemSheet'
import styles from './WishFavoritesSheet.module.css'

// Opened from FamilyMemberSheet as a second sheet stacked on top of it —
// same pattern AddCustomItemSheet already uses over FamilyMemberSheet.
// Split out from the family member edit sheet (and from the pack-favorites
// drawer) because the catalog browser alone is dense enough to want its
// own screen.
export default function WishFavoritesSheet({ userId, member, open, onClose, onError }) {
  const [catalog, setCatalog] = useState(null)
  const [wishFavorites, setWishFavorites] = useState(null)
  const [addCustomOpen, setAddCustomOpen] = useState(false)

  useEffect(() => {
    if (!open || !member) return
    let cancelled = false
    setCatalog(null)
    setWishFavorites(null)
    Promise.all([fetchCatalog(), fetchWishFavorites(member.id)]).then(([cat, wish]) => {
      if (cancelled) return
      setCatalog(cat.data)
      setWishFavorites(wish.data)
    })
    return () => { cancelled = true }
  }, [open, member])

  if (!open || !member) return null

  async function handleToggleCatalogFavorite(item) {
    const already = wishFavorites.find(f => f.source === 'catalog' && f.catalog_id === item.id)
    if (already) {
      const { error } = await removeWishFavoriteByCatalogId(member.id, item.id)
      if (error) { onError?.(error.message); return }
      setWishFavorites(prev => prev.filter(f => f.id !== already.id))
    } else {
      const { data, error } = await addCatalogWishFavorite(userId, member.id, item)
      if (error) { onError?.(error.message); return }
      setWishFavorites(prev => [...prev, data])
    }
  }

  async function handleRemoveWishFavorite(id) {
    const { error } = await removeWishFavorite(id)
    if (error) { onError?.(error.message); return }
    setWishFavorites(prev => prev.filter(f => f.id !== id))
  }

  const firstName = member.name.split(' ')[0]

  return (
    <>
      <Sheet open={open} onClose={onClose}>
        <div className={styles.hdr}>
          <div className={styles.title}>Wish List Favorites</div>
        </div>

        <div className={styles.body}>
          <div className={styles.sub}>These items will be added to {firstName}'s wish list on every new trip.</div>

          {wishFavorites == null ? (
            <div className={styles.loading}>Loading…</div>
          ) : (
            <>
              {wishFavorites.length === 0 ? (
                <div className={styles.empty}>No favorites saved — browse the catalog or add a custom item.</div>
              ) : (
                <div className={styles.pillRow}>
                  {wishFavorites.map(f => {
                    const meta = wlCatMeta(f.category)
                    return (
                      <span key={f.id} className={styles.pill}>
                        <i className={`ti ${meta.icon}`} style={{ color: meta.color }} />
                        {f.name}
                        <button type="button" onClick={() => handleRemoveWishFavorite(f.id)} title="Remove"><i className="ti ti-x" /></button>
                      </span>
                    )
                  })}
                </div>
              )}

              <button type="button" className={styles.addCustomBtn} onClick={() => setAddCustomOpen(true)}>
                <i className="ti ti-plus" /> Add custom item
              </button>

              {catalog && (
                <CatalogGrid
                  catalog={catalog}
                  savedIds={new Set(wishFavorites.filter(f => f.source === 'catalog').map(f => f.catalog_id))}
                  onToggleSave={handleToggleCatalogFavorite}
                  compact
                />
              )}
            </>
          )}
        </div>
      </Sheet>

      <AddCustomItemSheet
        userId={userId}
        open={addCustomOpen}
        favoritesMode
        familyMemberId={member.id}
        onClose={() => setAddCustomOpen(false)}
        onSaved={(_msg, data) => { setWishFavorites(prev => [...prev, data]); setAddCustomOpen(false) }}
        onError={onError}
      />
    </>
  )
}
