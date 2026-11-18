-- Money: paycheck actuals reconcile with recorded transactions; bills are occurrences of one recurring definition.
--
-- Approved spec 2026-11-17 ("Paycheck Actuals & Financial Record Cohesion"). Nothing here creates spending, and no
-- existing record's meaning changes:
-- * transactions.bill_id      — optional: the bill occurrence this transaction pays (partial payments add up).
-- * transactions.unplanned    — "not from a paycheck": never matched to a paycheck plan automatically.
-- * transactions.is_transfer  — moving money between your own accounts: not consumption spending.
-- * recurring_commitments.show_in_bills — this recurring definition is a bill: its occurrences appear in Bills.
-- A bill occurrence is stored (as a bills row with recurring_id + due_date) only once something needs saving about
-- it: paid, an amount change, or a link. Displaying an occurrence never creates a record.
alter table public.transactions
  add column bill_id uuid,
  add column unplanned boolean not null default false,
  add column is_transfer boolean not null default false,
  add foreign key (user_id, bill_id) references public.bills (user_id, id) deferrable initially deferred;
create index transactions_by_bill on public.transactions (user_id, bill_id) where bill_id is not null;
alter table public.recurring_commitments add column show_in_bills boolean not null default false;

-- Bills that repeated only as a reminder become one recurring definition (shown in Bills and Recurring); the existing
-- bill stays, unchanged, as that definition's occurrence on its due date, with its paid status.
do $$
declare bl record; rid uuid; touched uuid[] := '{}';
begin
  for bl in select * from public.bills where recurring_id is null and recurrence <> 'once' loop
    rid := gen_random_uuid();
    insert into public.recurring_commitments(id, user_id, captured_time_zone, position, name, amount_cents, amount_behavior, category_id, anchor_date,
      billing_source, card_id, status, note, interval_count, interval_unit, show_in_bills)
    values (rid, bl.user_id, bl.captured_time_zone, coalesce((select max(position) + 1 from public.recurring_commitments where user_id = bl.user_id), 0),
      bl.name, bl.amount_cents, 'fixed', bl.category_id, bl.due_date, 'Bill', bl.card_id, 'active', bl.note, 1,
      case bl.recurrence when 'weekly' then 'week' when 'yearly' then 'year' else 'month' end, true);
    update public.bills set recurring_id = rid where id = bl.id;
    touched := touched || bl.user_id;
  end loop;
  -- A recurring definition that already had a bill pointing at it is a bill too.
  update public.recurring_commitments r set show_in_bills = true where exists (select 1 from public.bills b where b.recurring_id = r.id and b.user_id = r.user_id);
  -- Every open Money tab holds the old state shape; a new revision makes it reload before it can save.
  update public.money_versions set revision = revision + 1;
end $$;

-- save_money / read_money carry the new fields. Each change below replaces one exact, unique fragment of the live
-- definitions and stops the migration if a fragment is missing or repeated, so nothing else in them changes.
create function pg_temp.patch(src text, before text, after text) returns text language plpgsql as $$
declare n integer := (length(src) - length(replace(src, before, ''))) / length(before);
begin
  if n <> 1 then raise exception 'Money function changed shape: expected one %, found %', left(before, 80), n; end if;
  return replace(src, before, after);
end $$;

do $patch$
declare s text := pg_get_functiondef('public.save_money(bigint,uuid,jsonb)'::regprocedure);
  r text := pg_get_functiondef('public.read_money()'::regprocedure);
  flag text := $f$case when jsonb_typeof(item->'%s')='boolean' then item->'%s' else 'false'::jsonb end$f$;
