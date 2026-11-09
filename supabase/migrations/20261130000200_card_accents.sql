-- Payment card accents (#12): an optional, user-chosen color per card, carried into Spending rows that used the card.
-- Additive and nullable (no color = Muse picks a stable one from the card's position). Appearance only: it is kept
-- outside the Money revision so save_money stays unchanged and never overwrites it.
alter table public.cards
  add column accent text check (accent is null or accent in ('primary', 'secondary', 'pop', 'warm', 'info') or accent ~ '^#[0-9a-fA-F]{6}$');

create or replace function public.set_card_accents(p_accents jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); item jsonb;
begin
  if uid is null then raise exception 'Sign in to save' using errcode = '42501'; end if;
  if jsonb_typeof(p_accents) <> 'array' or jsonb_array_length(p_accents) > 200 then raise exception 'Invalid card colors' using errcode = '22023'; end if;
  for item in select value from jsonb_array_elements(p_accents) loop
    update public.cards set accent = nullif(item->>'accent', '') where user_id = uid and id = (item->>'id')::uuid;
  end loop;
end $$;
revoke all on function public.set_card_accents(jsonb) from public, anon;
grant execute on function public.set_card_accents(jsonb) to authenticated;
