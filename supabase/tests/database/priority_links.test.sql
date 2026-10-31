begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('71000000-0000-0000-0000-000000000001','priority-history-a@example.test','{"time_zone":"America/Los_Angeles"}'),
 ('71000000-0000-0000-0000-000000000002','priority-history-b@example.test','{"time_zone":"UTC"}');
-- Only rolled-back synthetic fixtures bypass capture triggers to establish past instants.
-- This transaction-local setting does not change triggers for any other connection.
set local session_replication_role=replica;
insert into public.workspaces(id,user_id,name,accent,created_at) values('81000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','History fixtures','primary','2026-03-01Z');
insert into public.tasks(id,user_id,workspace_id,title,captured_time_zone,created_at) select
 ('91000000-0000-0000-0000-00000000000'||n)::uuid,'71000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001',label,'America/Los_Angeles',stamp::timestamptz
 from (values(1,'Completed late','2026-03-07T12:00Z'),(2,'Reopened later','2026-03-07T12:00Z'),(3,'Did not exist yet','2026-03-10T12:00Z'),(4,'Multiple transitions','2026-03-07T12:00Z'),(5,'Exact midnight','2026-03-07T12:00Z'),(6,'Tokyo capture before LA midnight','2026-03-07T12:00Z'),(7,'Fall fold','2026-10-31T12:00Z')) fixtures(n,label,stamp);
insert into public.task_completion_events(user_id,task_id,complete,occurred_at,local_date,time_zone,title,workspace_id) select
 '71000000-0000-0000-0000-000000000001',('91000000-0000-0000-0000-00000000000'||n)::uuid,done,stamp::timestamptz,(stamp::timestamptz at time zone zone)::date,zone,'Fixture completion','81000000-0000-0000-0000-000000000001'
 from (values
 (1,true,'2026-03-09T12:00Z','America/Los_Angeles'),(1,false,'2026-03-10T12:00Z','America/Los_Angeles'),
 (2,true,'2026-03-08T15:00Z','America/Los_Angeles'),(2,false,'2026-03-10T12:00Z','America/Los_Angeles'),
 (4,true,'2026-03-08T09:00Z','America/Los_Angeles'),(4,false,'2026-03-08T10:00Z','America/Los_Angeles'),(4,true,'2026-03-08T11:00Z','America/Los_Angeles'),(4,false,'2026-03-10T12:00Z','America/Los_Angeles'),
 (5,true,'2026-03-09T07:00Z','America/Los_Angeles'),(5,false,'2026-03-10T12:00Z','America/Los_Angeles'),
 (6,true,'2026-03-09T06:59:59.999Z','Asia/Tokyo'),(6,false,'2026-03-10T12:00Z','Asia/Tokyo'),
 (7,true,'2026-11-02T07:59:59Z','America/Los_Angeles'),(7,false,'2026-11-02T08:00Z','America/Los_Angeles')) events(n,done,stamp,zone);
