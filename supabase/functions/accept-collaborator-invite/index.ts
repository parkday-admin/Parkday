import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const INVITE_EXPIRY_DAYS = 7

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Shared by both the unauthenticated preview call (before the visitor has
// an account to sign in with) and the authenticated accept call — same
// four states either way: not found/revoked, already accepted, expired,
// or valid.
async function loadInvite(token: string) {
  const { data: invite } = await supabaseAdmin
    .from('collaborator_invites')
    .select('id, owner_id, status, created_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite || invite.status === 'revoked') {
    return { state: 'invalid' as const }
  }
  if (invite.status === 'accepted') {
    return { state: 'used' as const }
  }
  const ageMs = Date.now() - new Date(invite.created_at).getTime()
  if (ageMs > INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
    return { state: 'expired' as const }
  }

  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('id', invite.owner_id)
    .single()

  return { state: 'valid' as const, invite, ownerName: owner?.full_name || owner?.email || 'Someone' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, preview } = await req.json()
    if (!token) throw new Error('Missing invite token.')

    // The invite-preview screen calls this before the visitor has
    // authenticated. supabase-js still attaches *some* Authorization header
    // on every call (the anon key when there's no session), and Supabase's
    // function gateway itself rejects requests with none at all — so
    // "preview vs. accept" has to be an explicit flag from the client, not
    // inferred from whether an Authorization header is present.
    if (preview) {
      const result = await loadInvite(token)
      if (result.state !== 'valid') {
        return new Response(JSON.stringify({ state: result.state }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ state: 'valid', ownerName: result.ownerName }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Accepting — the visitor just signed up or signed in, so this call
    // carries their real session token.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (userError || !user) throw new Error('Invalid session')

    const result = await loadInvite(token)
    if (result.state === 'invalid') throw new Error('This invite link is invalid.')
    if (result.state === 'used') throw new Error('This invite has already been used.')
    if (result.state === 'expired') throw new Error('This invite has expired. Ask the owner to resend it.')

    const { data: accepting, error: acceptingError } = await supabaseAdmin
      .from('profiles')
      .select('account_type, subscription_status, collaborator_of')
      .eq('id', user.id)
      .single()
    if (acceptingError || !accepting) throw new Error('Could not load your account.')

    if (accepting.account_type === 'owner' && accepting.subscription_status === 'active') {
      throw new Error('You already have a Parkday account with your own trips. Collaborator access cannot be added to an existing paid account. Contact support if you need help.')
    }
    if (accepting.collaborator_of) {
      throw new Error('This account is already linked to another Parkday account. Contact support if you need help.')
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ account_type: 'collaborator', collaborator_of: result.invite.owner_id })
      .eq('id', user.id)
    if (updateProfileError) throw updateProfileError

    const { error: updateInviteError } = await supabaseAdmin
      .from('collaborator_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', result.invite.id)
    if (updateInviteError) throw updateInviteError

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
