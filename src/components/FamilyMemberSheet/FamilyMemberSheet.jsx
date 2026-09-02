import { useEffect, useState } from 'react'
import { createFamilyMember, updateFamilyMember, deleteFamilyMember } from '../../lib/familyMembers'
import Sheet from '../Sheet/Sheet'
import WishFavoritesSheet from '../WishFavoritesSheet/WishFavoritesSheet'
import AlwaysPackSheet from '../AlwaysPackSheet/AlwaysPackSheet'
import styles from './FamilyMemberSheet.module.css'

const AP_TIERS = [
  { id: 'incredi-pass', name: 'Incredi-Pass', sub: 'No blockout dates' },
  { id: 'sorcerer', name: 'Sorcerer Pass', sub: 'Few blockout dates' },
  { id: 'pirate', name: 'Pirate Pass', sub: 'Some blockout dates' },
  { id: 'pixie-dust', name: 'Pixie Dust Pass', sub: 'Most blockout dates' },
]

export default function FamilyMemberSheet({ userId, planType, state, onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingMember ?? null
  const showFavorites = planType === 'plus_pass' && !!editing

  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [annualPass, setAnnualPass] = useState(false)
  const [annualPassTier, setAnnualPassTier] = useState('')
  const [nameError, setNameError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [wishFavoritesOpen, setWishFavoritesOpen] = useState(false)
  const [alwaysPackOpen, setAlwaysPackOpen] = useState(false)

  useEffect(() => {
    if (!state) return
    setName(editing?.name || '')
    setBirthdate(editing?.birthdate || '')
    setAnnualPass(editing?.annual_pass || false)
    setAnnualPassTier(editing?.annual_pass_tier || '')
    setNameError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  function toggleAnnualPass() {
    setAnnualPass(a => {
      const next = !a
      if (!next) setAnnualPassTier('')
      return next
    })
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setNameError(true); return }

    const fields = {
      name: trimmed,
      birthdate: birthdate || null,
      annual_pass: annualPass,
      annual_pass_tier: annualPass ? (annualPassTier || null) : null,
    }

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
                <button type="button" className={`${styles.toggle} ${annualPass ? styles.on : ''}`} onClick={toggleAnnualPass} />
              </div>
              {annualPass && (
                <div className={styles.tierPicker}>
                  <div className={styles.tierLbl}>Pass tier <span className={styles.optional}>(optional)</span></div>
                  <div className={styles.tierGrid}>
                    {AP_TIERS.map(tier => (
                      <button
                        key={tier.id}
                        type="button"
                        className={`${styles.tierPill} ${annualPassTier === tier.id ? styles.sel : ''}`}
                        onClick={() => setAnnualPassTier(t => (t === tier.id ? '' : tier.id))}
                      >
                        <span className={styles.tierName}>{tier.name}</span>
                        <span className={styles.tierSub}>{tier.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          {showFavorites && (
            <>
              <button type="button" className={styles.favoritesBtn} onClick={() => setWishFavoritesOpen(true)}>
                <span className={styles.favoritesBtnLeft}>
                  <i className="ti ti-heart" />
                  Wish List Favorites
                </span>
                <i className="ti ti-chevron-right" />
              </button>
              <button type="button" className={styles.favoritesBtn} onClick={() => setAlwaysPackOpen(true)}>
                <span className={styles.favoritesBtnLeft}>
                  <i className="ti ti-backpack" />
                  Always Pack
                </span>
                <i className="ti ti-chevron-right" />
              </button>
            </>
          )}

          <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
            <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Sheet>

      {showFavorites && (
        <>
          <WishFavoritesSheet
            userId={userId}
            member={editing}
            open={wishFavoritesOpen}
            onClose={() => setWishFavoritesOpen(false)}
            onError={onError}
          />
          <AlwaysPackSheet
            userId={userId}
            member={editing}
            open={alwaysPackOpen}
            onClose={() => setAlwaysPackOpen(false)}
            onError={onError}
          />
        </>
      )}
    </>
  )
}
