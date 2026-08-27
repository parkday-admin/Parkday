import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { giftFundsTotals } from '../lib/giftFunds'
import DashboardCard from '../components/DashboardCard/DashboardCard'
import styles from './More.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

function fmtDateShort(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function tripDateRange(trip) {
  if (!trip.arrival_date || !trip.departure_date) return ''
  return `${fmtDateShort(trip.arrival_date)} – ${fmtDateShort(trip.departure_date)}`
}

function Row({ icon, iconBg, iconColor, label, meta, onClick }) {
  return (
    <div className={styles.row} onClick={onClick}>
      <div className={styles.rowIcon} style={{ background: iconBg }}><i className={`ti ${icon}`} style={{ color: iconColor }} /></div>
      <div className={styles.rowLabel}>{label}</div>
      {meta && <span className={styles.rowMeta}>{meta}</span>}
      <i className={`ti ti-chevron-right ${styles.chevron}`} />
    </div>
  )
}

export default function More() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const {
    trips, activeTrip, setActiveTripId, planType, accountType,
    giftCards, rewardPrograms,
  } = outletContext ?? {}
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const totalAvailable = giftCards && rewardPrograms ? giftFundsTotals(giftCards, rewardPrograms).totalAvailable : 0

  return (
    <div className={styles.page}>
      <DashboardCard icon="ti-map-2" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)" title="Current trip">
        <div className={styles.tripBody}>
          {activeTrip && trips && trips.length > 1 ? (
            <button
              type="button"
              className={`${styles.tripTrigger} ${switcherOpen ? styles.open : ''}`}
              onClick={() => setSwitcherOpen(o => !o)}
              aria-expanded={switcherOpen}
            >
              <span className={styles.tripInfo}>
                <span className={styles.tripName}>{activeTrip.name}</span>
                <span className={styles.tripDates}>{tripDateRange(activeTrip)}</span>
              </span>
              <i className={`ti ti-chevron-down ${styles.tripChevron}`} />
            </button>
          ) : activeTrip ? (
            <>
              <div className={styles.tripName}>{activeTrip.name}</div>
              <div className={styles.tripDates}>{tripDateRange(activeTrip)}</div>
            </>
          ) : (
            <div className={styles.tripName} style={{ color: 'var(--text-tertiary)' }}>No active trip</div>
          )}
          {switcherOpen && (
            <div className={styles.switcherList}>
              {trips.map(t => (
                <div key={t.id} className={`${styles.switcherItem} ${t.id === activeTrip?.id ? styles.switcherSel : ''}`} onClick={() => { setActiveTripId(t.id); setSwitcherOpen(false) }}>
                  <div className={styles.switcherName}>{t.name}</div>
                  <div className={styles.switcherDates}>{tripDateRange(t)}</div>
                </div>
              ))}
            </div>
          )}
          {accountType !== 'collaborator' && (
            planType === 'trip_pass' ? (
              <button type="button" className={styles.upgradeBtn} onClick={() => navigate('/paywall')}>
                <i className="ti ti-crown" /> Upgrade to add a trip
              </button>
            ) : (
              <button type="button" className={styles.newTripBtn} onClick={() => navigate('/configurator')}>
                <i className="ti ti-plus" /> New trip
              </button>
            )
          )}
        </div>
      </DashboardCard>

      <DashboardCard icon="ti-chart-pie" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)" title="Money">
        <Row icon="ti-credit-card" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)" label="Payments" onClick={() => navigate('/payments')} />
        <Row icon="ti-gift" iconBg="rgba(245,181,54,0.15)" iconColor="var(--gold-dark)" label="Gift Cards/Rewards" meta={totalAvailable > 0 ? fmt(totalAvailable) : undefined} onClick={() => navigate('/gifts')} />
        <Row icon="ti-calculator" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)" label="Estimator" onClick={() => navigate('/estimator')} />
      </DashboardCard>

      <DashboardCard icon="ti-map-2" iconBg="rgba(42,111,224,0.1)" iconColor="var(--sky)" title="Plan">
        <Row icon="ti-heart" iconBg="rgba(224,83,63,0.12)" iconColor="var(--coral)" label="Wish list" onClick={() => navigate('/wishlist')} />
        <Row icon="ti-backpack" iconBg="rgba(44,165,141,0.18)" iconColor="var(--teal-dark)" label="Packing list" onClick={() => navigate('/packing')} />
        <Row icon="ti-settings" iconBg="var(--border-light)" iconColor="var(--text-secondary)" label="Trip settings" onClick={() => navigate('/trip-settings')} />
      </DashboardCard>
    </div>
  )
}
