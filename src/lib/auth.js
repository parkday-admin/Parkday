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

// Supabase's SIGNED_IN event does not mean "the user just interactively
// signed in" — it also fires from _recoverAndRefresh() on every plain page
// load whenever a valid session already exists in storage. Treating every
// SIGNED_IN as fresh caused an infinite reload loop: useRedirectAfterSignIn
// (App.jsx) does a real window.location.replace after a fresh sign-in, and
// that reload's own client init re-recovers the same session from storage,
// fires SIGNED_IN again, and triggers another replace, forever.
//
// sessionStorage (not component state) survives the reload — and the
// out-and-back trip through Google for OAuth — so the flag set right
// before an actual sign-in action here is still there when the resulting
// SIGNED_IN event fires, but is absent on an ordinary page load.
const EXPECT_SIGN_IN_KEY = 'pkd_expect_sign_in'

function markExpectingSignIn() {
  try {
    sessionStorage.setItem(EXPECT_SIGN_IN_KEY, '1')
  } catch {
    // sessionStorage unavailable (e.g. privacy mode) — the caller's
    // SIGNED_IN event just won't be treated as fresh; not worth failing
    // the sign-in action over.
  }
}

function consumeExpectingSignIn() {
  try {
    if (sessionStorage.getItem(EXPECT_SIGN_IN_KEY) !== '1') return false
    sessionStorage.removeItem(EXPECT_SIGN_IN_KEY)
    return true
  } catch {
    return false
  }
}

// Supabase's error.message is written for a developer console, not a
// parent anxious about their trip budget account — map the ones we
// actually see to Parkday's own voice, with a warm fallback for anything
// unmapped rather than ever showing raw backend text.
const AUTH_ERROR_MATCHERS = [
  [/invalid login credentials/i, "That email and password don't match — try again, or reset your password below."],
  [/email not confirmed/i, "Almost there — check your email and confirm your address before signing in."],
  [/user already registered/i, 'An account with that email already exists — sign in instead, or reset your password if you forgot it.'],
  [/rate limit/i, "That's a lot of tries — give it a minute and try again."],
  [/password should be at least/i, 'Passwords need at least 6 characters.'],
  [/network|fetch/i, "Couldn't reach Parkday — check your connection and try again."],
]

export function friendlyAuthError(error) {
  if (!error) return null
  const message = error.message || ''
  for (const [pattern, friendly] of AUTH_ERROR_MATCHERS) {
    if (pattern.test(message)) return friendly
  }
  return "Something went wrong on our end — give it another try in a moment."
}

export async function signUp(email, password) {
  markExpectingSignIn()
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export async function signIn(email, password) {
  markExpectingSignIn()
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
  markExpectingSignIn()
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

// callback receives (session, event, isFreshSignIn) — isFreshSignIn is
// only true for a SIGNED_IN event that followed an actual call to signIn/
// signUp/signInWithGoogle above, not one Supabase fired on its own while
// recovering an existing session from storage. See markExpectingSignIn.
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    const isFreshSignIn = event === 'SIGNED_IN' && consumeExpectingSignIn()
    callback(session, event, isFreshSignIn)
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
