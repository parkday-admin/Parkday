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
