import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import styles from './AppShell.module.css'
import { signOut } from '../../lib/auth'
import { fetchActiveTrips } from '../../lib/trips'
import { createExpense } from '../../lib/expenses'
import { fetchFamilyMembers } from '../../lib/familyMembers'
import { fetchGiftCards, fetchRewardPrograms } from '../../lib/giftFunds'
import { fetchReminders, insertReminders, buildSystemReminders, urgencyLevel } from '../../lib/reminders'
import { daysUntil } from '../../lib/trips'
import { categoryMeta } from '../../lib/categories'
import ExpenseSheet from '../ExpenseSheet/ExpenseSheet'
import FamilyMemberSheet from '../FamilyMemberSheet/FamilyMemberSheet'
import Toast from '../Toast/Toast'

const ACTIVE_TRIP_KEY = 'pkd_active_trip_id'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/budget': 'Budget',
  '/itinerary': 'Itinerary',
  '/wishlist': 'Wish list',
  '/payments': 'Payments',
  '/gifts': 'Gift Cards & Rewards',
  '/packing': 'Packing list',
  '/reminders': 'Reminders',
  '/estimator': 'Estimator',
  '/account': 'Account',
  '/trip-settings': 'Trip settings',
  '/configurator': 'Plan your trip',
}

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
  { to: '/estimator', icon: 'ti-calculator', label: 'Estimator' },
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

