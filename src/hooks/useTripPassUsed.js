import { useEffect, useState } from 'react'
import { hasExistingTrip } from '../lib/trips'

// Trip Pass covers one trip, ever — a Trip Pass user who's already used
// theirs (even if it's since been archived, hence no activeTrip) should get
// an upgrade prompt on any "Plan a trip" entry point, not just Dashboard's.
// Defaults to false so a brand-new Trip Pass purchaser (landing here
// straight from checkout, with genuinely zero trips) isn't blocked while
// this resolves.
export default function useTripPassUsed(activeTrip, planType, userId) {
  const [tripPassUsed, setTripPassUsed] = useState(false)

  useEffect(() => {
    if (activeTrip || planType !== 'trip_pass' || !userId) { setTripPassUsed(false); return }
    let cancelled = false
    hasExistingTrip(userId).then(({ hasTrip }) => { if (!cancelled) setTripPassUsed(hasTrip) })
    return () => { cancelled = true }
  }, [activeTrip, planType, userId])

  return tripPassUsed
}
