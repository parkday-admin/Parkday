-- Parkday schema for the new Supabase project (wkoriwuclemvxseltynv)
-- Run this in the Supabase SQL editor.

-- ── Tables ──────────────────────────────────────────────────────────

create table profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  timezone text default 'America/New_York',
  stripe_customer_id text,
  subscription_status text check (subscription_status in ('active', 'inactive', 'trialing')),
  plan_type text check (plan_type in ('trip_pass', 'plus_pass')),
  -- Set when a Plus Pass subscription is cancelled, to the date their
  -- already-paid-for period actually ends (see stripe-webhook's
  -- customer.subscription.deleted handler). Cleared on a fresh purchase or
  -- successful renewal. expire_cancelled_plus_passes() is what enforces it.
  access_until timestamptz,
  notif_deadlines boolean default true,
  notif_checkin boolean default true,
  notif_budget boolean default false,
  notif_marketing boolean default false,
  created_at timestamptz default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text,
  status text check (status in ('active', 'archived', 'deleted')) default 'active',
  arrival_date date,
  departure_date date,
  adults int,
  children int,
  accommodation text,
  booking_type text,
  ticket_type text,
  lightning_lane text,
  travel_mode text,
  transfer text,
  departure_transfer text,
  parking text,
  park_transport text,
  arr_airline text,
  arr_flight text,
  dep_airline text,
  dep_flight text,
  memory_maker boolean default false,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  trip_id uuid references trips(id),
  day int,
  cat text,
  label text,
  time text,
  status text,
  ll_type text,
  planned_amt numeric,
  actual_amt numeric,
  is_budget boolean default false,
  created_at timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────────────
-- Note: profiles.id IS the user id (it references auth.users directly),
-- so its policies check auth.uid() = id, not auth.uid() = user_id.

alter table profiles enable row level security;
alter table trips enable row level security;
alter table expenses enable row level security;

create policy "Users manage their own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users manage their own trips"
  on trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own expenses"
  on expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The service_role key already bypasses RLS by default in Supabase, but
-- explicit bypass policies are added here for clarity/future admin tooling.

create policy "Service role bypass on profiles"
  on profiles for all
  to service_role
  using (true)
  with check (true);

create policy "Service role bypass on trips"
  on trips for all
  to service_role
  using (true)
  with check (true);

create policy "Service role bypass on expenses"
  on expenses for all
  to service_role
  using (true)
  with check (true);

-- ── Auto-create a profile row on first sign-in ──────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Migration: getting-there fields on trips ────────────────────────
-- Run this against an existing database that was created before these
-- columns were added to the trips table above.
alter table trips
  add column if not exists transfer text,
  add column if not exists departure_transfer text,
  add column if not exists parking text,
  add column if not exists park_transport text;

-- ── Migration: flight details + Memory Maker on trips ───────────────
alter table trips
  add column if not exists arr_airline text,
  add column if not exists arr_flight text,
  add column if not exists dep_airline text,
  add column if not exists dep_flight text,
  add column if not exists memory_maker boolean default false;

-- ── Migration: explicit budget-row flag on expenses ─────────────────
-- Previously the "budget target" row for a category was inferred from
-- day/label being null, which a real expense entry could coincidentally
-- match. This flags it explicitly instead. The backfill marks existing
-- rows that match the old inference rule, so current data keeps working.
alter table expenses
  add column if not exists is_budget boolean default false;

update expenses
set is_budget = true
where day is null
  and cat in ('dining', 'snacks', 'experience', 'll', 'souvenirs', 'transport', 'misc');

update expenses
set is_budget = true
where day is null
  and label is null
  and cat in ('resort', 'tickets', 'travel', 'package');

-- ── Migration: account settings fields on profiles ──────────────────
alter table profiles
  add column if not exists full_name text,
  add column if not exists timezone text default 'America/New_York',
  add column if not exists notif_deadlines boolean default true,
  add column if not exists notif_checkin boolean default true,
  add column if not exists notif_budget boolean default false,
  add column if not exists notif_marketing boolean default false;

-- ── Migration: family members ────────────────────────────────────────
-- Account-level (not trip-specific) — reused across every trip a user
-- plans. annual_pass_tier/annual_pass_expiry are schema-only for now;
-- no UI reads or writes them yet.
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  birthdate date,
  annual_pass boolean default false,
  annual_pass_tier text check (annual_pass_tier in ('incredi-pass','sorcerer','pirate','pixie-dust')),
  annual_pass_expiry date,
  created_at timestamptz default now()
);

alter table family_members enable row level security;

drop policy if exists "Users manage own family members" on family_members;
create policy "Users manage own family members"
  on family_members for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Migration: wish list ─────────────────────────────────────────────
-- catalog_items is a static-ish, admin-maintained catalog; wish_list_items
-- is the user's personal list, scoped per trip. Seed data for
-- catalog_items lives in supabase/migrations/20260826000330_wishlist.sql
-- (not duplicated here — see that file for the full catalog insert).
create table if not exists catalog_items (
  id text primary key,
  name text not null,
  park text,
  category text not null,
  description text,
  price_label text,
  price_mid numeric default 0,
  active boolean default true
);

