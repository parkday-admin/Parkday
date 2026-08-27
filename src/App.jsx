import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { onAuthStateChange } from './lib/auth'
import { getProfile } from './lib/profile'
import { getCollaboratorStatus } from './lib/collaborator'
import Home from './pages/Home'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import InviteAccept from './pages/InviteAccept'
import Dashboard from './pages/Dashboard'
import Paywall from './pages/Paywall'
import PausedAccess from './pages/PausedAccess'
import Configurator from './components/Configurator/Configurator'
import AppShell from './components/Layout/AppShell'
import ComingSoon from './pages/ComingSoon'
import EstimatorPage from './pages/EstimatorPage'
import Account from './pages/Account'
import TripSettings from './pages/TripSettings'
import Budget from './pages/Budget'
import CategoryDetail from './pages/CategoryDetail'
import Itinerary from './pages/Itinerary'
import Wishlist from './pages/Wishlist'
import Gifts from './pages/Gifts'
import Payments from './pages/Payments'
import Packing from './pages/Packing'
import Reminders from './pages/Reminders'
import More from './pages/More'

function useSession() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  useEffect(() => onAuthStateChange(s => {
    // The saved-estimate chip on the login page is a one-time nudge to
    // create an account — once a session exists (any sign-in path,
    // including the Google OAuth redirect), its job is done. Without this
    // it lingers in localStorage forever and resurfaces on every future
    // login, unrelated to what the user is currently doing.
    if (s) localStorage.removeItem('pkd_estimate')
    setSession(s)
  }), [])
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
      if (!cancelled) {
        setProfile(data ? {
          status: data.subscription_status ?? null,
          planType: data.plan_type ?? null,
          accountType: data.account_type ?? 'owner',
          collaboratorOf: data.collaborator_of ?? null,
        } : null)
      }
    })

    return () => { cancelled = true }
  }, [session])

  return profile
}

// A collaborator's own profile row carries no subscription info — their
// access is derived from the owner's. Re-fetched on every route change
// (not just once at login) so a lapsed subscription locks a collaborator
// out immediately on their next navigation, not just their next sign-in.
function useCollaboratorStatus(profile, pathname) {
  const [status, setStatus] = useState(undefined) // undefined = loading/not applicable, null = not a collaborator

  useEffect(() => {
    if (profile?.accountType !== 'collaborator') {
      setStatus(null)
      return
    }

    let cancelled = false
    getCollaboratorStatus().then(({ data }) => {
      if (!cancelled) setStatus(data ?? null)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.accountType, pathname])

  return status
}

function RequirePaidAuth({ session, canAccess }) {
  if (!session) return <Navigate to="/login" replace />
  if (!canAccess) return <Navigate to="/paywall" replace />
  return <Outlet />
}

function AppRoutes({ session, profile }) {
  const location = useLocation()
  const collaboratorStatus = useCollaboratorStatus(profile, location.pathname)

  const isCollaborator = profile?.accountType === 'collaborator'
  // Still waiting on the owner-status lookup for a collaborator — don't
  // make a routing decision (which would flash paused/dashboard) until it
  // resolves.
  if (isCollaborator && collaboratorStatus === undefined) return null

  const canAccess = isCollaborator ? !!collaboratorStatus?.ownerActive : profile?.status === 'active'
  const destination = canAccess ? '/dashboard' : '/paywall'

  return (
    <Routes>
      <Route
        path="/"
        element={!session ? <Home /> : <Navigate to={destination} replace />}
      />
      <Route
        path="/login"
        element={!session ? <Auth /> : <Navigate to={destination} replace />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/invite/:token" element={<InviteAccept session={session} />} />
      <Route
        path="/paywall"
        element={
          !session
            ? <Navigate to="/" replace />
            : canAccess
              ? <Navigate to="/dashboard" replace />
              : isCollaborator
                ? <PausedAccess ownerName={collaboratorStatus?.ownerName ?? 'The account owner'} />
                : <Paywall session={session} />
        }
      />

      <Route element={<RequirePaidAuth session={session} canAccess={canAccess} />}>
        <Route element={<AppShell session={session} planType={profile?.planType ?? null} accountType={profile?.accountType ?? 'owner'} collaboratorOf={profile?.collaboratorOf ?? null} />}>
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
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/gifts" element={<Gifts />} />
          <Route path="/packing" element={<Packing />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/more" element={<More />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const session = useSession()
  const profile = useProfile(session)

  // Still resolving session, or resolving a signed-in user's plan.
  if (session === undefined || (session && profile === undefined)) return null

  return (
    <BrowserRouter>
      <AppRoutes session={session} profile={profile} />
    </BrowserRouter>
  )
}
