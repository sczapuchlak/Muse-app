-- Mindspace shares the Notes owner and records; no parallel board storage.
-- Existing notes retain their theme-default appearance.
alter table public.notes add column accent text check(accent in ('primary','secondary','pop','warm','info'));

create or replace function public.save_notes(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;receipt public.notes_commands;hash bytea;item jsonb;existing public.notes;body text;parent uuid;stamp timestamptz:=clock_timestamp();
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_command_id is null or p_expected_revision is null or jsonb_typeof(p_state)<>'object' or jsonb_typeof(p_state->'notes') is distinct from 'array' or jsonb_typeof(p_state->'tags') is distinct from 'array' or jsonb_typeof(p_state->'links') is distinct from 'array' or octet_length(p_state::text)>8388608 or jsonb_array_length(p_state->'notes')>1000 or jsonb_array_length(p_state->'tags')>500 or jsonb_array_length(p_state->'links')>10000 then raise exception 'Invalid or oversized Notes library' using errcode='22023';end if;
 insert into public.notes_versions(user_id) values(uid) on conflict do nothing;
 select revision into v from public.notes_versions where user_id=uid for update;
 hash:=sha256(convert_to(p_state::text,'UTF8'));
 select * into receipt from public.notes_commands where user_id=uid and id=p_command_id;
 if found then
  if receipt.request_hash<>hash then raise exception 'Notes command reused' using errcode='22023';end if;return receipt.revision;
 end if;
 if v<>p_expected_revision then raise exception 'Notes changed; reload before saving' using errcode='40001';end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_state->'notes'))<>jsonb_array_length(p_state->'notes') or (select count(distinct value->>'id') from jsonb_array_elements(p_state->'tags'))<>jsonb_array_length(p_state->'tags') then raise exception 'Duplicate Notes IDs' using errcode='22023';end if;
 if exists(select 1 from public.notes where user_id=uid and status<>'trashed' and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_state->'notes'))) then raise exception 'Move notes to Trash before permanent deletion' using errcode='22023';end if;
 delete from public.note_tag_links where user_id=uid;
 delete from public.notes where user_id=uid and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_state->'notes'));
 delete from public.note_tags where user_id=uid and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_state->'tags'));
 for item in select value from jsonb_array_elements(p_state->'notes') loop
  if jsonb_typeof(item->'title') is distinct from 'string' or jsonb_typeof(item->'pinned') is distinct from 'boolean' or item->'document'->>'type' is distinct from 'doc' or octet_length((item->'document')::text)>524288 then raise exception 'Invalid note' using errcode='22023';end if;
  if item->>'accent' is not null and item->>'accent' not in ('primary','secondary','pop','warm','info') then raise exception 'Invalid note accent' using errcode='22023';end if;
  body:=rtrim(muse_private.note_text(item->'document'),E'\n');
  select * into existing from public.notes where id=(item->>'id')::uuid;
  if found and existing.user_id<>uid then raise exception 'Note unavailable' using errcode='42501';end if;
  if existing.id is null then
   insert into public.notes(id,user_id,title,document,plain_text,status,trashed_from,trashed_at,pinned,accent) values((item->>'id')::uuid,uid,item->>'title',item->'document',body,item->>'status',item->>'trashedFrom',case when item->>'status'='trashed' then stamp end,(item->>'pinned')::boolean,item->>'accent');
  elsif (existing.title,existing.document,existing.status,existing.pinned,existing.trashed_from,existing.accent) is distinct from (item->>'title',item->'document',item->>'status',(item->>'pinned')::boolean,item->>'trashedFrom',item->>'accent') then
   update public.notes set accent=item->>'accent',title=item->>'title',document=item->'document',plain_text=body,status=item->>'status',pinned=(item->>'pinned')::boolean,trashed_from=item->>'trashedFrom',trashed_at=case when item->>'status'='trashed' then coalesce(trashed_at,stamp) end,updated_at=stamp,revision=revision+1 where id=existing.id and user_id=uid;
  end if;
 end loop;
 for item in select value from jsonb_array_elements(p_state->'tags') loop
  if exists(select 1 from public.note_tags where id=(item->>'id')::uuid and user_id<>uid) then raise exception 'Tag unavailable' using errcode='42501';end if;
  parent:=null;
  if strpos(item->>'path','/')>0 then
   select (value->>'id')::uuid into parent from jsonb_array_elements(p_state->'tags') where value->>'path'=regexp_replace(item->>'path','/[^/]+$','');
   if parent is null then raise exception 'Missing parent tag' using errcode='22023';end if;
  end if;
  insert into public.note_tags(id,user_id,path,parent_id,pinned,icon) values((item->>'id')::uuid,uid,item->>'path',parent,(item->>'pinned')::boolean,item->>'icon') on conflict(id) do update set path=excluded.path,parent_id=excluded.parent_id,pinned=excluded.pinned,icon=excluded.icon where public.note_tags.user_id=uid;
 end loop;
 for item in select value from jsonb_array_elements(p_state->'links') loop
  insert into public.note_tag_links(user_id,note_id,tag_id) values(uid,(item->>'noteId')::uuid,(item->>'tagId')::uuid);
 end loop;
 update public.notes_versions set revision=revision+1 where user_id=uid returning revision into v;
 insert into public.notes_commands values(uid,p_command_id,hash,v);return v;
end $$;
revoke all on function public.save_notes(bigint,uuid,jsonb) from public,anon;grant execute on function public.save_notes(bigint,uuid,jsonb) to authenticated;
