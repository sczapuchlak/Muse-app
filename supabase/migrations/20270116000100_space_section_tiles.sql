-- Mindspace Spaces (Nov 26): a space can hide (or always show) the section tiles at the top of its page.
-- Additive and nullable: null keeps the automatic behaviour (tiles once a space has three or more sections), so every
-- existing space looks exactly as it does today.
alter table public.lists add column section_tiles boolean;
