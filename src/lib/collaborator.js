import { supabase } from '../supabase'

// supabase-js's error.message on a functions.invoke() failure is a generic
// "non-2xx status code" string — the function's real {error} body is only
// available on error.context. Mirrors deleteAccount() in lib/profile.js.
async function unwrapFunctionError(error) {
  const body = await error.context?.json?.().catch(() => null)
  return body?.error ?? error.message
}

export async function sendCollaboratorInvite(email) {
  const { data, error } = await supabase.functions.invoke('send-collaborator-invite', { body: { email } })
  if (error) return { data, error: { message: await unwrapFunctionError(error) } }
  return { data, error }
}

export async function resendCollaboratorInvite() {
  const { data, error } = await supabase.functions.invoke('send-collaborator-invite', { body: { resend: true } })
  if (error) return { data, error: { message: await unwrapFunctionError(error) } }
  return { data, error }
}

export async function cancelCollaboratorInvite(inviteId) {
  const { error } = await supabase.from('collaborator_invites').delete().eq('id', inviteId)
  return { error }
}

export async function fetchCollaboratorInvite(ownerId) {
  const { data, error } = await supabase
    .from('collaborator_invites')
    .select('id, invited_email, status, created_at')
    .eq('owner_id', ownerId)
    .eq('status', 'pending')
    .maybeSingle()
  return { data, error }
}

export async function fetchCollaborator(ownerId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('collaborator_of', ownerId)
    .maybeSingle()
  return { data, error }
}

export async function removeCollaborator(collaboratorId) {
  const { error } = await supabase
    .from('profiles')
    .update({ account_type: 'owner', collaborator_of: null })
    .eq('id', collaboratorId)
  return { error }
}

export async function leaveCollaboratorAccount(collaboratorId) {
  const { error } = await supabase
    .from('profiles')
    .update({ account_type: 'owner', collaborator_of: null })
    .eq('id', collaboratorId)
  return { error }
}

// Preview an invite's state before the visitor has authenticated — the
// `preview: true` flag (not the presence/absence of an auth header, which
// Supabase's function gateway requires regardless) tells the Edge Function
// to do a read-only lookup instead of trying to accept.
export async function previewInvite(token) {
  const { data, error } = await supabase.functions.invoke('accept-collaborator-invite', {
    body: { token, preview: true },
  })
  if (error) return { data: null, error: { message: await unwrapFunctionError(error) } }
  return { data, error: null }
}

// Called once the visitor has an authenticated session (just signed up or
// signed in on the invite page) — the Edge Function sees the Authorization
// header supabase-js attaches automatically and actually accepts.
export async function acceptInvite(token) {
  const { data, error } = await supabase.functions.invoke('accept-collaborator-invite', { body: { token } })
  if (error) return { data: null, error: { message: await unwrapFunctionError(error) } }
  return { data, error: null }
}

export async function getCollaboratorStatus() {
  const { data, error } = await supabase.functions.invoke('get-collaborator-status')
  if (error) return { data: null, error: { message: await unwrapFunctionError(error) } }
  return { data, error: null }
}
