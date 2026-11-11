import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const stats=load('lib/whimsy/reading-stats');
const books=load('lib/whimsy/books');
const pending=load('lib/whimsy/timer-pending');
const read=file=>readFileSync(resolve(root,file),'utf8');
const LA='America/Los_Angeles';
const at=(iso,minutes)=>({start:iso,end:new Date(Date.parse(iso)+minutes*60000).toISOString()});
let n=0;
const session=(over={})=>({id:`s${n++}`,bookId:'b1',date:'2026-11-02',timeZone:LA,pages:20,activeSegments:[at('2026-11-02T18:00:00.000Z',30)],createdAt:'2026-11-02T19:00:00Z',updatedAt:'2026-11-02T19:00:00Z',revision:1,userId:'u',...over});
const book=(over={})=>({id:'b1',title:'Book',status:'reading',reviewEmojis:[],totalPages:300,createdAt:'2026-10-01T12:00:00Z',updatedAt:'2026-10-01T12:00:00Z',revision:1,userId:'u',...over});

test('pace uses only sessions with both time and pages; missing values never count as zero',()=>{
 const sessions=[session({pages:30,activeSegments:[at('2026-11-02T18:00:00.000Z',60)]}),session({pages:0,activeSegments:[at('2026-11-02T20:00:00.000Z',60)]}),session({pages:40,activeSegments:[]})];
 const pace=stats.readingPace(sessions);
 assert.deepEqual([pace.pages,pace.seconds,pace.sessions,pace.pagesPerHour],[30,3600,1,30],'untimed pages and pageless time are excluded from both sides');
 assert.equal(stats.readingPace([session({pages:0}),session({activeSegments:[]})]).pagesPerHour,null);
 assert.equal(books.bookReadingStats(book(),sessions,'2026-11-02').pagesPerHour,30,'per-book pace uses the same rule');
});

test('average session duration ignores untimed sessions; longest session is the longest timed one',()=>{
 const sessions=[session({activeSegments:[at('2026-11-02T18:00:00.000Z',20)]}),session({activeSegments:[at('2026-11-02T19:00:00.000Z',40)]}),session({activeSegments:[],pages:10})];
 assert.equal(stats.averageSessionSeconds(sessions),1800);
 assert.equal(stats.longestSession(sessions).seconds,2400);
 assert.equal(stats.averageSessionSeconds([session({activeSegments:[]})]),null);
});

test('reading days count once per local date, cross midnight, and survive timezone changes',()=>{
 // 23:30–00:30 Los Angeles: one session, two local reading days.
 const late=session({date:'2026-11-02',activeSegments:[at('2026-11-03T07:30:00.000Z',60)]});
 const twice=[session({date:'2026-11-04',activeSegments:[at('2026-11-04T17:00:00.000Z',10)]}),session({date:'2026-11-04',activeSegments:[at('2026-11-04T19:00:00.000Z',10)]})];
 const travel=session({date:'2026-11-05',timeZone:'Europe/London',activeSegments:[at('2026-11-05T09:00:00.000Z',15)]});
 assert.deepEqual([...new Set(stats.readingDates([late,...twice,travel]))].sort(),['2026-11-02','2026-11-03','2026-11-04','2026-11-05']);
 const streak=stats.readingStreaks([late,...twice,travel],'2026-11-05');
 assert.deepEqual([streak.current,streak.longest,streak.readToday],[4,4,true]);
});

test('streaks: today may still be unread, a missed day breaks the run, and no day is invented',()=>{
 const days=['2026-10-01','2026-10-02','2026-10-03','2026-10-05','2026-10-06'].map(d=>session({date:d,activeSegments:[at(`${d}T18:00:00.000Z`,15)]}));
 assert.deepEqual(stats.readingStreaks(days,'2026-10-07'),{current:2,longest:3,readToday:false},'yesterday keeps the streak alive');
 assert.equal(stats.readingStreaks(days,'2026-10-08').current,0,'two days without reading ends it');
 assert.deepEqual(stats.readingStreaks([],'2026-10-08'),{current:0,longest:0,readToday:false});
 const pagesOnly=session({date:'2026-10-07',activeSegments:[],pages:12});
 assert.equal(stats.readingStreaks([...days,pagesOnly],'2026-10-07').current,3,'a pages-only session is real reading');
});

