-- Backfill the new pill fields (plus booth_name/festival, which had the
-- same gap) onto expenses already linked to a wish list item, so items
-- added to the itinerary before this field existed pick up the pills too.
update expenses e set
  booth_name = coalesce(e.booth_name, b.name),
  festival = coalesce(e.festival, w.seasonal->>'festival'),
  location_detail = coalesce(e.location_detail, w.location_detail),
  lightning_lane_tier = coalesce(e.lightning_lane_tier, w.lightning_lane_tier),
  dining_tier = coalesce(e.dining_tier, w.dining_tier)
from wish_list_items w
left join catalog_items b on b.id = w.booth_id
where w.planned_expense_id = e.id;
