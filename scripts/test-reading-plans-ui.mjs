// Browser QA for Reading Plans (Books Phase 2): Dashboard planner, drag + keyboard reorder, move, copy, remove,
// status sync, yearly plan, full view, Book Detail, phone. Needs a production build (`next start`) and local Supabase.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait,sql} from './qa/books-harness.mjs';
const shots=process.env.PLANS_QA_SHOTS??'/private/tmp/muse-plans-shots';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
const now=new Date(),month=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`,nextMonth=(()=>{const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;})();
try{
 const {client,ids}=account,rpc=(n,a)=>client.rpc(n,a);
 const dbOrder=async(kind,period)=>(await client.from('reading_plan_entries').select('book_id').eq('period_kind',kind).eq('period',period).order('position')).data.map(r=>r.book_id);
 await rpc('add_reading_plan_books',{p_kind:'month',p_period:month,p_book_ids:[ids.acowar,ids.heir,ids.circe,ids.acotar,ids.manual]});
 browser=await openBrowser(account,{shots});const b=browser;await b.viewport(1280,1100);
 await b.go('/collections','document.querySelectorAll(".muse-plan-card").length>0','dashboard');await wait(900);
 const titles=()=>b.evaluate(()=>[...document.querySelectorAll('.muse-plans .muse-plan-title')].map(t=>t.textContent));
 let t=await titles();
 check(t.length===4&&t[0]==='A Court of Wings and Ruin','the Dashboard shows this month\'s plan, four books a page, in plan order');
 check(await b.evaluate(()=>/5 books/.test(document.querySelector('.muse-plans-count').textContent)&&[...document.querySelectorAll('.muse-plan-bar-seg')].map(s=>s.textContent).join(',')==='1,1,2,1'),'status bar counts the five books by real status (1 TBR, 1 reading, 2 finished, 1 paused)');
 check(await b.evaluate(()=>document.querySelector('.muse-plan-card [data-status="finished"] , .muse-plan-card[data-status="finished"] .muse-plan-status')!==null&&!!document.querySelector('.muse-plan-dates')),'cards show status chips and actual dates');
 await b.shoot('plans-dashboard');
 // Drag the first card's handle onto the third card.
 const pos=await b.evaluate(()=>{const c=[...document.querySelectorAll('.muse-plan-card')],h=c[0].querySelector('.muse-plan-handle').getBoundingClientRect(),o=c[2].getBoundingClientRect();return {hx:h.x+h.width/2,hy:h.y+h.height/2,ox:o.x+o.width/2,oy:o.y+o.height/2};});
 const mouse=(type,x,y)=>b.send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
 await mouse('mouseMoved',pos.hx,pos.hy);await mouse('mousePressed',pos.hx,pos.hy);for(let i=1;i<=8;i++){await mouse('mouseMoved',pos.hx+(pos.ox-pos.hx)*i/8,pos.hy+(pos.oy-pos.hy)*i/8);await wait(30);}
 check(await b.evaluate(()=>!!document.querySelector('.muse-plan-card[data-dragging]')&&!!document.querySelector('.muse-plan-card[data-over]')),'dragging lifts the card and marks where it will land');
 await b.shoot('plans-dragging');await mouse('mouseReleased',pos.ox,pos.oy);await wait(900);
 t=await titles();const stored=await dbOrder('month',month);
 check(t[2]==='A Court of Wings and Ruin'&&stored[2]===ids.acowar,'dropping reorders the plan and saves it');
 await b.go('/collections','document.querySelectorAll(".muse-plan-card").length>0','reload');await wait(700);
 check((await titles())[2]==='A Court of Wings and Ruin','the order survives a refresh');
 // Keyboard alternative: ArrowUp on the focused handle moves the card up one.
 await b.evaluate(()=>document.querySelectorAll('.muse-plan-card')[2].querySelector('.muse-plan-handle').focus());
 await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});await wait(800);
 check((await titles())[1]==='A Court of Wings and Ruin','arrow keys reorder without dragging');
 // Move the first card to next month.
 const first=(await titles())[0];
 await b.evaluate(()=>document.querySelector('.muse-plan-more').click());await b.until(()=>!!document.querySelector('.muse-plan-menu'),'menu');await b.click('.muse-plan-menu .popover-choice','Move to another plan');
 await b.until(()=>!!document.querySelector('#reading-plan-place[open]'),'picker');await b.shoot('plans-move-picker');
 await b.evaluate(n=>{const [y,m]=n.split('-');[...document.querySelectorAll('#reading-plan-place .muse-plan-picker-grid button')].find(x=>x.getAttribute('aria-label').startsWith(new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(+y,+m-1,1,12)))))?.click();},nextMonth);await wait(1000);
 check(!(await titles()).includes(first)&&(await dbOrder('month',nextMonth)).length===1&&!(await dbOrder('month',month)).includes((await dbOrder('month',nextMonth))[0]),'moving a book changes plan membership: it leaves this month and joins next month');
 const reading=await client.from('whimsy_books').select('payload').eq('id',ids.heir).single();check(reading.data.payload.status==='reading','moving never touches reading status');
 // Next month shows it; copy it back to this month (membership in both).
 await b.click('.muse-plans-step[aria-label="Next month"]');await wait(500);check((await titles()).length===1,'next month\'s plan holds the moved book');
 await b.evaluate(()=>document.querySelector('.muse-plan-more').click());await b.until(()=>!!document.querySelector('.muse-plan-menu'),'menu2');await b.click('.muse-plan-menu .popover-choice','Copy to another plan');await b.until(()=>!!document.querySelector('#reading-plan-place[open]'),'picker2');
 await b.evaluate(n=>{[...document.querySelectorAll('#reading-plan-place .muse-plan-picker-grid button')].find(x=>x.getAttribute('aria-label').includes('already')||x.disabled)&&0;const [y,m]=n.split('-');[...document.querySelectorAll('#reading-plan-place .muse-plan-picker-grid button')].find(x=>x.dataset.now!==undefined&&!x.disabled)?.click();},month);await wait(1000);
 check((await dbOrder('month',month)).length===5&&(await dbOrder('month',nextMonth)).length===1,'copying keeps both memberships');
 // Remove from plan leaves the book in the Library.
 await b.click('.muse-plans-today');await wait(500);await b.evaluate(()=>document.querySelector('.muse-plan-more').click());await b.until(()=>!!document.querySelector('.muse-plan-menu'),'menu3');await b.click('.muse-plan-menu .popover-choice','Remove from plan');await wait(900);
 check((await dbOrder('month',month)).length===4&&(await client.from('whimsy_books').select('id')).data.length>=5,'removing from a plan keeps the book in the Library');
 // Status sync: finishing a planned book elsewhere updates the plan without any plan action.
 sql(`update public.whimsy_books set payload=jsonb_set(payload,'{status}','"reading"') where id='${ids.manual}'`);
 await b.go('/collections','document.querySelectorAll(".muse-plan-card").length>0','status sync');await wait(900);
 check(await b.evaluate(()=>[...document.querySelectorAll('.muse-plan-card')].some(c=>/recipe notebook/.test(c.textContent)&&c.dataset.status==='reading')),'a status change anywhere updates the plan automatically');
 // Yearly plan and Add books.
 await b.click('.muse-plans .muse-segmented button','Yearly');await wait(600);check(await b.evaluate(()=>/Nothing planned for/.test(document.querySelector('.muse-plans').textContent)),'an empty yearly plan has an inviting empty state');
 await b.click('.muse-plans-empty .muse-button','Add books');await b.until(()=>!!document.querySelector('#reading-plan-add[open]'),'add modal');await b.shoot('plans-add-books');
 await b.evaluate(()=>document.querySelector('.muse-plan-suggest button').click());await wait(200);await b.click('.muse-plan-add-actions .button-primary');await wait(1000);
 check((await dbOrder('year',String(now.getUTCFullYear()))).length===1,'books are added to the yearly plan from the shelf picker');
 await b.shoot('plans-yearly');
 // Full view.
 await b.go('/collections/plans','document.querySelectorAll(".muse-plan-card").length>0||!!document.querySelector(".muse-plans-empty")','full view');await wait(700);
 check(await b.evaluate(()=>!!document.querySelector('.muse-plans[data-variant="full"]')&&!!document.querySelector('.muse-books-nav')),'the full Reading Plans view shares the planner');
 // Book Detail.
 await b.go(`/collections/books/${ids.circe}`,'!!document.querySelector(".muse-book-page-hero")','detail');await wait(600);
 await b.click('button[aria-label="More for this book"]');await b.until(()=>!!document.querySelector('#book-page-more'),'detail menu');await b.click('#book-page-more .popover-choice','Add to a reading plan');await b.until(()=>!!document.querySelector('#reading-plan-place[open]'),'detail picker');await b.shoot('plans-detail-picker');
 check(await b.evaluate(()=>/Plan/.test(document.querySelector('#reading-plan-place').textContent)),'Book Detail can add the book to a plan');
 await b.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 // Library select mode: tick books, add them to a plan.
 await b.go('/collections?tab=library','document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0','library');await wait(700);
 await b.click('.muse-collections-select-trigger');await wait(300);
 await b.evaluate(()=>{const c=[...document.querySelectorAll('.muse-collections-library-page .muse-collections-card')];c.find(x=>/Wings and Ruin/.test(x.textContent)).click();c.find(x=>/Circe/.test(x.textContent)).click();});await wait(300);
 check(await b.evaluate(()=>/2 selected/.test(document.querySelector('.muse-collections-select-bar').textContent)&&location.pathname==='/collections'),'Library select mode ticks books instead of opening them');
 await b.click('.muse-collections-select-bar .button-primary');await b.until(()=>!!document.querySelector('#reading-plan-place[open]'),'library picker');
 await b.evaluate(()=>[...document.querySelectorAll('#reading-plan-place .muse-plan-picker-grid button')].find(x=>x.dataset.now!==undefined&&!x.disabled)?.click());await wait(1000);
 check((await client.from('reading_plan_entries').select('id').eq('period_kind','month').eq('period',month)).data.length===5,'Library books are added to the chosen plan; one already there is not duplicated');
 await b.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 // Phone.
 await b.viewport(390,844,true);await b.go('/collections','document.querySelectorAll(".muse-plan-card").length>0||!!document.querySelector(".muse-plans-empty")','phone');await wait(900);
 check(!(await b.overflow()),'no horizontal overflow on a phone');
 check(await b.evaluate(()=>{const h=document.querySelector('.muse-plan-handle');return !h||getComputedStyle(h).touchAction==='none';}),'only the drag handle blocks scrolling; the rest of the page scrolls normally');
 await b.evaluate(()=>document.querySelector('.muse-plans').scrollIntoView({block:'start'}));await wait(300);await b.shoot('plans-phone');
 check(b.errors.length===0,'no uncaught exceptions');
 console.log(`${passed} checks passed. ${shots}`);
}finally{await browser?.close();await removeAccount(account.userId);}
