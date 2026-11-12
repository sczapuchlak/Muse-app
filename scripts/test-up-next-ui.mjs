// Browser QA for Up Next + Reading Roulette (Books Phase 3). Needs a production build (`next start`) and local Supabase.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
const shots=process.env.UPNEXT_QA_SHOTS??'/private/tmp/muse-upnext-shots';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
const now=new Date(),month=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
try{
 const {client,ids}=account;
 const addBook=async(title,status='planned',extra={})=>{const id=crypto.randomUUID(),{error}=await client.rpc('save_whimsy_record',{p_kind:'books',p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:{id,title,author:'Test Author',status,reviewEmojis:[],format:'physical',startingPage:0,currentPage:0,genre:'Fantasy',coverUrl:'',...extra},p_delete:false});if(error)throw Error(error.message);return id;};
 const tbr=[];for(const t of ['Alpha Tale','Beta Tale','Gamma Tale','Delta Tale'])tbr.push(await addBook(t));
 await client.rpc('add_reading_plan_books',{p_kind:'month',p_period:month,p_book_ids:[tbr[0],tbr[1],tbr[3],ids.circe]});
 const slotsDb=async()=>{const r=(await client.from('up_next_slots').select('slot,book_id')).data;const s=['','',''];for(const x of r)s[x.slot]=x.book_id;return s;};
 const title=async id=>(await client.from('whimsy_books').select('payload').eq('id',id).single()).data.payload.title;
 browser=await openBrowser(account,{shots});const b=browser;await b.viewport(1280,1100);
 await b.go('/collections','!!document.querySelector(".muse-upnext")','dashboard');await wait(900);
 check(await b.evaluate(()=>document.querySelectorAll('.muse-upnext-slot[data-empty]').length===3),'Up Next opens with three inviting empty slots');
 await b.evaluate(()=>document.querySelector('.muse-upnext').scrollIntoView({block:'center'}));await wait(300);await b.shoot('upnext-empty');
 // Choose slot 1 from To Be Read.
 await b.click('.muse-upnext-slot .muse-upnext-actions .button-ghost','Choose');await b.until(()=>!!document.querySelector('#up-next-picker[open]'),'picker');
 const tabs=await b.evaluate(()=>[...document.querySelectorAll('#up-next-picker .muse-upnext-sources button')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
 check(tabs.length===6&&/month/i.test(tabs[0])&&/Yearly/.test(tabs[1])&&/To Be Read/.test(tabs[2])&&/Entire Library/.test(tabs[3])&&/Surprise/.test(tabs[4])&&/new book/i.test(tabs[5]),'the picker offers month plan, yearly plan, To Be Read, Library, Surprise me and Add a new book');
 await b.shoot('upnext-picker');
 await b.click('#up-next-picker .muse-upnext-sources button','To Be Read');await wait(300);
 check(await b.evaluate(()=>!document.querySelector('#up-next-picker .muse-upnext-list').textContent.includes('Circe')&&document.querySelectorAll('#up-next-picker .muse-upnext-list li').length>=5),'To Be Read lists only waiting books');
 await b.evaluate(()=>[...document.querySelectorAll('#up-next-picker .muse-upnext-list button')].find(x=>/Alpha Tale/.test(x.textContent)).click());await wait(900);
 check((await slotsDb())[0]===tbr[0],'choosing a book fills the slot and saves it');
 // Empty source explains itself and offers alternatives (yearly plan is empty).
 await b.evaluate(()=>[...document.querySelectorAll('.muse-upnext-slot[data-empty] .button-ghost')][0].click());await b.until(()=>!!document.querySelector('#up-next-picker[open]'),'picker2');
 await b.click('#up-next-picker .muse-upnext-sources button','Yearly');await wait(300);
 check(await b.evaluate(()=>/Nothing to choose from here/.test(document.querySelector('#up-next-picker').textContent)&&document.querySelectorAll('#up-next-picker .muse-upnext-empty .button-ghost').length>=1),'an empty source explains why and offers another source');
 // Library, search, duplicates not offered.
 await b.click('#up-next-picker .muse-upnext-sources button','Entire Library');await wait(300);
 check(await b.evaluate(()=>!document.querySelector('#up-next-picker .muse-upnext-list').textContent.includes('Alpha Tale')),'a book already in Up Next is not offered for another slot');
 await b.evaluate(()=>{const i=document.querySelector('.muse-upnext-search input');i.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'gamma');i.dispatchEvent(new Event('input',{bubbles:true}));});await wait(300);
 check(await b.evaluate(()=>document.querySelectorAll('#up-next-picker .muse-upnext-list li').length===1),'the picker search filters the chosen source');
 await b.evaluate(()=>document.querySelector('#up-next-picker .muse-upnext-list button').click());await wait(900);
 check((await slotsDb())[1]===tbr[2],'a Library pick fills the next slot');
 // Roulette for slot 3 from this month's plan. Cancel keeps nothing.
 await b.click('.muse-upnext-slot[data-empty] .button-primary','Spin');await b.until(()=>!!document.querySelector('#reading-roulette[open]'),'roulette');await b.shoot('roulette-idle');
 check(await b.evaluate(()=>/2 books are in the wheel/.test(document.querySelector('#reading-roulette').textContent)),'the wheel counts eligible books: planned ones from this month, minus the finished book and those already queued');
 await b.click('#reading-roulette .muse-roulette-spin');await b.until(()=>document.querySelector('.muse-roulette')?.dataset.phase==='spinning','spinning');await b.shoot('roulette-spinning');
 await b.click('#reading-roulette .muse-roulette-actions .button-ghost','Skip');await b.until(()=>document.querySelector('.muse-roulette')?.dataset.phase==='result','result');await b.shoot('roulette-result');
 check((await slotsDb())[2]==='','a spin saves nothing until the book is kept');
 const first=await b.evaluate(()=>document.querySelector('.muse-roulette-result strong').textContent);
 await b.click('#reading-roulette .muse-roulette-actions .button-ghost','Spin again');await b.until(()=>document.querySelector('.muse-roulette')?.dataset.phase==='spinning'||document.querySelector('.muse-roulette')?.dataset.phase==='result','respin');
 await b.click('#reading-roulette .muse-roulette-actions .button-ghost','Skip').catch(()=>{});await b.until(()=>document.querySelector('.muse-roulette')?.dataset.phase==='result','result2');
 const second=await b.evaluate(()=>document.querySelector('.muse-roulette-result strong').textContent);
 check(first!==second,'Spin again moves on to a different book');
 await b.click('#reading-roulette .muse-roulette-actions .button-ghost','Cancel');await wait(300);
 check((await slotsDb())[2]===''&&await b.evaluate(()=>!document.querySelector('#reading-roulette[open]')),'Cancel closes the roulette and commits nothing');
 await b.click('.muse-upnext-slot[data-empty] .button-primary','Spin');await b.until(()=>!!document.querySelector('#reading-roulette[open]'),'roulette2');await b.click('#reading-roulette .muse-roulette-spin');
 await b.click('#reading-roulette .muse-roulette-actions .button-ghost','Skip').catch(()=>{});await b.until(()=>document.querySelector('.muse-roulette')?.dataset.phase==='result','result3');
 const kept=await b.evaluate(()=>document.querySelector('.muse-roulette-result strong').textContent);await b.click('#reading-roulette .muse-roulette-actions .button-primary','Keep this book');await wait(900);
 const s3=(await slotsDb())[2];check(s3&&(await title(s3))===kept&&[tbr[1],tbr[3]].includes(s3),'Keep this book saves the revealed book (from this month\'s plan) in the slot');
 await b.evaluate(()=>document.querySelector('.muse-upnext').scrollIntoView({block:'center'}));await wait(300);await b.shoot('upnext-full');
 // Reorder: move slot 1 right via the menu; then keyboard.
 await b.evaluate(()=>document.querySelector('.muse-upnext-more').click());await b.until(()=>!!document.querySelector('.muse-plan-menu'),'menu');await b.click('.muse-plan-menu .popover-choice','Move right');await wait(900);
 const after=await slotsDb();check(after[0]===tbr[2]&&after[1]===tbr[0],'Move right reorders the slots and saves');
 await b.evaluate(()=>document.querySelectorAll('.muse-upnext-handle')[1].focus());await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});await wait(900);
 check((await slotsDb())[0]===tbr[0],'arrow keys on the handle reorder without dragging');
 // Persistence across refresh.
 await b.go('/collections','document.querySelectorAll(".muse-upnext-slot").length===3','reload');await wait(900);
 check(JSON.stringify(await b.evaluate(()=>[...document.querySelectorAll('.muse-upnext-title')].map(x=>x.textContent)))===JSON.stringify([await title(tbr[0]),await title(tbr[2]),await title(s3)]),'the queue survives a refresh');
 // Replace and remove.
 await b.evaluate(()=>document.querySelectorAll('.muse-upnext-more')[2].click());await b.until(()=>!!document.querySelector('.muse-plan-menu'),'menu2');await b.click('.muse-plan-menu .popover-choice','Remove from Up Next');await wait(900);
 check((await slotsDb())[2]===''&&(await client.from('whimsy_books').select('id').eq('id',s3)).data.length===1,'Remove clears the slot and keeps the book in the Library');
 // Add a new book: the existing shelf match path (no duplicate record), then by hand.
 await b.click('.muse-upnext-slot[data-empty] .button-ghost','Choose');await b.until(()=>!!document.querySelector('#up-next-picker[open]'),'picker3');
 await b.click('#up-next-picker .muse-upnext-sources button','Add a new book');await wait(500);
 check(await b.evaluate(()=>!!document.querySelector('#up-next-picker input[type="search"], #up-next-picker input')&&/Add it by hand|Can’t find it/.test(document.querySelector('#up-next-picker').textContent)),'Add a new book reuses the existing search with an add-by-hand fallback');
 await b.shoot('upnext-new-book');
 await b.evaluate(()=>[...document.querySelectorAll('#up-next-picker a, #up-next-picker button')].find(x=>/by hand/i.test(x.textContent)).click());await b.until(()=>location.search.includes('upnext=2')&&location.search.includes('add=book'),'add by hand route');
 await b.until(()=>!!document.querySelector('#bookshelf-book-editor[open]'),'editor');await wait(500);
 await b.evaluate(()=>[...document.querySelectorAll('#bookshelf-book-editor a, #bookshelf-book-editor button')].find(x=>/by hand/i.test(x.textContent))?.click());await b.until(()=>!!document.querySelector('#bookshelf-book-editor input[required]'),'manual form');
 await b.evaluate(()=>{const t=document.querySelector('#bookshelf-book-editor input[required]');t.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(t,'Hand Made Book');t.dispatchEvent(new Event('input',{bubbles:true}));});await wait(200);
 await b.evaluate(()=>document.querySelector('#bookshelf-book-editor form').requestSubmit());await b.until(()=>/collections\/books\//.test(location.pathname),'saved and opened').catch(async e=>{console.log('CONSOLE',JSON.stringify(b.consoleErrors.slice(-3)));console.log('ERR',await b.evaluate(()=>document.querySelector('#bookshelf-book-editor .muse-books-error')?.textContent+' | '+location.href));throw e;});await wait(900);
 const made=(await client.from('whimsy_books').select('id,payload').eq('user_id',account.userId)).data.filter(r=>r.payload.title==='Hand Made Book');
 check(made.length===1&&made[0].payload.status==='planned'&&(await slotsDb())[2]===made[0].id,'a hand-made book is saved once, defaults to To Be Read, and lands in the chosen slot');
 check((await client.from('reading_plan_entries').select('id').eq('book_id',made[0].id)).data.length===0,'a new book is never added to a Reading Plan silently');
 // Starting a book: it leaves Up Next only once it is really Currently Reading; its plans stay.
 await b.go('/collections','document.querySelectorAll(".muse-upnext-slot").length===3','dash again');await wait(900);
 await client.rpc('add_reading_plan_books',{p_kind:'month',p_period:month,p_book_ids:[tbr[0]]});
 await b.evaluate(()=>[...document.querySelectorAll('.muse-upnext-slot')].find(s=>/Alpha Tale/.test(s.textContent)).querySelector('.button-primary').click());
 await b.until(()=>true,'started');await wait(2200);
 const alpha=(await client.from('whimsy_books').select('payload').eq('id',tbr[0]).single()).data.payload;
 check(alpha.status==='reading','Start reading uses the normal start flow and moves the book to Currently Reading');
 await b.go('/collections','document.querySelectorAll(".muse-upnext-slot").length===3','after start');await wait(1200);
 check(!(await slotsDb()).includes(tbr[0])&&await b.evaluate(()=>![...document.querySelectorAll('.muse-upnext-title')].some(x=>/Alpha Tale/.test(x.textContent))),'the started book has left Up Next');
 check((await client.from('reading_plan_entries').select('id').eq('book_id',tbr[0])).data.length>=1,'starting a book keeps its Reading Plan membership');
 // Reduced motion: no spinning phase, the result appears at once. Then phone.
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await b.go('/collections','document.querySelectorAll(".muse-upnext-slot").length===3','reduced');await wait(900);
 await b.evaluate(()=>[...document.querySelectorAll('.muse-upnext-slot[data-empty] .button-primary')][0]?.click());
 if(await b.evaluate(()=>!!document.querySelector('.muse-upnext-slot[data-empty]'))){await b.until(()=>!!document.querySelector('#reading-roulette[open]'),'roulette rm');await b.click('#reading-roulette .muse-roulette-spin');await wait(300);check(await b.evaluate(()=>document.querySelector('.muse-roulette').dataset.phase==='result'),'with reduced motion the roulette reveals immediately, with no spinning');await b.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));}
 await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await b.viewport(390,844,true);await b.go('/collections','document.querySelectorAll(".muse-upnext-slot").length===3','phone');await wait(1000);
 check(!(await b.overflow()),'no horizontal overflow on a phone');
 await b.evaluate(()=>document.querySelector('.muse-upnext').scrollIntoView({block:'start'}));await wait(400);await b.shoot('upnext-phone');
 check(b.errors.length===0,'no uncaught exceptions');
 console.log(`${passed} checks passed. ${shots}`);
}finally{await browser?.close();await removeAccount(account.userId);}