export default function AppShell({ session }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [trips, setTrips] = useState(null)
  const [activeTripId, setActiveTripIdState] = useState(() => localStorage.getItem(ACTIVE_TRIP_KEY))
  const [sheetState, setSheetState] = useState(null)
  const [expensesVersion, setExpensesVersion] = useState(0)
  const [familyMembers, setFamilyMembers] = useState(null)
  const [famSheetState, setFamSheetState] = useState(null)
  const [giftCards, setGiftCards] = useState(null)
  const [rewardPrograms, setRewardPrograms] = useState(null)
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
    showToast(message)
  }

  function handleExpenseDeleted(deletedExpense) {
    closeExpenseSheet()
    setExpensesVersion(v => v + 1)
    loadGiftFunds()
    showToast('Expense deleted', {
      actionLabel: 'Undo',
      onAction: async () => {
        const { cat, label, time, status, ll_type, planned_amt, actual_amt, day } = deletedExpense
        await createExpense(session.user.id, activeTrip.id, { cat, label, time, status, ll_type, planned_amt, actual_amt, day })
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
    const { data } = await fetchFamilyMembers(session.user.id)
    setFamilyMembers(data)
  }

  useEffect(() => {
    loadTrips()
    loadFamilyMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeTrip = trips?.find(t => t.id === activeTripId) ?? trips?.[0] ?? null

  async function loadGiftFunds() {
    if (!activeTrip) { setGiftCards([]); setRewardPrograms([]); return }
    const [{ data: gc }, { data: rw }] = await Promise.all([
      fetchGiftCards(session.user.id, activeTrip.id),
      fetchRewardPrograms(session.user.id, activeTrip.id),
    ])
    setGiftCards(gc)
    setRewardPrograms(rw)
  }

  useEffect(() => {
    loadGiftFunds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id])

  async function loadReminders() {
    if (!activeTrip) { setReminders([]); return }
    const { data } = await fetchReminders(session.user.id, activeTrip.id)
    if (data.length === 0) {
      const rows = buildSystemReminders(activeTrip, session.user.id)
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

  function setActiveTripId(id) {
    setActiveTripIdState(id)
    localStorage.setItem(ACTIVE_TRIP_KEY, id)
    setSwitcherOpen(false)
    setDrawerOpen(false)
  }

  const budgetCatMatch = location.pathname.match(/^\/budget\/(.+)$/)
  const title = budgetCatMatch
    ? categoryMeta(budgetCatMatch[1]).label
    : PAGE_TITLES[location.pathname] ?? 'Parkday'

  function closeAll() {
    setDrawerOpen(false)
    setSwitcherOpen(false)
    setUserMenuOpen(false)
  }

  const initial = (session.user.email || '?').charAt(0).toUpperCase()

  return (
    <div className={styles.shellRoot}>
      <div className={styles.hdr}>
        <div className={styles.hdrInner}>
          <button type="button" className={styles.hdrIconBtn} onClick={() => setDrawerOpen(o => !o)} title="Menu">
            <i className="ti ti-menu-2" />
          </button>
          <img className={styles.logoImg} src="/assets/logos/parkday-icon.svg" alt="Parkday" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.pkSub}>{title}</div>
            {activeTrip && (
              <div className={styles.pkTripSub}>{activeTrip.name} · {tripDateRange(activeTrip)}</div>
            )}
          </div>
          <button type="button" className={styles.hdrPill} onClick={() => navigate('/trip-settings')}>
            <i className="ti ti-settings" /> Trip
          </button>
        </div>
      </div>

      <div className={styles.app}>
        {drawerOpen && <div className={styles.navBackdrop} onClick={closeAll} />}

        <div className={`${styles.navDrawer} ${drawerOpen ? styles.show : ''}`}>
          <div className={styles.navDrawerTrip}>
            <div className={styles.navDrawerTripLbl}>Current trip</div>
            {activeTrip ? (
              <>
                <div className={styles.navDrawerTripName}>{activeTrip.name}</div>
                <div className={styles.navDrawerTripDates}>{tripDateRange(activeTrip)}</div>
              </>
            ) : (
              <div className={`${styles.navDrawerTripName} ${styles.muted}`}>No active trip</div>
            )}
            <div className={styles.navDrawerTripActions}>
              {trips && trips.length > 1 && (
                <div className={styles.navDrawerTripSwitch} onClick={() => setSwitcherOpen(o => !o)}>
                  <i className="ti ti-chevron-down" /> Switch trip
                </div>
              )}
            </div>
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
            <button type="button" className={styles.navTripNew} onClick={() => { closeAll(); navigate('/configurator') }}>
              <i className="ti ti-plus" /> New trip
            </button>
          </div>

          <div className={styles.navDrawerBody}>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`${styles.navItem} ${location.pathname === item.to ? styles.active : ''} ${item.soon ? styles.future : ''}`}
                onClick={closeAll}
              >
                <i className={`ti ${item.icon}`} />
                <span>{item.label}</span>
                {item.soon && <span className={styles.navSoon}>Soon</span>}
                {item.to === '/reminders' && urgentReminderCount > 0 && <span className={styles.navBadge}>{urgentReminderCount}</span>}
              </Link>
            ))}
          </div>

          <div className={`${styles.navDrawerUser} ${userMenuOpen ? styles.open : ''}`} onClick={() => setUserMenuOpen(o => !o)}>
            <div className={styles.navAvatar}>{initial}</div>
            <div className={styles.navUname}>{session.user.email}</div>
            <i className="ti ti-dots" style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
            <div className={`${styles.navUserMenu} ${userMenuOpen ? styles.show : ''}`}>
              <Link to="/account" className={styles.navItem} onClick={e => { e.stopPropagation(); closeAll() }}>
                <i className="ti ti-user" /><span>Account</span>
              </Link>
              <button type="button" className={styles.navItem} onClick={e => { e.stopPropagation(); signOut() }}>
                <i className="ti ti-logout" /><span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.pagesViewport}>
          <div className={styles.scroll}>
            <Outlet context={{
              trips, activeTrip, setActiveTripId, loading: trips === null, refetchTrips: loadTrips,
              openExpenseSheet, expensesVersion, userId: session.user.id, showToast, session,
              familyMembers, openFamilySheet,
              giftCards: giftCards ?? [], rewardPrograms: rewardPrograms ?? [], refetchGiftFunds: loadGiftFunds,
              reminders: reminders ?? [], refetchReminders: loadReminders,
            }} />
          </div>
        </div>
      </div>

      {activeTrip && (
        <ExpenseSheet
          trip={activeTrip}
          userId={session.user.id}
          state={sheetState}
          giftCards={giftCards ?? []}
          rewardPrograms={rewardPrograms ?? []}
          onClose={closeExpenseSheet}
          onSaved={handleExpenseSaved}
          onDeleted={handleExpenseDeleted}
          onError={handleExpenseError}
        />
      )}
      <FamilyMemberSheet
        userId={session.user.id}
        state={famSheetState}
        onClose={closeFamilySheet}
        onSaved={handleFamilySaved}
        onDeleted={handleFamilyDeleted}
        onError={handleFamilyError}
      />
      <Toast toast={toast} />
    </div>
  )
}
