-- Journal: Highlights. The saved passages ("bookmarks") already belong to one entry and one message, with an excerpt
-- and a note; they become highlights rather than a second, parallel table (one home per record). Additive:
--  * an optional position inside the message (start/end), used only while the message still has exactly that text;
--  * updated_at for note edits;
--  * optional My tags on a highlight (journal_highlight_tags), reusing the person's own custom tags.
-- The quote itself is always kept as captured, so a later correction never moves it onto the wrong words.

alter table public.journal_bookmarks
 add column start_offset integer,
 add column end_offset integer,
 add column updated_at timestamptz not null default now(),
 add constraint journal_bookmarks_range check ((start_offset is null and end_offset is null) or (start_offset >= 0 and end_offset > start_offset and end_offset <= 100000)),
 add constraint journal_bookmarks_user_id_id_key unique (user_id, id);

create table public.journal_highlight_tags (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 highlight_id uuid not null,
 tag_id uuid not null,
 created_at timestamptz not null default now(),
 primary key (user_id, highlight_id, tag_id),
 foreign key (user_id, highlight_id) references public.journal_bookmarks (user_id, id) on delete cascade,
 foreign key (user_id, tag_id) references public.journal_tags (user_id, id) on delete cascade
);
create index journal_highlight_tags_by_tag on public.journal_highlight_tags (user_id, tag_id);

alter table public.journal_highlight_tags enable row level security;
create policy journal_highlight_tags_select on public.journal_highlight_tags for select to authenticated using (user_id = (select auth.uid()));
-- Only your own My tags (custom kind) on your own highlights.
create policy journal_highlight_tags_insert on public.journal_highlight_tags for insert to authenticated with check (
 user_id = (select auth.uid())
 and exists (select 1 from public.journal_tags t where t.id = tag_id and t.user_id = (select auth.uid()) and t.kind = 'custom'));
create policy journal_highlight_tags_delete on public.journal_highlight_tags for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.journal_highlight_tags from anon;
revoke update on public.journal_highlight_tags from authenticated;
grant select, insert, delete on public.journal_highlight_tags to authenticated;
grant all on public.journal_highlight_tags to service_role;

-- A highlight's message must be in that same entry.
create function muse_private.journal_bookmark_check() returns trigger language plpgsql set search_path='' as $$
begin
 if new.message_id is not null and not exists (select 1 from public.journal_messages m where m.id = new.message_id and m.user_id = new.user_id and m.conversation_id = new.conversation_id) then
  raise exception 'That passage isn''t in this entry' using errcode = '22023';
 end if;
 new.updated_at := clock_timestamp();
 return new;
end $$;
create trigger journal_bookmark_check before insert or update on public.journal_bookmarks for each row execute function muse_private.journal_bookmark_check();
