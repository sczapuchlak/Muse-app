// Up Next merged into the Reading Plan, the yearly plan by month, and the Atlas layout fixes (Nov 25).
// Requires a production build on :3000 and local Supabase. Run: node scripts/test-plans-merge-ui.mjs
import assert from 'node:assert/strict';
import {admin,sql,seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';

let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const account=await seedAccount();let ui;
const today=new Date().toISOString().slice(0,10),month=today.slice(0,7),year=today.slice(0,4);
try{
 const {client,userId,ids}=account;
 const save=async(kind,record)=>{const {error}=await client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:record,p_delete:false});if(error)throw Error(`${kind}: ${error.message}`);return record.id;};
 const cover=isbn=>`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
 const book=f=>({id:crypto.randomUUID(),reviewEmojis:[],format:'physical',startingPage:0,currentPage:0,genre:'Romance',...f});
 ids.wing=await save('books',book({title:'Fourth Wing',author:'Rebecca Yarros',status:'planned',coverUrl:cover('9781649374042'),totalPages:500}));
 // Finished this year, rated and hearted, with sittings on several days this month (Atlas covers, Top rated, Favorites).
 const day=n=>`${month}-${String(n).padStart(2,'0')}`,days=[3,4,6,9,11].filter(n=>day(n)<=today);
 for(const [i,[title,isbn,rating,fav]] of [['Circe again','9780316556347',5,true],['The Song of Achilles','9780062060624',4.5,true],['Book Lovers','9780593334836',4,false],['Beach Read','9781984806734',5,true],['People We Meet on Vacation','9781984806758',3.5,false],['Happy Place','9780593441275',4,true],['Funny Story','9780593441282',4.5,false]].entries()){
  const fin=`${year}-${String(Math.min(Number(month.slice(5)),1+i)).padStart(2,'0')}-05`,cycle=crypto.randomUUID();
  const id=await save('books',book({title,author:'Someone',status:'finished',startedOn:fin,finishedOn:fin,coverUrl:cover(isbn),totalPages:300,rating,favorite:fav,cycleId:cycle,reviewEmojis:[['😂','🌿','✨'],['🦇','⚡','💪'],['😂','🔥','💔'],['🌙','✨','🦋'],['😭','📚','☕'],['🌸','😂','🍷'],['🗡️','🐉','👑']][i],completions:[{id:crypto.randomUUID(),finishedOn:fin,startedOn:fin,recordedAt:`${fin}T00:00:00.000Z`,rating,favorite:fav}]}));
  if(i<days.length){const d=day(days[i]);await save('sessions',{id:crypto.randomUUID(),cycleId:cycle,bookId:id,date:d,timeZone:'UTC',pages:30,startingPage:0,endingPage:30,notes:'',activeSegments:[{start:`${d}T22:00:00.000Z`,end:`${d}T22:40:00.000Z`}],positionRecordedAt:`${d}T22:40:00.000Z`,manual:false});}
 }
 await save('goals',{id:crypto.randomUUID(),period:'day',start:`${month}-01`,end:`${month}-01`,unit:'minutes',recurs:true,target:30,targetHistory:[{from:`${month}-01`,target:30}]});
 // The old Up Next: a waiting book and one already being read.
 sql(`insert into public.up_next_slots (user_id,slot,book_id) values ('${userId}',0,'${ids.acowar}'),('${userId}',1,'${ids.heir}')`);
 // Plans: Circe in March, the recipe notebook for the year with no month.
 for(const [kind,period,id] of [['month',`${year}-03`,ids.circe],['year',year,ids.manual]]){const {error}=await client.rpc('add_reading_plan_books',{p_kind:kind,p_period:period,p_book_ids:[id]});if(error)throw error;}

 ui=await openBrowser(account,{shots:process.env.PLANS_SHOTS});
 const {evaluate,until,go,click,viewport,shoot,errors,text}=ui;
 const planTitles=()=>evaluate(()=>[...document.querySelectorAll('.muse-plans .muse-plan-title')].map(x=>x.textContent));

 // ---- Plans: the old Up Next slots' waiting book is in this month's plan (the Dashboard's Up next now reads from plans) ----
 await go('/collections/plans','!!document.querySelector(".muse-plans .muse-plan-card")','dashboard plans');
 await until(()=>/Up Next now lives/.test(document.querySelector('.muse-plans-note')?.textContent??''),'the hand-over note');
 check(!(await evaluate(()=>!!document.querySelector('.muse-upnext'))),'there is no Up Next card on the Dashboard');
 check(JSON.stringify(await planTitles())==='["A Court of Wings and Ruin"]','the waiting Up Next book is now in this month’s plan (the one being read is let go)');
 check(sql(`select count(*) from public.up_next_slots where user_id='${userId}'`)==='0','the old Up Next slots are emptied, so it happens once');
 await shoot('plans-dashboard',{full:true});

 // ---- Spin to add: the wheel offers waiting books not already in the plan, and only adds ----
 await click('.muse-plans button','Spin to add');
 await until(()=>!!document.querySelector('.muse-roulette'),'the wheel opens');
 check(await evaluate(()=>document.querySelector('.muse-roulette [aria-pressed="true"]')?.textContent.startsWith('To Be Read')),'the wheel starts on To Be Read');
 check(await evaluate(()=>!document.querySelector('.muse-roulette').textContent.includes('This month’s plan')),'adding to this month, the wheel doesn’t offer this month’s own plan');
 check(await evaluate(()=>/^1 book is in the deck/.test(document.querySelector('.muse-roulette-tease')?.textContent??'')),'books already in the plan are not in the wheel');
 await click('.muse-roulette-spin');await until(()=>!!document.querySelector('.muse-roulette-result'),'a book is picked');
 check((await text('.muse-roulette-result strong'))==='Fourth Wing','the wheel lands on the one eligible book');
 await shoot('plans-spin');
 await click('.muse-roulette-actions button','Add to');await until(()=>document.querySelectorAll('.muse-plans .muse-plan-card').length===2,'the spun book joins the plan');
 const wing=(await client.from('whimsy_books').select('payload').eq('id',ids.wing).single()).data;
 check(await evaluate(()=>[...document.querySelectorAll('.muse-plans .muse-plan-title')].map(x=>x.textContent).join()==='A Court of Wings and Ruin,Fourth Wing'),'Spin to add puts the book at the end of the plan');
 check(!wing||JSON.stringify(wing).includes('"planned"'),'spinning never starts reading the book');

 // ---- Start reading from a plan row (the existing start flow) ----
 check(await evaluate(()=>document.querySelectorAll('.muse-plans .muse-plan-start').length===2),'each waiting book in the plan has a Start reading button');
 await click('.muse-plans .muse-plan-start','Start reading Fourth Wing');
 await until(()=>![...document.querySelectorAll('.muse-plans .muse-plan-card')].find(c=>c.textContent.includes('Fourth Wing'))?.querySelector('.muse-plan-start')||document.querySelector('.muse-plans .muse-plan-start:disabled'),'reading starts');
 await wait(1200);
 check(await evaluate(()=>[...document.querySelectorAll('.muse-plans .muse-plan-card')].some(c=>c.textContent.includes('Fourth Wing')&&c.dataset.status==='reading')),'Start reading moves the book to Currently Reading and it stays in the plan');
 check(await evaluate(()=>[...document.querySelectorAll('.muse-plans .muse-plan-start')].every(b=>b.disabled)),'while a sitting is open, the other Start buttons wait');

 // ---- Yearly: every month's books, by month, then the year's own ----
 await click('.muse-plans .muse-segmented button','Year');await wait(400);
 check(JSON.stringify(await planTitles())==='["Circe","A Court of Wings and Ruin","Fourth Wing","My grandmother’s recipe notebook"]','the year lists March, then this month, then the year’s own books');
 check(/^4 books planned/.test(await text('.muse-rp-periodlabel span')),'the year counts every book once');
 await click('.muse-plans button','Add books');await until(()=>!!document.querySelector('.muse-plan-add-where'),'add books opens');
 check(await evaluate(()=>document.querySelector('.muse-plan-add-where').textContent.includes(new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date()))),'adding in a year asks which month, defaulting to this month');
 await click('.muse-modal-universal-close, [aria-label="Close"]').catch(()=>{});await wait(300);
 await shoot('plans-yearly');
 await go('/collections/plans','!!document.querySelector(".muse-plans .muse-plan-card")','full plans');
 await click('.muse-plans .muse-segmented button','Year');await wait(400);
 check(await evaluate(()=>[...document.querySelectorAll('.muse-month-card .muse-month-name')].map(h=>h.textContent).join('|')==='March|'+new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date())+'|Anytime in '+new Date().getUTCFullYear()),'the full yearly plan has a heading per month');
 await shoot('plans-yearly-full',{full:true});

 // ---- Reading Atlas ----
 await go('/collections/reading-atlas?period=month','!!document.querySelector(".muse-cal-day")','atlas month');await wait(1500);
 check(await evaluate(()=>[...document.querySelectorAll('.muse-cal-day[data-books] .muse-cal-cover img')].every(img=>{const d=img.closest('.muse-cal-day').getBoundingClientRect(),r=img.getBoundingClientRect();return r.bottom<=d.bottom+1&&r.top>=d.top-1&&r.height>0;})),'calendar covers fit inside their day');
 await shoot('atlas-month',{full:true});
 await go('/collections/reading-atlas?period=year','!!document.querySelector(".muse-atlas-shelves .muse-toprated")','atlas year');await wait(1500);
 check(await evaluate(()=>{const [a,b]=[...document.querySelectorAll('.muse-atlas-shelves>.muse-books-panel')].map(x=>x.getBoundingClientRect());return Math.abs(a.width-b.width)<2;}),'Top rated and Favorites are the same width (Atlas V2 shelves)');
 check(await evaluate(()=>[...document.querySelectorAll('.muse-atlas-shelves .muse-toprated-cover')].every(c=>c.getBoundingClientRect().width<160)),'their covers stay small');
 await shoot('atlas-year',{full:true});
 await go('/collections/reading-atlas?section=dna&period=year','!!document.querySelector(".muse-dna-hero")','atlas dna');await wait(1200);
 check(!(await evaluate(()=>document.body.textContent.includes('never guesses'))),'the “fixed rules, never guesses” line is gone');
 check(await evaluate(()=>document.querySelector('.muse-dna-hero').getBoundingClientRect().height<200),'the personality band is compact');
 check(await evaluate(()=>document.querySelectorAll('.muse-dna-vibes li').length<=4),'the vibes show one row of four at a time');
 await shoot('atlas-dna',{full:true});
 await go('/collections/reading-atlas?section=streak','!!document.querySelector(".muse-streaks-main")','atlas streaks');await wait(1200);
 check(await evaluate(()=>{const g=document.querySelector('.muse-goalhist-cal');return !!g&&g.getBoundingClientRect().height<520;}),'the daily goal calendar is about half its old height');
 await shoot('atlas-streaks',{full:true});
 await go('/collections/reading-atlas?section=year','!!document.querySelector(".muse-yir2-hero")','atlas year in review');await wait(1500);
 await shoot('atlas-review',{full:true});
 // ---- Phone ----
 await viewport(390,844,true);
 await go('/collections/plans','!!document.querySelector(".muse-plans .muse-plan-card")','phone dashboard');await wait(1200);
 check(!(await ui.overflow()),'no sideways scrolling on a phone');
 await shoot('plans-phone',{full:true});
 check(errors.length===0,`no page errors${errors.length?`: ${errors[0]}`:''}`);
 console.log(`\n${passed} checks passed. Screenshots: ${ui.shots}`);
}catch(e){console.error(e);process.exitCode=1;}
finally{ui?.close();await removeAccount(account.userId);}
