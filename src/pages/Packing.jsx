import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/expenses'
import { parseLocalDate } from '../lib/trips'
import { onActivateKey } from '../lib/a11y'
import ProgressBar from '../components/ProgressBar/ProgressBar'
import {
  PACK_CAT_META, PACK_CAT_ORDER, fetchPackingItems, insertPackingItems,
  togglePackingItem, deletePackingItem, addCustomPackingItem,
  deletePackingItemsForTab, buildAllRows, buildTabRows, buildTabReasons,
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
  const [pendingAdd, setPendingAdd] = useState({})
  const [confirmingReset, setConfirmingReset] = useState(false)
  const resetConfirmTimer = useRef(null)
  const [catOverrides, setCatOverrides] = useState({})

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

  useEffect(() => {
    if (!confirmingReset) return undefined
    resetConfirmTimer.current = setTimeout(() => setConfirmingReset(false), 3000)
    return () => clearTimeout(resetConfirmTimer.current)
  }, [confirmingReset])

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
        <i aria-hidden="true" className={`ti ti-backpack ${styles.emptyIcon}`} />
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
  const reasonMap = buildTabReasons(activePerson.member, familyMembers, tripCtxFor(activeTrip, expenses))

  async function handleToggle(item) {
    const { error } = await togglePackingItem(item.id, !item.checked)
    if (error) { showToast?.('Couldn’t update that item. Try again.'); return }
    setPackingItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !item.checked } : i))
  }

  async function handleRemove(item) {
    const { error } = await deletePackingItem(item.id)
    if (error) { showToast?.('Couldn’t remove that item. Try again.'); return }
    setPackingItems(prev => prev.filter(i => i.id !== item.id))
    showToast?.('Item removed', {
      actionLabel: 'Undo',
      onAction: async () => {
        const { data, error: restoreError } = await insertPackingItems([{
          user_id: userId, trip_id: activeTrip.id, family_member_id: item.family_member_id,
          category: item.category, text: item.text, checked: item.checked, custom: item.custom, sort_order: item.sort_order,
        }])
        if (restoreError || !data.length) { showToast?.('Couldn’t restore that item.'); return }
        setPackingItems(prev => [...prev, data[0]])
      },
    })
  }

  async function handleAdd(catKey) {
    const pendingKey = `${activeKey}:${catKey}`
    const text = (addInputs[catKey] || '').trim()
    if (!text || pendingAdd[pendingKey]) return
    setPendingAdd(prev => ({ ...prev, [pendingKey]: true }))
    const sortOrder = itemsFor(activeKey).filter(i => i.category === catKey).length
    const { data, error } = await addCustomPackingItem(userId, activeTrip.id, activeFamilyMemberId, catKey, text, sortOrder)
    setPendingAdd(prev => ({ ...prev, [pendingKey]: false }))
    if (error) { showToast?.('Couldn’t add that item. Try again.'); return }
    setPackingItems(prev => [...prev, data])
    setAddInputs(prev => ({ ...prev, [catKey]: '' }))
  }

  async function handleReset() {
    if (!confirmingReset) { setConfirmingReset(true); return }
    setConfirmingReset(false)
    const { error: delError } = await deletePackingItemsForTab(activeTrip.id, activeFamilyMemberId, true)
    if (delError) { showToast?.('Couldn’t reset this list. Try again.'); return }
    const rows = buildTabRows(userId, activeTrip.id, activeFamilyMemberId, activePerson.member, familyMembers, tripCtxFor(activeTrip, expenses))
    const { error: insError } = await insertPackingItems(rows)
    if (insError) { showToast?.('Couldn’t reset this list. Try again.'); return }
    const { data } = await fetchPackingItems(userId, activeTrip.id)
    setPackingItems(data)
    showToast?.('List reset to defaults')
  }

  return (
    <div>
      {c.total > 0 && (
        <div className={styles.progressCard}>
          <div className={styles.progressLbl}>Packing progress</div>
          {c.done === c.total ? (
            <div className={styles.progressDoneRow}>
              <i aria-hidden="true" className="ti ti-circle-check-filled" />
              <div className={styles.progressDoneText}>All packed! Nice work.</div>
            </div>
          ) : (
            <div className={styles.progressCountRow}>
              <div className={styles.progressCount}>{c.done} / {c.total}</div>
              <div className={styles.progressCountLbl}>packed</div>
            </div>
          )}
          <ProgressBar value={pct} tone="teal" dark height={6} />
        </div>
      )}

      <div className={styles.tabs}>
        {people.map(p => {
          const pc = counts(p.key)
          const allDone = pc.total > 0 && pc.done === pc.total
          return (
            <button key={p.key} type="button" className={`${styles.tab} ${p.key === activeKey ? styles.tabActive : ''}`} onClick={() => setActiveTab(p.key)}>
              {p.isGroup ? <div aria-hidden="true" className={styles.tabGroupIcon}><i className="ti ti-users" /></div> : <div aria-hidden="true" className={styles.tabAvatar}>{p.label.charAt(0)}</div>}
              {p.label}
              {allDone && <i aria-hidden="true" className={`ti ti-circle-check-filled ${styles.tabDone}`} />}
            </button>
          )
        })}
      </div>

      {familyMembers.length === 0 && (
        <div className={styles.famPrompt}>
          <i aria-hidden="true" className="ti ti-users" />
          <span>Add family members to get a personalized list for each person. <button type="button" className={styles.famPromptLink} onClick={() => navigate('/account')}>Add family members</button></span>
        </div>
      )}

      {grouped.map(g => {
        const meta = PACK_CAT_META[g.catKey]
        const doneCt = g.items.filter(i => i.checked).length
        const overrideKey = `${activeKey}:${g.catKey}`
        const autoCollapsed = g.items.length > 0 && doneCt === g.items.length
        const collapsed = overrideKey in catOverrides ? catOverrides[overrideKey] : autoCollapsed
        const toggleCollapsed = () => setCatOverrides(prev => ({ ...prev, [overrideKey]: !collapsed }))
        return (
          <div key={g.catKey} className={styles.cat}>
            <div
              className={styles.catHdr}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsed}
              aria-label={`${meta.label}, ${doneCt} of ${g.items.length} packed`}
              onClick={toggleCollapsed}
              onKeyDown={onActivateKey(toggleCollapsed)}
            >
              <div className={styles.catIcon}><i aria-hidden="true" className={`ti ${meta.icon}`} /></div>
              <div className={styles.catTitle}>{meta.label}</div>
              <div className={styles.catCount}>{doneCt}/{g.items.length}</div>
              <i aria-hidden="true" className={`ti ti-chevron-down ${styles.catChevron} ${collapsed ? styles.catChevronCollapsed : ''}`} />
            </div>
            {!collapsed && (
              <>
                {g.items.map(item => (
                  <div
                    key={item.id}
                    className={`${styles.item} ${item.checked ? styles.itemChecked : ''}`}
                    role="checkbox"
                    tabIndex={0}
                    aria-checked={item.checked}
                    aria-label={item.text}
                    onClick={() => handleToggle(item)}
                    onKeyDown={onActivateKey(() => handleToggle(item))}
                  >
                    <div className={styles.check}><i aria-hidden="true" className="ti ti-check" /></div>
                    <div className={styles.itemText}>{item.text}</div>
                    {!item.custom && reasonMap.get(item.text) && (
                      <button
                        type="button"
                        className={styles.itemReason}
                        title={reasonMap.get(item.text)}
                        aria-label={`Why suggested: ${reasonMap.get(item.text)}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <i aria-hidden="true" className="ti ti-info-circle" />
                      </button>
                    )}
                    <button type="button" className={styles.itemDel} title="Remove" aria-label="Remove item" onClick={e => { e.stopPropagation(); handleRemove(item) }}>
                      <i aria-hidden="true" className="ti ti-x" />
                    </button>
                  </div>
                ))}
                <div className={styles.addRow}>
                  <input
                    className={styles.addInp}
                    type="text"
                    placeholder="Add an item…"
                    value={addInputs[g.catKey] || ''}
                    disabled={pendingAdd[`${activeKey}:${g.catKey}`]}
                    onChange={e => setAddInputs(prev => ({ ...prev, [g.catKey]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(g.catKey) }}
                  />
                  <button type="button" className={styles.addBtn} aria-label="Add item" disabled={pendingAdd[`${activeKey}:${g.catKey}`]} onClick={() => handleAdd(g.catKey)}><i aria-hidden="true" className="ti ti-plus" /></button>
                </div>
              </>
            )}
          </div>
        )
      })}

      <button
        type="button"
        className={`${styles.resetBtn} ${confirmingReset ? styles.resetBtnConfirm : ''}`}
        onClick={handleReset}
        onBlur={() => setConfirmingReset(false)}
      >
        <i aria-hidden="true" className={confirmingReset ? 'ti ti-alert-triangle' : 'ti ti-rotate-2'} />
        {confirmingReset ? `Tap again to reset ${activePerson.label}’s list` : 'Reset to defaults'}
      </button>
    </div>
  )
}
