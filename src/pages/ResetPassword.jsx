import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updatePassword, isPasswordRecovery, onPasswordRecovery, signOut, friendlyAuthError } from '../lib/auth'
import styles from './Auth.module.css'

// Supabase completes the recovery token exchange itself and fires
// PASSWORD_RECOVERY once a recovery session is live — that's the signal to
// show the new-password form. If it never fires (direct navigation, an
// already-used or expired link), fall back to the invalid-link state.
const RECOVERY_TIMEOUT_MS = 3000

export default function ResetPassword() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // 'checking' | 'ready' | 'invalid' | 'done'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // The event can fire before this page even mounts, so check for that
    // first — lib/auth.js subscribes at import time (from the top of
    // App.jsx) specifically so this doesn't get missed.
    if (isPasswordRecovery()) {
      setStatus('ready')
      return
    }
    const unsubscribe = onPasswordRecovery(() => setStatus('ready'))
    const timer = setTimeout(() => {
      setStatus(s => (s === 'checking' ? 'invalid' : s))
    }, RECOVERY_TIMEOUT_MS)
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)

    if (error) {
      setError(friendlyAuthError(error))
      return
    }

    setStatus('done')
    setTimeout(goToLogin, 2000)
  }

  // The recovery link leaves the browser holding a live, authenticated
  // session — navigating straight to /login without clearing it first runs
  // into that route's own session-based redirect logic (to dashboard or
  // paywall) instead of showing the login form. Signing out first makes
  // landing on /login deterministic.
  async function goToLogin() {
    await signOut()
    navigate('/login', { replace: true })
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
          {status === 'checking' && (
            <>
              <div className={styles.cardHeader}>
                <h1 className={styles.headline}>Verifying your link…</h1>
                <p className={styles.subhead}>One moment please.</p>
              </div>
            </>
          )}

          {status === 'invalid' && (
            <>
              <div className={styles.cardHeader}>
                <h1 className={styles.headline}>Link expired</h1>
                <p className={styles.subhead}>This link is invalid or has expired. Request a new one.</p>
              </div>
              <p className={styles.toggle}>
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          )}

          {status === 'ready' && (
            <>
              <div className={styles.cardHeader}>
                <h1 className={styles.headline}>Choose a new password</h1>
                <p className={styles.subhead}>Enter a new password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="newPassword">New password</label>
                  <div className={styles.passwordField}>
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i aria-hidden="true" className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} />
                    </button>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="confirmPassword">Confirm new password</label>
                  <div className={styles.passwordField}>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <button type="submit" className={styles.submit} disabled={loading}>
                  {loading ? 'Please wait…' : 'Update password'}
                </button>
              </form>
            </>
          )}

          {status === 'done' && (
            <>
              <div className={styles.cardHeader}>
                <h1 className={styles.headline}>Password updated</h1>
                <p className={styles.subhead}>Your password has been updated.</p>
              </div>
              <p className={styles.toggle}>
                <button type="button" onClick={goToLogin}>Sign in</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
