begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values('74000000-0000-0000-0000-000000000001','curation-a@example.test','{"time_zone":"America/Los_Angeles"}'),('74000000-0000-0000-0000-000000000002','curation-b@example.test','{}');
-- Rolled-back legacy fixtures only: simulate rows from before automatic creation.
set local session_replication_role=replica;
insert into public.workspaces(id,user_id,name,accent) values('84000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000001','Existing workspace','primary');
insert into public.tasks(id,user_id,workspace_id,title,notes,captured_time_zone,created_at) values('94000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001','Shared task title','Richer details','America/Los_Angeles','2026-03-01Z');
insert into public.daily_records(id,user_id,local_date,time_zone) values
 ('a4000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000001','2026-03-08','America/Los_Angeles'),
 ('a4000000-0000-0000-0000-000000000002','74000000-0000-0000-0000-000000000001','2026-03-07','America/Los_Angeles'),
 ('a4000000-0000-0000-0000-000000000003','74000000-0000-0000-0000-000000000001','2026-03-06','America/Los_Angeles');
insert into public.daily_priorities(id,user_id,daily_record_id,text,position,standalone_complete,completed_at,created_at) values
 ('b4000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001','A legacy completed commitment',0,true,'2026-03-09T12:00Z','2026-03-08T12:00Z'),
 ('b4000000-0000-0000-0000-000000000002','74000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000002','A legacy incomplete commitment',0,false,null,'2026-03-07T12:00Z');
