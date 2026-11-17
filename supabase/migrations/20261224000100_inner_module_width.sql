-- Inner Compass: a Chapter or Experience module can sit at full width or half width, so two half-width modules share a
-- row and the person can lay out the page the way they want. Order stays in `position`; width is layout only.
-- Existing modules keep today's look (full width). A lone half-width module is shown full width by the app (no gaps).
alter table public.inner_modules
  add column width text not null default 'full' check (width in ('full', 'half'));
