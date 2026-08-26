import { supabase } from '../supabase'
import { parseLocalDate } from './trips'
import { categoryMeta } from './categories'
import resorts from '../data/resorts.json'

const SELECT = 'id, title, description, reminder_date, icon, color, bg, done, system, sort_order'

export async function fetchReminders(userId, tripId) {
  const { data, error } = await supabase
    .from('reminders')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .order('sort_order')

  return { data: data ?? [], error }
}

export async function insertReminders(rows) {
  if (!rows.length) return { data: [], error: null }
  const { data, error } = await supabase.from('reminders').insert(rows).select(SELECT)
  return { data: data ?? [], error }
}

export async function createReminder(userId, tripId, fields) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({ user_id: userId, trip_id: tripId, system: false, ...fields })
    .select(SELECT)
    .single()

  return { data, error }
}

export async function updateReminder(id, fields) {
  const { data, error } = await supabase
    .from('reminders')
    .update(fields)
    .eq('id', id)
    .select(SELECT)
    .single()

  return { data, error }
}

export async function deleteReminder(id) {
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  return { error }
}

export async function setReminderDone(id, done) {
  const { error } = await supabase.from('reminders').update({ done }).eq('id', id)
  return { error }
}

export function urgencyLevel(daysOut) {
  if (daysOut <= 6) return 'high'
  if (daysOut <= 12) return 'med'
  return 'low'
}
export const URGENCY_LABEL = { high: 'Urgent', med: 'Upcoming', low: 'On track' }

function addDays(dateStr, delta) {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + delta)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// The trip's auto-generated (system: true) reminders — dining/experience
// booking windows, online check-in, Lightning Lane windows, final payment,
// and packing — computed once from trip data. days-out is never stored;
// the page recomputes it from reminder_date on every render.
export function buildSystemReminders(trip, userId) {
  if (!trip.arrival_date) return []

  const dining = categoryMeta('dining')
  const experience = categoryMeta('experience')
  const resort = resorts.find(r => r.name === trip.accommodation)
  const earlyLLAccess = resort?.earlyLLAccess ?? false
  const llWindowDays = earlyLLAccess ? 7 : 3

  const rows = [
    {
      title: 'Dining reservations',
      description: "Disney resort guests can book ADRs 60 days before check-in. Book early — Be Our Guest, Cinderella's Royal Table, and character meals fill up within minutes.",
      reminder_date: addDays(trip.arrival_date, -60),
      icon: 'ti-tools-kitchen-2', color: dining.color, bg: dining.bg,
    },
    {
      title: 'Experience reservations',
      description: "Bookings for paid experiences — Bibbidi Bobbidi Boutique, Savi's Workshop, Wild Africa Trek, and others — open 60 days before check-in for resort guests. These sell out fast. If you haven't added experiences to your Wish List yet, now's a great time.",
      reminder_date: addDays(trip.arrival_date, -60),
      icon: 'ti-stars', color: experience.color, bg: experience.bg,
    },
    {
      title: 'Online check-in',
      description: 'Opens 10 days before arrival. Complete it early to enable Magic Mobile entry and room-ready notifications for all guests.',
      reminder_date: addDays(trip.arrival_date, -10),
      icon: 'ti-door', color: 'var(--sky)', bg: 'rgba(42,111,224,0.12)',
    },
  ]

  if (trip.lightning_lane && trip.lightning_lane !== 'none') {
    rows.push({
      title: 'Lightning Lane Multi Pass',
      description: earlyLLAccess
        ? 'Resort guests can book Multi Pass selections starting 7 days before check-in. Have your top picks for each park day ready.'
        : 'Guests can book Multi Pass selections starting 3 days before check-in. Have your top picks for each park day ready.',
      reminder_date: addDays(trip.arrival_date, -llWindowDays),
      icon: 'ti-bolt', color: '#1B7D68', bg: 'rgba(44,165,141,0.18)',
    })
  }

  if (trip.lightning_lane === 'singles') {
    rows.push({
      title: 'Individual Lightning Lane',
      description: 'Individual attraction selections open at park open each day, in addition to your Multi Pass bookings.',
      reminder_date: trip.arrival_date,
      icon: 'ti-flame', color: '#c03a2b', bg: 'rgba(224,83,63,0.15)',
    })
  }

  if (trip.booking_type === 'package' || trip.booking_type === 'package_dining') {
    rows.push({
      title: 'Final payment due',
      description: 'Disney requires full payment of your Vacation Package 30 days before check-in.',
      reminder_date: trip.final_payment_date || addDays(trip.arrival_date, -30),
      icon: 'ti-credit-card', color: 'var(--teal-dark)', bg: 'rgba(44,165,141,0.16)',
    })
  }

  rows.push({
    title: 'Pack bags',
    description: 'Give yourself a couple of days of buffer before your trip.',
    reminder_date: addDays(trip.arrival_date, -2),
    icon: 'ti-briefcase', color: '#8a5a00', bg: 'rgba(245,181,54,0.18)',
  })

  return rows.map((r, i) => ({ user_id: userId, trip_id: trip.id, system: true, sort_order: i, ...r }))
}
