-- Lets an item scheduled from the wish list ("Add to trip") show up on the
-- itinerary with no cost attached at all, rather than a $0 entry — flagged
-- explicitly rather than inferred from a null planned_amt, since a real $0
-- expense (something genuinely free) is a different, legitimate case.
alter table expenses add column if not exists no_cost boolean not null default false;
