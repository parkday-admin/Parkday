import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChange } from './lib/auth'
import { getProfile } from './lib/profile'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Paywall from './pages/Paywall'

function useSession() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  useEffect(() => onAuthStateChange(setSession), [])
  return session
}

function useSubscriptionStatus(session) {
  const [status, setStatus] = useState(undefined) // undefined = loading, null = no active plan

  useEffect(() => {
    if (!session) {
      setStatus(null)
      return
    }

    let cancelled = false
    setStatus(undefined)

    getProfile(session.user.id).then(({ data }) => {
      if (!cancelled) setStatus(data?.subscription_status ?? null)
    })

    return () => { cancelled = true }
  }, [session])

  return status
}

export default function App() {
  const session = useSession()
  const status = useSubscriptionStatus(session)

  // Still resolving session, or resolving a signed-in user's plan.
  if (session === undefined || (session && status === undefined)) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
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
        <Route
          path="/dashboard"
          element={
            !session
              ? <Navigate to="/" replace />
              : status !== 'active'
                ? <Navigate to="/paywall" replace />
                : <Dashboard session={session} />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
