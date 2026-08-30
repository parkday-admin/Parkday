-- wish_list_items and family_member_wish_favorites rows added before
-- lightning_lane_tier existed are still null even for catalog items that
-- now have a tier — backfill them by catalog_id.
update wish_list_items w
set lightning_lane_tier = c.lightning_lane_tier
from catalog_items c
where w.catalog_id = c.id
  and w.lightning_lane_tier is null
  and c.lightning_lane_tier is not null;

update family_member_wish_favorites f
set lightning_lane_tier = c.lightning_lane_tier
from catalog_items c
where f.catalog_id = c.id
  and f.lightning_lane_tier is null
  and c.lightning_lane_tier is not null;
