// Phone and tablet QA for Library pagination: a fresh browser opened at phone width against 1,000+ books.
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';
import {seedLargeLibrary} from './qa/seed-large-library.mjs';
const COUNT=Number(process.env.LIBRARY_QA_BOOKS??1040),shots=process.env.LIBRARY_QA_SHOTS??'/private/tmp/muse143-shots';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
try{
 seedLargeLibrary(account.userId,COUNT);browser=await openBrowser(account,{shots});const b=browser;
 const cards=()=>b.evaluate(()=>document.querySelectorAll('.muse-collections-library-page .muse-collections-card').length);
 const ready='document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0';
 const library=(query='')=>b.go(`/collections?mode=library&kind=book${query}`,ready,'library '+query);
 const libraryTop=()=>b.evaluate(()=>{document.querySelector('.muse-collections-library-page')?.scrollIntoView({block:'start'});window.scrollBy(0,-8);});
 const shootLibrary=async name=>{await libraryTop();return b.shoot(name);};
 const summary=()=>b.text('.muse-pagination[data-position="top"] .muse-pagination-summary');
 await b.viewport(390,844,true);await library('&page=2');check(/Page 2 of/.test(await summary()),'phone deep link to page 2 loads');
 check(await cards()===24,'phone renders 24 cards');check(!(await b.overflow()),'no horizontal overflow at 390');
 const phone=await b.evaluate(()=>{const bar=document.querySelector('.muse-pagination[data-position="top"]'),r=bar.getBoundingClientRect(),buttons=[...bar.querySelectorAll('button')].filter(x=>x.offsetParent).map(x=>x.getBoundingClientRect().height);return {width:Math.round(r.width),minTarget:Math.min(...buttons),visibleNumbers:[...bar.querySelectorAll('.muse-pagination-number')].filter(x=>x.offsetParent).length};});
 console.log('phone controls',JSON.stringify(phone));check(phone.minTarget>=36,`phone controls keep 36px+ targets (${phone.minTarget}px)`);
 await shootLibrary('phone-top');await b.evaluate(()=>window.scrollTo(0,2000));await wait(300);await b.shoot('phone-mid');
 await b.evaluate(()=>document.querySelector('.muse-pagination[data-position="bottom"]').scrollIntoView({block:'center'}));await wait(300);await b.shoot('phone-bottom');
 await library('&sort=oldest&size=12&page=1');
 const phoneCards=await b.evaluate(()=>{const cs=[...document.querySelectorAll('.muse-collections-library-page .muse-collections-card')].map(c=>Math.round(c.getBoundingClientRect().height));return {spread:Math.max(...cs)-Math.min(...cs)};});
 check(phoneCards.spread<=1,`phone cards share one height (spread ${phoneCards.spread}px)`);await shootLibrary('phone-awkward-titles');
 await b.viewport(820,1000,true);await library('&page=2');check(!(await b.overflow()),'no horizontal overflow at 820 tablet');await shootLibrary('tablet-page-2');


 console.log(`\n${passed} phone/tablet checks passed. Screenshots: ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
