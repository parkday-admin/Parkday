import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { signIn, signUp, signInWithGoogle } from '../lib/auth'
import { updateProfile } from '../lib/profile'
import { previewInvite, acceptInvite } from '../lib/collaborator'
import styles from './Auth.module.css'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

const NAME_STASH_KEY = 'pkd_invite_name'
const INVALID_MESSAGES = {
  invalid: { headline: 'Invalid invite', body: 'This invite link is invalid.' },
  used: { headline: 'Invite already used', body: 'This invite has already been used.' },
  expired: { headline: 'Invite expired', body: 'This invite has expired. Ask the owner to resend it.' },
}

export default function InviteAccept({ session }) {
  const { token } = useParams()

  const [invite, setInvite] = useState(undefined) // undefined = checking, {state, ownerName} once resolved
  const [mode, setMode] = useState('signup') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    let cancelled = false
    previewInvite(token).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) { setInvite({ state: 'invalid' }); return }
      setInvite(data)
    })
    return () => { cancelled = true }
  }, [token])

  // Fires once a session exists — a fresh signup that didn't need email
  // confirmation, an existing-account sign-in, or a Google OAuth redirect
  // landing back on this same invite URL. Applies any stashed name from a
  // signup that's just now getting its first session, then accepts.
  useEffect(() => {
    if (!session || invite?.state !== 'valid' || accepting) return

    let cancelled = false
    setAccepting(true)
    setError(null)

    async function run() {
      const stashedName = localStorage.getItem(NAME_STASH_KEY)
      if (stashedName) {
        await updateProfile(session.user.id, { full_name: stashedName })
        localStorage.removeItem(NAME_STASH_KEY)
      }

      const { error } = await acceptInvite(token)
      if (cancelled) return
      if (error) {
        setError(error.message)
        setAccepting(false)
        return
      }
      // A full reload, not a client-side navigate — App.jsx only fetches
      // the profile once per session and has no reason to refetch just
      // because the URL changed, so it would otherwise still be holding
      // the pre-acceptance profile (account_type: 'owner', no
      // subscription) and route straight to the paywall instead of the
      // dashboard.
      window.location.href = '/dashboard'
    }

    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, invite, token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    if (mode === 'signup') {
      const { data, error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else if (!data.session) {
        // Email confirmation is required on this project — stash the name
        // for when they come back through this same link, signed in.
        if (name.trim()) localStorage.setItem(NAME_STASH_KEY, name.trim())
        setNotice('Check your email to confirm your account, then come back to this invite link and sign in.')
      } else if (name.trim()) {
        await updateProfile(data.session.user.id, { full_name: name.trim() })
      }
      // If a session came back immediately, the effect above picks it up.
    } else {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  async function handleGoogle() {
    setError(null)
    setGoogleLoading(true)
    const { error } = await signInWithGoogle(window.location.href)
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  if (invite === undefined) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link to="/" className={styles.brand}>
              <img className={styles.logoImg} src="/assets/logos/parkday-icon.svg" alt="Parkday" />
              <span className={styles.wordmark}>Parkday</span>
            </Link>
          </div>
        </header>
        <div className={styles.layout}>
          <div className={styles.card}>
            <h1 className={styles.headline}>Checking your invite…</h1>
            <p className={styles.subhead}>One moment please.</p>
          </div>
        </div>
      </div>
    )
  }

  if (invite.state !== 'valid') {
    const msg = INVALID_MESSAGES[invite.state] ?? INVALID_MESSAGES.invalid
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link to="/" className={styles.brand}>
              <img className={styles.logoImg} src="/assets/logos/parkday-icon.svg" alt="Parkday" />
              <span className={styles.wordmark}>Parkday</span>
            </Link>
          </div>
        </header>
        <div className={styles.layout}>
          <div className={styles.card}>
            <h1 className={styles.headline}>{msg.headline}</h1>
            <p className={styles.subhead}>{msg.body}</p>
            <p className={styles.toggle}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <img className={styles.logoImg} src="/assets/logos/parkday-icon.svg" alt="Parkday" />
            <span className={styles.wordmark}>Parkday</span>
          </Link>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.card}>
          <h1 className={styles.headline}>{invite.ownerName} has invited you to collaborate</h1>
          <p className={styles.subhead}>
            You'll be able to view and edit all of their trips. You won't need a paid subscription.
          </p>

          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={googleLoading || loading || accepting}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className={styles.divider}><span>or</span></div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {mode === 'signup' && (
              <div className={styles.field}>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {notice && <p className={styles.notice}>{notice}</p>}

            <button type="submit" className={styles.submit} disabled={loading || accepting}>
              {accepting ? 'Joining…' : loading ? 'Please wait…' : mode === 'signup' ? 'Create an account' : 'Sign in'}
            </button>
          </form>

          <p className={styles.toggle}>
            {mode === 'login' ? (
              <>New here? <button onClick={() => { setMode('signup'); setError(null); setNotice(null) }}>Create an account</button></>
            ) : (
              <>Already have an account? <button onClick={() => { setMode('login'); setError(null); setNotice(null) }}>Sign in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
