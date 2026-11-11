// Visual QA for Book Detail (#135): reading, finished and no-synopsis books in several themes, desktop and phone.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
const shots=process.env.DETAIL_QA_SHOTS??'/private/tmp/muse-detail-shots',themes=(process.env.DETAIL_QA_THEMES??'astral,nightbloom,solstice').split(',');
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
try{
 browser=await openBrowser(account,{shots});const b=browser,{ids}=account;
 const open=async(id,name)=>{await b.go(`/collections/books/${id}`,'!!document.querySelector(".muse-book-page-hero")&&!!document.querySelector(".muse-book-panel")',name);await wait(900);};
 await b.viewport(1280,1000);
 for(const [key,id] of Object.entries({heir:ids.heir,acotar:ids.acotar,manual:ids.manual})){
  await open(id,key);
  check(!(await b.overflow()),`${key}: no horizontal overflow on desktop`);
  for(const t of themes){await b.evaluate(x=>document.documentElement.setAttribute('data-theme',x),t);await wait(350);await b.shoot(`${key}-${t}`);}
 }
 const meter=await b.evaluate(()=>{const m=document.querySelector('.muse-book-panel-meter');return m?getComputedStyle(m).height:null;});
 check(meter==='14px','progress meter uses the thicker liquid style');
 await b.viewport(390,844,true);
 for(const [key,id] of Object.entries({heir:ids.heir,acotar:ids.acotar})){await open(id,key+' phone');check(!(await b.overflow()),`${key}: no horizontal overflow on phone`);await b.shoot(`${key}-phone`);await b.evaluate(()=>window.scrollTo(0,1200));await wait(300);await b.shoot(`${key}-phone-lower`);}
 check(b.errors.length===0,`no uncaught exceptions ${b.errors.join('|').slice(0,200)}`);
 console.log(`\n${passed} checks passed. ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
