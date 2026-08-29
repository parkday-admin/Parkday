import { useEffect, useState } from 'react'
import { createFamilyMember, updateFamilyMember, deleteFamilyMember } from '../../lib/familyMembers'
import { fetchCatalog } from '../../lib/wishlist'
import {
  fetchWishFavorites, addCatalogWishFavorite, removeWishFavorite, removeWishFavoriteByCatalogId,
  fetchPackFavorites, addPackFavorite, removePackFavorite,
} from '../../lib/familyFavorites'
import { wlCatMeta } from '../../lib/wishlist'
import Sheet from '../Sheet/Sheet'
import CatalogGrid from '../CatalogGrid/CatalogGrid'
import AddCustomItemSheet from '../AddCustomItemSheet/AddCustomItemSheet'
import styles from './FamilyMemberSheet.module.css'

export default function FamilyMemberSheet({ userId, planType, state, onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingMember ?? null
  const showFavorites = planType === 'plus_pass' && !!editing

  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [annualPass, setAnnualPass] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [saving, setSaving] = useState(false)

  const [catalog, setCatalog] = useState(null)
  const [wishFavorites, setWishFavorites] = useState(null)
  const [packFavorites, setPackFavorites] = useState(null)
  const [packInput, setPackInput] = useState('')
  const [addCustomOpen, setAddCustomOpen] = useState(false)

  useEffect(() => {
    if (!state) return
    setName(editing?.name || '')
    setBirthdate(editing?.birthdate || '')
    setAnnualPass(editing?.annual_pass || false)
    setNameError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => {
    if (!showFavorites) return
    let cancelled = false
    Promise.all([fetchCatalog(), fetchWishFavorites(editing.id), fetchPackFavorites(editing.id)]).then(([cat, wish, pack]) => {
      if (cancelled) return
      setCatalog(cat.data)
      setWishFavorites(wish.data)
      setPackFavorites(pack.data)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFavorites, editing?.id])

  if (!state) return null

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setNameError(true); return }

    const fields = { name: trimmed, birthdate: birthdate || null, annual_pass: annualPass }

    setSaving(true)
    const { data, error } = editing
      ? await updateFamilyMember(editing.id, fields)
      : await createFamilyMember(userId, fields)
    setSaving(false)

    if (error) { onError?.(error.message); return }
    onSaved?.(editing ? 'Family member updated' : 'Family member added', data)
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    const { error } = await deleteFamilyMember(editing.id)
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onDeleted?.(editing)
  }

  async function handleToggleCatalogFavorite(item) {
    const already = wishFavorites.find(f => f.source === 'catalog' && f.catalog_id === item.id)
    if (already) {
      const { error } = await removeWishFavoriteByCatalogId(editing.id, item.id)
      if (error) { onError?.(error.message); return }
      setWishFavorites(prev => prev.filter(f => f.id !== already.id))
    } else {
      const { data, error } = await addCatalogWishFavorite(userId, editing.id, item)
      if (error) { onError?.(error.message); return }
      setWishFavorites(prev => [...prev, data])
    }
  }

  async function handleRemoveWishFavorite(id) {
    const { error } = await removeWishFavorite(id)
    if (error) { onError?.(error.message); return }
    setWishFavorites(prev => prev.filter(f => f.id !== id))
  }

  async function handleAddPackFavorite() {
    const label = packInput.trim()
    if (!label) return
    const { data, error } = await addPackFavorite(userId, editing.id, label)
    if (error) { onError?.(error.message); return }
    setPackFavorites(prev => [...prev, data])
    setPackInput('')
  }

  async function handleRemovePackFavorite(id) {
    const { error } = await removePackFavorite(id)
    if (error) { onError?.(error.message); return }
    setPackFavorites(prev => prev.filter(f => f.id !== id))
  }

  const firstName = (name.trim() || 'this person').split(' ')[0]

  return (
    <>
      <Sheet open={!!state} onClose={onClose}>
        <div className={styles.hdr}>
          <div className={styles.title}>{editing ? 'Edit family member' : 'Add family member'}</div>
          {editing && (
            <button type="button" className={styles.trash} onClick={handleDelete} title="Remove family member">
              <i className="ti ti-trash" />
            </button>
          )}
        </div>

        <div className={styles.body}>
            <div className={styles.field}>
              <div className={styles.fieldLbl}>Name</div>
              <input
                className={`${styles.textInp} ${nameError ? styles.err : ''}`}
                type="text"
                placeholder="e.g. Jordan Parker"
                value={name}
                onChange={e => { setName(e.target.value); setNameError(false) }}
              />
              {nameError && <div className={styles.errMsg}>Enter a name</div>}
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLbl}>Birthdate <span className={styles.optional}>(optional)</span></div>
              <input className={styles.textInp} type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} />
            </div>

            <div className={styles.field}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLeft}>
                  <div className={styles.toggleName}>Annual Pass holder</div>
                  <div className={styles.toggleSub}>Tracks blockout dates &amp; renewal in your budget</div>
                </div>
                <button type="button" className={`${styles.toggle} ${annualPass ? styles.on : ''}`} onClick={() => setAnnualPass(a => !a)} />
              </div>
            </div>

          <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
            <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save'}
          </button>

          {showFavorites && (
            <>
              <div className={styles.favSection}>
                <div className={styles.favHdr}>Wish List Favorites</div>
                <div className={styles.favSub}>These items will be added to the wish list on every new trip.</div>

                {wishFavorites == null ? (
                  <div className={styles.favLoading}>Loading…</div>
                ) : (
                  <>
                    {wishFavorites.length === 0 ? (
                      <div className={styles.favEmpty}>No favorites saved — browse the catalog or add a custom item.</div>
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
                      <div className={styles.catalogWrap}>
                        <CatalogGrid
                          catalog={catalog}
                          savedIds={new Set(wishFavorites.filter(f => f.source === 'catalog').map(f => f.catalog_id))}
                          onToggleSave={handleToggleCatalogFavorite}
                          compact
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className={styles.favSection}>
                <div className={styles.favHdr}>Always Pack</div>
                <div className={styles.favSub}>Personal items added to {firstName}'s packing list on every new trip.</div>

                {packFavorites == null ? (
                  <div className={styles.favLoading}>Loading…</div>
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
            </>
          )}
        </div>
      </Sheet>

      {showFavorites && (
        <AddCustomItemSheet
          userId={userId}
          open={addCustomOpen}
          favoritesMode
          familyMemberId={editing?.id}
          onClose={() => setAddCustomOpen(false)}
          onSaved={(_msg, data) => { setWishFavorites(prev => [...prev, data]); setAddCustomOpen(false) }}
          onError={onError}
        />
      )}
    </>
  )
}