create table if not exists wish_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  catalog_id text references catalog_items(id),
  name text not null,
  park text,
  category text not null,
  price_label text,
  price_mid numeric default 0,
  notes text,
  custom boolean default false,
  planned_expense_id uuid references expenses(id),
  planned_day int,
  created_at timestamptz default now()
);

alter table catalog_items enable row level security;
alter table wish_list_items enable row level security;

drop policy if exists "Anyone can read the catalog" on catalog_items;
create policy "Anyone can read the catalog"
  on catalog_items for select
  to authenticated
  using (true);

drop policy if exists "Users manage own wish list" on wish_list_items;
create policy "Users manage own wish list"
  on wish_list_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Migration: unlink wish list items when their expense is deleted ──
-- Deleting an expense linked to a wish list item (e.g. from the Itinerary
-- page, not just the wish list's own "Remove" button) must not be blocked
-- by planned_expense_id's foreign key — it should just unlink the item,
-- leaving it saved but un-planned.
create or replace function wish_list_clear_planned_expense()
returns trigger
language plpgsql
as $$
begin
  update wish_list_items
  set planned_expense_id = null, planned_day = null
  where planned_expense_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_wish_list_clear_planned_expense on expenses;
create trigger trg_wish_list_clear_planned_expense
  before delete on expenses
  for each row execute function wish_list_clear_planned_expense();

-- ── Migration: Trip Funds (gift cards & rewards) ─────────────────────
-- Full detail (comments on each function) lives in
-- supabase/migrations/20260826154056_trip_funds.sql — kept in sync here
-- for reference only; the migrations directory is the source of truth.
create table if not exists gift_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  source text not null,
  original_amount numeric not null default 0,
  balance numeric not null default 0,
  last4 text,
  date_added date default current_date,
  depleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists reward_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  type text not null check (type in ('visa', 'insiders', 'travel', 'other')),
  program text not null,
  detail text,
  value numeric not null default 0,
  -- Fixed at creation, never touched by the payment-source-sync trigger
  -- below — mirrors gift_cards.original_amount so "$X original" can still
  -- be shown once value has been spent down.
  original_value numeric not null default 0,
  created_at timestamptz default now()
);

alter table gift_cards enable row level security;
alter table reward_programs enable row level security;

drop policy if exists "Users manage own gift cards" on gift_cards;
create policy "Users manage own gift cards"
  on gift_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own reward programs" on reward_programs;
create policy "Users manage own reward programs"
  on reward_programs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table trips add column if not exists gc_savings_goal numeric default 0;
alter table expenses add column if not exists payment_source text;

-- Unlinks expenses from a card/reward that gets deleted, and auto-deducts
-- or restores gift card balance / reward value as expenses log, change, or
-- remove an actual_amt against a "gift:<uuid>" / "reward:<uuid>" payment
-- source. See the migration file for the full function bodies.

-- ── Migration: Payments (Vacation Package installment plan) ─────────
-- Full detail lives in supabase/migrations/20260826161014_payments.sql —
-- kept in sync here for reference only.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  amount numeric not null,
  date date not null default current_date,
  method text,
  payment_source text,
  note text,
  created_at timestamptz default now()
);

alter table payments enable row level security;

drop policy if exists "Users manage own payments" on payments;
create policy "Users manage own payments"
  on payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table trips add column if not exists final_payment_date date;

-- Auto-deducts/restores gift card & reward balances as payments log, change,
-- or are removed; keeps the package expense's actual_amt equal to total
-- paid; and extends the gift/reward delete-cleanup triggers to also unlink
-- payments. See the migration file for the full function bodies.

-- One-time backfill: trips saved before this feature existed have no
-- final_payment_date. See supabase/migrations/20260826161450_backfill_final_payment_date.sql
update trips
set final_payment_date = arrival_date - 30
where final_payment_date is null and arrival_date is not null;

-- ── Migration: Packing list ──────────────────────────────────────────
create table if not exists packing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  family_member_id uuid references family_members(id) on delete set null,
  category text not null,
  text text not null,
  checked boolean default false,
  custom boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table packing_items enable row level security;

drop policy if exists "Users manage own packing items" on packing_items;
create policy "Users manage own packing items"
  on packing_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Migration: Reminders ─────────────────────────────────────────────
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  description text,
  reminder_date date,
  icon text default 'ti-bell',
  color text default 'var(--sky)',
  bg text default 'rgba(42,111,224,0.12)',
  done boolean default false,
  system boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table reminders enable row level security;

drop policy if exists "Users manage own reminders" on reminders;
create policy "Users manage own reminders"
  on reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Migration: Collaborator access ──────────────────────────────────
-- Full detail lives in supabase/migrations/20260827005545_collaborators.sql
-- — kept in sync here for reference only.
alter table profiles
  add column if not exists account_type text default 'owner' check (account_type in ('owner', 'collaborator')),
  add column if not exists collaborator_of uuid references profiles(id);

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

create unique index if not exists one_pending_invite_per_owner
  on collaborator_invites (owner_id) where status = 'pending';

