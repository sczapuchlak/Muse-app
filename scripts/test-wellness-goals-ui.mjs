// Authenticated LOCAL browser QA for Wellness goals, Connected Rituals and unified Insights (#30/#32).
// Disposable synthetic account and data only; every browser request must stay on localhost. Requires `npm run dev`.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const origin=process.env.WELLNESS_UI_ORIGIN??process.env.SITE_URL??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const shots=process.env.WELLNESS_UI_SHOTS??join(tmpdir(),'muse-wellness-ui');mkdirSync(shots,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const {readWellness,writeWellness}=load('lib/data/wellness'),{wellnessReducer}=load('lib/wellness'),goals=load('lib/wellness-goals'),{todayInTimeZone,shiftDate,weekDates}=load('lib/dates');
const {readRituals,writeRituals}=load('lib/data/rituals'),{ritualReducer}=load('lib/rituals'),connections=load('lib/ritual-connections');
const {readPlanner,writePlanner}=load('lib/data/planner'),{createTask}=load('lib/planner'),{saveWhimsyRecord,readWhimsy}=load('lib/whimsy/persistence');
const {readMoney}=load('lib/data/money'),{persistedInsights}=load('lib/insights/persisted'),{calculateInsights}=load('lib/insights/metrics'),{recapFacts}=load('lib/insights/across');
const zone='America/Los_Angeles',today=todayInTimeZone(zone),now=()=>new Date().toISOString(),uuid=()=>crypto.randomUUID();
const users=[],directory=mkdtempSync(join(tmpdir(),'muse-wellness-ui-'));let chrome,socket,captured=0;
async function account(label){const email=`${label}-${uuid()}@example.test`;const invite=must(await admin.auth.admin.generateLink({type:'invite',email}));users.push(invite.user.id);const link=must(await admin.auth.admin.generateLink({type:'magiclink',email}));const c=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await c.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token}));const profile=must(await c.from('profiles').select('revision').single());must(await c.rpc('save_account_preferences',{p_expected_revision:profile.revision,p_command_id:uuid(),p_patch:{time_zone:zone}}));return {c,id:invite.user.id,email};}
try{
 // ---------- Synthetic history (owner writes through the real RPCs) ----------
 const a=await account('wellness-ui');
 const types=[{id:'movement-upper',name:'Upper',source:'starter',archived:false},{id:'movement-lower',name:'Lower',source:'starter',archived:false},{id:'movement-cardio',name:'Cardio',source:'starter',archived:false},{id:'movement-walk',name:'Walk',source:'starter',archived:false},{id:'movement-yoga',name:'Yoga',source:'starter',archived:false},{id:uuid(),name:'Climbing',source:'custom',archived:false,category:'strength'},{id:uuid(),name:'Dance',source:'custom',archived:false}];
 const climb=types[5].id,dance=types[6].id;const activities=[];
 for(let d=1;d<70;d++){const date=shiftDate(today,-d),wd=new Date(date+'T12:00:00Z').getUTCDay(),typeId=wd===1?'movement-upper':wd===3?'movement-cardio':wd===4?climb:wd===6&&d%3?'movement-walk':null;if(typeId&&!(d>20&&d<28))activities.push({id:uuid(),date,typeId,...(d%5?{durationMinutes:30+(d%4)*10}:{})});}
 activities.push({id:uuid(),date:today,typeId:'movement-upper',durationMinutes:45});
 const water=[];for(let d=0;d<21;d++){if(d%6===5)continue;water.push({date:shiftDate(today,-d),total:d===0?40:56+(d*7)%40,goal:80,unit:'oz'});}
 const assignments=[];for(let d=0;d<10;d++){const date=shiftDate(today,-d);assignments.push({id:uuid(),date,slot:'breakfast',title:'Oats',recipeId:null,order:0,nutrition:{protein:20+d,calories:350}});assignments.push({id:uuid(),date,slot:'dinner',title:'Dinner',recipeId:null,order:0,...(d===3?{}:{nutrition:{protein:45+(d%3)*20,calories:700}})});}
 let snap=await readWellness(a.c);
 const saveW=async state=>{await writeWellness(a.c,snap.revision,uuid(),state);snap=await readWellness(a.c);};
 await saveW({...snap.state,types,activities,water,waterSettings:{goal:80,unit:'oz',quickAdds:[8,16]},assignments});
 const g1=goals.newGoal('workouts','week',4,'sessions',today,now(),uuid()),g2=goals.newGoal('strength-workouts','week',2,'sessions',today,now(),uuid()),g3=goals.newGoal('nutrition-protein','day',90,'g',today,now(),uuid());
 await saveW({...snap.state,goals:[g1,g2,g3]});
 // History cannot be backdated through the app (by design); seed an earlier target directly to exercise historical targets.
 const sixWeeks=shiftDate(weekDates(today)[0],-42);sql(`insert into public.wellness_goal_versions(user_id,goal_id,effective_from,target,unit,direction,status) values('${a.id}','${g1.id}','${sixWeeks}',3,'sessions','atLeast','active'),('${a.id}','${g2.id}','${sixWeeks}',2,'sessions','atLeast','active'),('${a.id}','${g3.id}','${shiftDate(today,-9)}',90,'g','atLeast','active')`);
 snap=await readWellness(a.c);assert.deepEqual(goals.goalHistory(snap.state.goals.find(g=>g.id===g1.id),{timeZone:zone,wellness:snap.state},today,8).results.map(r=>r.target).slice(-3),[3,3,4],'earlier weeks keep the old target');
 // Reading, books and tasks.
 const book=await saveWhimsyRecord(a.c,'books',{record:{id:uuid(),title:'A Synthetic Novel',status:'reading',reviewEmojis:[],startedOn:shiftDate(today,-8),format:'physical',totalPages:300},expectedRevision:0,commandId:uuid()});
 for(const d of [1,2,4,6]){const date=shiftDate(today,-d),start=new Date(`${date}T19:00:00Z`).toISOString(),end=new Date(Date.parse(start)+(d===4?12:28)*60000).toISOString();await saveWhimsyRecord(a.c,'sessions',{record:{id:uuid(),bookId:book.id,date,timeZone:zone,pages:20,activeSegments:[{start,end}],manual:true},expectedRevision:0,commandId:uuid()});}
 await saveWhimsyRecord(a.c,'books',{record:{id:uuid(),title:'A Finished Synthetic Book',status:'finished',reviewEmojis:[],startedOn:shiftDate(today,-30),finishedOn:shiftDate(today,-3),format:'ebook'},expectedRevision:0,commandId:uuid()});
 let planner=await readPlanner(a.c);const w=uuid();
 const act=async action=>{await writePlanner(a.c,planner.revision,uuid(),action,zone);planner=await readPlanner(a.c);};
 await act({type:'workspace/save',workspace:{id:w,name:'Synthetic',accent:'#0088ff'}});
 const tasks=[0,1,2].map(i=>createTask(`Synthetic task ${i}`,w,uuid(),now(),today));for(const task of tasks)await act({type:'task/add',task});
 for(const task of tasks.slice(0,2))await act({type:'task/toggle',id:task.id,now:now()});
 // Rituals: one manual with history, and four connected to each supported tracker family.
 let rit=await readRituals(a.c);const saveR=async state=>{await writeRituals(a.c,rit.revision,uuid(),state);rit=await readRituals(a.c);};
 const group={id:uuid(),name:'Body & mind',accent:'secondary',icon:'rituals',collapsed:false},start=shiftDate(today,-20);
 const base=(over)=>({id:uuid(),groupId:group.id,recurrence:{kind:'daily'},startDate:start,createdAt:now(),...over});
 const stretch=base({name:'Evening stretch',type:'checkbox',goal:1,unit:'check-in'});
 const hydrate=base({name:'Drink 80 oz',type:'numeric',goal:80,unit:'oz',connection:{metric:'water',unit:'oz',since:start}});
 const strength=base({name:'Strength 2× a week',type:'weekly-target',goal:2,unit:'times',connection:{metric:'workouts',category:'strength',since:start}});
 const read=base({name:'Read 20 minutes',type:'checkbox',goal:1,unit:'check-in',connection:{metric:'reading-minutes',threshold:20,since:start}});
 const taskRitual=base({name:'Clear 5 tasks a week',type:'weekly-target',goal:5,unit:'times',connection:{metric:'tasks-completed',since:start}});
 let rstate=ritualReducer(rit.state,{type:'group/save',group});for(const r of [stretch,hydrate,strength,read,taskRitual])rstate=ritualReducer(rstate,{type:'ritual/save',ritual:r});
 for(const d of [1,2,3])rstate=ritualReducer(rstate,{type:'entry/set',ritualId:stretch.id,date:shiftDate(today,-d),value:1,today,now:now()});
 await saveR(rstate);assert.equal(rit.state.rituals.filter(r=>r.connection).length,4);
 console.log('Local: synthetic Wellness, goals (with an earlier target), reading, books, tasks and rituals seeded.');

 // ---------- Isolated browser ----------
 chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await new Promise(r=>setTimeout(r,100));
 const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let id=0;const requests=new Map(),hosts=new Set(),errors=[];
 const dialogs=[];
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Page.javascriptDialogOpening'){dialogs.push(`${m.params.type} on ${m.params.url?new URL(m.params.url).pathname:'?'}`);const key=++id;requests.set(key,{resolve(){},reject(){}});socket.send(JSON.stringify({id:key,method:'Page.handleJavaScriptDialog',params:{accept:true}}));}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.method==='Network.requestWillBeSent'&&m.params?.request?.url.startsWith('http'))hosts.add(new URL(m.params.request.url).hostname);if(m.id&&requests.has(m.id)){const p=requests.get(m.id);requests.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;requests.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async(fn,args)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser expression failed: '+(r.exceptionDetails.exception?.description??r.exceptionDetails.text));return r.result.value;};
 const until=async(fn,message,args)=>{for(let i=0;i<200;i++){if(await evaluate(fn,args))return;await new Promise(r=>setTimeout(r,150));}throw Error(`${message}; path=${await evaluate(()=>location.pathname+location.search)}; errors=${errors.slice(-2).join(' | ')}`);};
 const click=async(text,selector='button')=>{for(let i=0;i<80;i++){if(await evaluate(({text,selector})=>{const e=[...document.querySelectorAll(selector)].find(e=>e.textContent.trim()===text&&!e.disabled);if(!e)return false;e.scrollIntoView({block:'center'});e.focus();e.click();return true;},{text,selector}))return;await new Promise(r=>setTimeout(r,120));}assert.fail(`Control available: ${text} (${selector})`);};
 const setValue=async(selector,value)=>assert.ok(await evaluate(({selector,value})=>{const e=document.querySelector(selector);if(!e)return false;const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;},{selector,value}),`Field available: ${selector}`);
 const go=async(path,ready,message)=>{await send('Page.navigate',{url:origin+path});await until(ready,message);};
 const viewport=async(width,height=1000)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:width<600?2:1,mobile:width<600});};
 const themes=[['light','iridescent'],['dark','nightbloom']];
 /** Clip screenshot of one element (full height up to 4000px) and assert no horizontal page overflow. */
 const shoot=async(name,selector,width)=>{
  await evaluate(()=>{if(document.activeElement?.matches?.('a,[class*=skip]'))document.activeElement.blur();});
  const box=await evaluate(({selector})=>{const e=document.querySelector(selector);if(!e)return null;e.scrollIntoView({block:'start'});window.scrollBy(0,-12);const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y+window.scrollY-8),width:Math.min(r.width+16,document.documentElement.clientWidth),height:Math.min(r.height+16,4000),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,culprits:[...document.querySelectorAll('body *')].filter(x=>x.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,4).map(x=>`${x.tagName.toLowerCase()}.${[...x.classList].join('.')} right=${Math.round(x.getBoundingClientRect().right)}`)};},{selector});
  assert.ok(box,`Surface present for screenshot: ${selector}`);assert.equal(box.overflow,false,`${name} has no horizontal page overflow at ${width}px: ${box.culprits.join(' | ')}`);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...box,scale:1}});writeFileSync(join(shots,`${name}.png`),Buffer.from(shot.data,'base64'));captured++;
 };
 const capture=async(name,selector,prepare)=>{for(const width of [390,1280]){await viewport(width);await new Promise(r=>setTimeout(r,900)); // let responsive charts re-measure after a resize
 for(const [label,theme] of themes){await evaluate(({theme})=>{document.documentElement.dataset.theme=theme;},{theme});if(prepare)await prepare(width);await new Promise(r=>setTimeout(r,250));await shoot(`${name}-${width<600?'mobile':'desktop'}-${label}`,selector,width);}}await evaluate(()=>{document.documentElement.dataset.theme='iridescent';});};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await viewport(1280);
 const signIn=must(await admin.auth.admin.generateLink({type:'magiclink',email:a.email}));
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${encodeURIComponent(signIn.properties.hashed_token)}&type=email&next=${encodeURIComponent('/nourish?view=goals')}`});
 await until(()=>!!document.querySelector('.muse-wellness-goals .muse-goal-card'),'Wellness → Goals loads with goal cards');

 // ---------- Goals: planned nutrition, historical targets, missing vs completed ----------
 const goalsText=await evaluate(()=>document.querySelector('.muse-wellness-goals').innerText);
 assert.match(goalsText,/Protein \(planned\)/);assert.match(goalsText,/From planned meals, not confirmed intake/);assert.match(goalsText,new RegExp(`By month[\\s\\S]*${today.slice(0,4)}`),'year label resolves');
 assert.ok(await evaluate(()=>{const card=[...document.querySelectorAll('.muse-goal-card')].find(c=>c.innerText.includes('Protein (planned)'));return !!card&&!/^(Met|Below target)$/.test(card.querySelector('.muse-goal-chip').textContent.trim());}),'Planned nutrition never shows a plain Met/Below target chip');
 assert.ok(await evaluate(()=>[...document.querySelectorAll('.muse-goal-card')].some(c=>c.innerText.includes('Workouts · per week')&&[...c.querySelectorAll('.muse-goal-strip li')].some(li=>li.title.includes('of 3 sessions'))&&[...c.querySelectorAll('.muse-goal-strip li')].some(li=>li.title.includes('of 4 sessions')))),'Strip shows earlier weeks against their earlier target');
 assert.ok(await evaluate(()=>{const h=document.querySelector('.muse-goal-card-hydration');return !!h.querySelector('li[data-status="unknown"]')&&!!h.querySelector('li[data-status="missed"]')&&!!h.querySelector('li[data-status="achieved"]');}),'Hydration distinguishes no record, below goal and met');
 await capture('goals','.muse-wellness-goals');
 // Create, edit within the period, pause, resume and retire through the UI; confirm each on the server.
 await click('Add a goal');await until(()=>!!document.querySelector('#wellness-goal-editor[open]'),'Goal editor opens');
 await capture('goal-editor','#wellness-goal-editor');
 await setValue('#wellness-goal-editor select','cardio-workouts');await setValue('#wellness-goal-editor input[type=number]','2');await click('Add goal','#wellness-goal-editor button');
 await until(()=>[...document.querySelectorAll('.muse-goal-card')].some(c=>c.innerText.includes('Cardio workouts')),'New goal card appears');
 const cardio=async()=>{for(let i=0;i<40;i++){const s=await readWellness(a.c);const g=s.state.goals.find(g=>g.metric==='cardio-workouts');if(g)return g;await new Promise(r=>setTimeout(r,150));}assert.fail('Cardio goal saved');};
 assert.equal(goals.currentVersion(await cardio()).target,2);
 const onCard=async(label,text)=>{assert.ok(await evaluate(({label,text})=>{const c=[...document.querySelectorAll('.muse-goal-card')].find(c=>c.innerText.includes(label));const b=c&&[...c.querySelectorAll('button')].find(b=>b.textContent.trim()===text);if(!b)return false;b.click();return true;},{label,text}),`${text} on ${label}`);};
 await onCard('Cardio workouts','Edit target');await until(()=>!!document.querySelector('#wellness-goal-editor[open]'),'Edit opens');await setValue('#wellness-goal-editor input[type=number]','3');await click('Save target','#wellness-goal-editor button');
 for(let i=0;i<40&&goals.currentVersion(await cardio()).target!==3;i++)await new Promise(r=>setTimeout(r,150));
 assert.deepEqual((await cardio()).versions.map(v=>v.target),[3],'a same-period edit replaces this period’s version');
 await onCard('Cardio workouts','Pause');await until(()=>[...document.querySelectorAll('.muse-goal-card')].some(c=>c.innerText.includes('Cardio workouts')&&c.querySelector('.muse-goal-chip').textContent==='Paused'),'Paused chip');
 for(let i=0;i<40&&goals.currentVersion(await cardio()).status!=='paused';i++)await new Promise(r=>setTimeout(r,150));assert.equal(goals.currentVersion(await cardio()).status,'paused');
 await onCard('Cardio workouts','Resume');for(let i=0;i<40&&goals.currentVersion(await cardio()).status!=='active';i++)await new Promise(r=>setTimeout(r,150));
 await onCard('Cardio workouts','Retire');await until(()=>document.querySelector('.muse-goals-retired')?.textContent.includes('Cardio workouts'),'Retired goal moves to Retired goals');
 for(let i=0;i<40&&goals.currentVersion(await cardio()).status!=='inactive';i++)await new Promise(r=>setTimeout(r,150));assert.equal(goals.currentVersion(await cardio()).status,'inactive');
 console.log('Local browser: goals create/edit/pause/resume/retire persisted; historical targets, unknown vs missed, and planned nutrition wording verified.');

 // ---------- Daily Edit: Movement management, durations, Goals card, Little Rituals ----------
 await go('/',()=>!!document.querySelector('.movement-card')&&!!document.querySelector('.muse-goals-glance'),'Daily Edit loads with the Goals card');
 assert.match(await evaluate(()=>document.querySelector('.muse-goals-glance').innerText),/Protein \(planned\)[\s\S]*Plan/);
 await capture('daily-goals-card','.muse-goals-glance');
 await capture('little-rituals','.muse-little-rituals');
 await click('Manage','.movement-card button');await until(()=>!!document.querySelector('#movement-menu .managed-type-category'),'Category controls appear under Manage');
 await capture('movement-manage','#movement-menu');
 await evaluate(({dance})=>{const s=document.querySelector(`#movement-menu select[aria-label="Category for Dance"]`);Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'cardio');s.dispatchEvent(new Event('change',{bubbles:true}));},{dance});
 for(let i=0;i<40;i++){const s=await readWellness(a.c);if(s.state.types.find(t=>t.id===dance).category==='cardio')break;await new Promise(r=>setTimeout(r,150));}
 assert.equal((await readWellness(a.c)).state.types.find(t=>t.id===dance).category,'cardio','category saves to the movement type');
 await click('Done','#movement-menu button');
 await click('Completed · Review','.movement-card button');await until(()=>!!document.querySelector('#movement-menu .muse-movement-duration input'),'Duration field in completion review');
 await capture('movement-completion','#movement-menu');
 const upperToday=(await readWellness(a.c)).state.activities.find(x=>x.date===today);
 await evaluate(()=>document.querySelector('#movement-menu .muse-movement-duration input').focus());await setValue('#movement-menu .muse-movement-duration input','50');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 for(let i=0;i<40;i++){const s=await readWellness(a.c);if(s.state.activities.find(x=>x.id===upperToday.id).durationMinutes===50)break;await new Promise(r=>setTimeout(r,150));}
 assert.equal((await readWellness(a.c)).state.activities.find(x=>x.id===upperToday.id).durationMinutes,50,'duration saves on the same activity record');
 console.log('Local browser: Daily Edit Goals card, movement categories and durations persisted on the authoritative records.');

 // ---------- Rituals: connected values, source changes, editor, disconnect ----------
 await go('/rituals',()=>document.querySelectorAll('[data-connected="true"]').length>0,'Rituals shows connected cells');
 const cellLabel=(name,date)=>evaluate(({name,date})=>[...document.querySelectorAll('[data-connected="true"],.muse-ritual-cell-control')].map(e=>e.getAttribute('aria-label')??'').find(l=>l.startsWith(name+', ')&&l.includes(date))??'',{name,date});
 const dayLabel=d=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
 assert.match(await cellLabel('Drink 80 oz',dayLabel(today)),/Connected — Water · Wellness: 40 oz from 1 record/);
 assert.match(await cellLabel('Clear 5 tasks a week',dayLabel(today)),/Tasks completed · Planner: 2 tasks/);
 const readDay=shiftDate(today,-1);if(weekDates(today).includes(readDay))assert.match(await cellLabel('Read 20 minutes',dayLabel(readDay)),/complete[\s\S]*Reading time · Collections: 28 min/);
 await capture('rituals-week','.muse-ritual-groups');
 // Source changes recalculate: log water elsewhere, complete another task, then delete today's workout.
 snap=await readWellness(a.c);await saveW(wellnessReducer(snap.state,{kind:'water',date:today,mode:'add',amount:45,settings:{goal:80,unit:'oz',quickAdds:[8,16]}}));
 planner=await readPlanner(a.c);await act({type:'task/toggle',id:tasks[2].id,now:now()});
 snap=await readWellness(a.c);await saveW(wellnessReducer(snap.state,{kind:'activity/remove',id:upperToday.id}));
 await send('Page.reload');await until(()=>document.querySelectorAll('[data-connected="true"]').length>0,'Rituals reloads');
 await until(({label})=>[...document.querySelectorAll('[data-connected="true"]')].some(e=>e.getAttribute('aria-label').startsWith('Drink 80 oz')&&e.getAttribute('aria-label').includes(label)&&e.getAttribute('aria-label').includes('85 oz')),'Water ritual follows the new hydration total',{label:dayLabel(today)});
 assert.match(await cellLabel('Clear 5 tasks a week',dayLabel(today)),/3 tasks/,'tasks ritual follows Planner');
 assert.doesNotMatch(await cellLabel('Strength 2× a week',dayLabel(today)),/from \d+ record/,'deleted workout no longer counts');
 // Editor shows the connection; switching to manual stores exactly what was shown.
 const viewBefore=connections.withConnections((await readRituals(a.c)).state,{timeZone:zone,wellness:(await readWellness(a.c)).state},today);
 const shown=[...viewBefore.derived.values()].filter(v=>v.ritualId===hydrate.id).map(v=>[v.date,v.value]).sort();
 await click('Drink 80 oz','.muse-ritual-name');
 await until(()=>!!document.querySelector('.muse-ritual-tracking'),'Ritual editor opens with Tracking');
 assert.ok(await evaluate(()=>document.querySelector('.muse-ritual-tracking [aria-pressed="true"]').textContent.includes('Connected')),'Editor shows the connected mode');
 await capture('ritual-editor','.muse-drawer');
 await click('I check it off','.muse-ritual-tracking button');await click('Save ritual','.muse-drawer button');
 let after;for(let i=0;i<40;i++){after=await readRituals(a.c);if(after.state.rituals.find(r=>r.id===hydrate.id).connection===null)break;await new Promise(r=>setTimeout(r,150));}
 assert.equal(after.state.rituals.find(r=>r.id===hydrate.id).connection,null,'ritual disconnects');
 assert.deepEqual(after.state.entries.filter(e=>e.ritualId===hydrate.id).map(e=>[e.date,Number(e.value)]).sort(),shown,'history shown while connected is kept as manual entries');
 console.log('Local browser: connected cells for water, workouts, reading and tasks; recalculation after source edits/deletion; editor and lossless disconnect verified.');

 // ---------- Insights ----------
 await go('/insights',()=>[...document.querySelectorAll('.muse-across-label')].some(e=>e.textContent==='Reading time'),'Insights Overview shows Across Muse once reading has loaded');
 const across=await evaluate(()=>[...document.querySelectorAll('.muse-across-label')].map(e=>e.textContent));
 for(const label of ['Tasks completed','Full ritual goals','Workouts recorded','Workout minutes','Reading time'])assert.ok(across.includes(label),`Across Muse includes ${label}`);
 await capture('insights-across','.muse-insight-across');
 await go('/insights?view=nourish',()=>document.body.innerText.includes('Goals in this range'),'Insights Wellness shows goals');
 assert.match(await evaluate(()=>document.body.innerText),/Plan met \d+ of \d+|Protein \(planned\)/);
 await capture('insights-wellness','.muse-insight-sections');
 await go('/insights?view=mood',()=>document.body.innerText.includes('Connections across Muse'),'Insights Mood shows connections');
 assert.match(await evaluate(()=>[...document.querySelectorAll('.muse-insight-panel')].find(p=>p.innerText.includes('Connections across Muse')).innerText),/Needs at least five|Mean/);
 await evaluate(()=>{const p=[...document.querySelectorAll('.muse-insight-panel')].find(p=>p.innerText.includes('Connections across Muse'));p.id='qa-connections';});
 await capture('insights-connections','#qa-connections');
 await click('Customize','.muse-insight-action');await until(()=>!!document.querySelector('#insights-customize[open]'),'Customize opens');
 await capture('insights-customize','#insights-customize');
 await click('Money','#insights-customize .choice-button');await click('Save','#insights-customize button');await until(()=>!document.querySelector('#insights-customize[open]'),'Customize saves');
 assert.ok(!(await evaluate(()=>[...document.querySelectorAll('.muse-section-nav a, nav a')].some(a=>a.textContent.trim()==='Money'&&a.getAttribute('href')?.includes('insights')))),'Hidden section leaves the Insights nav');
 assert.deepEqual(must(await a.c.auth.getUser()).user.user_metadata.muse_insights_preferences.hidden,['money'],'preference saved to the account');
 console.log('Local browser: Across Muse, Wellness goals, Connections and Customize verified.');

 // ---------- Isolation, compatibility and recap facts ----------
 const b=await account('wellness-ui-other');const other=await readWellness(b.c);
 assert.deepEqual(other.state.goals,[]);assert.deepEqual(must(await b.c.from('wellness_goals').select('id')),[]);assert.deepEqual(must(await b.c.from('rituals').select('id')),[]);
 assert.equal((await readRituals(b.c)).state.rituals.length,0);
 const fresh=await readWellness(a.c),ritFresh=await readRituals(a.c),whimsy=await readWhimsy(a.c),money=await readMoney(a.c);
 assert.equal(fresh.state.assignments.length,assignments.length,'existing meal plans untouched');assert.equal(fresh.state.water.length,water.length,'existing hydration untouched');
 const view=connections.withConnections(ritFresh.state,{timeZone:zone,wellness:fresh.state,planner:planner.state,reading:{sessions:whimsy.sessions,books:whimsy.books}},today).state;
 const input=persistedInsights({planner:planner.state,rituals:view,wellness:fresh.state,money:money.state,days:{},influences:[],timeZone:zone,today});
 const range={start:shiftDate(today,-27),end:today};
 const facts=recapFacts({metrics:calculateInsights({...input,whimsy:undefined},range),sources:{timeZone:zone,wellness:fresh.state,planner:planner.state},goals:fresh.state.goals,today});
 const expectedWorkouts=fresh.state.activities.filter(x=>x.date>=range.start&&x.date<=today).length;
 assert.equal(facts.wellness.workouts,expectedWorkouts);assert.equal(facts.tasks.completed,3);assert.equal(facts.reading,null,'reading not supplied, so not reported as zero');
 assert.ok(facts.wellness.goals.some(g=>g.basis==='planned'),'recap keeps planned basis');
 assert.ok([...hosts].every(h=>['localhost','127.0.0.1'].includes(h)),`Browser stayed local: ${[...hosts].join(', ')}`);
 assert.deepEqual(errors,[],'No uncaught browser exceptions');
 console.log(`Leave-page prompts seen: ${dialogs.length?dialogs.join(', '):'none'}.`);
 console.log(`PASS authenticated local Wellness/Rituals/Insights QA: goals lifecycle, historical targets, unknown vs missed, planned nutrition, categories/durations, four connected trackers with recalculation, lossless disconnect, Insights panels and preferences, isolation, data compatibility and recap facts. ${captured} screenshots in ${shots}.`);
}finally{
 for(const id of users)must(await admin.auth.admin.deleteUser(id));console.log('Disposable QA accounts removed.');
 try{socket?.close();}catch{}chrome?.kill();await new Promise(r=>setTimeout(r,500));try{rmSync(directory,{recursive:true,force:true,maxRetries:5});}catch{}
}
