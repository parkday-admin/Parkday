import { supabase } from '../supabase'

export async function fetchActiveTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, arrival_date, departure_date, adults, children, accommodation, booking_type, ticket_type, lightning_lane, travel_mode, transfer, departure_transfer, parking, park_transport, arr_airline, arr_flight, dep_airline, dep_flight, memory_maker, gc_savings_goal, final_payment_date, status, created_at, duplicated_from, staleness_banner_dismissed')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function fetchArchivedTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, arrival_date, departure_date, accommodation, status, created_at')
    .eq('status', 'archived')
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

// The full set of configurator fields for a trip being used as a
// duplication source — deliberately wider than fetchArchivedTrips'/
// fetchActiveTrips' selects, which only carry what their own screens show.
// arrival_date/departure_date are included only to derive the source
// trip's day count (for the park-day pattern overlay) — never copied into
// the prefill itself.
export async function fetchTripForDuplication(tripId) {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, adults, children, accommodation, booking_type, ticket_type, lightning_lane, travel_mode, transfer, departure_transfer, parking, park_transport, memory_maker, arrival_date, departure_date')
    .eq('id', tripId)
    .single()

  return { data, error }
}

// Name + arrival year for the Budget page's "carried over from X (YYYY)"
// staleness banner — a live lookup rather than a value snapshotted at
// duplication time, so a rename of the source trip is reflected too.
export async function fetchTripSourceInfo(tripId) {
  const { data, error } = await supabase
    .from('trips')
    .select('name, arrival_date')
    .eq('id', tripId)
    .maybeSingle()

  return { data, error }
}

export async function dismissStalenessBanner(tripId) {
  const { error } = await supabase.from('trips').update({ staleness_banner_dismissed: true }).eq('id', tripId)
  return { error }
}

export async function updateTripSavingsGoal(tripId, goal) {
  const { error } = await supabase.from('trips').update({ gc_savings_goal: goal }).eq('id', tripId)
  return { error }
}

// Moves a trip out of the active list without touching its data — it's
// still visible (and editable via "Unarchive") in the account's Trip
// archive.
export async function archiveTrip(tripId) {
  const { error } = await supabase.from('trips').update({ status: 'archived' }).eq('id', tripId)
  return { error }
}

export async function unarchiveTrip(tripId) {
  const { error } = await supabase.from('trips').update({ status: 'active' }).eq('id', tripId)
  return { error }
}

// A soft delete — the row (and its expenses, wish list, etc.) is kept for
// backend statistics, but this hides it from the user everywhere:
// excluded from both fetchActiveTrips and fetchArchivedTrips, and from
// data exports (status != 'deleted') once that exists. Not reversible
// from the user's side, unlike archive.
export async function deleteTrip(tripId) {
  const { error } = await supabase.from('trips').update({ status: 'deleted' }).eq('id', tripId)
  return { error }
}

export function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Falls back to computing 30-days-before-arrival client-side for any trip
// saved before final_payment_date existed on the row (a one-time DB backfill
// covers existing trips, but this keeps the page correct even if that ever
// gets bypassed — e.g. a row inserted outside the configurator).
export function effectiveFinalPaymentDate(trip) {
  if (trip.final_payment_date) return trip.final_payment_date
  if (!trip.arrival_date) return null
  const d = parseLocalDate(trip.arrival_date)
  d.setDate(d.getDate() - 30)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// Whole days from today (local, start-of-day) to a 'YYYY-MM-DD' date —
// negative if the date has passed.
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((parseLocalDate(dateStr) - today) / 86400000)
}

// One entry per trip day: { day, date ('YYYY-MM-DD'), dow ('Mon') }
export function tripDays(trip) {
  if (!trip?.arrival_date) return []
  if (trip.arrival_date === trip.departure_date) {
    const d = parseLocalDate(trip.arrival_date)
    return [{ day: 1, date: trip.arrival_date, dow: d.toLocaleDateString('en-US', { weekday: 'short' }) }]
  }
  const start = parseLocalDate(trip.arrival_date)
  const end = parseLocalDate(trip.departure_date)
  const nights = Math.round((end - start) / 86400000)
  return Array.from({ length: nights + 1 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    return { day: i + 1, date, dow: d.toLocaleDateString('en-US', { weekday: 'short' }) }
  })
}

// The trip whose date range currently contains today, if any — trips are
// already ordered by created_at desc (fetchActiveTrips), so the first match
// naturally wins when two trips' dates overlap (an edge case not worth
// engineering around further).
export function dateActiveTrip(trips) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return (trips ?? []).find(t => {
    if (!t.arrival_date || !t.departure_date) return false
    return parseLocalDate(t.arrival_date) <= today && today <= parseLocalDate(t.departure_date)
  }) ?? null
}

// 1-based trip day number for today. Only meaningful when dateActiveTrip
// found this trip — callers shouldn't call this otherwise.
export function tripDayNumberForToday(trip) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((today - parseLocalDate(trip.arrival_date)) / 86400000) + 1
}

// The park/status label for a given 1-based day number: the saved park_day
// row's label if the day has one, else Arrival/Departure/Rest day based on
// position — shared by the itinerary day nav and the wish list's
// "Added to Day X · ..." label so both describe a day the same way.
export function dayParkLabel(trip, expenses, dayNum) {
  const days = tripDays(trip)
  const index = days.findIndex(d => d.day === dayNum)
  const parkRow = expenses.find(e => e.cat === 'park_day' && e.day === dayNum)
  if (parkRow) return parkRow.label
  if (index === 0 && days.length > 1) return 'Arrival day'
  if (index === days.length - 1) return 'Departure day'
  return 'Rest day'
}

const PARK_ICON = { 'Magic Kingdom': 'ti-building-castle', EPCOT: 'ti-world', 'Hollywood Studios': 'ti-camera', 'Animal Kingdom': 'ti-paw' }

// Like dayParkLabel, but also resolves a Tabler icon and title-cases the
// non-park labels — used by the Today card/full view. Departure day always
// reads as travel even if a park was assigned to it, since guests don't
// spend departure day at a park.
export function dayTypeInfo(trip, expenses, dayNum) {
  const days = tripDays(trip)
  const index = days.findIndex(d => d.day === dayNum)
  const isDeparture = index === days.length - 1 && days.length > 1
  const isArrival = index === 0 && days.length > 1
  const parkRow = !isDeparture && expenses.find(e => e.cat === 'park_day' && e.day === dayNum)
  if (parkRow) return { label: parkRow.label, icon: PARK_ICON[parkRow.label] || 'ti-sun', isPark: true }
  if (isDeparture || isArrival) return { label: 'Travel Day', icon: 'ti-plane', isPark: false }
  return { label: 'Rest Day', icon: 'ti-sun', isPark: false }
}
