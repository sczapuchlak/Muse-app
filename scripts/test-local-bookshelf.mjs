import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const {readWhimsy,saveWhimsyRecord,deleteWhimsyRecord}=load('lib/whimsy/persistence');
const {readReadingTimer,saveReadingTimer,deleteBookWithSessions}=load('lib/whimsy/reading-timer');
const uuid=()=>crypto.randomUUID(),users=[],must=r=>{if(r.error)throw r.error;return r.data;};
async function invite(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`books-${uuid()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options),session=must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token})).session;return {client,userId:link.user.id,session};}
try{
 const a=await invite(),b=await invite(),date='2026-11-02',timeZone='America/Los_Angeles',now=new Date().toISOString();
 assert.ok((await anon.rpc('read_reading_timer')).error);assert.ok((await anon.rpc('save_reading_timer',{p_payload:null,p_expected_revision:0,p_command_id:uuid()})).error);
 const bookDraft={id:uuid(),title:'A real test book',status:'reading',reviewEmojis:[],startedOn:date,format:'physical',totalPages:250,startingPage:20,currentPage:20,positionUpdatedAt:now},bookCommand=uuid();
 const book=await saveWhimsyRecord(a.client,'books',{record:bookDraft,expectedRevision:0,commandId:bookCommand});assert.equal((await saveWhimsyRecord(a.client,'books',{record:bookDraft,expectedRevision:0,commandId:bookCommand})).id,book.id);
 assert.equal((await readWhimsy(b.client)).books.length,0);assert.ok((await b.client.from('whimsy_books').insert({id:uuid(),user_id:a.userId,payload:{},activity_date:date,time_zone:timeZone})).error);
 const timerDraft={bookId:book.id,phase:'running',date,timeZone,startedAt:'2026-11-02T18:00:00.000Z',sessionId:uuid(),sessionCommandId:uuid(),segments:[],runningSince:'2026-11-02T18:00:00.000Z'},startCommand=uuid();
 const started=await saveReadingTimer(a.client,timerDraft,0,startCommand);assert.equal(started.revision,1);assert.equal((await saveReadingTimer(a.client,timerDraft,0,startCommand)).revision,1);
 assert.equal((await readReadingTimer(b.client)),null);assert.ok((await b.client.from('whimsy_reading_timers').update({payload:{}}).eq('user_id',a.userId)).error);
 await assert.rejects(()=>saveReadingTimer(b.client,{...timerDraft,bookId:book.id,sessionId:uuid()},0,uuid()));
 const paused=await saveReadingTimer(a.client,{...timerDraft,phase:'paused',segments:[{start:timerDraft.runningSince,end:'2026-11-02T18:20:00.000Z'}],runningSince:undefined},1,uuid());assert.equal(paused.phase,'paused');
 await assert.rejects(()=>saveReadingTimer(a.client,{...timerDraft,phase:'paused',segments:[]},1,uuid()));
 const resumed=await saveReadingTimer(a.client,{...timerDraft,phase:'running',segments:paused.segments,runningSince:'2026-11-02T18:25:00.000Z'},2,uuid());assert.equal(resumed.revision,3);
 const saving=await saveReadingTimer(a.client,{...timerDraft,phase:'saving',segments:[...resumed.segments,{start:'2026-11-02T18:25:00.000Z',end:'2026-11-02T18:40:00.000Z'}],runningSince:undefined,finishDraft:{pages:35,startingPage:20,endingPage:55,notes:'A good chapter'}},3,uuid());
 const sessionDraft={id:timerDraft.sessionId,bookId:book.id,date,timeZone,pages:35,activeSegments:saving.segments,startingPage:20,endingPage:55,notes:'A good chapter',manual:false},sessionCommand=timerDraft.sessionCommandId;
 const session=await saveWhimsyRecord(a.client,'sessions',{record:sessionDraft,expectedRevision:0,commandId:sessionCommand});assert.equal((await saveWhimsyRecord(a.client,'sessions',{record:sessionDraft,expectedRevision:0,commandId:sessionCommand})).id,session.id);
 await saveReadingTimer(a.client,null,saving.revision,uuid());assert.equal(await readReadingTimer(a.client),null);
 const fresh=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await fresh.auth.setSession(a.session));assert.equal((await readWhimsy(fresh)).sessions[0].pages,35);
 const manual=await saveWhimsyRecord(a.client,'sessions',{record:{id:uuid(),bookId:book.id,date,timeZone,pages:0,activeSegments:[],manual:true},expectedRevision:0,commandId:uuid()});assert.equal(manual.pages,0);
 const goal=await saveWhimsyRecord(a.client,'goals',{record:{id:uuid(),period:'day',start:date,end:date,target:20,unit:'minutes'},expectedRevision:0,commandId:uuid()});assert.equal(goal.period,'day');
 const editedSession=await saveWhimsyRecord(a.client,'sessions',{record:{...sessionDraft,notes:'Corrected note',positionRecordedAt:now},expectedRevision:session.revision,commandId:uuid()});assert.deepEqual(editedSession.activeSegments,sessionDraft.activeSegments);await assert.rejects(()=>saveWhimsyRecord(a.client,'sessions',{record:{...sessionDraft,notes:'Stale'},expectedRevision:session.revision,commandId:uuid()}));
 const completed=await saveWhimsyRecord(a.client,'books',{record:{...bookDraft,status:'finished',finishedOn:date,rating:5,reviewEmojis:['📚','✨','❤️'],finalThoughts:'A world worth revisiting',genre:'Fiction'},expectedRevision:book.revision,commandId:uuid()});assert.equal(completed.rating,5);assert.equal((await readWhimsy(fresh)).books[0].finalThoughts,'A world worth revisiting');await assert.rejects(()=>saveWhimsyRecord(a.client,'books',{record:{...bookDraft,title:'Stale'},expectedRevision:book.revision,commandId:uuid()}));
 await deleteWhimsyRecord(a.client,'sessions',manual.id,manual.revision,uuid());await deleteWhimsyRecord(a.client,'goals',goal.id,goal.revision,uuid());
 await assert.rejects(()=>deleteBookWithSessions(b.client,book.id,completed.revision,uuid()));await deleteBookWithSessions(a.client,book.id,completed.revision,uuid());assert.equal((await readWhimsy(a.client)).books.length,0);assert.equal((await readWhimsy(a.client)).sessions.length,0);
 console.log('PASS local Bookshelf CRUD, timer recovery, pause/resume, idempotent session save, manual session, daily goal, owner RLS, anonymous denial, restart, deletion');
}finally{for(const userId of users)must(await admin.auth.admin.deleteUser(userId));console.log('Disposable Bookshelf users removed.');}
