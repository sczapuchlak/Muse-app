-- Preserve previously recorded foundation quest weeks when the new draw validates.
create or replace function muse_private.validate_quest_week() returns trigger language plpgsql set search_path='' as $$
declare body jsonb:=new.payload;old_body jsonb;draw_id text;selected_id text;
begin
 -- Preserve foundation-era weeks that predate the six-card draw.
 if not (body?'activeIds') then return new;end if;
 if jsonb_typeof(body->'draws') is distinct from 'array' or jsonb_array_length(body->'draws')<6 or
    jsonb_typeof(body->'activeIds') is distinct from 'array' or jsonb_array_length(body->'activeIds')<>6 or
    jsonb_typeof(body->'selectedIds') is distinct from 'array' or jsonb_array_length(body->'selectedIds')>3 or
    jsonb_typeof(body->'revealedIds') is distinct from 'array' or
    jsonb_typeof(body->'swaps') is distinct from 'array' then
    raise exception 'Invalid weekly draw' using errcode='22023';
 end if;
 if (select count(distinct value) from jsonb_array_elements_text(body->'activeIds'))<>6 or
    (select count(distinct value) from jsonb_array_elements_text(body->'selectedIds'))<>jsonb_array_length(body->'selectedIds') or
    (select count(distinct value) from jsonb_array_elements_text(body->'revealedIds'))<>jsonb_array_length(body->'revealedIds') then
    raise exception 'Duplicate weekly quest' using errcode='22023';
 end if;
 for draw_id in select value from jsonb_array_elements_text(body->'activeIds') loop
   if not exists(select 1 from jsonb_array_elements(body->'draws') d where d->>'contentId'=draw_id) then raise exception 'Active quest was not drawn' using errcode='22023';end if;
 end loop;
 for selected_id in select value from jsonb_array_elements_text(body->'selectedIds') loop
   if not exists(select 1 from jsonb_array_elements(body->'draws') d where d->>'contentId'=selected_id) then raise exception 'Selected quest was not drawn' using errcode='22023';end if;
 end loop;
 if body?'committedAt' then
   if jsonb_array_length(body->'selectedIds')<>3 then raise exception 'Exactly three quests must be sealed' using errcode='22023';end if;
   perform (body->>'committedAt')::timestamptz;
 end if;
 if tg_op='UPDATE' then
   old_body:=old.payload;
   if old_body?'committedAt' then
     if not (body?'committedAt') or body->>'committedAt'<>old_body->>'committedAt' or body->'activeIds'<>old_body->'activeIds' or body->'revealedIds'<>old_body->'revealedIds' then raise exception 'Committed draw cannot be replaced' using errcode='22023';end if;
     if body->'selectedIds'<>old_body->'selectedIds' and jsonb_array_length(body->'swaps')<=jsonb_array_length(old_body->'swaps') then raise exception 'Committed selection requires a recorded swap' using errcode='22023';end if;
   end if;
 end if;
 return new;
end $$;
