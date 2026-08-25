import { supabase } from '../supabase'

export async function fetchActiveTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, arrival_date, departure_date, adults, children, accommodation, booking_type, ticket_type, lightning_lane, travel_mode, transfer, departure_transfer, parking, park_transport, arr_airline, arr_flight, dep_airline, dep_flight, memory_maker, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
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
