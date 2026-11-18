-- Journal: Memory Studio. Additive refinements to the existing memory store (no second engine):
--  * pinned: a memory you want to come first. Retrieval orders pinned memories first inside the same size budget, so
--    pinning never adds tokens or sends every pinned memory with every message.
--  * a "goal" category alongside fact/person/situation/preference/other (categories are for reading, chosen by you).
alter table public.journal_memories add column pinned boolean not null default false;
alter table public.journal_memories drop constraint if exists journal_memories_kind_check;
alter table public.journal_memories add constraint journal_memories_kind_check check (kind in ('fact','person','situation','preference','goal','other'));
create index journal_memories_retrieval on public.journal_memories (user_id, status, pinned desc, updated_at desc);
