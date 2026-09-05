import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/expenses'
import { parseLocalDate } from '../lib/trips'
import {
  PACK_CAT_META, PACK_CAT_ORDER, fetchPackingItems, insertPackingItems,
  togglePackingItem, deletePackingItem, addCustomPackingItem,
  deletePackingItemsForTab, buildAllRows, buildTabRows,
} from '../lib/packing'
import styles from './Packing.module.css'

function tripCtxFor(trip, expenses) {
  const tripMonth = trip.arrival_date ? parseLocalDate(trip.arrival_date).getMonth() : 0
  return {
    isFlying: trip.travel_mode === 'flying',
    isSummer: tripMonth >= 5 && tripMonth <= 8,
    parkDayCount: expenses.filter(e => e.cat === 'park_day').length,
  }
}

export default function Packing() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { activeTrip, loading, userId, familyMembers, showToast } = outletContext ?? { activeTrip: null, loading: true, familyMembers: null }

  const [expenses, setExpenses] = useState(null)
  const [packingItems, setPackingItems] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [addInputs, setAddInputs] = useState({})

  useEffect(() => {
    if (!activeTrip) { setExpenses(null); return }
    fetchExpenses(activeTrip.id).then(({ data }) => setExpenses(data))
  }, [activeTrip])

  useEffect(() => {
    if (!activeTrip || familyMembers == null || expenses === null) return
    let cancelled = false
    fetchPackingItems(userId, activeTrip.id).then(async ({ data }) => {
      if (cancelled) return
      if (data.length === 0) {
        const rows = buildAllRows(userId, activeTrip.id, familyMembers, tripCtxFor(activeTrip, expenses))
        const { data: inserted } = await insertPackingItems(rows)
        if (!cancelled) setPackingItems(inserted)
      } else {
        setPackingItems(data)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip, familyMembers, expenses])

  if (loading || (activeTrip && (familyMembers == null || expenses === null || packingItems === null))) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 44 }} />
        <div className={styles.skelBlock} style={{ height: 60 }} />
        <div className={styles.skelBlock} style={{ height: 300 }} />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-backpack ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No active trip</h1>
        <p className={styles.emptySubhead}>Plan a trip to build a packing list.</p>
      </div>
    )
  }

  const people = [
    ...familyMembers.map(m => ({ key: m.id, label: m.name.split(' ')[0], member: m, isGroup: false })),
    { key: '__group__', label: 'Group', member: null, isGroup: true },
  ]
  const activeKey = activeTab && people.some(p => p.key === activeTab) ? activeTab : people[0].key
  const activePerson = people.find(p => p.key === activeKey)
  const activeFamilyMemberId = activePerson.isGroup ? null : activePerson.key

  function itemsFor(key) {
    return packingItems.filter(i => (key === '__group__' ? i.family_member_id === null : i.family_member_id === key))
  }
  function counts(key) {
    const items = itemsFor(key)
    return { total: items.length, done: items.filter(i => i.checked).length }
  }

  const activeItems = itemsFor(activeKey)
  const c = counts(activeKey)
  const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0
  const grouped = PACK_CAT_ORDER.map(catKey => ({
    catKey,
    items: activeItems.filter(i => i.category === catKey).sort((a, b) => a.sort_order - b.sort_order),
  })).filter(g => g.items.length > 0)

  async function handleToggle(item) {
    const { error } = await togglePackingItem(item.id, !item.checked)
    if (error) { showToast?.(error.message); return }
    setPackingItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !item.checked } : i))
  }

  async function handleRemove(item) {
    const { error } = await deletePackingItem(item.id)
    if (error) { showToast?.(error.message); return }
    setPackingItems(prev => prev.filter(i => i.id !== item.id))
  }

  async function handleAdd(catKey) {
    const text = (addInputs[catKey] || '').trim()
    if (!text) return
    const sortOrder = itemsFor(activeKey).filter(i => i.category === catKey).length
    const { data, error } = await addCustomPackingItem(userId, activeTrip.id, activeFamilyMemberId, catKey, text, sortOrder)
    if (error) { showToast?.(error.message); return }
    setPackingItems(prev => [...prev, data])
    setAddInputs(prev => ({ ...prev, [catKey]: '' }))
  }

  async function handleReset() {
    const { error: delError } = await deletePackingItemsForTab(activeTrip.id, activeFamilyMemberId, true)
    if (delError) { showToast?.(delError.message); return }
    const rows = buildTabRows(userId, activeTrip.id, activeFamilyMemberId, activePerson.member, familyMembers, tripCtxFor(activeTrip, expenses))
    const { error: insError } = await insertPackingItems(rows)
    if (insError) { showToast?.(insError.message); return }
    const { data } = await fetchPackingItems(userId, activeTrip.id)
    setPackingItems(data)
    showToast?.('List reset to defaults')
  }

  return (
    <div>
      <div className={styles.tabs}>
        {people.map(p => {
          const pc = counts(p.key)
          const allDone = pc.total > 0 && pc.done === pc.total
          return (
            <button key={p.key} type="button" className={`${styles.tab} ${p.key === activeKey ? styles.tabActive : ''}`} onClick={() => setActiveTab(p.key)}>
              {p.isGroup ? <div className={styles.tabGroupIcon}><i className="ti ti-users" /></div> : <div className={styles.tabAvatar}>{p.label.charAt(0)}</div>}
              {p.label}
              {allDone && <i className={`ti ti-circle-check-filled ${styles.tabDone}`} />}
            </button>
          )
        })}
      </div>

      {familyMembers.length === 0 && (
        <div className={styles.famPrompt}>
          <i className="ti ti-users" />
          <span>Add family members to get a personalized list for each person. <button type="button" className={styles.famPromptLink} onClick={() => navigate('/account')}>Add family members</button></span>
        </div>
      )}

      {c.total > 0 && (
        c.done === c.total ? (
          <div className={styles.allDone}><i className="ti ti-circle-check-filled" />All packed! Nice work.</div>
        ) : (
          <div className={styles.progressCard}>
            <div className={styles.progressTop}>
              <div className={styles.progressLbl}>Packing progress</div>
              <div className={styles.progressCount}>{c.done} / {c.total} packed</div>
            </div>
            <div className={styles.progressTrack}><div className={styles.progressFill} style={{ transform: `scaleX(${pct / 100})` }} /></div>
          </div>
        )
      )}

      {grouped.map(g => {
        const meta = PACK_CAT_META[g.catKey]
        const doneCt = g.items.filter(i => i.checked).length
        return (
          <div key={g.catKey} className={styles.cat}>
            <div className={styles.catHdr}>
              <div className={styles.catIcon}><i className={`ti ${meta.icon}`} /></div>
              <div className={styles.catTitle}>{meta.label}</div>
              <div className={styles.catCount}>{doneCt}/{g.items.length}</div>
            </div>
            {g.items.map(item => (
              <div key={item.id} className={`${styles.item} ${item.checked ? styles.itemChecked : ''}`} onClick={() => handleToggle(item)}>
                <div className={styles.check}><i className="ti ti-check" /></div>
                <div className={styles.itemText}>{item.text}</div>
                <button type="button" className={styles.itemDel} title="Remove" onClick={e => { e.stopPropagation(); handleRemove(item) }}>
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
            <div className={styles.addRow}>
              <input
                className={styles.addInp}
                type="text"
                placeholder="Add an item…"
                value={addInputs[g.catKey] || ''}
                onChange={e => setAddInputs(prev => ({ ...prev, [g.catKey]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(g.catKey) }}
              />
              <button type="button" className={styles.addBtn} onClick={() => handleAdd(g.catKey)}><i className="ti ti-plus" /></button>
            </div>
          </div>
        )
      })}

      <button type="button" className={styles.resetBtn} onClick={handleReset}>Reset to defaults</button>
    </div>
  )
}
