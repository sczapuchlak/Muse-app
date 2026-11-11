-- #143: native DNF. No book rows, sessions, opinions or import observations are rewritten.
-- The existing writer remains the sole validator/transaction owner; extend just its status allowlist.
do $migration$
declare definition text; before_text text := $old$body->>'status' not in ('planned','reading','finished','paused')$old$;
begin
 select pg_get_functiondef('public.save_whimsy_record(text,bigint,uuid,jsonb,boolean)'::regprocedure) into definition;
 if strpos(definition,before_text)=0 then raise exception 'Unexpected Whimsy validator baseline; review DNF migration'; end if;
 execute replace(definition,before_text,$new$body->>'status' not in ('planned','reading','finished','paused','dnf')$new$);
end $migration$;

-- Starting a session from DNF uses the existing atomic start/discard flow. No previous sessions are edited.
do $migration$
declare definition text; signature text;
begin
 foreach signature in array array['public.start_book_reading_timer(jsonb,bigint,jsonb,uuid)','public.discard_reading_timer(bigint,uuid)'] loop
  select pg_get_functiondef(signature::regprocedure) into definition;
  if strpos(definition,$old$('planned','finished')$old$)=0 then raise exception 'Unexpected timer status baseline: %',signature; end if;
  execute replace(definition,$old$('planned','finished')$old$,$new$('planned','finished','dnf')$new$);
 end loop;
end $migration$;
