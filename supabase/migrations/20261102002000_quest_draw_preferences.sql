-- Owner-scoped draw settings; no sample preferences are seeded.
create table public.whimsy_quest_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 experience text not null check (experience in ('surprise','balance','vibe')),
 vibe text not null check (vibe in ('Cozy','Adventurous','Creative','Social','Chaos Goblin')),
 revision bigint not null default 1,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.whimsy_quest_preferences enable row level security;
revoke all on public.whimsy_quest_preferences from anon,authenticated;
grant select on public.whimsy_quest_preferences to authenticated;
create policy owner_read on public.whimsy_quest_preferences for select to authenticated using ((select auth.uid())=user_id);
grant select on public.whimsy_quest_preferences to service_role;

create function public.read_quest_preference() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('experience',experience,'vibe',vibe,'revision',revision) from public.whimsy_quest_preferences where user_id=(select auth.uid())
$$;
revoke all on function public.read_quest_preference() from public,anon;
grant execute on function public.read_quest_preference() to authenticated;

create function public.save_quest_preference(p_experience text,p_vibe text,p_expected_revision bigint,p_command_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); old_revision bigint; body jsonb; hash bytea; receipt public.whimsy_commands; result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_experience not in ('surprise','balance','vibe') or p_vibe not in ('Cozy','Adventurous','Creative','Social','Chaos Goblin') or p_expected_revision is null or p_expected_revision<0 or p_command_id is null then raise exception 'Invalid draw preference' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('muse.whimsy.'||uid::text,0));
 body:=jsonb_build_object('experience',p_experience,'vibe',p_vibe);
 hash:=sha256(convert_to(jsonb_build_array('questPreference',p_expected_revision,body)::text,'UTF8'));
 select * into receipt from public.whimsy_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Command reused' using errcode='22023';end if;return receipt.result;end if;
 select revision into old_revision from public.whimsy_quest_preferences where user_id=uid for update;
 if coalesce(old_revision,0)<>p_expected_revision then raise exception 'Draw preference changed elsewhere' using errcode='40001';end if;
 if old_revision is null then insert into public.whimsy_quest_preferences(user_id,experience,vibe) values(uid,p_experience,p_vibe);result:=body||jsonb_build_object('revision',1);
 else update public.whimsy_quest_preferences set experience=p_experience,vibe=p_vibe,revision=revision+1,updated_at=clock_timestamp() where user_id=uid returning body||jsonb_build_object('revision',revision) into result;end if;
 insert into public.whimsy_commands values(uid,p_command_id,hash,result);
 return result;
end $$;
revoke all on function public.save_quest_preference(text,text,bigint,uuid) from public,anon;
grant execute on function public.save_quest_preference(text,text,bigint,uuid) to authenticated;
