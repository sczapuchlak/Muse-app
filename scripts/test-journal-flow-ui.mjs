// Journal conversation flow (Nov 25): a long back-and-forth never drags the page around, the finished reply keeps the
// row it streamed into (no rebuilt, re-animated row), settled messages don't re-render while a reply streams, scrolling
// yourself stops the page from following, and many turns in a row leave no errors.
// Requires a production build started with `JOURNAL_AI_PROVIDER=mock npx next start -p 3000` and local Supabase.
// Run: node scripts/test-journal-flow-ui.mjs
import assert from 'node:assert/strict';
import {admin,seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
import {load} from '../tests/helpers.mjs';

const P=load('lib/journal/persistence');
let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const account=await seedAccount();let ui;
try{
 const {client,userId}=account,today=new Date().toISOString().slice(0,10);
 const {error}=await admin.from('journal_ai_entitlements').insert({user_id:userId,enabled:true,per_minute:60});if(error)throw error;
 const state=await P.loadJournal(client,userId);
 const {journal,companion}=await P.setupJournal(client,userId,{journalName:'Everyday',presetKey:'thought-partner',prefs:state.prefs});
 // A long entry already in progress: forty long messages, so a reply streams under a real amount of conversation.
 const conv=await P.createConversation(client,userId,{id:crypto.randomUUID(),journalId:journal.id,companion,mode:'open',localDate:today,timeZone:'UTC',status:'active'});
 for(let i=0;i<40;i++)await P.addMessage(client,userId,{id:crypto.randomUUID(),conversationId:conv.id,body:`Message ${i+1}. ${'Today I kept thinking about how much has changed this year, and what I want to hold on to. '.repeat(4)}\n\nA second paragraph for message ${i+1}.`,localDate:today});

 ui=await openBrowser(account,{shots:process.env.JOURNAL_FLOW_SHOTS});
 const {evaluate,until,go,type,click,viewport,shoot,errors}=ui;
 const box='.mj-workspace .mj-composer textarea';
 await go('/journal','!!document.querySelector(".mj-workspace .mj-composer textarea")&&document.querySelectorAll(".mj-message").length>=40','journal workspace with the entry');
 await wait(1500);
 check(await evaluate(()=>document.querySelectorAll('.mj-message').length)===40,'the entry in progress opens with its forty messages');
 const assistants=()=>evaluate(()=>document.querySelectorAll('.mj-message[data-role=assistant]:not([data-streaming])').length);
 const scroller=()=>evaluate(()=>{const el=document.querySelector('.mj-ws-page');return /(auto|scroll)/.test(getComputedStyle(el).overflowY)?'page':'window';});
 const scrollTop=()=>evaluate(()=>{const el=document.querySelector('.mj-ws-page');return /(auto|scroll)/.test(getComputedStyle(el).overflowY)?el.scrollTop:window.scrollY;});

 /** Sends one message and watches the reply: whether settled rows changed while it streamed, and the streaming row. */
 async function turn(words,{scrollAway=false}={}){
  const before=await assistants();
  await type(box,words);await wait(150);await click('button.mj-send');
  await until(()=>!!document.querySelector('.mj-message[data-streaming]'),'the reply starts streaming',undefined,200);
  await evaluate(()=>{window.__row=document.querySelector('.mj-message[data-streaming]');window.__touched=0;
   window.__mo=new MutationObserver(list=>{for(const m of list){const li=(m.target.nodeType===1?m.target:m.target.parentElement)?.closest?.('.mj-message');if(li&&li!==window.__row&&!li.hasAttribute('data-pending'))window.__touched++;}});
   window.__mo.observe(document.querySelector('.mj-thread'),{subtree:true,childList:true,characterData:true,attributes:true});
   window.__long=0;try{window.__po=new PerformanceObserver(l=>{for(const e of l.getEntries())window.__long+=e.duration;});window.__po.observe({type:'longtask'});}catch{}});
  let held=null;
  if(scrollAway&&process.env.TRACE)await evaluate(()=>{window.__trace=[];const log=(what)=>window.__trace.push(what+' '+(new Error().stack.split('\n').slice(2,5).join(' | ')));for(const [o,k] of [[window,'scrollTo'],[window,'scrollBy'],[Element.prototype,'scrollIntoView'],[Element.prototype,'scrollTo'],[HTMLElement.prototype,'focus']]){const f=o[k];o[k]=function(...a){log(k+' '+JSON.stringify(a[0]??null));return f.apply(this,a);};}window.addEventListener('scroll',()=>window.__trace.push('scroll '+window.scrollY));});
  if(scrollAway){await wait(400);held=await evaluate(()=>{window.dispatchEvent(new WheelEvent('wheel',{deltaY:-200}));const el=document.querySelector('.mj-ws-page');const own=/(auto|scroll)/.test(getComputedStyle(el).overflowY);if(own)el.scrollTop=200;else window.scrollTo(0,200);return own?el.scrollTop:window.scrollY;});}
  await until(b=>document.querySelectorAll('.mj-message[data-role=assistant]:not([data-streaming])').length>b&&!document.querySelector('.mj-message[data-streaming]'),'the reply finishes',before,300);
  await wait(400);
  if(process.env.TRACE&&scrollAway)console.log((await evaluate(()=>window.__trace??[])).slice(0,40).join('\n'));
  return evaluate(held=>{window.__mo.disconnect();try{window.__po.disconnect();}catch{}const el=document.querySelector('.mj-ws-page'),own=/(auto|scroll)/.test(getComputedStyle(el).overflowY);
   const row=window.__row,top=row.getBoundingClientRect().top,frameTop=own?el.getBoundingClientRect().top:0;
   return {kept:row.isConnected&&!row.hasAttribute('data-streaming')&&row.dataset.role==='assistant',reanimating:row.getAnimations().some(a=>a.animationName==='mj-rise'&&a.playState==='running'),
    touched:window.__touched,long:Math.round(window.__long),replyTop:top-frameTop,scroll:own?el.scrollTop:window.scrollY,held,text:row.textContent.length};},held);
 }

 // ---- Computer: the conversation has its own scroll ----
 check(await scroller()==='page','on a computer the conversation scrolls inside the page');
 const long1=await turn('[long] Tell me more about that.');
 check(long1.kept,'the finished reply keeps the very row it streamed into (no rebuilt row)');
 check(!long1.reanimating,'the finished reply does not replay its entrance animation');
 check(long1.touched===0,`settled messages never re-render while a reply streams (${long1.touched} changes)`);
 check(long1.replyTop>=-2,`following stops once the reply's first line reaches the top (reply top ${Math.round(long1.replyTop)}px)`);
 check(long1.scroll>0,'the page did follow the reply down while there was room');
 console.log(`  long tasks during the long reply: ${long1.long}ms`);
 await shoot('journal-flow-desktop');
 const long2=await turn('[long] And then what happened?',{scrollAway:true});
 check(Math.abs(long2.scroll-long2.held)<=2,`scrolling yourself during a reply stops the page from moving (${long2.held} → ${long2.scroll})`);
 for(let i=0;i<6;i++){const r=await turn(`Quick note ${i+1}: still here.`);assert.ok(r.kept&&r.touched===0,`turn ${i+1}`);}
 check(await assistants()===8,'eight turns in a row, eight replies, each saved once');
 check(errors.length===0,`no page errors through eight turns${errors.length?`: ${errors[0]}`:''}`);

 // ---- Phone: the window scrolls ----
 await viewport(390,844,true);
 await go('/journal','!!document.querySelector(".mj-workspace .mj-composer textarea")&&document.querySelectorAll(".mj-message").length>=56','journal on a phone');
 await wait(1500);
 check(await scroller()==='window','on a phone the window scrolls');
 const phone=await turn('[long] One more thing on my phone.');
 check(phone.kept&&!phone.reanimating&&phone.touched===0,'on a phone the reply keeps its row and nothing else re-renders');
 check(phone.replyTop>=-2,`on a phone the page stops with the reply's first line in view (top ${Math.round(phone.replyTop)}px)`);
 const phone2=await turn('[long] And another.',{scrollAway:true});
 check(Math.abs(phone2.scroll-phone2.held)<=2,`on a phone, scrolling yourself stops the following (${phone2.held} → ${phone2.scroll})`);
 await shoot('journal-flow-phone');
 check(errors.length===0,`no page errors on the phone either${errors.length?`: ${errors[0]}`:''}`);
 console.log(`\n${passed} checks passed. Screenshots: ${ui.shots}`);
}catch(e){console.error(e);process.exitCode=1;}
finally{ui?.close();await removeAccount(account.userId);}
