-- Run after the #190 migration inside a transaction which will be rolled back.
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000191'),('00000000-0000-0000-0000-000000000192');
insert into public.life_areas (id,user_id,label,position) values
 ('10000000-0000-0000-0000-000000000191','00000000-0000-0000-0000-000000000191','Fun',0);
insert into public.aspirations (id,user_id,title,start_date,progress_kind) values
 ('20000000-0000-0000-0000-000000000191','00000000-0000-0000-0000-000000000191','Learn to sew',current_date,'milestones'),
 ('20000000-0000-0000-0000-000000000192','00000000-0000-0000-0000-000000000191','Make a cosplay',current_date,'binary'),
 ('20000000-0000-0000-0000-000000000193','00000000-0000-0000-0000-000000000192','Private',current_date,'binary');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000191',true);

-- The year in their own words, and ritual position, live on the existing year plan.
insert into public.aspiration_year_plans (year,theme,feelings,focus,extraordinary,ritual_step,ritual_started_at)
 values (2027,'Courage',array['wonder','freedom','peace'],'My health','Saying yes more','imagine',now());
do $$ begin
 begin
  update public.aspiration_year_plans set feelings=array['a','b','c','d','e','f'] where year=2027;
  raise exception 'More than five feelings accepted';
 exception when check_violation then null; end;
end $$;

-- A priority can be chosen before its aspiration has a life area.
insert into public.aspiration_year_priorities (year,aspiration_id,aspiration_name) values (2027,'20000000-0000-0000-0000-000000000191','Learn to sew');

-- Related aspirations are stored once and only between one person's aspirations.
insert into public.aspiration_links (aspiration_id,related_id) values ('20000000-0000-0000-0000-000000000191','20000000-0000-0000-0000-000000000192');
do $$ begin
 begin
  insert into public.aspiration_links (aspiration_id,related_id) values ('20000000-0000-0000-0000-000000000192','20000000-0000-0000-0000-000000000191');
  raise exception 'Reverse duplicate link accepted';
 exception when check_violation then null; end;
 begin
  insert into public.aspiration_links (aspiration_id,related_id) values ('20000000-0000-0000-0000-000000000191','20000000-0000-0000-0000-000000000193');
  raise exception 'Cross-owner link accepted';
 exception when foreign_key_violation then null; end;
end $$;

-- Keepsakes follow the cover's ownership rule.
do $$ begin
 begin
  update public.aspirations set keepsake='{"path":"other/k.webp","thumbnailPath":"other/k.thumb.webp"}'::jsonb where id='20000000-0000-0000-0000-000000000191';
  raise exception 'Cross-owner keepsake accepted';
 exception when insufficient_privilege then null; end;
end $$;
update public.aspirations set keepsake=jsonb_build_object('path','00000000-0000-0000-0000-000000000191/20000000-0000-0000-0000-000000000191/k.webp','thumbnailPath','00000000-0000-0000-0000-000000000191/20000000-0000-0000-0000-000000000191/k.thumb.webp'),
 completion='{"meaningful":"My first dress"}'::jsonb,status='completed',completed_on=current_date,show_progress=false
 where id='20000000-0000-0000-0000-000000000191';

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000192',true);
do $$ begin
 if exists (select 1 from public.aspiration_links) or exists (select 1 from public.aspiration_year_plans) then raise exception 'Another owner can read private Life Atlas data'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000191',true);
delete from public.aspirations where id='20000000-0000-0000-0000-000000000192';
do $$ begin
 if exists (select 1 from public.aspiration_links) then raise exception 'Link survived its aspiration'; end if;
 if not exists (select 1 from public.aspiration_year_priorities where area_name is null and aspiration_name='Learn to sew') then raise exception 'Unassigned priority lost'; end if;
end $$;
reset role;
