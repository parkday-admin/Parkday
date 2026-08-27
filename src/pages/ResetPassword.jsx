import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updatePassword, isPasswordRecovery, onPasswordRecovery } from '../lib/auth'
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
      setError(error.message || 'Something went wrong. Please try again.')
      return
    }

    setStatus('done')
    setTimeout(() => navigate('/login'), 2000)
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
              <h1 className={styles.headline}>Verifying your link…</h1>
              <p className={styles.subhead}>One moment please.</p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <h1 className={styles.headline}>Link expired</h1>
              <p className={styles.subhead}>This link is invalid or has expired. Request a new one.</p>
              <p className={styles.toggle}>
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          )}

          {status === 'ready' && (
            <>
              <h1 className={styles.headline}>Choose a new password</h1>
              <p className={styles.subhead}>Enter a new password for your account.</p>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="newPassword">New password</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="confirmPassword">Confirm new password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" className={styles.submit} disabled={loading}>
                  {loading ? 'Please wait…' : 'Update password'}
                </button>
              </form>
            </>
          )}

          {status === 'done' && (
            <>
              <h1 className={styles.headline}>Password updated</h1>
              <p className={styles.subhead}>Your password has been updated.</p>
              <p className={styles.toggle}>
                <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
