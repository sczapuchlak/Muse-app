-- Journal: photos attached to one of your messages (up to 7). They belong to that message, show with it in the
-- conversation, and are sent to the AI only with the request that answers that message. Files live in the existing
-- private `constellation-images` bucket under the owner's folder for the entry (<user>/<conversation>/...), the same
-- place entry photos use. Additive; no existing table changes.

create table public.journal_message_images (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 conversation_id uuid not null,
 message_id uuid not null,
 position smallint not null check (position between 0 and 6),
 path text not null check (char_length(path) between 3 and 400),
 thumbnail_path text not null check (char_length(thumbnail_path) between 3 and 400),
 width integer not null check (width between 1 and 20000),
 height integer not null check (height between 1 and 20000),
 mime text not null check (mime in ('image/webp','image/jpeg','image/png')),
 created_at timestamptz not null default now(),
 unique (user_id, id),
 unique (message_id, position),
 check (path like user_id::text || '/' || conversation_id::text || '/%' and thumbnail_path like user_id::text || '/' || conversation_id::text || '/%'),
 foreign key (user_id, conversation_id) references public.journal_conversations (user_id, id) on delete cascade,
 foreign key (user_id, message_id) references public.journal_messages (user_id, id) on delete cascade
);
create index journal_message_images_by_conversation on public.journal_message_images (user_id, conversation_id);

alter table public.journal_message_images enable row level security;
create policy journal_message_images_select on public.journal_message_images for select to authenticated using (user_id = (select auth.uid()));
-- Only on your own message in that conversation, and only while the entry is open.
create policy journal_message_images_insert on public.journal_message_images for insert to authenticated with check (
 user_id = (select auth.uid())
 and exists (select 1 from public.journal_messages m join public.journal_conversations c on c.id = m.conversation_id and c.user_id = m.user_id
  where m.id = message_id and m.user_id = (select auth.uid()) and m.conversation_id = journal_message_images.conversation_id and m.role = 'user' and c.status <> 'completed'));
create policy journal_message_images_delete on public.journal_message_images for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.journal_message_images from anon;
grant select, insert, delete on public.journal_message_images to authenticated;
grant all on public.journal_message_images to service_role;
