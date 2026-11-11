-- Private import receipts and source-attributed observations. A book remains owned by whimsy_books.
create function muse_private.import_title_key(value text) returns text language sql immutable set search_path='' as $$select btrim(regexp_replace(lower(normalize(coalesce(value,''),NFKC)),'[^[:alnum:]]+',' ','g'))$$;
create function muse_private.import_isbn(value text) returns text language plpgsql immutable set search_path='' as $$
declare v text:=regexp_replace(upper(coalesce(value,'')),'[^0-9X]','','g');total integer:=0;i integer;core text;
begin
 if v ~ '^[0-9]{9}[0-9X]$' then
  for i in 1..10 loop total:=total+(case when substr(v,i,1)='X' then 10 else substr(v,i,1)::integer end)*(11-i);end loop;
  if total%11<>0 then return null;end if;core:='978'||substr(v,1,9);total:=0;
  for i in 1..12 loop total:=total+substr(core,i,1)::integer*(case when i%2=0 then 3 else 1 end);end loop;
  return core||((10-total%10)%10)::text;
 elsif v ~ '^97[89][0-9]{10}$' then
  for i in 1..13 loop total:=total+substr(v,i,1)::integer*(case when i%2=0 then 3 else 1 end);end loop;
  if total%10=0 then return v;end if;
 end if;return null;
