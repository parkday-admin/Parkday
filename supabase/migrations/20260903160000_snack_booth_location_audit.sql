-- New vendor/location catalog rows for named single-location snack
-- stands that didn't already have their own entry, so their items can
-- link via booth_id instead of putting the vendor name in
-- location_detail (which should only ever hold the land/area).
insert into catalog_items (id, name, park, category, description, dining_tier, location_detail) values
  ('loc-westward-ho', 'Westward Ho', 'MK', 'restaurant', 'Frontierland walk-up snack window.', 'snack_kiosk', 'Frontierland'),
  ('loc-adventureland-spring-roll-cart', 'Adventureland Spring Roll Cart', 'MK', 'restaurant', 'Snack cart in Adventureland.', 'snack_kiosk', 'Adventureland'),
  ('loc-aloha-isle', 'Aloha Isle', 'MK', 'restaurant', 'Adventureland''s classic Dole Whip stand.', 'snack_kiosk', 'Adventureland'),
  ('loc-sunshine-tree-terrace', 'Sunshine Tree Terrace', 'MK', 'restaurant', 'Adventureland Dole Whip and citrus specialty stand.', 'snack_kiosk', 'Adventureland'),
  ('loc-main-street-confectionary', 'Main Street Confectionary', 'MK', 'restaurant', 'The park''s candy shop on Main Street.', 'snack_kiosk', 'Main Street U.S.A.'),
  ('loc-l-artisan-des-glaces', 'L''Artisan des Glaces', 'EPCOT', 'restaurant', 'Artisan ice cream window in the France pavilion.', 'snack_kiosk', 'World Showcase'),
  ('loc-karamell-kuche', 'Karamell-Küche', 'EPCOT', 'restaurant', 'Werther''s Original caramel shop in the Germany pavilion.', 'snack_kiosk', 'World Showcase'),
  ('loc-canada-popcorn-cart', 'Canada Popcorn Cart', 'EPCOT', 'restaurant', 'Popcorn cart at the Canada pavilion.', 'snack_kiosk', 'World Showcase'),
  ('loc-baseline-tap-house', 'Baseline Tap House', 'HS', 'restaurant', 'Craft beer and pretzel bar on Grand Avenue.', 'snack_kiosk', 'Grand Avenue'),
  ('loc-milk-stand', 'Milk Stand', 'HS', 'restaurant', 'Blue and Green Milk stand in Star Wars: Galaxy''s Edge.', 'snack_kiosk', 'Galaxy''s Edge'),
  ('loc-popcorn-snacks-stand-tsl', 'Popcorn & Snacks Stand', 'HS', 'restaurant', 'Snack kiosk in Toy Story Land.', 'snack_kiosk', 'Toy Story Land'),
  ('loc-smiling-crocodile', 'Smiling Crocodile', 'AK', 'restaurant', 'Snack window in the Africa/Harambe area.', 'snack_kiosk', 'Africa'),
  ('loc-harambe-fruit-market', 'Harambe Fruit Market', 'AK', 'restaurant', 'Fresh fruit and grilled corn stand in Harambe.', 'snack_kiosk', 'Africa'),
  ('loc-pongu-pongu', 'Pongu Pongu', 'AK', 'restaurant', 'Specialty drink stand in Pandora – The World of Avatar.', 'snack_kiosk', 'Pandora'),
  ('loc-blue-ribbon-corn-dogs', 'Blue Ribbon Corn Dogs', 'BW', 'restaurant', 'Corn dog window on the BoardWalk promenade.', 'snack_kiosk', null),
  ('loc-everything-pop-dining', 'Everything POP Dining', 'VALUE', 'restaurant', 'Pop Century''s main resort food court.', 'snack_kiosk', null),
  ('loc-hurricane-hannas', 'Hurricane Hanna''s Waterside Bar & Grill', 'YC', 'restaurant', 'Pool bar at Stormalong Bay, between the Yacht and Beach Clubs.', 'snack_kiosk', null),
  ('loc-swirls-on-the-water', 'Swirls on the Water', 'DS', 'restaurant', 'Dole Whip stand in The Landing.', 'snack_kiosk', 'The Landing'),
  ('loc-basket-wine-bar-george', 'The Basket at Wine Bar George', 'DS', 'restaurant', 'Wine Bar George''s to-go window in The Landing.', 'snack_kiosk', 'The Landing'),
  ('loc-cake-bake-shop-bakery', 'The Cake Bake Shop Bakery', 'DS', 'restaurant', 'Bakery window in Town Center.', 'snack_kiosk', 'Town Center'),
  ('loc-summer-house-on-the-lake', 'Summer House on the Lake', 'DS', 'restaurant', 'Restaurant and happy-hour bar in The Landing.', 'snack_kiosk', 'The Landing'),
  ('loc-vivoli-il-gelato', 'Vivoli il Gelato', 'DS', 'restaurant', 'Italian gelateria in Town Center.', 'snack_kiosk', 'Town Center'),
  ('loc-everglazed-doughnuts', 'Everglazed Doughnuts & Cold Brew', 'DS', 'restaurant', 'Gourmet doughnut shop in The Landing.', 'snack_kiosk', 'The Landing'),
  ('loc-gideons-bakehouse', 'Gideon''s Bakehouse', 'DS', 'restaurant', 'Famous cookie bakery in The Landing.', 'snack_kiosk', 'The Landing');