alter table collaborator_invites enable row level security;

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

-- trips, expenses, wish_list_items, gift_cards, reward_programs, and
-- payments RLS were all updated to additionally allow access when the
-- caller is a collaborator on the row's owner (a profiles row with
-- collaborator_of = that owner's id) — see the migration file for the
-- full per-table policy definitions (trips: select+update only, all
-- others: full CRUD).

-- ── Migration: collaborator invite cancellation ─────────────────────
-- Full detail lives in
-- supabase/migrations/20260827010500_collaborator_invite_cancel.sql
drop policy if exists "Owner can cancel own pending invite" on collaborator_invites;
create policy "Owner can cancel own pending invite"
  on collaborator_invites for delete
  using (auth.uid() = owner_id and status = 'pending');

-- ── Migration: collaborator visibility fixes ────────────────────────
-- Full detail lives in
-- supabase/migrations/20260827020000_collaborator_visibility_fixes.sql
drop policy if exists "Owner can view their collaborator's profile" on profiles;
create policy "Owner can view their collaborator's profile"
  on profiles for select
  using (collaborator_of = auth.uid());

drop policy if exists "Users manage own family members" on family_members;
drop policy if exists "Users and collaborators manage family members" on family_members;
create policy "Users and collaborators manage family members"
  on family_members for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = family_members.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = family_members.user_id)
  );

-- ── Migration: collaborator access to packing_items & reminders ────
-- Full detail lives in
-- supabase/migrations/20260827030000_collaborator_packing_reminders.sql
drop policy if exists "Users manage own packing items" on packing_items;
drop policy if exists "Users and collaborators manage packing items" on packing_items;
create policy "Users and collaborators manage packing items"
  on packing_items for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = packing_items.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = packing_items.user_id)
  );

drop policy if exists "Users manage own reminders" on reminders;
drop policy if exists "Users and collaborators manage reminders" on reminders;
create policy "Users and collaborators manage reminders"
  on reminders for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = reminders.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = reminders.user_id)
  );

-- Trip Pass is a one-time payment scoped to one trip through 30 days after
-- it ends. It has no Stripe subscription to expire, so a daily job checks
-- each trip_pass holder's trip against its own departure_date instead,
-- archiving it and deactivating access the same way a cancelled Plus Pass
-- subscription does (see stripe-webhook's customer.subscription.deleted
-- handler) — App.jsx's existing RequirePaidAuth gate then locks them out
-- of editing/unarchiving it or creating a new trip on its own.
create extension if not exists pg_cron with schema extensions;

create or replace function expire_trip_passes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update trips
  set status = 'archived'
  where status = 'active'
    and departure_date <= (current_date - interval '30 days')
    and user_id in (
      select id from profiles
      where plan_type = 'trip_pass' and subscription_status = 'active'
    );

  update profiles
  set subscription_status = 'inactive'
  where plan_type = 'trip_pass'
    and subscription_status = 'active'
    and id in (
      select user_id from trips
      where status = 'archived'
        and departure_date <= (current_date - interval '30 days')
    );
end;
$$;

select cron.schedule(
  'expire-trip-passes-daily',
  '0 8 * * *', -- 08:00 UTC daily
  $$select expire_trip_passes();$$
);

-- Cancelling Plus Pass shouldn't cut access immediately (see access_until
-- above) — access continues until the date their already-paid-for period
-- actually ends. This is what enforces that cutoff once it arrives.
create or replace function expire_cancelled_plus_passes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- status = 'active' guard here (missing on the original immediate-
  -- cancellation logic this replaces) keeps a trip the user already
  -- soft-deleted from being resurrected to 'archived'.
  update trips
  set status = 'archived'
  where status = 'active'
    and user_id in (
      select id from profiles
      where plan_type = 'plus_pass'
        and subscription_status = 'active'
        and access_until is not null
        and access_until <= now()
    );

  update profiles
  set subscription_status = 'inactive'
  where plan_type = 'plus_pass'
    and subscription_status = 'active'
    and access_until is not null
    and access_until <= now();
end;
$$;

select cron.schedule(
  'expire-cancelled-plus-passes-daily',
  '0 8 * * *', -- 08:00 UTC daily
  $$select expire_cancelled_plus_passes();$$
);

-- Saved estimator scenarios (up to 3 per user, enforced client-side) shown
-- side by side on the Estimates comparison page.
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null default 'Estimate',
  adults integer not null,
  children integer not null,
  nights integer not null,
  park_days integer not null,
  season text,
  resort_tier text,
  travel_mode text,
  travel_cost_lo numeric,
  travel_cost_hi numeric,
  ticket_type text,
  lightning_lane text,
  dining_qs integer default 0,
  dining_ts integer default 0,
  dining_character integer default 0,
  dining_snacks integer default 0,
  souvenirs numeric default 0,
  experiences numeric default 0,
  cost_lo numeric not null,
  cost_hi numeric not null,
  cost_midpoint numeric not null,
  created_at timestamptz default now()
);

alter table estimates enable row level security;

create policy "Users can manage their own estimates"
  on estimates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
