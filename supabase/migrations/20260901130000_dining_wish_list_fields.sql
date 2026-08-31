-- Carries a catalog item's dining tier/cuisine/dining plan credits onto the
-- wish list row (and saved family favorites), same treatment as
-- lightning_lane_tier, so restaurant cards show them without a join back to
-- catalog_items — and backfills them onto rows added before these columns
-- existed.
alter table wish_list_items add column if not exists dining_tier text;
alter table wish_list_items add column if not exists cuisine text;
alter table wish_list_items add column if not exists dining_plan_credits text;

alter table family_member_wish_favorites add column if not exists dining_tier text;
alter table family_member_wish_favorites add column if not exists cuisine text;
alter table family_member_wish_favorites add column if not exists dining_plan_credits text;

update wish_list_items w
set dining_tier = c.dining_tier, cuisine = c.cuisine, dining_plan_credits = c.dining_plan_credits
from catalog_items c
where w.catalog_id = c.id
  and w.dining_tier is null
  and c.dining_tier is not null;

update family_member_wish_favorites f
set dining_tier = c.dining_tier, cuisine = c.cuisine, dining_plan_credits = c.dining_plan_credits
from catalog_items c
where f.catalog_id = c.id
  and f.dining_tier is null
  and c.dining_tier is not null;
