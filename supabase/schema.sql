-- Parkday schema for the new Supabase project (wkoriwuclemvxseltynv)
-- Run this in the Supabase SQL editor.

-- ── Tables ──────────────────────────────────────────────────────────

create table profiles (
  id uuid references auth.users primary key,
  email text,
  stripe_customer_id text,
  subscription_status text check (subscription_status in ('active', 'inactive', 'trialing')),
  plan_type text check (plan_type in ('trip_pass', 'plus_pass')),
  created_at timestamptz default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text,
  status text check (status in ('active', 'archived')) default 'active',
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
