import { useEffect, useState } from 'react'
import { createReminder, updateReminder, deleteReminder } from '../../lib/reminders'
import Sheet from '../Sheet/Sheet'
import styles from './ReminderSheet.module.css'

export default function ReminderSheet({ userId, tripId, state, onClose, onSaved, onDeleted, onError }) {
  const editing = state?.editingReminder ?? null

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [titleError, setTitleError] = useState(false)
  const [dateError, setDateError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!state) return
    setTitle(editing?.title || '')
    setDate(editing?.reminder_date || '')
    setDescription(editing?.description || '')
    setTitleError(false)
    setDateError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  if (!state) return null

  async function handleSave() {
    const trimmedTitle = title.trim()
    let hasError = false
    if (!trimmedTitle) { setTitleError(true); hasError = true }
    if (!date) { setDateError(true); hasError = true }
    if (hasError) return

    const fields = { title: trimmedTitle, reminder_date: date, description: description.trim() || null }

    setSaving(true)
    const { error } = editing
      ? await updateReminder(editing.id, fields)
      : await createReminder(userId, tripId, fields)
    setSaving(false)

    if (error) { onError?.(error.message); return }
    onSaved?.(editing ? 'Reminder updated' : 'Reminder added')
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    const { error } = await deleteReminder(editing.id)
    setSaving(false)
    if (error) { onError?.(error.message); return }
    onDeleted?.()
  }

  return (
    <Sheet open={!!state} onClose={onClose}>
      <div className={styles.hdr}>
        <div className={styles.title}>{editing ? 'Edit reminder' : 'Add reminder'}</div>
        {editing && (
          <button type="button" className={styles.trash} onClick={handleDelete} title="Remove reminder">
            <i className="ti ti-trash" />
          </button>
        )}
      </div>

      <div className={styles.body}>
          <div className={styles.field}>
            <div className={styles.fieldLbl}>Title</div>
            <input
              className={`${styles.textInp} ${titleError ? styles.err : ''}`}
              type="text"
              placeholder="e.g. Book dining reservations"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleError(false) }}
            />
            {titleError && <div className={styles.errMsg}>Enter a title</div>}
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Date</div>
            <input
              className={`${styles.textInp} ${dateError ? styles.err : ''}`}
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setDateError(false) }}
            />
            {dateError && <div className={styles.errMsg}>Enter a date</div>}
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLbl}>Description <span className={styles.optional}>(optional)</span></div>
            <input className={styles.textInp} type="text" placeholder="Any notes about this reminder" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

        <button type="button" className={styles.saveBtn} disabled={saving} onClick={handleSave}>
          <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}
