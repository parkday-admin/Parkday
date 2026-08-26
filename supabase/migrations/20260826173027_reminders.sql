-- Reminders: a chronological checklist of booking windows and planning
-- tasks tied to a trip. Most rows are auto-generated once (system: true)
-- from trip data; days-out urgency is always computed at render time from
-- reminder_date, never stored.
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
