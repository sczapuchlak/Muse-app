-- Journal: "Continue from here". A new entry can point at one earlier entry of yours that it continues.
-- References, not copies: the new entry keeps its own conversation, date, tags and analysis; the original is never
-- changed. A name snapshot (title and date) keeps the link readable if the original is later deleted, in which case
-- the reference itself clears (ON DELETE SET NULL on the id only). The composite key means an entry can only
-- continue one of the same person's entries. Many entries may continue the same original. Additive.

alter table public.journal_conversations
 add column continues_id uuid,
 add column continues_title text not null default '' check (char_length(continues_title) <= 200),
 add column continues_date date,
 add constraint journal_conversations_continues_self check (continues_id is null or continues_id <> id),
 add constraint journal_conversations_continues_fkey foreign key (user_id, continues_id)
  references public.journal_conversations (user_id, id) on delete set null (continues_id);

create index journal_conversations_continues on public.journal_conversations (user_id, continues_id) where continues_id is not null;
