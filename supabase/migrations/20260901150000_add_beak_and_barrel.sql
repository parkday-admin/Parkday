-- Missed in the original dining spreadsheet import.
insert into catalog_items (id, name, park, category, description, price_label, price_mid, dining_tier, cuisine, dining_plan_credits) values
  ('d-beak-and-barrel', 'The Beak and Barrel', 'MK', 'restaurant',
   'A pirate tavern in Adventureland near Pirates of the Caribbean, run by Captain Merry Goldwyn and her parrot Rummy. Caribbean-inspired small plates and specialty cocktails (including souvenir skull mugs), with sing-alongs and storytelling. Standing-room bar; seating not guaranteed.',
   '$15–$35/pp', 25, 'lounge_bar', 'Pirate-themed Caribbean cocktails & small plates', 'N/A')
on conflict (id) do update set
  name = excluded.name, park = excluded.park, category = excluded.category,
  description = excluded.description, price_label = excluded.price_label, price_mid = excluded.price_mid,
  dining_tier = excluded.dining_tier, cuisine = excluded.cuisine, dining_plan_credits = excluded.dining_plan_credits;
