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

export const DEFAULT_S = {
  arrival: '', departure: '',
  selectedFamily: [], extraAdults: 0, extraChildren: 0,
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
export const LL_LABELS = { none: 'None — standby only', multipass: 'Lightning Lane Multi Pass', singles: 'Multi Pass + Singles', premierpass: 'Lightning Lane Premier Pass' }
export const TRANSFER_LABELS = { mears: 'Mears Connect', rideshare: 'Rideshare (Uber/Lyft)', rental: 'Rental Car' }
export const PARKING_LABELS = { dropoff: 'Drop-off', parking: 'Parking', rideshare: 'Rideshare both ways' }

// cat keys match src/lib/categories.js exactly. Accommodations + Tickets
// collapse into a single `package` row when the trip is booked as a
// Vacation Package (see doSave() in Configurator.jsx).
export const BUDGET_CATEGORIES = [
  { key: 'budgetTravel', cat: 'travel' },
  { key: 'budgetAccommodations', cat: 'resort' },
  { key: 'budgetTickets', cat: 'tickets' },
  { key: 'budgetLightningLane', cat: 'll' },
  { key: 'budgetDining', cat: 'dining' },
  { key: 'budgetSnacks', cat: 'snacks' },
  { key: 'budgetExperiences', cat: 'experience' },
  { key: 'budgetSouvenirs', cat: 'souvenirs' },
  { key: 'budgetTransport', cat: 'transport' },
  { key: 'budgetMisc', cat: 'misc' },
]
