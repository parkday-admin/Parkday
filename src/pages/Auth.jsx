import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn, signUp, signInWithGoogle } from '../lib/auth'
import styles from './Auth.module.css'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function readSavedEstimate() {
  try {
    return JSON.parse(localStorage.getItem('pkd_estimate') ?? 'null')
  } catch {
    return null
  }
}

export default function Auth() {
  const [estimate] = useState(readSavedEstimate)
  const [mode, setMode] = useState(estimate ? 'signup' : 'login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        setNotice('Check your email to confirm your account.')
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      // on success, App's onAuthStateChange fires and redirects
    }

    setLoading(false)
  }

  async function handleGoogle() {
    setError(null)
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // on success the page redirects — no need to reset loading
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
          <h1 className={styles.headline}>
            {mode === 'signup' ? 'Create your account' : 'Sign in to plan your park day'}
          </h1>
          <p className={styles.subhead}>
            {mode === 'signup' ? 'Start planning your park day.' : 'Welcome back.'}
          </p>

          {estimate && (
            <div className={styles.estimateChip}>
              <i className="ti ti-ticket" />
              <div className={styles.estimateChipText}>
                Your estimate is saved — <strong>
                  {estimate.adults} adult{estimate.adults !== 1 ? 's' : ''}
                  {estimate.children > 0 ? ` + ${estimate.children} kids` : ''}, {estimate.nights === 0 ? 'day trip' : `${estimate.nights} nights`}
                </strong>
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className={styles.divider}><span>or</span></div>

          <form onSubmit={handleSubmit} className={styles.form}>
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

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className={styles.toggle}>
            {mode === 'login' ? (
              <>New to Parkday? <button onClick={() => { setMode('signup'); setError(null); setNotice(null) }}>Create an account</button></>
            ) : (
              <>Already have an account? <button onClick={() => { setMode('login'); setError(null); setNotice(null) }}>Sign in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
