import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {load,root} from './helpers.mjs';
const require=createRequire(import.meta.url);
// Server modules import "server-only", which throws outside Next's server build; stub it for Node tests.
require.cache[require.resolve('server-only')]={id:'server-only',filename:require.resolve('server-only'),loaded:true,exports:{}};
const read=p=>readFileSync(`${root}/${p}`,'utf8');
const R=load('lib/google/write-rules');

/* ---------- A small in-memory stand-in for the Supabase admin client (only what the Google modules use). ---------- */
function fakeAdmin(seed){
 const db=structuredClone(seed);
 const match=(row,filters)=>filters.every(([k,op,v])=>op==='eq'?row[k]===v:op==='neq'?row[k]!==v:op==='in'?v.includes(row[k]):true);
 return {db,from(table){
  db[table]??=[];
  const q={table,filters:[],op:'select',payload:null,single:false,maybe:false,ret:false};
  const b={
   select(){if(q.op!=='select')q.ret=true;return b;},eq(k,v){q.filters.push([k,'eq',v]);return b;},neq(k,v){q.filters.push([k,'neq',v]);return b;},in(k,v){q.filters.push([k,'in',v]);return b;},
   or(){return b;},order(){return b;},limit(){return b;},
   maybeSingle(){q.maybe=true;return b;},single(){q.single=true;return b;},
   insert(rows){q.op='insert';q.payload=[].concat(rows);return b;},update(p){q.op='update';q.payload=p;return b;},
   upsert(rows,o){q.op='upsert';q.payload=[].concat(rows);q.conflict=o?.onConflict?.split(',');return b;},delete(){q.op='delete';return b;},
   then(res,rej){return Promise.resolve(run()).then(res,rej);},
  };
  function run(){
   const rows=db[table];let out;
   if(q.op==='insert'){out=q.payload.map(r=>({id:crypto.randomUUID(),...r}));rows.push(...out);}
   else if(q.op==='upsert'){out=q.payload.map(r=>{const i=rows.findIndex(x=>q.conflict.every(k=>x[k]===r[k]));if(i>=0){rows[i]={...rows[i],...r};return rows[i];}const n={id:crypto.randomUUID(),...r};rows.push(n);return n;});}
   else if(q.op==='update'){out=rows.filter(r=>match(r,q.filters));out.forEach(r=>Object.assign(r,q.payload));}
   else if(q.op==='delete'){out=rows.filter(r=>match(r,q.filters));db[table]=rows.filter(r=>!match(r,q.filters));}
   else out=rows.filter(r=>match(r,q.filters));
   if(q.single||q.maybe)return {data:out[0]??null,error:q.single&&!out[0]?{message:'none'}:null};
   return {data:out,error:null};
  }
  return b;
 }};
}
/** Google's API, scripted per test: each call is answered by the first matching route; calls are recorded. */
function fakeGoogle(routes){
 const calls=[];
 globalThis.fetch=async(url,init={})=>{
  const method=init.method??'GET',u=String(url);calls.push({method,url:u,headers:init.headers??{},body:init.body?JSON.parse(init.body):null});
  if(u.startsWith('https://oauth2.googleapis.com/token'))return new Response(JSON.stringify({access_token:'fresh',expires_in:3600}),{status:200});
  const route=routes.find(r=>r.method===method&&u.includes(r.path)&&(!r.when||r.when(calls)));
  if(!route)return new Response('{}',{status:500});
  const res=typeof route.reply==='function'?route.reply(calls):route.reply;
  return new Response(res.status===204?null:JSON.stringify(res.body??{}),{status:res.status});
 };
 return calls;
}
const USER='11111111-1111-4111-8111-111111111111',CONN='22222222-2222-4222-8222-222222222222',MUSE='33333333-3333-4333-8333-333333333333';
const WRITE='https://www.googleapis.com/auth/calendar.events',READ='https://www.googleapis.com/auth/calendar.readonly';
function seed({scopes=[READ,WRITE],role='owner',status='active',link=null,cached=[]}={}){
 process.env.GOOGLE_TOKEN_KEY=Buffer.alloc(32,7).toString('base64');process.env.GOOGLE_CLIENT_ID='id';process.env.GOOGLE_CLIENT_SECRET='secret';
 const {seal}=load('lib/google/crypto');
 return {google_connections:[{id:CONN,user_id:USER,scopes,status,last_synced_at:null}],
  google_tokens:[{connection_id:CONN,refresh_ciphertext:seal('r'),access_ciphertext:seal('access'),access_expires_at:new Date(Date.now()+3600e3).toISOString()}],
  google_calendars:[{connection_id:CONN,calendar_id:'primary',access_role:role,visible:true,sync_token:null}],
  profiles:[{id:USER,time_zone:'America/Los_Angeles'}],
  planner_events:[{id:MUSE,user_id:USER,title:'Dentist',local_date:'2026-11-20',local_time:'09:30:00',all_day:false,end_date:null,end_time:'10:30:00',location:'Main St',detail:null,status:'confirmed',time_zone:'America/Los_Angeles',recurrence_rule:null}],
  google_event_links:link?[link]:[],google_events:cached};
}
const fields={title:'Coffee',date:'2026-11-20',endDate:null,allDay:false,time:'09:00',endTime:null,location:null,description:null,timeZone:'America/Los_Angeles'};
const W=()=>load('lib/google/write');

