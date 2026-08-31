-- The dining import split quick-service/pool-bar/snack-kiosk tiers into the
-- 'snack' wish list category, but every one of these rows is a physical
-- dining location, not a food item — 'snack' is reserved for actual snacks
-- (Dole Whip, pretzels, etc.), so all dining_tier rows belong under
-- 'restaurant' regardless of tier.
update catalog_items set category = 'restaurant' where category = 'snack' and dining_tier is not null;
update wish_list_items set category = 'restaurant' where category = 'snack' and dining_tier is not null;
update family_member_wish_favorites set category = 'restaurant' where category = 'snack' and dining_tier is not null;
