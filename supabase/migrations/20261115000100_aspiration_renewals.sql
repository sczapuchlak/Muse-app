-- Aspiration renewals (#54): renewing a monthly, quarterly or yearly aspiration creates a new aspiration for the next
-- period that points back to the one it renews. The original keeps its own progress, journal and completion; nothing
-- is reset or overwritten. Additive.
alter table public.aspirations add column renewed_from uuid references public.aspirations on delete set null;
alter table public.aspirations add constraint aspirations_not_self_renewal check (renewed_from is null or renewed_from <> id);
create unique index aspirations_one_renewal on public.aspirations (renewed_from) where renewed_from is not null;

-- A renewal can only point at the same person's aspiration.
create function muse_private.aspiration_renewal_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.renewed_from is not null and not exists (select 1 from public.aspirations a where a.id = new.renewed_from and a.user_id = new.user_id) then
  raise exception 'Aspiration unavailable' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function muse_private.aspiration_renewal_owner() from public, anon, authenticated;
create trigger aspiration_renewal_owner before insert or update of renewed_from on public.aspirations for each row execute function muse_private.aspiration_renewal_owner();
