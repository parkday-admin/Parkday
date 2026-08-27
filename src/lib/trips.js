import { supabase } from '../supabase'

export async function fetchActiveTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, arrival_date, departure_date, adults, children, accommodation, booking_type, ticket_type, lightning_lane, travel_mode, transfer, departure_transfer, parking, park_transport, arr_airline, arr_flight, dep_airline, dep_flight, memory_maker, gc_savings_goal, final_payment_date, status, created_at')
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
