begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select no_plan();

insert into auth.users(id,email) values
 ('95000000-0000-0000-0000-000000000001','living-library-a@example.test'),
 ('95000000-0000-0000-0000-000000000002','living-library-b@example.test');
set local role authenticated;
set local "request.jwt.claim.sub"='95000000-0000-0000-0000-000000000001';

select lives_ok($$select public.save_whimsy_record('books',0,'95000000-0000-0000-0000-000000000101','{"id":"95000000-0000-0000-0000-000000000201","title":"The Lantern Cycle","status":"planned","reviewEmojis":[]}',false)$$,'A saves a canonical planned book');
select lives_ok($$insert into public.book_journal_entries(id,user_id,book_id,book_title_snapshot,kind,body,saved_on) values('95000000-0000-0000-0000-000000000301','95000000-0000-0000-0000-000000000001','95000000-0000-0000-0000-000000000201','The Lantern Cycle','thought','A thought before any timer','2026-11-09')$$,'A saves a thought without a timer');
select is((select count(*)::integer from public.book_journal_entries),1,'The owner sees the journal');
set local "request.jwt.claim.sub"='95000000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.book_journal_entries),0,'Another account cannot read it');
select throws_ok($$insert into public.book_journal_entries(id,user_id,book_id,book_title_snapshot,kind,body,saved_on) values('95000000-0000-0000-0000-000000000302','95000000-0000-0000-0000-000000000001','95000000-0000-0000-0000-000000000201','The Lantern Cycle','quote','Not mine','2026-11-09')$$,'42501',null,'Another account cannot write it');
set local "request.jwt.claim.sub"='95000000-0000-0000-0000-000000000001';

select lives_ok($$select public.save_whimsy_record('books',1,'95000000-0000-0000-0000-000000000102','{"id":"95000000-0000-0000-0000-000000000201","title":"The Lantern Cycle","status":"reading","reviewEmojis":[],"startedOn":"2026-11-09","cycleId":"95000000-0000-0000-0000-000000000201:read:1"}',false)$$,'Starting a read changes the book once');
select lives_ok($$select public.save_reading_timer(0,'95000000-0000-0000-0000-000000000103','{"bookId":"95000000-0000-0000-0000-000000000201","phase":"running","date":"2026-11-09","timeZone":"America/Los_Angeles","startedAt":"2026-11-09T18:00:00.000Z","sessionId":"95000000-0000-0000-0000-000000000401","sessionCommandId":"95000000-0000-0000-0000-000000000402","segments":[],"runningSince":"2026-11-09T18:00:00.000Z","cycleId":"95000000-0000-0000-0000-000000000201:read:1","autoStatus":{"previous":"planned","bookRevision":2}}')$$,'Timer remembers the automatically changed status');
select is((public.discard_reading_timer(1,'95000000-0000-0000-0000-000000000104')->>'restored')::boolean,true,'Discard restores the previous status atomically');
select is((select payload->>'status' from public.whimsy_books where id='95000000-0000-0000-0000-000000000201'),'planned','Book returns to planned');
select is((select count(*)::integer from public.whimsy_reading_timers),0,'No unsaved timer remains');
select is((select count(*)::integer from public.book_journal_entries),1,'Discard keeps the journal');
select is((public.discard_reading_timer(1,'95000000-0000-0000-0000-000000000104')->>'restored')::boolean,true,'A retry returns the same command receipt');
select lives_ok($$select public.start_book_reading_timer('{"id":"95000000-0000-0000-0000-000000000201","title":"The Lantern Cycle","status":"reading","reviewEmojis":[],"startedOn":"2026-11-09","cycleId":"95000000-0000-0000-0000-000000000201:read:3"}',3,'{"bookId":"95000000-0000-0000-0000-000000000201","phase":"running","date":"2026-11-09","timeZone":"America/Los_Angeles","startedAt":"2026-11-09T18:00:00.000Z","targetMinutes":15,"sessionId":"95000000-0000-0000-0000-000000000403","sessionCommandId":"95000000-0000-0000-0000-000000000404","segments":[],"runningSince":"2026-11-09T18:00:00.000Z","cycleId":"95000000-0000-0000-0000-000000000201:read:3","autoStatus":{"previous":"planned","bookRevision":4}}','95000000-0000-0000-0000-000000000107')$$,'Atomic start changes book and starts timer');
select is((select payload->>'status' from public.whimsy_books where id='95000000-0000-0000-0000-000000000201'),'reading','Atomic start persists reading status');
select is((select count(*)::integer from public.whimsy_reading_timers),1,'Atomic start persists one timer');
select is((select (payload->>'targetMinutes')::integer from public.whimsy_reading_timers),15,'Timed target survives the existing timer persistence');
select is((public.discard_reading_timer((select revision from public.whimsy_reading_timers limit 1),'95000000-0000-0000-0000-000000000108')->>'restored')::boolean,true,'Atomic start remains discardable');
select throws_ok($$select public.start_book_reading_timer('{"id":"95000000-0000-0000-0000-000000000201","title":"The Lantern Cycle","status":"reading","reviewEmojis":[],"startedOn":"2026-11-09","cycleId":"95000000-0000-0000-0000-000000000201:read:5"}',5,'{"bookId":"95000000-0000-0000-0000-000000000201","cycleId":"95000000-0000-0000-0000-000000000201:read:5","autoStatus":{"previous":"planned","bookRevision":6}}','95000000-0000-0000-0000-000000000109')$$,'22023',null,'A rejected timer rolls back its book status change');
select is((select payload->>'status' from public.whimsy_books where id='95000000-0000-0000-0000-000000000201'),'planned','Failed atomic start leaves the book planned');
select is((select count(*)::integer from public.whimsy_reading_timers),0,'Failed atomic start leaves no timer');
select lives_ok($$select public.save_whimsy_record('sessions',0,'95000000-0000-0000-0000-000000000105','{"id":"95000000-0000-0000-0000-000000000501","bookId":"95000000-0000-0000-0000-000000000201","date":"2026-11-09","timeZone":"America/Los_Angeles","pages":12,"activeSegments":[],"manual":true}',false)$$,'A saved manual session needs no timer');
select lives_ok($$update public.book_journal_entries set session_id='95000000-0000-0000-0000-000000000501' where id='95000000-0000-0000-0000-000000000301'$$,'The thought may link to a saved session');
select lives_ok($$select public.save_whimsy_record('sessions',1,'95000000-0000-0000-0000-000000000106','{"id":"95000000-0000-0000-0000-000000000501"}',true)$$,'A saved session can be deleted');
select is((select session_id from public.book_journal_entries where id='95000000-0000-0000-0000-000000000301'),null::uuid,'Deleting the session keeps the thought and clears only the link');

select * from finish();
rollback;
