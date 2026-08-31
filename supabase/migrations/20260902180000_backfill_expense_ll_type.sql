-- Rides added to the itinerary before AddToTripSheet started seeding
-- ll_type never got one, so the expense sheet silently defaulted to
-- 'multipass' (hiding the Time field for Single Pass rides). Backfill from
-- the linked wish list item's catalog tier, same mapping used at add time.
-- Never overwrites an ll_type a user already set by hand.
update expenses e set ll_type = case
  when w.lightning_lane_tier = 'single_pass' then 'singlepass'
  when w.lightning_lane_tier in ('multi_pass', 'multi_pass_tier1', 'multi_pass_tier2') then 'multipass'
  else null
end
from wish_list_items w
where w.planned_expense_id = e.id and e.cat = 'll' and e.ll_type is null and w.lightning_lane_tier is not null;
