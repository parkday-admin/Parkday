import { useEffect, useState } from 'react'
import { onAuthStateChange } from './lib/auth'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    return onAuthStateChange(setSession)
  }, [])

  if (session === undefined) return null // brief flash while Supabase restores session

  return session ? <Dashboard session={session} /> : <Auth />
}
