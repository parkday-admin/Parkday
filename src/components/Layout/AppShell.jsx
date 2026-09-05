import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import styles from './AppShell.module.css'
import { signOutAndRedirect } from '../../lib/auth'
import { fetchActiveTrips } from '../../lib/trips'
import { createExpense } from '../../lib/expenses'
import { fetchFamilyMembers } from '../../lib/familyMembers'
import { fetchGiftCards, fetchRewardPrograms } from '../../lib/giftFunds'
import { fetchCatalog } from '../../lib/wishlist'
import { fetchReminders, insertReminders, buildSystemReminders, urgencyLevel } from '../../lib/reminders'
import { daysUntil } from '../../lib/trips'
import { categoryMeta } from '../../lib/categories'
import { loadDuplicationSource } from '../../lib/tripDuplication'
import ExpenseSheet from '../ExpenseSheet/ExpenseSheet'
import FamilyMemberSheet from '../FamilyMemberSheet/FamilyMemberSheet'
import TripDuplicateSheet from '../TripDuplicateSheet/TripDuplicateSheet'
import Toast from '../Toast/Toast'

const ACTIVE_TRIP_KEY = 'pkd_active_trip_id'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/today': 'Today',
  '/budget': 'Budget',
  '/itinerary': 'Itinerary',
  '/wishlist': 'Wish list',
  '/payments': 'Payments',
  '/gifts': 'Gift Cards & Rewards',
  '/packing': 'Packing list',
  '/reminders': 'Reminders',
  '/estimator': 'Estimator',
  '/estimates': 'Estimates',
  '/account': 'Account',
  '/trip-settings': 'Trip settings',
  '/configurator': 'Plan your trip',
  '/more': 'More',
}

// The 4 frequent destinations on the mobile tab bar, plus a "More" screen
// grouping everything else — see the More page for that full list.
const TAB_ITEMS = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/budget', icon: 'ti-chart-pie', label: 'Budget' },
  { to: '/itinerary', icon: 'ti-calendar', label: 'Itinerary' },
  { to: '/wishlist', icon: 'ti-heart', label: 'Wish list' },
]
const MORE_ROUTES = ['/more', '/payments', '/gifts', '/packing', '/reminders', '/trip-settings', '/estimator', '/estimates', '/account']

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/budget', icon: 'ti-chart-pie', label: 'Budget' },
  { to: '/itinerary', icon: 'ti-calendar', label: 'Itinerary' },
  { to: '/wishlist', icon: 'ti-heart', label: 'Wish list' },
  { to: '/payments', icon: 'ti-credit-card', label: 'Payments' },
  { to: '/gifts', icon: 'ti-gift', label: 'Gift Cards/Rewards' },
  { to: '/packing', icon: 'ti-backpack', label: 'Packing list' },
  { to: '/reminders', icon: 'ti-bell', label: 'Reminders' },
  { to: '/trip-settings', icon: 'ti-settings', label: 'Trip settings' },
  { to: '/estimates', icon: 'ti-calculator', label: 'Estimates' },
]

