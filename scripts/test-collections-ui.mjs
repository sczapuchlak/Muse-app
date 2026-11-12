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
 await b.go('/collections',board,'board');await wait(800);
 const desk=await b.evaluate(()=>({tiles:document.querySelectorAll('.muse-desk-tile').length,start:document.querySelectorAll('.muse-desk-start').length,oldCards:document.querySelectorAll('.muse-books-card').length}));
 console.log(JSON.stringify(desk));check(desk.tiles>=4&&desk.start===desk.tiles&&desk.oldCards===0,'Dashboard shows compact Currently Reading tiles with one Start reading each');
 check(await b.evaluate(()=>{const nav=[...document.querySelectorAll('.muse-books-nav a')].map(a=>a.textContent);return nav.join('|')==='Dashboard|Library|Reading Atlas'&&!document.querySelector('.muse-collections-chips')&&!/Movies|TV Shows|Games|Music/.test(document.querySelector('main').textContent);}),'Books navigation is Dashboard / Library / Reading Atlas, with no other media types');check(await b.evaluate(()=>{const c=[...document.querySelectorAll('.muse-dash-col')].map(e=>e.getBoundingClientRect());return c.length===2&&Math.abs(c[0].width-c[1].width)<2&&Math.abs(c[0].bottom-c[1].bottom)<2;}),'the Dashboard top is two equal columns that end on the same line');check(await b.evaluate(()=>!!document.querySelector('.muse-dash-col .muse-streak-panel')&&!!document.querySelector('.muse-dash-goals')&&!!document.querySelector('.muse-plans')&&!!document.querySelector('.muse-upnext')&&!!document.querySelector('.muse-dash-recent')),'Dashboard holds streak, goals, plans, up next and recent reading');check(await b.evaluate(()=>document.querySelectorAll('a[href="/collections/reading-atlas"]').length<=3),'no duplicate Reading Atlas buttons');
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
 await b.go('/collections?tab=library&kind=book','document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0','library');await wait(500);
 const columns=()=>b.evaluate(()=>getComputedStyle(document.querySelector('.muse-collections-library-page .muse-collections-grid')).gridTemplateColumns.split(' ').length);
 const density=async id=>{await b.click('button.muse-choice-trigger[aria-label^="Cover size"]');await b.until(()=>!!document.querySelector('.popover-choice'),'density menu');await b.click('.popover-choice',id);await wait(500);await b.evaluate(()=>document.querySelector('.muse-collections-library-page').scrollIntoView({block:'start'}));await wait(200);};
 check(await b.evaluate(()=>document.querySelector('main.muse-collections').dataset.density==='compact'),'compact is the default density');
 const compact=await columns();await b.shoot('library-compact');
 await density('Showcase');const showcase=await columns();await b.shoot('library-showcase');
 await density('List');await b.shoot('library-list');const listRow=await b.evaluate(()=>Math.round(document.querySelector('.muse-collections-library-page .muse-collections-card').getBoundingClientRect().height));
 console.log({compact,showcase,listRow});check(compact>=5&&showcase<compact,'compact fits many more covers per row than showcase');check(listRow<=90,`list rows are compact (${listRow}px)`);
 await b.go('/collections?tab=library&kind=book','document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0','reload');await wait(1500);
 check(await b.evaluate(()=>document.querySelector('main.muse-collections').dataset.density==='list'),'the chosen density is remembered');
 await density('Compact');
 for(const t of themes){await b.evaluate(x=>document.documentElement.setAttribute('data-theme',x),t);await wait(300);await b.shoot(`library-compact-${t}`);}
 await b.evaluate(()=>document.documentElement.removeAttribute('data-theme'));
 // Phone.
 await b.viewport(390,844,true);
 await b.go('/collections',board,'phone board');await wait(800);
 const phone=await b.evaluate(()=>{const tiles=[...document.querySelectorAll('.muse-desk-tile')].map(t=>t.getBoundingClientRect());const track=document.querySelector('.muse-desk-track').getBoundingClientRect();return {twoAcross:tiles.length>1&&Math.abs(tiles[0].top-tiles[1].top)<2&&tiles[1].right<=track.right+2,tileW:Math.round(tiles[0].width),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};});
 console.log(JSON.stringify(phone));check(phone.tileW>=250&&!phone.overflow,'a Dashboard tile fills the phone width, swiping for more');
 check(await b.evaluate(()=>[...document.querySelectorAll('.muse-desk-tile')].every(t=>{const r=t.getBoundingClientRect();return [...t.querySelectorAll('.muse-desk-pool,.muse-desk-more,.muse-desk-continue')].every(x=>x.getBoundingClientRect().right<=r.right+1);})),'desk tile contents stay inside each tile on a phone');check(!phone.overflow,'no horizontal overflow on phone');
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('phone-board-top');await b.evaluate(()=>document.querySelector('.muse-desk-layout').scrollIntoView({block:'start'}));await wait(300);await b.shoot('phone-desk');
 await b.go('/collections?tab=library&kind=book','document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0','phone library');await wait(600);
 check(await columns()===2,'two cards across on a phone in compact');await b.evaluate(()=>document.querySelector('.muse-collections-library-page').scrollIntoView({block:'start'}));await wait(300);await b.shoot('phone-library-compact');
 check(b.errors.length===0,`no uncaught exceptions ${b.errors.join('|').slice(0,200)}`);
 console.log(`\n${passed} checks passed. ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
