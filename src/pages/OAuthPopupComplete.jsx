import { useEffect, useState } from 'react'
import { onAuthStateChange } from '../lib/auth'

// Landing page for the popup window signInWithGoogle opens for installed
// (standalone) apps — see lib/auth.js. Waits for the OAuth redirect's
// session to land, then closes itself; the opener window picks up the
// same session via Supabase's cross-tab storage sync.
export default function OAuthPopupComplete() {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let done = false

    const unsubscribe = onAuthStateChange(s => {
      if (!s || done) return
      done = true
      window.close()
    })

    const timeout = setTimeout(() => {
      if (!done) setTimedOut(true)
    }, 15000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: 24,
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif',
      color: '#0D2340',
    }}
    >
      <p>{timedOut ? 'Signed in — you can close this window.' : 'Finishing sign-in…'}</p>
    </div>
  )
}
