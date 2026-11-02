-- Dreamscapes records complement, never replace, the existing Whimsy dream entries.
create table public.whimsy_dream_custom_symbols (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),
 created_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),unique(user_id,name)
);
create table public.whimsy_dream_symbol_meanings (
 user_id uuid not null references auth.users(id) on delete cascade,
 symbol_id text not null,
 meaning text not null check(length(meaning)<=10000),
 revision bigint not null default 1,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(user_id,symbol_id)
);
create table public.whimsy_dream_series (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120),
 revision bigint not null default 1,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id)
);
create table public.whimsy_dream_series_entries (
 user_id uuid not null references auth.users(id) on delete cascade,
 dream_id uuid not null,
 series_id uuid not null,
 linked_at timestamptz not null default clock_timestamp(),
 primary key(user_id,dream_id),
 foreign key(user_id,dream_id) references public.whimsy_dream_entries(user_id,id) on delete cascade,
 foreign key(user_id,series_id) references public.whimsy_dream_series(user_id,id) on delete cascade
);
create index dream_series_entries_group on public.whimsy_dream_series_entries(user_id,series_id);
do $$declare t text;begin foreach t in array array['whimsy_dream_custom_symbols','whimsy_dream_symbol_meanings','whimsy_dream_series','whimsy_dream_series_entries'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
 end loop;end $$;
-- CAS on direct edits: old revision must match; database owns the next revision.
create function muse_private.bump_dream_revision() returns trigger language plpgsql set search_path='' as $$begin
 if new.user_id<>old.user_id or (tg_table_name='whimsy_dream_symbol_meanings' and new.symbol_id<>old.symbol_id) or (tg_table_name='whimsy_dream_series' and new.id<>old.id) then raise exception 'Dream ownership or identity cannot change' using errcode='42501';end if;
 if new.revision<>old.revision then raise exception 'Revision is database managed' using errcode='22023';end if;
 new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;end $$;
revoke all on function muse_private.bump_dream_revision() from public,anon,authenticated;
create trigger bump_dream_meaning before update on public.whimsy_dream_symbol_meanings for each row execute function muse_private.bump_dream_revision();
create trigger bump_dream_series before update on public.whimsy_dream_series for each row execute function muse_private.bump_dream_revision();
-- A custom symbol cannot be reassigned to another account.
create function muse_private.protect_custom_symbol() returns trigger language plpgsql set search_path='' as $$begin
 if new.user_id<>old.user_id or new.id<>old.id then raise exception 'Custom symbol ownership cannot change' using errcode='42501';end if;return new;end $$;
revoke all on function muse_private.protect_custom_symbol() from public,anon,authenticated;
create trigger protect_custom_symbol before update on public.whimsy_dream_custom_symbols for each row execute function muse_private.protect_custom_symbol();
