-- Stripe integration — additive migration for the profiles table.
-- Safe to run even though these columns already exist from schema.sql.

alter table profiles
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status text
    check (subscription_status in ('active', 'inactive', 'trialing')),
  add column if not exists plan_type text
    check (plan_type in ('trip_pass', 'plus_pass'));
