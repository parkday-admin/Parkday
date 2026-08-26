-- Payments: installment payments toward a Vacation Package. A payment can
-- optionally be tied to a gift card/reward as its source, reusing the same
-- "gift:<uuid>" / "reward:<uuid>" convention and apply_payment_source_delta()
-- helper introduced for expenses in the Trip Funds migration.

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

-- Disney requires full payment 30 days before check-in. Computed by the
-- configurator on save; stored so the payments page doesn't recompute it
-- from arrival_date on every render.
alter table trips add column if not exists final_payment_date date;

-- ── Auto-deduct/restore gift card & reward balances as payments are logged,
-- changed, or removed — same trigger shape as expenses_payment_source_sync.
create or replace function payments_source_sync()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    if new.payment_source is not null then
      perform apply_payment_source_delta(new.payment_source, -new.amount);
    end if;
    return new;
  elsif TG_OP = 'UPDATE' then
    if old.payment_source is not null then
      perform apply_payment_source_delta(old.payment_source, old.amount);
    end if;
    if new.payment_source is not null then
      perform apply_payment_source_delta(new.payment_source, -new.amount);
    end if;
    return new;
  elsif TG_OP = 'DELETE' then
    if old.payment_source is not null then
      perform apply_payment_source_delta(old.payment_source, old.amount);
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_payments_source_sync on payments;
create trigger trg_payments_source_sync
  after insert or update or delete on payments
  for each row execute function payments_source_sync();

-- ── Keep the package expense's actual_amt equal to total paid ────────────
create or replace function sync_package_actual_amt(p_trip_id uuid)
returns void
language plpgsql
as $$
declare
  total numeric;
begin
  select coalesce(sum(amount), 0) into total from payments where trip_id = p_trip_id;
  update expenses set actual_amt = case when total > 0 then total else null end
  where trip_id = p_trip_id and cat = 'package' and is_budget = true;
end;
$$;

create or replace function payments_sync_package_actual()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    perform sync_package_actual_amt(old.trip_id);
    return old;
  else
    perform sync_package_actual_amt(new.trip_id);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_payments_sync_package_actual on payments;
create trigger trg_payments_sync_package_actual
  after insert or update or delete on payments
  for each row execute function payments_sync_package_actual();

-- ── Unlink payments too when their gift card/reward source is deleted ────
-- (extends the functions the Trip Funds migration created for expenses)
create or replace function gift_card_clear_payment_source()
returns trigger
language plpgsql
as $$
begin
  update expenses set payment_source = null where payment_source = 'gift:' || old.id::text;
  update payments set payment_source = null where payment_source = 'gift:' || old.id::text;
  return old;
end;
$$;

create or replace function reward_clear_payment_source()
returns trigger
language plpgsql
as $$
begin
  update expenses set payment_source = null where payment_source = 'reward:' || old.id::text;
  update payments set payment_source = null where payment_source = 'reward:' || old.id::text;
  return old;
end;
$$;
