-- More display-only denormalized fields on expenses, alongside the existing
-- booth_name/festival, so the itinerary/budget entry card can show the same
-- location, LL tier, and dining tier pills as the catalog and wish list.
-- Populated at "Add to trip" time from the wish list item.
alter table expenses add column if not exists location_detail text;
alter table expenses add column if not exists lightning_lane_tier text;
alter table expenses add column if not exists dining_tier text;
