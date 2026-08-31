-- The prior fix (20260903140000) restored the Gasparilla Island Grill
-- restaurant row's name/category/description/price/dining_plan_credits/
-- item_type but missed booth_id, which the corrupted insert had left
-- pointing at the row's own id -- self-referential, so it rendered its own
-- name as a "sold at" pill on itself.
update catalog_items set booth_id = null where id = 's-gasparilla-island-grill';
