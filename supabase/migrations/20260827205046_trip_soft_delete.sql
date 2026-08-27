-- Adds a 'deleted' trip status alongside the existing 'active'/'archived'.
-- Deleting a trip from the user's perspective doesn't remove the row (kept
-- for backend statistics) — it just moves status to 'deleted', which the
-- app excludes from both the active-trips list and the "Trip archive"
-- view, so it's invisible to the user everywhere while the data persists.

alter table trips drop constraint trips_status_check;
alter table trips add constraint trips_status_check
  check (status in ('active', 'archived', 'deleted'));
