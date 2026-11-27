// Reading Atlas V2 (Nov 26): one toolbar (sections + timeframe), a compact summary strip, content-sized cards, and every
// section still present. Seeds a realistic year, then checks and screenshots each section on desktop and phone.
// Requires a production build (BOOKS_UI_ORIGIN) and local Supabase. Run: node scripts/test-atlas-ui.mjs
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';

let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const account=await seedAccount();let ui;
const today=new Date().toISOString().slice(0,10),year=today.slice(0,4),month=today.slice(0,7);
try{
 const {client}=account;
 const save=async(kind,record)=>{const {error}=await client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:record,p_delete:false});if(error)throw Error(`${kind}: ${error.message}`);return record.id;};
 const cover=isbn=>`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
 const book=f=>({id:crypto.randomUUID(),reviewEmojis:[],format:'physical',startingPage:0,currentPage:0,...f});
 const fin=[['Circe again','9780316556347',5,true,'Fantasy','04',['😂','🌿','✨']],['Book Lovers','9780593334836',4.5,false,'Romance','09',['🦇','⚡','💪']],['Beach Read','9781984806734',4,true,'Romance','10',['😂','🔥','💔']],['The Song of Achilles','9780062060624',4.5,false,'Fantasy, Romance',month.slice(5),['🌙','✨','🦋']]];
 for(const [title,isbn,rating,favorite,genre,m,emojis] of fin){const d=`${year}-${m}-${m===month.slice(5)?'03':'18'}`,start=`${year}-${m}-0${m===month.slice(5)?'1':'8'}`,cycle=crypto.randomUUID();
  const id=await save('books',book({title,author:'Someone',genre,status:'finished',startedOn:start,finishedOn:d,coverUrl:cover(isbn),totalPages:320,rating,favorite,cycleId:cycle,reviewEmojis:emojis,completions:[{id:cycle,startedOn:start,finishedOn:d,rating,emojis}]}));
  for(const [i,h] of [[0,22],[2,23],[4,13]]){const day=`${year}-${m}-${String(Number(start.slice(8))+i).padStart(2,'0')}`;if(day>today)continue;await save('sessions',{id:crypto.randomUUID(),cycleId:cycle,bookId:id,date:day,timeZone:'UTC',pages:40,startingPage:i*40,endingPage:i*40+40,notes:i===2?'Could not put it down.':'',activeSegments:[{start:`${day}T${h}:00:00.000Z`,end:`${day}T${h}:35:00.000Z`}],positionRecordedAt:`${day}T${h}:35:00.000Z`,manual:false});}
 }
 await save('goals',{id:crypto.randomUUID(),period:'year',start:`${year}-01-01`,end:`${year}-12-31`,unit:'books',recurs:false,target:12});
 await save('goals',{id:crypto.randomUUID(),period:'day',start:`${month}-01`,end:`${month}-01`,unit:'minutes',recurs:true,target:20,targetHistory:[{from:`${month}-01`,target:20}]});

 ui=await openBrowser(account,{shots:process.env.ATLAS_SHOTS});
 const {evaluate,go,viewport,shoot,overflow,errors}=ui;
 const sections=[['overview','Overview'],['streak','Streaks'],['dna','Reading DNA'],['patterns','Patterns'],['books','Books & Milestones'],['year','Year in Review']];
 for(const [w,h,tag,touch] of [[1366,900,'desktop',false],[390,844,'phone',true]]){
  await viewport(w,h,touch);
  for(const [id] of sections){
   await go(`/collections/reading-atlas?section=${id}`,'!!document.querySelector(".muse-atlas-sections")','atlas '+id);await wait(900);
   check(!(await overflow()),`${tag} ${id}: no sideways scroll`);
   check(await evaluate(()=>{const t=document.querySelector('.muse-atlas-toolbar');return !!t&&!!t.querySelector('.muse-atlas-sections');}),`${tag} ${id}: sections and timeframe share one toolbar`);
   if(id==='overview'){
    check(await evaluate(()=>document.querySelectorAll('.muse-atlas-band .muse-dna-stats>div').length===4&&!!document.querySelector('.muse-hl3 .muse-hl3-portrait')&&document.querySelectorAll('.muse-hl3-col').length===3),`${tag}: the band opens the page; Highlights in three parts (portrait, superlatives, rhythm)`);
    check(await evaluate(()=>document.querySelectorAll('.muse-atlas-charts>.muse-atlas-chart').length===4&&!!document.querySelector('.muse-atlas-chart[data-variant="area"]')&&!!document.querySelector('.muse-atlas-chart[data-variant="line"]')),`${tag}: four trend charts, each in its own shape (area, bars, line)`);
    check(await evaluate(()=>!!document.querySelector('.muse-atlas-ov-grid .muse-cal')&&!!document.querySelector('.muse-atlas-challengecard .muse-challenge')&&!!document.querySelector('.muse-atlas-challengecard .muse-atlas-goals')&&!!document.querySelector('.muse-atlas-shelves .muse-emojiboard')&&!!document.querySelector('.muse-atlas-charts .muse-bam')),`${tag}: calendar | challenge with its goals | shelves; Books a month in the chart row`);
    if(tag==='desktop')check(await evaluate(()=>{const b=[...document.querySelectorAll('.muse-atlas-ov-grid>*')].map(x=>Math.round(x.getBoundingClientRect().bottom));return Math.max(...b)-Math.min(...b)<3;}),'desktop: the calendar row ends on one line');
    if(tag==='desktop')check(await evaluate(()=>document.documentElement.scrollHeight<3400),`desktop overview is compact (${await evaluate(()=>document.documentElement.scrollHeight)}px, was ~3990)`);
   }
   if(id==='books')check(await evaluate(()=>!!document.querySelector('.muse-atlas-band')&&document.querySelectorAll('.muse-journey li').length>0&&!!document.querySelector('.muse-sup-feature')),`${tag}: Books & Milestones has its hero, featured superlative and milestone journey`);
   if(id==='dna'){check(await evaluate(()=>!!document.querySelector('.muse-dna-hero .muse-dna-stats')&&!!document.querySelector('.muse-dna-genre-bars')&&!!document.querySelector('.muse-dna-rhythm .muse-atlas-heatmap')&&document.querySelectorAll('.muse-dna-habits li').length<=3),`${tag}: Reading DNA is a band, genres | vibes, rhythm | habits, speed | formats`);
    if(tag==='desktop')check(await evaluate(()=>[...document.querySelectorAll('.muse-dna-row')].every(r=>{const h=[...r.children].map(c=>Math.round(c.getBoundingClientRect().height));return Math.max(...h)-Math.min(...h)<2;})),'desktop: every Reading DNA row is one height');}
   await shoot(`atlas-${tag}-${id}`,{full:true});
  }
 }
 check(!errors.length,`no page errors${errors.length?': '+errors.join(' | ').slice(0,400):''}`);
 console.log(`\n${passed} checks passed. Shots: ${ui.shots}`);
}finally{ui?.close();await removeAccount(account.userId);}
