import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabase'
import styles from './Configurator.module.css'
import {
  RESORTS, TOTAL_STEPS, STEP_NAMES, PARK_NAMES, TIER_ORDER, TIER_LABELS, TIER_BADGE,
  BIG_DATE_JUMP_DAYS, DEFAULT_S, BOOKING_LABELS, DINING_LABELS,
  TICKET_LABELS, LL_LABELS, TRANSFER_LABELS, PARKING_LABELS, BUDGET_CATEGORIES,
} from './configuratorData'
import {
  isDayTrip, parseLocalDate, fmtDate, fmtDOW, fmt, nightsBetween, budgetTotal,
  generateParkDays, dayStatusLabel, finalPaymentDate, PARKS,
} from './configuratorLogic'
import { findBudgetRow, isPackageBooking } from '../../lib/categories'
import { familyMemberAge, familyMemberIsAdult } from '../../lib/familyMembers'
import { copyWishListItems } from '../../lib/tripDuplication'

function makeDefaultS(prefill) {
  const base = JSON.parse(JSON.stringify(DEFAULT_S))
  return prefill ? { ...base, ...prefill } : base
}

function computeParty(S, familyMembers) {
  let adults = 0, children = 0
  ;(familyMembers || []).forEach(m => {
    if (!S.selectedFamily.includes(m.id)) return
    if (familyMemberIsAdult(m)) adults++; else children++
  })
  return { adults: adults + (S.extraAdults || 0), children: children + (S.extraChildren || 0) }
}

