-- Deleting an expense that a wish list item is linked to (e.g. from the
-- Itinerary page) previously violated wish_list_items.planned_expense_id's
-- foreign key and failed silently, since nothing cleared the reference
-- first. Deleting an expense should always succeed and just unlink it from
-- the wish list item — the item itself stays saved, simply un-planned.
create or replace function wish_list_clear_planned_expense()
returns trigger
language plpgsql
as $$
begin
  update wish_list_items
  set planned_expense_id = null, planned_day = null
  where planned_expense_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_wish_list_clear_planned_expense on expenses;
create trigger trg_wish_list_clear_planned_expense
  before delete on expenses
  for each row execute function wish_list_clear_planned_expense();
