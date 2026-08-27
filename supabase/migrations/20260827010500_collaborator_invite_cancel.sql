-- "Cancel invite" in Account Settings deletes the invite record directly
-- from the client (owner canceling their own pending invite) — this needs
-- an RLS delete policy, scoped to only their own still-pending invites.
drop policy if exists "Owner can cancel own pending invite" on collaborator_invites;
create policy "Owner can cancel own pending invite"
  on collaborator_invites for delete
  using (auth.uid() = owner_id and status = 'pending');
