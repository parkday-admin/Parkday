-- The previous migration's slug generator truncated "Gasparilla Island
-- Grill Mickey Waffles" down to exactly "gasparilla-island-grill" (its
-- 30-char cutoff landed mid-word and backed up to the prior hyphen),
-- colliding with the existing s-gasparilla-island-grill restaurant row and
-- silently overwriting it via ON CONFLICT. Restore that row from its
-- original insert (20260901120000_dining_catalog.sql), then give the
-- Mickey Waffles snack item its own id.
update catalog_items set
  name = 'Gasparilla Island Grill',
  category = 'restaurant',
  description = 'The Grand Floridian''s quick service option with grab-and-go meals, hot foods, and baked goods. Available 24 hours — a convenient late-night option for resort guests.',
  price_label = '$10–$17/pp',
  price_mid = 13,
  item_type = null,
  dining_plan_credits = 'QS'
where id = 's-gasparilla-island-grill';

insert into catalog_items (id, name, park, category, description, price_label, price_mid, location_detail, item_type, dining_plan_credits, tags, booth_id) values
  ('s-gasparilla-mickey-waffles', 'Gasparilla Island Grill Mickey Waffles', 'GF', 'snack', 'Mickey-shaped Belgian waffles available 24 hours a day at the Grand Floridian''s quick service. The late-night option makes these a resort guest staple — good for early mornings before park opening too.', '~$7.49', 7.49, null, 'food', 'QS Credit', null, 's-gasparilla-island-grill')
on conflict (id) do update set
  name=excluded.name, category=excluded.category, description=excluded.description,
  price_label=excluded.price_label, price_mid=excluded.price_mid, location_detail=excluded.location_detail,
  item_type=excluded.item_type, dining_plan_credits=excluded.dining_plan_credits, tags=excluded.tags, booth_id=excluded.booth_id;
