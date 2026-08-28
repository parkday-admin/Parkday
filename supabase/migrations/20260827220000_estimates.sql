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
