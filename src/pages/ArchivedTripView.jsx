import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { fetchTripDetail, unarchiveTrip } from '../lib/trips'
import { fetchExpenses } from '../lib/expenses'
import { fetchWishList } from '../lib/wishlist'
import { categoriesForTrip, categoryMeta, categoryTotals } from '../lib/categories'
import { RESORTS, TIER_LABELS, BOOKING_LABELS, TICKET_LABELS, LL_LABELS, TRANSFER_LABELS, PARKING_LABELS } from '../components/Configurator/configuratorData'
import BudgetPrintView from '../components/BudgetPrintView/BudgetPrintView'
import styles from './ArchivedTripView.module.css'

const fmt = n => '$' + Math.round(n || 0).toLocaleString()

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

// Entry times are stored as display strings ("7:30 PM"); convert to
// minutes-since-midnight so the expense log sorts chronologically within
// a day instead of alphabetically — same approach as Budget.jsx.
function timeSortKey(t) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((t || '').trim())
  if (!m) return -1
  let h = Number(m[1])
  if (m[3]) {
    if (/PM/i.test(m[3]) && h !== 12) h += 12
    if (/AM/i.test(m[3]) && h === 12) h = 0
  }
  return h * 60 + Number(m[2])
}

function Section({ title, icon, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHdr}>
        <i className={`ti ${icon} ${styles.sectionIcon}`} />
        <span className={styles.sectionLbl}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLbl}>{label}</span>
      <span className={styles.rowVal}>{value}</span>
    </div>
  )
}