function fmtDateShort(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function tripDateRange(trip) {
  if (!trip.arrival_date || !trip.departure_date) return ''
  const [ay] = trip.arrival_date.split('-')
  const [dy] = trip.departure_date.split('-')
  return `${fmtDateShort(trip.arrival_date)} – ${fmtDateShort(trip.departure_date)}, ${dy || ay}`
}

export default function AppShell({ session, planType, accountType, collaboratorOf, canAccess }) {
  const location = useLocation()
  const navigate = useNavigate()
  // Account-level data (family members, gift funds, reminders — and every
  // trip they attach to) belongs to the account owner, not necessarily the
  // signed-in user. For an owner those are the same id; for a collaborator
  // they're not, so every load/create below needs to resolve to this, not
  // session.user.id.
  const ownerId = accountType === 'collaborator' ? collaboratorOf : session.user.id
  const hdrRef = useRef(null)
  const userMenuRef = useRef(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [trips, setTrips] = useState(null)
  const [activeTripId, setActiveTripIdState] = useState(() => localStorage.getItem(ACTIVE_TRIP_KEY))
  const [sheetState, setSheetState] = useState(null)
  const [expensesVersion, setExpensesVersion] = useState(0)
  const [familyMembers, setFamilyMembers] = useState(null)
  const [famSheetState, setFamSheetState] = useState(null)
  const [duplicateSheetState, setDuplicateSheetState] = useState(null)
  const [giftCards, setGiftCards] = useState(null)
  const [rewardPrograms, setRewardPrograms] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [reminders, setReminders] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function showToast(message, opts) {
    clearTimeout(toastTimer.current)
    setToast({ message, ...opts })
    toastTimer.current = setTimeout(() => setToast(null), opts?.actionLabel ? 5000 : 2600)
  }

  function openExpenseSheet(opts) {
    setSheetState(opts ?? {})
  }

  function closeExpenseSheet() {
    setSheetState(null)
  }

  function handleExpenseSaved(message) {
    closeExpenseSheet()
    setExpensesVersion(v => v + 1)
    loadGiftFunds()
    // The Add Expense drawer already shows its own "stamped ticket" receipt
    // confirmation before calling this — a toast on top would just repeat
    // the same news a second time. Only show one if the caller has no
    // receipt of its own (message present).
    if (message) showToast(message)
  }

  function handleExpenseDeleted(deletedExpense) {
    closeExpenseSheet()
    setExpensesVersion(v => v + 1)
    loadGiftFunds()
    showToast('Expense deleted', {
      actionLabel: 'Undo',
      onAction: async () => {
        const { cat, label, time, status, ll_type, planned_amt, actual_amt, day } = deletedExpense
        await createExpense(ownerId, activeTrip.id, { cat, label, time, status, ll_type, planned_amt, actual_amt, day })
        setExpensesVersion(v => v + 1)
        loadGiftFunds()
        setToast(null)
      },
    })
  }

  function handleExpenseError(message) {
    showToast(message)
  }

  async function loadTrips() {
    const { data } = await fetchActiveTrips()
    setTrips(data)
    if (data.length && !data.some(t => t.id === activeTripId)) {
      setActiveTripIdState(data[0].id)
      localStorage.setItem(ACTIVE_TRIP_KEY, data[0].id)
    }
  }

  async function loadFamilyMembers() {
    const { data } = await fetchFamilyMembers(ownerId)
    setFamilyMembers(data)
  }

  useEffect(() => {
    loadTrips()
    loadFamilyMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The header's account menu is persistent across every page, so clicking
  // anywhere outside it (not just another menu action) needs to close it.
  useEffect(() => {
    if (!userMenuOpen) return
    function onDocClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [userMenuOpen])

  // Bottom sheets (Sheet.module.css) read this to keep their top edge below
  // the fixed header, however tall it renders at the current breakpoint.
  useEffect(() => {
    function updateHeaderHeight() {
      if (hdrRef.current) document.documentElement.style.setProperty('--app-header-h', `${hdrRef.current.offsetHeight}px`)
    }
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    return () => window.removeEventListener('resize', updateHeaderHeight)
  }, [])

  const activeTrip = trips?.find(t => t.id === activeTripId) ?? trips?.[0] ?? null

  async function loadGiftFunds() {
    if (!activeTrip) { setGiftCards([]); setRewardPrograms([]); return }
    const [{ data: gc }, { data: rw }] = await Promise.all([
      fetchGiftCards(ownerId, activeTrip.id),
      fetchRewardPrograms(ownerId, activeTrip.id),
    ])
    setGiftCards(gc)
    setRewardPrograms(rw)
  }

  useEffect(() => {
    loadGiftFunds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id])

  // The item catalog (rides, dining, snacks, experiences) is trip-independent
  // and rarely changes, so it's fetched once for the whole session rather
  // than per-trip like gift funds — the Add Expense drawer uses it for
  // catalog-backed label suggestions.
  useEffect(() => {
    fetchCatalog().then(({ data }) => setCatalog(data))
  }, [])

  async function loadReminders() {
    if (!activeTrip) { setReminders([]); return }
    const { data } = await fetchReminders(ownerId, activeTrip.id)
    if (data.length === 0) {
      const rows = buildSystemReminders(activeTrip, ownerId)
      const { data: inserted } = await insertReminders(rows)
      setReminders(inserted)
    } else {
      setReminders(data)
    }
  }

  useEffect(() => {
    loadReminders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id])

  const urgentReminderCount = (reminders ?? []).filter(r => !r.done && r.reminder_date != null && urgencyLevel(daysUntil(r.reminder_date)) === 'high').length

  function openFamilySheet(opts) {
    setFamSheetState(opts ?? {})
  }

  function closeFamilySheet() {
    setFamSheetState(null)
  }

  async function handleFamilySaved(message, savedMember) {
    const opts = famSheetState
    closeFamilySheet()
    await loadFamilyMembers()
    showToast(message)
    opts?.onSaved?.(savedMember)
  }

  function handleFamilyDeleted() {
    closeFamilySheet()
    loadFamilyMembers()
    showToast('Family member removed')
  }

  function handleFamilyError(message) {
    showToast(message)
  }

  function openDuplicateSheet(sourceTrip) {
    setDuplicateSheetState({ sourceTrip })
  }

  function closeDuplicateSheet() {
    setDuplicateSheetState(null)
  }

  // Builds the Configurator prefill from the source trip, then hands off
  // to Step 2 of the duplication flow (setting new dates) via the same
  // navigate-with-prefill mechanism the estimator's "Plan this trip"
  // already uses.
  async function handleDuplicateContinue(newName) {
    const sourceTrip = duplicateSheetState?.sourceTrip
    if (!sourceTrip) return
    const { prefill, error } = await loadDuplicationSource(sourceTrip.id)
    if (error) { showToast(error.message); return }
    closeDuplicateSheet()
    navigate('/configurator', {
      state: {
        prefill,
        duplicateSourceTripId: sourceTrip.id,
        duplicateSourceName: sourceTrip.name,
        duplicateNewName: newName,
      },
    })
  }

  function setActiveTripId(id) {
    setActiveTripIdState(id)
    localStorage.setItem(ACTIVE_TRIP_KEY, id)
    setSwitcherOpen(false)
  }

  const budgetCatMatch = location.pathname.match(/^\/budget\/(.+)$/)
  const isArchivedTripView = /^\/archive\/.+$/.test(location.pathname)
  const title = budgetCatMatch
    ? categoryMeta(budgetCatMatch[1]).label
    : isArchivedTripView
      ? 'Archived Trip'
      : PAGE_TITLES[location.pathname] ?? 'Parkday'

  // Editing an existing trip (a tripId in the query string) opens in the
  // configurator, not a dedicated page — treat that as "on Trip settings"
  // for nav purposes rather than leaving every item unhighlighted.
  const editingTripInConfigurator = location.pathname === '/configurator' && !!new URLSearchParams(location.search).get('tripId')

  function isNavItemActive(to) {
    if (to === '/budget') return location.pathname === '/budget' || !!budgetCatMatch
    if (to === '/trip-settings') return location.pathname === '/trip-settings' || editingTripInConfigurator
    return location.pathname === to
  }

  function closeAll() {
    setSwitcherOpen(false)
    setUserMenuOpen(false)
  }

  const initial = (session.user.email || '?').charAt(0).toUpperCase()

  return (
    <div className={styles.shellRoot}>
      <div className={styles.hdr} ref={hdrRef}>
        <div className={styles.hdrInner}>
          <img className={styles.logoImg} src="/assets/logos/parkday-icon.svg" alt="Parkday" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.pkSub}>{title}</div>
          </div>
          <div className={styles.hdrUser} ref={userMenuRef}>
            <button
              type="button"
              className={styles.hdrAvatarBtn}
              onClick={() => setUserMenuOpen(o => !o)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              {initial}
            </button>
            <div className={`${styles.hdrUserMenu} ${userMenuOpen ? styles.show : ''}`}>
              <div className={styles.hdrUserEmail}>{session.user.email}</div>
              <Link to="/account" className={styles.navItem} onClick={closeAll}>
                <i aria-hidden="true" className="ti ti-user" /><span>Account</span>
              </Link>
              <button type="button" className={styles.navItem} onClick={() => { closeAll(); signOutAndRedirect() }}>
                <i aria-hidden="true" className="ti ti-logout" /><span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.app}>
        <div className={styles.navDrawer}>
          <div className={styles.navDrawerTrip}>
            <div className={styles.navDrawerTripLbl}>Current trip</div>
            {activeTrip && trips && trips.length > 1 ? (
              <button
                type="button"
                className={`${styles.navDrawerTripCard} ${styles.navDrawerTripTrigger} ${switcherOpen ? styles.open : ''}`}
                onClick={() => setSwitcherOpen(o => !o)}
                aria-expanded={switcherOpen}
              >
                <span className={styles.navDrawerTripInfo}>
                  <span className={styles.navDrawerTripName}>{activeTrip.name}</span>
                  <span className={styles.navDrawerTripDates}>{tripDateRange(activeTrip)}</span>
                </span>
                <i aria-hidden="true" className={`ti ti-chevron-down ${styles.navDrawerTripChevron}`} />
              </button>
            ) : (
              <div className={styles.navDrawerTripCard}>
                {activeTrip ? (
                  <span className={styles.navDrawerTripInfo}>
                    <span className={styles.navDrawerTripName}>{activeTrip.name}</span>
                    <span className={styles.navDrawerTripDates}>{tripDateRange(activeTrip)}</span>
                  </span>
                ) : (
                  <span className={`${styles.navDrawerTripName} ${styles.muted}`}>No active trip</span>
                )}
              </div>
            )}
            {switcherOpen && (
              <div className={styles.tripSwitcherList}>
                {trips.map(t => (
                  <div key={t.id} className={`${styles.tripSwitcherItem} ${t.id === activeTripId ? styles.sel : ''}`} onClick={() => setActiveTripId(t.id)}>
                    <div className={styles.tripSwitcherName}>{t.name}</div>
                    <div className={styles.tripSwitcherDates}>{tripDateRange(t)}</div>
                  </div>
                ))}
              </div>
            )}
            {accountType !== 'collaborator' && (
              !canAccess ? (
                <button type="button" className={styles.navUpgradeBtn} onClick={() => { closeAll(); navigate('/paywall') }}>
                  <i aria-hidden="true" className="ti ti-crown" /> Reactivate to plan a trip
                </button>
              ) : planType === 'trip_pass' ? (
                <button type="button" className={styles.navUpgradeBtn} onClick={() => { closeAll(); navigate('/paywall') }}>
                  <i aria-hidden="true" className="ti ti-crown" /> Upgrade to add a trip
                </button>
              ) : (
                <button type="button" className={styles.navTripNew} onClick={() => { closeAll(); navigate('/configurator') }}>
                  <i aria-hidden="true" className="ti ti-plus" /> New trip
                </button>
              )
            )}
          </div>

          <div className={styles.navDrawerBody}>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`${styles.navItem} ${isNavItemActive(item.to) ? styles.active : ''} ${item.soon ? styles.future : ''}`}
                onClick={closeAll}
              >
                <i aria-hidden="true" className={`ti ${item.icon}`} />
                <span>{item.label}</span>
                {item.soon && <span className={styles.navSoon}>Soon</span>}
                {item.to === '/reminders' && urgentReminderCount > 0 && <span className={styles.navBadge}>{urgentReminderCount}</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.pagesViewport}>
          <div className={styles.scroll}>
            <Outlet context={{
              trips, activeTrip, setActiveTripId, loading: trips === null, refetchTrips: loadTrips,
              openExpenseSheet, expensesVersion, userId: ownerId, showToast, session, planType, accountType, canAccess,
              familyMembers, openFamilySheet, openDuplicateSheet, refetchFamilyMembers: loadFamilyMembers,
              giftCards: giftCards ?? [], rewardPrograms: rewardPrograms ?? [], refetchGiftFunds: loadGiftFunds,
              reminders: reminders ?? [], refetchReminders: loadReminders,
            }} />
          </div>

          <div className={styles.tabBar}>
            {TAB_ITEMS.map(item => (
              <Link key={item.to} to={item.to} className={`${styles.tabItem} ${isNavItemActive(item.to) ? styles.tabActive : ''}`}>
                <i aria-hidden="true" className={`ti ${item.icon}`} />
                <span>{item.label}</span>
              </Link>
            ))}
            <Link to="/more" className={`${styles.tabItem} ${MORE_ROUTES.includes(location.pathname) ? styles.tabActive : ''}`}>
              <i aria-hidden="true" className="ti ti-dots" />
              <span>More</span>
            </Link>
          </div>
        </div>
      </div>

      {activeTrip && (
        <ExpenseSheet
          trip={activeTrip}
          userId={ownerId}
          state={sheetState}
          giftCards={giftCards ?? []}
          rewardPrograms={rewardPrograms ?? []}
          catalog={catalog ?? []}
          onClose={closeExpenseSheet}
          onSaved={handleExpenseSaved}
          onDeleted={handleExpenseDeleted}
          onError={handleExpenseError}
        />
      )}
      <FamilyMemberSheet
        userId={ownerId}
        planType={planType}
        state={famSheetState}
        onClose={closeFamilySheet}
        onSaved={handleFamilySaved}
        onDeleted={handleFamilyDeleted}
        onError={handleFamilyError}
      />
      <TripDuplicateSheet
        state={duplicateSheetState}
        onClose={closeDuplicateSheet}
        onContinue={handleDuplicateContinue}
      />
      <Toast toast={toast} />
    </div>
  )
}
