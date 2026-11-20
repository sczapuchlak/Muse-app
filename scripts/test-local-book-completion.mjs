// Finish Book (historical reading, bulk sessions, half stars) against LOCAL Supabase only, with disposable users
// removed afterwards. Everything goes through the real client save path (lib/books/finish → save_book_reading) and
// the existing validators: all-or-nothing writes, retries that never duplicate, the timer finish, and ownership.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const {readWhimsy,saveWhimsyRecord}=load('lib/whimsy/persistence');
const {readReadingTimer,saveReadingTimer,saveBookReading}=load('lib/whimsy/reading-timer');
const {saveReadingPlan,commandId}=load('lib/books/finish');
const engine=load('lib/books/completion');
const stats=load('lib/whimsy/reading-stats');
const cycles=load('lib/whimsy/reading-cycles');
const uuid=()=>crypto.randomUUID(),users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const signIn=async email=>{const link=must(await admin.auth.admin.generateLink({type:'invite',email}));const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));users.push(link.user.id);return client;};
const timeZone='America/Los_Angeles',today='2026-11-20';
const newBook=(client,fields)=>saveWhimsyRecord(client,'books',{record:{id:uuid(),title:'Test book',status:'planned',reviewEmojis:[],totalPages:384,startingPage:0,currentPage:0,positionUpdatedAt:new Date().toISOString(),positionDate:today,...fields},expectedRevision:0,commandId:uuid()});
const rows=r=>engine.validateRows(r.map(([date,s,e,m])=>({key:uuid(),date,startPage:String(s),endPage:String(e),minutes:String(m??''),notes:''})),{totalPages:384,today,firstStart:0});
const mine=async(client,id)=>{const all=await readWhimsy(client);return {book:all.books.find(b=>b.id===id),sessions:all.sessions.filter(s=>s.bookId===id),all};};
let passed=0;const check=async(name,fn)=>{await fn();passed++;console.log(`✔ ${name}`);};
try{
 const me=await signIn(`finish-${uuid()}@example.test`),other=await signIn(`finish-other-${uuid()}@example.test`);

 await check('a To Be Read book finished with dates only: historical dates, half star, no sessions',async()=>{
  const book=await newBook(me,{});
  await saveReadingPlan(me,{book,plan:{target:'current',startedOn:'2025-06-01',finishedOn:'2025-06-06',opinion:{rating:4.5,review:'Glorious',reviewEmojis:[]},rows:[]},sessions:[],timeZone,today});
  const {book:b,sessions}=await mine(me,book.id);
  assert.equal(b.status,'finished');assert.equal(b.finishedOn,'2025-06-06');assert.equal(b.startedOn,'2025-06-01');assert.equal(b.rating,4.5);
  assert.equal(b.completions.length,1);assert.equal(b.completions[0].rating,4.5);assert.equal(sessions.length,0);
 });

 await check('finish date only: the start stays unknown, and unrated stays unrated',async()=>{
  const book=await newBook(me,{});
  await saveReadingPlan(me,{book,plan:{target:'current',finishedOn:'2024-02-10',opinion:{reviewEmojis:[]},rows:[]},sessions:[],timeZone,today});
  const {book:b}=await mine(me,book.id);
  assert.equal(b.completions[0].startedOn,undefined);assert.equal(b.completions[0].rating,undefined);assert.ok(!('rating' in b)||b.rating===undefined||b.rating===null);
 });

 let addedId;
 await check('a new Already read book with four sessions is saved with them in one write',async()=>{
  const id=uuid(),now=new Date().toISOString(),draft={id,userId:'',revision:0,createdAt:now,updatedAt:now,title:'Already read',status:'planned',reviewEmojis:[],totalPages:384,startingPage:0,currentPage:0,positionUpdatedAt:now,positionDate:today};
  const {parsed,issues}=rows([['2025-06-01',0,60,45],['2025-06-02',60,145,70],['2025-06-04',145,250,85],['2025-06-06',250,384,90]]);assert.deepEqual(issues,[]);
  const all=(await readWhimsy(me)).sessions;
  await saveReadingPlan(me,{book:draft,isNew:true,plan:{target:'current',startedOn:'2025-06-01',finishedOn:'2025-06-06',opinion:{rating:2.5,reviewEmojis:[]},rows:parsed},sessions:all,timeZone,today});
  const {book:b,sessions,all:everything}=await mine(me,id);addedId=id;
  assert.equal(b.status,'finished');assert.equal(b.completions[0].rating,2.5);
  assert.equal(sessions.length,4);assert.ok(sessions.every(s=>s.manual&&s.cycleId===b.completions[0].id));
  assert.deepEqual(sessions.map(s=>Math.round(stats.sessionSeconds(s)/60)).sort((a,c)=>a-c),[45,70,85,90]);
  const own=everything.sessions.filter(s=>s.bookId===id),june=stats.periodSummary(everything.books.filter(x=>x.id===id),own,'month','2025-06-15');
  assert.equal(june.completions.count,1);assert.equal(june.pages,384);assert.equal(Math.round(june.seconds/60),290);assert.equal(june.readingDays,4,'four real reading days, none invented between them');
  const nov=stats.periodSummary(everything.books,everything.sessions,'month',today);
  assert.equal(nov.completions.events.filter(e=>e.book.id===id).length,0,'not counted on the day it was entered');
 });

 await check('a retry of the same save never duplicates the read or its sessions',async()=>{
  const book=await newBook(me,{});
  const {parsed}=rows([['2023-01-05',0,100,30],['2023-01-08',100,384]]);
  const args={book,plan:{target:'current',finishedOn:'2023-01-08',opinion:{rating:0.5,reviewEmojis:[]},rows:parsed},sessions:(await readWhimsy(me)).sessions,timeZone,today};
  await saveReadingPlan(me,args);await saveReadingPlan(me,args);
  const {book:b,sessions}=await mine(me,book.id);
  assert.equal(b.completions.length,1);assert.equal(sessions.length,2);assert.equal(b.revision,book.revision+1);assert.equal(b.rating,0.5);
 });

 await check('a failure anywhere leaves nothing behind (book unchanged, no sessions)',async()=>{
  const book=await newBook(me,{});
  const good={id:uuid(),bookId:book.id,date:'2022-03-01',timeZone,pages:10,startingPage:0,endingPage:10,activeSegments:[],manual:true};
  const bad={id:uuid(),bookId:book.id,date:'2022-03-02',timeZone,pages:-5,activeSegments:[],manual:true};
  const record={...book,status:'finished',finishedOn:'2022-03-02'};for(const k of ['userId','revision','createdAt','updatedAt'])delete record[k];
  await assert.rejects(saveBookReading(me,{bookId:book.id,book:{record,expectedRevision:book.revision,commandId:uuid()},sessions:[{record:good,expectedRevision:0,commandId:uuid()},{record:bad,expectedRevision:0,commandId:uuid()}]}));
  const {book:b,sessions}=await mine(me,book.id);
  assert.equal(b.status,'planned');assert.equal(b.revision,book.revision);assert.equal(sessions.length,0);
 });

 await check('the live timer: sitting, finished read and cleared timer saved together; minutes exact',async()=>{
  let book=await newBook(me,{status:'reading',startedOn:'2026-11-18'});
  book=await saveWhimsyRecord(me,'books',{record:{...Object.fromEntries(Object.entries(book).filter(([k])=>!['userId','revision','createdAt','updatedAt'].includes(k))),cycleId:cycles.newCycleId(book)},expectedRevision:book.revision,commandId:uuid()});
  const sessionId=uuid(),sessionCommandId=uuid(),segments=[{start:'2026-11-20T03:00:00.000Z',end:'2026-11-20T03:48:00.000Z'}];
  const timer=await saveReadingTimer(me,{bookId:book.id,cycleId:book.cycleId,phase:'finishing',date:'2026-11-19',timeZone,startedAt:segments[0].start,startingPage:300,sessionId,sessionCommandId,segments},0,uuid());
  const sitting={record:{id:sessionId,bookId:book.id,date:'2026-11-19',timeZone,pages:84,startingPage:300,endingPage:384,notes:'',activeSegments:segments,positionRecordedAt:segments[0].end,manual:false,cycleId:book.cycleId},commandId:sessionCommandId,timer:{expectedRevision:timer.revision,commandId:await commandId('timer-finish',{sessionId,revision:timer.revision})}};
  await saveReadingPlan(me,{book,plan:{target:'current',startedOn:'2026-11-18',finishedOn:'2026-11-20',opinion:{rating:5,reviewEmojis:[]},rows:[]},sessions:(await readWhimsy(me)).sessions,timeZone,today,sitting});
  const {book:b,sessions}=await mine(me,book.id);
  assert.equal(await readReadingTimer(me),null);assert.equal(b.status,'finished');assert.equal(b.finishedOn,'2026-11-20','the completion date, while the sitting keeps its own start date');
  assert.equal(sessions.length,1);assert.equal(Math.round(stats.sessionSeconds(sessions[0])/60),48);assert.equal(sessions[0].date,'2026-11-19');assert.equal(sessions[0].cycleId,b.completions[0].id);
 });

 await check('a timer for another book is never cleared by finishing this one',async()=>{
  const a=await newBook(me,{status:'reading'}),b=await newBook(me,{});
  const timer=await saveReadingTimer(me,{bookId:a.id,phase:'paused',date:today,timeZone,startedAt:'2026-11-20T01:00:00.000Z',sessionId:uuid(),sessionCommandId:uuid(),segments:[]},0,uuid());
  await assert.rejects(saveBookReading(me,{bookId:b.id,sessions:[{record:{id:uuid(),bookId:b.id,date:'2021-01-01',timeZone,pages:1,activeSegments:[],manual:true},expectedRevision:0,commandId:uuid()}],timer:{expectedRevision:timer.revision,commandId:uuid()}}),e=>/another book/.test(e.message));
  assert.equal((await readReadingTimer(me)).bookId,a.id);
  await saveReadingTimer(me,null,timer.revision,uuid());
 });

 await check('an earlier read added later: one book, two reads, the current read and its sessions untouched',async()=>{
  const {book:finished}=await mine(me,addedId);
  await saveReadingPlan(me,{book:finished,plan:{target:'past',startedOn:'2020-03-01',finishedOn:'2020-03-09',opinion:{rating:4,reviewEmojis:[]},rows:[]},sessions:(await readWhimsy(me)).sessions,timeZone,today});
  const {book:b,sessions,all}=await mine(me,addedId);
  assert.equal(all.books.filter(x=>x.title==='Already read').length,1,'no duplicate catalog book');
  assert.deepEqual(b.completions.map(c=>[c.finishedOn,c.rating]),[['2020-03-09',4],['2025-06-06',2.5]]);
  assert.equal(b.finishedOn,'2025-06-06');assert.equal(sessions.length,4);
  assert.ok(sessions.every(s=>cycles.sessionReadId(b,s)===b.completions[1].id),'the 2025 sessions stay with the 2025 read');
 });

 await check('several sessions logged at once for a read in progress (no finish)',async()=>{
  const book=await newBook(me,{status:'reading',startedOn:'2026-11-01'});
  const {parsed}=engine.validateRows([{key:uuid(),date:'2026-11-02',startPage:'0',endPage:'40',minutes:'',notes:''},{key:uuid(),date:'2026-11-03',startPage:'',endPage:'90',minutes:'25',notes:'cosy'}],{totalPages:384,today,firstStart:0});
  await saveReadingPlan(me,{book,plan:{target:'log',rows:parsed},sessions:(await readWhimsy(me)).sessions,timeZone,today});
  const {book:b,sessions}=await mine(me,book.id);
  assert.equal(b.status,'reading');assert.ok(b.cycleId,'the read in progress got its stored id in the same write');
  assert.equal(sessions.length,2);assert.ok(sessions.every(s=>s.cycleId===b.cycleId));
  assert.equal(sessions.find(s=>s.notes==='cosy').startingPage,40,'continued from the row above');
 });

 await check('another account can neither log to nor finish this book; anonymous callers have no access',async()=>{
  const book=await newBook(me,{});
  await assert.rejects(saveBookReading(other,{bookId:book.id,sessions:[{record:{id:uuid(),bookId:book.id,date:'2021-01-01',timeZone,pages:1,activeSegments:[],manual:true},expectedRevision:0,commandId:uuid()}]}));
  await assert.rejects(saveReadingPlan(other,{book,plan:{target:'current',finishedOn:'2021-01-01',opinion:{reviewEmojis:[]},rows:[]},sessions:[],timeZone,today}));
  assert.equal((await mine(me,book.id)).book.status,'planned');
  assert.equal((await readWhimsy(other)).books.length,0);
  const anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
  const denied=await anon.rpc('save_book_reading',{p_book_id:book.id,p_book:null,p_expected_revision:null,p_command_id:null,p_sessions:[]});
  assert.ok(denied.error,'anon cannot call it');
 });
 console.log(`\n${passed} checks passed`);
}finally{for(const id of users)await admin.auth.admin.deleteUser(id).catch(()=>{});}