set local session_replication_role=origin;
set local role authenticated;
set local "request.jwt.claim.sub"='71000000-0000-0000-0000-000000000001';
select is(public.priority_day_end('2026-03-08','America/Los_Angeles'),'2026-03-09T07:00Z'::timestamptz,'Spring-forward midnight uses IANA offset');
select is(extract(epoch from public.priority_day_end('2026-03-08','America/Los_Angeles')-public.priority_day_end('2026-03-07','America/Los_Angeles'))::integer,23*3600,'Spring day has 23 hours');
select is(extract(epoch from public.priority_day_end('2026-11-01','America/Los_Angeles')-public.priority_day_end('2026-10-31','America/Los_Angeles'))::integer,25*3600,'Fall day has 25 hours');
select throws_ok($$select public.priority_day_end('2026-03-08','Invalid/Zone')$$,'22023',null,'No timezone fallback for invalid configuration');
select is((select complete from public.task_completion_before('91000000-0000-0000-0000-000000000001',public.priority_day_end('2026-03-08','America/Los_Angeles'))),false,'Next-day completion cannot complete an earlier priority');
select is((select complete from public.task_completion_before('91000000-0000-0000-0000-000000000002',public.priority_day_end('2026-03-08','America/Los_Angeles'))),true,'Reopening later preserves earlier completed day');
select is((select complete from public.task_completion_before('91000000-0000-0000-0000-000000000003',public.priority_day_end('2026-03-08','America/Los_Angeles'))),null::boolean,'Before task existence is unknown, not fabricated incomplete');
select is((select complete from public.task_completion_before('91000000-0000-0000-0000-000000000004',public.priority_day_end('2026-03-08','America/Los_Angeles'))),true,'Multiple completion/reopen transitions resolve the last state before cutoff');
select is((select complete from public.task_completion_before('91000000-0000-0000-0000-000000000005',public.priority_day_end('2026-03-08','America/Los_Angeles'))),false,'Completion exactly at next midnight is excluded');
select is((select complete from public.task_completion_before('91000000-0000-0000-0000-000000000005',public.priority_day_end('2026-03-09','America/Los_Angeles'))),true,'Midnight completion belongs to the next day');
select is((select complete from public.task_completion_before('91000000-0000-0000-0000-000000000006',public.priority_day_end('2026-03-08','America/Los_Angeles'))),true,'Instant is compared in original day zone, not a travelled capture date');
select is((select complete from public.task_completion_before('91000000-0000-0000-0000-000000000007',public.priority_day_end('2026-11-01','America/Los_Angeles'))),true,'Fall midnight cutoff includes final repeated-hour day and excludes next-day reopening');
select lives_ok($$select public.save_daily_priorities('2026-03-08','[
 {"id":"a1000000-0000-0000-0000-000000000001","text":"Late daily commitment","complete":null,"taskId":"91000000-0000-0000-0000-000000000001"},
 {"id":"a1000000-0000-0000-0000-000000000002","text":"Keep original commitment text","complete":null,"taskId":"91000000-0000-0000-0000-000000000002"},
 {"id":"a1000000-0000-0000-0000-000000000003","text":"Unknown history","complete":null,"taskId":"91000000-0000-0000-0000-000000000003"}]','[]',gen_random_uuid(),0)$$,'Historical links retain separate commitments');
select is((select display_complete from public.daily_priority_projection where position=0),false,'View uses false historical day-end, not later completion');
select is((select display_complete from public.daily_priority_projection where position=1),true,'View uses completed historical day despite current reopened task');
select is((select current_complete from public.daily_priority_projection where position=1),false,'Current and historical completion are distinct');
select is((select display_complete from public.daily_priority_projection where position=2),null::boolean,'View preserves unknown');
select is((select count(*)::integer from public.daily_priorities where standalone_complete is not null),0,'Linked priorities store no competing completion');
select is((select count(*)::integer from public.mood_checkins),0,'Priority history requires no Mood session');
select is(jsonb_array_length(public.read_daily_days('2026-03-08','2026-03-08')->0->'daily_priorities'),3,'Shared daily query includes all priorities');
select lives_ok($$select public.save_daily_priorities('2026-03-08',(select jsonb_agg(jsonb_build_object('id',id,'text',text,'complete',null,'taskId',case when position=1 then null else task_id end) order by position) from public.daily_priorities),(select jsonb_agg(jsonb_build_object('id',id,'revision',revision)) from public.daily_priorities),gen_random_uuid(),0)$$,'Historical unlink materializes the right result');
select is((select standalone_complete from public.daily_priorities where position=1),true,'Unlink preserves historical completed state, not current open state');
select is((select completed_at from public.daily_priorities where position=1),'2026-03-08T15:00Z'::timestamptz,'Unlink preserves actual completion evidence rather than inventing unlink-time completion');
select is((select text from public.daily_priorities where position=1),'Keep original commitment text','Unlink preserves commitment text');
select is((select complete from public.tasks where id='91000000-0000-0000-0000-000000000002'),false,'Unlink does not complete the task');
select lives_ok($$select public.planner_command(0,gen_random_uuid(),'{"type":"task/delete","id":"91000000-0000-0000-0000-000000000001"}')$$,'Delete atomically detaches historical priority');
select is((select standalone_complete from public.daily_priorities where position=0),false,'Delete preserves original incomplete day');
select is((select count(*)::integer from public.daily_priorities),3,'Delete does not erase priority');
select lives_ok($$select public.planner_command(1,gen_random_uuid(),'{"type":"task/delete","id":"91000000-0000-0000-0000-000000000003"}')$$,'Delete preserves unknown historical evidence');
select is((select standalone_complete from public.daily_priorities where position=2),null::boolean,'Deleted task remains unknown for earlier day');
select lives_ok($$select public.save_account_preferences((select revision from public.profiles),gen_random_uuid(),'{"time_zone":"Asia/Tokyo"}')$$,'User may explicitly change profile zone');
select is((select time_zone from public.daily_records),'America/Los_Angeles','Original daily identity/zone stays unchanged');
select is((select historical_complete from public.daily_priority_projection where position=1),true,'Materialized history remains stable through travel');
select throws_ok($$update public.daily_priorities set standalone_complete=true where position=0$$,'42501',null,'Cannot forge linked/standalone state outside commands');
set local "request.jwt.claim.sub"='71000000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.daily_priority_projection),0,'Other user cannot read linked historical projection');
select is((select count(*)::integer from public.task_completion_before('91000000-0000-0000-0000-000000000002',now())),0,'Historical helper cannot leak another user task');
select throws_ok($$select public.complete_linked_priority('a1000000-0000-0000-0000-000000000002',1,0,true,gen_random_uuid())$$,'42501',null,'Other user cannot complete a foreign linked priority');
reset role;
select * from finish();
rollback;
