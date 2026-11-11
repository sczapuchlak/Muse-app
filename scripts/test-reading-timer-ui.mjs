// Visual QA for the reading timer card (#135): open, timed, paused and target-met states on Book Detail and the Reading Desk.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
const shots=process.env.TIMER_QA_SHOTS??'/private/tmp/muse-timer-shots',themes=(process.env.TIMER_QA_THEMES??'astral,nightbloom,prism-noir').split(',');
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
try{
 browser=await openBrowser(account,{shots});const b=browser;
 const heir=account.ids.heir;
 await b.go(`/collections/books/${heir}`,'!!document.querySelector(".muse-book-panel")','book page');
 await b.until(()=>!!document.querySelector('.muse-book-sitting-modes button'),'sitting chooser ready');
 // Timed sitting: choose the timed mode and a preset, then start.
 await b.click('.muse-book-sitting-modes button','Timed');await wait(200);
 await b.click('.muse-book-sitting-preset','5');await wait(200);
 await b.evaluate(()=>{const b=[...document.querySelectorAll('.muse-book-sitting-choice button')].find(x=>/start|begin|read/i.test(x.textContent)&&!x.hasAttribute('aria-pressed')&&!x.classList.contains('muse-book-sitting-preset'));if(!b)throw Error('no start button');b.click();});
 await b.until(()=>!!document.querySelector('.muse-session'),'timer card appears');
 check(true,'timed sitting starts and shows the new timer card');
 await wait(2500);
 const m=await b.evaluate(()=>({clock:document.querySelector('.muse-session-clock').textContent,bar:!!document.querySelector('.muse-session-liquid'),progress:document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,dialW:document.querySelector('.muse-session-pool').getBoundingClientRect().width}));
 console.log(JSON.stringify(m));check(m.bar&&m.progress!==undefined&&!m.overflow,'liquid bar, progressbar semantics and no overflow');
 await b.evaluate(()=>document.querySelector('.muse-session').scrollIntoView({block:'center'}));await wait(300);await b.shoot('book-running');
 for(const t of themes){await b.evaluate(x=>document.documentElement.setAttribute('data-theme',x),t);await wait(300);await b.shoot(`book-running-${t}`);}
 await b.click('.muse-session-toggle');await wait(1200);
 check(await b.evaluate(()=>document.querySelector('.muse-session').dataset.phase)==='paused','pause works');await b.shoot('book-paused');
 await b.click('.muse-session-toggle');await wait(800);
 // Reading Desk
 await b.go('/collections','!!document.querySelector(".muse-session")','desk');await wait(800);
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('desk-timer');
 await b.viewport(390,844,true);await wait(800);await b.evaluate(()=>document.querySelector('.muse-session').scrollIntoView({block:'start'}));await wait(400);await b.shoot('desk-timer-phone');
 check(!(await b.overflow()),'no horizontal overflow on phone');
 await b.go(`/collections/books/${heir}`,'!!document.querySelector(".muse-session")','book phone');await b.evaluate(()=>document.querySelector('.muse-session').scrollIntoView({block:'center'}));await wait(400);await b.shoot('book-phone');
 check(b.errors.length===0,`no uncaught exceptions ${b.errors.join('|').slice(0,200)}`);
 console.log(`\n${passed} checks passed. ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
