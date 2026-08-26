-- Trips created before the Payments feature don't have final_payment_date
-- set (the configurator only computes it on save). Backfill from the rule
-- the configurator uses: 30 days before arrival.
update trips
set final_payment_date = arrival_date - 30
where final_payment_date is null and arrival_date is not null;
