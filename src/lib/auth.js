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

// Supabase persists sessions in localStorage, which is scoped per-origin —
// app.planyourparkday.com can't see a session that was established on
// planyourparkday.com. So signing out anywhere sends the user back to the
// marketing domain rather than leaving them stranded on the app subdomain
// showing a login form under a URL that looks like they're still "in the
// app".
export async function signOutAndRedirect() {
  await signOut()
  const onAppSubdomain = window.location.hostname === 'app.planyourparkday.com'
  const onLocalhost = window.location.hostname === 'localhost'
  window.location.href = onAppSubdomain && !onLocalhost ? 'https://planyourparkday.com/login' : '/login'
}

const HANDOFF_HASH_KEY = 'pkd_session'

// See signOutAndRedirect's comment on why localStorage doesn't cross
// subdomains — the same gap breaks the other direction: a session
// established on planyourparkday.com (marketing) doesn't exist yet on
// app.planyourparkday.com after the post-login redirect. This hands the
// live tokens across in the URL fragment (never sent to a server, unlike a
// query string) so the app subdomain can adopt the same session instead of
// showing a login form the user just got past.
export function buildSessionHandoffHash(session) {
  if (!session?.access_token || !session?.refresh_token) return ''
  const payload = encodeURIComponent(JSON.stringify({
    at: session.access_token,
    rt: session.refresh_token,
  }))
  return `#${HANDOFF_HASH_KEY}=${payload}`
}

// Call once on mount. Strips the handoff hash from the URL either way, so
// the tokens never linger in the address bar or browser history.
export async function adoptSessionFromHandoff() {
  const prefix = `#${HANDOFF_HASH_KEY}=`
  if (!window.location.hash.startsWith(prefix)) return false

  const raw = window.location.hash.slice(prefix.length)
  window.history.replaceState(null, '', window.location.pathname + window.location.search)

  try {
    const { at, rt } = JSON.parse(decodeURIComponent(raw))
    if (!at || !rt) return false
    const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt })
    return !error
  } catch {
    return false
  }
}

// Google OAuth always comes back through app.planyourparkday.com, the one
// domain actually registered in Supabase's redirect-URL allow list — using
// window.location.origin here would send Supabase a redirect_to of
// planyourparkday.com (or wherever the button was clicked from) whenever
// that's not the app subdomain, which Supabase rejects before ever
// reaching Google: the browser sits on "Redirecting…" through a real round
// trip to Supabase's auth server, then bounces back with no session.
function canonicalOAuthRedirect() {
  return window.location.hostname === 'localhost' ? window.location.origin : 'https://app.planyourparkday.com'
}

// Popup-based OAuth was tried here for installed Android apps (to avoid
// the browser-chrome-persisting issue useRedirectAfterSignIn's comment in
// App.jsx describes) and reverted — window.open doesn't reliably produce a
// usable popup from an installed Android WebAPK, regardless of timing, so
// it just broke sign-in outright instead of leaving a cosmetic issue. Back
// to a plain full-page redirect, which does work end to end.
export async function signInWithGoogle(redirectTo = canonicalOAuthRedirect()) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
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
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session, event)
  })
  return () => subscription.unsubscribe()
}

// A standalone (home-screen-installed) iOS app that navigates to a
// different origin — like Google's sign-in page — gets that shown in a
// separate in-app browser overlay rather than in the installed app's own
// window. iOS does share storage between the two for the same site, so
// completing sign-in there does persist a session, but the installed app's
// screen was already loaded before that happened and has no way to learn
// about it — it just sits on whatever it was showing (e.g. "Redirecting…")
// until something tells it to look again. Call this when the app regains
// focus/visibility to re-check storage for a session that appeared while
// it was in the background.
export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
