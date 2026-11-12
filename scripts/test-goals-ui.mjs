// Browser QA for Books Phase 4: daily goal, goal streak, celebrations, Atlas goal history. Needs `next start` + local Supabase.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
const shots=process.env.GOALS_QA_SHOTS??'/private/tmp/muse-goals-shots';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
const day=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
try{
 const {client,ids}=account;
 const session=async(date,minutes,hour,pages=10)=>{const start=`${date}T${String(hour).padStart(2,'0')}:00:00.000Z`,end=new Date(Date.parse(start)+minutes*60000).toISOString();const {error}=await client.rpc('save_whimsy_record',{p_kind:'sessions',p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:{id:crypto.randomUUID(),bookId:ids.circe,date,timeZone:'UTC',pages,startingPage:0,endingPage:pages,activeSegments:minutes?[{start,end}]:[]},p_delete:false});if(error)throw Error('session: '+error.message);};
 await session(day(3),12,9);await session(day(2),5,9);await session(day(1),12,9);
 const goalId=crypto.randomUUID();
 const saveGoal=async(record,rev=0)=>{const {error}=await client.rpc('save_whimsy_record',{p_kind:'goals',p_expected_revision:rev,p_command_id:crypto.randomUUID(),p_record:record,p_delete:false});if(error)throw Error('goal: '+error.message);};
 const dbGoal=async()=>{const {data}=await client.rpc('read_whimsy');return data.goals.filter(g=>g.period==='day'&&g.unit==='minutes');};
 browser=await openBrowser(account,{shots});const b=browser;await b.viewport(1280,1100);
 await b.go('/collections','!!document.querySelector(".muse-daily")','dashboard');await wait(900);
 check(await b.evaluate(()=>!!document.querySelector('.muse-daily[data-empty]')&&/Set a daily goal/.test(document.querySelector('.muse-daily').textContent)),'with no goal the card invites you to set one, and reading still counts');
 await b.shoot('daily-empty');
 // Presets and custom.
 await b.click('.muse-daily .button-primary','Set a daily goal');await b.until(()=>!!document.querySelector('#daily-goal-editor[open]'),'modal');
 check(await b.evaluate(()=>[...document.querySelectorAll('.muse-daily-presets button')].map(x=>x.querySelector('strong').textContent).join()==='10,15,20,30,45,60'&&!!document.querySelector('.muse-daily-custom input')),'the dialog offers 10, 15, 20, 30, 45, 60 and a custom value');
 await b.shoot('daily-modal');
 await b.evaluate(()=>{const i=document.querySelector('.muse-daily-custom input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'0');i.dispatchEvent(new Event('input',{bubbles:true}));});await b.evaluate(()=>document.querySelector('#daily-goal-editor form').requestSubmit());await wait(300);
 check(await b.evaluate(()=>/whole number of minutes/.test(document.querySelector('#daily-goal-editor').textContent)),'an invalid custom value is rejected with a gentle message');
 await b.evaluate(()=>{const i=document.querySelector('.muse-daily-custom input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'');i.dispatchEvent(new Event('input',{bubbles:true}));});
 await b.click('.muse-daily-presets button','10');await b.evaluate(()=>document.querySelector('#daily-goal-editor form').requestSubmit());await b.until(()=>!document.querySelector('#daily-goal-editor[open]'),'saved');await wait(1200);
 check(await b.evaluate(()=>!!document.querySelector('.muse-celebrate')&&/goal, done/.test(document.querySelector('.muse-celebrate').textContent)),'meeting today\'s goal shows a gentle celebration');await b.shoot('celebration');
 await b.click('.muse-celebrate-close');await wait(300);check(await b.evaluate(()=>!document.querySelector('.muse-celebrate')),'it can be dismissed');
 let g=(await dbGoal())[0];check(g&&g.target===10&&g.targetHistory.length===1&&g.targetHistory[0].target===10,'the target is saved with its first history entry');
 // History: pretend the goal began three days ago at 10 minutes, so past days are judged on it.
 await saveGoal({id:g.id,period:'day',start:day(3),end:day(3),unit:'minutes',target:10,recurs:true,targetHistory:[{from:day(3),target:10}]},g.revision);
 await b.go('/collections','!!document.querySelector(".muse-daily-week")','with history');await wait(1200);
 const pips=await b.evaluate(()=>[...document.querySelectorAll('.muse-daily-week li')].map(l=>l.dataset.state).join());
 check(/none,none,none,met,read,met,met$/.test(pips),`last seven days: met, read-but-under (5 min), met, met today (${pips})`);
 check(await b.evaluate(()=>/3-day goal streak|2-day goal streak/.test(document.querySelector('.muse-daily-streak-copy').textContent)),'the goal streak counts consecutive days that met each day\'s goal');
 check(await b.evaluate(()=>/Goal met today/.test(document.querySelector('.muse-daily-state').textContent)&&/41 \/ 10/.test(document.querySelector('.muse-daily-count').textContent)),'today shows 41 minutes against the target and a completed state');
 await b.shoot('daily-met');
 // Reading streak is separate: the 5-minute day still counts toward it.
 check(await b.evaluate(()=>document.querySelector('.muse-streak-count strong').textContent==='4'),'the reading streak counts the 5-minute day too (4 days) while the goal streak does not');
 // Celebration: shown once, dismissible, not again on reload.
 await b.go('/collections','!!document.querySelector(".muse-daily-week")','reload');await wait(1200);
 check(await b.evaluate(()=>!document.querySelector('.muse-celebrate')),'it does not come back on reload');
 // Raising the target never rewrites yesterday.
 await b.click('.muse-daily-change');await b.until(()=>!!document.querySelector('#daily-goal-editor[open]'),'modal2');await b.click('.muse-daily-presets button','45');await b.evaluate(()=>document.querySelector('#daily-goal-editor form').requestSubmit());await b.until(()=>!document.querySelector('#daily-goal-editor[open]'),'saved2');await wait(1300);
 g=(await dbGoal())[0];check(g.target===45&&g.targetHistory.map(e=>e.target).join()==='10,45','a change adds a dated entry; the earlier 10 stays on record');
 const pips2=await b.evaluate(()=>[...document.querySelectorAll('.muse-daily-week li')].map(l=>l.dataset.state).join());
 check(/met,read,met,read$/.test(pips2),`yesterday is still judged on 10 (met); today's 41 is under the new 45 (${pips2})`);
 check(await b.evaluate(()=>/4 more minutes/.test(document.querySelector('.muse-daily-state').textContent)),'the card says how many minutes remain today');
 // Atlas goal history.
 await b.go('/collections/reading-atlas?section=streak','!!document.querySelector(".muse-goalhist")','atlas');await wait(1000);
 check(await b.evaluate(()=>document.querySelectorAll('.muse-goalhist-grid>li[data-state="met"]').length>=2&&document.querySelectorAll('.muse-goalhist-grid>li[data-state="read"]').length>=1&&document.querySelectorAll('.muse-goalhist-months>div').length===12),'the Atlas shows a goal calendar (met / read-under-goal) and twelve months of consistency');
 await b.evaluate(()=>document.querySelector('.muse-goalhist').scrollIntoView({block:'center'}));await wait(300);await b.shoot('atlas-goal-history');
 // Phone and reduced motion.
 await b.viewport(390,844,true);await b.go('/collections','!!document.querySelector(".muse-daily-week")','phone');await wait(1000);
 check(!(await b.overflow()),'no horizontal overflow on a phone');await b.evaluate(()=>document.querySelector('.muse-daily').scrollIntoView({block:'center'}));await wait(300);await b.shoot('daily-phone');
 await b.go('/collections/reading-atlas?section=streak','!!document.querySelector(".muse-goalhist")','atlas phone');await wait(900);check(!(await b.overflow()),'the Atlas goal history fits a phone');
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await b.go('/collections','!!document.querySelector(".muse-streak-heart")','reduced');await wait(800);
 check(await b.evaluate(()=>[...document.querySelectorAll('.muse-streak-heart[data-filled]')].every(h=>getComputedStyle(h).animationName==='none')),'with reduced motion the glittering hearts are still');
 check(b.errors.length===0,'no uncaught exceptions');
 console.log(`${passed} checks passed. ${shots}`);
}finally{await browser?.close();await removeAccount(account.userId);}
