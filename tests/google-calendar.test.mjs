import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {load,root} from './helpers.mjs';import ts from 'typescript';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function serverModule(path){const m={exports:{}};const code=ts.transpileModule(readFileSync(`${root}/${path}`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(n=>n==='server-only'?{}:require(n),m,m.exports);return m.exports;}
const read=p=>readFileSync(`${root}/${p}`,'utf8');
const {toRow,toDayEvent,isGoogleEvent}=load('lib/google/events'),{defaultVisible,syncWindow,connectionStatus}=load('lib/google/calendars');

test('timed Google events land on the local date and clock of the Muse profile time zone',()=>{
 const r=toRow('primary',{id:'a',etag:'"1"',summary:'Dinner',start:{dateTime:'2026-11-09T03:30:00Z'},end:{dateTime:'2026-11-09T05:00:00Z'}},'America/Los_Angeles');
 assert.equal(r.start_date,'2026-11-08');assert.equal(r.start_time,'19:30');assert.equal(r.end_time,'21:00');assert.equal(r.end_date,null);assert.equal(r.all_day,false);
 const e=toDayEvent(r,{name:'Personal',color:'#9fe1e7'});
 assert.equal(e.time,'7:30 PM');assert.equal(e.dateTime,'2026-11-08T19:30');assert.equal(e.source,'google');assert.equal(e.calendarName,'Personal');assert.ok(isGoogleEvent(e));
});
test('all-day Google events use an inclusive end date, matching Muse multi-day events',()=>{
 const one=toRow('c',{id:'b',start:{date:'2026-11-10'},end:{date:'2026-11-11'}},'UTC'),three=toRow('c',{id:'c',start:{date:'2026-11-10'},end:{date:'2026-11-13'}},'UTC');
 assert.equal(one.end_date,null);assert.equal(three.end_date,'2026-11-12');assert.equal(toDayEvent(three).time,'All day');assert.equal(toDayEvent(three).allDay,true);
});
test('cancelled or unusable Google events are removals, never rows',()=>{
 assert.equal(toRow('c',{id:'x',status:'cancelled'},'UTC'),null);assert.equal(toRow('c',{id:'y'},'UTC'),null);
 assert.equal(toRow('c',{id:'z',summary:'',start:{date:'2026-01-01'}},'UTC').title,'');assert.equal(toRow('c',{id:'z',start:{date:'2026-01-01'}},'UTC').title,'(No title)');
});
test('Google event ids are stable per calendar so a re-sync never duplicates',()=>{
 const r=toRow('work',{id:'evt_20261110',start:{date:'2026-11-10'}},'UTC');assert.equal(toDayEvent(r).id,toDayEvent({...r}).id);assert.equal(toDayEvent(r).id,'google:work:evt_20261110');
 assert.match(read('supabase/migrations/20261128000100_google_calendar.sql'),/unique \(connection_id, calendar_id, event_id\)/);
});
test('new calendars: primary and owned show, shared and subscribed start hidden',()=>{
 assert.equal(defaultVisible({primary:true,accessRole:'owner'}),true);assert.equal(defaultVisible({accessRole:'owner'}),true);
 assert.equal(defaultVisible({accessRole:'reader'}),false);assert.equal(defaultVisible({accessRole:'owner',hidden:true}),false);
 const w=syncWindow(new Date('2026-11-08T00:00:00Z'));assert.equal(w.timeMin.slice(0,10),'2026-09-09');assert.equal(w.timeMax.slice(0,10),'2027-11-08');
});
test('connection status explains reconnects and errors in plain words',()=>{
 assert.equal(connectionStatus({status:'needs-reconnect',last_synced_at:null,last_error:null}).tone,'warning');
 assert.match(connectionStatus({status:'needs-reconnect',last_synced_at:null,last_error:null}).text,/Reconnect/);
 assert.deepEqual(connectionStatus({status:'active',last_synced_at:'2026-11-08T00:00:00Z',last_error:null}),{tone:'ok',text:'Synced'});
});
test('phase 1 is read-only: only the readonly Calendar scope, no Google writes',()=>{
 const oauth=read('lib/google/oauth.ts'),sync=read('lib/google/sync.ts');
 assert.match(oauth,/calendar\.readonly/);assert.doesNotMatch(oauth,/auth\/calendar"|calendar\.events/);
 assert.doesNotMatch(sync,/method:\s*"(POST|PUT|PATCH|DELETE)"/);
});
test('tokens stay server-side: no browser grants, encrypted, server-only modules',()=>{
 const sql=read('supabase/migrations/20261128000100_google_calendar.sql');
 assert.match(sql,/revoke all on public\.google_connections, public\.google_tokens/);
 assert.doesNotMatch(sql,/grant[^;]*google_tokens[^;]*to authenticated/);assert.doesNotMatch(sql,/policy[^;]*google_tokens/);
 for(const f of ['lib/google/crypto.ts','lib/google/oauth.ts','lib/google/sync.ts','lib/google/http.ts'])assert.match(read(f),/^import "server-only";/);
 const client=read('components/google/GoogleCalendarStore.ts');assert.doesNotMatch(client,/google_tokens|refresh|GOOGLE_/);
 const {seal,open}=(()=>{process.env.GOOGLE_TOKEN_KEY=Buffer.alloc(32,7).toString('base64');return serverModule('lib/google/crypto.ts');})();
 const sealed=seal('1//refresh-token');assert.ok(!sealed.includes('refresh-token'));assert.equal(open(sealed),'1//refresh-token');
 const [v,iv,tag,body]=sealed.split('.');assert.throws(()=>open([v,iv,tag,body.slice(0,-2)+'AA'].join('.')));
});
test('OAuth callback checks a per-user state cookie before exchanging a code',()=>{
 const cb=read('app/api/google/callback/route.ts');assert.ok(cb.indexOf('same(cookie')<cb.indexOf('exchangeCode(code)'));assert.match(cb,/\$\{state\}\.\$\{user\.id\}/);
 for(const r of ['sync','disconnect'])assert.match(read(`app/api/google/${r}/route.ts`),/trustedOrigin\(request\)/);
});
test('Agenda shows Google events in Day, Week and Month but keeps the Future Log intentional',()=>{
 const a=read('components/planner/Agenda.tsx');
 assert.match(a,/dayItems\(tasksShown, eventsWithGoogle, day/);assert.match(a,/dayItems\(tasksShown, eventsWithGoogle, d, visibility\)/);
 assert.match(a,/monthItems\(\[\], eventsShown, m, visibility\)/);
 assert.match(a,/event\?\.source === "google" \? \{ kind: "google", event \}/);
});
test('Settings shows a Google Calendar card separate from Sign-in',async()=>{
 const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{GoogleCalendarSettings}=load('components/google/GoogleCalendarSettings');
 const html=renderToStaticMarkup(React.createElement(GoogleCalendarSettings));assert.match(html,/never changes your Google Calendar/);
 assert.match(read('components/Settings.tsx'),/id="google-calendar"/);
});
test('Daily Edit shows today\'s visible Google events read-only beside Muse events, including multi-day ones',async()=>{
 const {planPreview}=load('lib/plan-preview'),{eventProjection}=load('lib/data/planner');
 const muse=eventProjection({id:'m1',title:'Muse lunch',local_date:'2026-11-10',local_time:'12:00',detail:null});
 const trip=toDayEvent(toRow('primary',{id:'trip',summary:'Trip',start:{date:'2026-11-09'},end:{date:'2026-11-12'}},'UTC'),{name:'Personal',color:'#33b679'});
 const call=toDayEvent(toRow('primary',{id:'call',summary:'Call',start:{dateTime:'2026-11-10T18:00:00Z'},end:{dateTime:'2026-11-10T18:30:00Z'}},'America/New_York'),{name:'Work',color:'#039be5'});
 const p=planPreview([muse,trip,call],'2026-11-10');
 assert.deepEqual(p.events.map(e=>e.title),['Trip','Muse lunch','Call']);assert.equal(p.events.filter(e=>e.source==='google').length,2);
 const card=read('components/ScheduleCard.tsx');
 assert.match(card,/useGoogleEvents\(selectedDate, selectedDate\)/);assert.match(card,/GoogleEventDetails/);assert.doesNotMatch(card,/event\/add", event: (google|googleEvent)/);
 assert.doesNotMatch(read('components/google/GoogleCalendarStore.ts'),/fetch\("\/api\/google\/sync"[^)]*\)[^;]*useGoogleEvents/);
});
test('Google styles load wherever a Google event can appear',()=>{
 assert.match(read('components/google/GoogleSourceDot.tsx'),/import "\.\/GoogleCalendar\.css"/);
 assert.doesNotMatch(read('components/planner/Agenda.css'),/muse-google-dot/);
});
