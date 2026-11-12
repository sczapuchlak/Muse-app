// Browser QA for the Dashboard's "Your last 30 days" and its Reading Atlas deep links. Needs `next start` + local Supabase.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
const shots=process.env.TRENDS_QA_SHOTS??'/private/tmp/muse-trends-shots';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
const day=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
try{
 const {client,ids}=account;
 const session=async(date,minutes,pages)=>{const start=`${date}T09:00:00.000Z`;const {error}=await client.rpc('save_whimsy_record',{p_kind:'sessions',p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:{id:crypto.randomUUID(),bookId:ids.circe,date,timeZone:'UTC',pages,startingPage:0,endingPage:pages,activeSegments:minutes?[{start,end:new Date(Date.parse(start)+minutes*60000).toISOString()}]:[]},p_delete:false});if(error)throw Error(error.message);};
 browser=await openBrowser(account,{shots});const b=browser;await b.viewport(1280,1100);
 // Seeded library has a session only today (42 pages / 41 min): the first 30 days, nothing to compare yet.
 await b.go('/collections','!!document.querySelector(".muse-trends")','dashboard');await wait(1000);
 check(await b.evaluate(()=>/Your last 30 days/.test(document.querySelector('.muse-trends').textContent)&&!!document.querySelector('.muse-trends-range')),'the Dashboard shows "Your last 30 days" with the rolling date range');
 check(await b.evaluate(()=>/(more|fewer|same|first 30 days)/.test(document.querySelector('.muse-trend-card .muse-trend-move').textContent)),'every card carries a plain-language comparison line');
 // History in both windows.
 for(const [d,m,p] of [[3,30,20],[8,20,15],[14,0,25],[40,40,50],[45,30,30],[50,10,10]])await session(day(d),m,p);
 await b.go('/collections','!!document.querySelector(".muse-trend-card")','with history');await wait(1200);
 const card=()=>b.evaluate(()=>{const c=document.querySelector('.muse-trend-card');return {label:c.querySelector('.small-label').textContent,value:c.querySelector('.muse-trend-value').textContent.replace(/\s+/g,' ').trim(),move:c.querySelector('.muse-trend-move').textContent.replace(/\s+/g,' ').trim()};});
 let c=await card();
 check(c.label==='Pages read'&&/102 pages/.test(c.value)&&/↗ 13%/.test(c.move)&&/12 pages more/.test(c.move)&&/more than the 30 days before/.test(c.move),`pages: 42+20+15+25 = 102 now vs 90 before, shown as an increase (${c.value} · ${c.move})`);
 const go=async n=>{for(let i=0;i<n;i++){await b.click('.muse-trends-nav .muse-button[aria-label="Next metric"]');await wait(200);}return card();};
 c=await go(1);check(c.label==='Time reading'&&/1 h 31 min|1 h 31/.test(c.value)&&/more/.test(c.move),`time: 41+30+20 minutes = 1 h 31 min vs 80 min before (${c.value})`);
 c=await go(1);check(c.label==='Books finished'&&/^0/.test(c.value),'books finished: none yet in this account');
 c=await go(1);check(c.label==='Reading days'&&/^4 /.test(c.value)&&/(more|fewer|same)/.test(c.move),`reading days: today + 3 days ago + 8 + 14 = 4 (${c.value}); the 14-day-ago log without time still counts`);
 check(await b.evaluate(()=>!/NaN|Infinity|undefined/.test(document.querySelector('.muse-trends').textContent)),'no NaN, Infinity or undefined anywhere');
 check(await b.evaluate(()=>{const t=document.querySelector('.muse-trends'),p=document.querySelector('.muse-plans'),a=t.getBoundingClientRect(),c=p.getBoundingClientRect();return Math.abs(a.top-c.top)<2&&Math.abs(a.bottom-c.bottom)<2&&c.width>a.width*1.9&&a.width>200;}),'Reading plans (70%) and the Trends carousel (30%) share a row and end together');
 await b.shoot('trends');
 // Deep links.
 const open=async(idx,test,label)=>{await b.go('/collections','!!document.querySelector(".muse-trend-card")','back');await wait(600);for(let i=0;i<idx;i++){await b.click('.muse-trends-nav .muse-button[aria-label="Next metric"]');await wait(150);}await b.click('.muse-trend-card');await b.until(()=>location.pathname==='/collections/reading-atlas','atlas');await wait(1500);check(await b.evaluate(test),label);};
 await open(0,()=>/period=month/.test(location.search)&&!!document.getElementById('atlas-pages')&&document.querySelector('.muse-books-atlas-period [aria-pressed="true"]').textContent==='This month','Pages Read opens the Atlas on This month, at its pages-by-day chart');
 await b.shoot('atlas-pages');
 await open(1,()=>!!document.getElementById('atlas-time'),'Reading Time opens the Atlas at reading time by week');
 await open(2,()=>/section=books/.test(location.search)&&!!document.getElementById('atlas-completed'),'Books Finished opens Books & Milestones at Completed books');
 await open(3,()=>/section=streak/.test(location.search)&&!!document.getElementById('atlas-calendar'),'Reading Days opens Streaks at the reading calendar');
 await b.go('/collections','!!document.querySelector(".muse-trends-explore")','explore');await b.click('.muse-trends-explore');await b.until(()=>location.pathname==='/collections/reading-atlas','explore');check(true,'"Explore in Reading Atlas" opens the Atlas');
 // Phone.
 await b.viewport(390,844,true);await b.go('/collections','!!document.querySelector(".muse-trend-card")','phone');await wait(1000);
 check(!(await b.overflow()),'no horizontal overflow on a phone');
 check(await b.evaluate(()=>{const c=document.querySelector('.muse-trend-card').getBoundingClientRect(),v=document.querySelector('.muse-trend-value').getBoundingClientRect();return v.right<=c.right+1&&c.width>240;}),'values are not clipped on a phone');
 await b.evaluate(()=>document.querySelector('.muse-trends').scrollIntoView({block:'center'}));await wait(300);await b.shoot('trends-phone');
 check(b.errors.length===0,'no uncaught exceptions');
 console.log(`${passed} checks passed. ${shots}`);
}finally{await browser?.close();await removeAccount(account.userId);}
