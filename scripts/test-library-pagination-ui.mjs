// Authenticated LOCAL browser QA for Library pagination: 1,000+ books, desktop and phone, every theme.
// Requires local Supabase and a running Muse (`next start` or `next dev`) on BOOKS_UI_ORIGIN (default :3000).
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait,sql} from './qa/books-harness.mjs';
import {seedLargeLibrary,longTitle,needleTitle} from './qa/seed-large-library.mjs';

const COUNT=Number(process.env.LIBRARY_QA_BOOKS??1040),shots=process.env.LIBRARY_QA_SHOTS??'/private/tmp/muse143-shots';
const themes=(process.env.LIBRARY_QA_THEMES??'astral,solstice,nightbloom,bubblegum-baby,prism-noir,hot-summer-nights').split(',');
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const account=await seedAccount();let browser;
try{
 const books=seedLargeLibrary(account.userId,COUNT);
 const total=Number(sql(`select count(*) from public.whimsy_books where user_id='${account.userId}'`));
 console.log(`Seeded ${total} books`);check(total>=1000,`library has at least 1,000 books (${total})`);
 browser=await openBrowser(account,{shots});const b=browser;
 const cards=()=>b.evaluate(()=>document.querySelectorAll('.muse-collections-library-page .muse-collections-card').length);
 const summary=()=>b.text('.muse-pagination[data-position="top"] .muse-pagination-summary');
 const firstTitle=()=>b.text('.muse-collections-library-page .muse-collections-card .muse-card-title');
 const ready='document.querySelectorAll(".muse-collections-library-page .muse-collections-card").length>0';
 const library=(query='')=>b.go(`/collections?mode=library&kind=book${query}`,ready,'library '+query);
 const libraryTop=()=>b.evaluate(()=>{document.querySelector('.muse-collections-library-page')?.scrollIntoView({block:'start'});window.scrollBy(0,-8);});
 const shootLibrary=async name=>{await libraryTop();return b.shoot(name);};
 const chooseMenu=async(label,option)=>{await b.click(`button.muse-choice-trigger[aria-label^="${label}"]`);await b.until(()=>!!document.querySelector('.popover-choice'),'menu open');await b.click('.popover-choice',option);await wait(300);};

 // Desktop ---------------------------------------------------------------------------------------------------------
 await b.viewport(1280,900);
 const t0=Date.now();await library();const firstPaint=Date.now()-t0;console.log(`first page ready in ${firstPaint}ms`);
 check(await cards()===24,'default page renders exactly 24 cards');
 check(/1–24 of 1,0\d\d books/.test(await summary())&&/Page 1 of 4\d/.test(await summary()),`summary shows range, total and page: ${await summary()}`);
 check(await b.evaluate(()=>document.querySelectorAll('.muse-pagination').length)===2,'controls render at the top and the bottom');
 const dom=await b.evaluate(()=>document.getElementsByTagName('*').length);console.log(`DOM nodes on page 1: ${dom}`);check(dom<4000,`DOM stays small (${dom} nodes)`);
 check(await b.evaluate(()=>!document.documentElement.textContent.includes('Show more')),'old Show more button is gone');
 check(!(await b.overflow()),'no horizontal overflow at 1280');
 await shootLibrary('desktop-page-1');

 // Lazy covers
 const imgs=await b.evaluate(()=>({total:document.querySelectorAll('.muse-collections-library-page .muse-book-cover img').length,lazy:document.querySelectorAll('.muse-collections-library-page .muse-book-cover img[loading="lazy"]').length,sized:[...document.querySelectorAll('.muse-collections-library-page .muse-book-cover img')].every(i=>i.getAttribute('width')&&i.getAttribute('height'))}));
 check(imgs.total>0&&imgs.total<=24&&imgs.lazy===imgs.total&&imgs.sized,`covers are lazy and sized: ${JSON.stringify(imgs)}`);

 await b.evaluate(()=>window.scrollTo(0,0));await b.shoot('desktop-reading-desk');
 const desk=await b.evaluate(()=>{const cs=[...document.querySelectorAll('.muse-desk-tile')];return {n:cs.length,tallest:Math.max(...cs.map(c=>Math.round(c.getBoundingClientRect().height))),brokenTitles:cs.filter(c=>{const t=c.querySelector('.muse-desk-tile-open');return !t||t.scrollWidth>t.clientWidth+1&&getComputedStyle(t).textOverflow!=='ellipsis';}).length};});
 console.log('reading desk cards',JSON.stringify(desk));check(desk.n>0&&desk.tallest<=230&&desk.brokenTitles===0,`Reading Desk cards stay compact with word-wrapped titles (${desk.tallest}px tall)`);
 // Page sizes
 for(const size of [12,48,96,24]){await chooseMenu('Library per page, top',`${size} per page`);check(await cards()===size,`page size ${size} renders ${size} cards`);}
 // Next / previous / numbered
 const p1=await firstTitle();
 await b.click('.muse-pagination[data-position="bottom"] button[aria-label="Next page"]');await b.until(()=>/Page 2 of/.test(document.querySelector('.muse-pagination-summary').textContent),'page 2');
 check(/25–48 of/.test(await summary()),`page 2 range: ${await summary()}`);check((await firstTitle())!==p1,'page 2 shows different cards');
 check((await b.evaluate(()=>location.search)).includes('page=2'),'page is in the URL');
 await b.click('.muse-pagination[data-position="top"] button[aria-label="Page 3"]');await b.until(()=>/Page 3 of/.test(document.querySelector('.muse-pagination-summary').textContent),'page 3 via number');
 await b.click('.muse-pagination[data-position="top"] button[aria-label="Previous page"]');await b.until(()=>/Page 2 of/.test(document.querySelector('.muse-pagination-summary').textContent),'back to page 2');
 // Last page is partial
 const lastPage=Math.ceil(total/24);await library(`&page=${lastPage}`);
 check(await cards()===total-(lastPage-1)*24,`last page (${lastPage}) shows the remaining ${total-(lastPage-1)*24} cards`);
 check(await b.evaluate(()=>document.querySelector('.muse-pagination button[aria-label="Next page"]').disabled),'Next is disabled on the last page');
 await shootLibrary('desktop-last-page');
 await library('&page=9999');check(await cards()>0&&/Page \d+ of/.test(await summary()),'an out-of-range page is clamped to a real page');
 await library('&page=abc&size=7');check(await cards()===24&&/Page 1 of/.test(await summary()),'bad page and size values fall back to 1 and 24');

 // Search, filters, sort span the entire library; page resets to 1
 await library('&page=5');check(/Page 5 of/.test(await summary()),'deep link to page 5 loads page 5');
 await b.type('.muse-search input, input[type="search"]',needleTitle.split(' ')[0]);await b.until(()=>/of 1 book/.test(document.querySelector('.muse-pagination-summary')?.textContent??''),'search result');
 check((await firstTitle()).includes('Quillfeather'),'search finds a book that was never on a visible page');check(/Page 1 of 1/.test(await summary()),'search resets to page 1');
 await b.type('.muse-search input, input[type="search"]','');await b.until(()=>/of 1,0\d\d books/.test(document.querySelector('.muse-pagination-summary')?.textContent??''),'search cleared');
 await library('&page=3');await chooseMenu('Collection status','Finished');
 check(/Page 1 of/.test(await summary())&&new RegExp(`of ${books.filter(x=>x.status==='finished').length+2} books`).test(await summary()),`status filter resets to page 1 and counts the whole library: ${await summary()}`);
 check(await b.evaluate(()=>[...document.querySelectorAll('.muse-collections-library-page .muse-card-status-badge')].every(n=>/Finished/.test(n.getAttribute('aria-label')))),'every card matches the status filter');
 await library('&page=3');await chooseMenu('Collection sort','Title');
 const expected=[...books.map(x=>x.title),'Heir of Fire','A Court of Wings and Ruin','A Court of Thorns and Roses','Circe','My grandmother’s recipe notebook'].sort((x,y)=>x.localeCompare(y))[0];
 check(/Page 1 of/.test(await summary())&&(await firstTitle())===expected,`sort by title reorders the entire library (first: ${await firstTitle()})`);

 // Long titles and missing metadata keep card heights consistent
 await library('&sort=recent&size=96&page=11');
 const geometry=await b.evaluate(()=>{const cs=[...document.querySelectorAll('.muse-collections-library-page .muse-collections-card')].map(c=>({h:Math.round(c.getBoundingClientRect().height),t:c.querySelector('.muse-card-title').textContent,over:c.scrollWidth>c.clientWidth+1}));return {n:cs.length,heights:[...new Set(cs.map(c=>c.h))],over:cs.some(c=>c.over)};});
 console.log('card heights',JSON.stringify(geometry));
 const tallestSpread=Math.max(...geometry.heights)-Math.min(...geometry.heights);
 check(geometry.n>0,'last 96-book page renders');
 await library('&sort=oldest&size=12&page=1');
 const awkward=await b.evaluate(({longTitle})=>{const cs=[...document.querySelectorAll('.muse-collections-library-page .muse-collections-card')];const h=cs.map(c=>Math.round(c.getBoundingClientRect().height));const long=cs.find(c=>c.querySelector('.muse-card-title').textContent===longTitle);return {titles:cs.map(c=>c.querySelector('.muse-card-title').textContent.slice(0,24)),heights:h,spread:Math.max(...h)-Math.min(...h),longClamped:long?long.querySelector('.muse-card-title').scrollHeight>long.querySelector('.muse-card-title').clientHeight:null,overflow:cs.some(c=>c.scrollWidth>c.clientWidth+1)};},{longTitle});
 console.log('awkward page',JSON.stringify(awkward));
 check(awkward.longClamped===true,'the very long title is visually clamped');check(awkward.spread<=1,`all cards on the awkward page share one height (spread ${awkward.spread}px)`);check(!awkward.overflow,'no card text overflows its card');
 check(tallestSpread<=1,`cards share one height across a 96-card page (spread ${tallestSpread}px)`);
 await shootLibrary('desktop-awkward-titles');

 // Book Detail round trip: page, filters, sort and scroll are restored
 await library('&sort=title&size=48&page=3&status=planned');
 const before={first:await firstTitle(),summary:await summary()};
 await b.evaluate(()=>window.scrollTo(0,1400));await wait(300);const scrollBefore=await b.evaluate(()=>Math.round(window.scrollY));
 const openedTitle=await b.evaluate(()=>{const c=[...document.querySelectorAll('.muse-collections-library-page .muse-collections-card')].find(x=>x.getBoundingClientRect().top>200&&x.getBoundingClientRect().top<800);const t=c.querySelector('.muse-card-title').textContent;c.click();return t;});
 await b.until(()=>location.pathname.startsWith('/collections/books/'),'book detail opened');await b.until(()=>!!document.querySelector('main h1, main h2'),'detail rendered');
 await b.shoot('desktop-book-detail');
 await b.send('Page.navigate',{url:'about:blank'}).catch(()=>{});await b.go('/collections?kind=book&mode=library',ready,'reset');
 // Fresh history entry above, then do the real round trip with browser Back
 await library('&sort=title&size=48&page=3&status=planned');await b.evaluate(()=>window.scrollTo(0,1400));await wait(300);
 await b.evaluate(()=>{const c=[...document.querySelectorAll('.muse-collections-library-page .muse-collections-card')].find(x=>x.getBoundingClientRect().top>200&&x.getBoundingClientRect().top<800);c.click();});
 await b.until(()=>location.pathname.startsWith('/collections/books/'),'detail again');await wait(800);
 await b.evaluate(()=>history.back());await b.until(new Function(`return location.pathname==='/collections'&&${ready}`),'back to library');await wait(1200);
 const after={first:await firstTitle(),summary:await summary(),search:await b.evaluate(()=>location.search),scroll:await b.evaluate(()=>Math.round(window.scrollY))};
 console.log('round trip',JSON.stringify({before,after,scrollBefore}));
 check(after.first===before.first&&after.summary===before.summary,'Back restores the same page of the same filtered, sorted list');
 check(/page=3/.test(after.search)&&/size=48/.test(after.search)&&/sort=title/.test(after.search)&&/status=planned/.test(after.search),`URL keeps page, size, sort and filter: ${after.search}`);
 check(Math.abs(after.scroll-scrollBefore)<=120,`scroll position restored (${scrollBefore} → ${after.scroll})`);
 void openedTitle;

 // Board mode and Series
 await b.go('/collections?mode=board&kind=book','document.querySelectorAll(".muse-collections-board .muse-collections-card").length>0','board');
 const board=await b.evaluate(()=>({cards:document.querySelectorAll('.muse-collections-card').length,controls:document.querySelectorAll('.muse-pagination').length}));
 console.log('board',JSON.stringify(board));check(board.cards<=24+7*6+12,`Board mode never mounts the whole library (${board.cards} cards)`);
 await b.shoot('desktop-board');

 // Themes -----------------------------------------------------------------------------------------------------------
 await library('&sort=recent&page=2');
 for(const theme of themes){await b.evaluate(t=>{document.documentElement.setAttribute('data-theme',t);},theme);await wait(400);await shootLibrary(`theme-${theme}-top`);await b.evaluate(()=>document.querySelector('.muse-pagination[data-position="bottom"]').scrollIntoView({block:'center'}));await wait(200);await b.shoot(`theme-${theme}-bottom`);}
 console.log(`themes captured: ${themes.join(', ')}`);

 // Series pagination and clean console
 await b.go('/collections?view=series','!!document.querySelector(".muse-media-library, .muse-collections-library-page, .muse-collections-empty")','series');await b.shoot('desktop-series');
 check(b.errors.length===0,`no uncaught exceptions: ${b.errors.join(' | ').slice(0,200)}`);
 console.log('console errors (informational):',[...new Set(b.consoleErrors)].filter(m=>!/covers\.muse-qa\.test|ERR_NAME_NOT_RESOLVED|Failed to load resource/.test(m)).slice(0,5));
 console.log(`\n${passed} checks passed. Screenshots: ${b.shots}`);
}finally{browser?.close();await removeAccount(account.userId);}
