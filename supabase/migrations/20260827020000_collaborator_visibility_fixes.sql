-- Two visibility gaps found after the first real invite acceptance:
--
-- 1. The owner had no RLS read access to their collaborator's profile row
--    (profiles RLS was strictly auth.uid() = id), so the Account Settings
--    "Collaborator" card's fetchCollaborator() query silently returned
--    nothing even though the collaborator link existed.
-- 2. Account-level data (family_members, and — checked while here —
--    gift_cards/reward_programs/reminders) is fetched and created by the
--    app scoped to session.user.id, which for a collaborator is their own
--    id, not the owner's. family_members RLS was owner-only.

drop policy if exists "Owner can view their collaborator's profile" on profiles;
create policy "Owner can view their collaborator's profile"
  on profiles for select
  using (collaborator_of = auth.uid());

drop policy if exists "Users manage own family members" on family_members;
drop policy if exists "Users and collaborators manage family members" on family_members;
create policy "Users and collaborators manage family members"
  on family_members for all
  using (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = family_members.user_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() in (select id from profiles where collaborator_of = family_members.user_id)
  );
