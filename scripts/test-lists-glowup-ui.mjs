// Mindspace list page glow-up (Nov 25): hero art and a full icon tile with a corner clear, sections with a drag handle,
// an optional icon and description, and one ⋯ menu (no arrows or bin on every card). Requires a production build on
// :3000, local Supabase with migration 20270114000100. Run: node scripts/test-lists-glowup-ui.mjs
import assert from 'node:assert/strict';
import {admin,seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';

let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const account=await seedAccount();let ui;
try{
 const {client,userId}=account,listId=crypto.randomUUID(),names=['Living Room','Bedroom','Kitchen','Bathroom','Laundry & Cat Area','Closets & Storage'];
 let r=await client.from('lists').insert({id:listId,title:'Apartment Glow-Up',icon:'✦',accent:'primary',preset:'project'});if(r.error)throw r.error;
 const sections=names.map((title,position)=>({id:crypto.randomUUID(),list_id:listId,title,position}));
 r=await client.from('list_sections').insert(sections);if(r.error)throw r.error;
 r=await client.from('list_items').insert([{id:crypto.randomUUID(),list_id:listId,section_id:sections[0].id,title:'Fluff the cushions',position:0,completed_at:new Date().toISOString(),completed_on:new Date().toISOString().slice(0,10)},{id:crypto.randomUUID(),list_id:listId,section_id:sections[0].id,title:'Dust the shelves',position:1},{id:crypto.randomUUID(),list_id:listId,section_id:sections[2].id,title:'Wipe the counters',position:0}]);if(r.error)throw r.error;
 const order=async()=>((await client.from('list_sections').select('title,position').eq('list_id',listId).order('position')).data??[]).map(x=>x.title);

 ui=await openBrowser(account,{shots:process.env.LISTS_SHOTS});
 const {evaluate,until,go,click,viewport,shoot,send,errors}=ui;
 await viewport(1440,1000);
 const open=async()=>{await go(`/notes?view=lists&list=${listId}`,'document.querySelectorAll(".muse-list-section").length>=6','list');await wait(1500);};
 await open();
 // ---- Hero ----
 check(await evaluate(()=>document.querySelectorAll('.muse-list-hero .muse-list-art-star').length===6),'the header draws the list as a constellation, one star per section');
 check(await evaluate(()=>document.querySelector('.muse-list-hero').getBoundingClientRect().height<170),'the header is a compact band');
 const tile=await evaluate(()=>{const t=document.querySelector('.muse-list-icon .muse-emoji-trigger').getBoundingClientRect(),g=document.querySelector('.muse-list-icon .muse-emoji-trigger>*').getBoundingClientRect(),x=document.querySelector('.muse-list-icon .muse-emoji-clear').getBoundingClientRect();
  return {dx:Math.abs((t.left+t.width/2)-(g.left+g.width/2)),w:t.width,clearCorner:x.left>t.left+t.width-30&&x.top<t.top+10};});
 check(tile.dx<3,`the list icon sits centred in its tile (${tile.dx.toFixed(1)}px off)`);
 check(tile.w>=56,'the icon fills a proper tile');
 check(tile.clearCorner,'the clear × is a corner badge, not beside the icon');
 // ---- Sections: no per-card arrows or bin; a handle and a ⋯ menu ----
 check(await evaluate(()=>![...document.querySelectorAll('.muse-list-section-head button')].some(b=>/^(Move .* (up|down)|Delete )/.test(b.getAttribute('aria-label')??''))),'no up/down arrows or delete button on the cards');
 check(await evaluate(()=>document.querySelectorAll('.muse-list-section-grip').length===6&&document.querySelectorAll('.muse-list-section-more').length===6),'every section has a drag handle and a ⋯ menu');
 await shoot('lists-desktop',{full:true});
 // Description from the menu.
 await click('.muse-list-section-more','');await until(()=>!!document.querySelector('.muse-list-section-menu'),'menu');
 await shoot('lists-menu');
 await click('.muse-list-section-menu .popover-choice','Add a description');await until(()=>!!document.querySelector('input.muse-list-section-desc'),'description input');
 await evaluate(()=>{const t=document.querySelector('input.muse-list-section-desc');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(t,'Cozy corner, plants, the reading nook');t.dispatchEvent(new Event('input',{bubbles:true}));});await wait(200);
 await evaluate(()=>document.querySelector('input.muse-list-section-desc').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
 await wait(900);
 if(process.env.DEBUG)console.log('DEBUG',JSON.stringify(await evaluate(()=>({input:!!document.querySelector('input.muse-list-section-desc'),desc:document.querySelector('.muse-list-section-desc')?.textContent,err:document.body.textContent.match(/didn.t save[^.]*/)?.[0]??null}))),JSON.stringify(ui.consoleErrors?.slice(-3)),JSON.stringify((await client.from('list_sections').select('*').eq('id',sections[0].id).single())));
 check((await client.from('list_sections').select('description').eq('id',sections[0].id).single()).data?.description==='Cozy corner, plants, the reading nook','a section description saves');
 // Icon from the menu.
 await click('.muse-list-section-more','');await until(()=>!!document.querySelector('.muse-list-section-menu'),'menu again');
 await click('.muse-list-section-menu .popover-choice','Add an icon');await until(()=>!!document.querySelector('.muse-emoji-option'),'emoji picker');
 await evaluate(()=>document.querySelector('.muse-emoji-option').click());await wait(900);
 check(!!(await client.from('list_sections').select('icon').eq('id',sections[0].id).single()).data?.icon,'a section icon saves');
 check(await evaluate(()=>!!document.querySelector('.muse-list-section .muse-list-section-icon')),'the section shows its icon');
 check(await evaluate(()=>!document.querySelector('.muse-list-section-head .muse-list-chevron')),'no collapse arrow beside the section name');
 await click('.muse-list-section-more','');await until(()=>!!document.querySelector('.muse-list-section-menu'),'menu for collapse');
 await click('.muse-list-section-menu .popover-choice','Collapse section');await wait(700);
 check(await evaluate(()=>!document.querySelector('.muse-list-section .muse-list-quickadd')||document.querySelectorAll('.muse-list-section .muse-list-quickadd').length===5),'Collapse section in the menu folds the section away');
 await click('.muse-list-section-more','');await until(()=>!!document.querySelector('.muse-list-section-menu'),'menu for expand');
 await click('.muse-list-section-menu .popover-choice','Expand section');await wait(700);
 check(await evaluate(()=>document.querySelectorAll('.muse-list-section .muse-list-quickadd').length===6),'Expand section brings it back');
 // Move down from the menu.
 await click('.muse-list-section-more','');await until(()=>!!document.querySelector('.muse-list-section-menu'),'menu third');
 await click('.muse-list-section-menu .popover-choice','Move down');await wait(900);
 check(JSON.stringify((await order()).slice(0,2))==='["Bedroom","Living Room"]','Move down in the menu reorders sections');
 // Drag with the mouse: Kitchen's handle onto the first card.
 const pt=await evaluate(()=>{const cards=[...document.querySelectorAll('.muse-list-section')],g=cards[2].querySelector('.muse-list-section-grip').getBoundingClientRect(),t=cards[0].getBoundingClientRect();return {gx:g.left+g.width/2,gy:g.top+g.height/2,tx:t.left+t.width/2,ty:t.top+t.height/2};});
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pt.gx,y:pt.gy});await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pt.gx,y:pt.gy,button:'left',buttons:1,clickCount:1});
 for(let i=1;i<=8;i++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pt.gx+(pt.tx-pt.gx)*i/8,y:pt.gy+(pt.ty-pt.gy)*i/8,button:'left',buttons:1});await wait(30);}
 check(await evaluate(()=>!!document.querySelector('.muse-list-section[data-dragging]')&&!!document.querySelector('.muse-list-section[data-over]')),'dragging lifts the card and marks where it will land');
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pt.tx,y:pt.ty,button:'left',buttons:0,clickCount:1});await wait(1000);
 check((await order())[0]==='Kitchen','dragging a section onto another moves it there (saved)');
 // ---- Phone: touch drag works too ----
 await viewport(390,844,true);await open();
 check(!(await ui.overflow()),'no sideways scrolling on a phone');
 const tp=await evaluate(()=>{const cards=[...document.querySelectorAll('.muse-list-section')],g=cards[1].querySelector('.muse-list-section-grip');g.scrollIntoView({block:'center'});const a=g.getBoundingClientRect(),t=cards[0].getBoundingClientRect();return {gx:a.left+a.width/2,gy:a.top+a.height/2,tx:t.left+t.width/2,ty:t.top+20};});
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tp.gx,y:tp.gy}]});
 for(let i=1;i<=8;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tp.gx+(tp.tx-tp.gx)*i/8,y:tp.gy+(tp.ty-tp.gy)*i/8}]});await wait(30);}
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(1000);
 const phoneOrder=await order();
 check(phoneOrder[0]==='Bedroom','a section can be dragged by touch on a phone');
 await shoot('lists-phone',{full:true});
 // ---- A dark theme ----
 await viewport(1440,1000);for(const theme of ['astral','bubblegum-baby']){await evaluate(t=>localStorage.setItem('muse.theme',t),theme);await open();await wait(2000);
  check(await evaluate(()=>{const c=getComputedStyle(document.querySelector('.muse-list-hero .muse-list-title')).color.match(/[\d.]+/g).map(Number),bg=getComputedStyle(document.querySelector('.muse-list-hero')).backgroundColor;return (c[0]+c[1]+c[2])/3<140;}),`${theme}: the list title is dark ink on its pale card`);
  await shoot(`lists-${theme}`);}
 check(errors.length===0,`no page errors${errors.length?`: ${errors[0]}`:''}`);
 console.log(`\n${passed} checks passed. Screenshots: ${ui.shots}`);
}catch(e){console.error(e);process.exitCode=1;}
finally{ui?.close();await removeAccount(account.userId);}
