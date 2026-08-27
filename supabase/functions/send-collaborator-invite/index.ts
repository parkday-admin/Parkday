import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = 'https://parkday-nu.vercel.app'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Placeholder inline HTML — a future brief covers a proper React Email +
// Resend template suite (collaborator invite, post-trip review, payment
// confirmation). When that lands, swap this for the template id.
function inviteEmailHtml(ownerName: string, acceptUrl: string) {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0d2340;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Parkday</h1>
      <p style="font-size: 15px; line-height: 1.5;">
        ${ownerName} is planning a Disney World trip and wants you to help plan it.
        Create a free Parkday account to view and edit the plan together.
      </p>
      <p style="margin: 28px 0;">
        <a href="${acceptUrl}" style="background: #2a6fe0; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
          Accept invite
        </a>
      </p>
      <p style="font-size: 12.5px; color: #6b7280;">This invite link expires in 7 days.</p>
    </div>
  `
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (userError || !user) throw new Error('Invalid session')

    const { email, resend } = await req.json()

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, subscription_status')
      .eq('id', user.id)
      .single()
    if (ownerError || !owner) throw new Error('Could not load your account.')

    if (owner.subscription_status !== 'active') {
      throw new Error('Your Parkday subscription needs to be active to invite a collaborator.')
    }

    const { data: existingCollaborator } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('collaborator_of', user.id)
      .maybeSingle()
    if (existingCollaborator) {
      throw new Error('You already have a collaborator. Remove them before inviting someone new.')
    }

    const { data: pendingInvite } = await supabaseAdmin
      .from('collaborator_invites')
      .select('id, token, invited_email')
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    let invite: { token: string } | null = null
    let inviteEmail: string

    if (resend) {
      if (!pendingInvite) throw new Error('No pending invite to resend.')
      invite = pendingInvite
      inviteEmail = pendingInvite.invited_email
    } else {
      if (pendingInvite) {
        throw new Error('You already have a pending invite. Cancel it before sending a new one.')
      }
      if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
        throw new Error('Please enter a valid email address.')
      }
      inviteEmail = email
      const { data: created, error: insertError } = await supabaseAdmin
        .from('collaborator_invites')
        .insert({ owner_id: user.id, invited_email: email })
        .select('token')
        .single()
      if (insertError || !created) throw new Error(insertError?.message ?? 'Could not create invite.')
      invite = created
    }

    const ownerName = owner.full_name || owner.email || 'Someone'
    const acceptUrl = `${APP_URL}/invite/${invite.token}`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Parkday <noreply@mail.planyourparkday.com>',
        to: inviteEmail,
        subject: `${ownerName} invited you to their Parkday trip plan`,
        html: inviteEmailHtml(ownerName, acceptUrl),
      }),
    })

    if (!resendRes.ok) {
      const body = await resendRes.text()
      // The invite record already exists — surface the mail failure but
      // don't roll it back, since "Resend invite" can retry the send.
      throw new Error(`Invite created, but the email failed to send: ${body}`)
    }

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
