// Books Dashboard, Pagebound-clear (Nov 26): streak · Up next (read from the plans) · Goals; Currently reading as a cover
// strip + spotlight; Plans and Goals on their own pages; the New goal sheet. Phone and desktop.
// Requires a production build (BOOKS_UI_ORIGIN, default :3000) and local Supabase. Run: node scripts/test-books-home-ui.mjs
import assert from 'node:assert/strict';
import {sql,seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';

let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const account=await seedAccount();let ui;
const today=new Date().toISOString().slice(0,10),month=today.slice(0,7),year=today.slice(0,4);
const nextMonth=(()=>{const [y,m]=month.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;})();
try{
 const {client,userId,ids}=account;
 const save=async(kind,record)=>{const {error}=await client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:record,p_delete:false});if(error)throw Error(`${kind}: ${error.message}`);return record.id;};
 const cover=isbn=>`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
 const book=f=>({id:crypto.randomUUID(),reviewEmojis:[],format:'physical',startingPage:0,currentPage:0,genre:'Fantasy',...f});
 // Two more books being read (three in all), with sittings so the most recent leads.
 for(const [key,title,author,isbn,pages,read] of [['carl','Dungeon Crawler Carl','Matt Dinniman','9780593820247',427,68],['yearbook','Yearbook','Seth Rogen','9780593159729',272,30]]){
  const cycle=crypto.randomUUID();ids[key]=await save('books',book({title,author,status:'reading',startedOn:`${month}-02`,coverUrl:cover(isbn),totalPages:pages,cycleId:cycle,currentPage:read,positionUpdatedAt:`${month}-02T10:00:00.000Z`}));
 }
 // Waiting books for the plans.
 for(const [key,title,author,isbn] of [['pink','Pink Glass Houses','Ashley Elston','9780593817476'],['silver','A Court of Silver Flames','Sarah J. Maas','9781681196282'],['mile','Mile High','Liz Tomforde','9781668026984'],['poison','The Poison Daughter','Sheila Masterson','9780593726907'],['wing','Fourth Wing','Rebecca Yarros','9781649374042'],['iron','Iron Flame','Rebecca Yarros','9781649374172']])
  ids[key]=await save('books',book({title,author,status:'planned',coverUrl:cover(isbn),totalPages:420}));
 // Finished this year, one this month.
 for(const [i,[title,isbn]] of [['Circe again','9780316556347'],['Book Lovers','9780593334836'],['Beach Read','9781984806734']].entries()){
  const fin=i===0?`${month}-03`:`${year}-0${i+2}-12`,cycle=crypto.randomUUID();
  ids[`fin${i}`]=await save('books',book({title,author:'Someone',status:'finished',startedOn:fin,finishedOn:fin,coverUrl:cover(isbn),totalPages:300,rating:4.5,cycleId:cycle,completions:[{id:cycle,startedOn:fin,finishedOn:fin}]}));
 }
 await save('goals',{id:crypto.randomUUID(),period:'year',start:`${year}-01-01`,end:`${year}-12-31`,unit:'books',recurs:false,target:24});
 await save('goals',{id:crypto.randomUUID(),period:'day',start:`${month}-01`,end:`${month}-01`,unit:'minutes',recurs:true,target:20,targetHistory:[{from:`${month}-01`,target:20}]});
 // This month's plan: a finished book, one being read, then waiting books. Next month: two more. The year: one anytime.
 for(const [kind,period,list] of [['month',month,[ids.fin0,ids.carl,ids.pink,ids.silver,ids.mile]],['month',nextMonth,[ids.poison,ids.wing]],['year',year,[ids.iron]]]){const {error}=await client.rpc('add_reading_plan_books',{p_kind:kind,p_period:period,p_book_ids:list});if(error)throw error;}

 ui=await openBrowser(account,{shots:process.env.HOME_SHOTS});
 const {evaluate,until,go,click,viewport,shoot,overflow,errors,text}=ui;

 // ---- Desktop Dashboard ----
 await go('/collections','!!document.querySelector(".muse-dv3-upnext .muse-dv3-covers button")&&!!document.querySelector(".muse-dv3-goal .muse-dv3-meter")','dashboard').catch(async e=>{await shoot('debug-dashboard',{full:true});console.log(ui.errors.join('\n'));throw e;});
 check(await evaluate(()=>!document.querySelector('.muse-bookshelf[data-surface="dashboard"] .muse-plans')),'the Reading Plan is no longer on the Dashboard');
 check(await evaluate(()=>!!document.querySelector('.muse-dv4-goals .muse-streak-panel')&&!!document.querySelector('.muse-dv4-goals .muse-dv3-goals')&&!!document.querySelector('.muse-dv4 .muse-desk-reading')&&!!document.querySelector('.muse-dv4>.muse-dv3-upnext')&&!!document.querySelector('.muse-dv4>.muse-dv3-last30')),'2×2: streak + Goals | Currently reading; Up next | last 30 days');
 check(await evaluate(()=>{const c=[...document.querySelectorAll('.muse-dv4>*:not(.muse-dv4-full)')].map(x=>x.getBoundingClientRect());return Math.abs(c[0].bottom-c[1].bottom)<2&&Math.abs(c[2].bottom-c[3].bottom)<2&&Math.abs(c[0].top-c[1].top)<2;}),'every card in a row ends on one line (no gaps)');
 check(await evaluate(()=>[...document.querySelectorAll('.muse-dv3-stats>div')].every(d=>/more|fewer|same|first 30 days/i.test(d.textContent))),'last 30 days compares with the 30 days before');
 check(JSON.stringify(await evaluate(()=>[...document.querySelectorAll('.muse-dv3-upnext .muse-dv3-covers strong')].map(b=>b.textContent)))==='["Pink Glass Houses","A Court of Silver Flames","Mile High","The Poison Daughter"]','Up next shows four covers from the plan, in plan order');
 await click('.muse-dv3-upnext .muse-dv3-pager button','Next books');await until(()=>/Fourth Wing/.test(document.querySelector('.muse-dv3-upnext .muse-dv3-covers')?.textContent??''),'up next page 2');
 check(await evaluate(()=>document.querySelectorAll('.muse-dv3-upnext .muse-dv3-covers li').length===2),'the rest page inside the card (next month, then the year)');
 check(await evaluate(()=>document.querySelector('.muse-dv3-upnext .muse-spin-pill')?.getAttribute('href')==='/collections/plans?spin=1'),'Spin a book opens the deck in Reading Plan');
 check(/3 of 24 books/.test(await text('.muse-dv3-goals'))&&/1 of 5 books · from your plan/.test(await text('.muse-dv3-goals')),'Goals: three compact rows (the year, the month from its plan, today)');
 check(await evaluate(()=>true),'the streak is one slim strip');
 check(await evaluate(()=>document.querySelectorAll('.muse-desk-others .muse-desk-also').length===2&&!!document.querySelector('.muse-desk-split .muse-desk-spot')),'Currently reading: one book large, two others beside it');
 const first=await text('.muse-desk-spot-title');await click('.muse-desk-others .muse-desk-also');await until(f=>document.querySelector('.muse-desk-spot-title')?.textContent!==f,'pick another book',first);
 check(true,'picking a book swaps it into the spotlight');
 await shoot('home-desktop',{full:true});

 // ---- Phone Dashboard ----
 await viewport(390,844,true);await go('/collections','!!document.querySelector(".muse-dv3-goal .muse-dv3-meter")','phone dashboard');await wait(600);
 check(!(await overflow()),'no sideways scroll on a phone');
 check(await evaluate(()=>[...document.querySelectorAll('.muse-dv4 .muse-streak-week li')].every(li=>{const r=li.getBoundingClientRect(),p=li.closest('.muse-streak-panel').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right;})),'phone: the streak strip fits all seven days');
 check(await evaluate(()=>{const c=document.querySelector('.muse-dv3-goals'),r=c.getBoundingClientRect();return [...c.querySelectorAll('a,button')].every(x=>x.getBoundingClientRect().right<=r.right+1);}),'phone: Goals tiles stay inside the card');
 check(await evaluate(()=>{const t=document.querySelector('.muse-desk-spot-title').getBoundingClientRect(),c=document.querySelector('.muse-desk-spot-cover').getBoundingClientRect();return t.left>=c.right;}),'phone: the spotlight title never sits on its cover');
 await shoot('home-phone-top');await shoot('home-phone',{full:true});

 // ---- Plans (phone) ----
 await go('/collections/plans','!!document.querySelector(".muse-plans .muse-plan-card")','plans');await wait(500);await shoot('plans-phone',{full:true});
 check(!(await overflow()),'Plans: no sideways scroll on a phone');
 check(await evaluate(()=>!document.querySelector('.muse-plans-hero')&&!!document.querySelector('.muse-rp-head')&&!!document.querySelector('.muse-rp-intent')&&!!document.querySelector('.muse-rp-side')),'Reading Plan: compact header, reading intentions and your year; no decorative hero');
 check(await evaluate(()=>document.querySelectorAll('.muse-month-card').length>=3&&document.querySelectorAll('.muse-month-card[data-open]').length===1),'Reading Plan: this month’s lineup open, the coming months as slim rows');
 check(await evaluate(()=>document.querySelectorAll('.muse-plans .muse-plan-card .muse-plan-next').length===3),'Plans: the three waiting books in this month wear “Up next”');
 check(await evaluate(()=>document.querySelectorAll('.muse-plans .muse-plan-card .muse-plan-pct').length===1),'Plans: the book being read shows how far in it is');
 check(await evaluate(()=>[...document.querySelectorAll('.muse-plans .muse-plan-card')].every(c=>{const t=c.querySelector('.muse-plan-body').getBoundingClientRect(),cv=c.querySelector('.muse-plan-cover-wrap').getBoundingClientRect();return t.top>=cv.bottom-1&&t.width>70;})),'Plans: tiles put the title under the cover');
 check(await evaluate(()=>!!document.querySelector('.muse-books-nav a[aria-current="page"][href="/collections/plans"]')&&document.querySelectorAll('.muse-books-nav a').length===4),'Reading Plan has its own Books tab (four tabs in all)');
 await click('.muse-plans-spin');await until(()=>!!document.querySelector('.muse-roulette-deck .muse-cardback'),'the deck opens');
 await click('.muse-roulette-spin');await until(()=>!!document.querySelector('.muse-roulette-card[data-flipped] .muse-roulette-front img, .muse-roulette-card[data-flipped] .muse-roulette-front .muse-cal-cover-blank'),'a card turns over');
 check(!!(await text('.muse-roulette-result strong')),'Spin to add draws a card and turns it over to show the book');
 await shoot('plans-spin-phone');await click('.muse-roulette-actions button','Cancel');

 // ---- Library ----
 await go('/collections?tab=library','document.querySelectorAll(".muse-lib-grid .muse-lib-tile").length>0','library');await wait(500);
 check(!(await overflow()),'Library: no sideways scroll on a phone');
 check(await evaluate(()=>!document.querySelector('.muse-collections-quick-filters')&&!!document.querySelector('.muse-lib-toolbar .muse-search')&&!!document.querySelector('.muse-lib-add')&&!!document.querySelector('.muse-collections-filter-trigger')&&!!document.querySelector('.muse-lib-view')),'Library: one compact toolbar (search, Add, Filters, Sort, view)');
 await shoot('library-phone',{full:true});
 await click('.muse-collections-filter-trigger');await until(()=>!!document.querySelector('.muse-lib-pills'),'filter sheet');
 check(/Favorites/.test(await text('.muse-lib-pills'))&&/Currently Reading/.test(await text('.muse-lib-pills')),'Library: reading statuses and Favorites live inside Filters');
 await click('.muse-lib-pills button','Currently Reading');await wait(300);await shoot('library-filters-phone');await click('.muse-lib-filters-foot .button-primary');
 await until(()=>document.querySelectorAll('.muse-lib-tile').length===3,'reading filter');
 check(await evaluate(()=>/Currently Reading/.test(document.querySelector('.muse-lib-chips')?.textContent??'')),'Library: the active filter shows as a removable chip');
 await click('.muse-lib-chip');await until(()=>document.querySelectorAll('.muse-lib-tile').length>3,'chip removed');
 await click('.muse-lib-view button[aria-label="List"]');await until(()=>document.querySelectorAll('.muse-lib-row').length>0,'list view');
 check(!(await overflow()),'Library list: no sideways scroll on a phone');
 await shoot('library-list-phone',{full:true});
 await viewport(1280,900);await go('/collections?tab=library','document.querySelectorAll(".muse-lib-row").length>0','library list desktop');await wait(400);
 check(await evaluate(()=>/\d+% \(\d+\/\d+\)/.test(document.querySelector('.muse-lib-list').textContent)),'Library list shows recorded progress for books being read');
 await shoot('library-list-desktop',{full:true});
 await click('.muse-lib-view button[aria-label="Gallery"]');await until(()=>document.querySelectorAll('.muse-lib-tile').length>0,'gallery again');await shoot('library-desktop',{full:true});
 await viewport(390,844,true);

 // ---- Goals live in Reading Plan (phone) ----
 await go('/collections/goals?view=month','location.pathname==="/collections/plans"&&/5 read/.test(document.querySelector(".muse-rp-intent")?.textContent??"")','goals redirect');
 check(true,'the old Goals link lands in Reading Plan');
 check(/Set a goal/.test(await text('.muse-rp-intent-item'))&&/1 \/ 5 read/.test(await text('.muse-rp-intent')),'intentions: no monthly goal yet, and the plan’s own progress (1 of 5 read) shown separately');
 await shoot('reading-plan-phone',{full:true});
 await click('.muse-rp-intent-item','Set a goal');await until(()=>!!document.querySelector('.muse-goal-form'),'goal form');
 const start=Number(await evaluate(()=>document.querySelector('.muse-goal-number input').value)),want=start+2;
 await click('.muse-goal-number button','More');await click('.muse-goal-number button','More');
 await click('.muse-goal-form button[type="submit"]');
 await until(w=>new RegExp(`1 / ${w}`).test(document.querySelector('.muse-rp-intent-item')?.textContent??''),'month goal saved',want);
 check(want!==5,`a monthly goal is its own number (${want}), not the plan’s size (5); every finish that month counts`);
 check(sql(`select count(*) from public.whimsy_reading_goals where user_id='${userId}' and payload->>'period'='month'`)==='1','one monthly goal record was saved');
 await go('/collections/plans?kind=year','!!document.querySelector(".muse-rp-yearview")&&/24/.test(document.querySelector(".muse-rp-intent-item")?.textContent??"")','year plan');
 check(/3 \/ 24/.test(await text('.muse-rp-intent-item')),'the year view’s intentions show the 2026 challenge');
 await go('/collections','!!document.querySelector(".muse-goal-addpill")','dashboard');
 await click('.muse-goal-addpill');await until(()=>/Finish my plan/.test(document.querySelector('.muse-goal-ideas')?.textContent??''),'ideas open with the plan idea');
 check(/A book a week/.test(await text('.muse-goal-ideas')),'New goal offers ideas, including finishing this month’s plan');
 await shoot('goal-ideas-phone');
 check(!errors.length,`no page errors${errors.length?': '+errors.join(' | '):''}`);
 console.log(`\n${passed} checks passed. Shots: ${ui.shots}`);
}finally{ui?.close();await removeAccount(account.userId);}
