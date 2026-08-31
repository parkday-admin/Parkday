-- New fields to support seasonal festival booths (Kiosk) and the food/drink
-- items sold at them (Snack & Sip), starting with EPCOT Food & Wine 2026.
-- seasonal jsonb uses { festival, start: 'MM-DD', end: 'MM-DD' } (no year)
-- so the same row is reusable across festival years. tags is a free-form
-- array rather than one boolean per flag, since combos already show up in
-- the source data (e.g. "30th Anniversary" + "Plant-based" on one item) and
-- future festivals will introduce flags we haven't seen yet. booth_id is a
-- self-reference so a Snack & Sip item can point at the Kiosk booth it's
-- sold from.
alter table catalog_items add column if not exists seasonal jsonb;
alter table catalog_items add column if not exists tags text[];
alter table catalog_items add column if not exists location_detail text;
alter table catalog_items add column if not exists item_type text;
alter table catalog_items add column if not exists booth_id text references catalog_items(id);
