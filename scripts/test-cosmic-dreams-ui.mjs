// Authenticated LOCAL screenshots for the #214 follow-up: Birth Chart hero, Cosmic Journal hero + archive, Dream Diary cards. with a disposable account: the empty Inner World,
// quick add, collections and search, the detail view (ordinary edit vs Record evolution, connections, Life Areas,
// reflections), the values garden, a guided exploration kept as a discovery, the evolution timeline, the manifesto
// (autosave, kept version), Intentions referencing a value, phone layouts without sideways scroll, and themes.
// Requires `npm run dev`. Run: INNER_UI_ORIGIN=http://localhost:3000 node scripts/test-cosmic-dreams-ui.mjs
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const origin=process.env.INNER_UI_ORIGIN??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const shots=process.env.INNER_UI_SHOTS??join(tmpdir(),'muse-cosmic-dream-ui');mkdirSync(shots,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const directory=mkdtempSync(join(tmpdir(),'muse-inner-ui-'));let chrome,socket,passed=0,userId='';
const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const count=async(t,f={})=>{let q=admin.from(t).select('*',{count:'exact',head:true}).eq('user_id',userId);for(const [k,v] of Object.entries(f))q=q.eq(k,v);return (await q).count;};
try{
 const link0=must(await admin.auth.admin.generateLink({type:'invite',email:`inner-ui-${crypto.randomUUID()}@example.test`}));userId=link0.user.id;
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link0.properties.hashed_token}));
 sql(`update public.profiles set first_name='Wren',time_zone='UTC',time_zone_confirmed_at=now(),onboarded_at=now() where id='${userId}'`);
 const areas=must(await client.from('life_areas').insert([{label:'Health & Fitness',color:'#3fa66b',position:0},{label:'Personal Growth',color:'#8050cf',position:7},{label:'Spirituality',color:'#e85d75',position:9},{label:'Fun & Recreation',color:'#f4a261',position:6}]).select('id,label'));const area=l=>areas.find(a=>a.label===l).id;

 chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await wait(100);
 const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
 let id=0;const pending=new Map(),errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown'){const t=m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text;if(!/negative time stamp/.test(t))errors.push(t);}
  if(m.method==='Page.javascriptDialogOpening')void send('Page.handleJavaScriptDialog',{accept:true});
  if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async(fn,args)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;};
 const until=async(fn,message,args,tries=300)=>{for(let i=0;i<tries;i++){if(await evaluate(fn,args).catch(()=>false))return;await wait(100);}throw Error(message);};
 const viewport=(width,height=900,touch=false)=>Promise.all([send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:touch?2:1,mobile:touch}),send('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false})]);
 const shoot=async(name,full=false)=>{await wait(500);let clip;if(full){const m=await send('Page.getLayoutMetrics');clip={x:0,y:0,width:m.cssContentSize.width,height:Math.min(m.cssContentSize.height,6000),scale:1};}
  const r=await send('Page.captureScreenshot',{format:'png',...(clip?{clip,captureBeyondViewport:true}:{})});writeFileSync(join(shots,`${name}.png`),Buffer.from(r.data,'base64'));};
 globalThis.__shoot=shoot;globalThis.__errors=errors;
 const overflow=()=>evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 const go1=async(path,ready,label)=>{await evaluate(()=>{window.__old=1;}).catch(()=>{});await send('Page.navigate',{url:`${origin}${path}`});await until(new Function(`return !window.__old&&(${ready})`),label);};
 const go=async(path,ready,label)=>{for(let k=0;;k++){try{return await go1(path,ready,label);}catch(e){if(k>=2)throw e;console.log('retrying',label);}}};
 const setValue=(selector,value)=>evaluate(({selector,value})=>{const t=document.querySelector(selector);if(!t)throw Error('missing '+selector);const proto=t instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const click1=(selector,text)=>evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(x=>(text==null||x.textContent.trim()===text||x.textContent.trim().startsWith(text)||x.getAttribute('aria-label')===text)&&!x.disabled);if(!b)throw Error('missing '+selector+' '+text);b.click();},{selector,text});
 const click=async(selector,text)=>{for(let k=0;;k++){try{return await click1(selector,text);}catch(e){if(k>=40)throw e;await wait(150);}}};
 const has=(selector,text)=>evaluate(({selector,text})=>[...document.querySelectorAll(selector)].some(x=>!text||x.textContent.includes(text)),{selector,text});
 await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await viewport(1280);
 const magic=must(await admin.auth.admin.generateLink({type:'magiclink',email:link0.user.email}));
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${magic.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('main'),'signed in');




 const theme=async(t,m='frosted')=>{sql(`insert into public.appearance_preferences(user_id,theme,material,updated_at) values ('${userId}','${t}','${m}',now()) on conflict (user_id) do update set theme=excluded.theme,material=excluded.material,updated_at=now()`);await evaluate(([t,m])=>{localStorage.setItem('muse.theme',t);localStorage.setItem('muse.material',m);},[t,m]);};
 await theme('prism-noir');
 const seeded=await evaluate(async()=>{const r=await fetch('/api/astrology/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'profile-save',commandId:crypto.randomUUID(),expectedRevision:0,record:{profile:{date:'1990-09-08',time:'14:20',accuracy:'exact',uncertaintyMinutes:0,place:{id:'synthetic',name:'Synthetic Greenwich reference',latitude:51.4779,longitude:0,timeZone:'UTC'},zodiac:'tropical',houseSystem:'whole-sign'}}})});const d=await r.json();return r.ok&&d.snapshot?.chart?.payload.placements.length;});
 check(seeded===10,'a calculated chart for the test account');
 const views={'Birth Chart':'chart','Cosmic Journal':'journal'};const tab=async label=>{await go(`/whimsy/observatory?view=${views[label]}`,`!!document.querySelector("#cosmic-${views[label]}:not([hidden])")`,label);await wait(900);};
 await tab('Birth Chart');
 await until(()=>!!document.querySelector('.muse-chart-hero .muse-natal-wheel'),'chart hero');
 check(await has('.muse-chart-hero-title','Sun'),'the Big Three read as the chart’s title');
 check(await evaluate(()=>document.querySelectorAll('.muse-natal-wheel').length)===1,'the natal wheel appears once, in the hero');
 check(await evaluate(()=>!!document.querySelector('.muse-chart-moon-lit')),'the natal moon phase is drawn');
 await shoot('01-chart',true);
 await tab('Cosmic Journal');await until(()=>!!document.querySelector('.muse-cosmic-journal-hero'),'journal hero');
 check(await has('.muse-cosmic-journal-archive .muse-journal-empty-row','blank'),'a compact empty state inside the archive');
 await shoot('02-journal-empty');
 await click('.muse-cosmic-journal-hero button','Write the first reflection');await until(()=>!!document.querySelector('dialog textarea'),'editor');
 await setValue('dialog textarea','The Moon in Sagittarius explains a lot about my weekends.');await click('dialog button','Save reflection');
 await until(()=>[...document.querySelectorAll('dialog[open]')].some(d=>d.textContent.includes('Edit reflection')),'saved');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait(800);
 await until(()=>!!document.querySelector('.muse-cosmic-journal-archive .muse-cosmic-journal-card'),'a reflection in the archive');
 check(true,'a reflection appears in the archive');
 check(await evaluate(()=>{const g=document.querySelector('.muse-cosmic-journal-grid').getBoundingClientRect().width,c=document.querySelector('.muse-cosmic-journal-card').getBoundingClientRect().width;return c<g*0.45;}),'one reflection stays card-sized');
 check(await evaluate(()=>{const g=document.querySelector('.muse-cosmic-journal-grid').getBoundingClientRect(),c=document.querySelector('.muse-cosmic-journal-grid>.muse-journal-invite')?.getBoundingClientRect();return !!c&&Math.abs(c.right-g.right)<2;}),'a ghost card fills the rest of the row');
 await evaluate(()=>document.querySelector('.muse-cosmic-journal-archive').scrollIntoView({block:'start'}));await wait(300);await shoot('03-journal');
 // Dreams
 const today=new Date().toISOString().slice(0,10),dream=(title,text,cls,i)=>({user_id:userId,activity_date:today,time_zone:'UTC',payload:{loggedAt:new Date().toISOString(),date:today,timeZone:'UTC',title,text,symbolIds:[],emotions:['calm'],interpretation:'',classifications:[cls],intensity:3+i%2}});
 for(const d of [dream('The lighthouse','I was climbing a lighthouse that kept growing taller with every step, and the sea below turned to glass.','Vivid',0),dream('Train to nowhere','A night train with every window showing a different season.','Recurring',1)])sql(`insert into public.whimsy_dream_entries(id,user_id,activity_date,time_zone,payload) values ('${crypto.randomUUID()}','${d.user_id}','${d.activity_date}','UTC','${JSON.stringify(d.payload).replace(/'/g,"''")}'::jsonb)`);
 check(true,'dreams seeded');
 await go('/whimsy/dreamscapes','!!document.querySelector(".muse-dream-entry")','dreams');await wait(800);
 const cards=await evaluate(()=>[...document.querySelectorAll('.muse-dream-entry')].map(e=>Math.round(e.getBoundingClientRect().width)));
 const list=await evaluate(()=>Math.round(document.querySelector('.muse-dream-list').getBoundingClientRect().width));
 check(cards.length===2&&cards.every(w=>w<list*0.45),'dreams are cards, never stretched across the page');
 check(await evaluate(()=>{const e=document.querySelector('.muse-dream-entry');const c=e.querySelector('.muse-dream-crescent').getBoundingClientRect(),r=e.getBoundingClientRect();return c.right>r.right-60&&c.bottom>r.bottom-60;}),'the crescent sits in the bottom-right corner');
 check(await evaluate(()=>{const g=document.querySelector('.muse-dream-list').getBoundingClientRect(),c=document.querySelector('.muse-dream-list>.muse-journal-invite')?.getBoundingClientRect();return !!c&&Math.abs(c.right-g.right)<2;}),'a ghost card fills the rest of the newest row');
 check(await has('.muse-dream-diary .muse-journal-hero','What the night left behind')&&await has('.muse-dream-hero-note','The lighthouse'),'the Dream Diary opens with a hero carrying the newest dream');
 check(await has('.muse-dream-diary .muse-journal-archive .muse-dream-controls'),'search and filters live in the dream archive');
 await shoot('04-dreams');
 // Tarot Reading Journal
 const reading={date:today,mood:'hopeful',tags:['studio'],cards:[{card:{version:1,contentId:'tarot-cups-05'},position:0,orientation:'upright'},{card:{version:1,contentId:'tarot-wands-08'},position:1,orientation:'upright'},{card:{version:1,contentId:'tarot-swords-08'},position:2,orientation:'reversed'}],deckId:'rws1909',readAt:new Date().toISOString(),question:'Should I take the studio lease?',spreadId:'situation-challenge-advice',timeZone:'UTC',reflection:'The Five keeps looking at what spilled.'};
 sql(`insert into public.whimsy_tarot_readings(id,user_id,activity_date,time_zone,payload) values ('${crypto.randomUUID()}','${userId}','${today}','UTC','${JSON.stringify(reading).replace(/'/g,"''")}'::jsonb)`);
 await go('/whimsy/tarot?view=journal','!!document.querySelector(".muse-tarot-entry")','tarot journal');await wait(900);
 check(await has('.muse-tarot-journal-hero','What the cards have been saying')&&await has('.muse-tarot-journal-caption','Keeps appearing'),'the Reading Journal opens with a hero fanning the cards that keep appearing');
 check(await evaluate(()=>{const g=document.querySelector('.muse-tarot-timeline').getBoundingClientRect(),c=document.querySelector('.muse-tarot-entry').getBoundingClientRect(),i=document.querySelector('.muse-tarot-timeline>.muse-journal-invite')?.getBoundingClientRect();return c.width<g.width*0.45&&!!i&&Math.abs(i.right-g.right)<2;}),'one reading stays card-sized and the invite fills the row');
 await shoot('04b-tarot-journal');
 await go('/whimsy/tarot','!!document.querySelector(".muse-tarot-welcome .muse-tarot-question textarea")','reading table');await wait(700);
 check(!(await has('.muse-tarot-setup'))&&await has('.muse-tarot-ritual-controls .muse-tarot-selector'),'the question and spread picker live inside the table, not in a separate band');
 await evaluate(()=>{const e=document.querySelector('.muse-tarot-question textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Should I take the studio lease?');e.dispatchEvent(new Event('input',{bubbles:true}));});await wait(300);
 await shoot('04c-tarot-table');
 await click('.muse-tarot-shuffle','');await until(()=>!!document.querySelector('.muse-tarot-fan-arc button:not([disabled])'),'the fan');
 check(await has('.muse-tarot-question-banner','Should I take the studio lease?'),'the question heads the table while you choose');
 await evaluate(()=>document.querySelector('.muse-tarot-fan-arc button:not([disabled])').click());
 await until(()=>!!document.querySelector('.muse-tarot-drawn-card'),'the drawn card');await evaluate(()=>document.querySelector('.muse-tarot-drawn-card[data-revealed=false]')?.click());
 await until(()=>!!document.querySelector('.muse-idesk-question'),'the desk question');
 check(await has('.muse-idesk-question','Should I take the studio lease?'),'the question sits at the top of the Interpretation Desk');await shoot('04c2-tarot-desk');
 await go('/whimsy/observatory?view=calendar','!!document.querySelector(".muse-cal-hero-phases li")','calendar');await wait(700);
 check(await has('.muse-cal-hero','Cosmic Calendar'),'the Cosmic Calendar opens with a hero strung with this month\'s phases');await shoot('04d-calendar');
 await go('/whimsy/dreamscapes?view=decoder','!!document.querySelector(".muse-decoder-journal")','decoder');await wait(700);
 check(await has('.muse-decoder-archive','Your latest dreams')&&await has('.muse-decoder-recent .muse-journal-invite','Decode any dream'),'the Decoder shows latest dreams with an invite filling the row');await shoot('04e-decoder');
 await go('/whimsy/dreamscapes?view=encyclopedia','!!document.querySelector(".muse-dream-library-hero .muse-dream-alphabet")','encyclopedia');await wait(700);
 check(await has('.muse-dream-library-mine'),'the Encyclopedia keeps your symbols on one shelf');await shoot('04f-encyclopedia');
 await theme('astral','crystal');
 for(const [p,ready,label,name] of [['/whimsy/observatory','.muse-observatory','Birth Chart','05-astral-chart'],['/whimsy/observatory','.muse-observatory','Cosmic Journal','06-astral-journal'],['/whimsy/dreamscapes','.muse-dream-entry',null,'07-astral-dreams'],['/whimsy/tarot?view=journal','.muse-tarot-entry',null,'07b-astral-tarot']]){
  await go(p,`!!document.querySelector("${ready}")`,name);if(label)await tab(label);await wait(600);await shoot(name);
 }
 await theme('prism-noir');await viewport(390,844,true);
 for(const [p,ready,label,name] of [['/whimsy/observatory','.muse-observatory','Birth Chart','08-phone-chart'],['/whimsy/observatory','.muse-observatory','Cosmic Journal','09-phone-journal'],['/whimsy/dreamscapes','.muse-dream-entry',null,'10-phone-dreams'],['/whimsy/tarot?view=journal','.muse-tarot-entry',null,'11-phone-tarot']]){
  await go(p,`!!document.querySelector("${ready}")`,name);if(label)await tab(label);await wait(600);check(!(await overflow()),`${name}: no sideways scroll`);await shoot(name,true);
 }
 check(errors.length===0,`no runtime errors (${errors.join(' | ').slice(0,400)})`);
 console.log(`PASS cosmic + dreams: ${passed} checks. Screenshots in ${shots}`);
}catch(e){try{await globalThis.__shoot?.('fail');}catch{}console.log('ERRORS:',JSON.stringify(globalThis.__errors??[]).slice(0,3000));throw e;}finally{
 if(userId)await admin.auth.admin.deleteUser(userId).catch(()=>undefined);console.log('Disposable account removed.');
 try{socket?.close();}catch{}chrome?.kill();await wait(800);try{rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch{}
}
