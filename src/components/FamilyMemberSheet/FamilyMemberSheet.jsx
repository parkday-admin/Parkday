import { useEffect, useState } from 'react'
import { createFamilyMember, updateFamilyMember, deleteFamilyMember } from '../../lib/familyMembers'
import Sheet from '../Sheet/Sheet'
import styles from './FamilyMemberSheet.module.css'

export default function FamilyMemberSheet({ userId, state, onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingMember ?? null

  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [annualPass, setAnnualPass] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!state) return
    setName(editing?.name || '')
    setBirthdate(editing?.birthdate || '')
    setAnnualPass(editing?.annual_pass || false)
    setNameError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

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

  return (
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
      </div>
    </Sheet>
  )
}
