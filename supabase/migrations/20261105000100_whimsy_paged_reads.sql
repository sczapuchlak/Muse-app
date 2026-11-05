-- Whimsy paged reads. Additive only: no table, column or row is changed or removed.
-- read_whimsy (one call, 5,000-record ceiling) stays as-is for already-deployed clients; new clients read every
-- record through read_whimsy_page and confirm writes with read_whimsy_record, so statistics stay complete and an
-- unrelated large Whimsy history can no longer block reading saves or leave a timer stuck.

do $$declare t text;begin
 foreach t in array array['whimsy_quest_weeks','whimsy_quest_completions','whimsy_tarot_readings','whimsy_card_meanings','whimsy_dream_entries','whimsy_fortune_assignments','whimsy_saved_discoveries','whimsy_books','whimsy_reading_sessions','whimsy_reading_goals','whimsy_widget_preferences'] loop
  execute format('create index if not exists %I on public.%I(user_id,created_at,id)',t||'_owner_created_idx',t);
 end loop;
end$$;

-- One page of one Whimsy record kind for the signed-in owner, in stable (created_at, id) order.
-- The cursor is the last row's exact createdAt text and id; callers pass them back unchanged.
create function public.read_whimsy_page(p_kind text,p_after_created_at timestamptz default null,p_after_id uuid default null,p_limit integer default 1000)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare t text:=muse_private.whimsy_table(p_kind);lim integer:=least(greatest(coalesce(p_limit,1000),1),1000);rows jsonb;last_row jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if t is null or ((p_after_created_at is null)<>(p_after_id is null)) then raise exception 'Invalid Whimsy page' using errcode='22023';end if;
 execute format('select coalesce(jsonb_agg(r.payload||jsonb_build_object(''id'',r.id,''userId'',r.user_id,''revision'',r.revision,''createdAt'',r.created_at,''updatedAt'',r.updated_at) order by r.created_at,r.id),''[]''::jsonb) from (select * from public.%I where user_id=$1 and ($2::timestamptz is null or (created_at,id)>($2,$3)) order by created_at,id limit $4) r',t)
  into rows using auth.uid(),p_after_created_at,p_after_id,lim;
 last_row:=case when jsonb_array_length(rows)=lim then rows->-1 end;
 return jsonb_build_object('rows',rows,'next',case when last_row is null then null else jsonb_build_object('createdAt',last_row->'createdAt','id',last_row->'id') end);
end $$;
revoke all on function public.read_whimsy_page(text,timestamptz,uuid,integer) from public,anon;
grant execute on function public.read_whimsy_page(text,timestamptz,uuid,integer) to authenticated;

-- One record (or null) for the signed-in owner; used to confirm a write without reloading the whole library.
create function public.read_whimsy_record(p_kind text,p_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare t text:=muse_private.whimsy_table(p_kind);result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if t is null or p_id is null then raise exception 'Invalid Whimsy record' using errcode='22023';end if;
 execute format('select r.payload||jsonb_build_object(''id'',r.id,''userId'',r.user_id,''revision'',r.revision,''createdAt'',r.created_at,''updatedAt'',r.updated_at) from public.%I r where r.user_id=$1 and r.id=$2',t)
  into result using auth.uid(),p_id;
 return result;
end $$;
revoke all on function public.read_whimsy_record(text,uuid) from public,anon;
grant execute on function public.read_whimsy_record(text,uuid) to authenticated;
