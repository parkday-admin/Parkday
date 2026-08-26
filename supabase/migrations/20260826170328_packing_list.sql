-- Packing list: a smart checklist generated once per trip (per family
-- member, plus a shared "Group" tab where family_member_id is null).
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
