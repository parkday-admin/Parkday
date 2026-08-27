import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Collaborators have no RLS read access to the owner's profile row (that
// would also expose stripe_customer_id, plan_type, etc.) — this narrowly
// returns just the two fields the app needs to route a collaborator
// correctly: whether the owner they're linked to is active, and their name
// for the paused-state message.
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('collaborator_of')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) throw new Error('Could not load your account.')

    if (!profile.collaborator_of) {
      return new Response(JSON.stringify({ isCollaborator: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, subscription_status')
      .eq('id', profile.collaborator_of)
      .single()
    if (ownerError || !owner) throw new Error('Could not load the owner account.')

    return new Response(JSON.stringify({
      isCollaborator: true,
      ownerName: owner.full_name || owner.email || 'The account owner',
      ownerActive: owner.subscription_status === 'active',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
