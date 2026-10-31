-- Standalone Notes only. Planner task notes are deliberately untouched.
create table public.notes_versions(user_id uuid primary key references auth.users on delete cascade,revision bigint not null default 0);
create table public.notes_commands(user_id uuid not null references auth.users on delete cascade,id uuid not null,request_hash bytea not null,revision bigint not null,primary key(user_id,id));
create table public.notes(
 id uuid primary key,user_id uuid not null default auth.uid() references auth.users on delete cascade,
 title text not null check(length(title)<=250),document jsonb not null,plain_text text not null,
 search_vector tsvector generated always as (to_tsvector('simple',title||' '||plain_text)) stored,
 status text not null check(status in ('active','archived','trashed')),trashed_from text check(trashed_from in ('active','archived')),trashed_at timestamptz,
 pinned boolean not null,revision bigint not null default 1,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),unique(user_id,id),
 check((status='trashed')=(trashed_at is not null))
);
create index notes_library on public.notes(user_id,status,pinned,updated_at);
create index notes_search on public.notes using gin(search_vector);
create table public.note_tags(id uuid primary key,user_id uuid not null default auth.uid() references auth.users on delete cascade,path text not null check(length(path) between 1 and 120 and path~'^[[:alnum:]_-]+(/[[:alnum:]_-]+)*$' and path=lower(path)),parent_id uuid,pinned boolean not null,icon text not null check(icon in ('tag','home','notes','meals','calendar')),unique(user_id,id),unique(user_id,path) deferrable initially deferred,foreign key(user_id,parent_id) references public.note_tags(user_id,id) deferrable initially deferred);
create table public.note_tag_links(user_id uuid not null default auth.uid() references auth.users on delete cascade,note_id uuid not null,tag_id uuid not null,primary key(user_id,note_id,tag_id),foreign key(user_id,note_id) references public.notes(user_id,id) on delete cascade,foreign key(user_id,tag_id) references public.note_tags(user_id,id) on delete cascade);
do $$ declare t text;begin foreach t in array array['notes','note_tags','note_tag_links','notes_versions','notes_commands'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 end loop;end $$;

-- Validate the existing editor vocabulary and derive search text on the server.
create or replace function muse_private.note_text(n jsonb,depth integer default 0) returns text language plpgsql immutable set search_path='' as $$
declare kind text:=n->>'type';child jsonb;mark jsonb;attrs jsonb;result text:='';allowed text[];
begin
 if depth>32 or jsonb_typeof(n)<>'object' or kind is null or kind not in ('doc','paragraph','text','heading','bulletList','orderedList','listItem','taskList','taskItem','blockquote','codeBlock','hardBreak','horizontalRule') then raise exception 'Unsupported note document' using errcode='22023';end if;
 if n?'marks' then
  if kind not in ('text','hardBreak') or jsonb_typeof(n->'marks')<>'array' then raise exception 'Invalid note marks' using errcode='22023';end if;
  for mark in select value from jsonb_array_elements(n->'marks') loop
   if mark->>'type' is null or mark->>'type' not in ('bold','italic','underline','strike','code','link') then raise exception 'Unsupported note mark' using errcode='22023';end if;
   if mark->>'type'='link' and (mark#>>'{attrs,href}' is null or mark#>>'{attrs,href}' !~* '^(https?://|mailto:)[^[:space:][:cntrl:]]+$') then raise exception 'Unsafe note link' using errcode='22023';end if;
  end loop;
 end if;
 attrs:=n->'attrs';
 if attrs is not null and jsonb_typeof(attrs)<>'object' then raise exception 'Invalid note attributes' using errcode='22023';end if;
 if kind='heading' and (attrs->>'level' is null or attrs->>'level' not in ('1','2','3')) then raise exception 'Unsupported heading level' using errcode='22023';end if;
 if kind='taskItem' and jsonb_typeof(attrs->'checked') is distinct from 'boolean' then raise exception 'Invalid checklist state' using errcode='22023';end if;
 if kind='text' then
  if jsonb_typeof(n->'text') is distinct from 'string' or length(n->>'text')=0 or n?'content' then raise exception 'Invalid text node' using errcode='22023';end if;return n->>'text';
 end if;
 if kind in ('hardBreak','horizontalRule') then if n?'content' then raise exception 'Invalid leaf node' using errcode='22023';end if;return E'\n';end if;
 if jsonb_typeof(coalesce(n->'content','[]'))<>'array' then raise exception 'Invalid note content' using errcode='22023';end if;
 if kind not in ('paragraph','heading','codeBlock') and jsonb_array_length(coalesce(n->'content','[]'))=0 then raise exception 'Missing block content' using errcode='22023';end if;
 if kind in ('listItem','taskItem') and n#>>'{content,0,type}' is distinct from 'paragraph' then raise exception 'List items start with a paragraph' using errcode='22023';end if;
 allowed:=case when kind in ('paragraph','heading') then array['text','hardBreak'] when kind='codeBlock' then array['text'] when kind in ('bulletList','orderedList') then array['listItem'] when kind='taskList' then array['taskItem'] else array['paragraph','heading','bulletList','orderedList','taskList','blockquote','codeBlock','horizontalRule'] end;
 for child in select value from jsonb_array_elements(coalesce(n->'content','[]')) loop
  if child->>'type' is null or not child->>'type'=any(allowed) then raise exception 'Invalid document nesting' using errcode='22023';end if;
  result:=result||muse_private.note_text(child,depth+1);
 end loop;
 if kind in ('paragraph','heading','codeBlock') then result:=result||E'\n';end if;return result;
end $$;
revoke all on function muse_private.note_text(jsonb,integer) from public,anon,authenticated;

create function public.read_notes() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.notes_versions where user_id=auth.uid()),0),
 'notes',coalesce((select jsonb_agg(to_jsonb(n)-'search_vector') from public.notes n where user_id=auth.uid()),'[]'),
 'tags',coalesce((select jsonb_agg(to_jsonb(t)) from public.note_tags t where user_id=auth.uid()),'[]'),
 'links',coalesce((select jsonb_agg(to_jsonb(l)) from public.note_tag_links l where user_id=auth.uid()),'[]'));
end $$;
revoke all on function public.read_notes() from public,anon;grant execute on function public.read_notes() to authenticated;

-- A bounded atomic library save preserves branch edits and joins together. CAS is
-- deliberately conservative, as in Planner. Idempotency never repeats a create/toggle.
create function public.save_notes(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
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
  body:=rtrim(muse_private.note_text(item->'document'),E'\n');
  select * into existing from public.notes where id=(item->>'id')::uuid;
  if found and existing.user_id<>uid then raise exception 'Note unavailable' using errcode='42501';end if;
  if existing.id is null then
   insert into public.notes(id,user_id,title,document,plain_text,status,trashed_from,trashed_at,pinned) values((item->>'id')::uuid,uid,item->>'title',item->'document',body,item->>'status',item->>'trashedFrom',case when item->>'status'='trashed' then stamp end,(item->>'pinned')::boolean);
  elsif (existing.title,existing.document,existing.status,existing.pinned,existing.trashed_from) is distinct from (item->>'title',item->'document',item->>'status',(item->>'pinned')::boolean,item->>'trashedFrom') then
   update public.notes set title=item->>'title',document=item->'document',plain_text=body,status=item->>'status',pinned=(item->>'pinned')::boolean,trashed_from=item->>'trashedFrom',trashed_at=case when item->>'status'='trashed' then coalesce(trashed_at,stamp) end,updated_at=stamp,revision=revision+1 where id=existing.id and user_id=uid;
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