insert into public.daily_priorities(id,user_id,daily_record_id,text,position,standalone_complete,task_id,completion_origin,linked_at) values('b4000000-0000-0000-0000-000000000003','74000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001','Old independent snapshot',1,null,'94000000-0000-0000-0000-000000000001','linked','2026-03-08Z');
insert into public.daily_priorities(id,user_id,daily_record_id,text,position,standalone_complete,completion_origin,materialized_task_id,materialized_at) values('b4000000-0000-0000-0000-000000000004','74000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000003','Retained detached history',0,false,'materialized','94000000-0000-0000-0000-000000000001','2026-03-09Z');
set local session_replication_role=origin;
set local role authenticated;
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000001';
select is(public.backfill_priority_tasks(0,'c4000000-0000-0000-0000-000000000001'),2::bigint,'Two eligible legacy commitments backfill atomically');
select is((select count(*)::integer from public.tasks),3,'Exactly two tasks created, no title guessing');
select is((select task_id from public.daily_priorities where position=1),'94000000-0000-0000-0000-000000000001'::uuid,'Existing link stays intact');
select is((select notes from public.tasks where id='94000000-0000-0000-0000-000000000001'),'Richer details','Existing task metadata untouched');
select is((select task_id from public.daily_priorities where id='b4000000-0000-0000-0000-000000000004'),null::uuid,'Deliberately detached history is not resurrected');
select is(public.backfill_priority_tasks(0,'c4000000-0000-0000-0000-000000000001'),2::bigint,'Same backfill receipt is retry-safe');
select is(public.backfill_priority_tasks(2,gen_random_uuid()),2::bigint,'Repeat backfill with fresh command creates nothing');
select is((select count(*)::integer from public.tasks),3,'No duplicate tasks after retries');
select is((select count(*)::integer from public.task_completion_events),0,'Migration invents no completion events today');
select is((select historical_complete from public.daily_priority_projection where id='b4000000-0000-0000-0000-000000000001'),true,'Historical manual completed fact is preserved despite late capture');
select is((select historical_complete from public.daily_priority_projection where id='b4000000-0000-0000-0000-000000000002'),false,'Historical incomplete fact is preserved');
select is((select text from public.daily_priority_projection where position=1),'Shared task title','Projection uses canonical title, not stale snapshot');
select is((select t.initial_completed_at from public.tasks t join public.daily_priorities p on p.task_id=t.id where p.id='b4000000-0000-0000-0000-000000000001'),'2026-03-09T12:00Z'::timestamptz,'Original capture timestamp retained without invented transition');
select ok((select t.created_at>=current_timestamp from public.tasks t join public.daily_priorities p on p.task_id=t.id where p.id='b4000000-0000-0000-0000-000000000001'),'Task import instant is not backdated');
select public.save_daily_priorities('2026-03-08',(select jsonb_agg(jsonb_build_object('id',id,'text',text,'complete',null,'taskId',case when position=0 then (select id from public.tasks where origin_priority_id='b4000000-0000-0000-0000-000000000002') else task_id end) order by position) from public.daily_priorities where daily_record_id='a4000000-0000-0000-0000-000000000001'),(select jsonb_agg(jsonb_build_object('id',id,'revision',revision)) from public.daily_priorities where daily_record_id='a4000000-0000-0000-0000-000000000001'),gen_random_uuid(),(select revision from public.planner_versions));
select is((select historical_complete from public.daily_priority_projection where id='b4000000-0000-0000-0000-000000000001'),null::boolean,'Replacing a legacy task does not reuse its unrelated historical result');
select public.save_daily_priorities('2026-03-08',(select jsonb_agg(jsonb_build_object('id',id,'text',text,'complete',null,'taskId',case when position=0 then (select id from public.tasks where origin_priority_id='b4000000-0000-0000-0000-000000000001') else task_id end) order by position) from public.daily_priorities where daily_record_id='a4000000-0000-0000-0000-000000000001'),(select jsonb_agg(jsonb_build_object('id',id,'revision',revision)) from public.daily_priorities where daily_record_id='a4000000-0000-0000-0000-000000000001'),gen_random_uuid(),(select revision from public.planner_versions));
select is((select historical_complete from public.daily_priority_projection where id='b4000000-0000-0000-0000-000000000001'),true,'Explicitly relinking the original task retains its legacy evidence');
select public.complete_linked_priority('b4000000-0000-0000-0000-000000000001',(select revision from public.daily_priorities where id='b4000000-0000-0000-0000-000000000001'),(select revision from public.planner_versions),false,gen_random_uuid());
select is((select historical_complete from public.daily_priority_projection where id='b4000000-0000-0000-0000-000000000001'),true,'Later reopening cannot undo imported historical fact');
select is((select h.complete from public.tasks t cross join lateral public.task_completion_before(t.id,t.created_at+interval '1 microsecond') h where t.origin_priority_id='b4000000-0000-0000-0000-000000000001'),true,'Imported initial state remains usable before first real transition');
select public.save_daily_priorities('2026-03-08',(select jsonb_agg(jsonb_build_object('id',id,'text',text,'complete',null,'taskId',task_id)) from public.daily_priorities where daily_record_id='a4000000-0000-0000-0000-000000000001' and position=0),(select jsonb_agg(jsonb_build_object('id',id,'revision',revision)) from public.daily_priorities where daily_record_id='a4000000-0000-0000-0000-000000000001'),gen_random_uuid(),3);
select is((select count(*)::integer from public.daily_priorities where daily_record_id='a4000000-0000-0000-0000-000000000001'),1,'Removing a priority frees its designation');
select is((select notes from public.tasks where id='94000000-0000-0000-0000-000000000001'),'Richer details','Designation removal preserves task and metadata');
select public.planner_command((select revision from public.planner_versions),gen_random_uuid(),jsonb_build_object('type','task/delete','id',(select task_id from public.daily_priorities where id='b4000000-0000-0000-0000-000000000001')));
select is((select standalone_complete from public.daily_priorities where id='b4000000-0000-0000-0000-000000000001'),true,'Task deletion materializes imported historical fact');
select is((select task_unavailable from public.daily_priority_projection where id='b4000000-0000-0000-0000-000000000001'),true,'Deleted task is explicitly unavailable');
select lives_ok($$select public.backfill_priority_tasks((select revision from public.planner_versions),gen_random_uuid())$$,'Backfill safely skips deleted-task history');
select is((select count(*)::integer from public.tasks),3,'Deleted task tombstone is not replaced');
select public.create_priority_task('2027-01-03','b4000000-0000-0000-0000-000000000005','A future commitment',(select revision from public.planner_versions),gen_random_uuid());
select is((select t.planned_date from public.tasks t join public.daily_priorities p on p.task_id=t.id where p.id='b4000000-0000-0000-0000-000000000005'),'2027-01-03'::date,'New task belongs to selected future local date');
select public.save_account_preferences((select revision from public.profiles),gen_random_uuid(),'{"time_zone":"Asia/Tokyo"}');
select is((select local_date from public.daily_records where id='a4000000-0000-0000-0000-000000000001'),'2026-03-08'::date,'Timezone change leaves original date alone');
select is((select time_zone from public.daily_records where id='a4000000-0000-0000-0000-000000000001'),'America/Los_Angeles','Original timezone evidence remains intact');
select throws_ok($$update public.tasks set initial_complete=true$$,'42501',null,'Cannot forge imported completion baseline');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.daily_priority_projection),0,'Another user cannot read curations');
select throws_ok($$select muse_private.backfill_priority_tasks('74000000-0000-0000-0000-000000000001')$$,'42501',null,'Private backfill cannot be called for another owner');
set local role anon;
select throws_ok($$select public.create_priority_task('2027-01-03',gen_random_uuid(),'Forbidden',0,gen_random_uuid())$$,'42501',null,'Anonymous automatic creation denied');
reset role;select * from finish();rollback;
