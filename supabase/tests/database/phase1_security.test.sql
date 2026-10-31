begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select no_plan();

-- Synthetic fixtures exist only inside this rolled-back transaction; no emails are sent.
insert into auth.users(id,email,raw_user_meta_data) values
('10000000-0000-0000-0000-000000000001','muse-a@example.test','{"first_name":"Test A","time_zone":"America/Los_Angeles"}'),
('10000000-0000-0000-0000-000000000002','muse-b@example.test','{"first_name":"Test B","time_zone":"UTC"}');
insert into public.daily_records(id,user_id,local_date,time_zone) values
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','2026-10-29','UTC');
insert into public.mood_checkins(id,user_id,daily_record_id,period,captured_time_zone) values
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','morning','UTC');
insert into public.influence_tags(id,user_id,label) values
('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Private B');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.profiles),1,'A sees only own profile');
select is((select count(*)::integer from public.daily_records),0,'B daily rows are hidden');
select lives_ok($$select public.ensure_daily_record('2026-10-29')$$,'A creates a day with profile timezone');
select lives_ok($$select public.ensure_daily_record('2026-10-29')$$,'Ensuring a date is idempotent');
select is((select count(*)::integer from public.daily_records),1,'One authoritative row per date');
select is((select time_zone from public.daily_records),'America/Los_Angeles','Date retains capture timezone');
select throws_ok($$insert into public.daily_records(user_id,local_date,time_zone) values('10000000-0000-0000-0000-000000000001','2026-10-29','UTC')$$,'23505',null,'Duplicate user/date rejected');
select throws_ok($$insert into public.daily_records(user_id,local_date,time_zone) values('10000000-0000-0000-0000-000000000002','2026-10-30','UTC')$$,'42501',null,'Cannot insert with another owner');
select lives_ok($$update public.daily_records set energy=9 where user_id='10000000-0000-0000-0000-000000000002'$$,'Foreign update affects no visible rows');
select lives_ok($$delete from public.daily_records where user_id='10000000-0000-0000-0000-000000000002'$$,'Foreign delete affects no visible rows');

select lives_ok($$select public.save_daily_record('2026-10-29','{"intention_text":"Test intention","energy":8,"overall_day":7,"day_in_three":["🌱","🌈"]}',1)$$,'Independent daily fields save together');
select is((select revision::integer from public.daily_records),2,'Server advances revision');
select throws_ok($$select public.save_daily_record('2026-10-29','{"energy":2}',1)$$,'40001',null,'Stale write rejected');
select throws_ok($$select public.save_daily_record('2026-10-29','{"stress":11}',2)$$,'23514',null,'Ratings enforce 1–10');
select throws_ok($$select public.save_daily_record('2026-10-29','{"day_in_three":["1","2","3","4"]}',2)$$,'23514',null,'At most three emoji values');
select throws_ok($$select public.save_daily_record('2026-10-29','{"owner":"bad"}',2)$$,'22023',null,'Patch cannot change ownership/identity');
select lives_ok($$select public.save_daily_record('2026-10-29','{"energy":null}',2)$$,'Clear stores null, not zero');
select ok((select energy is null and overall_day=7 and intention_text='Test intention' from public.daily_records),'Clear preserves other dimensions');
select lives_ok($$select public.save_account_preferences((select revision from public.profiles),gen_random_uuid(),'{"time_zone":"Asia/Tokyo"}')$$,'User may intentionally change profile zone');
select is((select time_zone from public.daily_records),'America/Los_Angeles','Profile change never relabels historical day');
select throws_ok($$update public.daily_records set local_date='2026-10-30'$$,'22023',null,'Historical date cannot drift during edit');
select throws_ok($$select public.save_account_preferences((select revision from public.profiles),gen_random_uuid(),'{"time_zone":"Not/AZone"}')$$,'22023',null,'Unknown IANA timezone rejected');
select throws_ok($$update public.profiles set created_at=now()$$,'42501',null,'Profile creation timestamp is not a client field');

select public.save_daily_priorities('2026-10-29',(select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'text','Test priority '||slot,'complete',slot=0) order by slot) from generate_series(0,2) slot),'[]');
select is((select count(*)::integer from public.daily_priorities),3,'Three priority designations can persist without Mood');
select ok((select t.completed_at is not null from public.daily_priorities p join public.tasks t on t.id=p.task_id where p.position=0),'Canonical task completion capture is timestamped');
select throws_ok($$insert into public.daily_priorities(daily_record_id,text,position) select id,'Fourth',3 from public.daily_records$$,'42501',null,'Direct priority insertion is not an authorized bypass');
select throws_ok($$insert into public.daily_priorities(daily_record_id,text,position) values('20000000-0000-0000-0000-000000000002','Foreign',0)$$,'42501',null,'Cannot bypass commands to link a foreign day');

