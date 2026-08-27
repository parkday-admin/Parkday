-- packing_items and reminders were missed in the original collaborator RLS
-- pass (neither was in the brief's table list, same oversight as
-- family_members) — the app already scopes both to the account owner's id
-- via AppShell's ownerId resolution, but RLS was still owner-only, so a
-- collaborator's reads returned nothing and any auto-generated insert
-- (system reminders, default packing rows) was silently rejected.

drop policy if exists "Users manage own packing items" on packing_items;
drop policy if exists "Users and collaborators manage packing items" on packing_items;
create policy "Users and collaborators manage packing items"
  on packing_items for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = packing_items.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = packing_items.user_id)
  );

drop policy if exists "Users manage own reminders" on reminders;
drop policy if exists "Users and collaborators manage reminders" on reminders;
create policy "Users and collaborators manage reminders"
  on reminders for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = reminders.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = reminders.user_id)
  );
