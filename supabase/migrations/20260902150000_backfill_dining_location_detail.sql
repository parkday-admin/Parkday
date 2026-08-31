-- Backfill location_detail onto pre-existing wish list rows for
-- restaurants, matching the pattern already used for rides/shows.
update wish_list_items w set location_detail = c.location_detail
from catalog_items c
where w.catalog_id = c.id and c.location_detail is not null and w.location_detail is null;

update family_member_wish_favorites w set location_detail = c.location_detail
from catalog_items c
where w.catalog_id = c.id and c.location_detail is not null and w.location_detail is null;
