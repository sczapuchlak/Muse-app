// Authenticated local routing check with a disposable account. No hosted writes.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';

loadEnvFile('.env.local');
const origin=process.env.WHIMSY_TEST_ORIGIN??'http://localhost:3000';
for(const url of [origin,process.env.NEXT_PUBLIC_SUPABASE_URL])assert.ok(['localhost','127.0.0.1'].includes(new URL(url).hostname),'This check only runs against local services');
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const directory=mkdtempSync(join(tmpdir(),'muse-whimsy-nav-'));
let userId,chrome,socket;
try{
 const invitation=await admin.auth.admin.generateLink({type:'invite',email:`whimsy-nav-${crypto.randomUUID()}@example.test`});
 if(invitation.error)throw invitation.error;
 userId=invitation.data.user.id;
 chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');
 for(let i=0;!existsSync(portFile)&&i<600;i++)await new Promise(resolve=>setTimeout(resolve,100));
 assert.ok(existsSync(portFile),'Chrome starts');
 const port=readFileSync(portFile,'utf8').split('\n')[0];
 const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json());
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const requests=new Map(),errors=[];
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);if(message.id){const request=requests.get(message.id);requests.delete(message.id);if(message.error)request.reject(Error(message.error.message));else request.resolve(message.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;requests.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression:`(${expression})()`,returnByValue:true,awaitPromise:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
 const until=async(predicate,label)=>{for(let i=0;i<250;i++){if(await evaluate(predicate))return;await new Promise(resolve=>setTimeout(resolve,120));}throw Error(`${label}: ${await evaluate(()=>JSON.stringify({url:location.href,text:document.body.innerText.slice(0,600)}))}`);};
 const navigate=async path=>{await send('Page.navigate',{url:origin+path});};
 await send('Page.enable');await send('Runtime.enable');
 await navigate(`/auth/confirm?token_hash=${encodeURIComponent(invitation.data.properties.hashed_token)}&type=invite&next=/whimsy/tarot`);
 await until(()=>!!document.querySelector('.muse-tarot'),'Tarot deep link loads');
 await navigate('/whimsy/tarot');
 await until(()=>location.origin===origin&&!!document.querySelector('.muse-tarot'),'Tarot loads from the worktree server');
 await evaluate(()=>[...document.querySelectorAll('.muse-rail-navigation a')].find(link=>link.textContent.trim()==='Whimsy').click());
 await until(()=>location.pathname==='/whimsy'&&!!document.querySelector('.muse-whimsy-foundation-grid'),'Sidebar Whimsy opens the overview');
 assert.equal(await evaluate(()=>document.querySelectorAll('.muse-whimsy-foundation-grid a[href^="/whimsy/"]').length),5);
 await evaluate(()=>document.querySelector('.muse-whimsy-navigation a[href="/whimsy/observatory"]').click());
 await until(()=>location.pathname==='/whimsy/observatory'&&!document.querySelector('#cosmic-forecast')?.hidden,'Observatory opens Horoscopes');
 await until(()=>document.querySelector('.muse-cosmic-save-status')?.textContent.includes('saved records loaded'),'Observatory hydrates and loads private records');
 assert.equal(await evaluate(()=>!!document.querySelector('.muse-whimsy-foundation-grid')),false);
 assert.deepEqual(await evaluate(()=>[...document.querySelectorAll('.muse-whimsy-navigation a')].map(link=>link.textContent.trim())),['The Cosmic Observatory','Tarot Sanctuary','Dreamscapes','Fortunes & Nonsense','Weekly Side Quests']);
 assert.equal(await evaluate(()=>document.querySelector('.muse-whimsy-navigation [aria-current=page]')?.textContent.trim()),'The Cosmic Observatory');
 assert.equal(await evaluate(()=>document.querySelector('.muse-cosmic-navigation [aria-current=page]')?.textContent.trim()),'Horoscopes');
 assert.equal(await evaluate(()=>[...document.querySelectorAll('.muse-cosmic-navigation button')].some(button=>button.textContent.trim()==='My Cosmic Profile')),false);
 await evaluate(()=>[...document.querySelectorAll('.muse-whimsy-experience-actions button')].find(button=>button.textContent.trim()==='My Cosmic Profile').click());
 await until(()=>!!document.querySelector('#cosmic-profile-settings[open]'),'Profile button opens settings');
 await evaluate(()=>document.querySelector('#cosmic-profile-settings button[aria-label="Close My Cosmic Profile"]').click());
 await until(()=>!document.querySelector('#cosmic-profile-settings[open]')&&!document.querySelector('#cosmic-forecast')?.hidden,'Closing profile preserves Horoscopes');
 await evaluate(()=>[...document.querySelectorAll('.muse-cosmic-navigation button')].find(button=>button.textContent.trim()==='Horoscopes').click());
 await until(()=>location.search==='?view=forecast'&&!document.querySelector('#cosmic-forecast').hidden,'Forecast section opens');
 await evaluate(()=>[...document.querySelectorAll('.muse-cosmic-navigation button')].find(button=>button.textContent.trim()==='Birth Chart').click());
 await until(()=>location.search==='?view=chart'&&!document.querySelector('#cosmic-chart').hidden,'Chart URL and section change together');
 await evaluate(()=>history.back());
 await until(()=>location.search==='?view=forecast'&&!document.querySelector('#cosmic-forecast').hidden,'Back restores forecast');
 await evaluate(()=>history.forward());
 await until(()=>location.search==='?view=chart'&&!document.querySelector('#cosmic-chart').hidden,'Forward restores chart');
 await navigate('/whimsy/observatory?view=calendar');
 await until(()=>!document.querySelector('#cosmic-calendar')?.hidden,'Calendar deep link loads');
 await send('Page.reload');
 await until(()=>location.search==='?view=calendar'&&!document.querySelector('#cosmic-calendar')?.hidden,'Calendar refresh preserves view');
 for(const id of ['tarot','dreamscapes','fortunes','side-quests']){
  await navigate(`/whimsy/${id}`);
  await until(`()=>document.querySelector('.muse-whimsy-navigation a[aria-current=page]')?.getAttribute('href')==='/whimsy/${id}'`,`${id} deep link loads`);
 }
 await navigate('/whimsy');
 await until(()=>location.pathname==='/whimsy'&&!!document.querySelector('.muse-whimsy-foundation-grid'),'Base Whimsy opens overview');
 await navigate('/collections');
 await until(()=>!!document.querySelector('.muse-collections-overview')&&!!document.querySelector('.muse-rail-navigation a[href=\"/collections\"]'),'Collections overview and sidebar link load');
 await until(()=>document.querySelector('.muse-collections-overview')?.textContent.includes('Your museum starts with a story.'),'Empty collection uses real-record state');
 await evaluate(()=>[...document.querySelectorAll('.muse-collections-overview button')].find(button=>button.textContent.trim()==='+ Add').click());
 await until(()=>!!document.querySelector('#collections-add[open]'),'Unified Add opens');
 await evaluate(()=>[...document.querySelectorAll('#collections-add button')].find(button=>button.textContent.trim()==='Books').click());
 await until(()=>!!document.querySelector('#bookshelf-book-editor[open]'),'Collections add opens reused book editor');
 await evaluate(()=>{const input=document.querySelector('#bookshelf-book-editor input[required]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'A Local Collections Test');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await evaluate(()=>[...document.querySelectorAll('#bookshelf-book-editor button')].find(button=>button.textContent.trim()==='Save book').click());
 await until(()=>!!document.querySelector('#bookshelf-detail[open]'),'Book saves through existing Bookshelf service');
 await navigate('/collections');
 await until(()=>document.querySelector('.muse-collections-card')?.textContent.includes('A Local Collections Test'),'Collections board reads the canonical book');
 await evaluate(()=>[...document.querySelectorAll('.muse-collections-modes button')].find(button=>button.textContent.trim()==='Library').click());
 await until(()=>location.search.includes('mode=library')&&!!document.querySelector('.muse-collections-filters'),'Library mode shares books');
 for(const [view,title] of [['movies','A Local Movie'],['tv','A Local Show'],['games','A Local Game']]){
  await navigate(`/collections?view=${view}&add=1`);
  await until(()=>!!document.querySelector('#collection-media-editor[open]'),`${view} manual editor loads`);
  await evaluate(`()=>{const input=document.querySelector('#collection-media-editor input[required]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'${title}');input.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await evaluate(()=>[...document.querySelectorAll('#collection-media-editor button')].find(button=>button.textContent.trim()==='Save item').click());
  await until(()=>!!document.querySelector('#collection-media-detail[open]'),`${view} saves through owner-scoped table`);
 }
 await navigate('/collections?view=tv');
 await until(()=>!!document.querySelector('.muse-media-library .muse-collections-card'),'Saved TV show loads');
 await evaluate(()=>document.querySelector('.muse-media-library .muse-collections-card').click());
 await until(()=>!!document.querySelector('#collection-media-detail[open]'),'TV detail opens');
 await evaluate(()=>[...document.querySelectorAll('.muse-collections-episodes button')].find(button=>button.textContent.trim()==='+ Add episode').click());
 await until(()=>!!document.querySelector('.muse-collections-episodes form'),'Episode form opens');
 await evaluate(()=>[...document.querySelectorAll('.muse-collections-episodes form button')].find(button=>button.textContent.trim()==='Save episode').click());
 await until(()=>!!document.querySelector('.muse-collections-episode'),'Episode persists in show detail');
 await evaluate(()=>[...document.querySelectorAll('.muse-collections-episode button')].find(button=>button.textContent.trim()==='Mark watched').click());
 await until(()=>document.querySelector('.muse-collections-episodes')?.textContent.includes('1 / 1 currently available episodes watched'),'Episode watch updates available progress');
 await navigate('/collections?mode=library');
 await until(()=>document.querySelectorAll('.muse-collections-card').length===4,'Board and Library share one book and three media items');
 assert.equal(await evaluate(()=>['Genre','Rating','Personal tag','Series','Added on or after','Completed on or after','Favorites only'].every(label=>[...document.querySelectorAll('.muse-collections-filters label')].some(node=>node.textContent.includes(label)))),true,'Library exposes all shared filters');
 await evaluate(()=>{const input=document.querySelector('.muse-collections-controls input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'A Local Movie');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await until(()=>document.querySelectorAll('.muse-collections-card').length===1&&document.querySelector('.muse-collections-card')?.textContent.includes('A Local Movie'),'Library search filters canonical items');
 await navigate('/collections?view=series&add=1');
 await until(()=>!!document.querySelector('#collection-series-editor[open]'),'Series Add opens editor');
 await evaluate(()=>{const input=document.querySelector('#collection-series-editor input[required]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'A Local Trilogy');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await evaluate(()=>[...document.querySelectorAll('#collection-series-editor button')].find(button=>button.textContent.trim()==='Save series').click());
 await until(()=>document.querySelector('.muse-collections-series-detail')?.textContent.includes('A Local Trilogy'),'Series saves and opens detail');
 await navigate('/collections?view=series');
 await until(()=>[...document.querySelectorAll('.muse-collections-series .muse-collections-card')].some(card=>card.textContent.includes('A Local Trilogy')),'Series persists across navigation');
 await navigate('/collections?view=my-collections&add=1');
 await until(()=>!!document.querySelector('#collection-curated-editor[open]'),'Curated Add opens editor');
 await evaluate(()=>{const input=document.querySelector('#collection-curated-editor input[required]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'A Local Keepsake Shelf');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await evaluate(()=>[...document.querySelectorAll('#collection-curated-editor button')].find(button=>button.textContent.trim()==='Save collection').click());
 await until(()=>document.querySelector('.muse-collections-series-detail')?.textContent.includes('A Local Keepsake Shelf'),'Curated collection saves and opens detail');
 assert.equal(await evaluate(async()=>{const response=await fetch('/api/account/export');const body=await response.json();return response.ok&&body.data?.collections?.media?.length===3&&body.data?.collections?.series?.length===1&&body.data?.collections?.curated?.length===1&&body.data?.collections?.episodes?.length===1&&body.data?.collections?.activity?.length===1;}),true,'Account export includes saved Collections records');
 await navigate('/insights?view=collections');
 await until(()=>!!document.querySelector('.muse-insights-page a[href="/collections"]'),'Collections Insights section loads');
 assert.equal(await evaluate(()=>{const button=document.querySelector('.muse-insights-page a[href="/collections"]');if(!button)return false;button.focus();return document.activeElement===button;}),true,'Collections Insights link is keyboard focusable');
 await navigate('/whimsy/bookshelf');
 await until(()=>location.pathname==='/collections'&&!!document.querySelector('.muse-books-tabs'),'Old Bookshelf deep link redirects to the working Books section');
 await navigate('/collections');
 await until(()=>!!document.querySelector('.muse-collections-overview'),'Collections overview loads for layout checks');
 for(const width of [320,390,768,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});
  assert.equal(await evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Collections has no horizontal overflow at ${width}px`);
 }
 const themeIds=load('lib/themes').themes.map(theme=>theme.id);
 for(const id of themeIds)for(const material of ['crystal','frosted']){
  await evaluate(`()=>{document.documentElement.setAttribute('data-theme','${id}');document.documentElement.setAttribute('data-material','${material}');}`);
  assert.equal(await evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Collections remains within mobile viewport in ${id}/${material}`);
 }
 assert.deepEqual(errors,[],'No browser exceptions');
 console.log(`PASS Whimsy/Collections UI: profile default, five tabs, deep links, Back/Forward, book, media and episode saves, series and curated persistence, export, Insights focus, four viewports and ${themeIds.length} themes in both materials.`);
}catch(error){console.error('Whimsy navigation check failed:',error);throw error;}finally{
 socket?.close();if(chrome&&chrome.exitCode===null)await new Promise(resolve=>{chrome.once('exit',resolve);chrome.kill();});
 if(userId){const deleted=await admin.auth.admin.deleteUser(userId);if(deleted.error)console.error('Disposable account cleanup failed:',deleted.error.message);}
 rmSync(directory,{recursive:true,force:true,maxRetries:10,retryDelay:200});
}
