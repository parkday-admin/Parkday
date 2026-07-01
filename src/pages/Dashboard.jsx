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
      accommodations_tier: 'moderate',
      booking_type: 'separate',
      dining_plan_tier: 'none',
      memory_maker: false,
      season: 'regular',
      status: 'planning',
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
        <span className={styles.logo}>parkday</span>
        <div className={styles.headerRight}>
          <span className={styles.email}>{session.user.email}</span>
          <button className={styles.signOut} onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <h1>Your trips</h1>
          <button className={styles.createBtn} onClick={createSampleTrip} disabled={creating}>
            {creating ? 'Creating…' : '+ New trip'}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {trips === null && <p className={styles.muted}>Loading…</p>}

        {trips !== null && trips.length === 0 && (
          <div className={styles.empty}>
            <p>No trips yet.</p>
            <p className={styles.muted}>Hit "New trip" to create a sample trip and confirm the full round trip works.</p>
          </div>
        )}

        {trips !== null && trips.length > 0 && (
          <ul className={styles.tripList}>
            {trips.map(trip => (
              <li key={trip.id} className={styles.tripCard}>
                <div className={styles.tripInfo}>
                  <h2>{trip.name ?? 'Untitled trip'}</h2>
                  <p className={styles.meta}>
                    {trip.arrival_date} → {trip.departure_date}
                    &nbsp;·&nbsp;{trip.adults} adult{trip.adults !== 1 ? 's' : ''}
                    {trip.children > 0 && `, ${trip.children} child${trip.children !== 1 ? 'ren' : ''}`}
                    &nbsp;·&nbsp;<span className={styles.status}>{trip.status}</span>
                  </p>
                  <p className={styles.idMuted}>id: {trip.id}</p>
                </div>
                <button className={styles.deleteBtn} onClick={() => deleteTrip(trip.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
