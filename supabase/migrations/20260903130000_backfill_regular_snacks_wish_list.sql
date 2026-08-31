-- Backfill the newly-populated fields (location_detail, item_type,
-- dining_plan_credits, tags, booth_id) onto pre-existing wish list rows for
-- the 4 merged snack items, matching the pattern already used elsewhere.
update wish_list_items w set
  location_detail = c.location_detail, item_type = c.item_type,
  dining_plan_credits = c.dining_plan_credits, tags = c.tags, booth_id = c.booth_id
from catalog_items c
where w.catalog_id = c.id and c.category = 'snack' and c.item_type is not null and w.item_type is null;

update family_member_wish_favorites w set
  location_detail = c.location_detail, item_type = c.item_type,
  dining_plan_credits = c.dining_plan_credits, tags = c.tags, booth_id = c.booth_id
from catalog_items c
where w.catalog_id = c.id and c.category = 'snack' and c.item_type is not null and w.item_type is null;