test('periods split time at local midnight, keep pages on the session date, and recalculate after edits',()=>{
 const late=session({date:'2026-10-31',pages:40,activeSegments:[at('2026-11-01T06:30:00.000Z',60)]});// 23:30 Oct 31 – 00:30 Nov 1 (PDT)
 const nov=stats.periodSummary([book()],[late],'month','2026-11-15'),oct=stats.periodSummary([book()],[late],'month','2026-10-15');
 assert.deepEqual([nov.seconds,nov.pages,nov.readingDays],[1800,0,1],'half the time lands in November; pages stay on Oct 31');
 assert.deepEqual([oct.seconds,oct.pages,oct.sessions],[1800,40,1]);
 const all=stats.periodSummary([book()],[late],'all','2026-11-15');assert.equal(all.seconds,3600);
 assert.equal(stats.periodSummary([book()],[],'all','2026-11-15').seconds,0,'deleting the session removes it everywhere');
 assert.deepEqual(stats.periodRange('week','2026-11-05'),{start:'2026-11-02',end:'2026-11-08'});
 assert.deepEqual(stats.periodRange('month','2026-02-10'),{start:'2026-02-01',end:'2026-02-28'});
 assert.equal(stats.periodRange('all','2026-02-10'),null);
});

test('activity charts are contiguous windows with real zeros',()=>{
 const weekly=stats.activitySeries([session({date:'2026-11-03',activeSegments:[at('2026-11-03T18:00:00.000Z',45)]})],'week',12,'2026-11-05');
 assert.equal(weekly.length,12);assert.equal(weekly.at(-1).start,'2026-11-02');assert.equal(weekly.at(-1).seconds,2700);assert.equal(weekly[0].seconds,0);
 const monthly=stats.activitySeries([],'month',12,'2026-11-05');assert.deepEqual([monthly[0].start,monthly.at(-1).start,monthly.at(-1).end],['2025-12-01','2026-11-01','2026-11-30']);
});

test('book progress shows percent and pages left; the time estimate needs real pace data',()=>{
 const one=[session({pages:30,activeSegments:[at('2026-11-02T18:00:00.000Z',60)]})];
 const p1=stats.bookProgress(book(),one,150);
 assert.deepEqual([p1.percent,p1.remaining,p1.estimatedSecondsRemaining],[50,150,null],'one timed session is not enough to predict');
 const two=[...one,session({pages:30,activeSegments:[at('2026-11-03T18:00:00.000Z',60)]})];
 assert.equal(stats.bookProgress(book(),two,150).estimatedSecondsRemaining,5*3600,'150 pages at 30 pages/hour');
 assert.equal(stats.bookProgress(book({status:'finished'}),two,300).estimatedSecondsRemaining,null);
 assert.equal(stats.bookProgress(book({totalPages:undefined}),two,150).percent,null);
 assert.equal(stats.inclusiveCalendarDays('2026-11-01','2026-11-12'),12);
});

test('completions: an existing finish date counts once and nothing is invented',()=>{
 assert.deepEqual(stats.bookCompletions(book()),[]);
 const legacy=stats.bookCompletions(book({status:'finished',startedOn:'2026-10-01',finishedOn:'2026-10-20'}));
 assert.deepEqual(legacy.map(c=>[c.finishedOn,c.startedOn]),[['2026-10-20','2026-10-01']]);
 const rereading=stats.bookCompletions(book({status:'reading',startedOn:'2026-11-01',finishedOn:'2026-10-20'}));
 assert.deepEqual(rereading.map(c=>[c.finishedOn,c.startedOn]),[['2026-10-20',undefined]],'a later start date is not paired with an earlier finish');
});

