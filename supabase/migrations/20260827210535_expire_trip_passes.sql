-- Trip Pass is scoped to one trip through 30 days after it ends — unlike
-- Plus Pass, it's a one-time Stripe payment (mode: 'payment'), not a
-- subscription, so there's no Stripe webhook event that ever fires to
-- signal "this has expired". Enforcing that window has to be a scheduled
-- check against the trip's own departure_date instead.
--
-- Reuses the exact mechanism already used when a Plus Pass subscription is
-- cancelled (stripe-webhook's customer.subscription.deleted handler):
-- archive the trip and set subscription_status = 'inactive'. That alone is
-- sufficient to lock the user out of editing/unarchiving it or creating a
-- new trip — RequirePaidAuth (App.jsx) already gates every protected route
-- behind subscription_status = 'active', and the /paywall route already
-- shows both Trip Pass and Plus Pass as options for an inactive user (see
-- the Paywall currentPlanType prop). No new route or UI logic needed.

create extension if not exists pg_cron with schema extensions;

create or replace function expire_trip_passes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update trips
  set status = 'archived'
  where status = 'active'
    and departure_date <= (current_date - interval '30 days')
    and user_id in (
      select id from profiles
      where plan_type = 'trip_pass' and subscription_status = 'active'
    );

  update profiles
  set subscription_status = 'inactive'
  where plan_type = 'trip_pass'
    and subscription_status = 'active'
    and id in (
      select user_id from trips
      where status = 'archived'
        and departure_date <= (current_date - interval '30 days')
    );
end;
$$;

select cron.schedule(
  'expire-trip-passes-daily',
  '0 8 * * *', -- 08:00 UTC daily
  $$select expire_trip_passes();$$
);
