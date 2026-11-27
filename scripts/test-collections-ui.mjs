// Browser QA for the Collections homepage (#135): Reading Desk tiles beside goals, cover densities, phone layout.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait,sql} from './qa/books-harness.mjs';
import {seedLargeLibrary} from './qa/seed-large-library.mjs';
const shots=process.env.COLLECTIONS_QA_SHOTS??'/private/tmp/muse-collections-shots',themes=(process.env.COLLECTIONS_QA_THEMES??'astral,nightbloom').split(',');
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
try{
 seedLargeLibrary(account.userId,240);
 sql(`update public.whimsy_books set payload=jsonb_set(payload,'{status}','"reading"') where id in (select id from public.whimsy_books where user_id='${account.userId}' and payload->>'status'='planned' and payload->>'coverUrl'='' limit 3)`);
 browser=await openBrowser(account,{shots});const b=browser;
 const board='!!document.querySelector(".muse-desk-spot")';
 await b.go('/collections',board,'board');await wait(800);
 const desk=await b.evaluate(()=>({picks:document.querySelectorAll('.muse-desk-others .muse-desk-also').length+1,spots:document.querySelectorAll('.muse-desk-spot').length,start:document.querySelectorAll('.muse-desk-start').length,oldCards:document.querySelectorAll('.muse-books-card').length}));
 console.log(JSON.stringify(desk));check(desk.picks>=2&&desk.spots===1&&desk.start===1&&desk.oldCards===0,'Currently reading: one book large, every other book in the grid beside it, one Start reading (Nov 26)');
 check(await b.evaluate(()=>{const nav=[...document.querySelectorAll('.muse-books-nav a')].map(a=>a.textContent);return nav.join('|')==='Dashboard|Library|Reading Plan|Reading Atlas'&&!document.querySelector('.muse-collections-chips')&&!/Movies|TV Shows|Games|Music/.test(document.querySelector('main').textContent);}),'Books navigation is Dashboard / Library / Reading Plan / Reading Atlas, with no other media types');check(await b.evaluate(()=>{return !!document.querySelector('.muse-dv4-goals .muse-streak-panel')&&!!document.querySelector('.muse-dv4 .muse-desk-reading')&&!!document.querySelector('.muse-dv3-recent');}),'the Dashboard: streak strip, Goals | Up next, Currently reading | last 30 days, Recent activity');check(await b.evaluate(()=>!!document.querySelector('.muse-dv4 .muse-streak-panel')&&!!document.querySelector('.muse-dv3-goals')&&!document.querySelector('.muse-bookshelf .muse-plans')&&!!document.querySelector('.muse-dv3-upnext')&&!!document.querySelector('.muse-dv3-recent')),'Dashboard holds streak, Up next, Goals, Currently reading, finished and recent; plans live in Plans');check(await b.evaluate(()=>document.querySelectorAll('a[href="/collections/reading-atlas"]').length<=3),'no duplicate Reading Atlas buttons');
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('board-desktop');
 check(await b.evaluate(()=>!document.querySelector('.muse-collections-toolbar-end [data-books-settings-trigger]')),'no separate Reading button in the toolbar');
 await b.click('button[aria-label="Books settings"]');await b.until(()=>!!document.querySelector('#collections-preferences[open] #settings-books'),'settings dialog');await wait(300);
 check(await b.evaluate(()=>!!document.querySelector('#collections-preferences [data-books-settings-trigger]')&&/Daily Edit/.test(document.querySelector('#collections-preferences').textContent)),'Books settings live in the Settings dialog');await b.shoot('settings-dialog');
 await b.evaluate(()=>document.querySelector('#collections-preferences').close());await wait(200);
 // More menu opens and closes from its trigger.
 await b.click('.muse-desk-more');await b.until(()=>!!document.querySelector('.muse-desk-menu'),'more menu');await b.shoot('desk-more-menu');
 check(await b.evaluate(()=>/Open book/.test(document.querySelector('.muse-desk-menu').textContent)&&/Log reading manually/.test(document.querySelector('.muse-desk-menu').textContent)&&/Finished/.test(document.querySelector('.muse-desk-menu').textContent)),'Open book, Log reading and shelf moves live in the ⋯ menu');
 await b.evaluate(()=>{const t=document.querySelector('.muse-desk-more'),r=t.getBoundingClientRect(),o={bubbles:true,clientX:r.left+5,clientY:r.top+5,button:0};t.dispatchEvent(new PointerEvent('pointerdown',o));t.click();});await wait(300);
 check(await b.evaluate(()=>!document.querySelector('.muse-desk-menu')),'the ⋯ trigger closes its menu');
 // Densities in Library mode.
 await b.go('/collections?tab=library&kind=book','document.querySelectorAll(".muse-collections-library-page .muse-lib-item").length>0','library');await wait(500);
 const columns=()=>b.evaluate(()=>getComputedStyle(document.querySelector('.muse-collections-library-page .muse-lib-grid')).gridTemplateColumns.split(' ').length);
 const density=async id=>{if(id==='List'){await b.click('.muse-lib-view button[aria-label="List"]');}else{if(await b.evaluate(()=>document.querySelector('main.muse-collections').dataset.density==='list'))await b.click('.muse-lib-view button[aria-label="Gallery"]');await b.click('button[aria-label="Books settings"]');await b.until(()=>!!document.querySelector('#collections-preferences'),'settings');await b.click('button.muse-choice-trigger[aria-label^="Default cover size"]');await b.until(()=>!!document.querySelector('.popover-choice'),'density menu');await b.click('.popover-choice',id);await b.click('#collections-preferences .muse-button.button-primary','Save preferences');await b.until(()=>!document.querySelector('#collections-preferences'),'settings saved');}await wait(500);await b.evaluate(()=>document.querySelector('.muse-collections-library-page').scrollIntoView({block:'start'}));await wait(200);};
 check(await b.evaluate(()=>document.querySelector('main.muse-collections').dataset.density==='compact'),'compact is the default density');
 const compact=await columns();await b.shoot('library-compact');
 await density('Showcase');const showcase=await columns();await b.shoot('library-showcase');
 await density('List');await b.shoot('library-list');const listRow=await b.evaluate(()=>Math.round(document.querySelector('.muse-collections-library-page .muse-lib-item').getBoundingClientRect().height));
 console.log({compact,showcase,listRow});check(compact>=5&&showcase<compact,'compact fits many more covers per row than showcase');check(listRow<=90,`list rows are compact (${listRow}px)`);
 await b.go('/collections?tab=library&kind=book','document.querySelectorAll(".muse-collections-library-page .muse-lib-item").length>0','reload');await wait(1500);
 check(await b.evaluate(()=>document.querySelector('main.muse-collections').dataset.density==='list'),'the chosen density is remembered');
 await density('Compact');
 for(const t of themes){await b.evaluate(x=>document.documentElement.setAttribute('data-theme',x),t);await wait(300);await b.shoot(`library-compact-${t}`);}
 await b.evaluate(()=>document.documentElement.removeAttribute('data-theme'));
 // Phone.
 await b.viewport(390,844,true);
 await b.go('/collections',board,'phone board');await wait(800);
 check(await b.evaluate(()=>{const s=document.querySelector('.muse-desk-spot'),r=s.getBoundingClientRect();return r.width>=260&&[...s.querySelectorAll('.muse-desk-pool,.muse-desk-more,.muse-desk-start,.muse-desk-log')].every(x=>x.getBoundingClientRect().right<=r.right+1);}),'the spotlight fills the phone width and its controls stay inside it');check(!(await b.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1)),'no sideways scroll on a phone');
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('phone-board-top');await b.evaluate(()=>document.querySelector('.muse-desk-layout').scrollIntoView({block:'start'}));await wait(300);await b.shoot('phone-desk');
 await b.go('/collections?tab=library&kind=book','document.querySelectorAll(".muse-collections-library-page .muse-lib-item").length>0','phone library');await wait(600);
 check(await columns()===3,'three covers across on a phone in compact (Library V2)');await b.evaluate(()=>document.querySelector('.muse-collections-library-page').scrollIntoView({block:'start'}));await wait(300);await b.shoot('phone-library-compact');
 check(b.errors.length===0,`no uncaught exceptions ${b.errors.join('|').slice(0,200)}`);
 console.log(`\n${passed} checks passed. ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
