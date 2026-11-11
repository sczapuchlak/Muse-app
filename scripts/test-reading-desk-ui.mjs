// Browser QA for the Reading Desk batch (#135): streak hearts and Atlas streak view, one Reading Atlas link, Daily Edit
// timer sync with the book page, compact discard dialog, check-in page delta, and toggle-closed dropdowns.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
const shots=process.env.DESK_QA_SHOTS??'/private/tmp/muse-desk-shots';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
const day=offset=>{const d=new Date();d.setUTCDate(d.getUTCDate()-offset);return d.toISOString().slice(0,10);};
try{
 const save=async(kind,record)=>{const {error}=await account.client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:record,p_delete:false});if(error)throw Error(`${kind}: ${error.message}`);};
 // Four earlier days in a row plus a gap (today already has a session from the harness): streak of 5, best 5.
 for(const offset of [1,2,3,4,6]){const date=day(offset);await save('sessions',{id:crypto.randomUUID(),bookId:account.ids.heir,date,timeZone:'UTC',pages:5,activeSegments:[{start:`${date}T07:00:00.000Z`,end:`${date}T07:20:00.000Z`}],manual:true});}
 await save('widgets',{id:crypto.randomUUID(),experience:'bookshelf',enabled:true,featuredBookId:account.ids.heir});
 browser=await openBrowser(account,{shots});const b=browser;
 await b.go('/collections?kind=book&mode=board','!!document.querySelector(".muse-streak")','desk');await wait(600);
 const desk=await b.evaluate(()=>({hearts:document.querySelectorAll('.muse-streak-week .muse-streak-heart').length,filled:document.querySelectorAll('.muse-streak-week .muse-streak-heart[data-filled]').length,count:document.querySelector('.muse-streak-count strong')?.textContent,atlasLinks:[...document.querySelectorAll('main a, main button')].filter(x=>/^\s*Reading Atlas\s*$/.test(x.textContent)).length,settings:!!document.querySelector('[data-books-settings-trigger]'),deskActions:!!document.querySelector('.muse-books-desk-actions')}));
 console.log(JSON.stringify(desk));
 check(desk.hearts===7&&desk.filled>=5,'seven hearts, the reading days filled');check(desk.count==='5','current streak counts five consecutive days');
 check(desk.atlasLinks===1,'Reading Atlas appears once');check(desk.settings&&!desk.deskActions,'Reading settings moved to the Books toolbar');
 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('desk-streak');
 await b.click('.muse-streak');await b.until(()=>!!document.querySelector('.muse-atlas-streaks'),'atlas streak view');await wait(500);
 check(await b.evaluate(()=>document.querySelector('.muse-streaks-now strong')?.textContent==='5'),'Atlas streak view opens from the hearts');await b.shoot('atlas-streaks');
 // Daily Edit: start, see the live controller, pause.
 await b.go('/','!!document.querySelector(".muse-daily-bookshelf")','daily');await b.until(()=>[...document.querySelectorAll('.muse-daily-bookshelf button')].some(x=>/Start reading/.test(x.textContent)),'start button');
 await b.click('.muse-daily-bookshelf button','Start reading');await b.until(()=>!!document.querySelector('.muse-daily-session'),'live controller');await wait(1500);
 check(await b.evaluate(()=>document.querySelector('.muse-daily-session').dataset.phase==='running'),'Daily Edit shows the running timer after starting there');
 await b.evaluate(()=>document.querySelector('.muse-daily-bookshelf').scrollIntoView({block:'center'}));await b.shoot('daily-running');
 await b.click('.muse-daily-session button','Pause');await b.until(()=>document.querySelector('.muse-daily-session')?.dataset.phase==='paused','paused');check(true,'pause from Daily Edit');await b.shoot('daily-paused');
 // Book page: discard with a compact dialog, then Daily Edit returns to Start reading.
 await b.viewport(390,844,true);
 await b.go(`/collections/books/${account.ids.heir}`,'!!document.querySelector(".muse-session")','book');await wait(500);
 await b.click('.muse-session-discard');await b.until(()=>!!document.querySelector('#bookshelf-discard-session[open]'),'discard dialog');await wait(300);
 const modal=await b.evaluate(()=>Math.round(document.querySelector('#bookshelf-discard-session').getBoundingClientRect().height));
 console.log('discard dialog height',modal);check(modal<360,`discard dialog is compact on a phone (${modal}px)`);await b.shoot('discard-phone');
 await b.click('#bookshelf-discard-session button','Discard session');await b.until(()=>!document.querySelector('.muse-session'),'discarded');
 await b.go('/','!!document.querySelector(".muse-daily-bookshelf")','daily again');await wait(1500);
 check(await b.evaluate(()=>!document.querySelector('.muse-daily-session')&&[...document.querySelectorAll('.muse-daily-bookshelf button')].some(x=>/Start reading/.test(x.textContent))),'after discarding on the book, Daily Edit offers Start reading again');
 // Check-in delta: start an open sitting on the book, finish, enter the current page.
 await b.viewport(1280,900);
 await b.go(`/collections/books/${account.ids.heir}`,'!!document.querySelector(".muse-book-sitting-modes button")','book desktop');
 await b.evaluate(()=>{const x=[...document.querySelectorAll('.muse-book-sitting-choice button')].find(y=>/begin|start/i.test(y.textContent)&&!y.hasAttribute('aria-pressed'));x.click();});
 await b.until(()=>!!document.querySelector('.muse-session-toggle'),'running');await wait(1200);
 await b.click('.muse-session-finish-button');await b.until(()=>!!document.querySelector('.muse-checkin-left'),'check-in');
 const left=await b.text('.muse-checkin-left');console.log('left off',left);
 const start=Number(left.match(/page (\d+)/)[1]);await b.type('.muse-books-checkin input[type=number]',String(start+28));await wait(300);
 const delta=await b.text('.muse-checkin-delta');console.log('delta',delta);check(/\+28 pages/.test(delta),'check-in shows +28 pages from where you left off');
 await b.evaluate(()=>document.querySelector('.muse-books-checkin').scrollIntoView({block:'center'}));await b.shoot('checkin-delta');
 await b.click('.muse-books-checkin button','Save session');await b.until(()=>!document.querySelector('.muse-books-checkin'),'saved');
 // Dropdown: the trigger opens and closes.
 const trigger='.muse-book-page-status .muse-choice-trigger';await b.click(trigger);await b.until(()=>!!document.querySelector('.muse-popover-panel'),'menu open');
 await b.evaluate(s=>{const t=document.querySelector(s),r=t.getBoundingClientRect(),o={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,button:0,pointerType:'mouse'};t.dispatchEvent(new PointerEvent('pointerdown',o));t.dispatchEvent(new MouseEvent('mousedown',o));t.dispatchEvent(new PointerEvent('pointerup',o));t.dispatchEvent(new MouseEvent('mouseup',o));t.click();},trigger);await wait(400);
 check(await b.evaluate(()=>!document.querySelector('.muse-popover-panel')),'pressing the dropdown trigger again closes it');
 check(b.errors.length===0,`no uncaught exceptions ${b.errors.join('|').slice(0,200)}`);
 console.log(`\n${passed} checks passed. ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
