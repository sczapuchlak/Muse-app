// Reading tracker integrity against LOCAL Supabase only, with disposable users that are removed afterwards.
// Proves: no 5,000-record ceiling for paged reads, saves and timers keep working past it, the new optional book,
// session and timer fields round-trip through the real database functions, and rereads/archives persist.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const {readWhimsy,readWhimsyRecord,saveWhimsyRecord,deleteWhimsyRecord}=load('lib/whimsy/persistence');
const {readReadingTimer,saveReadingTimer}=load('lib/whimsy/reading-timer');
const {periodSummary,bookCompletions}=load('lib/whimsy/reading-stats');
const {bookPosition}=load('lib/whimsy/books');
const uuid=()=>crypto.randomUUID(),users=[],must=r=>{if(r.error)throw r.error;return r.data;};
async function invite(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`reading-${uuid()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options),session=must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token})).session;return {client,userId:link.user.id,session};}
const timeZone='America/Los_Angeles',BULK=5100;
try{
 const a=await invite(),other=await invite();
 const book=await saveWhimsyRecord(a.client,'books',{record:{id:uuid(),title:'Integrity test book',status:'reading',reviewEmojis:[],startedOn:'2020-01-01',totalPages:900,startingPage:0,currentPage:0,positionUpdatedAt:'2020-01-01T00:00:00.000Z'},expectedRevision:0,commandId:uuid()});
 // 5,100 historical sessions, one minute each, two minutes apart (no overlaps). The service role cannot write
 // reading tables by design, so the disposable user's history is seeded inside the LOCAL database container.
 const sql=`insert into public.whimsy_reading_sessions(id,user_id,book_id,activity_date,time_zone,payload)
  select gen_random_uuid(),'${a.userId}','${book.id}',(t.s at time zone 'UTC')::date,'${timeZone}',
   jsonb_build_object('bookId','${book.id}','date',to_char(t.s at time zone 'UTC','YYYY-MM-DD'),'timeZone','${timeZone}','pages',1,'manual',false,
    'activeSegments',jsonb_build_array(jsonb_build_object('start',to_char(t.s at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'end',to_char((t.s+interval '1 minute') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))))
  from (select timestamptz '2020-01-01 00:00:00+00'+k*interval '2 minutes' as s from generate_series(0,${BULK-1}) k) t;`;
 const seeded=spawnSync('docker',['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-q'],{input:sql,encoding:'utf8'});
 if(seeded.status!==0)throw Error(`Local seed failed: ${seeded.stderr}`);
 const old=await a.client.rpc('read_whimsy');assert.equal(old.error?.code,'54000','the previous single read still has its ceiling (kept for deployed clients)');
 const all=await readWhimsy(a.client);assert.equal(all.sessions.length,BULK,'paged read returns every session');assert.equal(new Set(all.sessions.map(s=>s.id)).size,BULK);
 assert.equal(periodSummary(all.books,all.sessions,'all','2026-11-05').seconds,BULK*60,'all-time time is complete');
 assert.equal((await readWhimsy(other.client)).sessions.length,0,'another owner sees none of them');
 // Saves, timers and deletes keep working beyond the old ceiling.
 const timerStart='2026-11-02T17:00:00.000Z',sessionId=uuid();
 const running=await saveReadingTimer(a.client,{bookId:book.id,phase:'running',date:'2026-11-02',timeZone,startedAt:timerStart,sessionId,sessionCommandId:uuid(),segments:[],runningSince:timerStart},0,uuid());
 // Forgotten timer corrected: open stretch ended at the reader's time, with the confirmation recorded on the timer.
 const paused=await saveReadingTimer(a.client,{...running,revision:undefined,updatedAt:undefined,phase:'paused',runningSince:undefined,segments:[{start:timerStart,end:'2026-11-02T18:30:00.000Z'}],confirmedSince:[timerStart]},running.revision,uuid());
 assert.deepEqual(paused.confirmedSince,[timerStart]);
 const corrected=[{start:timerStart,end:'2026-11-02T17:45:00.000Z'}];
 const withCorrection=await saveReadingTimer(a.client,{...paused,revision:undefined,updatedAt:undefined,correctedSegments:corrected},paused.revision,uuid());
 assert.deepEqual(withCorrection.correctedSegments,corrected,'corrections to a closed stretch are stored server-side, so every device sees them');
 const reread=await saveWhimsyRecord(a.client,'sessions',{record:{id:sessionId,bookId:book.id,date:'2026-11-02',timeZone,pages:20,startingPage:100,endingPage:120,reread:true,activeSegments:corrected,positionRecordedAt:corrected[0].end,manual:false},expectedRevision:0,commandId:uuid()});
 assert.equal(reread.reread,true);assert.equal(reread.manual,false,'a corrected timed session stays timed');
 await saveReadingTimer(a.client,null,withCorrection.revision,uuid());assert.equal(await readReadingTimer(a.client),null,'timer clears normally past the old ceiling');
 const afterSave=await readWhimsy(a.client);assert.equal(afterSave.sessions.length,BULK+1);
 assert.equal(bookPosition(afterSave.books[0],afterSave.sessions),bookPosition(afterSave.books[0],afterSave.sessions.filter(x=>!x.reread)),'a reread ending on page 120 does not move the saved place');
 assert.equal(bookPosition(afterSave.books[0],afterSave.sessions),0);
 // Completion history and archive round-trip through save_whimsy_record.
 const completions=[{id:'c1',finishedOn:'2024-02-01',startedOn:'2024-01-01',recordedAt:'2024-02-01T00:00:00.000Z'},{id:'c2',finishedOn:'2026-11-02',startedOn:'2026-10-01',recordedAt:'2026-11-02T00:00:00.000Z'}];
 const finished=await saveWhimsyRecord(a.client,'books',{record:{...afterSave.books[0],revision:undefined,userId:undefined,createdAt:undefined,updatedAt:undefined,status:'finished',finishedOn:'2026-11-02',completions},expectedRevision:afterSave.books[0].revision,commandId:uuid()});
 assert.deepEqual(bookCompletions(finished).map(c=>c.finishedOn),['2024-02-01','2026-11-02']);
 const archived=await saveWhimsyRecord(a.client,'books',{record:{...finished,revision:undefined,userId:undefined,createdAt:undefined,updatedAt:undefined,archivedAt:'2026-11-05T00:00:00.000Z'},expectedRevision:finished.revision,commandId:uuid()});
 assert.equal(archived.archivedAt,'2026-11-05T00:00:00.000Z');assert.equal((await readWhimsyRecord(a.client,'books',book.id)).completions.length,2,'archiving keeps history');
 assert.equal((await readWhimsy(a.client)).sessions.length,BULK+1,'archiving never touches sessions');
 const {archivedAt:_unused,...restoredDraft}=archived;
 const restored=await saveWhimsyRecord(a.client,'books',{record:{...restoredDraft,revision:undefined,userId:undefined,createdAt:undefined,updatedAt:undefined},expectedRevision:archived.revision,commandId:uuid()});
 assert.equal(restored.archivedAt,undefined);
 await deleteWhimsyRecord(a.client,'sessions',reread.id,reread.revision,uuid());
 assert.equal((await readWhimsy(a.client)).sessions.length,BULK,'deleting one session past the old ceiling is confirmed');
 assert.equal(await readWhimsyRecord(other.client,'books',book.id),null,'single-record read is owner-scoped');
 console.log(`PASS local reading integrity: ${BULK}+ records read completely, old ceiling bypassed, timer correction stored, reread/completions/archive round-trip, owner isolation`);
}finally{for(const userId of users)must(await admin.auth.admin.deleteUser(userId));console.log('Disposable reading-integrity users removed.');}