test('rules: Muse picks Google ids, so the same request or Muse event can never become two Google events',()=>{
 assert.equal(R.linkedGoogleId(MUSE),R.linkedGoogleId(MUSE));assert.match(R.linkedGoogleId(MUSE),R.GOOGLE_ID);
 assert.notEqual(R.createdGoogleId(MUSE),R.linkedGoogleId(MUSE),'a direct create and a mirrored copy never collide');assert.match(R.createdGoogleId(MUSE),R.GOOGLE_ID);
 assert.throws(()=>R.linkedGoogleId('not-a-uuid'));
});
test('rules: all-day ends are exclusive in Google; timed events default to an hour, across midnight too',()=>{
 assert.deepEqual(R.googleBody({...fields,allDay:true,time:null,endDate:'2026-11-22'}).end,{date:'2026-11-23'});
 assert.equal(R.googleBody(fields).end.dateTime,'2026-11-20T10:00:00');assert.equal(R.googleBody(fields).start.timeZone,'America/Los_Angeles');
 assert.equal(R.googleBody({...fields,time:'23:30'}).end.dateTime,'2026-11-21T00:30:00');
 assert.equal(R.validFields({...fields,title:' '}),'Give the event a title.');assert.equal(R.validFields({...fields,timeZone:'Mars/Base'}),'Unknown time zone.');
});
test('rules: a canceled Muse event stays in Google (marked), never deleted there without asking; repeating events are not mirrored',()=>{
 const f=R.museFields({title:'Party',local_date:'2026-12-01',local_time:null,all_day:true,end_date:null,end_time:null,location:null,detail:null,status:'canceled',time_zone:null},'UTC');
 assert.equal(f.title,'Canceled · Party');assert.equal(R.googleBody(f).status,'confirmed');
 assert.equal(R.canMirror({recurrence_rule:{freq:'weekly'}}),false);assert.equal(R.canMirror({recurrence_rule:null}),true);
});
test('rules: Google answers become plain outcomes (authorization, conflicts, already done)',()=>{
 assert.equal(R.classify(409,'create'),'exists');assert.equal(R.classify(412,'update'),'conflict');assert.equal(R.classify(410,'delete'),'gone');
 assert.equal(R.classify(401,'update'),'reconnect');assert.equal(R.classify(403,'update',{error:{errors:[{reason:'insufficientPermissions'}]}}),'needs-write');
 assert.equal(R.classify(403,'update',{error:{errors:[{reason:'rateLimitExceeded'}]}}),'failed');assert.equal(R.classify(503,'create'),'failed');
});
test('rules: sync turns edits and deletions made in Google into a conflict or missing, never an overwrite',()=>{
 assert.equal(R.reconcileLink({state:'synced',etag:'"1"'},{etag:'"2"'},false),'conflict');
 assert.equal(R.reconcileLink({state:'synced',etag:'"1"'},{etag:'"1"'},false),'synced');
 assert.equal(R.reconcileLink({state:'synced',etag:'"1"'},null,true),'missing');
 assert.equal(R.reconcileLink({state:'error',etag:null},{etag:'"2"'},false),'error');
 assert.equal(R.retryable('error'),true);assert.equal(R.retryable('conflict'),false);assert.equal(R.retryable('missing'),false);
});