insert into public.influence_tags(id,label) values('40000000-0000-0000-0000-000000000001','Work');
select lives_ok($$select public.save_mood_checkin('2026-10-29','morning','Test reflection',array['emotion-calm'],array['40000000-0000-0000-0000-000000000001']::uuid[],null)$$,'Morning feelings/context/reflection save atomically');
select lives_ok($$select public.save_mood_checkin('2026-10-29','evening','Evening reflection',array['emotion-calm'],'{}'::uuid[],null)$$,'Evening is an independent session');
select is((select count(*)::integer from public.mood_checkins),2,'Exactly two separate sessions');
select throws_ok($$select public.save_mood_checkin('2026-10-29','morning','Too many',array['emotion-calm'],array['40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001']::uuid[],1)$$,'22023',null,'More than three influences rejected before mutation');
select throws_ok($$insert into public.checkin_influences(checkin_id,influence_id,position) select id,'40000000-0000-0000-0000-000000000001',3 from public.mood_checkins where period='evening'$$,'23514',null,'Direct API cannot add a fourth influence position');
select hasnt_column('public','mood_checkins','energy','Session has no competing Energy field');
select hasnt_column('public','mood_checkins','stress','Session has no competing Stress field');
select hasnt_column('public','mood_checkins','overall_day','Session has no competing Overall Day field');
select is((select overall_day::integer from public.daily_records),7,'Session capture does not change daily Pulse');
select throws_ok($$select public.save_mood_checkin('2026-10-29','morning','Changed',array['emotion-calm'],'{}'::uuid[],null)$$,'40001',null,'Existing session requires its revision');
select throws_ok($$select public.save_mood_checkin('2026-10-29','morning','Changed',array['emotion-calm'],array['40000000-0000-0000-0000-000000000002']::uuid[],1)$$,'23503',null,'Cross-user influence link rejected');
select is((select reflection from public.mood_checkins where period='morning'),'Test reflection','Failed replacement rolls back reflection and joins');
select is((select count(*)::integer from public.checkin_influences),1,'Failed replacement preserves prior influence');
select throws_ok($$update public.mood_checkins set period='evening' where period='morning'$$,'22023',null,'Editing cannot turn Morning into Evening');
select throws_ok($$insert into public.emotion_catalog(id,name,emoji,quadrant) values('fake','Fake','x','red')$$,'42501',null,'User cannot alter canonical vocabulary');
select lives_ok($$select public.save_mood_checkin('2026-10-29','morning',null,'{}'::text[],'{}'::uuid[],1)$$,'Clearing an empty emotional session removes it');
select is((select count(*)::integer from public.mood_checkins),1,'Only Evening remains after clearing Morning');
select is((select count(*)::integer from public.daily_records),1,'Session deletion preserves independent day');
select is((select count(*)::integer from public.daily_priorities),3,'Session deletion preserves priorities');
select lives_ok($$select public.delete_mood_checkin(id,revision) from public.mood_checkins where period='evening'$$,'Explicit session deletion works');
select is((select count(*)::integer from public.daily_records),1,'Dayprint source remains with no Mood participation');

set local role anon;
select throws_ok($$select * from public.daily_records$$,'42501',null,'Anonymous cannot read private days');
select throws_ok($$select * from public.profiles$$,'42501',null,'Anonymous cannot read profiles');
select throws_ok($$select public.ensure_daily_record('2026-10-29')$$,'42501',null,'Anonymous cannot call authenticated commands');

reset role;
select is((select count(*)::integer from public.daily_records where user_id='10000000-0000-0000-0000-000000000002'),1,'B records remain unchanged');
select ok((select energy is null from public.daily_records where user_id='10000000-0000-0000-0000-000000000002'),'Foreign update did not modify B values');
delete from auth.users where id='10000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.profiles where id='10000000-0000-0000-0000-000000000001'),0,'Account deletion removes profile');
select is((select count(*)::integer from public.daily_records where user_id='10000000-0000-0000-0000-000000000001'),0,'Account deletion cascades owned day records');
select is((select count(*)::integer from public.daily_priorities where user_id='10000000-0000-0000-0000-000000000001'),0,'Account deletion cascades owned priorities');
set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
select throws_ok($$insert into public.daily_records(local_date,time_zone) values('2026-10-31','UTC')$$,'23503',null,'Deleted user cannot recreate private rows with a stale subject');
select * from finish();
rollback;
