-- Backfill the corrected booth_id/location_detail values onto pre-existing
-- wish list rows for snack items touched by the previous audit fix.
update wish_list_items w set location_detail = c.location_detail, booth_id = c.booth_id
from catalog_items c
where w.catalog_id = c.id and c.category = 'snack'
  and (w.location_detail is distinct from c.location_detail or w.booth_id is distinct from c.booth_id);

update family_member_wish_favorites w set location_detail = c.location_detail, booth_id = c.booth_id
from catalog_items c
where w.catalog_id = c.id and c.category = 'snack'
  and (w.location_detail is distinct from c.location_detail or w.booth_id is distinct from c.booth_id);
