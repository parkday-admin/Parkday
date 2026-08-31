-- Festival booths (Kiosk) are physical dining locations like restaurants —
-- fold them into the 'restaurant' category so they live under the Dining
-- filter instead of a separate one. The seasonal{} field (surfaced as a
-- festival pill in the UI) is what now distinguishes a booth from a
-- year-round restaurant, not its own category.
update catalog_items set category = 'restaurant' where category = 'kiosk';
update wish_list_items set category = 'restaurant' where category = 'kiosk';
update family_member_wish_favorites set category = 'restaurant' where category = 'kiosk';