// A static snapshot of a trip that's been set aside — no editing, no swipe
// gestures, no FAB. A user whose pass has lapsed (Trip Pass expired or
// Plus Pass cancelled) lands here to look back at an old trip with no path
// to keep using it until they reactivate; an active Plus Pass user can
// still unarchive from here as a convenience. See Account.jsx's Trip
// archive card, the only entry point into this page.
export default function ArchivedTripView() {
  const navigate = useNavigate()
  const { tripId } = useParams()
  const outletContext = useOutletContext()
  const { userId, showToast, refetchTrips, canAccess } = outletContext ?? {}
  const [trip, setTrip] = useState(undefined)
  const [expenses, setExpenses] = useState(null)
  const [wishlist, setWishlist] = useState(null)
  const [unarchiving, setUnarchiving] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Same pattern as Budget.jsx's export: render BudgetPrintView into the
  // DOM, wait a frame for it to paint, then open the print dialog.
  useEffect(() => {
    if (!exporting) return
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
    function onAfterPrint() { setExporting(false) }
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [exporting])

  useEffect(() => {
    if (!tripId || !userId) return
    let cancelled = false
    setTrip(undefined)
    setExpenses(null)
    setWishlist(null)
    Promise.all([fetchTripDetail(tripId), fetchExpenses(tripId), fetchWishList(userId, tripId)]).then(([tripRes, expRes, wlRes]) => {
      if (cancelled) return
      setTrip(tripRes.error ? null : tripRes.data)
      setExpenses(expRes.data)
      setWishlist(wlRes.data)
    })
    return () => { cancelled = true }
  }, [tripId, userId])

  async function handleUnarchive() {
    setUnarchiving(true)
    const { error } = await unarchiveTrip(tripId)
    setUnarchiving(false)
    if (error) { showToast?.(error.message); return }
    showToast?.('Trip unarchived')
    await refetchTrips?.()
    navigate('/trip-settings')
  }

  if (trip === undefined || expenses === null || wishlist === null) {
    return <div className={styles.skeleton}><div className={styles.skelBlock} /><div className={styles.skelBlock} /><div className={styles.skelBlock} /></div>
  }

  if (!trip) {
    return (
      <div className={styles.empty}>
        <i className={`ti ti-archive ${styles.emptyIcon}`} />
        <h1 className={styles.emptyHeadline}>Trip not found</h1>
        <p className={styles.emptySubhead}>This trip may have been deleted.</p>
        <button className={styles.backBtn} onClick={() => navigate('/account')}>Back to account</button>
      </div>
    )
  }

  const dayTrip = trip.arrival_date === trip.departure_date
  const nights = !dayTrip && trip.arrival_date && trip.departure_date
    ? Math.round((parseLocalDate(trip.departure_date) - parseLocalDate(trip.arrival_date)) / 86400000)
    : 0
  const dayRows = expenses.filter(e => e.cat === 'park_day').sort((a, b) => a.day - b.day)
  const resort = RESORTS.find(r => r.name === trip.accommodation)

  const cats = categoriesForTrip(trip)
  const catRows = cats.map(cat => {
    const es = expenses.filter(e => e.cat === cat)
    const { budgeted, planned, actual, count } = categoryTotals(es, cat)
    return { cat, budgeted, planned, actual, count }
  }).filter(c => c.budgeted > 0 || c.planned > 0 || c.actual > 0)
  const totalBudgeted = catRows.reduce((s, c) => s + c.budgeted, 0)
  const totalPlanned = catRows.reduce((s, c) => s + c.planned, 0)
  const totalActual = catRows.reduce((s, c) => s + c.actual, 0)

  const entries = expenses
    .filter(e => !e.is_budget && e.cat !== 'park_day')
    .sort((a, b) => {
      const dayA = a.day ?? -1, dayB = b.day ?? -1
      if (dayA !== dayB) return dayA - dayB
      return timeSortKey(a.time) - timeSortKey(b.time)
    })

  const scheduledWishlist = wishlist.filter(w => w.planned_day != null)

  // Same section/row shape ArchivedTripView already renders on screen,
  // handed to BudgetPrintView's optional tripDetail prop.
  const tripDetailSections = [
    {
      title: 'Dates & Party',
      rows: [
        { label: 'Length of stay', value: dayTrip ? `Day trip · ${dayRows.length} park day${dayRows.length !== 1 ? 's' : ''}` : `${nights} night${nights !== 1 ? 's' : ''} · ${dayRows.length} park day${dayRows.length !== 1 ? 's' : ''}` },
        { label: 'Adults', value: trip.adults },
        { label: 'Children', value: trip.children },
      ],
    },
    {
      title: 'Getting There',
      rows: trip.travel_mode === 'driving'
        ? [
          { label: 'Travel method', value: 'Driving' },
          { label: 'Park transport', value: trip.park_transport === 'drive' ? 'Drive each day' : trip.park_transport === 'disney_transport' ? 'Disney transport' : 'Not set' },
        ]
        : [
          { label: 'Travel method', value: 'Flying into MCO' },
          { label: 'MCO arrival transfer', value: TRANSFER_LABELS[trip.transfer] || 'Not set' },
          { label: 'MCO departure transfer', value: TRANSFER_LABELS[trip.departure_transfer] || 'Not set' },
          { label: 'Airport parking', value: PARKING_LABELS[trip.parking] || 'Not set' },
          ...(trip.arr_airline || trip.arr_flight ? [{ label: 'Arrival flight', value: [trip.arr_airline, trip.arr_flight].filter(Boolean).join(' ') }] : []),
          ...(trip.dep_airline || trip.dep_flight ? [{ label: 'Departure flight', value: [trip.dep_airline, trip.dep_flight].filter(Boolean).join(' ') }] : []),
        ],
    },
    ...(!dayTrip ? [{
      title: 'Accommodations',
      rows: [
        { label: 'Resort', value: trip.accommodation || 'Off Property' },
        ...(resort ? [{ label: 'Tier', value: TIER_LABELS[resort.tier] }] : []),
        { label: 'Booking type', value: BOOKING_LABELS[trip.booking_type] || trip.booking_type },
        { label: 'Memory Maker', value: trip.memory_maker ? 'Yes' : 'No' },
      ],
    }] : []),
    {
      title: 'Tickets & Access',
      rows: [
        { label: 'Ticket type', value: TICKET_LABELS[trip.ticket_type] || trip.ticket_type },
        { label: 'Lightning Lane', value: LL_LABELS[trip.lightning_lane] || trip.lightning_lane },
      ],
    },
    {
      title: 'Park Days',
      rows: dayRows.length === 0
        ? [{ label: 'Park days', value: 'Not set' }]
        : dayRows.map(d => ({ label: `Day ${d.day} · ${fmtDate(dateForDay(trip.arrival_date, d.day))}`, value: d.label })),
    },
  ]

  return (
    <div>
      <div className={styles.hdr}>
        <button type="button" className={styles.backLink} onClick={() => navigate('/account')}>
          <i className="ti ti-arrow-left" /> Trip archive
        </button>
        <div className={styles.hdrActions}>
          <button type="button" className={styles.unarchiveBtn} onClick={() => setExporting(true)}>
            <i className="ti ti-file-download" /> Export PDF
          </button>
          {canAccess && (
            <button type="button" className={styles.unarchiveBtn} disabled={unarchiving} onClick={handleUnarchive}>
              {unarchiving ? 'Unarchiving…' : 'Unarchive'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.tripHero}>
        <div className={styles.archivedBadge}><i className="ti ti-archive" /> Archived</div>
        <div className={styles.tripName}>{trip.name}</div>
        <div className={styles.tripDates}>{dayTrip ? fmtDate(trip.arrival_date) : `${fmtDate(trip.arrival_date)} – ${fmtDate(trip.departure_date)}`}</div>
      </div>

      <div className={styles.list}>
        <Section title="Dates & party" icon="ti-calendar-event">
          <Row label="Length of stay" value={dayTrip ? `Day trip · ${dayRows.length} park day${dayRows.length !== 1 ? 's' : ''}` : `${nights} night${nights !== 1 ? 's' : ''} · ${dayRows.length} park day${dayRows.length !== 1 ? 's' : ''}`} />
          <Row label="Adults" value={trip.adults} />
          <Row label="Children" value={trip.children} />
        </Section>

        <Section title="Getting there" icon="ti-route">
          <Row label="Travel method" value={trip.travel_mode === 'driving' ? 'Driving' : 'Flying into MCO'} />
          {trip.travel_mode === 'driving' ? (
            <Row label="Park transport" value={trip.park_transport === 'drive' ? 'Drive each day' : trip.park_transport === 'disney_transport' ? 'Disney transport' : 'Not set'} />
          ) : (
            <>
              <Row label="MCO arrival transfer" value={TRANSFER_LABELS[trip.transfer] || 'Not set'} />
              <Row label="MCO departure transfer" value={TRANSFER_LABELS[trip.departure_transfer] || 'Not set'} />
              <Row label="Airport parking" value={PARKING_LABELS[trip.parking] || 'Not set'} />
              {(trip.arr_airline || trip.arr_flight) && <Row label="Arrival flight" value={[trip.arr_airline, trip.arr_flight].filter(Boolean).join(' ')} />}
              {(trip.dep_airline || trip.dep_flight) && <Row label="Departure flight" value={[trip.dep_airline, trip.dep_flight].filter(Boolean).join(' ')} />}
            </>
          )}
        </Section>

        {!dayTrip && (
          <Section title="Accommodations" icon="ti-bed">
            <Row label="Resort" value={trip.accommodation || 'Off Property'} />
            {resort && <Row label="Tier" value={TIER_LABELS[resort.tier]} />}
            <Row label="Booking type" value={BOOKING_LABELS[trip.booking_type] || trip.booking_type} />
            <Row label="Memory Maker" value={trip.memory_maker ? 'Yes' : 'No'} />
          </Section>
        )}

        <Section title="Tickets & access" icon="ti-ticket">
          <Row label="Ticket type" value={TICKET_LABELS[trip.ticket_type] || trip.ticket_type} />
          <Row label="Lightning Lane" value={LL_LABELS[trip.lightning_lane] || trip.lightning_lane} />
        </Section>

        <Section title="Park days" icon="ti-calendar">
          {dayRows.length === 0 ? (
            <Row label="Park days" value="Not set" />
          ) : dayRows.map(d => (
            <Row key={d.id} label={`Day ${d.day} · ${fmtDate(dateForDay(trip.arrival_date, d.day))}`} value={d.label} />
          ))}
        </Section>

        <div className={styles.fullWidth}>
          <Section title="Budget" icon="ti-chart-pie">
            <div className={styles.budgetTotals}>
              <div className={styles.budgetTotal}><div className={styles.budgetTotalLbl}>Budgeted</div><div className={styles.budgetTotalVal} style={{ color: 'var(--gold-dark)' }}>{fmt(totalBudgeted)}</div></div>
              <div className={styles.budgetTotal}><div className={styles.budgetTotalLbl}>Spent</div><div className={styles.budgetTotalVal} style={{ color: 'var(--coral)' }}>{fmt(totalActual)}</div></div>
            </div>
            {catRows.length === 0 ? (
              <div className={styles.emptyRow}>No budget was set for this trip.</div>
            ) : catRows.map(c => {
              const meta = categoryMeta(c.cat)
              return (
                <div key={c.cat} className={styles.catRow}>
                  <div className={styles.catIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
                  <div className={styles.catInfo}>
                    <div className={styles.catName}>{meta.label}</div>
                    <div className={styles.catSub}>{fmt(c.actual)} spent · {fmt(c.budgeted)} budgeted</div>
                  </div>
                </div>
              )
            })}
          </Section>

          <Section title="Expense log" icon="ti-receipt">
            {entries.length === 0 ? (
              <div className={styles.emptyRow}>No expenses were logged for this trip.</div>
            ) : entries.map(e => {
              const meta = categoryMeta(e.cat)
              const hasActual = e.actual_amt != null
              return (
                <div key={e.id} className={styles.entryRow}>
                  <div className={styles.entryIcon} style={{ background: meta.bg }}><i className={`ti ${meta.icon}`} style={{ color: meta.color }} /></div>
                  <div className={styles.entryBody}>
                    <div className={styles.entryName}>{e.label || meta.label}</div>
                    <div className={styles.entryMeta}>{e.day == null ? 'Trip level' : `Day ${e.day}`}{e.time ? ` · ${e.time}` : ''}</div>
                  </div>
                  <div className={styles.entryAmt}>{hasActual ? fmt(e.actual_amt) : fmt(e.planned_amt)}</div>
                </div>
              )
            })}
          </Section>

          {scheduledWishlist.length > 0 && (
            <Section title="Wish list" icon="ti-heart">
              {scheduledWishlist.map(w => (
                <Row key={w.id} label={`Day ${w.planned_day} · ${w.park || ''}`} value={w.name} />
              ))}
            </Section>
          )}
        </div>
      </div>

      {exporting && createPortal(
        <BudgetPrintView
          trip={trip}
          rows={catRows}
          entries={entries}
          totals={{ budgeted: totalBudgeted, planned: totalPlanned, actual: totalActual, remaining: totalBudgeted - totalActual }}
          giftCards={[]}
          rewardPrograms={[]}
          tripDetail={tripDetailSections}
          wishlist={scheduledWishlist}
        />,
        document.body
      )}
    </div>
  )
}
