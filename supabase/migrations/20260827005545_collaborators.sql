-- Collaborator access: one free seat per paid account. The collaborator's
-- own profile row points back at the owner via collaborator_of, and gets
-- full edit access to the owner's trips/expenses/wish_list_items/
-- gift_cards/payments through the RLS policies below. Granting collaborator
-- status only ever happens server-side (accept-collaborator-invite Edge
-- Function, using the service role) — there is deliberately no RLS policy
-- that lets a user set their own account_type/collaborator_of.

alter table profiles
  add column if not exists account_type text default 'owner' check (account_type in ('owner', 'collaborator')),
  add column if not exists collaborator_of uuid references profiles(id);

-- A profile can only be claimed as a collaborator by one other profile —
-- the "one collaborator per owner" limit, enforced in the DB as well as at
-- the Edge Function and UI layers.
create unique index if not exists one_collaborator_per_owner
  on profiles (collaborator_of) where collaborator_of is not null;

create table if not exists collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) not null,
  invited_email text not null,
  token uuid default gen_random_uuid() unique not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz default now(),
  accepted_at timestamptz
);

-- Only one pending invite per owner at a time.
create unique index if not exists one_pending_invite_per_owner
  on collaborator_invites (owner_id) where status = 'pending';

alter table collaborator_invites enable row level security;

-- Owner can see their own invites (for the pending/active UI in Account
-- Settings). No insert/update/delete policy for regular users — invite
-- creation and acceptance both go through Edge Functions using the
-- service role, which bypasses RLS entirely.
drop policy if exists "Owner manages own invites" on collaborator_invites;
create policy "Owner manages own invites"
  on collaborator_invites for select
  using (auth.uid() = owner_id);

drop policy if exists "Service role bypass on collaborator_invites" on collaborator_invites;
create policy "Service role bypass on collaborator_invites"
  on collaborator_invites for all
  to service_role
  using (true)
  with check (true);

-- ── RLS: collaborator access to owner's trip data ───────────────────
-- trips: collaborators can view and edit trip settings, but not create or
-- delete trips (owner-only).
drop policy if exists "Users manage their own trips" on trips;

drop policy if exists "Users and collaborators can view trips" on trips;
create policy "Users and collaborators can view trips"
  on trips for select
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = trips.user_id)
  );

drop policy if exists "Owner can insert trips" on trips;
create policy "Owner can insert trips"
  on trips for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users and collaborators can update trips" on trips;
create policy "Users and collaborators can update trips"
  on trips for update
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = trips.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = trips.user_id)
  );

drop policy if exists "Owner can delete trips" on trips;
create policy "Owner can delete trips"
  on trips for delete
  using (auth.uid() = user_id);

-- expenses / wish_list_items / gift_cards / payments: collaborators get
-- full CRUD, same as the owner.
drop policy if exists "Users manage their own expenses" on expenses;
drop policy if exists "Users and collaborators manage expenses" on expenses;
create policy "Users and collaborators manage expenses"
  on expenses for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = expenses.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = expenses.user_id)
  );

drop policy if exists "Users manage own wish list" on wish_list_items;
drop policy if exists "Users and collaborators manage wish list" on wish_list_items;
create policy "Users and collaborators manage wish list"
  on wish_list_items for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = wish_list_items.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = wish_list_items.user_id)
  );

drop policy if exists "Users manage own gift cards" on gift_cards;
drop policy if exists "Users and collaborators manage gift cards" on gift_cards;
create policy "Users and collaborators manage gift cards"
  on gift_cards for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = gift_cards.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = gift_cards.user_id)
  );

-- reward_programs isn't in the brief's explicit table list, but it's the
-- other half of the "gift cards & rewards" feature the brief does name
-- (Trip Funds) — leaving it owner-only would silently break that page for
-- collaborators, so it gets the same treatment as gift_cards.
drop policy if exists "Users manage own reward programs" on reward_programs;
drop policy if exists "Users and collaborators manage reward programs" on reward_programs;
create policy "Users and collaborators manage reward programs"
  on reward_programs for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = reward_programs.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = reward_programs.user_id)
  );

drop policy if exists "Users manage own payments" on payments;
drop policy if exists "Users and collaborators manage payments" on payments;
create policy "Users and collaborators manage payments"
  on payments for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = payments.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = payments.user_id)
  );
