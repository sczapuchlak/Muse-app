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
 const r=await b.evaluate(()=>({covers:document.querySelectorAll('.muse-cal-day .muse-cal-cover').length,split:document.querySelectorAll('.muse-cal-day[data-books="2"]').length,ribbon:document.querySelectorAll('.muse-atlas-ribbon>div').length,oldMetrics:document.querySelectorAll('.muse-books-atlas-metrics').length,innerHead:[...document.querySelectorAll('.muse-books-section h3')].filter(h=>h.textContent.trim()==='Reading Atlas').length,year:!!document.querySelector('.muse-year'),months:document.querySelectorAll('.muse-year li').length}));
 console.log(JSON.stringify(r));
 check(r.covers>=6,'reading days show the book covers');check(r.split>=1,'a day with two books splits between both covers');
 check(r.ribbon===4&&r.oldMetrics===0,'an editorial ribbon replaces the eight metric boxes');check(r.innerHead===0,'no duplicate Reading Atlas heading');check(r.year&&r.months===12,'the reading year shows twelve months');
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('atlas-top');
 await b.evaluate(()=>document.querySelector('.muse-cal').scrollIntoView({block:'start'}));await wait(300);await b.shoot('atlas-calendar');
 await b.evaluate(()=>{const d=[...document.querySelectorAll('.muse-cal-day[data-books="2"]')][0];d.click();});await wait(400);
 check(await b.evaluate(()=>document.querySelectorAll('.muse-cal-detail li').length===2),'tapping a day lists its books and sittings');await b.evaluate(()=>document.querySelector('.muse-cal-detail').scrollIntoView({block:'center'}));await b.shoot('atlas-day-detail');
 await b.evaluate(()=>document.querySelector('.muse-year').scrollIntoView({block:'start'}));await wait(300);await b.shoot('atlas-year');
 const lower=await b.evaluate(()=>({cards:document.querySelectorAll('.muse-atlas-progress-card').length,covers:document.querySelectorAll('.muse-atlas-progress-cover').length,rows:document.querySelectorAll('.muse-history-row').length,menus:document.querySelectorAll('.muse-history-menu').length,dateInputsVisible:(()=>{const d=document.querySelector('.muse-history-dates');return d.open?2:Math.round(d.getBoundingClientRect().height)>48?1:0;})(),goalsAfterCal:(()=>{const c=document.querySelector('.muse-cal'),g=document.querySelector('.muse-atlas-goals-row');return !!c&&!!g&&!!(c.compareDocumentPosition(g)&Node.DOCUMENT_POSITION_FOLLOWING);})()}));
 console.log(JSON.stringify(lower));
 check(lower.cards>=4&&lower.covers===lower.cards,'Books and progress shows cover cards');check(lower.rows>=6&&lower.menus===lower.rows,'session history uses compact rows with a ⋯ menu');
 check(lower.dateInputsVisible===0,'date filters stay tucked away until asked for');check(lower.goalsAfterCal,'the calendar leads; goals follow it');
 await b.evaluate(()=>document.querySelector('.muse-atlas-progress').scrollIntoView({block:'start'}));await wait(300);await b.shoot('atlas-progress');
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
