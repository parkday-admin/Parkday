-- Display-only denormalized fields so the itinerary/budget entry card can
-- show the same booth/festival pills as the catalog and wish list, without
-- every expense-rendering page needing to fetch and join the catalog.
-- Populated at "Add to trip" time from the wish list item's booth_id/seasonal.
alter table expenses add column if not exists booth_name text;
alter table expenses add column if not exists festival text;
