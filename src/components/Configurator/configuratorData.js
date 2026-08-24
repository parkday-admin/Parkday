import resorts from '../../data/resorts.json'

export const RESORTS = resorts

export const TOTAL_STEPS = 6
export const STEP_NAMES = ['Party Size', 'Getting there', 'Accommodations', 'Tickets & Lightning Lane', 'Park days', 'Review & save']
export const PARKS = ['MK', 'EPCOT', 'HS', 'AK']
export const PARK_NAMES = { MK: 'Magic Kingdom', EPCOT: 'EPCOT', HS: 'Hollywood Studios', AK: 'Animal Kingdom' }
export const TIER_ORDER = ['value', 'moderate', 'deluxe', 'villa']
export const TIER_LABELS = { value: 'Value', moderate: 'Moderate', deluxe: 'Deluxe', villa: 'Deluxe Villa' }
export const TIER_BADGE = { value: 'bg', moderate: 'bb', deluxe: 'bo', villa: 'bc' }

export const BIG_DATE_JUMP_DAYS = 21

// Placeholder family list — stands in for a real family-profile feature.
export const FAMILY_MEMBERS = [
  { name: 'Adult 1', isAdult: true },
  { name: 'Adult 2', isAdult: true },
  { name: 'Child 1', isAdult: false },
]

export const DEFAULT_S = {
  arrival: '', departure: '',
  selectedFamily: FAMILY_MEMBERS.map((_, i) => i), extraAdults: 0, extraChildren: 0,
  tier: '', accName: '', isOffProperty: false,
  booking: 'separate', dining: 'quick_service', memoryMaker: false,
  ticketType: 'base', lightningLane: 'none',
  travel: 'flying', parkTransport: '', transfer: 'mears', departureTransfer: 'mears', parking: 'dropoff',
  arrAirline: '', arrFlight: '', depAirline: '', depFlight: '',
  parkDays: [], parkDaysSig: null,
  budgetTravel: 0, budgetAccommodations: 0, budgetTickets: 0,
  budgetLightningLane: 0, budgetDining: 0, budgetSnacks: 0, budgetExperiences: 0, budgetSouvenirs: 0, budgetTransport: 0, budgetMisc: 0,
}

export const BOOKING_LABELS = { separate: 'Book separately', package: 'Vacation Package', package_dining: 'Package + Dining Plan' }
export const DINING_LABELS = { quick_service: 'Quick Service Plan', standard: 'Standard Dining Plan', deluxe: 'Deluxe Dining Plan' }
export const TICKET_LABELS = { base: 'Base (one park/day)', hopper: 'Park Hopper', hopper_plus: 'Hopper Plus', water_sports: 'Water Park & Sports' }
export const LL_LABELS = { none: 'None — standby only', multipass: 'Lightning Lane Multi Pass', singles: 'Multi Pass + Singles' }
export const TRANSFER_LABELS = { mears: 'Mears Connect', rideshare: 'Rideshare (Uber/Lyft)', rental: 'Rental Car' }
export const PARKING_LABELS = { dropoff: 'Drop-off', parking: 'Parking', rideshare: 'Rideshare both ways' }

export const BUDGET_CATEGORIES = [
  { key: 'budgetTravel', cat: 'travel', label: 'Travel' },
  { key: 'budgetAccommodations', cat: 'accommodations', label: 'Accommodations' },
  { key: 'budgetTickets', cat: 'tickets', label: 'Tickets' },
  { key: 'budgetLightningLane', cat: 'lightning_lane', label: 'Lightning Lane' },
  { key: 'budgetDining', cat: 'dining', label: 'Dining' },
  { key: 'budgetSnacks', cat: 'snacks', label: 'Snacks' },
  { key: 'budgetExperiences', cat: 'experiences', label: 'Experiences' },
  { key: 'budgetSouvenirs', cat: 'souvenirs', label: 'Souvenirs' },
  { key: 'budgetTransport', cat: 'transport', label: 'Transport' },
  { key: 'budgetMisc', cat: 'misc', label: 'Misc' },
]
