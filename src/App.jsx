import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { onAuthStateChange, adoptSessionFromHandoff, buildSessionHandoffHash, getCurrentSession } from './lib/auth'
import { getProfile } from './lib/profile'
import { getCollaboratorStatus } from './lib/collaborator'
import IOSInstallBanner from './components/IOSInstallBanner'
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
import Estimates from './pages/Estimates'
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
  // A genuine sign-in transition (the user actually just signed in), as
  // opposed to a page load that recovers an already-persisted session —
  // Supabase's SIGNED_IN event fires for both, so this comes from
  // isFreshSignIn (see lib/auth.js's markExpectingSignIn), not the event
  // name. Only the former should trigger the post-login redirect below;
  // treating every SIGNED_IN as fresh caused an infinite reload loop, since
  // each hard redirect's own page load re-recovers the same session and
  // fires SIGNED_IN again.
  const [justSignedIn, setJustSignedIn] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((s, _event, isFreshSignIn) => {
      // The saved-estimate chip on the login page is a one-time nudge to
      // create an account — once a session exists (any sign-in path,
      // including the Google OAuth redirect), its job is done. Without this
      // it lingers in localStorage forever and resurfaces on every future
      // login, unrelated to what the user is currently doing.
      if (s) localStorage.removeItem('pkd_estimate')
      setSession(s)
      if (isFreshSignIn) setJustSignedIn(true)
    })
    // If this load carries a session handed off from the marketing domain
    // (see useAppSubdomainRedirect), adopt it — setSession triggers the
    // listener above with the real session, same as any other sign-in.
    adoptSessionFromHandoff()
    return unsubscribe
  }, [])

  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState !== 'visible') return
      // See getCurrentSession's comment — this is what un-freezes a
      // standalone install left on a stale "Redirecting…" screen after
      // Google sign-in completed in iOS's separate in-app browser overlay.
      getCurrentSession().then(fresh => {
        setSession(current => (fresh?.access_token !== current?.access_token ? fresh : current))
      })
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [])

  return { session, justSignedIn }
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

// After a fresh sign-in (the SIGNED_IN transition — see useSession's
// justSignedIn), land the user on their destination via a real full-page
// navigation rather than client-side routing.
//
// On a domain other than app.planyourparkday.com (the marketing domain, or
// local dev pointed at it), this also sends them to the app subdomain
// instead of finishing the login locally — the session's tokens ride along
// in the URL fragment (buildSessionHandoffHash) since app.planyourparkday.com
// can't see localStorage from this origin, or the user lands there logged
// out and has to sign in a second time.
//
// Even when already on the app subdomain, a real navigation (not React
// Router's client-side <Navigate>) matters for an installed Android PWA:
// Google's sign-in page is outside the manifest's scope, so Chrome shows
// browser chrome (an address bar + close button) over the installed app
// for the OAuth trip. Chrome is supposed to auto-hide that once back in
// scope, but only reliably does so on an actual top-level navigation —
// a client-side route change after the redirect lands can leave the user
// stuck looking at browser chrome around an otherwise-working app.
//
// Fires at most once per sign-in (hasRedirected) — justSignedIn stays true
// for the rest of the session, and without the guard this would force a
// full reload on every subsequent render.
function useRedirectAfterSignIn(session, justSignedIn, destination) {
  const [hasRedirected, setHasRedirected] = useState(false)
  const onAppSubdomain = window.location.hostname === 'app.planyourparkday.com'
  const onLocalhost = window.location.hostname === 'localhost'
  const shouldRedirect = justSignedIn && !!session && !!destination && !hasRedirected

  useEffect(() => {
    if (!shouldRedirect) return
    setHasRedirected(true)
    const target = onAppSubdomain || onLocalhost
      ? destination
      : `https://app.planyourparkday.com${destination}${buildSessionHandoffHash(session)}`
    window.location.replace(target)
    // onAppSubdomain/onLocalhost read from window.location at render time,
    // not state — stable for the life of this component, so omitting them
    // doesn't risk a stale redirect target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRedirect, destination, session])

  return shouldRedirect
}

function AppRoutes({ session, profile, justSignedIn }) {
  const location = useLocation()
  const collaboratorStatus = useCollaboratorStatus(profile, location.pathname)

  const isCollaborator = profile?.accountType === 'collaborator'
  // Still waiting on the owner-status lookup for a collaborator — don't
  // make a routing decision (which would flash paused/dashboard) until it
  // resolves.
  const statusLoading = isCollaborator && collaboratorStatus === undefined

  const canAccess = isCollaborator ? !!collaboratorStatus?.ownerActive : profile?.status === 'active'
  const destination = canAccess ? '/dashboard' : '/paywall'

  // Called unconditionally (before the statusLoading early return) so hook
  // order stays stable across renders.
  const redirectingAfterSignIn = useRedirectAfterSignIn(session, justSignedIn, statusLoading ? null : destination)

  if (statusLoading) return null
  if (redirectingAfterSignIn) return null

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
            // An active Trip Pass holder can still land here deliberately —
            // the "Upgrade to add a trip" / "Upgrade to Plus" buttons all
            // route here — to upgrade to Plus. Only bounce away a user with
            // nothing left to upgrade to (already on Plus, or paused
            // collaborator access, which has no plan of its own to buy).
            : canAccess && (isCollaborator || profile?.planType === 'plus_pass')
              ? <Navigate to="/dashboard" replace />
              : isCollaborator
                ? <PausedAccess ownerName={collaboratorStatus?.ownerName ?? 'The account owner'} />
                : <Paywall session={session} currentPlanType={canAccess ? profile?.planType : null} />
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
          <Route path="/estimates" element={<Estimates />} />
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
  const { session, justSignedIn } = useSession()
  const profile = useProfile(session)

  // Still resolving session, or resolving a signed-in user's plan.
  if (session === undefined || (session && profile === undefined)) return null

  return (
    <>
      <BrowserRouter>
        <AppRoutes session={session} profile={profile} justSignedIn={justSignedIn} />
      </BrowserRouter>
      <IOSInstallBanner />
    </>
  )
}
