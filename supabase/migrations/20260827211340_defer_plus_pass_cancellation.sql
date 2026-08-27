-- Cancelling Plus Pass used to cut access immediately on Stripe's
-- customer.subscription.deleted event, whenever that actually fires
-- (timing depends on the Stripe Customer Portal's cancellation config,
-- not this app). Access should instead continue through the period
-- they've already paid for, ending on their normal signup-anniversary
-- renewal date. access_until holds that computed cutoff, set by
-- stripe-webhook's customer.subscription.deleted handler; this daily job
-- is what actually enforces it once that date arrives.

alter table profiles add column if not exists access_until timestamptz;

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
