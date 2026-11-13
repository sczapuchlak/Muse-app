-- Run after the #82 migration inside a transaction which will be rolled back.
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000081'),('00000000-0000-0000-0000-000000000082');
insert into public.life_areas (id,user_id,label,position) values
 ('10000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000081','First',0),
 ('10000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000082','Private',0);
insert into public.aspirations (id,user_id,title,start_date,progress_kind) values
 ('20000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000081','A',current_date,'binary');
insert into public.vision_boards (id,user_id,title) values
 ('30000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000081','My board'),
 ('30000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000082','Private board');
insert into public.whimsy_books (id,user_id,payload) values
 ('40000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000081','{"title":"My book"}'),
 ('40000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000082','{"title":"Private book"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000081',true);
select public.set_aspiration_primary_area('20000000-0000-0000-0000-000000000081','10000000-0000-0000-0000-000000000081');
insert into public.aspiration_books (aspiration_id,book_id,book_name) values ('20000000-0000-0000-0000-000000000081','40000000-0000-0000-0000-000000000081','My book');
do $$ begin
 begin
  insert into public.aspiration_books (aspiration_id,book_id,book_name) values ('20000000-0000-0000-0000-000000000081','40000000-0000-0000-0000-000000000082','Private book');
  raise exception 'Cross-owner book accepted';
 exception when foreign_key_violation then null; end;
end $$;
reset role;
delete from public.whimsy_books where id='40000000-0000-0000-0000-000000000081';
set local role authenticated;
do $$ begin
 if not exists (select 1 from public.aspiration_books where book_id is null and book_name='My book') then raise exception 'Book snapshot lost on deletion'; end if;
end $$;
do $$ begin
 begin
  update public.aspirations set cover='{"path":"other/cover.webp","thumbnailPath":"other/cover.thumb.webp"}'::jsonb where id='20000000-0000-0000-0000-000000000081';
  raise exception 'Cross-owner cover accepted';
 exception when insufficient_privilege then null; end;
end $$;
update public.aspirations set status='paused',target_date=current_date+30 where id='20000000-0000-0000-0000-000000000081';
update public.aspirations set title='Renamed' where id='20000000-0000-0000-0000-000000000081';
do $$ begin
 if (select count(*) from public.aspiration_life_areas where is_primary) <> 1 then raise exception 'Primary area missing'; end if;
 if (select count(*) from public.aspiration_events) <> 3 then raise exception 'Meaningful journey events incorrect'; end if;
 begin
  perform public.set_aspiration_primary_area('20000000-0000-0000-0000-000000000081','10000000-0000-0000-0000-000000000082');
  raise exception 'Cross-owner area was accepted';
 exception when foreign_key_violation then null; end;
 if (select count(*) from public.aspiration_life_areas where is_primary) <> 1 then raise exception 'Failed assignment did not roll back'; end if;
end $$;
update public.aspirations set target_date=null,target_period='2026/2028' where id='20000000-0000-0000-0000-000000000081';
do $$ begin
 begin
  update public.aspirations set target_period='2028/2026' where id='20000000-0000-0000-0000-000000000081';
  raise exception 'Invalid year range accepted';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000082',true);
do $$ begin
 if exists (select 1 from public.aspiration_events) or exists (select 1 from public.aspiration_life_areas) then raise exception 'Another owner can read private aspiration history'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000081',true);
insert into public.aspiration_year_plans (year,theme) values (2027,'Explore');
update public.aspiration_year_plans set vision_board_id='30000000-0000-0000-0000-000000000081',vision_board_name='My board' where year=2027;
do $$ begin
 begin
  update public.aspiration_year_plans set vision_board_id='30000000-0000-0000-0000-000000000082' where year=2027;
  raise exception 'Cross-owner board accepted';
 exception when foreign_key_violation then null; end;
end $$;
delete from public.vision_boards where id='30000000-0000-0000-0000-000000000081';
do $$ begin
 if not exists (select 1 from public.aspiration_year_plans where year=2027 and vision_board_id is null and vision_board_name='My board') then raise exception 'Board snapshot lost on deletion'; end if;
end $$;
insert into public.aspiration_year_priorities (year,aspiration_id,aspiration_name,area_id,area_name)
 values (2027,'20000000-0000-0000-0000-000000000081','A','10000000-0000-0000-0000-000000000081','First');
do $$ begin
 begin
  insert into public.aspiration_year_priorities (year,aspiration_id,aspiration_name,area_id,area_name)
   values (2027,'20000000-0000-0000-0000-000000000081','A','10000000-0000-0000-0000-000000000081','First');
  raise exception 'Duplicate annual priority accepted';
 exception when unique_violation then null; end;
end $$;
delete from public.aspirations where id='20000000-0000-0000-0000-000000000081';
do $$ begin
 if not exists (select 1 from public.aspiration_year_priorities where aspiration_id is null and aspiration_name='A') then raise exception 'Priority snapshot lost on deletion'; end if;
end $$;
reset role;