end$$;
revoke all on function muse_private.import_title_key(text),muse_private.import_isbn(text) from public,anon,authenticated;
grant execute on function muse_private.import_title_key(text),muse_private.import_isbn(text) to authenticated,service_role;
create index whimsy_books_import_isbn on public.whimsy_books(user_id,(muse_private.import_isbn(payload->>'isbn'))) where muse_private.import_isbn(payload->>'isbn') is not null;
create index whimsy_books_import_title_author on public.whimsy_books(user_id,(muse_private.import_title_key(payload->>'title')),(muse_private.import_title_key(payload->>'author')));
create index whimsy_books_import_hardcover on public.whimsy_books(user_id,(payload#>>'{metadataSource,hardcoverId}')) where payload#>>'{metadataSource,hardcoverId}' is not null;
create index whimsy_books_import_volume on public.whimsy_books(user_id,(payload#>>'{metadataSource,volumeId}')) where payload#>>'{metadataSource,volumeId}' is not null;
create table public.book_import_batches (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 source text not null check (length(btrim(source)) between 1 and 80),
 created_at timestamptz not null default clock_timestamp(),
 unique(user_id,id)
);
create table public.book_import_sources (
 user_id uuid not null references auth.users on delete cascade,
 source text not null check (length(btrim(source)) between 1 and 80),
 source_id text not null check (length(btrim(source_id)) between 1 and 300),
 book_id uuid not null,
 batch_id uuid not null,
 observed jsonb not null default '{}'::jsonb check (jsonb_typeof(observed)='object' and octet_length(observed::text)<=100000),
 imported_at timestamptz not null default clock_timestamp(),
 primary key(user_id,source,source_id),
 foreign key(user_id,book_id) references public.whimsy_books(user_id,id) on delete cascade,
 foreign key(user_id,batch_id) references public.book_import_batches(user_id,id) on delete cascade
);
create index book_import_sources_book on public.book_import_sources(user_id,book_id);
-- Stable source-shelf references survive a reader renaming a Muse collection.
create table public.book_import_collection_links (
 user_id uuid not null references auth.users on delete cascade,
 source text not null,
 shelf_key text not null check(length(shelf_key) between 1 and 500),
 collection_id uuid not null,
 primary key(user_id,source,shelf_key),
 foreign key(user_id,collection_id) references public.collection_curated(user_id,id) on delete cascade
);
alter table public.book_import_collection_links enable row level security;
revoke all on public.book_import_collection_links from public,anon,authenticated;
grant select on public.book_import_collection_links to authenticated;
grant all on public.book_import_collection_links to service_role;
create policy import_collection_links_read on public.book_import_collection_links for select to authenticated using ((select auth.uid())=user_id);
-- This does not create a read or session. cycle_id references an existing completion when confidently known.
create table public.book_import_observations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 source text not null,
 source_id text not null,
 book_id uuid not null,
 batch_id uuid not null,
 cycle_id text,
 started_on date,
 finished_on date,
 rating numeric check (rating between 0 and 5),
 review text check (length(review)<=50000),
 details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object' and octet_length(details::text)<=100000),
 observation_hash bytea not null,
 imported_at timestamptz not null default clock_timestamp(),
 foreign key(user_id,source,source_id) references public.book_import_sources(user_id,source,source_id) on delete cascade,
 foreign key(user_id,batch_id) references public.book_import_batches(user_id,id) on delete cascade,
 foreign key(user_id,book_id) references public.whimsy_books(user_id,id) on delete cascade,
 check (started_on is null or finished_on is null or started_on<=finished_on)
);
create unique index book_import_observation_unique on public.book_import_observations(user_id,source,source_id,observation_hash);
alter table public.book_import_batches enable row level security;
alter table public.book_import_sources enable row level security;
alter table public.book_import_observations enable row level security;
revoke all on public.book_import_batches,public.book_import_sources,public.book_import_observations from public,anon,authenticated;
grant select on public.book_import_batches,public.book_import_sources,public.book_import_observations to authenticated;
grant all on public.book_import_batches,public.book_import_sources,public.book_import_observations to service_role;
create policy import_batches_read on public.book_import_batches for select to authenticated using ((select auth.uid())=user_id);
create policy import_sources_read on public.book_import_sources for select to authenticated using ((select auth.uid())=user_id);
create policy import_observations_read on public.book_import_observations for select to authenticated using ((select auth.uid())=user_id);

-- Atomic per-book writes: retries use the same command id; a failed receipt rolls back every write.
create function public.save_imported_book(p_batch uuid,p_source text,p_source_id text,p_book jsonb,p_revision bigint,p_observed jsonb,p_observation jsonb,p_command_id uuid,p_series jsonb default null,p_shelves text[] default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();bid uuid;existing uuid;result jsonb;hash bytea;receipt public.whimsy_commands;book_row public.whimsy_books;member public.collection_series_members;sid uuid;series_state text:='none';shelf text;cid uuid;matches integer;body jsonb;collection_attention integer:=0;protected_field text;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_batch is null or p_command_id is null or p_revision is null or p_revision<0 or length(btrim(coalesce(p_source,''))) not between 1 and 80 or length(btrim(coalesce(p_source_id,''))) not between 1 and 300 or jsonb_typeof(p_book) is distinct from 'object' or jsonb_typeof(p_observed) is distinct from 'object' or octet_length(p_observed::text)>100000 or (p_observation is not null and (jsonb_typeof(p_observation) is distinct from 'object' or octet_length(p_observation::text)>100000)) or coalesce(cardinality(p_shelves),0)>100 or (p_series is not null and jsonb_typeof(p_series) is distinct from 'object') then raise exception 'Invalid import command' using errcode='22023';end if;
 bid:=(p_book->>'id')::uuid;
 if bid is null then raise exception 'Book required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('muse.whimsy.'||uid::text,0));
 hash:=sha256(convert_to(jsonb_build_array('importBook',p_batch,p_source,p_source_id,p_book,p_revision,p_observed,p_observation,p_series,p_shelves)::text,'UTF8'));
 select * into receipt from public.whimsy_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Command reused' using errcode='22023';end if;return receipt.result;end if;
 select book_id into existing from public.book_import_sources where user_id=uid and source=p_source and source_id=p_source_id;
 if existing is not null and existing<>bid then raise exception 'Source already belongs to another book' using errcode='23505';end if;
 -- Recheck under the same per-owner lock used by book writes. A preview can become stale on another device.
 if p_revision=0 and exists(select 1 from public.whimsy_books b where b.user_id=uid and b.id<>bid and (
  (muse_private.import_isbn(p_book->>'isbn') is not null and muse_private.import_isbn(b.payload->>'isbn')=muse_private.import_isbn(p_book->>'isbn'))
  or (nullif(muse_private.import_title_key(p_book->>'author'),'') is not null and muse_private.import_title_key(b.payload->>'title')=muse_private.import_title_key(p_book->>'title') and muse_private.import_title_key(b.payload->>'author')=muse_private.import_title_key(p_book->>'author'))
  or (muse_private.import_title_key(b.payload->>'title')=muse_private.import_title_key(p_book->>'title') and (nullif(muse_private.import_title_key(p_book->>'author'),'') is null or nullif(muse_private.import_title_key(b.payload->>'author'),'') is null))
  or (nullif(p_book#>>'{metadataSource,hardcoverId}','') is not null and b.payload#>>'{metadataSource,hardcoverId}'=p_book#>>'{metadataSource,hardcoverId}')
  or (nullif(p_book#>>'{metadataSource,volumeId}','') is not null and b.payload#>>'{metadataSource,volumeId}'=p_book#>>'{metadataSource,volumeId}')
 )) then raise exception 'Possible existing book; review the match' using errcode='23505';end if;
 insert into public.book_import_batches(id,user_id,source) values(p_batch,uid,p_source) on conflict(id) do nothing;
 if not exists(select 1 from public.book_import_batches where id=p_batch and user_id=uid and source=p_source) then raise exception 'Import batch unavailable' using errcode='42501';end if;
 select * into book_row from public.whimsy_books where user_id=uid and id=bid for update;
 if coalesce(book_row.revision,0)<>p_revision then raise exception 'Book changed since preview; review again' using errcode='PT409';end if;
 body:=p_book-'id'-'userId'-'revision'-'createdAt'-'updatedAt';
 if book_row.id is not null then
  foreach protected_field in array array['status','cycleId','startedOn','finishedOn','currentPage','startingPage','positionUpdatedAt','positionDate','archivedAt','reviewEmojis'] loop
   if book_row.payload->protected_field is distinct from body->protected_field then raise exception 'Import must preserve Muse reading state; use the book controls to change it' using errcode='22023';end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(coalesce(book_row.payload->'completions','[]')) old_read where not exists(select 1 from jsonb_array_elements(coalesce(body->'completions','[]')) kept_read where kept_read->>'id'=old_read->>'id' and kept_read->'finishedOn' is not distinct from old_read->'finishedOn' and kept_read->'startedOn' is not distinct from old_read->'startedOn')) then raise exception 'Import must preserve existing Muse reads' using errcode='22023';end if;
  foreach protected_field in array array['rating','finalThoughts'] loop
   if book_row.payload?protected_field and book_row.payload->protected_field is distinct from body->protected_field and p_observation#>array['museBefore',protected_field] is distinct from book_row.payload->protected_field then raise exception 'Review an opinion replacement explicitly before importing it' using errcode='22023';end if;
  end loop;
 end if;
 if book_row.id is not null and book_row.payload=body then result:=jsonb_build_object('sourceId',bid,'revision',book_row.revision,'deleted',false);
 else result:=public.save_whimsy_record('books',p_revision,gen_random_uuid(),p_book,false);end if;
 insert into public.book_import_sources(user_id,source,source_id,book_id,batch_id,observed) values(uid,p_source,p_source_id,bid,p_batch,p_observed)
 on conflict(user_id,source,source_id) do update set batch_id=excluded.batch_id,observed=excluded.observed,imported_at=clock_timestamp();
 if p_observation is not null then
  if nullif(p_observation->>'cycleId','') is not null and not exists (
   select 1 from public.whimsy_books b cross join lateral jsonb_array_elements(coalesce(b.payload->'completions','[]'::jsonb)) c
   where b.user_id=uid and b.id=bid and c->>'id'=p_observation->>'cycleId'
  ) then raise exception 'Reading occurrence is unavailable' using errcode='23503';end if;
  insert into public.book_import_observations(user_id,source,source_id,book_id,batch_id,cycle_id,started_on,finished_on,rating,review,details,observation_hash)
  values(uid,p_source,p_source_id,bid,p_batch,nullif(p_observation->>'cycleId',''),nullif(p_observation->>'startedOn','')::date,nullif(p_observation->>'finishedOn','')::date,nullif(p_observation->>'rating','')::numeric,nullif(p_observation->>'review',''),p_observation,sha256(convert_to(p_observation::text,'UTF8')))
  on conflict do nothing;
 end if;
 -- Series membership is optional. A stale/hidden/manual relationship is kept and reported for review.
 if p_series is not null then
  sid:=(p_series->>'seriesId')::uuid;series_state:='review';
  perform 1 from public.collection_series where user_id=uid and id=sid and kind in ('book','mixed') for update;
  if found then
   if exists(select 1 from public.collection_series_members where user_id=uid and series_id=sid and book_id=bid) then series_state:='existing';
   elsif nullif(p_series->>'memberId','') is not null then
    select * into member from public.collection_series_members where user_id=uid and id=(p_series->>'memberId')::uuid and series_id=sid for update;
    if member.id is not null and member.revision=(p_series->>'revision')::bigint and member.book_id is null and member.media_id is null and not member.hidden and not member.manual_override then
     update public.collection_series_members set book_id=bid where user_id=uid and id=member.id;series_state:='connected';
    end if;
   elsif not exists(select 1 from public.collection_series_members where user_id=uid and series_id=sid and catalog_source=p_series->>'catalogSource' and catalog_id=p_series->>'catalogId') and p_series->>'catalogSource' in ('hardcover','wikidata','open-library') and nullif(p_series->>'catalogId','') is not null and (p_series->>'sequence')::numeric between 0 and 999999 and p_series->>'role' in ('mainline','optional','spin-off','collection') then
    insert into public.collection_series_members(id,user_id,series_id,book_id,sequence,position_known,role,release_state,catalog_source,catalog_id,catalog_title,catalog_author)
    values(gen_random_uuid(),uid,sid,bid,(p_series->>'sequence')::numeric,coalesce((p_series->>'positionKnown')::boolean,false),p_series->>'role',case when p_series->>'releaseState' in ('released','announced') then p_series->>'releaseState' else 'unknown' end,p_series->>'catalogSource',p_series->>'catalogId',body->>'title',coalesce(body->>'author',''));series_state:='connected';
   end if;
  end if;
 end if;
 foreach shelf in array coalesce(p_shelves,'{}') loop
  if length(btrim(shelf)) not between 1 and 500 then raise exception 'Invalid collection name' using errcode='22023';end if;
  select collection_id into cid from public.book_import_collection_links where user_id=uid and source=p_source and shelf_key=lower(btrim(shelf));
  if cid is null then
   select count(*),min(id::text)::uuid into matches,cid from public.collection_curated where user_id=uid and lower(btrim(title))=lower(btrim(shelf));
   if matches=0 then cid:=gen_random_uuid();insert into public.collection_curated(id,user_id,title) values(cid,uid,btrim(shelf));end if;
   if matches<=1 then insert into public.book_import_collection_links values(uid,p_source,lower(btrim(shelf)),cid);else collection_attention:=collection_attention+1;end if;
  end if;
  if cid is not null and coalesce(matches,0)<=1 then insert into public.collection_curated_members(id,user_id,collection_id,book_id,position) select gen_random_uuid(),uid,cid,bid,coalesce(max(position)+1,0) from public.collection_curated_members where user_id=uid and collection_id=cid on conflict do nothing;end if;
  matches:=null;
 end loop;
 result:=result||jsonb_build_object('seriesState',series_state,'collectionAttention',collection_attention);
 insert into public.whimsy_commands values(uid,p_command_id,hash,result);return result;
end$$;
revoke all on function public.save_imported_book(uuid,text,text,jsonb,bigint,jsonb,jsonb,uuid,jsonb,text[]) from public,anon;
grant execute on function public.save_imported_book(uuid,text,text,jsonb,bigint,jsonb,jsonb,uuid,jsonb,text[]) to authenticated;
