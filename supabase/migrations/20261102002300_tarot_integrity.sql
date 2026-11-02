-- Validate direct owner-scoped Tarot inserts and the existing reading RPC's payload.
create function muse_private.validate_tarot_daily_draw() returns trigger language plpgsql set search_path='' as $$begin
 if not exists(select 1 from pg_timezone_names where name=new.time_zone) or new.deck_id<>'rws1909' or not exists(select 1 from public.whimsy_content_versions c where c.content_id=new.card_id and c.version=new.card_version and c.experience='tarot' and c.document->>'state'='published') then raise exception 'Invalid daily Tarot draw' using errcode='22023';end if;
 return new;end $$;
revoke all on function muse_private.validate_tarot_daily_draw() from public,anon,authenticated;
create trigger validate_tarot_daily_draw before insert on public.whimsy_tarot_daily_draws for each row execute function muse_private.validate_tarot_daily_draw();
create function muse_private.validate_tarot_reading() returns trigger language plpgsql set search_path='' as $$declare positions int;identities int;count int;begin
 count:=jsonb_array_length(new.payload->'cards');
 if count not between 1 and 5 then raise exception 'Tarot readings contain one to five cards' using errcode='22023';end if;
 select count(distinct (x.value->>'position')::int),count(distinct x.value#>>'{card,contentId}') into positions,identities from jsonb_array_elements(new.payload->'cards') x;
 if positions<>count or identities<>count or exists(select 1 from jsonb_array_elements(new.payload->'cards') x where (x.value->>'position')::int<0 or (x.value->>'position')::int>=count) then raise exception 'Tarot reading positions and cards must be unique' using errcode='22023';end if;
 return new;end $$;
revoke all on function muse_private.validate_tarot_reading() from public,anon,authenticated;
create trigger validate_tarot_reading before insert or update on public.whimsy_tarot_readings for each row execute function muse_private.validate_tarot_reading();
