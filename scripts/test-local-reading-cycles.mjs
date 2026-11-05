// Reading cycles against LOCAL Supabase only, with disposable users removed afterwards. One account signed in on
// two "devices" (separate sessions): reads, per-read ratings/reviews and session links written on one are read back
// unchanged on the other, through the real save functions and validation; another account sees none of it.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const {readWhimsy,readWhimsyRecord,saveWhimsyRecord}=load('lib/whimsy/persistence');
const {readReadingTimer,saveReadingTimer}=load('lib/whimsy/reading-timer');
const cycles=load('lib/whimsy/reading-cycles');
const {completionsIn}=load('lib/whimsy/reading-stats');
const uuid=()=>crypto.randomUUID(),users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const signIn=async(email,type)=>{const link=must(await admin.auth.admin.generateLink({type,email}));const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:type==='invite'?'invite':'magiclink',token_hash:link.properties.hashed_token}));return {client,userId:link.user.id};};
async function account(){const email=`cycles-${uuid()}@example.test`,first=await signIn(email,'invite');users.push(first.userId);const second=await signIn(email,'magiclink');assert.equal(second.userId,first.userId);return [first.client,second.client];}
const strip=b=>Object.fromEntries(Object.entries(b).filter(([k])=>!['revision','userId','createdAt','updatedAt'].includes(k)));
const saveBook=(client,book,fields)=>saveWhimsyRecord(client,'books',{record:{...strip(book),...fields},expectedRevision:book.revision,commandId:uuid()});
const timeZone='America/Los_Angeles',seg=(day,h,m)=>({start:`${day}T${String(h).padStart(2,'0')}:00:00.000Z`,end:`${day}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00.000Z`});
try{
 const [phone,laptop]=await account(),[other]=await account();
 // An older book: finished once in 2026 with a book-level rating/review and an older session with no cycle id.
 let book=await saveWhimsyRecord(phone,'books',{record:{id:uuid(),title:'Cycle test book',status:'finished',reviewEmojis:['🐉'],startedOn:'2026-03-01',finishedOn:'2026-03-20',rating:4,finalThoughts:'First time: wonderful.',totalPages:300},expectedRevision:0,commandId:uuid()});
 const legacy=await saveWhimsyRecord(phone,'sessions',{record:{id:uuid(),bookId:book.id,date:'2026-03-05',timeZone,pages:50,activeSegments:[seg('2026-03-05',18,45)],manual:false},expectedRevision:0,commandId:uuid()});
 // Laptop starts a 2027 reread: the older opinion is stored on the 2026 read first, then a new read opens.
 book=(await readWhimsy(laptop)).books[0];
 book=await saveBook(laptop,book,cycles.shelfMove(book,'reading','2027-01-10'));
 const reread=book.cycleId;assert.ok(reread);assert.deepEqual([book.completions[0].rating,book.completions[0].review],[4,'First time: wonderful.']);
 // Phone runs the timer for that read; the session carries the read id.
 const timer=await saveReadingTimer(phone,{bookId:book.id,cycleId:reread,phase:'paused',date:'2027-01-11',timeZone,startedAt:'2027-01-11T18:00:00.000Z',sessionId:uuid(),sessionCommandId:uuid(),segments:[seg('2027-01-11',18,40)]},0,uuid());
 assert.equal((await readReadingTimer(laptop)).cycleId,reread,'the other device sees which read the timer belongs to');
 const timed=await saveWhimsyRecord(phone,'sessions',{record:{id:timer.sessionId,bookId:book.id,date:'2027-01-11',timeZone,pages:80,activeSegments:timer.segments,manual:false,cycleId:timer.cycleId},expectedRevision:0,commandId:timer.sessionCommandId});
 await saveReadingTimer(phone,null,timer.revision,uuid());
 // Laptop logs a manual session for the same read, then finishes it on the same day with a different opinion.
 await saveWhimsyRecord(laptop,'sessions',{record:{id:uuid(),bookId:book.id,date:'2027-01-12',timeZone,pages:30,activeSegments:[seg('2027-01-12',19,30)],manual:true,cycleId:reread},expectedRevision:0,commandId:uuid()});
 book=(await readWhimsy(laptop)).books[0];
 const finishFields=cycles.shelfMove(book,'finished','2027-01-12',{finishedOn:'2027-01-12',rating:2,review:'Second time: not for me.',reviewEmojis:['🐉','🖤']});
 const finishCommand=uuid();
 book=await saveWhimsyRecord(laptop,'books',{record:{...strip(book),...finishFields},expectedRevision:book.revision,commandId:finishCommand});
 // The same finish retried (same command) is applied once.
 const retried=await saveWhimsyRecord(laptop,'books',{record:{...strip((await readWhimsy(laptop)).books[0]),...finishFields},expectedRevision:book.revision-1,commandId:finishCommand}).catch(e=>e);
 assert.ok(!(retried instanceof Error)||/revision|changed/i.test(String(retried.message)),'a retried finish never writes twice');
 // Same-day restart on the phone opens a third read without touching the first two.
 let phoneBook=(await readWhimsy(phone)).books[0];
 phoneBook=await saveBook(phone,phoneBook,cycles.shelfMove(phoneBook,'reading','2027-01-12'));
 assert.notEqual(phoneBook.cycleId,reread);
 await saveWhimsyRecord(phone,'sessions',{record:{id:uuid(),bookId:book.id,date:'2027-01-12',timeZone,pages:5,activeSegments:[seg('2027-01-12',22,10)],manual:true,cycleId:phoneBook.cycleId},expectedRevision:0,commandId:uuid()});
 // Everything reads back identically on the laptop.
 const seen=await readWhimsy(laptop),b=seen.books[0];
 assert.deepEqual(b.completions.map(c=>[c.finishedOn,c.rating,c.review]),[['2026-03-20',4,'First time: wonderful.'],['2027-01-12',2,'Second time: not for me.']],'each read keeps its own rating and review');
 assert.equal(b.completions[1].id,reread,'the finished read keeps its id');
 assert.deepEqual([b.rating,b.finalThoughts,b.reviewEmojis],[2,'Second time: not for me.',['🐉','🖤']],'cards show the latest read; emojis are shared by the book');
 const reads=cycles.bookReads(b),stat=id=>cycles.readStats(b,seen.sessions,reads.find(r=>r.id===id),'2027-02-01');
 assert.deepEqual([stat(b.completions[0].id).pages,stat(reread).pages,stat(b.cycleId).pages],[50,110,5],'older, timed+manual, and same-day sessions each land in their own read');
 assert.equal(seen.sessions.find(s=>s.id===legacy.id).cycleId,undefined,'the older session was never rewritten');
 assert.equal(seen.sessions.find(s=>s.id===timed.id).cycleId,reread);
 const total=completionsIn([b],null);assert.deepEqual([total.count,total.uniqueTitles,total.rereads],[2,1,1]);
 assert.equal(seen.books.length,1,'still one library book');
 // Owner isolation.
 const theirs=await readWhimsy(other);assert.deepEqual([theirs.books.length,theirs.sessions.length],[0,0]);
 assert.equal(await readWhimsyRecord(other,'books',b.id),null);
 console.log('PASS local reading cycles: two devices, per-read ratings/reviews, timed/manual/same-day links, older data untouched, owner isolation');
}finally{for(const userId of users)must(await admin.auth.admin.deleteUser(userId));console.log('Disposable reading-cycle users removed.');}
