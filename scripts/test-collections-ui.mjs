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
 const board='document.querySelectorAll(".muse-desk-tile").length>0';
 await b.go('/collections?kind=book&mode=board',board,'board');await wait(800);
 const desk=await b.evaluate(()=>({tiles:document.querySelectorAll('.muse-desk-tile').length,topRow:(()=>{const r=document.querySelector('.muse-desk-top .muse-streak-panel')?.getBoundingClientRect(),g=document.querySelector('.muse-desk-top .muse-challenge')?.getBoundingClientRect();return !!r&&!!g&&Math.abs(r.top-g.top)<=6&&g.left>r.left&&Math.abs(r.width-g.width)<8;})(),continue:document.querySelectorAll('.muse-desk-continue').length,oldCards:document.querySelectorAll('.muse-books-card').length,tallest:Math.max(...[...document.querySelectorAll('.muse-desk-tile')].map(t=>Math.round(t.getBoundingClientRect().height)))}));
 console.log(JSON.stringify(desk));check(desk.tiles>=4&&desk.continue===desk.tiles&&desk.oldCards===0,'Reading Desk shows compact tiles with one Continue reading each');
 check(desk.topRow,'streak and yearly goal share the top row, 50/50, on desktop');check(desk.tallest<=260,`desk tiles stay compact (${desk.tallest}px)`);
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('board-desktop');
 check(await b.evaluate(()=>!document.querySelector('.muse-collections-toolbar-end [data-books-settings-trigger]')),'no separate Reading button in the toolbar');
 await b.click('button[aria-label="Settings"]');await b.until(()=>!!document.querySelector('#collections-preferences[open] #settings-books'),'settings dialog');await wait(300);
 check(await b.evaluate(()=>!!document.querySelector('#collections-preferences [data-books-settings-trigger]')&&/Daily Edit/.test(document.querySelector('#collections-preferences').textContent)),'Books settings live in the Settings dialog');await b.shoot('settings-dialog');
 await b.evaluate(()=>document.querySelector('#collections-preferences').close());await wait(200);
 // More menu opens and closes from its trigger.
 await b.click('.muse-desk-more');await b.until(()=>!!document.querySelector('.muse-desk-menu'),'more menu');await b.shoot('desk-more-menu');
 check(await b.evaluate(()=>!!document.querySelector('.muse-desk-menu .muse-books-status-control')&&/Log reading manually/.test(document.querySelector('.muse-desk-menu').textContent)),'secondary actions live in the ⋯ menu');
 await b.evaluate(()=>{const t=document.querySelector('.muse-desk-more'),r=t.getBoundingClientRect(),o={bubbles:true,clientX:r.left+5,clientY:r.top+5,button:0};t.dispatchEvent(new PointerEvent('pointerdown',o));t.click();});await wait(300);
 check(await b.evaluate(()=>!document.querySelector('.muse-desk-menu')),'the ⋯ trigger closes its menu');
 // Densities in Library mode.
 await b.go('/collections?kind=book&mode=library','document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0','library');await wait(500);
 const columns=()=>b.evaluate(()=>getComputedStyle(document.querySelector('.muse-collections-library-page .muse-collections-grid')).gridTemplateColumns.split(' ').length);
 const density=async id=>{await b.click('.muse-density button',id);await wait(500);await b.evaluate(()=>document.querySelector('.muse-collections-library-page').scrollIntoView({block:'start'}));await wait(200);};
 check(await b.evaluate(()=>document.querySelector('main.muse-collections').dataset.density==='compact'),'compact is the default density');
 const compact=await columns();await b.shoot('library-compact');
 await density('Showcase');const showcase=await columns();await b.shoot('library-showcase');
 await density('List');await b.shoot('library-list');const listRow=await b.evaluate(()=>Math.round(document.querySelector('.muse-collections-library-page .muse-collections-card').getBoundingClientRect().height));
 console.log({compact,showcase,listRow});check(compact>=7&&showcase<compact,'compact fits many more covers per row than showcase');check(listRow<=90,`list rows are compact (${listRow}px)`);
 await b.go('/collections?kind=book&mode=library','document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0','reload');await wait(1500);
 check(await b.evaluate(()=>document.querySelector('main.muse-collections').dataset.density==='list'),'the chosen density is remembered');
 await density('Compact');
 for(const t of themes){await b.evaluate(x=>document.documentElement.setAttribute('data-theme',x),t);await wait(300);await b.shoot(`library-compact-${t}`);}
 await b.evaluate(()=>document.documentElement.removeAttribute('data-theme'));
 // Phone.
 await b.viewport(390,844,true);
 await b.go('/collections?kind=book&mode=board',board,'phone board');await wait(800);
 const phone=await b.evaluate(()=>{const tiles=[...document.querySelectorAll('.muse-desk-tile')].map(t=>t.getBoundingClientRect());const track=document.querySelector('.muse-desk-track').getBoundingClientRect();return {twoAcross:tiles.length>1&&Math.abs(tiles[0].top-tiles[1].top)<2&&tiles[1].right<=track.right+2,tileW:Math.round(tiles[0].width),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};});
 console.log(JSON.stringify(phone));check(phone.twoAcross,'two desk tiles across on a phone');
 check(await b.evaluate(()=>[...document.querySelectorAll('.muse-desk-tile')].every(t=>{const r=t.getBoundingClientRect();return [...t.querySelectorAll('.muse-desk-pool,.muse-desk-more,.muse-desk-continue')].every(x=>x.getBoundingClientRect().right<=r.right+1);})),'desk tile contents stay inside each tile on a phone');check(!phone.overflow,'no horizontal overflow on phone');
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('phone-board-top');await b.evaluate(()=>document.querySelector('.muse-desk-layout').scrollIntoView({block:'start'}));await wait(300);await b.shoot('phone-desk');
 await b.go('/collections?kind=book&mode=library','document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0','phone library');await wait(600);
 check(await columns()===3,'three covers across on a phone in compact');await b.evaluate(()=>document.querySelector('.muse-collections-library-page').scrollIntoView({block:'start'}));await wait(300);await b.shoot('phone-library-compact');
 check(b.errors.length===0,`no uncaught exceptions ${b.errors.join('|').slice(0,200)}`);
 console.log(`\n${passed} checks passed. ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
