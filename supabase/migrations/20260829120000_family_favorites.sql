-- Persistent per-family-member favorites (Plus Pass): wish list picks and
-- "always pack" items that auto-populate every new trip after creation.

create table if not exists family_member_wish_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  family_member_id uuid references family_members(id) on delete cascade not null,
  source text not null check (source in ('catalog', 'custom')),
  catalog_id text references catalog_items(id),
  name text,
  park text,
  category text,
  price_label text,
  price_mid numeric,
  notes text,
  created_at timestamptz default now()
);

create table if not exists family_member_pack_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  family_member_id uuid references family_members(id) on delete cascade not null,
  label text not null,
  created_at timestamptz default now()
);

alter table family_member_wish_favorites enable row level security;
alter table family_member_pack_favorites enable row level security;

drop policy if exists "Users manage own wish favorites" on family_member_wish_favorites;
create policy "Users manage own wish favorites"
  on family_member_wish_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own pack favorites" on family_member_pack_favorites;
create policy "Users manage own pack favorites"
  on family_member_pack_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Wish list items auto-inserted from more than one family member's shared
-- favorite carry the list of names here, so the wish list card can show
-- "Favorited by X and Y". Null for manual adds and single-member favorites.
alter table wish_list_items add column if not exists favorited_by text[];
