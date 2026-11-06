-- Stream 2.0 (#69). Additive.
-- 1. Aspirations can be shared (to Celebrating), using the same canonical-reference and missing-source rules as every
--    other source. 2. A small, service-role-only way for the Muse team to review and resolve reports; there is no
--    admin route and ordinary people never see reports. Money milestones stay valid in the database so earlier posts
--    keep rendering; the app simply no longer offers them (see docs/STREAM.md).

-- 1. Aspiration posts ----------------------------------------------------------------------------------------------
do $$declare c text;begin
 -- Replace the two checks that list source kinds and category pairs (found by definition, not by generated name).
 for c in select conname from pg_constraint where conrelid = 'public.stream_posts'::regclass and contype = 'c'
   and (pg_get_constraintdef(oid) like '%source_kind = ANY%' or pg_get_constraintdef(oid) like '%''reading''::text) AND (source_kind = ''book''%')
 loop execute format('alter table public.stream_posts drop constraint %I', c); end loop;
end $$;
alter table public.stream_posts add constraint stream_posts_source_kind check (source_kind is null or source_kind in
 ('book','media','mood','dream','tarot-reading','ritual','side-quest','fortune','astrology','money-milestone','aspiration'));
alter table public.stream_posts add constraint stream_posts_category_source check (kind = 'status' or (category, source_kind) in
 (('reading','book'),('watching','media'),('feeling','mood'),('dreaming','dream'),('celebrating','book'),('celebrating','ritual'),
  ('celebrating','side-quest'),('tarot','tarot-reading'),('side-quests','side-quest'),('rituals','ritual'),('fortunes','fortune'),
  ('astrology','astrology'),('money','money-milestone'),('celebrating','money-milestone'),('celebrating','aspiration')));

create or replace function muse_private.stream_source_exists(owner uuid, kind text, source text) returns boolean language sql stable security definer set search_path = '' as $$
 select case kind
  when 'mood' then exists (select 1 from public.mood_checkins where user_id = owner and id::text = source)
  when 'dream' then exists (select 1 from public.whimsy_dream_entries where user_id = owner and id::text = source)
  when 'tarot-reading' then exists (select 1 from public.whimsy_tarot_readings where user_id = owner and id::text = source)
  when 'fortune' then exists (select 1 from public.whimsy_saved_discoveries where user_id = owner and id::text = source)
  when 'astrology' then exists (select 1 from public.astrology_natal_charts where user_id = owner and id::text = source)
  when 'money-milestone' then exists (select 1 from public.bills where user_id = owner and id::text = source and paid)
   or exists (select 1 from public.cards where user_id = owner and id::text = source)
  when 'aspiration' then exists (select 1 from public.aspirations where user_id = owner and id::text = source)
  else muse_private.showcase_source_exists(owner, kind, source) end;
$$;
create trigger stream_source_deleted after delete on public.aspirations for each row execute function muse_private.stream_source_deleted('aspiration');

-- 2. Report review (service role only) ------------------------------------------------------------------------------
alter table public.stream_reports
 add column resolved_at timestamptz,
 add column resolution text check (resolution is null or resolution in ('no-action','unpublished','comment-removed')),
 add column resolution_note text not null default '' check (char_length(resolution_note) <= 500),
 add constraint stream_reports_resolved check ((resolved_at is null) = (resolution is null));

/** Open (or all) reports with the reported snapshot, for the Muse team's review script. */
create function public.stream_reports_review(p_include_resolved boolean default false) returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id', r.id, 'reason', r.reason, 'note', r.note, 'createdAt', r.created_at, 'resolvedAt', r.resolved_at, 'resolution', r.resolution,
   'postId', p.id, 'postAudience', p.audience, 'postBody', p.body, 'postDisplay', p.display, 'postCreatedAt', p.created_at,
   'commentId', c.id, 'commentBody', c.body,
   'reports', (select count(*) from public.stream_reports x where x.post_id = r.post_id and x.comment_id is not distinct from r.comment_id))
  order by r.created_at), '[]'::jsonb)
 from public.stream_reports r join public.stream_posts p on p.id = r.post_id left join public.stream_comments c on c.id = r.comment_id
 where p_include_resolved or r.resolved_at is null;
$$;

/** Resolve a report: no action, return the post to Only me, or remove the reported comment. Never deletes a post. */
create function public.stream_report_resolve(p_report uuid, p_resolution text, p_note text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.stream_reports;
begin
 select * into r from public.stream_reports where id = p_report for update;
 if not found then raise exception 'Report not found' using errcode = 'P0002'; end if;
 if p_resolution not in ('no-action','unpublished','comment-removed') then raise exception 'Unknown resolution' using errcode = '22023'; end if;
 if p_resolution = 'comment-removed' and r.comment_id is null then raise exception 'This report is about a post, not a comment' using errcode = '22023'; end if;
 if p_resolution = 'unpublished' then
  update public.stream_posts set audience = 'private' where id = r.post_id;
  delete from public.stream_post_members where post_id = r.post_id;
 elsif p_resolution = 'comment-removed' then
  delete from public.stream_comments where id = r.comment_id;
 end if;
 -- Resolve every open report about the same post or comment together.
 update public.stream_reports set resolved_at = clock_timestamp(), resolution = p_resolution, resolution_note = left(coalesce(p_note, ''), 500)
  where resolved_at is null and post_id = r.post_id and comment_id is not distinct from r.comment_id;
 return jsonb_build_object('resolved', true, 'resolution', p_resolution);
end $$;

revoke all on function public.stream_reports_review(boolean), public.stream_report_resolve(uuid,text,text) from public, anon, authenticated;
grant execute on function public.stream_reports_review(boolean), public.stream_report_resolve(uuid,text,text) to service_role;
