import { supabase } from '../supabase'

export async function fetchActiveTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, arrival_date, departure_date, adults, children, accommodation, booking_type, ticket_type, lightning_lane, travel_mode, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function fetchExpenses(tripId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, day, cat, label, planned_amt, actual_amt')
    .eq('trip_id', tripId)

  return { data: data ?? [], error }
}
