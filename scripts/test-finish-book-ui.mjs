// Browser QA for the one Finish Book workflow (historical reading, bulk sessions, half stars) on a LOCAL production
// build, with a disposable seeded account: status menu (cancel and save), several sessions with validation, a past
// read, the live timer (back to the sitting, then finish), logging several sessions, half-star input, the phone layout.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
const shots=process.env.FINISH_QA_SHOTS??'/private/tmp/muse-finish-shots';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
const readBook=async id=>{const {data,error}=await account.client.rpc('read_whimsy_record',{p_kind:'books',p_id:id});if(error)throw error;return data;};
const sessionsOf=async id=>{const {data,error}=await account.client.rpc('read_whimsy',{});if(error)throw error;return (data?.sessions??[]).filter(s=>s.bookId===id);};
try{
 browser=await openBrowser(account,{shots});const b=browser,{acowar,acotar,heir,manual}=account.ids;
 const sheet='#bookshelf-finish-book';
 const openStatus=async label=>{await b.click('.muse-book-page-status .muse-choice-trigger');await b.until(()=>[...document.querySelectorAll('.popover-choice')].some(x=>x.offsetParent),'status menu');await b.click('.popover-choice',label);};
 const sheetOpen=()=>b.until(s=>!!document.querySelector(s+'[open]'),'Finish Book sheet',sheet);
 const sheetText=()=>b.text(sheet);
 const clickIn=(selector,text)=>b.evaluate(({selector,text})=>{const el=[...document.querySelectorAll(`#bookshelf-finish-book ${selector}`)].find(x=>(text==null||x.textContent.trim().includes(text)||x.getAttribute('aria-label')===text)&&!x.disabled);if(!el)throw Error('missing '+selector+' '+text);el.click();},{selector,text});

 // 1. Status menu: Finished opens the sheet; Cancel keeps the book exactly as it was.
 await b.go(`/collections/books/${acowar}`,'!!document.querySelector(".muse-book-page-status")','TBR book');
 await openStatus('Finished');await sheetOpen();
 check(/You finished it/.test(await sheetText())&&/Start & finish dates/.test(await sheetText()),'status Finished opens the shared Finish Book sheet');
 await b.shoot('status-sheet-dates');
 await clickIn('button','Cancel');await wait(600);
 check((await readBook(acowar)).status==='planned','cancelling keeps To Be Read (no silent status change)');

 // 2. Sessions mode: paste four sessions, see a validation error, fix it, rate 4.5, save as Finished.
 await openStatus('Finished');await sheetOpen();
 await clickIn('.muse-finish-mode button','Reading sessions');await wait(200);
 await clickIn('button','Paste rows');await wait(200);
 await b.type(`${sheet} .muse-session-rows-paste textarea`,'2025-06-01\t0\t160\t45\n2025-06-02\t150\t345\t70\n2025-06-04\t345\t550\t85\n2025-06-06\t550\t703\t90');
 await clickIn('button','Add these rows');await wait(300);
 await clickIn('button[type=submit]');await wait(300);
 const err=await sheetText();
 check(/Overlaps the session above, which already reached page 160/.test(err),'overlapping progress is rejected inline, before saving');
 check((await readBook(acowar)).status==='planned','nothing saved while a row is invalid');
 await b.shoot('sessions-error');
 await b.evaluate(()=>{const rows=[...document.querySelectorAll('#bookshelf-finish-book .muse-session-rows-list li')];const input=rows[1].querySelectorAll('input')[1];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;input.focus();set.call(input,'160');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await wait(300);
 const fixed=await sheetText();
 check(!/Overlaps the session above/.test(fixed),'correcting the row clears the error');
 check(/Finished June 6, 2025 · 703 pages · 4 sessions · 4 h 50 min/.test(fixed),`summary from the sessions: ${fixed.match(/Finished[^.]*?min/)?.[0]}`);
 check(/From your sessions/.test(fixed),'dates inferred from the sessions are labelled as such');
 // Half star by touch: tap the fifth star, then tap it again.
 await clickIn('.muse-star-rating button[data-star="5"]');await wait(100);await clickIn('.muse-star-rating button[data-star="5"]');await wait(200);
 check(/4\.5 of 5 stars/.test(await sheetText()),'tapping a star twice gives its half (4.5)');
 await b.evaluate(()=>document.querySelector('#bookshelf-finish-book .muse-star-rating [role=group]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})));await wait(150);
 check(/4 of 5 stars/.test(await sheetText()),'arrow keys move by half a star');
 await b.evaluate(()=>document.querySelector('#bookshelf-finish-book .muse-star-rating [role=group]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));await wait(150);
 await b.shoot('sessions-ready');
 await clickIn('button[type=submit]');
 await b.until(()=>!document.querySelector('#bookshelf-finish-book[open]'),'sheet closes after saving');await wait(800);
 const finished=await readBook(acowar),own=await sessionsOf(acowar);
 check(finished.status==='finished'&&finished.finishedOn==='2025-06-06'&&finished.startedOn==='2025-06-01',`saved as Finished with its historical dates, not today (${JSON.stringify({status:finished.status,startedOn:finished.startedOn,finishedOn:finished.finishedOn,c:finished.completions,page:await b.text('.muse-books-error'),msg:await b.text('.muse-books-message')})})`);
 check(finished.rating===4.5&&finished.completions[0].rating===4.5,'4.5 stars persist');
 check(own.length===4&&own.every(s=>s.manual&&s.cycleId===finished.completions[0].id),'four manual sessions linked to the read');
 await b.click('.muse-book-page-tabs button','Reads');await wait(400);
 check(await b.evaluate(()=>!!document.querySelector('.muse-read-card-stars i[data-fill=half]')),'the read card shows a half-filled star');
 await b.shoot('reads-half-star');

 // 3. Add a past read (dates only) to a finished book: one book, two reads, no sessions.
 await b.go(`/collections/books/${acotar}`,'!!document.querySelector(".muse-book-page-tabs")','finished book');
 await b.click('.muse-book-page-tabs button','Reads');await wait(300);
 await b.click('.muse-book-page-reads-actions button','Add a past read');await sheetOpen();
 check(/Add a past read/.test(await sheetText()),'Add a past read opens the same sheet');
 await clickIn('button[type=submit]');await wait(200);
 check(/Choose the day you finished it/.test(await sheetText()),'a finish date is required and never defaults to today');
 // Choose dates through the calendar: open Finished, go back years, pick a day.
 await clickIn('.muse-finish-dates .muse-books-select-field:nth-child(2) .muse-date-picker-trigger');await wait(300);
 for(let i=0;i<6;i++){await b.click('.muse-calendar-navigation button','Previous year');await wait(60);}
 await b.evaluate(()=>{const day=[...document.querySelectorAll('.muse-calendar-grid button[data-date]')].find(x=>x.dataset.date.endsWith('-15'));day.click();});await wait(300);
 const pastText=await sheetText();
 check(/Finished \w+ 15, 2020/.test(pastText),`historical finish chosen in the calendar (${pastText.match(/Finished \w+ \d+, \d{4}/)?.[0]})`);
 check(/No detailed sessions recorded/.test(pastText),'date-only summary says no sessions were recorded');
 await clickIn('button[type=submit]');await b.until(()=>!document.querySelector('#bookshelf-finish-book[open]'),'past read saved');await wait(600);
 const twice=await readBook(acotar);
 check(twice.completions.length===2&&twice.completions[0].finishedOn.startsWith('2020')&&twice.status==='finished'&&(await sessionsOf(acotar)).length===0,'a past read adds a second read of the same book with no invented sessions');

 // 4. Live timer: "I finished this book" → back to the sitting keeps it → finish saves sitting + read together.
 await b.go(`/collections/books/${heir}`,'!!document.querySelector(".muse-book-panel")','reading book');
 await b.until(()=>!!document.querySelector('.muse-book-sitting-choice'),'sitting chooser');
 await b.evaluate(()=>{const x=[...document.querySelectorAll('.muse-book-sitting-choice button')].find(x=>/Begin/.test(x.textContent));x.click();});
 await b.until(()=>!!document.querySelector('.muse-session-finish-book'),'timer running with Finish Book action');
 await wait(2500);await b.shoot('timer-running');
 await b.click('.muse-session-finish-book');await sheetOpen();
 const live=await sheetText();
 check(/This sitting/.test(live)&&/from page 42/.test(live),'the timer sheet carries the live sitting and its starting page');
 check(await b.evaluate(()=>document.querySelector('#bookshelf-finish-book .muse-finish-endpage input').value)==='565','the ending page is prefilled from the book’s length');
 await clickIn('button','Back to the sitting');await wait(500);
 check(await b.evaluate(()=>document.querySelector('.muse-session')?.dataset.phase)==='finishing','cancelling keeps the sitting (check-in still open, nothing lost)');
 await b.click('.muse-checkin-finished');await sheetOpen();
 await clickIn('button[type=submit]');await b.until(()=>!document.querySelector('#bookshelf-finish-book[open]'),'timer finish saved');await wait(800);
 const heirBook=await readBook(heir),heirSessions=await sessionsOf(heir);
 check(heirBook.status==='finished'&&heirSessions.length===2,'the sitting and the finished read saved together (original session kept)');
 check(heirSessions.some(s=>s.notes==='Rowan!'&&s.endingPage===42),'the existing real session is untouched');
 check(!(await b.evaluate(()=>!!document.querySelector('.muse-session'))),'the timer is cleared');

 // 5. Log several sessions at once for a paused book without a page count, without finishing it.
 await b.go(`/collections/books/${manual}`,'!!document.querySelector(".muse-book-panel-actions")','paused book');
 await b.click('.muse-book-panel-actions button','Log reading');await b.until(()=>!!document.querySelector('#bookshelf-session-editor[open]'),'log editor');
 await b.click('#bookshelf-session-editor .muse-books-log-title button','Log several sessions at once');await sheetOpen();
 await clickIn('button','Paste rows');await wait(150);
 await b.type(`${sheet} .muse-session-rows-paste textarea`,'2026-11-10, 12\n2026-11-12, 30');
 await clickIn('button','Add these rows');await wait(300);
 check(/2 sessions to save · 30 pages/.test(await sheetText()),'cumulative progress (a date and the page reached) becomes two sessions of 12 and 18 pages');
 await clickIn('button[type=submit]');await b.until(()=>!document.querySelector('#bookshelf-finish-book[open]'),'sessions logged').catch(async e=>{console.log('SHEET:',await sheetText());throw e;});await wait(600);
 const logged=await sessionsOf(manual),paused=await readBook(manual);
 check(logged.length===2&&paused.status==='paused'&&logged.every(s=>s.activeSegments.length===0&&s.cycleId===paused.cycleId),'logged without finishing, no time invented, linked to the read in progress');

 // 6. Phone layout: the sessions editor stacks without horizontal overflow.
 await b.viewport(390,844,true);
 await b.go(`/collections/books/${manual}`,'!!document.querySelector(".muse-book-page-status")','phone');
 await openStatus('Finished');await sheetOpen();await clickIn('.muse-finish-mode button','Reading sessions');await wait(300);
 const phone=await b.evaluate(()=>{const d=document.querySelector('#bookshelf-finish-book'),r=d.getBoundingClientRect(),inputs=[...d.querySelectorAll('.muse-session-rows-list input')].map(i=>i.getBoundingClientRect());return {width:r.width,over:d.scrollWidth>d.clientWidth+1,minInput:Math.min(...inputs.map(i=>i.height)),stars:Math.min(...[...d.querySelectorAll('.muse-star-rating button[data-star]')].map(x=>x.getBoundingClientRect().width))};});
 console.log(JSON.stringify(phone));
 check(!phone.over&&phone.width<=390&&phone.minInput>=44&&phone.stars>=40,'phone: no overflow, 44px inputs, roomy star targets');
 await b.shoot('phone-sessions');
 await b.evaluate(()=>document.querySelector('#bookshelf-finish-book .muse-star-rating').scrollIntoView({block:'center'}));await b.shoot('phone-rating');
 await clickIn('button','Cancel');await wait(300);

 // 7. Add Book → Read (already read): nothing is saved until Finish Book is saved. Needs the live book catalog.
 await b.viewport(1280);
 await b.go('/collections?tab=library&kind=book','!!document.querySelector(\'[aria-label="Add a book"]\')','library');
 await wait(2000);// the toolbar is server-rendered; wait for it to hydrate before clicking
 await b.click('[aria-label="Add a book"]');await b.until(()=>!!document.querySelector('.muse-book-search-field input'),'add book search');
 await b.type('.muse-book-search-field input','Piranesi Susanna Clarke');
 const found=await b.until(()=>!!document.querySelector('.muse-quick-add-read'),'catalog results',undefined,250).then(()=>true,()=>false);
 if(!found)console.log('SKIP Add Book → Read: the book catalog did not answer from this machine');
 else{
  await b.shoot('add-search-read');
  const before=(await account.client.rpc('read_whimsy',{})).data.books.length;
  await b.click('.muse-quick-add-read');
  await b.until(()=>!!document.querySelector('#book-edition-sheet[open],#bookshelf-finish-book[open]'),'edition or finish sheet');
  if(await b.evaluate(()=>!!document.querySelector('#book-edition-sheet[open]'))){
   check(await b.evaluate(()=>[...document.querySelectorAll('#book-edition-sheet .muse-edition-sheet-status button')].some(x=>x.textContent==='Already read'&&x.getAttribute('aria-pressed')==='true')),'Which edition? keeps Already read selected');
   await b.click('#book-edition-sheet .muse-edition-sheet-list button','Add');
  }
  await sheetOpen();
  check(/Already read/.test(await sheetText()),'Already read opens Finish Book');
  check((await account.client.rpc('read_whimsy',{})).data.books.length===before,'nothing is saved before Finish Book is saved');
  await clickIn('.muse-finish-dates .muse-books-select-field:nth-child(2) .muse-date-picker-trigger');await wait(300);
  await b.click('.muse-calendar-navigation button','Previous year');await wait(80);
  await b.evaluate(()=>{[...document.querySelectorAll('.muse-calendar-grid button[data-date]')].find(x=>x.dataset.date.endsWith('-03')).click();});await wait(300);
  await clickIn('.muse-star-rating button[data-star="3"]');await wait(100);await clickIn('.muse-star-rating button[data-star="3"]');await wait(150);
  await b.shoot('add-already-read');
  await clickIn('button[type=submit]');await b.until(()=>!document.querySelector('#bookshelf-finish-book[open]'),'already read saved');await wait(800);
  const added=(await account.client.rpc('read_whimsy',{})).data.books.find(x=>/piranesi/i.test(x.title));
  check(added&&added.status==='finished'&&added.rating===2.5&&added.completions.length===1&&added.finishedOn.endsWith('-03')&&added.finishedOn<'2026-11-01',`Already read saved as Finished with its own date and 2.5 stars (${added?.finishedOn})`);
 }
 check(b.errors.length===0,`no uncaught exceptions ${b.errors.join('|').slice(0,300)}`);
 console.log(`\n${passed} checks passed. Screenshots: ${shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