function Option({ selected, onClick, name, sub, badge, badgeClass, disabled }) {
  return (
    <button
      type="button"
      className={`${styles.opt} ${selected ? styles.sel : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className={styles.ochk}><i className="ti ti-check" /></span>
      <span className={styles.oname}>{name}</span>
      {sub && <div className={styles.osub}>{sub}</div>}
      {badge && <span className={`${styles.obdg} ${styles[badgeClass]}`}>{badge}</span>}
    </button>
  )
}

function Stepper({ label, hint, value, onDec, onInc }) {
  return (
    <div className={styles.stpr}>
      <div>
        <div className={styles.stprName}>{label}</div>
        {hint && <div className={styles.stprHint}>{hint}</div>}
      </div>
      <div className={styles.stprCtrl}>
        <button type="button" className={styles.sbtn} onClick={onDec}>−</button>
        <div className={styles.sval}>{value}</div>
        <button type="button" className={styles.sbtn} onClick={onInc}>+</button>
      </div>
    </div>
  )
}

export default function Configurator({ session, planType }) {
  const navigate = useNavigate()
  const location = useLocation()
  const outletContext = useOutletContext()
  const showToast = outletContext?.showToast
  const familyMembers = outletContext?.familyMembers
  const openFamilySheet = outletContext?.openFamilySheet
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get('tripId')
  // A "Convert to trip" / "Plan this trip" hand-off from the estimator or
  // Estimates page — only meaningful for a brand-new trip, never an edit.
  const prefill = !tripId ? location.state?.prefill : null
  // Trip duplication ("Use as Template") hand-off — also only meaningful
  // for a brand-new trip. duplicateSourceTripId flags doSave() to copy the
  // wish list and stamp duplicated_from once the new trip is created.
  const duplicateSourceTripId = !tripId ? location.state?.duplicateSourceTripId : null
  const duplicateSourceName = !tripId ? location.state?.duplicateSourceName : null
  const duplicateNewName = !tripId ? location.state?.duplicateNewName : null

  const [S, setS] = useState(() => makeDefaultS(prefill))
  const [step, setStep] = useState(0)
  const [editingTrip, setEditingTrip] = useState(false)
  const [selectedResort, setSelectedResort] = useState(prefill?.accName ? RESORTS.find(r => r.name === prefill.accName) ?? null : null)
  const [resortQuery, setResortQuery] = useState('')
  const [loading, setLoading] = useState(!!tripId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [dateAlert, setDateAlert] = useState(null)
  const [originalArrival, setOriginalArrival] = useState(null)
  // Prefilled party counts (extraAdults/extraChildren) already reflect the
  // estimate's totals — skip the auto-select-everyone effect below so it
  // doesn't add family members on top of them.
  const [famSeeded, setFamSeeded] = useState(!!prefill)
  const editTripPartyRef = useRef(null)

  const setField = (key, value) => setS(prev => ({ ...prev, [key]: value }))
  const { adults, children } = computeParty(S, familyMembers)
  const dayTrip = isDayTrip(S)

  // --- Load existing trip for edit mode ---
  useEffect(() => {
    if (!tripId) return
    let cancelled = false
    async function load() {
      const [{ data: trip, error: tripErr }, { data: expenseRows }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('expenses').select('cat, planned_amt, day, label, is_budget').eq('trip_id', tripId),
      ])
      if (cancelled) return
      if (tripErr || !trip) {
        setError('Could not load that trip.')
        setLoading(false)
        return
      }

      const next = makeDefaultS()
      next.arrival = trip.arrival_date ?? ''
      next.departure = trip.departure_date ?? ''
      // Which family members were selected isn't persisted per trip — the
      // seeding effect below re-selects everyone once family data loads, and
      // reconciles extraAdults/extraChildren against these saved totals so
      // the party count stays correct even though the exact selection isn't.
      editTripPartyRef.current = { adults: trip.adults ?? 0, children: trip.children ?? 0 }
      next.booking = trip.booking_type || 'separate'
      next.ticketType = trip.ticket_type || 'base'
      next.lightningLane = trip.lightning_lane || 'none'
      next.travel = trip.travel_mode || 'flying'
      next.transfer = trip.transfer || 'mears'
      next.departureTransfer = trip.departure_transfer || 'mears'
      next.parking = trip.parking || 'dropoff'
      next.parkTransport = trip.park_transport || ''
      next.arrAirline = trip.arr_airline || ''
      next.arrFlight = trip.arr_flight || ''
      next.depAirline = trip.dep_airline || ''
      next.depFlight = trip.dep_flight || ''
      next.memoryMaker = trip.memory_maker || false

      if (trip.accommodation) {
        const resort = RESORTS.find(r => r.name === trip.accommodation)
        next.accName = trip.accommodation
        next.tier = resort?.tier || ''
        next.isOffProperty = !resort
        if (resort) setSelectedResort(resort)
      }

      // Read each category's saved budget target — not just any row with
      // that cat, since a trip-level cat (e.g. travel) can also hold real
      // labeled entries (a flight) alongside its budget-target row.
      BUDGET_CATEGORIES.forEach(({ key, cat }) => {
        const rowsForCat = (expenseRows || []).filter(r => r.cat === cat)
        next[key] = findBudgetRow(rowsForCat, cat)?.planned_amt || 0
      })
      // A Vacation Package collapses Accommodations + Tickets into a single
      // `package` budget row — read it back into the Accommodations field so
      // editing the trip doesn't reset that budget to $0.
      if (isPackageBooking(trip)) {
        const packageRows = (expenseRows || []).filter(r => r.cat === 'package')
        next.budgetAccommodations = findBudgetRow(packageRows, 'package')?.planned_amt || 0
      }

      // Rebuild park days from what was actually saved (cat: 'park_day' rows),
      // rather than re-guessing — otherwise editing overwrites the user's
      // real selections with a generic middle-days-only default.
      const parkNameToCode = Object.fromEntries(Object.entries(PARK_NAMES).map(([code, name]) => [name, code]))
      const savedParkDayByDayNum = {}
      ;(expenseRows || []).forEach(row => {
        if (row.cat === 'park_day' && row.day != null) savedParkDayByDayNum[row.day] = row.label
      })
      if (next.arrival && (isDayTrip(next) || next.departure)) {
        const skeleton = generateParkDays(next)
        next.parkDays = skeleton.map(day => {
          const label = savedParkDayByDayNum[day.dayNum]
          return label
            ? { ...day, isPark: true, park: parkNameToCode[label] || day.park || 'MK' }
            : { ...day, isPark: false, park: '' }
        })
        next.parkDaysSig = next.arrival + '|' + next.departure
      }

      setS(next)
      setEditingTrip(true)
      setOriginalArrival(trip.arrival_date ?? null)
      setLoading(false)

      const stepParam = Number(searchParams.get('step'))
      if (Number.isInteger(stepParam) && stepParam >= 0 && stepParam < TOTAL_STEPS) setStep(stepParam)
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  // --- Family picker: select everyone by default once real family data has
  // loaded. For an edit, wait until the trip itself has finished loading
  // first, then reconcile extra guest counts against the trip's saved
  // adults/children totals (per-member selection isn't persisted).
  useEffect(() => {
    if (!familyMembers || famSeeded) return
    if (tripId && loading) return
    setFamSeeded(true)
    setS(prev => {
      if (prev.selectedFamily.length > 0) return prev
      const selectedFamily = familyMembers.map(m => m.id)
      const saved = editTripPartyRef.current
      if (!saved) return { ...prev, selectedFamily }
      const selAdults = familyMembers.filter(familyMemberIsAdult).length
      const selChildren = familyMembers.length - selAdults
      return {
        ...prev,
        selectedFamily,
        extraAdults: Math.max(0, saved.adults - selAdults),
        extraChildren: Math.max(0, saved.children - selChildren),
      }
    })
  }, [familyMembers, famSeeded, tripId, loading])

  // --- Park days: generate on entering step 4, or when dates change ---
  useEffect(() => {
    if (step !== 4 || !S.arrival) return
    if (!dayTrip && (!S.departure || S.departure <= S.arrival)) return
    const sig = S.arrival + '|' + S.departure
    if (S.parkDays.length && S.parkDaysSig === sig) return
    setS(prev => ({ ...prev, parkDays: generateParkDays(prev), parkDaysSig: sig }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, S.arrival, S.departure])

  // Trip duplication carries the source trip's park-day pattern (which days
  // were park days, and which park) by day number, not calendar date —
  // overlaid once onto whatever fresh skeleton the effect above generates
  // for the new dates. The skeleton's own "best guess" auto-assignment is
  // fully replaced (not just filled in) for every day within the source
  // trip's length, including rest days, so a source rest day doesn't
  // inherit an unrelated auto-guessed park; days beyond the source trip's
  // length keep the skeleton's own guess since duplication has no pattern
  // to say otherwise.
  const duplicateParkPatternRef = useRef(prefill?._duplicateParkPattern ?? null)
  const duplicateTripLengthRef = useRef(prefill?._duplicateTripLength ?? 0)
  const appliedDuplicatePatternRef = useRef(false)
  useEffect(() => {
    if (!duplicateParkPatternRef.current || appliedDuplicatePatternRef.current || S.parkDays.length === 0) return
    appliedDuplicatePatternRef.current = true
    const byDayNum = Object.fromEntries(duplicateParkPatternRef.current.map(p => [p.dayNum, p]))
    const sourceLength = duplicateTripLengthRef.current
    setS(prev => ({
      ...prev,
      parkDays: prev.parkDays.map(day => {
        if (day.dayNum > sourceLength) return day
        const p = byDayNum[day.dayNum]
        return p ? { ...day, isPark: true, park: p.park } : { ...day, isPark: false, park: '' }
      }),
    }))
  }, [S.parkDays])

  function goTo(target) {
    setStep(target)
  }
  function goNext() {
    let next = step + 1
    if (next === 2 && dayTrip) next = 3
    if (next < TOTAL_STEPS) goTo(next)
  }
  function goBack() {
    let prev = step - 1
    if (prev === 2 && dayTrip) prev = 1
    if (prev >= 0) goTo(prev)
  }

  function toggleFamMember(id) {
    setS(prev => {
      const idx = prev.selectedFamily.indexOf(id)
      const selectedFamily = idx > -1
        ? prev.selectedFamily.filter(x => x !== id)
        : [...prev.selectedFamily, id]
      return { ...prev, selectedFamily }
    })
  }

  function onFamilyMemberAdded(member) {
    if (!member) return
    setS(prev => ({ ...prev, selectedFamily: [...prev.selectedFamily, member.id] }))
  }

  function selectResort(resort) {
    setSelectedResort(resort)
    setS(prev => ({ ...prev, tier: resort.tier, accName: resort.name, isOffProperty: false, booking: 'separate' }))
  }
  function selectOffProperty() {
    setSelectedResort(null)
    setS(prev => ({ ...prev, tier: 'off_property', accName: '', isOffProperty: true, booking: 'separate' }))
  }
  function clearResort() {
    setSelectedResort(null)
    setResortQuery('')
    setS(prev => ({ ...prev, tier: '', accName: '', isOffProperty: false }))
  }

  const nights = nightsBetween(S)
  const bookingPkg = selectedResort ? selectedResort.pkg : (S.isOffProperty ? 'separate_only' : null)
  const pkgDisabled = bookingPkg === 'separate_only'
  const pkgDiningDisabled = bookingPkg === 'separate_only' || bookingPkg === 'package_only' || nights < 2
  const showSwanNote = bookingPkg === 'package_only' || (bookingPkg && bookingPkg !== 'separate_only' && nights === 1)

  function setBooking(val) {
    if (val === 'package' && pkgDisabled) return
    if (val === 'package_dining' && pkgDiningDisabled) return
    setField('booking', val)
  }

  function saveTrip() {
    setDateAlert(null)
    if (editingTrip && originalArrival && S.arrival) {
      const deltaDays = Math.abs((new Date(S.arrival + 'T00:00:00') - new Date(originalArrival + 'T00:00:00')) / 86400000)
      if (deltaDays > BIG_DATE_JUMP_DAYS) {
        if (planType === 'trip_pass') {
          setDateAlert({ upgrade: true, text: 'These dates are a big change from your current trip — Trip Pass covers one trip at a time, so this can\'t be saved as an edit.' })
          return
        }
        const proceed = window.confirm('These dates look like a different trip than your current one. We recommend archiving your current trip and starting a new one instead, so your trip history stays accurate.\n\nContinue anyway and just change the dates?')
        if (!proceed) return
      }
    }
    doSave()
  }

  async function doSave() {
    setSaving(true)
    setError(null)

    const arrivalYear = S.arrival ? parseLocalDate(S.arrival).getFullYear() : new Date().getFullYear()
    const tripFields = {
      user_id: session.user.id,
      name: duplicateNewName || `${S.accName || 'Disney'} ${arrivalYear}`,
      status: 'active',
      arrival_date: S.arrival,
      departure_date: S.departure,
      adults,
      children,
      accommodation: S.accName,
      booking_type: S.booking,
      ticket_type: S.ticketType,
      lightning_lane: S.lightningLane,
      travel_mode: S.travel,
      transfer: S.travel === 'flying' ? S.transfer : null,
      departure_transfer: S.travel === 'flying' ? S.departureTransfer : null,
      parking: S.travel === 'flying' ? S.parking : null,
      park_transport: S.travel === 'driving' ? S.parkTransport : null,
      arr_airline: S.travel === 'flying' ? (S.arrAirline || null) : null,
      arr_flight: S.travel === 'flying' ? (S.arrFlight || null) : null,
      dep_airline: S.travel === 'flying' ? (S.depAirline || null) : null,
      dep_flight: S.travel === 'flying' ? (S.depFlight || null) : null,
      memory_maker: S.memoryMaker,
      final_payment_date: S.arrival ? finalPaymentDate(S.arrival) : null,
    }

    let savedTripId = tripId
    if (editingTrip && tripId) {
      const { error: updErr } = await supabase.from('trips').update(tripFields).eq('id', tripId)
      if (updErr) { setError(updErr.message); setSaving(false); return }
      // Only clear the rows this save regenerates — category budget targets
      // and park-day placeholders. Real logged expenses (dining,
      // experiences, etc.) must survive a trip edit.
      await supabase.from('expenses').delete().eq('trip_id', tripId).eq('cat', 'park_day')
      await supabase.from('expenses').delete().eq('trip_id', tripId).eq('is_budget', true)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('trips')
        .insert({ ...tripFields, duplicated_from: duplicateSourceTripId || null })
        .select('id')
        .single()
      if (insErr) { setError(insErr.message); setSaving(false); return }
      savedTripId = inserted.id
      if (duplicateSourceTripId) {
        const { error: wlError } = await copyWishListItems(session.user.id, duplicateSourceTripId, savedTripId)
        if (wlError) showToast?.(`Trip created, but couldn't copy the wish list: ${wlError.message}`)
      }
    }

    const isPackage = S.booking === 'package' || S.booking === 'package_dining'
    const budgetRows = BUDGET_CATEGORIES
      .filter(({ cat }) => !(isPackage && cat === 'tickets'))
      .map(({ cat, key }) => ({
        cat: isPackage && cat === 'resort' ? 'package' : cat,
        amt: isPackage && cat === 'resort' ? (S.budgetAccommodations || 0) : (S[key] || 0),
      }))
      .filter(({ amt }) => amt > 0)
      .map(({ cat, amt }) => ({
        user_id: session.user.id,
        trip_id: savedTripId,
        cat,
        label: null,
        planned_amt: amt,
        is_budget: true,
      }))
    const parkDayRows = S.parkDays
      .filter(d => d.isPark && d.park)
      .map(d => ({
        user_id: session.user.id,
        trip_id: savedTripId,
        day: d.dayNum,
        cat: 'park_day',
        label: PARK_NAMES[d.park] || d.park,
        planned_amt: 0,
      }))
    const expenseRows = [...budgetRows, ...parkDayRows]
    if (expenseRows.length) {
      const { error: expErr } = await supabase.from('expenses').insert(expenseRows)
      if (expErr) { setError(expErr.message); setSaving(false); return }
    }

    setSaving(false)
    if (editingTrip) showToast?.('Trip updated')
    // AppShell only fetches the trip list once on mount — it doesn't
    // remount between pages, so without this a newly created trip is
    // invisible to the nav (no "Switch trip" control, since it still only
    // knows about one trip) and the dashboard keeps showing whichever trip
    // was already active.
    await outletContext?.refetchTrips?.()
    outletContext?.setActiveTripId?.(savedTripId)
    navigate('/dashboard')
  }

  if (loading) {
    return <div className={styles.loadingState}>Loading trip…</div>
  }

  const displayStep = dayTrip && step > 2 ? step : step + 1
  const totalDisplay = dayTrip ? 5 : 6

  return (
    <div className={styles.layout}>
      <div className={styles.shell}>

          <div className={styles.toolbar}>
            {!editingTrip && (
              <button type="button" className={styles.resetBtn} onClick={() => { setS(makeDefaultS()); setStep(0); setSelectedResort(null); setResortQuery('') }}>
                <i className="ti ti-rotate-2" />Reset
              </button>
            )}
            {editingTrip && (
              <button type="button" className={styles.quickSaveBtn} onClick={saveTrip} disabled={saving}>
                <i className="ti ti-check" />{saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>

          <div className={styles.progWrap}>
            <div className={styles.progSteps}>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                let cls = styles.ps
                if (i === 2 && dayTrip) cls += ` ${styles.skipped}`
                else if (i < step) cls += ` ${styles.done}`
                else if (i === step) cls += ` ${styles.active}`
                return <div key={i} className={cls} />
              })}
            </div>
            <div className={styles.progLbl}>
              <span className={styles.plStep}>Step {displayStep} of {totalDisplay}</span>
              <span>·</span>
              <span className={styles.plName}>{STEP_NAMES[step]}</span>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.screens}>
            <div key={step} className={styles.screen}>

              {step === 0 && (
                <>
                  <div className={styles.secTitle}>Who's Going</div>
                  <div className={styles.secDesc}>Tell us about your party and how long you're staying</div>
                  <div className={styles.screenSectionLbl}>Who's coming</div>
                  <div style={{ marginBottom: 14 }}>
                    {!familyMembers ? null : familyMembers.length === 0 ? (
                      <div className={styles.famEmptyPrompt}>
                        <i className="ti ti-users" />
                        <div className={styles.famEmptyTitle}>No family members yet</div>
                        <div className={styles.famEmptySub}>Add your family once and skip this step on future trips.</div>
                        <button type="button" className={styles.famAddBtn} onClick={() => openFamilySheet?.({ onSaved: onFamilyMemberAdded })}>
                          <i className="ti ti-plus" /> Add family member
                        </button>
                      </div>
                    ) : (
                      <>
                        {familyMembers.map(m => {
                          const sel = S.selectedFamily.includes(m.id)
                          const age = familyMemberAge(m.birthdate)
                          const ageLabel = age === null ? '' : age >= 18 ? `Age ${age}` : 'Child'
                          return (
                            <div key={m.id} className={`${styles.famSelectRow} ${sel ? styles.sel : ''}`} onClick={() => toggleFamMember(m.id)}>
                              <div className={styles.famAvatar}>{m.name.charAt(0)}</div>
                              <div className={styles.famInfo}>
                                <div className={styles.famName}>
                                  {m.name.split(' ')[0]}
                                  {m.annual_pass && <span className={styles.famApPill}>AP</span>}
                                </div>
                                <div className={styles.famSub}>{ageLabel}</div>
                              </div>
                              <div className={styles.famSelectCheck}><i className="ti ti-check" /></div>
                            </div>
                          )
                        })}
                        <div className={styles.famAddInline} onClick={() => openFamilySheet?.({ onSaved: onFamilyMemberAdded })}>
                          <i className="ti ti-plus" /> Add another family member
                        </div>
                      </>
                    )}
                  </div>
                  <div className={styles.screenSectionLbl}>Additional guests <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(not in your family list — friends, cousins, etc.)</span></div>
                  <div className={styles.steppers} style={{ marginBottom: 14 }}>
                    <Stepper label="Adults" value={S.extraAdults} onDec={() => setField('extraAdults', Math.max(0, S.extraAdults - 1))} onInc={() => setField('extraAdults', Math.min(8, S.extraAdults + 1))} />
                    <Stepper label="Children" hint="Ages 3–9" value={S.extraChildren} onDec={() => setField('extraChildren', Math.max(0, S.extraChildren - 1))} onInc={() => setField('extraChildren', Math.min(6, S.extraChildren + 1))} />
                  </div>
                  <div className={styles.screenSectionLbl}>Travel dates</div>
                  {duplicateSourceName && (
                    <div className={styles.infoNote} style={{ marginBottom: 8 }}>
                      <i className="ti ti-calendar-event" /> Set new dates for this trip — everything else is carried over from {duplicateSourceName}.
                    </div>
                  )}
                  <div className={styles.dateRow}>
                    <div className={styles.dateWrap}>
                      <div className={styles.colLbl}>Arrival</div>
                      <input className={styles.dateInp} type="date" value={S.arrival} onChange={e => {
                        const arrival = e.target.value
                        setS(prev => ({ ...prev, arrival, departure: (!prev.departure || prev.departure < arrival) ? arrival : prev.departure }))
                      }} />
                    </div>
                    <div className={styles.dateWrap}>
                      <div className={styles.colLbl}>Departure</div>
                      <input className={styles.dateInp} type="date" min={S.arrival} value={S.departure} onChange={e => setField('departure', e.target.value)} />
                    </div>
                  </div>
                  {S.arrival && S.departure && !dayTrip && S.departure > S.arrival && (
                    <div className={`${styles.tripChip} ${styles.show}`}>
                      <i className="ti ti-moon" /><span>{nights} night{nights !== 1 ? 's' : ''} · dates set</span>
                    </div>
                  )}
                  {dayTrip && (
                    <div className={`${styles.dayTripNote} ${styles.show}`}>
                      <i className="ti ti-sun" />Day trip detected — we'll skip the accommodations step and set up a single park day for you.
                    </div>
                  )}
                </>
              )}

              {step === 1 && (
                <>
                  <div className={styles.secTitle}>Getting there</div>
                  <div className={styles.secDesc}>How are you travelling to Orlando?</div>
                  <div className={`${styles.og} ${styles.g2}`}>
                    <Option name="Flying" sub="Into MCO" badge="Airfare + transfer" badgeClass="bb" selected={S.travel === 'flying'} onClick={() => setField('travel', 'flying')} />
                    <Option name="Driving" sub="Road trip to WDW" badge="Gas + parking" badgeClass="bo" selected={S.travel === 'driving'} onClick={() => setField('travel', 'driving')} />
                  </div>

                  {S.travel === 'flying' && (
                    <div>
                      <div className={styles.dividerLbl}>Flight details <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(optional)</span></div>
                      <div className={styles.flightRow}>
                        <div className={styles.flightGroup}>
                          <div className={styles.flightGroupLbl}>Arrival flight</div>
                          <input className={styles.miniInp} type="text" placeholder="Airline" value={S.arrAirline} onChange={e => setField('arrAirline', e.target.value)} />
                          <input className={styles.miniInp} type="text" placeholder="Flight #" value={S.arrFlight} onChange={e => setField('arrFlight', e.target.value)} />
                        </div>
                        <div className={styles.flightGroup}>
                          <div className={styles.flightGroupLbl}>Departure flight</div>
                          <input className={styles.miniInp} type="text" placeholder="Airline" value={S.depAirline} onChange={e => setField('depAirline', e.target.value)} />
                          <input className={styles.miniInp} type="text" placeholder="Flight #" value={S.depFlight} onChange={e => setField('depFlight', e.target.value)} />
                        </div>
                      </div>
                      <div className={styles.screenSectionLbl}>MCO arrival transfer</div>
                      <div className={`${styles.og} ${styles.g3}`}>
                        <Option name="Mears Connect" sub="Disney's official shuttle" selected={S.transfer === 'mears'} onClick={() => setField('transfer', 'mears')} />
                        <Option name="Rideshare" sub="Uber or Lyft from MCO" selected={S.transfer === 'rideshare'} onClick={() => setField('transfer', 'rideshare')} />
                        <Option name="Rental Car" sub="Pick up at MCO" selected={S.transfer === 'rental'} onClick={() => setField('transfer', 'rental')} />
                      </div>
                      <div className={styles.screenSectionLbl}>MCO departure transfer <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(getting back to the airport)</span></div>
                      <div className={`${styles.og} ${styles.g3}`}>
                        <Option name="Mears Connect" sub="Disney's official shuttle" selected={S.departureTransfer === 'mears'} onClick={() => setField('departureTransfer', 'mears')} />
                        <Option name="Rideshare" sub="Uber or Lyft to MCO" selected={S.departureTransfer === 'rideshare'} onClick={() => setField('departureTransfer', 'rideshare')} />
                        <Option name="Rental Car" sub="Return at MCO" selected={S.departureTransfer === 'rental'} onClick={() => setField('departureTransfer', 'rental')} />
                      </div>
                      <div className={styles.screenSectionLbl}>Departure airport parking <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(back home)</span></div>
                      <div className={`${styles.og} ${styles.g3}`}>
                        <Option name="Drop-off" sub="No parking needed" selected={S.parking === 'dropoff'} onClick={() => setField('parking', 'dropoff')} />
                        <Option name="Parking" sub="Home airport daily rate" selected={S.parking === 'parking'} onClick={() => setField('parking', 'parking')} />
                        <Option name="Rideshare" sub="Both ways" selected={S.parking === 'rideshare'} onClick={() => setField('parking', 'rideshare')} />
                      </div>
                    </div>
                  )}

                  {S.travel === 'driving' && (
                    <div>
                      {(S.tier === 'off_property' || S.isOffProperty) ? (
                        <div className={styles.infoNote}><i className="ti ti-info-circle" />No Disney transport for off-property stays. WDW theme park parking ($30/park day) will be tracked in your Transport budget.</div>
                      ) : (
                        <>
                          <div className={styles.screenSectionLbl}>Getting to the parks each day</div>
                          <div className={`${styles.og} ${styles.g2}`}>
                            <Option name="Disney transport" sub="Buses, monorail, Skyliner — included with your stay" badge="Free" badgeClass="bg" selected={S.parkTransport === 'disney_transport'} onClick={() => setField('parkTransport', 'disney_transport')} />
                            <Option name="Drive each day" sub="Self-park at WDW theme park garages" badge="$30/park day" badgeClass="bo" selected={S.parkTransport === 'drive'} onClick={() => setField('parkTransport', 'drive')} />
                          </div>
                          {S.parkTransport === 'drive' && (
                            <div className={styles.infoNote} style={{ marginTop: 8 }}><i className="ti ti-info-circle" />WDW parking will be tracked in your Transport budget.</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {step === 2 && !dayTrip && (
                <>
                  <div className={styles.secTitle}>Where are you staying?</div>
                  <div className={styles.secDesc}>Search for your resort, or scroll to browse by tier.</div>

                  {(S.accName || S.isOffProperty) ? (
                    <div className={styles.resortSelCard}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div className={styles.rscName}>{S.isOffProperty ? 'Off Property' : S.accName}</div>
                          <span className={`${styles.obdg} ${styles[S.isOffProperty ? 'bz' : (selectedResort?.tl === 'Swan & Dolphin' ? 'bz' : TIER_BADGE[S.tier])]}`} style={{ margin: '5px 0 6px', display: 'inline-block' }}>
                            {S.isOffProperty ? 'Off Property' : selectedResort?.tl}
                          </span>
                          <div className={styles.rscDesc}>{S.isOffProperty ? 'Non-Disney hotel or vacation rental — book separately only.' : selectedResort?.desc}</div>
                        </div>
                        <button type="button" className={styles.rscChange} onClick={clearResort}>Change</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className={styles.resortSearchField}>
                        <i className="ti ti-search" style={{ fontSize: 15, color: 'var(--text-tertiary)', flexShrink: 0 }} />
                        <input type="text" className={styles.resortSearchInp} placeholder="Search resorts…" value={resortQuery} onChange={e => setResortQuery(e.target.value)} autoComplete="off" />
                        {resortQuery && <button type="button" className={styles.resortClear} onClick={() => setResortQuery('')}>✕</button>}
                      </div>
                      <ResortList query={resortQuery} onSelect={selectResort} />
                      <div className={`${styles.resortItem} ${styles.offPropItem}`} onClick={selectOffProperty}>
                        <div className={styles.riLeft}>
                          <div className={styles.riName}>Off Property</div>
                          <div className={styles.riDesc}>Non-Disney hotel or vacation rental</div>
                        </div>
                        <span className={`${styles.obdg} ${styles.bz}`}>Book separately only</span>
                      </div>
                    </div>
                  )}

                  {(S.accName || S.isOffProperty) && (
                    <div>
                      <div className={styles.dividerLbl} style={{ marginTop: 16 }}>Booking type</div>
                      {editingTrip && (
                        <div className={styles.infoNote} style={{ marginBottom: 8 }}>
                          <i className="ti ti-lock" /> Booking type is locked after the trip is created.
                        </div>
                      )}
                      {duplicateSourceName && S.booking !== 'separate' && (
                        <div className={styles.infoNote} style={{ marginBottom: 8 }}>
                          <i className="ti ti-alert-triangle" /> Booking type carried over from {duplicateSourceName} — confirm this matches your new booking before saving.
                        </div>
                      )}
                      <div className={`${styles.og} ${styles.g1}`} style={{ gap: 7, opacity: editingTrip ? 0.55 : 1, pointerEvents: editingTrip ? 'none' : 'auto' }}>
                        <Option name="Book separately" sub="Hotel and tickets purchased independently" selected={S.booking === 'separate'} onClick={() => setBooking('separate')} disabled={editingTrip} />
                        <Option name="Vacation Package" sub="Resort + tickets bundled through Disney — one balance, one payment schedule" selected={S.booking === 'package'} onClick={() => setBooking('package')} disabled={editingTrip || pkgDisabled} />
                        <Option name="Package + Dining Plan" sub="Vacation Package with pre-paid meal credits — requires 2+ nights on property" selected={S.booking === 'package_dining'} onClick={() => setBooking('package_dining')} disabled={editingTrip || pkgDiningDisabled} />
                      </div>
                      {showSwanNote && (
                        <div className={styles.infoNote} style={{ marginTop: 8 }}>
                          <i className="ti ti-info-circle" />
                          {bookingPkg === 'package_only' ? "Swan & Dolphin properties can be booked as a Vacation Package but are not eligible for the Disney Dining Plan." : 'The Disney Dining Plan requires a minimum 2-night stay.'}
                        </div>
                      )}
                      {S.booking === 'package_dining' && (
                        <div className={`${styles.subField} ${styles.show}`}>
                          <div className={styles.subFieldLbl}>Dining plan tier</div>
                          <div className={`${styles.og} ${styles.g3}`}>
                            <Option name="Quick Service" sub="2 QS + 2 snacks per person per night" selected={S.dining === 'quick_service'} onClick={() => setField('dining', 'quick_service')} />
                            <Option name="Standard" sub="1 TS + 1 QS + 2 snacks per person per night" selected={S.dining === 'standard'} onClick={() => setField('dining', 'standard')} />
                            <Option name="Deluxe" sub="3 TS or QS + 2 snacks per person per night" selected={S.dining === 'deluxe'} onClick={() => setField('dining', 'deluxe')} />
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: 10 }}>
                        <div className={styles.toggleRow}>
                          <div className={styles.toggleLeft}>
                            <div className={styles.toggleName}>Memory Maker</div>
                            <div className={styles.toggleSub}>Unlimited PhotoPass downloads for your whole party</div>
                          </div>
                          <button type="button" className={`${styles.toggle} ${S.memoryMaker ? styles.on : ''}`} onClick={() => setField('memoryMaker', !S.memoryMaker)} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <div className={styles.secTitle}>Tickets & Lightning Lane</div>
                  <div className={styles.secDesc}>What kind of park tickets did you purchase?</div>
                  <div className={styles.screenSectionLbl}>Ticket type</div>
                  <div className={`${styles.og} ${styles.g2}`}>
                    <Option name="Base" sub="One park per day" badge="Standard" badgeClass="bg" selected={S.ticketType === 'base'} onClick={() => setField('ticketType', 'base')} />
                    <Option name="Park Hopper" sub="Visit multiple parks per day after 2pm" badge="+$65–90/ticket" badgeClass="bb" selected={S.ticketType === 'hopper'} onClick={() => setField('ticketType', 'hopper')} />
                    <Option name="Hopper Plus" sub="Park Hopper + water parks & ESPN" badge="+$85–110/ticket" badgeClass="bo" selected={S.ticketType === 'hopper_plus'} onClick={() => setField('ticketType', 'hopper_plus')} />
                    <Option name="Water Park & Sports" sub="Typhoon Lagoon, Blizzard Beach & ESPN only" badge="+$74–80/ticket" badgeClass="bz" selected={S.ticketType === 'water_sports'} onClick={() => setField('ticketType', 'water_sports')} />
                  </div>
                  <div className={styles.screenSectionLbl}>Lightning Lane</div>
                  <div className={`${styles.og} ${styles.g3}`}>
                    <Option name="None" sub="Standby lines only" badge="Free" badgeClass="bg" selected={S.lightningLane === 'none'} onClick={() => setField('lightningLane', 'none')} />
                    <Option name="Multi Pass" sub="Book multiple rides throughout the day" badge="~$15–25/pp/day" badgeClass="bb" selected={S.lightningLane === 'multipass'} onClick={() => setField('lightningLane', 'multipass')} />
                    <Option name="MP + Singles" sub="Multi Pass + top ride bookings" badge="~$55–90/pp/day" badgeClass="bc" selected={S.lightningLane === 'singles'} onClick={() => setField('lightningLane', 'singles')} />
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className={styles.secTitle}>Plan your park days</div>
                  <div className={styles.secDesc}>Which days are you heading to the parks? We've made our best guess — tap to adjust.</div>
                  {S.parkDays.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>Set your travel dates in Step 1 first.</div>
                  ) : (
                    S.parkDays.map((day, i) => (
                      <ParkDayCard
                        key={day.date + i}
                        day={day}
                        index={i}
                        total={S.parkDays.length}
                        onToggle={() => setS(prev => {
                          const parkDays = [...prev.parkDays]
                          const isPark = !parkDays[i].isPark
                          parkDays[i] = { ...parkDays[i], isPark, park: isPark ? (parkDays[i].park || 'MK') : '' }
                          return { ...prev, parkDays }
                        })}
                        onSelectPark={park => setS(prev => {
                          const parkDays = [...prev.parkDays]
                          parkDays[i] = { ...parkDays[i], park }
                          return { ...prev, parkDays }
                        })}
                      />
                    ))
                  )}
                </>
              )}

              {step === 5 && (
                <ReviewStep
                  S={S}
                  editingTrip={editingTrip}
                  adults={adults}
                  children={children}
                  nights={nights}
                  dayTrip={dayTrip}
                  setField={setField}
                  goTo={goTo}
                  dateAlert={dateAlert}
                  onSave={saveTrip}
                  saving={saving}
                />
              )}

            </div>
          </div>

          <div className={styles.nav}>
            <div className={styles.navRow}>
              {step > 0 && <button type="button" className={styles.navBack} onClick={goBack}>← Back</button>}
              {step < TOTAL_STEPS - 1 && (
                <button type="button" className={styles.navNext} onClick={goNext}>
                  {step === TOTAL_STEPS - 2 ? <>Review <i className="ti ti-arrow-right" /></> : <>Next <i className="ti ti-arrow-right" /></>}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
  )
}

function ResortList({ query, onSelect }) {
  const filtered = query
    ? RESORTS.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    : RESORTS

  if (!filtered.length) {
    return <div style={{ padding: '12px 4px', fontSize: 12, color: 'var(--text-tertiary)' }}>No resorts found. Try "Caribbean", "Polynesian", or "Swan".</div>
  }

  if (query) {
    return <div className={styles.resortList}>{filtered.map(r => <ResortItem key={r.name} r={r} onSelect={onSelect} />)}</div>
  }

  return (
    <div className={styles.resortList}>
      {TIER_ORDER.map(tier => {
        const group = filtered.filter(r => r.tier === tier && r.tl !== 'Swan & Dolphin')
        if (!group.length) return null
        return (
          <div key={tier}>
            <div className={styles.tierHdr}>{TIER_LABELS[tier]}</div>
            {group.map(r => <ResortItem key={r.name} r={r} onSelect={onSelect} />)}
          </div>
        )
      })}
      {(() => {
        const sd = filtered.filter(r => r.tl === 'Swan & Dolphin')
        if (!sd.length) return null
        return (
          <div>
            <div className={styles.tierHdr}>Swan &amp; Dolphin</div>
            {sd.map(r => <ResortItem key={r.name} r={r} onSelect={onSelect} />)}
          </div>
        )
      })()}
    </div>
  )
}

function ResortItem({ r, onSelect }) {
  const badge = r.tl === 'Swan & Dolphin' ? 'bz' : TIER_BADGE[r.tier]
  return (
    <div className={styles.resortItem} onClick={() => onSelect(r)}>
      <div className={styles.riLeft}>
        <div className={styles.riName}>{r.name}</div>
        <div className={styles.riDesc}>{r.desc}</div>
      </div>
      <span className={`${styles.obdg} ${styles[badge]}`}>{r.tl}</span>
    </div>
  )
}

function ParkDayCard({ day, index, total, onToggle, onSelectPark }) {
  const isOnlyDay = total === 1
  const statusTxt = day.isPark ? (PARK_NAMES[day.park] || 'Park day') : dayStatusLabel(day, index, total)
  return (
    <div className={`${styles.dayCard} ${day.isPark ? styles.parkOn : ''}`}>
      <div className={styles.dayCardTop}>
        <div className={`${styles.dayChip2} ${day.isPark ? '' : styles.off}`}>
          <div className={styles.dayChip2Num}>{day.dayNum}</div>
          <div className={styles.dayChip2Dow}>{fmtDOW(day.date)}</div>
        </div>
        <div className={styles.dayInfo}>
          <div className={styles.dayDateLbl}>{fmtDate(day.date)}</div>
          <div className={styles.dayStatusLbl}>{statusTxt}</div>
        </div>
        {!isOnlyDay && <button type="button" className={`${styles.toggle} ${day.isPark ? styles.on : ''}`} onClick={onToggle} />}
      </div>
      <div className={`${styles.parkSelector} ${day.isPark ? styles.show : ''}`}>
        <div className={styles.parkPills}>
          {PARKS.map(p => (
            <button key={p} type="button" className={`${styles.parkPill} ${day.park === p ? styles.sel : ''}`} onClick={() => onSelectPark(p)}>{p}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReviewStep({ S, editingTrip, adults, children, nights, dayTrip, setField, goTo, dateAlert, onSave, saving }) {
  const total = budgetTotal(S)
  const party = adults + children
  const parkCount = S.parkDays.filter(d => d.isPark).length
  const ticketsBundled = S.booking === 'package' || S.booking === 'package_dining'
  const diningBundled = S.booking === 'package_dining'

  const DAY_CATS = [
    { key: 'budgetLightningLane', label: 'Lightning Lane', icon: 'ti-bolt', bg: 'rgba(245,181,54,0.16)', ic: '#C68A12', sub: LL_LABELS[S.lightningLane] },
    { key: 'budgetDining', label: 'Dining', icon: 'ti-tools-kitchen-2', bg: 'rgba(224,83,63,0.12)', ic: '#E0533F', locked: diningBundled, lockNote: 'Included in your Vacation Package + Dining Plan — budgeted under Accommodations.' },
    { key: 'budgetSnacks', label: 'Snacks', icon: 'ti-ice-cream', bg: 'rgba(44,165,141,0.16)', ic: '#1B7D68' },
    { key: 'budgetExperiences', label: 'Experiences', icon: 'ti-stars', bg: 'rgba(245,181,54,0.16)', ic: '#C68A12' },
    { key: 'budgetSouvenirs', label: 'Souvenirs', icon: 'ti-gift', bg: 'rgba(224,83,63,0.12)', ic: '#E0533F' },
    { key: 'budgetTransport', label: 'Transport', icon: 'ti-car', bg: 'rgba(42,111,224,0.12)', ic: '#1E5AC4' },
    { key: 'budgetMisc', label: 'Misc', icon: 'ti-dots', bg: 'rgba(13,35,64,0.07)', ic: 'rgba(13,35,64,0.5)' },
  ]

  return (
    <>
      <div className={styles.costWrap}>
        <div className={styles.costTicket}>
          <div className={styles.costLeft}>
            <div className={styles.costLbl}>Total budget</div>
            <div className={styles.costNum}>{fmt(total)}</div>
          </div>
          <div className={styles.costDivider} />
          <div className={styles.costRight}>
            <div className={styles.costLbl}>Per person</div>
            <div className={styles.costPp}>{party > 0 ? fmt(total / party) : '—'}</div>
          </div>
        </div>
      </div>
      <div className={styles.secTitle}>{editingTrip ? 'Everything look right?' : 'Looks good?'}</div>
      <div className={styles.secDesc}>{editingTrip ? 'Review your updated trip details below.' : 'Review your trip before we set up your planner. You can edit any of this later.'}</div>

      <div className={styles.bkCard}>
        <div className={styles.catReviewHdr}>
          <div className={styles.catReviewIcon} style={{ background: 'rgba(42,111,224,0.12)' }}><i className="ti ti-plane" style={{ color: 'var(--sky-dark)' }} /></div>
          <div className={styles.catReviewInfo}><div className={styles.catReviewTitle}>Travel</div><button type="button" className={styles.catReviewEdit} onClick={() => goTo(1)}>Edit</button></div>
          <BudgetField value={S.budgetTravel} onChange={v => setField('budgetTravel', v)} />
        </div>
        <ReviewRow label="Travel" value={S.travel === 'flying' ? 'Flying into MCO' : 'Driving'} />
        {S.travel === 'flying' ? (
          <>
            <ReviewRow label="MCO transfer" value={TRANSFER_LABELS[S.transfer]} />
            <ReviewRow label="Return to MCO" value={TRANSFER_LABELS[S.departureTransfer]} />
            <ReviewRow label="Airport parking" value={PARKING_LABELS[S.parking]} />
          </>
        ) : (
          <ReviewRow label="Park transport" value={S.parkTransport === 'drive' ? 'Drive each day — WDW parking tracked in budget' : S.parkTransport === 'disney_transport' ? 'Disney transport (free)' : 'Not yet selected'} missing={!S.parkTransport} />
        )}
      </div>

      <div className={styles.bkCard}>
        <div className={styles.catReviewHdr}>
          <div className={styles.catReviewIcon} style={{ background: 'rgba(13,35,64,0.08)' }}><i className="ti ti-building-castle" style={{ color: 'var(--night)' }} /></div>
          <div className={styles.catReviewInfo}><div className={styles.catReviewTitle}>Accommodations</div><button type="button" className={styles.catReviewEdit} onClick={() => goTo(dayTrip ? 0 : 2)}>Edit</button></div>
          <BudgetField value={S.budgetAccommodations} onChange={v => setField('budgetAccommodations', v)} />
        </div>
        {dayTrip ? (
          <ReviewRow label="Stay" value="Day trip — no overnight stay" />
        ) : (
          <>
            <ReviewRow label="Property" value={S.isOffProperty ? 'Off Property' : S.accName} missing={!S.accName && !S.isOffProperty} missingLabel="Select resort" />
            <ReviewRow label="Tier" value={S.tier ? (TIER_LABELS[S.tier] || (S.tier === 'off_property' ? 'Off Property' : '')) : ''} missing={!S.tier} missingLabel="Select" />
            <ReviewRow label="Booking" value={BOOKING_LABELS[S.booking]} />
            {S.booking === 'package_dining' && <ReviewRow label="Dining plan" value={DINING_LABELS[S.dining]} />}
            <ReviewRow label="Memory Maker" value={S.memoryMaker ? 'Yes' : 'No'} />
          </>
        )}
      </div>

      <div className={styles.bkCard}>
        <div className={styles.catReviewHdr}>
          <div className={styles.catReviewIcon} style={{ background: 'rgba(245,181,54,0.16)' }}><i className="ti ti-ticket" style={{ color: 'var(--gold-dark)' }} /></div>
          <div className={styles.catReviewInfo}><div className={styles.catReviewTitle}>Tickets</div><button type="button" className={styles.catReviewEdit} onClick={() => goTo(3)}>Edit</button></div>
          <BudgetField value={ticketsBundled ? 0 : S.budgetTickets} onChange={v => setField('budgetTickets', v)} disabled={ticketsBundled} />
        </div>
        {ticketsBundled && <div className={styles.catReviewNote}><i className="ti ti-info-circle" />Included in your Vacation Package cost — budgeted under Accommodations.</div>}
        <ReviewRow label="Tickets" value={TICKET_LABELS[S.ticketType]} />
      </div>

      <div className={styles.bkCard}>
        <div className={styles.cfgReviewHdr}><span className={styles.cfgReviewHdrLbl}>Day-to-day budgets</span></div>
        {DAY_CATS.map(c => (
          <div key={c.key}>
            <div className={styles.budgetCatRow}>
              <div className={styles.budgetCatIcon} style={{ background: c.bg }}><i className={`ti ${c.icon}`} style={{ color: c.ic }} /></div>
              <div className={styles.budgetCatName}>{c.label}{c.sub && <div className={styles.budgetCatSub}>{c.sub}</div>}</div>
              <BudgetField value={c.locked ? 0 : S[c.key]} onChange={v => setField(c.key, v)} disabled={c.locked} small />
            </div>
            {c.locked && <div className={styles.catReviewNote} style={{ borderTop: 'none' }}><i className="ti ti-info-circle" />{c.lockNote}</div>}
          </div>
        ))}
      </div>

      <div className={styles.bkCard}>
        <div className={styles.cfgReviewHdr}><span className={styles.cfgReviewHdrLbl}>Dates &amp; party</span><button type="button" className={styles.cfgReviewEdit} onClick={() => goTo(0)}>Edit</button></div>
        <ReviewRow label="Arrival" value={S.arrival ? fmtDate(S.arrival) : ''} missing={!S.arrival} missingLabel="Date" />
        {!dayTrip && <ReviewRow label="Departure" value={S.departure ? fmtDate(S.departure) : ''} missing={!S.departure} missingLabel="Date" />}
        <ReviewRow label="Length" value={dayTrip ? 'Day trip' : (nights > 0 ? `${nights} nights · ${parkCount} park days` : 'Not set')} />
        {dateAlert && (
          <div className={styles.cfgDateAlert}>
            <div className={styles.cfgDateAlertTitle}><i className="ti ti-alert-triangle" /> This looks like a different trip</div>
            {dateAlert.text}
            {dateAlert.upgrade && (
              <button type="button" className={styles.cfgDateAlertUpgradeBtn} onClick={() => window.location.assign('/paywall')}><i className="ti ti-crown" /> Upgrade to plan another trip</button>
            )}
          </div>
        )}
        <ReviewRow label="Party" value={`${adults} adult${adults !== 1 ? 's' : ''}${children ? ' · ' + children + ' child' + (children !== 1 ? 'ren' : '') : ''}`} />
        <div className={styles.cfgReviewHdr}><span className={styles.cfgReviewHdrLbl}>Park days</span><button type="button" className={styles.cfgReviewEdit} onClick={() => goTo(4)}>Edit</button></div>
        {parkCount === 0 ? (
          <ReviewRow value="No park days set" missing missingLabel="No park days set" />
        ) : (
          S.parkDays.filter(d => d.isPark).map(d => <ReviewRow key={d.date} label={fmtDate(d.date)} value={PARK_NAMES[d.park] || d.park} />)
        )}
      </div>

      <div className={styles.convertCard}>
        <div className={styles.ccTitle}>{editingTrip ? 'Save your changes' : 'Ready to start planning'}</div>
        <div className={styles.ccSub}>{editingTrip ? "We'll update your budget and itinerary to match." : "We'll create your budget categories and itinerary based on these details."}</div>
        <button type="button" className={styles.ccBtn} onClick={onSave} disabled={saving}>
          <i className="ti ti-sparkles" /> {saving ? 'Saving…' : editingTrip ? 'Save changes' : 'Save trip & open planner'}
        </button>
      </div>
    </>
  )
}

function ReviewRow({ label, value, missing, missingLabel }) {
  return (
    <div className={styles.cfgReviewRow}>
      {label && <span className={styles.cfgReviewLbl}>{label}</span>}
      <span className={`${styles.cfgReviewVal} ${missing ? styles.missing : ''}`}>{missing ? `${missingLabel} needed` : value}</span>
    </div>
  )
}

function BudgetField({ value, onChange, disabled, small }) {
  return (
    <div className={`${small ? styles.budgetCatField : styles.catBudgetField} ${disabled ? styles.disabled : ''}`}>
      <div className={styles.cfgAmtPre}>$</div>
      <input
        type="number"
        min="0"
        step={small ? 10 : 50}
        placeholder="0"
        disabled={disabled}
        value={disabled ? '' : (value || '')}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  )
}