test('rereads add completions; history survives leaving Finished; edits correct rather than duplicate',()=>{
 let id=0;const ids=()=>`c${id++}`,now='2026-11-01T00:00:00.000Z';
 const first=book({status:'finished',startedOn:'2026-01-02',finishedOn:'2026-01-20'});
 const kept=stats.nextCompletions(first,{status:'reading',startedOn:'2028-03-01'},now,ids);
 assert.deepEqual(kept.map(c=>c.finishedOn),['2026-01-20'],'starting a reread keeps the first completion');
 const rereading={...first,status:'reading',startedOn:'2028-03-01',completions:kept};
 const second=stats.nextCompletions(rereading,{status:'finished',finishedOn:'2028-03-30',startedOn:'2028-03-01'},now,ids);
 assert.deepEqual(second.map(c=>[c.finishedOn,c.startedOn]),[['2026-01-20','2026-01-02'],['2028-03-30','2028-03-01']]);
 const finished={...rereading,status:'finished',finishedOn:'2028-03-30',completions:second};
 const corrected=stats.nextCompletions(finished,{status:'finished',finishedOn:'2028-03-29',startedOn:'2028-03-01'},now,ids);
 assert.deepEqual(corrected.map(c=>c.finishedOn),['2026-01-20','2028-03-29'],'editing the finish date corrects the latest read');
 const again=stats.nextCompletions({...first,completions:[{id:'x',finishedOn:'2026-01-20',startedOn:'2026-01-02',recordedAt:now}],status:'reading'},{status:'finished',finishedOn:'2026-01-20',startedOn:'2026-01-02'},now,ids);
 assert.equal(again.length,1,'marking the same read finished again does not duplicate it');
 const det=()=>{let k=0;return ()=>`fixed-${k++}`;};
 assert.deepEqual(stats.nextCompletions(first,{status:'reading'},now,det()),stats.nextCompletions(first,{status:'reading'},now,det()),'ids are deterministic so retries stay idempotent');
});

test('annual counts, goals and series count each finished read; unique titles stay distinct',()=>{
 const twice=book({id:'b1',status:'finished',finishedOn:'2028-03-30',completions:[{id:'a',finishedOn:'2026-01-20',recordedAt:'x'},{id:'b',finishedOn:'2028-03-30',recordedAt:'x'}]});
 const other=book({id:'b2',status:'reading',finishedOn:'2026-06-01'});
 const y2026=stats.completionsIn([twice,other],{start:'2026-01-01',end:'2026-12-31'}),all=stats.completionsIn([twice,other],null);
 assert.deepEqual([y2026.count,y2026.uniqueTitles,y2026.rereads],[2,2,0]);
 assert.deepEqual([all.count,all.uniqueTitles,all.rereads],[3,2,1]);
 assert.equal(books.goalProgress({period:'year',start:'2028-01-01',end:'2028-12-31',target:12,unit:'books'},[twice,other],[],'2028-05-01'),1);
 assert.deepEqual(books.completedBookSeries([twice,other],'year').map(r=>[r.start,r.count]),[['2026-01-01',2],['2028-01-01',1]]);
 const {collectionsMetrics}=load('lib/collections/insights');
 const empty={media:[],episodes:[],seasons:[],activity:[],series:[],seriesMembers:[],curated:[],curatedMembers:[]};
 assert.equal(collectionsMetrics(empty,[twice,other],[],{start:'2026-01-01',end:'2028-12-31'}).books.finished,3,'Insights counts rereads too');
});

test('averages across completed reads only use reads that have the measured value',()=>{
 const b=book({status:'finished',completions:[{id:'a',finishedOn:'2026-01-20',startedOn:'2026-01-01',recordedAt:'x'},{id:'b',finishedOn:'2026-03-01',recordedAt:'x'}]});
 const s=[session({date:'2026-01-10',activeSegments:[at('2026-01-10T18:00:00.000Z',120)]})];
 const a=stats.completedReadAverages([b],s);
 assert.deepEqual([a.completions,a.timedCompletions,a.averageActiveSeconds,a.datedCompletions,a.averageCalendarDays],[2,1,7200,1,20]);
});

test('rereading earlier pages counts pages without moving the current place',()=>{
 assert.deepEqual(books.resolveRereadProgress(100,120,300),{pages:20,startingPage:100,endingPage:120,reread:true});
 assert.throws(()=>books.resolveRereadProgress(120,100,300),/on or after/);
 assert.throws(()=>books.resolveRereadProgress(-1,10),/zero or more/);
 assert.throws(()=>books.resolveRereadProgress(100,400,300),/exceeds/);
 const shelf=book({currentPage:250,positionUpdatedAt:'2026-10-01T12:00:00Z'});
 const reread=session({reread:true,startingPage:100,endingPage:120,pages:20,date:'2026-11-02',positionRecordedAt:'2026-11-02T18:30:00.000Z'});
 assert.equal(books.bookPosition(shelf,[reread]),250);
 const forward=session({startingPage:250,endingPage:270,pages:20,date:'2026-11-03',positionRecordedAt:'2026-11-03T18:30:00.000Z',activeSegments:[at('2026-11-03T18:00:00.000Z',30)]});
 assert.equal(books.bookPosition(shelf,[reread,forward]),270,'normal sessions still move the place');
});

