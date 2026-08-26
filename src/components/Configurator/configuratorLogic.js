import { PARKS } from './configuratorData'

export function isDayTrip(S) {
  return !!(S.arrival && S.departure && S.arrival === S.departure)
}

export function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtDate(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function fmtDOW(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

// Disney requires a Vacation Package paid in full 30 days before check-in.
export function finalPaymentDate(arrivalStr) {
  const d = parseLocalDate(arrivalStr)
  d.setDate(d.getDate() - 30)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export const fmt = n => '$' + Math.round(n).toLocaleString()

export function nightsBetween(S) {
  if (!S.arrival || !S.departure || S.departure <= S.arrival) return 0
  return Math.round((parseLocalDate(S.departure) - parseLocalDate(S.arrival)) / 86400000)
}

export function budgetTotal(S) {
  return (S.budgetTravel || 0) + (S.budgetAccommodations || 0) + (S.budgetTickets || 0) + (S.budgetLightningLane || 0) +
    (S.budgetDining || 0) + (S.budgetSnacks || 0) + (S.budgetExperiences || 0) + (S.budgetSouvenirs || 0) + (S.budgetTransport || 0) + (S.budgetMisc || 0)
}

// Only regenerates the default guesses when the date range changes — revisiting
// this step (e.g. Back from Review) shouldn't wipe the user's toggles/picks.
export function generateParkDays(S) {
  const sig = S.arrival + '|' + S.departure
  if (S.parkDays.length && S.parkDaysSig === sig) return S.parkDays

  if (isDayTrip(S)) {
    return [{ date: S.arrival, dayNum: 1, isPark: true, park: 'MK' }]
  }

  const arr = parseLocalDate(S.arrival), dep = parseLocalDate(S.departure)
  const totalNights = Math.round((dep - arr) / 86400000)
  const days = []
  const cur = new Date(arr)
  let dn = 1
  while (cur <= dep) {
    const ds = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0')
    const isFirst = dn === 1, isLast = cur.getTime() === dep.getTime()
    const isPark = !isFirst && !isLast && totalNights > 1
    days.push({ date: ds, dayNum: dn, isPark, park: isPark ? 'MK' : '' })
    cur.setDate(cur.getDate() + 1)
    dn++
  }
  return days
}

export function dayStatusLabel(day, index, total) {
  if (day.isPark) return day.park ? `${day.park}` : 'Park day'
  if (index === 0 && total > 1) return 'Arrival day'
  if (index === total - 1) return 'Departure day'
  return 'Rest day'
}

export { PARKS }
