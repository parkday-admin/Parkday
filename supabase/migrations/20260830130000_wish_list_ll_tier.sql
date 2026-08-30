-- Carries a catalog item's Lightning Lane tier onto the wish list row so
-- the wish list page can show the same tier pill the catalog browser does,
-- without a join back to catalog_items. Also threaded onto saved family
-- favorites so it survives being auto-applied to a new trip.
alter table wish_list_items add column if not exists lightning_lane_tier text;
alter table family_member_wish_favorites add column if not exists lightning_lane_tier text;