-- Point each item at its new booth and put the land in location_detail.
-- Also backfills location_detail (the land) onto items that already had a
-- correct booth_id but were missing it -- booth_id and location_detail
-- are complementary (who vs. where), not alternatives.
update catalog_items set booth_id = 'loc-smiling-crocodile', location_detail = 'Africa' where id = 's-cheese-stuffed-arepa';
update catalog_items set location_detail = 'Discovery Island' where id = 's-cheesecake-pop';
update catalog_items set booth_id = 'loc-harambe-fruit-market', location_detail = 'Africa' where id = 's-grilled-corn-on-the-cob';
update catalog_items set booth_id = 'loc-pongu-pongu', location_detail = 'Pandora' where id = 's-night-blossom';
update catalog_items set booth_id = 'loc-pongu-pongu', location_detail = 'Pandora' where id = 's-nightwraith-blaze';
update catalog_items set location_detail = 'Discovery Island' where id = 's-nomad-lounge-churros';
update catalog_items set booth_id = 'loc-pongu-pongu', location_detail = 'Pandora' where id = 's-pongu-lumpia';
update catalog_items set location_detail = 'Discovery Island' where id = 's-pulled-pork-fries';
update catalog_items set booth_id = 'loc-pongu-pongu', location_detail = 'Pandora' where id = 's-rum-blossom';
update catalog_items set location_detail = 'Pandora' where id = 's-satu-li-cheeseburger-steamed';
update catalog_items set booth_id = 'loc-blue-ribbon-corn-dogs', location_detail = null where id = 's-blue-ribbon-corn-dogs';
update catalog_items set location_detail = 'The Landing' where id = 's-amorette-s-mini-dome-cake';
update catalog_items set booth_id = 'loc-blue-ribbon-corn-dogs', location_detail = null where id = 's-blue-ribbon-pickle-dog';
update catalog_items set booth_id = 'loc-summer-house-on-the-lake', location_detail = 'The Landing' where id = 's-bottomless-truffle-fries';
update catalog_items set booth_id = 'loc-cake-bake-shop-bakery', location_detail = 'Town Center' where id = 's-chocolate-peanut-butter';
update catalog_items set booth_id = 'loc-basket-wine-bar-george', location_detail = 'The Landing' where id = 's-crispy-mac-cheese-bites';
update catalog_items set booth_id = 'loc-swirls-on-the-water', location_detail = 'The Landing' where id = 's-dole-whip-flight';
update catalog_items set booth_id = 'loc-everglazed-doughnuts', location_detail = 'The Landing' where id = 's-everglazed-gourmet-donut';
update catalog_items set booth_id = 'loc-gideons-bakehouse', location_detail = 'The Landing' where id = 's-gideon-s-bakehouse-cookie';
update catalog_items set booth_id = 'loc-vivoli-il-gelato', location_detail = 'Town Center' where id = 's-vivoli-il-gelato';
update catalog_items set location_detail = 'World Showcase' where id = 's-bratwurst';
update catalog_items set location_detail = 'World Showcase' where id = 's-chocolate-croissant';
update catalog_items set location_detail = 'World Showcase' where id = 's-fish-and-chips';
update catalog_items set location_detail = 'World Showcase' where id = 's-ham-and-cheese-baguette';
update catalog_items set booth_id = 'loc-l-artisan-des-glaces', location_detail = 'World Showcase' where id = 's-ice-cream-brioche-sandwich';
update catalog_items set booth_id = 'loc-l-artisan-des-glaces', location_detail = 'World Showcase' where id = 's-ice-cream-martini';
update catalog_items set booth_id = 'loc-karamell-kuche', location_detail = 'World Showcase' where id = 's-karamell-k-che-caramel-cookie';
update catalog_items set booth_id = 'loc-karamell-kuche', location_detail = 'World Showcase' where id = 's-karamell-k-che-caramel-corn';
update catalog_items set booth_id = 'loc-canada-popcorn-cart', location_detail = 'World Showcase' where id = 's-maple-popcorn';
update catalog_items set location_detail = 'World Showcase' where id = 's-orange-cream-cheese-cinnamon';
update catalog_items set location_detail = 'World Showcase' where id = 's-pretzel-nuggets-with-beer';
update catalog_items set location_detail = 'World Showcase' where id = 's-schoolbread';
update catalog_items set booth_id = 'loc-baseline-tap-house', location_detail = 'Grand Avenue' where id = 's-bavarian-pretzel-with-beer';
update catalog_items set location_detail = 'Echo Lake' where id = 's-bbq-brisket-waffle-bowl';
update catalog_items set booth_id = 'loc-milk-stand', location_detail = 'Galaxy''s Edge' where id = 's-blue-milk';
update catalog_items set location_detail = 'Echo Lake' where id = 's-buffalo-chicken-waffle-bowl';
update catalog_items set location_detail = 'Hollywood Blvd' where id = 's-carrot-cake-whoopie-pie';
update catalog_items set location_detail = 'Toy Story Land' where id = 's-lunch-box-tart';
update catalog_items set booth_id = 'loc-milk-stand', location_detail = 'Galaxy''s Edge' where id = 's-pink-milk';
update catalog_items set booth_id = 'loc-popcorn-snacks-stand-tsl', location_detail = 'Toy Story Land' where id = 's-pizza-planet-spring-rolls';
update catalog_items set location_detail = 'Galaxy''s Edge' where id = 's-rontowrap';
update catalog_items set location_detail = 'Toy Story Land' where id = 's-totchos';
update catalog_items set location_detail = 'Galaxy''s Edge' where id = 's-zucchi-wrap';
update catalog_items set booth_id = 'loc-westward-ho', location_detail = 'Frontierland' where id = 's-candied-bacon-skewer';
update catalog_items set booth_id = 'loc-adventureland-spring-roll-cart', location_detail = 'Adventureland' where id = 's-cheeseburger-spring-rolls';
update catalog_items set location_detail = 'Tomorrowland' where id = 's-cream-cheese-stuffed-pretzel';
update catalog_items set booth_id = 'loc-aloha-isle', location_detail = 'Adventureland' where id = 's-dole-whip-pineapple-float';
update catalog_items set location_detail = 'Fantasyland' where id = 's-gaston-s-tavern-cinnamon-roll';
update catalog_items set booth_id = 'loc-sunshine-tree-terrace', location_detail = 'Adventureland' where id = 's-i-lava-you-float';
update catalog_items set location_detail = 'Fantasyland' where id = 's-lefou';
update catalog_items set booth_id = 'loc-main-street-confectionary', location_detail = 'Main Street U.S.A.' where id = 's-main-street-confectionary';
update catalog_items set booth_id = 'loc-westward-ho', location_detail = 'Frontierland' where id = 's-mickey-bacon-pecan-caramel';
update catalog_items set booth_id = 'loc-aloha-isle', location_detail = 'Adventureland' where id = 's-pineapple-upside-down-cake';
update catalog_items set booth_id = 'loc-everything-pop-dining', location_detail = null where id = 's-tie-dye-cheesecake';
update catalog_items set booth_id = 'loc-hurricane-hannas', location_detail = null where id = 's-crab-fries';
update catalog_items set park = 'BW' where id = 's-blue-ribbon-pickle-dog';
