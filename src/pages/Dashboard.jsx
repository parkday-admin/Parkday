import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { signOut } from '../lib/auth'
import styles from './Dashboard.module.css'

export default function Dashboard({ session }) {
  const [trips, setTrips] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTrips()
  }, [])

  async function fetchTrips() {
    const { data, error } = await supabase
      .from('trips')
      .select('id, name, arrival_date, departure_date, adults, children, status')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setTrips(data)
  }

  async function createSampleTrip() {
    setCreating(true)
    setError(null)

    const { error } = await supabase.from('trips').insert({
      user_id: session.user.id,
      name: 'Orlando 2026',
      arrival_date: '2026-10-01',
      departure_date: '2026-10-07',
      adults: 2,
      children: 1,
      accommodation: 'moderate',
      booking_type: 'separate',
      ticket_type: 'base',
      lightning_lane: 'none',
      travel_mode: 'car',
      status: 'active',
    })

    if (error) setError(error.message)
    else await fetchTrips()

    setCreating(false)
  }

  async function deleteTrip(id) {
    const { error } = await supabase.from('trips').delete().eq('id', id)
    if (error) setError(error.message)
    else setTrips(trips => trips.filter(t => t.id !== id))
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>
            <img className={styles.logoImg} src="/assets/logos/parkday-icon.svg" alt="Parkday" />
            <span className={styles.brandText}>
              <span className={styles.wordmark}>Parkday</span>
              {trips && trips.length > 0 && (
                <span className={styles.tripName}>{trips[0].name ?? 'Your trip'}</span>
              )}
            </span>
          </span>
          <button className={styles.settingsPill} onClick={signOut}>
            <i className="ti ti-settings" />
            Sign out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {error && <p className={styles.error}>{error}</p>}

        {trips === null && <p className={styles.muted}>Loading…</p>}

        {trips !== null && trips.length === 0 && (
          <div className={styles.empty}>
            <i className={`ti ti-map-pin ${styles.emptyIcon}`} />
            <h1 className={styles.emptyHeadline}>Ready to plan your park day?</h1>
            <p className={styles.emptySubhead}>Set up your first trip to get started.</p>
            <button className={styles.planBtn} onClick={createSampleTrip} disabled={creating}>
              {creating ? 'Creating…' : 'Plan a trip'}
            </button>
          </div>
        )}

        {trips !== null && trips.length > 0 && (
          <>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Your trips</h1>
              <button className={styles.createBtn} onClick={createSampleTrip} disabled={creating}>
                {creating ? 'Creating…' : '+ New trip'}
              </button>
            </div>
            <ul className={styles.tripList}>
              {trips.map(trip => (
                <li key={trip.id} className={styles.tripCard}>
                  <div className={styles.tripInfo}>
                    <h2 className={styles.tripCardName}>{trip.name ?? 'Untitled trip'}</h2>
                    <p className={styles.meta}>
                      {trip.arrival_date} → {trip.departure_date}
                      &nbsp;·&nbsp;{trip.adults} adult{trip.adults !== 1 ? 's' : ''}
                      {trip.children > 0 && `, ${trip.children} child${trip.children !== 1 ? 'ren' : ''}`}
                    </p>
                    <span className={styles.status}>{trip.status}</span>
                  </div>
                  <button className={styles.deleteBtn} onClick={() => deleteTrip(trip.id)}>Delete</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
