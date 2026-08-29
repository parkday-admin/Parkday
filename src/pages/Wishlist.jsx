import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { fetchExpenses, deleteExpense } from '../lib/expenses'
import {
  fetchCatalog, fetchWishList, addCatalogItemToWishList, removeWishListItemByCatalogId,
  deleteWishListItem, WL_CAT_ORDER, WL_PARK_LABEL, wlCatMeta,
} from '../lib/wishlist'
import { dayParkLabel } from '../lib/trips'
import BrowseCatalogSheet from '../components/BrowseCatalogSheet/BrowseCatalogSheet'
import AddToTripSheet from '../components/AddToTripSheet/AddToTripSheet'
import AddCustomItemSheet from '../components/AddCustomItemSheet/AddCustomItemSheet'
import styles from './Wishlist.module.css'

export default function Wishlist() {
  const outletContext = useOutletContext()
  const { activeTrip, loading, userId, showToast } = outletContext ?? { activeTrip: null, loading: true }
  const [catalog, setCatalog] = useState(null)
  const [wishList, setWishList] = useState(null)
  const [expenses, setExpenses] = useState(null)
  const [error, setError] = useState(null)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [planState, setPlanState] = useState(null)

  async function reload() {
    if (!activeTrip) return
    const [{ data: wl, error: wlErr }, { data: ex }] = await Promise.all([
      fetchWishList(userId, activeTrip.id),
      fetchExpenses(activeTrip.id),
    ])
    if (wlErr) setError(wlErr.message)
    setWishList(wl)
    setExpenses(ex)
  }

  useEffect(() => {
    if (!activeTrip) { setWishList(null); setExpenses(null); return }
    fetchCatalog().then(({ data, error }) => { if (error) setError(error.message); setCatalog(data) })
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip, userId])

  if (loading || (activeTrip && (catalog === null || wishList === null || expenses === null))) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skelBlock} style={{ height: 44 }} />
        <div className={styles.skelBlock} style={{ height: 300 }} />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-heart ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No active trip</h1>
        <p className={styles.emptySubhead}>Plan a trip to start a wish list.</p>
      </div>
    )
  }

  const savedCatalogIds = new Set(wishList.filter(w => w.catalog_id).map(w => w.catalog_id))

  async function handleToggleSave(catalogItem) {
    if (savedCatalogIds.has(catalogItem.id)) {
      const { error } = await removeWishListItemByCatalogId(userId, activeTrip.id, catalogItem.id)
      if (error) { showToast?.(error.message); return }
    } else {
      const { error } = await addCatalogItemToWishList(userId, activeTrip.id, catalogItem)
      if (error) { showToast?.(error.message); return }
    }
    reload()
  }

  async function handleRemove(item) {
    if (item.planned_expense_id) {
      const linkedExpense = expenses.find(e => e.id === item.planned_expense_id)
      if (linkedExpense?.actual_amt != null) {
        const { error } = await deleteWishListItem(item.id)
        if (error) { showToast?.(error.message); return }
        showToast?.('Removed from wish list — expense kept since it has spending logged')
      } else {
        // Delete the wish list row first — it holds a foreign key to the
        // expense, so deleting the expense first would violate that
        // constraint and fail.
        const { error } = await deleteWishListItem(item.id)
        if (error) { showToast?.(error.message); return }
        const { error: expenseError } = await deleteExpense(item.planned_expense_id)
        if (expenseError) { showToast?.(expenseError.message); return }
        showToast?.('Removed from wish list and trip')
      }
    } else {
      const { error } = await deleteWishListItem(item.id)
      if (error) { showToast?.(error.message); return }
      showToast?.('Removed from wish list')
    }
    reload()
  }

  function handlePlanSaved(message, updatedItem) {
    setPlanState(null)
    showToast?.(message)
    setWishList(prev => prev.map(w => w.id === updatedItem.id ? updatedItem : w))
    reload()
  }

  function handleCustomSaved(message, newItem) {
    setCustomOpen(false)
    showToast?.(message)
    setWishList(prev => [...prev, newItem])
    reload()
  }

  const grouped = WL_CAT_ORDER.map(catKey => ({ catKey, items: wishList.filter(w => w.category === catKey) })).filter(g => g.items.length)

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.toolbar}>
        <button type="button" className={styles.browseBtn} onClick={() => setBrowseOpen(true)}>
          <i className="ti ti-list-search" /> Browse catalog
        </button>
        <button type="button" className={styles.addBtn} title="Add custom item" onClick={() => setCustomOpen(true)}>
          <i className="ti ti-plus" />
        </button>
      </div>

      {wishList.length === 0 ? (
        <div className={styles.emptyPrompt}>
          <i className="ti ti-heart" />
          <div className={styles.emptyPromptTitle}>Nothing saved yet</div>
          <div className={styles.emptyPromptSub}>Browse the catalog to get started.</div>
          <button type="button" className={styles.browseBtnInline} onClick={() => setBrowseOpen(true)}>
            <i className="ti ti-list-search" /> Browse catalog
          </button>
        </div>
      ) : (
        grouped.map(g => {
          const catMeta = wlCatMeta(g.catKey)
          return (
            <div key={g.catKey}>
              <div className={styles.catHdr}>{catMeta.label.toUpperCase()}</div>
              <div className={styles.card}>
                {g.items.map(item => {
                  const meta = wlCatMeta(item.category)
                  return (
                    <div key={item.id} className={styles.item}>
                      <div className={styles.itemIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
                      <div className={styles.itemMain}>
                        <div className={styles.itemName}>{item.name}</div>
                        {item.favorited_by?.length > 1 && (
                          <div className={styles.itemFavoritedBy}>Favorited by {item.favorited_by.join(' and ')}</div>
                        )}
                        <div className={styles.itemSub}>
                          {item.park && <span className={styles.itemPark}>{WL_PARK_LABEL[item.park] || item.park}</span>}
                          <span className={styles.pill} style={{ background: meta.bg, color: meta.color }}>{meta.label.replace(/s$/, '')}</span>
                          {item.price_label && <span className={styles.itemPrice}>{item.price_label}</span>}
                        </div>
                        {item.planned_expense_id && (
                          <div className={styles.itemAdded}>
                            <i className="ti ti-circle-check-filled" /> Added to Day {item.planned_day} · {dayParkLabel(activeTrip, expenses, item.planned_day)}
                          </div>
                        )}
                      </div>
                      <div className={styles.itemActions}>
                        {item.planned_expense_id ? (
                          <button type="button" className={styles.editBtn} title="Edit trip" onClick={() => setPlanState({ item })}>
                            <i className="ti ti-pencil" />
                          </button>
                        ) : (
                          <button type="button" className={styles.editBtn} title="Add to trip" onClick={() => setPlanState({ item })}>
                            <i className="ti ti-calendar-plus" />
                          </button>
                        )}
                        <button type="button" className={styles.removeBtn} title="Remove" onClick={() => handleRemove(item)}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      <BrowseCatalogSheet
        open={browseOpen}
        catalog={catalog}
        savedCatalogIds={savedCatalogIds}
        onClose={() => setBrowseOpen(false)}
        onToggleSave={handleToggleSave}
      />

      <AddToTripSheet
        trip={activeTrip}
        expenses={expenses}
        userId={userId}
        state={planState}
        onClose={() => setPlanState(null)}
        onSaved={handlePlanSaved}
        onError={msg => showToast?.(msg)}
      />

      <AddCustomItemSheet
        trip={activeTrip}
        userId={userId}
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onSaved={handleCustomSaved}
        onError={msg => showToast?.(msg)}
      />
    </div>
  )
}
