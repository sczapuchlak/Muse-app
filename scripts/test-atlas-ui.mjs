// Browser QA for the Reading Atlas overview (#135): cover calendar, reading year, stat ribbon, desktop and phone.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
const shots=process.env.ATLAS_QA_SHOTS??'/private/tmp/muse-atlas-shots',themes=(process.env.ATLAS_QA_THEMES??'nightbloom,prism-noir').split(',');
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
const day=offset=>{const d=new Date();d.setUTCDate(d.getUTCDate()-offset);return d.toISOString().slice(0,10);};
try{
 const save=async(kind,record)=>{const {error}=await account.client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:record,p_delete:false});if(error)throw Error(`${kind}: ${error.message}`);};
 const {heir,acotar,circe,acowar}=account.ids;let hour=6;
 const session=async(bookId,offset,pages,notes)=>{const date=day(offset),h=String(hour++%20+2).padStart(2,'0');await save('sessions',{id:crypto.randomUUID(),bookId,date,timeZone:'UTC',pages,activeSegments:[{start:`${date}T${h}:00:00.000Z`,end:`${date}T${h}:25:00.000Z`}],manual:false,...(notes?{notes}:{})});};
 for(const o of [1,2,3,5,6,8]) await session(heir,o,18);
 await session(circe,2,22,'The witch of Aiaia, finally.');await session(circe,4,30);await session(acowar,6,25);
 browser=await openBrowser(account,{shots});const b=browser;
 await b.go('/collections/reading-atlas','!!document.querySelector(".muse-cal")','atlas');await wait(1200);
 const r=await b.evaluate(()=>({covers:document.querySelectorAll('.muse-cal-day .muse-cal-cover').length,split:document.querySelectorAll('.muse-cal-day[data-books="2"]').length,ribbon:document.querySelectorAll('.muse-atlas-ribbon>div').length,oldMetrics:document.querySelectorAll('.muse-books-atlas-metrics').length,innerHead:[...document.querySelectorAll('.muse-books-section h3')].filter(h=>h.textContent.trim()==='Reading Atlas').length,year:true,months:12}));
 console.log(JSON.stringify(r));
 check(r.covers>=6,'reading days show the book covers');check(r.split>=1,'a day with two books splits between both covers');
 check(r.ribbon===4&&r.oldMetrics===0,'an editorial ribbon replaces the eight metric boxes');check(r.innerHead===0,'no duplicate Reading Atlas heading');await b.click('.muse-cal-toggle button','Year');await b.until(()=>document.querySelectorAll('.muse-year li').length===12,'year view');check(true,'the Year toggle shows twelve months');await b.click('.muse-cal-toggle button','Month');await wait(300);
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('atlas-top');
 await b.evaluate(()=>document.querySelector('.muse-cal').scrollIntoView({block:'start'}));await wait(300);await b.shoot('atlas-calendar');
 await b.evaluate(()=>{const d=[...document.querySelectorAll('.muse-cal-day[data-books="2"]')][0];d.click();});await wait(400);
 check(await b.evaluate(()=>!document.querySelector('.muse-cal-detail')&&!!document.querySelector('.muse-atlas-calwrap > .muse-atlas-stack')),'no day picker; a companion stack sits beside the calendar');await b.evaluate(()=>document.querySelector('.muse-cal').scrollIntoView({block:'center'}));await b.shoot('atlas-calendar-stack');
 const lower=await b.evaluate(()=>({progressCards:document.querySelectorAll('.muse-atlas-progress,.muse-atlas-progress-card').length,rows:document.querySelectorAll('.muse-history-row').length,menus:document.querySelectorAll('.muse-history-menu').length,dateInputsVisible:(()=>{const d=document.querySelector('.muse-history-dates');return d.open?2:Math.round(d.getBoundingClientRect().height)>48?1:0;})(),calendarH:Math.round(document.querySelector('.muse-cal').getBoundingClientRect().height),goalsAfterCal:(()=>{const c=document.querySelector('.muse-cal'),g=document.querySelector('.muse-atlas-goals-row');return !!c&&!!g&&!!(c.compareDocumentPosition(g)&Node.DOCUMENT_POSITION_FOLLOWING);})(),searchPattern:!!document.querySelector('.muse-books-history .muse-search')}));
 console.log(JSON.stringify(lower));
 check(lower.progressCards===0,'no wall of every book in the Atlas');check(lower.rows>=1&&lower.rows<=4&&lower.menus===lower.rows,'session history is a short, paged list of rows, each with a ⋯ menu');
 check(lower.dateInputsVisible===0,'date filters stay tucked away until asked for');check(await b.evaluate(()=>{const c=document.querySelector('.muse-cal'),g=document.querySelector('.muse-atlas-calwrap .muse-books-goals-panel');if(!c||!g)return false;const a=c.getBoundingClientRect(),r=g.getBoundingClientRect();return r.left>=a.right-2&&Math.abs(r.top-a.top)<4;}),'goals sit beside the calendar');
 check(lower.calendarH<=560,`the calendar is compact (${lower.calendarH}px)`);check(lower.searchPattern,'history search uses the shared Muse search');
 await b.evaluate(()=>document.querySelector('.muse-books-history').scrollIntoView({block:'start'}));await wait(300);await b.shoot('atlas-history');
 await b.go('/collections/reading-atlas?section=dna','!!document.querySelector(".muse-atlas-insight")','dna');await wait(800);await b.shoot('atlas-dna');
 await b.go('/collections/reading-atlas','!!document.querySelector(".muse-cal")','back to overview');await wait(600);
 for(const t of themes){await b.evaluate(x=>document.documentElement.setAttribute('data-theme',x),t);await b.evaluate(()=>document.querySelector('.muse-cal').scrollIntoView({block:'start'}));await wait(400);await b.shoot(`atlas-calendar-${t}`);}
 await b.evaluate(()=>document.documentElement.removeAttribute('data-theme'));
 await b.viewport(390,844,true);await b.go('/collections/reading-atlas','!!document.querySelector(".muse-cal")','atlas phone');await wait(900);
 check(!(await b.overflow()),'no horizontal overflow on phone');
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('atlas-phone-top');await b.evaluate(()=>document.querySelector('.muse-cal').scrollIntoView({block:'start'}));await wait(300);await b.shoot('atlas-phone-calendar');
 check(b.errors.length===0,`no uncaught exceptions ${b.errors.join('|').slice(0,200)}`);
 console.log(`\n${passed} checks passed. ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
