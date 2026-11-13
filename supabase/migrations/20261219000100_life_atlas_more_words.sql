-- Life Atlas (#190), round 4: two more prompts on The Year in Your Own Words.
-- Additive: two optional text columns on the year plan (owner-scoped by the table's existing RLS).
alter table public.aspiration_year_plans
 add column proud text not null default '' check (char_length(proud) <= 2000),
 add column letting_go text not null default '' check (char_length(letting_go) <= 2000);

comment on column public.aspiration_year_plans.proud is 'What would make you most proud to say you did, by the end of the year.';
comment on column public.aspiration_year_plans.letting_go is 'What you are ready to let go of, to make room for the year.';
