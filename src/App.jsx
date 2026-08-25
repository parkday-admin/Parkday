import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { onAuthStateChange } from './lib/auth'
import { getProfile } from './lib/profile'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Paywall from './pages/Paywall'
import Configurator from './components/Configurator/Configurator'
import AppShell from './components/Layout/AppShell'
import ComingSoon from './pages/ComingSoon'
import EstimatorPage from './pages/EstimatorPage'
import Account from './pages/Account'
import TripSettings from './pages/TripSettings'
import Budget from './pages/Budget'
import CategoryDetail from './pages/CategoryDetail'

function useSession() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  useEffect(() => onAuthStateChange(setSession), [])
  return session
}

function useProfile(session) {
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = no active plan

  useEffect(() => {
    // session === undefined means the session itself hasn't resolved yet —
    // leave profile alone (still loading) rather than treating "unknown" the
    // same as "confirmed signed out", which would flash status:null and
    // misroute protected routes through the paywall before the real profile
    // ever loads.
    if (session === undefined) return

    if (!session) {
      setProfile(null)
      return
    }

    let cancelled = false
    setProfile(undefined)

    getProfile(session.user.id).then(({ data }) => {
      if (!cancelled) setProfile(data ? { status: data.subscription_status ?? null, planType: data.plan_type ?? null } : null)
    })

    return () => { cancelled = true }
  }, [session])

  return profile
}

function RequirePaidAuth({ session, status }) {
  if (!session) return <Navigate to="/login" replace />
  if (status !== 'active') return <Navigate to="/paywall" replace />
  return <Outlet />
}

export default function App() {
  const session = useSession()
  const profile = useProfile(session)
  const status = profile?.status ?? null

  // Still resolving session, or resolving a signed-in user's plan.
  if (session === undefined || (session && profile === undefined)) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            !session
              ? <Home />
              : <Navigate to={status === 'active' ? '/dashboard' : '/paywall'} replace />
          }
        />
        <Route
          path="/login"
          element={
            !session
              ? <Auth />
              : <Navigate to={status === 'active' ? '/dashboard' : '/paywall'} replace />
          }
        />
        <Route
          path="/paywall"
          element={
            !session
              ? <Navigate to="/" replace />
              : status === 'active'
                ? <Navigate to="/dashboard" replace />
                : <Paywall session={session} />
          }
        />

        <Route element={<RequirePaidAuth session={session} status={status} />}>
          <Route element={<AppShell session={session} />}>
            <Route
              path="/configurator"
              element={<Configurator session={session} planType={profile?.planType ?? null} />}
            />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trip-settings" element={<TripSettings />} />
            <Route path="/estimator" element={<EstimatorPage />} />
            <Route path="/account" element={<Account />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/budget/:cat" element={<CategoryDetail />} />
            <Route path="/itinerary" element={<ComingSoon title="Itinerary" icon="ti-calendar" />} />
            <Route path="/wishlist" element={<ComingSoon title="Wish list" icon="ti-heart" />} />
            <Route path="/payments" element={<ComingSoon title="Payments" icon="ti-credit-card" />} />
            <Route path="/gifts" element={<ComingSoon title="Gift Cards & Rewards" icon="ti-gift" />} />
            <Route path="/packing" element={<ComingSoon title="Packing list" icon="ti-backpack" />} />
            <Route path="/reminders" element={<ComingSoon title="Reminders" icon="ti-bell" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
