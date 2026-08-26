-- Catalog items (static-ish, maintained by admin)
create table if not exists catalog_items (
  id text primary key,
  name text not null,
  park text,
  category text not null,
  description text,
  price_label text,
  price_mid numeric default 0,
  active boolean default true
);

-- User's personal wish list, scoped per trip
create table if not exists wish_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  catalog_id text references catalog_items(id),
  name text not null,
  park text,
  category text not null,
  price_label text,
  price_mid numeric default 0,
  notes text,
  custom boolean default false,
  planned_expense_id uuid references expenses(id),
  planned_day int,
  created_at timestamptz default now()
);

alter table catalog_items enable row level security;
alter table wish_list_items enable row level security;

drop policy if exists "Anyone can read the catalog" on catalog_items;
create policy "Anyone can read the catalog"
  on catalog_items for select
  to authenticated
  using (true);

drop policy if exists "Users manage own wish list" on wish_list_items;
create policy "Users manage own wish list"
  on wish_list_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed catalog — extracted from public/parkday_planner_v1.html's
-- WISHLIST_CATALOG. The experience/event pricing mirrors the estimator's
-- EXPERIENCES catalog so the two tools stay consistent.
insert into catalog_items (id, name, park, category, description, price_label, price_mid) values
  ('r-tron', 'TRON Lightcycle / Run', 'MK', 'ride', 'High-speed launch coaster racing lightcycles through the Grid.', '', 0),
  ('r-rotr', 'Star Wars: Rise of the Resistance', 'HS', 'ride', 'Immersive multi-stage trackless dark ride battling the First Order.', '', 0),
  ('r-gotg', 'Guardians of the Galaxy: Cosmic Rewind', 'EPCOT', 'ride', 'Backwards-launching indoor coaster set to a rotating soundtrack.', '', 0),
  ('r-fop', 'Avatar Flight of Passage', 'AK', 'ride', 'Simulator ride soaring over Pandora on the back of a banshee.', '', 0),
  ('r-remy', 'Remy''s Ratatouille Adventure', 'EPCOT', 'ride', 'Trackless dark ride shrunk down to rat-size through a Paris kitchen.', '', 0),
  ('r-frozen', 'Frozen Ever After', 'EPCOT', 'ride', 'Boat ride through Arendelle with Anna, Elsa & the gang.', '', 0),
  ('r-tiana', 'Tiana''s Bayou Adventure', 'MK', 'ride', 'Log flume adventure through the bayou with Princess Tiana.', '', 0),
  ('r-haunted', 'Haunted Mansion', 'MK', 'ride', 'Classic doombuggy tour through 999 happy haunts.', '', 0),
  ('r-smtn', 'Space Mountain', 'MK', 'ride', 'Indoor coaster racing through the darkness of outer space.', '', 0),
  ('r-7dmt', 'Seven Dwarfs Mine Train', 'MK', 'ride', 'Family coaster swaying through the dwarfs'' diamond mine.', '', 0),
  ('r-slinky', 'Slinky Dog Dash', 'HS', 'ride', 'Family coaster built from Andy''s giant Mega Coaster Play Kit.', '', 0),
  ('r-falcon', 'Millennium Falcon: Smugglers Run', 'HS', 'ride', 'Pilot the Falcon yourself on a smuggling run for Hondo Ohnaka.', '', 0),
  ('r-safaris', 'Kilimanjaro Safaris', 'AK', 'ride', 'Open-air truck safari across the Harambe Wildlife Reserve.', '', 0),
  ('r-everest', 'Expedition Everest', 'AK', 'ride', 'Coaster through the Himalayas — forwards, backwards, and past the Yeti.', '', 0),
  ('r-btmr', 'Big Thunder Mountain Railroad', 'MK', 'ride', 'A runaway mine train through the wildest ride in the wilderness.', '', 0),
  ('r-testtrack', 'Test Track', 'EPCOT', 'ride', 'Design a concept vehicle, then put it through high-speed test loops.', '', 0),
  ('r-se', 'Spaceship Earth', 'EPCOT', 'ride', 'Slow-moving journey through the history of human communication.', '', 0),

  ('d-bog', 'Be Our Guest', 'MK', 'restaurant', 'French-inspired table service in the Beast''s enchanted castle.', '$35–$65/pp', 50),
  ('d-crt', 'Cinderella''s Royal Table', 'MK', 'restaurant', 'Character dining inside Cinderella Castle with Disney princesses.', '$55–$85/pp', 70),
  ('d-space220', 'Space 220', 'EPCOT', 'restaurant', 'Table service "restaurant in orbit" 220 miles above Earth.', '$55–$80/pp', 68),
  ('d-topolinos', 'Topolino''s Terrace', 'HS', 'restaurant', 'Character breakfast with Mickey & pals, rooftop Skyline views.', '$55–$75/pp', 65),
  ('d-chefmickeys', 'Chef Mickey''s', 'Resort', 'restaurant', 'Buffet character dining with Mickey & friends at Contemporary Resort.', '$45–$65/pp', 55),
  ('d-scifi', 'Sci-Fi Dine-In Theater', 'HS', 'restaurant', 'Burgers & shakes at a drive-in movie theater under the stars.', '$30–$45/pp', 38),
  ('d-oga', 'Oga''s Cantina', 'HS', 'restaurant', 'Galaxy''s Edge watering hole with exotic drinks & DJ droid.', '$18–$25/pp', 22),
  ('d-skipper', 'Jungle Navigation Co. Skipper Canteen', 'MK', 'restaurant', 'Adventurer-themed table service with a punny Jungle Cruise crew.', '$30–$50/pp', 40),
  ('d-brownderby', 'The Hollywood Brown Derby', 'HS', 'restaurant', 'Old Hollywood fine dining — home of the original Cobb salad.', '$45–$70/pp', 58),
  ('d-ohana', '''Ohana', 'Resort', 'restaurant', 'Family-style Polynesian feast with skillet-cooked meats at the Poly.', '$45–$65/pp', 55),

  ('s-dolewhip', 'Dole Whip', 'MK', 'snack', 'Iconic pineapple soft-serve, with or without the rum.', '$6–$9', 7),
  ('s-greystuff', 'The Grey Stuff', 'MK', 'snack', 'Chocolate-cookies-and-cream dessert cup — it''s delicious, don''t believe us? Ask the dishes.', '$6–$8', 7),
  ('s-waffle', 'Mickey Waffle', 'All parks', 'snack', 'The ear-shaped breakfast classic, served at counter service spots parkwide.', '$7–$12', 9),
  ('s-lefou', 'LeFou''s Brew', 'MK', 'snack', 'Frozen apple juice slush topped with marshmallow foam, from Gaston''s Tavern.', '$6–$8', 7),
  ('s-schoolbread', 'School Bread', 'EPCOT', 'snack', 'Norwegian sweet bread filled with custard, coated in coconut, from Kringla Bakeri.', '$6–$8', 7),
  ('s-kakigori', 'Kakigori', 'EPCOT', 'snack', 'Japanese shaved ice dessert from the Katsura Grill in the Japan pavilion.', '$8–$12', 10),
  ('s-croissantdonut', 'Croissant Doughnut', 'EPCOT', 'snack', 'Half croissant, half doughnut, from Les Halles Boulangerie in France.', '$6–$9', 7),
  ('s-cccookie', 'Carrot Cake Cookie', 'HS', 'snack', 'Cream-cheese-frosted carrot cake cookie sandwich from Woody''s Lunch Box.', '$6–$9', 7),
  ('s-rontowrap', 'Ronto Wrap', 'HS', 'snack', 'Grilled sausage & roasted pork wrap from Ronto Roasters in Galaxy''s Edge.', '$13–$16', 14),
  ('s-turkeyleg', 'Smoked Turkey Leg', 'All parks', 'snack', 'The giant, smoky, parkwide classic — one will feed most kids twice over.', '$14–$18', 16),
  ('s-geyserpoint', 'Geyser Point Bar & Grill', 'Resort', 'snack', 'Waterside quick-service bites & drinks at Wilderness Lodge.', '$8–$16', 12),
  ('s-boathouse', 'The BOATHOUSE Snacks', 'Resort', 'snack', 'Dockside sips & bites overlooking Crescent Lake at Disney Springs.', '$10–$18', 14),

  ('e-bbb', 'Bibbidi Bobbidi Boutique', 'MK', 'experience', 'Hair, makeup & costume transformation for kids at the castle salon.', '$75–$450', 262),
  ('e-pirates', 'Pirates League', 'MK', 'experience', 'Pirate-themed makeover with face paint, bandana & sword for kids.', '$60–$130', 95),
  ('e-savis', 'Savi''s Workshop', 'HS', 'experience', 'Build-your-own custom lightsaber experience in Galaxy''s Edge.', '$250 flat', 250),
  ('e-droid', 'Droid Depot', 'HS', 'experience', 'Build-your-own custom droid companion in Galaxy''s Edge.', '$120 flat', 120),
  ('e-wat', 'Wild Africa Trek', 'AK', 'experience', 'Guided backstage safari walk over the savanna with a harnessed bridge crossing.', '$189–$249/pp', 219),
  ('e-giants', 'Caring for Giants', 'AK', 'experience', 'Small-group up-close experience learning about the park''s elephants.', '$35–$45/pp', 40),
  ('e-seeds', 'Behind the Seeds', 'EPCOT', 'experience', 'Guided greenhouse tour of the growing labs behind The Land pavilion.', '$30–$35/pp', 32),
  ('e-viptour', 'VIP Tour', 'All parks', 'experience', 'Private guide who plans your day and gets your party to the front of lines.', '$450–$900/hr', 675),

  ('v-mnsshp', 'Mickey''s Not-So-Scary Halloween Party', 'MK', 'event', 'After-hours hard-ticket event with trick-or-treating, parade & fireworks.', '$99–$184/pp', 141),
  ('v-mvmcp', 'Mickey''s Very Merry Christmas Party', 'MK', 'event', 'After-hours holiday party with snow, parade & exclusive fireworks.', '$99–$189/pp', 144),
  ('v-afterhours', 'Disney After Hours', 'All parks', 'event', 'Low-crowd after-hours access with free snacks & short-to-no lines.', '$139–$184/pp', 161),
  ('v-fireworksdp', 'Fireworks Dessert Party', 'MK', 'event', 'Reserved viewing area plus desserts for the nighttime fireworks show.', '$99–$159/pp', 129),
  ('v-epcotdp', 'EPCOT Dessert Party', 'EPCOT', 'event', 'Reserved viewing plus desserts for EPCOT''s nighttime spectacular.', '$99–$139/pp', 119)
on conflict (id) do update set
  name = excluded.name, park = excluded.park, category = excluded.category,
  description = excluded.description, price_label = excluded.price_label, price_mid = excluded.price_mid;
