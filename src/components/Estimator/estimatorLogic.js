import { RESORT_RATES, TPD, TPD_CHILD, PH, LLR, MEAL, WDW } from './estimatorData'

export const fmt = n => '$' + Math.round(n).toLocaleString()
export const rng = (a, b) => fmt(a) + '–' + fmt(b)
export const bkt = d => (d === 1 ? '1' : d <= 3 ? '2-3' : '4+')

function hav(a, b, c, d) {
  const R = 3959, dL = ((c - a) * Math.PI) / 180, dl = ((d - b) * Math.PI) / 180
  const x = Math.sin(dL / 2) ** 2 + Math.cos((a * Math.PI) / 180) * Math.cos((c * Math.PI) / 180) * Math.sin(dl / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function milesFrom(lat, lon) {
  return hav(lat, lon, WDW[0], WDW[1])
}

function ftier(mi) {
  if (!mi) return [199, 399]
  if (mi < 400) return [99, 249]
  if (mi < 900) return [149, 329]
  if (mi < 1600) return [199, 449]
  if (mi < 2500) return [249, 549]
  return [299, 699]
}

function gas(mi) {
  if (!mi) return [0, 0]
  const r = mi * 1.3 * 2
  return [Math.round((r / 28) * 3), Math.round((r / 28) * 4.2)]
}

export function driveStr(mi) {
  if (!mi) return '—'
  const r = Math.round(mi * 1.3), h = Math.floor(r / 60), m = Math.round((r / 60 - h) * 60)
  return `~${h}h${m ? ' ' + m + 'm' : ''} · ${r} mi each way`
}

export function travelEst(S, skipped, originMiles) {
  if (skipped.travel || originMiles === null) return { lo: 0, hi: 0, lines: [] }
  const t = S.adults + S.children
  if (S.travel === 'flying') {
    const fc = ftier(originMiles)
    const lo = fc[0] * 2 * t + 16 * t * 2, hi = fc[1] * 2 * t + 35 * t * 2
    return { lo, hi, lines: [{ icon: 'ti-plane', bg: 'rgba(42,111,224,0.12)', ic: '#1E5AC4', name: 'Travel', lo, hi }] }
  } else {
    const [gLo, gHi] = gas(originMiles)
    const pk = 30 * S.parkdays
    return { lo: gLo + pk, hi: gHi + pk, lines: gLo > 0 ? [{ icon: 'ti-car', bg: 'rgba(42,111,224,0.12)', ic: '#1E5AC4', name: 'Travel', lo: gLo + pk, hi: gHi + pk }] : [] }
  }
}

export function diningCalc(S) {
  const t = S.adults + S.children
  const qsLo = MEAL.qs[0] * S.qs * t * S.parkdays, qsHi = MEAL.qs[1] * S.qs * t * S.parkdays
  const tsLo = MEAL.ts[0] * S.ts * t * S.parkdays, tsHi = MEAL.ts[1] * S.ts * t * S.parkdays
  const chLo = MEAL.character[0] * S.character * t, chHi = MEAL.character[1] * S.character * t
  const snLo = MEAL.snack[0] * S.snacks * t * S.parkdays, snHi = MEAL.snack[1] * S.snacks * t * S.parkdays
  const tipsLo = (tsLo + chLo) * 0.18, tipsHi = (tsHi + chHi) * 0.20
  return {
    qsLo, qsHi, tsLo, tsHi, chLo, chHi, snLo, snHi, tipsLo, tipsHi,
    totalLo: qsLo + tsLo + chLo + snLo + tipsLo, totalHi: qsHi + tsHi + chHi + snHi + tipsHi,
  }
}

export function calc(S, step, skipped, originMiles) {
  const bk = bkt(S.parkdays), se = S.season
  const apCount = S.apHolderCount || 0
  const apDiscountApplied = apCount > 0 && S.nights > 0
  const resortMult = apDiscountApplied ? 0.9 : 1
  const r = RESORT_RATES[S.resort][se], rLo = r[0] * S.nights * resortMult, rHi = r[1] * S.nights * resortMult
  // AP holders need no ticket; the estimator doesn't track which specific
  // members hold APs, so holders are assumed to come from adults first,
  // then children, when splitting the remaining ticketed party.
  const apFromAdults = Math.min(apCount, S.adults)
  const apFromChildren = Math.min(apCount - apFromAdults, S.children)
  const ticketedAdults = S.adults - apFromAdults
  const ticketedChildren = S.children - apFromChildren
  const ticketedParty = ticketedAdults + ticketedChildren
  const tp = TPD[se][bk], tpc = TPD_CHILD[se][bk], ph = PH[S.ticket]
  const pAdLo = (tp[0] + ph[0]) * S.parkdays, pAdHi = (tp[1] + ph[1]) * S.parkdays
  const pChLo = (tpc[0] + ph[0]) * S.parkdays, pChHi = (tpc[1] + ph[1]) * S.parkdays
  const tkLo = pAdLo * ticketedAdults + pChLo * ticketedChildren, tkHi = pAdHi * ticketedAdults + pChHi * ticketedChildren
  const ll = LLR[S.ll], llLo = ll[0] * ticketedParty * S.parkdays, llHi = ll[1] * ticketedParty * S.parkdays
  const d = diningCalc(S)
  const includeDining = step >= 4
  const dLo = includeDining ? d.totalLo : 0, dHi = includeDining ? d.totalHi : 0
  const tv = travelEst(S, skipped, originMiles)
  const includeTravel = !skipped.travel && originMiles !== null
  const tvLo = includeTravel ? tv.lo : 0, tvHi = includeTravel ? tv.hi : 0
  const svLo = S.souvenirs, svHi = S.souvenirs
  const exLo = S.experiences, exHi = S.experiences
  const subLo = rLo + tkLo + llLo + dLo + tvLo + svLo + exLo
  const subHi = rHi + tkHi + llHi + dHi + tvHi + svHi + exHi
  const mLo = subLo * 0.1, mHi = subHi * 0.1
  const totalLo = subLo + mLo, totalHi = subHi + mHi, total = (totalLo + totalHi) / 2
  const lines = []
  if (includeTravel) lines.push(...tv.lines)
  lines.push(
    { icon: 'ti-building-castle', bg: 'rgba(13,35,64,0.08)', ic: '#0D2340', name: 'Accommodations', lo: rLo, hi: rHi },
    { icon: 'ti-ticket', bg: 'rgba(42,111,224,0.12)', ic: '#1E5AC4', name: 'Tickets', lo: tkLo, hi: tkHi },
    { icon: 'ti-bolt', bg: 'rgba(245,181,54,0.16)', ic: '#C68A12', name: 'Lightning Lane', lo: llLo, hi: llHi },
  )
  if (includeDining) {
    if (S.qs > 0) lines.push({ icon: 'ti-shopping-bag', bg: 'rgba(224,83,63,0.12)', ic: '#E0533F', name: 'Quick service dining', lo: d.qsLo, hi: d.qsHi })
    if (S.ts > 0) lines.push({ icon: 'ti-tools-kitchen-2', bg: 'rgba(224,83,63,0.12)', ic: '#E0533F', name: 'Table service dining', lo: d.tsLo, hi: d.tsHi })
    if (S.character > 0) lines.push({ icon: 'ti-stars', bg: 'rgba(245,181,54,0.16)', ic: '#C68A12', name: 'Character dining', lo: d.chLo, hi: d.chHi })
    if (S.snacks > 0) lines.push({ icon: 'ti-ice-cream', bg: 'rgba(44,165,141,0.16)', ic: '#1B7D68', name: 'Snacks', lo: d.snLo, hi: d.snHi })
    if (d.tipsLo > 0) lines.push({ icon: 'ti-coin', bg: 'rgba(245,181,54,0.16)', ic: '#C68A12', name: 'Tips (est.)', lo: d.tipsLo, hi: d.tipsHi })
  }
  if (S.souvenirs > 0) lines.push({ icon: 'ti-gift', bg: 'rgba(224,83,63,0.12)', ic: '#E0533F', name: 'Souvenirs', lo: S.souvenirs, hi: S.souvenirs })
  if (S.experiences > 0) lines.push({ icon: 'ti-stars', bg: 'rgba(245,181,54,0.16)', ic: '#C68A12', name: 'Experiences', lo: S.experiences, hi: S.experiences })
  lines.push({ icon: 'ti-dots', bg: 'rgba(13,35,64,0.08)', ic: '#0D2340', name: 'Buffer (10%)', lo: mLo, hi: mHi })
  return { total, totalLo, totalHi, lines, dining: d, apDiscountApplied, ticketedParty }
}

export function expLineTotal(e, S) {
  const t = S.adults + S.children
  return e.pp ? e.val * Math.max(1, t) : e.val
}

export function buildEstimatePayload(S, skipped, c) {
  const sumBy = names => {
    const lo = c.lines.filter(l => names.includes(l.name)).reduce((s, l) => s + l.lo, 0)
    const hi = c.lines.filter(l => names.includes(l.name)).reduce((s, l) => s + l.hi, 0)
    return Math.round((lo + hi) / 2)
  }
  return {
    adults: S.adults,
    children: S.children,
    nights: S.nights,
    parkDays: S.parkdays,
    travelMode: skipped.travel ? 'skip' : S.travel,
    resortTier: S.resort,
    season: S.season,
    ticketType: S.ticket,
    lightningLane: S.ll,
    estimatedBudget: {
      travel: sumBy(['Travel']),
      accommodations: sumBy(['Accommodations']),
      tickets: sumBy(['Tickets']),
      dining: sumBy(['Quick service dining', 'Table service dining', 'Character dining', 'Tips (est.)']),
      snacks: sumBy(['Snacks']),
      lightningLane: sumBy(['Lightning Lane']),
      souvenirs: S.souvenirs,
      experiences: S.experiences,
    },
  }
}
