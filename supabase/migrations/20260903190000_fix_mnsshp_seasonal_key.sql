-- The MNSSHP catalog migration used seasonal->>'event' (the key name the
-- source spreadsheet suggested), but the app actually reads
-- seasonal->>'festival' everywhere (CatalogGrid, Wishlist, AddToTripSheet)
-- -- the same key Food & Wine's seasonal jsonb uses. That mismatch is why
-- the MNSSHP items showed no festival pill. Rename the key in place rather
-- than re-inserting the rows.
update catalog_items
set seasonal = (seasonal - 'event') || jsonb_build_object('festival', seasonal->'event')
where seasonal ? 'event';

update wish_list_items
set seasonal = (seasonal - 'event') || jsonb_build_object('festival', seasonal->'event')
where seasonal ? 'event';

update family_member_wish_favorites
set seasonal = (seasonal - 'event') || jsonb_build_object('festival', seasonal->'event')
where seasonal ? 'event';
