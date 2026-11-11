// Authenticated LOCAL browser harness for Books & Series (#136). Disposable account, seeded Library, headless
// Chrome over CDP. Used by scripts/test-books-series-ui.mjs and for visual review screenshots.
// Requires local Supabase and `next dev` (with the Hardcover fixture: scripts/hardcover-fixture.mjs).
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';

loadEnvFile('.env.local');
export const origin=process.env.BOOKS_UI_ORIGIN??'http://localhost:3000';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const options={auth:{persistSession:false,autoRefreshToken:false}};
export const admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
export const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
export const wait=ms=>new Promise(r=>setTimeout(r,ms));
const today=new Date().toISOString().slice(0,10);
const isbnCover=isbn=>`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

/** A fresh onboarded account with a small, realistic Library. */
export async function seedAccount(){
 const link=must(await admin.auth.admin.generateLink({type:'invite',email:`books-ui-${crypto.randomUUID()}@example.test`})),userId=link.user.id;
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));
 sql(`update public.profiles set first_name='Stevie',time_zone='UTC',time_zone_confirmed_at=now(),onboarded_at=now() where id='${userId}'`);
 const save=async(kind,record)=>{const {error}=await client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:record,p_delete:false});if(error)throw Error(`${kind}: ${error.message}`);return record.id;};
 const book=(fields)=>({id:crypto.randomUUID(),reviewEmojis:[],format:'physical',startingPage:0,currentPage:0,genre:'Fantasy',...fields});
 const ids={};
 // An owned series book saved before #136 (no series, no catalog id): Journey D enriches it on open.
 const heirCycle=crypto.randomUUID();
 ids.heir=await save('books',book({title:'Heir of Fire',author:'Sarah J. Maas',status:'reading',startedOn:today,coverUrl:isbnCover('9781619630659'),totalPages:565,cycleId:heirCycle,isbn:'9781619630659',positionUpdatedAt:'2025-01-01T00:00:00.000Z',positionDate:'2025-01-01'}));
 ids.acowar=await save('books',book({title:'A Court of Wings and Ruin',author:'Sarah J. Maas',status:'planned',coverUrl:isbnCover('9781619634480'),totalPages:703,isbn:'9781619634480'}));
 ids.acotar=await save('books',book({title:'A Court of Thorns and Roses',author:'Sarah J. Maas',status:'finished',startedOn:'2025-01-02',finishedOn:'2025-01-20',coverUrl:isbnCover('9781619634442'),totalPages:419,rating:4,completions:[{id:crypto.randomUUID(),finishedOn:'2025-01-20',startedOn:'2025-01-02',recordedAt:'2025-01-20T00:00:00.000Z',rating:4}],description:'A seductive, breathtaking book that blends romance, adventure, and faerie lore into an unforgettable read.'}));
 ids.circe=await save('books',book({title:'Circe',author:'Madeline Miller',status:'finished',finishedOn:'2024-06-01',coverUrl:isbnCover('9780316556347'),totalPages:393,genre:'Fantasy, Literary Fiction',publisher:'Little, Brown and Company',publishedDate:'2018-04-10',description:'In the house of Helios, god of the sun and mightiest of the Titans, a daughter is born. But Circe is a strange child—not powerful, like her father, nor viciously alluring like her mother.'}));
 ids.manual=await save('books',book({title:'My grandmother’s recipe notebook',status:'paused',genre:'',coverUrl:''}));
 const sessionId=crypto.randomUUID();
 await save('sessions',{id:sessionId,cycleId:heirCycle,bookId:ids.heir,date:today,timeZone:'UTC',pages:42,startingPage:0,endingPage:42,notes:'Rowan!',activeSegments:[{start:`${today}T08:00:00.000Z`,end:`${today}T08:41:00.000Z`}],positionRecordedAt:`${today}T08:41:00.000Z`,manual:false});
 must(await client.from('collection_media_items').insert({id:crypto.randomUUID(),user_id:userId,kind:'tv',title:'Bridgerton',creator:'Shondaland',status:'watching',genres:['Romance']}));
 return {userId,email:link.user.email,client,ids};
}

/** Headless Chrome signed in as the account. */
export async function openBrowser(account,{shots=join(tmpdir(),'muse-books-ui')}={}){
 mkdirSync(shots,{recursive:true});
 const directory=mkdtempSync(join(tmpdir(),'muse-books-ui-'));
 const chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await wait(100);
 const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
 let id=0;const pending=new Map(),errors=[],consoleErrors=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 socket.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.method==='Runtime.exceptionThrown'){const t=m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text;if(!/negative time stamp/.test(t))errors.push(t);}
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value??a.description).join(' ').slice(0,400));
  if(m.method==='Page.javascriptDialogOpening')void send('Page.handleJavaScriptDialog',{accept:true});
  if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const evaluate=async(fn,args)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;};
 const until=async(fn,message,args,tries=300)=>{for(let i=0;i<tries;i++){if(await evaluate(fn,args).catch(()=>false))return;await wait(100);}throw Error(`Timed out: ${message}`);};
 const viewport=(width,height=900,touch=false)=>Promise.all([send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:touch?2:1,mobile:touch}),send('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false})]);
 const shoot=async(name,{full=false}={})=>{await wait(500);let clip;if(full){const m=await send('Page.getLayoutMetrics');clip={x:0,y:0,width:m.cssContentSize.width,height:Math.min(m.cssContentSize.height,6000),scale:1};}const r=await send('Page.captureScreenshot',{format:'png',...(clip?{clip,captureBeyondViewport:true}:{})});const file=join(shots,`${name}.png`);writeFileSync(file,Buffer.from(r.data,'base64'));return file;};
 const overflow=()=>evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 const go=async(path,ready,label)=>{await evaluate(()=>{window.__old=1;}).catch(()=>{});await send('Page.navigate',{url:`${origin}${path}`});await until(new Function(`return !window.__old&&(${ready})`),label??path);};
 const click=(selector,text)=>evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(x=>(text==null||x.textContent.trim().includes(text)||x.getAttribute('aria-label')===text)&&!x.disabled);if(!b)throw Error('missing '+selector+' '+text);b.scrollIntoView({block:'center'});b.click();},{selector,text});
 const type=async(selector,value)=>{await evaluate(({selector,value})=>{const t=document.querySelector(selector);t.focus();const proto=t instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});};
 const text=selector=>evaluate(s=>document.querySelector(s)?.textContent?.replace(/\s+/g,' ').trim()??null,selector);
 await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await viewport(1280);
 const magic=must(await admin.auth.admin.generateLink({type:'magiclink',email:account.email}));
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${magic.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('main'),'signed in');
 const close=()=>{try{socket.close();}catch{}chrome.kill();try{rmSync(directory,{recursive:true,force:true});}catch{}};
 return {send,evaluate,until,viewport,shoot,overflow,go,click,type,text,errors,consoleErrors,close,shots};
}
export async function removeAccount(userId){if(userId)await admin.auth.admin.deleteUser(userId).catch(()=>{});}
