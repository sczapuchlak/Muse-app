-- Mindspace Spaces (Nov 26): a space's colour can be any colour or a gradient (Muse's shared paint picker), not only
-- the five theme accents. Additive and nullable: `accent` stays as it is and is still used when `paint` is empty, so
-- every existing space looks exactly as before.
alter table public.lists add column paint jsonb check (paint is null or (jsonb_typeof(paint) = 'object' and pg_column_size(paint) <= 1024));
