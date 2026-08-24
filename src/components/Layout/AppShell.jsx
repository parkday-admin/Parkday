import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import styles from './AppShell.module.css'
import { signOut } from '../../lib/auth'
import { fetchActiveTrips } from '../../lib/trips'

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
  { to: '/wishlist', icon: 'ti-heart', label: 'Wish list', soon: true },
  { to: '/payments', icon: 'ti-credit-card', label: 'Payments', soon: true },
  { to: '/gifts', icon: 'ti-gift', label: 'Gift Cards/Rewards', soon: true },
  { to: '/packing', icon: 'ti-backpack', label: 'Packing list', soon: true },
  { to: '/reminders', icon: 'ti-bell', label: 'Reminders', soon: true },
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

  async function loadTrips() {
    const { data } = await fetchActiveTrips()
    setTrips(data)
    if (data.length && !data.some(t => t.id === activeTripId)) {
      setActiveTripIdState(data[0].id)
      localStorage.setItem(ACTIVE_TRIP_KEY, data[0].id)
    }
  }

  useEffect(() => {
    loadTrips()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setActiveTripId(id) {
    setActiveTripIdState(id)
    localStorage.setItem(ACTIVE_TRIP_KEY, id)
    setSwitcherOpen(false)
    setDrawerOpen(false)
  }

  const activeTrip = trips?.find(t => t.id === activeTripId) ?? trips?.[0] ?? null
  const title = PAGE_TITLES[location.pathname] ?? 'Parkday'

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
            <Outlet context={{ trips, activeTrip, setActiveTripId, loading: trips === null, refetchTrips: loadTrips }} />
          </div>
        </div>
      </div>
    </div>
  )
}
