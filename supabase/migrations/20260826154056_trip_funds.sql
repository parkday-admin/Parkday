-- Trip Funds: gift cards & rewards, linkable as an expense's payment source.
-- Balances auto-adjust via triggers (below) rather than app code at every
-- expense write/delete site, matching the wish-list-unlink pattern already
-- used for expenses -> wish_list_items.

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

-- ── Unlink expenses from a card/reward that gets deleted ─────────────────
-- payment_source is a plain text ref ("gift:<uuid>" / "reward:<uuid>"), not
-- a foreign key, so deleting a card/reward would never fail — but the
-- expenses that pointed to it should stop showing a stale reference.
create or replace function gift_card_clear_payment_source()
returns trigger
language plpgsql
as $$
begin
  update expenses set payment_source = null where payment_source = 'gift:' || old.id::text;
  return old;
end;
$$;

drop trigger if exists trg_gift_card_clear_payment_source on gift_cards;
create trigger trg_gift_card_clear_payment_source
  before delete on gift_cards
  for each row execute function gift_card_clear_payment_source();

create or replace function reward_clear_payment_source()
returns trigger
language plpgsql
as $$
begin
  update expenses set payment_source = null where payment_source = 'reward:' || old.id::text;
  return old;
end;
$$;

drop trigger if exists trg_reward_clear_payment_source on reward_programs;
create trigger trg_reward_clear_payment_source
  before delete on reward_programs
  for each row execute function reward_clear_payment_source();

-- ── Auto-deduct/restore balances as expenses log or change actual amounts ─
create or replace function apply_payment_source_delta(source text, delta numeric)
returns void
language plpgsql
as $$
declare
  ref_id uuid;
begin
  if source is null or delta = 0 then return; end if;
  if source like 'gift:%' then
    ref_id := substring(source from 6)::uuid;
    update gift_cards set balance = balance + delta, depleted = (balance + delta) <= 0 where id = ref_id;
  elsif source like 'reward:%' then
    ref_id := substring(source from 8)::uuid;
    update reward_programs set value = value + delta where id = ref_id;
  end if;
end;
$$;

create or replace function expenses_payment_source_sync()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    if new.actual_amt is not null and new.payment_source is not null then
      perform apply_payment_source_delta(new.payment_source, -new.actual_amt);
    end if;
    return new;
  elsif TG_OP = 'UPDATE' then
    if old.actual_amt is not null and old.payment_source is not null then
      perform apply_payment_source_delta(old.payment_source, old.actual_amt);
    end if;
    if new.actual_amt is not null and new.payment_source is not null then
      perform apply_payment_source_delta(new.payment_source, -new.actual_amt);
    end if;
    return new;
  elsif TG_OP = 'DELETE' then
    if old.actual_amt is not null and old.payment_source is not null then
      perform apply_payment_source_delta(old.payment_source, old.actual_amt);
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_expenses_payment_source_sync on expenses;
create trigger trg_expenses_payment_source_sync
  after insert or update or delete on expenses
  for each row execute function expenses_payment_source_sync();
