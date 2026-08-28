-- Trip duplication ("Use as Template") — a duplicated trip points back at
-- its source via duplicated_from, and tracks whether the Budget page's
-- stale-budget-targets banner has been dismissed for it.
alter table trips
  add column if not exists duplicated_from uuid references trips(id) on delete set null,
  add column if not exists staleness_banner_dismissed boolean not null default false;
