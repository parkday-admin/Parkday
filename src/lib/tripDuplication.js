import resorts from '../data/resorts.json'
import { supabase } from '../supabase'
import { fetchExpenses } from './expenses'
import { fetchWishList } from './wishlist'
import { fetchTripForDuplication, tripDays } from './trips'
import { findBudgetRow, isPackageBooking } from './categories'
import { BUDGET_CATEGORIES, PARK_NAMES } from '../components/Configurator/configuratorData'

const PARK_NAME_TO_CODE = Object.fromEntries(Object.entries(PARK_NAMES).map(([code, name]) => [name, code]))

// Builds a Configurator prefill payload from a source trip — the trip-to-
// trip counterpart of estimates.js's rowToConfiguratorPrefill, but drawn
// from a real trip so it also carries budget targets and the park-day
// pattern (an estimate has no equivalent of either). Dates are deliberately
// left out — the whole point of duplication is picking new ones.
export function tripToConfiguratorPrefill(trip, expenseRows) {
  const matchedResort = trip.accommodation ? resorts.find(r => r.name === trip.accommodation) : null
  const isPackage = isPackageBooking(trip)

  const prefill = {
    extraAdults: trip.adults || 0,
    extraChildren: trip.children || 0,
    tier: matchedResort ? matchedResort.tier : '',
    accName: matchedResort ? matchedResort.name : '',
    isOffProperty: false,
    booking: trip.booking_type || 'separate',
    memoryMaker: !!trip.memory_maker,
    ticketType: trip.ticket_type || 'base',
    lightningLane: trip.lightning_lane || 'none',
    travel: trip.travel_mode || 'flying',
    parkTransport: trip.park_transport || '',
    transfer: trip.transfer || 'mears',
    departureTransfer: trip.departure_transfer || 'mears',
    parking: trip.parking || 'dropoff',
    // Flight numbers are intentionally left out — trip-specific, not worth
    // copying (per the duplication brief's copy table).
  }

  BUDGET_CATEGORIES.forEach(({ key, cat }) => {
    prefill[key] = findBudgetRow(expenseRows.filter(r => r.cat === cat), cat)?.planned_amt || 0
  })
  if (isPackage) {
    prefill.budgetAccommodations = findBudgetRow(expenseRows.filter(r => r.cat === 'package'), 'package')?.planned_amt || 0
  }

  // Consumed by Configurator's park-day-pattern overlay effect once the
  // user picks new dates — by day number, not calendar date, so it carries
  // over regardless of the new trip's actual dates. _duplicateTripLength is
  // the source trip's own day count (not just its highest park day), so a
  // trailing rest day correctly clears an auto-guessed park assignment too.
  prefill._duplicateParkPattern = expenseRows
    .filter(r => r.cat === 'park_day')
    .map(r => ({ dayNum: r.day, isPark: true, park: PARK_NAME_TO_CODE[r.label] || 'MK' }))
  prefill._duplicateTripLength = tripDays(trip).length

  return prefill
}

// Fetches everything needed to build a duplication prefill for a given
// source trip in one shot.
export async function loadDuplicationSource(tripId) {
  const [{ data: trip, error: tripError }, { data: expenses, error: expError }] = await Promise.all([
    fetchTripForDuplication(tripId),
    fetchExpenses(tripId),
  ])
  if (tripError) return { error: tripError }
  if (expError) return { error: expError }
  return { prefill: tripToConfiguratorPrefill(trip, expenses), error: null }
}

// Copies the source trip's wish list into the new trip as unscheduled
// items — the "Added to Day X" linkage is cleared since day numbers may
// not correspond to the same parks in the new trip.
export async function copyWishListItems(userId, sourceTripId, newTripId) {
  const { data: items, error } = await fetchWishList(userId, sourceTripId)
  if (error) return { error }
  if (!items.length) return { error: null }

  const rows = items.map(({ catalog_id, name, park, category, price_label, price_mid, notes, custom, lightning_lane_tier, dining_tier, cuisine, dining_plan_credits }) => ({
    user_id: userId, trip_id: newTripId, catalog_id, name, park, category, price_label, price_mid, notes, custom, lightning_lane_tier, dining_tier, cuisine, dining_plan_credits,
    planned_expense_id: null, planned_day: null,
  }))
  const { error: insertError } = await supabase.from('wish_list_items').insert(rows)
  return { error: insertError }
}
