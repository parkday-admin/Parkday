-- Denormalize the new festival fields onto wish_list_items and
-- family_member_wish_favorites, matching the pattern already used for
-- dining_tier/cuisine/dining_plan_credits.
alter table wish_list_items add column if not exists seasonal jsonb;
alter table wish_list_items add column if not exists tags text[];
alter table wish_list_items add column if not exists location_detail text;
alter table wish_list_items add column if not exists item_type text;
alter table wish_list_items add column if not exists booth_id text references catalog_items(id);

alter table family_member_wish_favorites add column if not exists seasonal jsonb;
alter table family_member_wish_favorites add column if not exists tags text[];
alter table family_member_wish_favorites add column if not exists location_detail text;
alter table family_member_wish_favorites add column if not exists item_type text;
alter table family_member_wish_favorites add column if not exists booth_id text references catalog_items(id);

update wish_list_items w set
  seasonal = c.seasonal, tags = c.tags, location_detail = c.location_detail,
  item_type = c.item_type, booth_id = c.booth_id
from catalog_items c
where w.catalog_id = c.id and c.seasonal is not null and w.seasonal is null;

update family_member_wish_favorites w set
  seasonal = c.seasonal, tags = c.tags, location_detail = c.location_detail,
  item_type = c.item_type, booth_id = c.booth_id
from catalog_items c
where w.catalog_id = c.id and c.seasonal is not null and w.seasonal is null;
