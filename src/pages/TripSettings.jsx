import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { fetchExpenses } from '../lib/expenses'
import { RESORTS, TIER_LABELS, BOOKING_LABELS, TICKET_LABELS, LL_LABELS, TRANSFER_LABELS, PARKING_LABELS } from '../components/Configurator/configuratorData'
import styles from './TripSettings.module.css'

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDate(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dateForDay(arrivalDate, dayNum) {
  const d = parseLocalDate(arrivalDate)
  d.setDate(d.getDate() + (dayNum - 1))
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function Section({ title, editStep, tripId, navigate, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHdr}>
        <span className={styles.sectionLbl}>{title}</span>
        <button type="button" className={styles.editLink} onClick={() => navigate(`/configurator?tripId=${tripId}&step=${editStep}`)}>Edit</button>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, locked }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLbl}>{label}</span>
      <span className={styles.rowVal}>
        {value}
        {locked && <i className="ti ti-lock" title="Locked — set when this trip was created" />}
      </span>
    </div>
  )
}

export default function TripSettings() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const { activeTrip, loading } = outletContext ?? { activeTrip: null, loading: true }
  const [expenses, setExpenses] = useState(null)

  useEffect(() => {
    if (!activeTrip) { setExpenses(null); return }
    let cancelled = false
    fetchExpenses(activeTrip.id).then(({ data }) => { if (!cancelled) setExpenses(data) })
    return () => { cancelled = true }
  }, [activeTrip])

  if (loading || (activeTrip && expenses === null)) {
    return <div className={styles.skeleton}><div className={styles.skelBlock} /><div className={styles.skelBlock} /><div className={styles.skelBlock} /></div>
  }

  if (!activeTrip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-settings ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>No active trip</h1>
        <p className={styles.emptySubhead}>Plan a trip to see its settings here.</p>
        <button className={styles.planBtn} onClick={() => navigate('/configurator')}>Plan a trip</button>
      </div>
    )
  }

  const dayTrip = activeTrip.arrival_date === activeTrip.departure_date
  const nights = !dayTrip && activeTrip.arrival_date && activeTrip.departure_date
    ? Math.round((parseLocalDate(activeTrip.departure_date) - parseLocalDate(activeTrip.arrival_date)) / 86400000)
    : 0
  const dayRows = (expenses || []).filter(e => e.cat === 'park_day').sort((a, b) => a.day - b.day)
  const resort = RESORTS.find(r => r.name === activeTrip.accommodation)

  return (
    <div className={styles.list}>
      <Section title="Dates & party" editStep={0} tripId={activeTrip.id} navigate={navigate}>
        <Row label="Trip name" value={activeTrip.name} />
        <Row label="Travel dates" value={dayTrip ? fmtDate(activeTrip.arrival_date) : `${fmtDate(activeTrip.arrival_date)} – ${fmtDate(activeTrip.departure_date)}`} />
        <Row label="Length of stay" value={dayTrip ? `Day trip · ${dayRows.length} park day${dayRows.length !== 1 ? 's' : ''}` : `${nights} night${nights !== 1 ? 's' : ''} · ${dayRows.length} park day${dayRows.length !== 1 ? 's' : ''}`} />
        <Row label="Adults" value={activeTrip.adults} />
        <Row label="Children" value={activeTrip.children} />
      </Section>

      <Section title="Getting there" editStep={1} tripId={activeTrip.id} navigate={navigate}>
        <Row label="Travel method" value={activeTrip.travel_mode === 'driving' ? 'Driving' : 'Flying into MCO'} />
        {activeTrip.travel_mode === 'driving' ? (
          <Row
            label="Park transport"
            value={activeTrip.park_transport === 'drive' ? 'Drive each day' : activeTrip.park_transport === 'disney_transport' ? 'Disney transport' : 'Not set'}
          />
        ) : (
          <>
            <Row label="MCO arrival transfer" value={TRANSFER_LABELS[activeTrip.transfer] || 'Not set'} />
            <Row label="MCO departure transfer" value={TRANSFER_LABELS[activeTrip.departure_transfer] || 'Not set'} />
            <Row label="Airport parking" value={PARKING_LABELS[activeTrip.parking] || 'Not set'} />
            {(activeTrip.arr_airline || activeTrip.arr_flight) && (
              <Row label="Arrival flight" value={[activeTrip.arr_airline, activeTrip.arr_flight].filter(Boolean).join(' ')} />
            )}
            {(activeTrip.dep_airline || activeTrip.dep_flight) && (
              <Row label="Departure flight" value={[activeTrip.dep_airline, activeTrip.dep_flight].filter(Boolean).join(' ')} />
            )}
          </>
        )}
      </Section>

      {!dayTrip && (
        <Section title="Accommodations" editStep={2} tripId={activeTrip.id} navigate={navigate}>
          <Row label="Resort" value={activeTrip.accommodation || 'Off Property'} />
          {resort && <Row label="Tier" value={TIER_LABELS[resort.tier]} />}
          <Row label="Booking type" value={BOOKING_LABELS[activeTrip.booking_type] || activeTrip.booking_type} locked />
          <Row label="Memory Maker" value={activeTrip.memory_maker ? 'Yes' : 'No'} />
        </Section>
      )}

      <Section title="Tickets & access" editStep={3} tripId={activeTrip.id} navigate={navigate}>
        <Row label="Ticket type" value={TICKET_LABELS[activeTrip.ticket_type] || activeTrip.ticket_type} />
        <Row label="Lightning Lane" value={LL_LABELS[activeTrip.lightning_lane] || activeTrip.lightning_lane} />
      </Section>

      <Section title="Park days" editStep={4} tripId={activeTrip.id} navigate={navigate}>
        {dayRows.length === 0 ? (
          <Row label="Park days" value="Not set yet" />
        ) : dayRows.map(d => (
          <Row key={d.id} label={`Day ${d.day} · ${fmtDate(dateForDay(activeTrip.arrival_date, d.day))}`} value={d.label} />
        ))}
      </Section>
    </div>
  )
}
