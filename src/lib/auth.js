import { supabase } from '../supabase'

// Supabase fires PASSWORD_RECOVERY as soon as it finishes processing the
// token in the URL — which can happen before the reset-password page has
// even mounted (React can't render any route until App's own session
// listener below resolves once, and that first onAuthStateChange callback
// is often the recovery event itself). A listener registered only once
// ResetPassword mounts can miss it entirely. Subscribing here instead runs
// as soon as this module is first imported (from the very top of App.jsx),
// so it's in place before Supabase has any chance to process the URL.
let recoveryEventFired = false
const recoveryListeners = new Set()

supabase.auth.onAuthStateChange(event => {
  if (event !== 'PASSWORD_RECOVERY') return
  recoveryEventFired = true
  recoveryListeners.forEach(fn => fn())
})

export function isPasswordRecovery() {
  return recoveryEventFired
}

// Registers a callback for when PASSWORD_RECOVERY fires — call
// isPasswordRecovery() first in case it already happened before this was
// called. Returns an unsubscribe function.
export function onPasswordRecovery(callback) {
  recoveryListeners.add(callback)
  return () => recoveryListeners.delete(callback)
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return { data, error }
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { error }
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  return { data, error }
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => subscription.unsubscribe()
}