test('archived books leave the shelf but their history keeps counting',()=>{
 const archived=book({archivedAt:'2026-11-04T00:00:00Z',status:'reading'});
 assert.equal(books.activeReadingBooks([archived]).length,0);
 assert.equal(stats.periodSummary([archived],[session()],'all','2026-11-05').seconds,1800);
 assert.deepEqual(books.bookCarryFields({archivedAt:'t',completions:[{id:'a',finishedOn:'2026-01-01',recordedAt:'x'}]}),{completions:[{id:'a',finishedOn:'2026-01-01',recordedAt:'x'}],archivedAt:'t'});
 assert.match(read('components/collections/Collections.tsx'),/canonicalItems\(books\.filter\(book=>!book\.archivedAt\)/);
 const shelf=read('components/whimsy/Bookshelf.tsx');
 assert.match(read('lib/books/library.ts'),/filters\.status==='archived'\?!book\.archivedAt:!!book\.archivedAt/,'library hides archived books unless asked');
 assert.match(shelf,/disabled=\{busy\|\|\(deleteInfo\.hasHistory&&!deleteForever\)\}/,'permanent deletion of history needs explicit acknowledgement');
});

test('forgotten timers: long uninterrupted stretches are detected and can be corrected without losing earlier reading',()=>{
 const base={bookId:'b1',date:'2026-11-02',timeZone:LA,startedAt:'2026-11-02T18:00:00.000Z',sessionId:'s',sessionCommandId:'c',revision:3,updatedAt:'x'};
 const running={...base,phase:'running',segments:[at('2026-11-02T18:00:00.000Z',20)],runningSince:'2026-11-02T19:00:00.000Z'};
 const now=Date.parse('2026-11-03T03:00:00.000Z');
 const stretch=stats.unconfirmedLongStretch(running,now);
 assert.deepEqual([stretch.open,stretch.start,stretch.seconds],[true,'2026-11-02T19:00:00.000Z',8*3600]);
 assert.equal(stats.unconfirmedLongStretch({...running,confirmedSince:['2026-11-02T19:00:00.000Z']},now),null,'a confirmed long read is not asked again');
 assert.equal(stats.unconfirmedLongStretch(running,Date.parse('2026-11-02T20:00:00.000Z')),null,'an hour is not suspicious');
 // An older app saved an overnight run as contiguous closed chunks.
 const overnight=books.closeRunningSegment('2026-11-02T19:00:00.000Z','2026-11-03T19:00:00.000Z');
 const paused={...base,phase:'paused',segments:[at('2026-11-02T18:00:00.000Z',20),...overnight]};
 const closed=stats.unconfirmedLongStretch(paused,now);
 assert.deepEqual([closed.open,closed.start,closed.end],[false,'2026-11-02T19:00:00.000Z','2026-11-03T19:00:00.000Z']);
 const trimmed=stats.correctStretch(paused.segments,closed,'2026-11-02T20:30:00.000Z');
 assert.equal(books.activeSeconds(trimmed),(20+90)*60,'earlier 20 minutes kept, stretch ends at the corrected time');
 assert.equal(books.activeSeconds(stats.correctStretch(paused.segments,closed,null)),20*60,'discarding removes only that stretch');
 assert.equal(books.timerSeconds({...paused,correctedSegments:trimmed},now),(20+90)*60);
 assert.deepEqual(books.effectiveTimerSegments({segments:paused.segments}),paused.segments);
});

test('offline timer changes are kept on the device and reconciled exactly once',()=>{
 const payload={bookId:'b1',phase:'paused',date:'2026-11-02',timeZone:LA,startedAt:'t',sessionId:'s1',sessionCommandId:'c',segments:[]};
 const command={key:'pause:s1:4',id:'cmd',payload,revision:4,recordedAt:'2026-11-02T20:00:00.000Z'};
 assert.equal(pending.reconcilePendingTimer(command,{...payload,phase:'running',revision:4}),'retry');
 assert.equal(pending.reconcilePendingTimer(command,{...payload,revision:5}),'done','the pause already landed');
 assert.equal(pending.reconcilePendingTimer(command,{...payload,phase:'running',revision:7}),'stale');
 assert.equal(pending.reconcilePendingTimer(command,{...payload,sessionId:'other',revision:4}),'stale');
 assert.equal(pending.reconcilePendingTimer({...command,payload:null},null),'done');
 assert.equal(pending.isRetryableTimerError(Object.assign(Error('Reading timer changed elsewhere'),{code:'40001'})),false);
 assert.equal(pending.isRetryableTimerError(new TypeError('Failed to fetch')),true);
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 try{pending.storePendingTimer('u1',command);assert.deepEqual(pending.loadPendingTimer('u1'),command);pending.clearPendingTimer('u1');assert.equal(pending.loadPendingTimer('u1'),null);}
 finally{delete globalThis.localStorage;}
 const shelf=read('components/whimsy/Bookshelf.tsx');
 assert.match(read('components/whimsy/ReadingSessionCard.tsx'),/Not synced yet/i,'the shared timer card labels an unsynced change');assert.match(shelf,/saved on this device only/);
 assert.match(shelf,/const stored=\{\.\.\.command,recordedAt:/,'the exact command is stored before it is sent');
});

test('more than 5,000 Whimsy records are read completely, page by page, with the cursor passed back exactly',async()=>{
 const persistence=load('lib/whimsy/persistence');
 const kinds=persistence.whimsyKinds,size={sessions:6123,fortunes:2500,books:3};
 const calls=[];
 const rows=kind=>Array.from({length:size[kind]??0},(_,i)=>({id:`${kind}-${i}`,createdAt:`2026-01-01T00:00:00.${String(i).padStart(6,'0')}+00:00`,...(kind==='sessions'?{bookId:'b',date:'2026-01-01',timeZone:LA,pages:1,activeSegments:[at(new Date(Date.UTC(2026,0,1)+i*120000).toISOString(),1)]}:{})}));
 const client={rpc:async(fn,args)=>{calls.push([fn,args]);
  if(fn!=='read_whimsy_page')return {data:null,error:{message:'unexpected'}};
  const all=rows(args.p_kind),start=args.p_after_id?all.findIndex(r=>r.id===args.p_after_id)+1:0;
  if(args.p_after_id)assert.equal(all[start-1].createdAt,args.p_after_created_at,'cursor timestamp passed back unchanged');
  const page=all.slice(start,start+args.p_limit);
  return {data:{rows:page,next:page.length===args.p_limit?{createdAt:page.at(-1).createdAt,id:page.at(-1).id}:null},error:null};}};
 const records=await persistence.readWhimsy(client);
 assert.equal(records.sessions.length,6123);assert.equal(records.fortunes.length,2500);assert.equal(records.books.length,3);assert.deepEqual(records.goals,[]);
 assert.equal(new Set(records.sessions.map(s=>s.id)).size,6123,'no duplicates across pages');
 assert.deepEqual(Object.keys(records).sort(),[...kinds].sort());
 assert.equal(stats.periodSummary([],records.sessions,'all','2026-12-31').sessions,6123,'all-time statistics see every session');
 const fallback={rpc:async fn=>fn==='read_whimsy'?{data:{books:[{id:'x'}],sessions:[]},error:null}:{data:null,error:{code:'PGRST202',message:'Could not find the function'}}};
 assert.deepEqual((await persistence.readWhimsy(fallback)).books,[{id:'x'}],'before the migration, the old single read still works');
 assert.deepEqual(await persistence.readWhimsyRecord(fallback,'books','x'),{id:'x'});
 const single={rpc:async(fn,args)=>fn==='read_whimsy_record'?{data:{id:args.p_id,revision:2},error:null}:{data:null,error:{message:'should not load everything'}}};
 assert.deepEqual(await persistence.readWhimsyRecord(single,'sessions','abc'),{id:'abc',revision:2},'a save is confirmed with one record, not the whole library');
});

test('migration is additive and keeps the old reader for already-deployed clients',()=>{
 const sql=read('supabase/migrations/20261105000100_whimsy_paged_reads.sql');
 assert.ok(!/\b(drop|truncate|delete\s+from|alter\s+table|update\s+public)\b/i.test(sql.replace(/--.*$/gm,'')),'no destructive statement');
 assert.match(sql,/create function public\.read_whimsy_page/);assert.match(sql,/create function public\.read_whimsy_record/);
 assert.match(sql,/least\(greatest\(coalesce\(p_limit,1000\),1\),1000\)/,'page size is bounded');
 assert.match(sql,/security invoker/);assert.match(sql,/revoke all on function public\.read_whimsy_page\(text,timestamptz,uuid,integer\) from public,anon/);
});
