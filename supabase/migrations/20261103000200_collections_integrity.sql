-- Keep typed Collections relationships consistent even for direct authenticated API writes.
create or replace function public.collection_validate_episode()
returns trigger language plpgsql set search_path = public as $$
begin
 if not exists (select 1 from public.collection_media_items m where m.id=new.show_id and m.user_id=new.user_id and m.kind='tv') then
  raise exception 'Episodes require an owned TV show';
 end if;
 return new;
end $$;
create trigger collection_episode_kind before insert or update of show_id,user_id on public.collection_tv_episodes
for each row execute function public.collection_validate_episode();

create or replace function public.collection_validate_activity()
returns trigger language plpgsql set search_path = public as $$
declare media_kind text; episode_show uuid;
begin
 select kind into media_kind from public.collection_media_items where id=new.media_id and user_id=new.user_id;
 if media_kind is null then raise exception 'Activity requires an owned media item'; end if;
 if new.kind in ('episode-watch','episode-rewatch') then
  select show_id into episode_show from public.collection_tv_episodes where id=new.episode_id and user_id=new.user_id;
  if media_kind<>'tv' or episode_show is distinct from new.media_id then raise exception 'Episode activity must match its TV show'; end if;
 elsif new.episode_id is not null then raise exception 'Only episode activity can reference an episode';
 elsif new.kind in ('watch','rewatch') and media_kind<>'movie' then raise exception 'Movie activity requires a movie';
 elsif new.kind in ('play','replay') and media_kind<>'game' then raise exception 'Game activity requires a game';
 end if;
 return new;
end $$;
create trigger collection_activity_kind before insert or update of media_id,episode_id,kind,user_id on public.collection_activity
for each row execute function public.collection_validate_activity();

create or replace function public.collection_validate_series_member()
returns trigger language plpgsql set search_path = public as $$
declare series_kind text; media_kind text;
begin
 select kind into series_kind from public.collection_series where id=new.series_id and user_id=new.user_id;
 if series_kind is null then raise exception 'Installment requires an owned series'; end if;
 if new.book_id is not null then media_kind:='book';
 else select kind into media_kind from public.collection_media_items where id=new.media_id and user_id=new.user_id; end if;
 if series_kind<>'mixed' and series_kind is distinct from media_kind then raise exception 'Installment type must match the series'; end if;
 return new;
end $$;
create trigger collection_series_member_kind before insert or update of series_id,book_id,media_id,user_id on public.collection_series_members
for each row execute function public.collection_validate_series_member();

create or replace function public.swap_collection_members(p_first uuid,p_second uuid,p_first_revision integer,p_second_revision integer)
returns void language plpgsql security invoker set search_path=public as $$
declare a public.collection_curated_members%rowtype; b public.collection_curated_members%rowtype; changed integer;
begin
 if p_first=p_second then return; end if;
 select * into a from public.collection_curated_members where id=p_first and user_id=auth.uid() for update;
 select * into b from public.collection_curated_members where id=p_second and user_id=auth.uid() for update;
 if a.id is null or b.id is null or a.collection_id<>b.collection_id or a.revision<>p_first_revision or b.revision<>p_second_revision then
  raise exception 'Collection order changed; reload before retrying';
 end if;
 update public.collection_curated_members set position=case id when p_first then b.position else a.position end
 where id in (p_first,p_second) and user_id=auth.uid();
 get diagnostics changed=row_count;
 if changed<>2 then raise exception 'Collection order could not be saved'; end if;
end $$;
revoke all on function public.swap_collection_members(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.swap_collection_members(uuid,uuid,integer,integer) to authenticated;