begin
  -- transactions
  s := pg_temp.patch(s, $b$card_id,note,allocation_id) select r.id,r.user_id,r.captured_time_zone,r.position,r.merchant$b$,
                        $a$card_id,note,allocation_id,bill_id,unplanned,is_transfer) select r.id,r.user_id,r.captured_time_zone,r.position,r.merchant$a$);
  s := pg_temp.patch(s, $b$r.card_id,r.note,r.allocation_id from jsonb_populate_record(null::public.transactions$b$,
                        $a$r.card_id,r.note,r.allocation_id,r.bill_id,r.unplanned,r.is_transfer from jsonb_populate_record(null::public.transactions$a$);
  s := pg_temp.patch(s, $b$'allocation_id',item#>'{allocationId}')) r on conflict(id) do update set position=excluded.position,merchant=excluded.merchant$b$,
                        format($a$'allocation_id',item#>'{allocationId}','bill_id',item#>'{billId}','unplanned',%s,'is_transfer',%s)) r on conflict(id) do update set position=excluded.position,merchant=excluded.merchant$a$,
                          format(flag, 'unplanned', 'unplanned'), format(flag, 'transfer', 'transfer')));
  s := pg_temp.patch(s, $b$allocation_id=excluded.allocation_id,updated_at=clock_timestamp() where public.transactions.user_id=uid$b$,
                        $a$allocation_id=excluded.allocation_id,bill_id=excluded.bill_id,unplanned=excluded.unplanned,is_transfer=excluded.is_transfer,updated_at=clock_timestamp() where public.transactions.user_id=uid$a$);
  s := pg_temp.patch(s, $b$public.transactions.note,public.transactions.allocation_id) is distinct from ($b$,
                        $a$public.transactions.note,public.transactions.allocation_id,public.transactions.bill_id,public.transactions.unplanned,public.transactions.is_transfer) is distinct from ($a$);
  s := pg_temp.patch(s, $b$excluded.payment_method_id,excluded.card_id,excluded.note,excluded.allocation_id);$b$,
                        $a$excluded.payment_method_id,excluded.card_id,excluded.note,excluded.allocation_id,excluded.bill_id,excluded.unplanned,excluded.is_transfer);$a$);
  -- recurring definitions
  s := pg_temp.patch(s, $b$end_date,interval_count,interval_unit) select r.id$b$, $a$end_date,interval_count,interval_unit,show_in_bills) select r.id$a$);
  s := pg_temp.patch(s, $b$r.interval_count,r.interval_unit from jsonb_populate_record(null::public.recurring_commitments$b$,
                        $a$r.interval_count,r.interval_unit,r.show_in_bills from jsonb_populate_record(null::public.recurring_commitments$a$);
  s := pg_temp.patch(s, $b$'interval_unit',item#>'{recurrence,unit}')) r on conflict(id)$b$,
                        format($a$'interval_unit',item#>'{recurrence,unit}','show_in_bills',%s)) r on conflict(id)$a$, format(flag, 'showInBills', 'showInBills')));
  s := pg_temp.patch(s, $b$interval_unit=excluded.interval_unit,updated_at=clock_timestamp() where public.recurring_commitments.user_id=uid$b$,
                        $a$interval_unit=excluded.interval_unit,show_in_bills=excluded.show_in_bills,updated_at=clock_timestamp() where public.recurring_commitments.user_id=uid$a$);
  s := pg_temp.patch(s, $b$public.recurring_commitments.interval_unit) is distinct from ($b$,
                        $a$public.recurring_commitments.interval_unit,public.recurring_commitments.show_in_bills) is distinct from ($a$);
  s := pg_temp.patch(s, $b$excluded.end_date,excluded.interval_count,excluded.interval_unit);$b$,
                        $a$excluded.end_date,excluded.interval_count,excluded.interval_unit,excluded.show_in_bills);$a$);
  -- reading
  r := pg_temp.patch(r, $b$'allocationId',m.allocation_id,'splits'$b$,
                        $a$'allocationId',m.allocation_id,'billId',m.bill_id,'unplanned',nullif(m.unplanned,false),'transfer',nullif(m.is_transfer,false),'splits'$a$);
  r := pg_temp.patch(r, $b$'endDate',m.end_date,'recurrence',jsonb_build_object('interval',m.interval_count,'unit',m.interval_unit)$b$,
                        $a$'endDate',m.end_date,'showInBills',nullif(m.show_in_bills,false),'recurrence',jsonb_build_object('interval',m.interval_count,'unit',m.interval_unit)$a$);
  execute s;
  execute r;
end $patch$;
