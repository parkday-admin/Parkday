-- reward_programs only ever tracked a single `value` column, which the
-- expenses_payment_source_sync trigger (see 20260826154056_trip_funds.sql)
-- decrements directly as it's spent — unlike gift_cards, which keeps a
-- fixed original_amount alongside its mutable balance. That meant rewards
-- had no way to show "$X original" once anything had been spent against
-- them; the original amount was overwritten, not preserved.

alter table reward_programs add column if not exists original_value numeric not null default 0;

-- Backfill: reconstruct each reward's original value from its current
-- (already-decremented) value plus whatever has been spent against it, so
-- existing rewards that were already partially or fully spent before this
-- column existed don't just show $0 original.
update reward_programs r
set original_value = r.value + coalesce((
  select sum(e.actual_amt)
  from expenses e
  where e.payment_source = 'reward:' || r.id::text
    and e.actual_amt is not null
), 0)
where r.original_value = 0;