test('authorization: writes need the calendar.events grant and a calendar you can edit; read-only stays read-only',async()=>{
 const {createGoogleEvent,GoogleWriteError}=W();
 fakeGoogle([]);
 await assert.rejects(createGoogleEvent(fakeAdmin(seed({scopes:[READ]})),USER,{connectionId:CONN,calendarId:'primary',key:MUSE,fields}),e=>e instanceof GoogleWriteError&&e.code==='needs-write');
 await assert.rejects(createGoogleEvent(fakeAdmin(seed({role:'reader'})),USER,{connectionId:CONN,calendarId:'primary',key:MUSE,fields}),e=>e.code==='not-writable');
 await assert.rejects(createGoogleEvent(fakeAdmin(seed({status:'needs-reconnect'})),USER,{connectionId:CONN,calendarId:'primary',key:MUSE,fields}),e=>e.code==='reconnect');
 await assert.rejects(createGoogleEvent(fakeAdmin(seed()),'99999999-9999-4999-8999-999999999999',{connectionId:CONN,calendarId:'primary',key:MUSE,fields}),e=>e.code==='not-found','another user\'s connection is invisible');
 const oauth=read('lib/google/oauth.ts');assert.match(oauth,/WRITE_SCOPES = \[\.\.\.READ_SCOPES, CALENDAR_WRITE\]/);assert.match(oauth,/include_granted_scopes: "true"/);
 assert.match(read('app/api/google/connect/route.ts'),/authUrl\(state, write\)/);assert.match(read('app/api/google/callback/route.ts'),/grantsCalendarWrite\(t\.scope\) \? "editing" : "no-write"/);
});
test('duplicate prevention: a retried create finds the event it already made instead of adding another',async()=>{
 const {createGoogleEvent}=W(),admin=fakeAdmin(seed()),id=R.createdGoogleId(MUSE);
 const calls=fakeGoogle([{method:'POST',path:'/calendars/primary/events',reply:{status:409}},{method:'GET',path:`/events/${id}`,reply:{status:200,body:{id,etag:'"7"',summary:'Coffee',start:{dateTime:'2026-11-20T17:00:00Z'},end:{dateTime:'2026-11-20T18:00:00Z'}}}}]);
 const r=await createGoogleEvent(admin,USER,{connectionId:CONN,calendarId:'primary',key:MUSE,fields});
 assert.equal(r.eventId,id);assert.equal(calls.filter(c=>c.method==='POST').length,1);assert.equal(calls[0].body.id,id,'the id travels with the create');
 assert.equal(admin.db.google_events.length,1,'cached once');assert.equal(admin.db.google_events[0].start_date,'2026-11-20');
});
test('conflicts: an edit made in Google since you opened it is reported with Google\'s version, not overwritten',async()=>{
 const {updateGoogleEvent}=W(),admin=fakeAdmin(seed());
 const calls=fakeGoogle([{method:'PATCH',path:'/events/abc12',reply:{status:412}},{method:'GET',path:'/events/abc12',reply:{status:200,body:{id:'abc12',etag:'"9"',summary:'Moved in Google',start:{dateTime:'2026-11-21T17:00:00Z'},end:{dateTime:'2026-11-21T18:00:00Z'}}}}]);
 await assert.rejects(updateGoogleEvent(admin,USER,{connectionId:CONN,calendarId:'primary',eventId:'abc12',etag:'"3"',fields}),e=>{assert.equal(e.code,'conflict');assert.equal(e.remote.fields.title,'Moved in Google');assert.equal(e.remote.etag,'"9"');return true;});
 assert.equal(calls.find(c=>c.method==='PATCH').headers['if-match'],'"3"','the edit carried the version you saw');
});
test('deletes: confirmed in the route, version-checked, and an already-deleted event counts as done',async()=>{
 const route=read('app/api/google/events/route.ts');assert.match(route,/case "delete": \{ if \(!located \|\| !text\(body\.eventId, 1024\) \|\| body\.confirmed !== true\)/);
 assert.match(route,/body\.deleteInGoogle === true && body\.confirmed !== true/);
 const {deleteGoogleEvent}=W(),admin=fakeAdmin(seed({cached:[{connection_id:CONN,calendar_id:'primary',event_id:'gone1',etag:'"1"'}]}));
 fakeGoogle([{method:'DELETE',path:'/events/gone1',reply:{status:410}}]);
 assert.deepEqual(await deleteGoogleEvent(admin,USER,{connectionId:CONN,calendarId:'primary',eventId:'gone1',etag:'"1"'}),{deleted:true});
 assert.equal(admin.db.google_events.length,0);
});
test('recurring: one occurrence is edited by its own instance id; repeating Muse events are not pushed',async()=>{
 const {updateGoogleEvent,pushMuseEvent}=W(),admin=fakeAdmin(seed()),instance='weekly1_20261120T170000Z'.toLowerCase();
 const calls=fakeGoogle([{method:'PATCH',path:`/events/${instance}`,reply:{status:200,body:{id:instance,etag:'"2"',recurringEventId:'weekly1',summary:'Coffee',start:{dateTime:'2026-11-20T17:00:00Z'},end:{dateTime:'2026-11-20T18:00:00Z'}}}}]);
 await updateGoogleEvent(admin,USER,{connectionId:CONN,calendarId:'primary',eventId:instance,etag:'"1"',fields});
 assert.ok(calls[0].url.endsWith(`/events/${instance}`),'never the series');assert.equal(admin.db.google_events[0].recurring_event_id,'weekly1');
 admin.db.planner_events[0].recurrence_rule={freq:'weekly'};
 await assert.rejects(pushMuseEvent(admin,USER,{museEventId:MUSE,connectionId:CONN,calendarId:'primary'}),e=>e.code==='invalid');
 assert.equal(admin.db.google_event_links.length,0);
});
test('failed writes never lose the Muse event: the copy records its state and is retried later',async()=>{
 const {pushMuseEvent,retryLinks}=W(),admin=fakeAdmin(seed()),before=structuredClone(admin.db.planner_events);
 fakeGoogle([{method:'POST',path:'/calendars/primary/events',reply:{status:503}}]);
 await assert.rejects(pushMuseEvent(admin,USER,{museEventId:MUSE,connectionId:CONN,calendarId:'primary'}),e=>e.code==='failed');
 assert.deepEqual(admin.db.planner_events,before,'the Muse event is untouched');
 assert.equal(admin.db.google_event_links[0].state,'error');assert.match(admin.db.google_event_links[0].last_error,/Nothing in Muse was lost/);
 const calls=fakeGoogle([{method:'POST',path:'/calendars/primary/events',reply:{status:200,body:{id:R.linkedGoogleId(MUSE),etag:'"1"',summary:'Dentist',start:{dateTime:'2026-11-20T17:30:00Z'},end:{dateTime:'2026-11-20T18:30:00Z'}}}}]);
 assert.equal(await retryLinks(admin,{limit:10}),1);assert.equal(admin.db.google_event_links[0].state,'synced');assert.equal(admin.db.google_event_links[0].etag,'"1"');
 assert.equal(calls[0].body.id,R.linkedGoogleId(MUSE),'the retry reuses the same Google id');assert.equal(calls[0].body.summary,'Dentist');
});
test('linked copies: edits carry the last etag; a Google-side change becomes a conflict; "keep Muse" writes over the version you saw',async()=>{
 const {pushMuseEvent}=W(),gid=R.linkedGoogleId(MUSE);
 const link={id:'l1',user_id:USER,muse_event_id:MUSE,connection_id:CONN,calendar_id:'primary',google_event_id:gid,etag:'"1"',state:'synced'};
 let admin=fakeAdmin(seed({link}));
 fakeGoogle([{method:'PATCH',path:`/events/${gid}`,reply:{status:412}},{method:'GET',path:`/events/${gid}`,reply:{status:200,body:{id:gid,etag:'"5"',summary:'Dentist (moved)',start:{dateTime:'2026-11-21T17:30:00Z'}}}}]);
 await assert.rejects(pushMuseEvent(admin,USER,{museEventId:MUSE}),e=>e.code==='conflict');
 assert.equal(admin.db.google_event_links[0].state,'conflict');
 const calls=fakeGoogle([{method:'GET',path:`/events/${gid}`,reply:{status:200,body:{id:gid,etag:'"5"',summary:'Dentist (moved)',start:{dateTime:'2026-11-21T17:30:00Z'}}}},{method:'PATCH',path:`/events/${gid}`,reply:{status:200,body:{id:gid,etag:'"6"',summary:'Dentist',start:{dateTime:'2026-11-20T17:30:00Z'}}}}]);
 await pushMuseEvent(admin,USER,{museEventId:MUSE,force:true});
 assert.equal(calls.find(c=>c.method==='PATCH').headers['if-match'],'"5"','overwrites only the version just reviewed');
 assert.equal(admin.db.google_event_links[0].state,'synced');
});
test('sync: Agenda hides a Muse event\'s Google copy (shown once), background sync is secret-only and budgeted',()=>{
 const store=read('components/google/GoogleCalendarStore.ts');assert.match(store,/s\.calendars\.filter\(\(c\) => c\.visible && writableRole\(c\.access_role\)\)/,'hidden calendars are never write targets');assert.match(store,/mirrored\.has\(`\$\{key\}\|\$\{r\.event_id\}`\)/);assert.doesNotMatch(store,/google_tokens|refresh|GOOGLE_/);
 const cron=read('app/api/google/cron/route.ts');assert.match(cron,/timingSafeEqual/);assert.match(cron,/secret\.length < 32/);assert.match(cron,/status: 404/);
 assert.match(read('lib/auth/paths.ts'),/"\/api\/google\/cron"/);
 const sql=read('supabase/migrations/20261202000300_google_calendar_write.sql');
 assert.match(sql,/cron\.schedule\('muse-google-sync', '\*\/30 \* \* \* \*'/);assert.match(sql,/if target is null or secret is null/);
 assert.match(sql,/'x-vercel-protection-bypass', bypass/,'Preview behind Vercel protection can be reached with the automation bypass');
 assert.match(sql,/grant select on public\.google_event_links to authenticated;/);assert.doesNotMatch(sql,/grant[^;]*(insert|update|delete)[^;]*google_event_links to authenticated/);
 assert.match(sql,/muse_event_id uuid not null unique references public\.planner_events on delete cascade/);
 const sync=read('lib/google/sync.ts');assert.match(sync,/Date\.now\(\) - started > budget/);assert.match(sync,/neq\("status", "needs-reconnect"\)/);
 for(const f of ['lib/google/write.ts','lib/google/access.ts'])assert.match(read(f),/^import "server-only";/);
});

test('callback diagnostics: the failing step and a short error code are logged and shown, never codes, tokens or personal data',()=>{
 const cb=read('app/api/google/callback/route.ts');
 for(const step of ['token-exchange','identity','admin-client','save-connection','encrypt-tokens','save-tokens'])assert.match(cb,new RegExp(`"${step}"`),step);
 assert.match(cb,/console\.error\(JSON\.stringify\(\{ event: "google_callback_failed", step, reason \}\)\)/);
 assert.doesNotMatch(cb,/console\.[a-z]+\([^)]*(code\b|refresh_token|access_token|email|who\.)/,'nothing sensitive is logged');
 assert.match(cb,/replace\(\/\[\^a-z0-9:_-\]\/gi, ""\)/,'the outcome shown in the URL is sanitized');
 assert.match(read('lib/google/oauth.ts'),/googleError: typeof j\.error === "string" \? j\.error\.slice\(0, 40\)/);
 assert.match(read('components/google/GoogleCalendarSettings.tsx'),/Details for support/);
});

test('Settings: access is a status pill, Allow editing and Refresh now are real buttons; OAuth links unchanged',()=>{
 const s=read('components/google/GoogleCalendarSettings.tsx');
 assert.match(s,/editing \? "View & edit enabled" : "View only"/);
 assert.match(s,/<a className="muse-button muse-google-allow" href=\{allowEditingHref\("\/settings"\)\}>Allow editing<\/a>/);
 assert.match(s,/className="muse-button muse-google-refresh"/);assert.doesNotMatch(s,/button-ghost" disabled=\{s\.syncing\}/);
});
