import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const L=load('lib/agenda-layout'),M=load('lib/muse-marks'),A=load('lib/agenda'),P=load('lib/planner'),D=load('lib/data/planner'),preview=load('lib/plan-preview');
const read=f=>readFileSync(resolve(root,f),'utf8');
const task=(id,plannedDate,extra={})=>({id,kind:'task',title:id,complete:false,workspaceId:'w1',tagIds:[],plannedDate,actualMinutes:0,subtasks:[],createdAt:'2026-11-01T00:00:00Z',...extra});
const event=(id,date,extra={})=>({id,kind:'event',title:id,date,dateTime:`${date}T09:00`,time:'9:00 AM',status:'confirmed',...extra});

test('weekly template: Events and Tasks by default, permanent, shared order and size, versioned parse',()=>{
 const d=L.defaultLayout();assert.deepEqual(d.sections.map(s=>s.type),['events','tasks']);assert.equal(d.version,1);
 let l=L.changeLayout(d,{type:'remove',id:'events'});assert.equal(l,d,'Events cannot be removed');
 assert.equal(L.changeLayout(d,{type:'remove',id:'tasks'}),d,'the first Tasks section cannot be removed');
 l=L.changeLayout(d,{type:'add',section:{id:'movement-1',type:'movement'}});
 l=L.changeLayout(l,{type:'move',id:'movement-1',to:0});
 l=L.changeLayout(l,{type:'update',id:'movement-1',patch:{size:'collapsed'}});
 assert.deepEqual(l.sections.map(s=>[s.type,s.size]),[['movement','collapsed'],['events','standard'],['tasks','tall']],'Scenario 1: Movement above Events, one line tall');
 assert.equal(L.changeLayout(l,{type:'add',section:{id:'movement-2',type:'movement'}}),l,'one Movement section is enough');
 l=L.changeLayout(l,{type:'add',section:{id:'reading-1',type:'reading',metric:'minutes'}});
 assert.deepEqual(l.sections.map(s=>s.type),['movement','events','tasks','reading'],'Scenario 8 order');
 const saved=JSON.parse(JSON.stringify(l));assert.deepEqual(L.parseLayout(saved),l,'persists losslessly (reload)');
 l=L.changeLayout(l,{type:'remove',id:'reading-1'});assert.ok(!l.sections.some(s=>s.type==='reading'),'optional sections can be removed');
 assert.deepEqual(L.changeLayout(l,{type:'reset'}),L.defaultLayout(),'reset to default');
 // Garbage, unknown types, duplicates and missing permanent sections degrade safely.
 const parsed=L.parseLayout({sections:[{id:'x',type:'weather'},{id:'tasks',type:'tasks',size:'giant',title:'  '},{id:'tasks',type:'tasks'},{id:'r',type:'reading',metric:'vibes'}]});
 assert.deepEqual(parsed.sections.map(s=>[s.id,s.type,s.size,s.title]),[['events','events','standard','Events'],['tasks','tasks','tall','Tasks'],['r','reading','compact','Reading']]);
 assert.equal(parsed.sections[2].metric,'minutes');assert.deepEqual(L.parseLayout(null),L.defaultLayout());
 assert.ok(L.sectionRem('tall')>L.sectionRem('standard')&&L.sectionRem('standard')>L.sectionRem('compact'),'sizes are real, ordered heights');
});

test('Workstream A: several workspace-aware Tasks sections, overlap note, removed workspaces never widen to all',()=>{
 let l=L.changeLayout(L.defaultLayout(),{type:'add',section:{id:'tasks-work',type:'tasks',title:'Work',workspaceIds:['w1']}});
 l=L.changeLayout(l,{type:'add',section:{id:'tasks-home',type:'tasks',title:'Personal',workspaceIds:['w2']}});
 assert.equal(l.sections.filter(s=>s.type==='tasks').length,3);
 assert.notEqual(L.changeLayout(l,{type:'remove',id:'tasks-work'}),l,'extra Tasks sections can be removed');
 assert.deepEqual(L.sectionWorkspaces(l.sections[2],['w1','w2']),{all:false,ids:['w1'],missing:[]});
 assert.deepEqual(L.sectionWorkspaces({workspaceIds:[]},['w1','w2']).ids,['w1','w2'],'empty = all workspaces');
 assert.deepEqual(L.sectionWorkspaces({workspaceIds:['gone']},['w1']),{all:false,ids:[],missing:['gone']},'deleted workspace: recoverable, not all');
 assert.deepEqual(L.overlappingTaskSections(l.sections,['w1','w2']),[['Tasks','Work'],['Tasks','Personal']],'All Tasks overlaps both');
 assert.equal(L.showCompletedFor({completed:'hide'},true),false);assert.equal(L.showCompletedFor({completed:'inherit'},false),false);assert.equal(L.showCompletedFor({completed:'show'},false),true);
 const sections=read('components/planner/AgendaSections.tsx');
 assert.match(sections,/scope\.ids\.includes\(t\.workspaceId\)/,'section filter uses the canonical workspace field');
});

test('native events: all-day, multi-day as ONE record, status separate from completion, edit and delete',()=>{
 const trip=event('london','2026-09-10',{allDay:true,endDate:'2026-09-18',dateTime:'2026-09-10T00:00',time:'All day'});
 const dinner=event('dinner','2026-09-12',{dateTime:'2026-09-12T18:30',time:'6:30 PM'});
 const canceled=event('gone','2026-09-12',{status:'canceled'});
 const day=A.dayItems([],[dinner,trip,canceled],'2026-09-12',{showCompleted:true,showCanceled:true});
 assert.deepEqual(day.events.map(e=>e.id),['london','gone','dinner'],'all-day first, then by time; the trip shows mid-span');
 const hidden=A.dayItems([],[dinner,trip,canceled],'2026-09-12',{showCompleted:true,showCanceled:false});
 assert.deepEqual([hidden.events.map(e=>e.id),hidden.hiddenCanceled],[['london','dinner'],1]);
 assert.equal(A.dayItems([],[trip],'2026-09-19',true).events.length,0);
 assert.deepEqual(A.monthItems([],[trip],'2026-09',true).events.map(e=>e.id),['london']);
 assert.equal(A.eventDays(trip),'10–18');assert.equal(A.eventDays({date:'2026-09-28',endDate:'2026-10-02'}),'Sep 28 – Oct 2');
 assert.equal(A.eventWhen({...dinner,endTime:'20:00'}),'6:30 PM – 8:00 PM');assert.equal(A.eventWhen(trip),'All day');
 assert.equal(preview.planPreview([trip],'2026-09-15').events.length,1,'Dayview shows every day of a multi-day event');
 let state={tasks:[],events:[dinner],workspaces:[{id:'w1',name:'W',accent:'primary'}],groups:[],tags:[],activeTimer:null};
 state=P.plannerReducer(state,{type:'event/save',event:{...dinner,date:'2026-09-13',dateTime:'2026-09-13T18:30'}});
 assert.deepEqual(state.events.map(e=>[e.id,e.date]),[['dinner','2026-09-13']],'editing moves the same record');
 state=P.plannerReducer(state,{type:'event/save',event:trip});assert.equal(state.events.length,2);
 state=P.plannerReducer(state,{type:'event/delete',id:'dinner'});assert.deepEqual(state.events.map(e=>e.id),['london']);
 // Projection: all-day rows have no time; legacy rows stay timed and confirmed.
 assert.deepEqual(D.eventProjection({id:'a',title:'Trip',local_date:'2026-09-10',local_time:null,detail:null,all_day:true,end_date:'2026-09-18',end_time:null,location:null,status:'tentative'}),
  {id:'a',kind:'event',title:'Trip',date:'2026-09-10',dateTime:'2026-09-10T00:00',time:'All day',detail:undefined,allDay:true,endDate:'2026-09-18',status:'tentative'});
 assert.deepEqual(D.eventProjection({id:'b',title:'Dentist',local_date:'2026-03-08',local_time:'14:00:00',detail:null}).time,'2:00 PM');
 assert.throws(()=>D.validatePlannerAction({type:'event/save',event:{...dinner,endDate:'2026-09-01'}},'America/Chicago'),/date range/);
 assert.throws(()=>D.validatePlannerAction({type:'event/save',event:{...trip,endTime:'10:00'}},'America/Chicago'),/end time/);
 const writer=read('lib/data/planner.ts');assert.match(writer,/action\.type==='event\/delete'\)\{const \{data,error\}=await client\.rpc\('planner_event_command'/);
});

test('task states come from existing fields only; overdue tasks are never moved for you',()=>{
 assert.equal(A.taskState(task('a','2026-11-01'),'2026-11-06'),'overdue');
 assert.equal(A.taskState(task('a','2026-11-06'),'2026-11-06'),'scheduled');
 assert.equal(A.taskState(task('a',undefined),'2026-11-06'),'unscheduled');
 assert.equal(A.taskState(task('a','2026-11-01',{complete:true}),'2026-11-06'),'complete');
 assert.deepEqual(A.dayItems([task('old','2026-11-01')],[],'2026-11-06',true).tasks,[],'an overdue task stays on its own day');
 const row=read('components/planner/TaskListRow.tsx'),menu=read('components/planner/ScheduleMenu.tsx');
 assert.match(menu,/Migrate to today/);assert.match(menu,/Another day/);assert.match(row,/Overdue/);assert.match(row,/Priority/);
});

test('Muse Marks: visual-only by default, linked Marks follow their source, missing sources degrade, never activity',()=>{
 const star={id:'m1',date:'2026-11-10',icon:'star',color:'pop',label:'',revision:1};
 const plane={id:'m2',date:'2026-09-01',icon:'plane',color:'info',label:'',linkKind:'event',linkId:'london',revision:1};
 const book={id:'m3',date:'2026-11-12',icon:'book',color:'secondary',label:'',linkKind:'book',linkId:'b1',revision:1};
 const sources={events:[event('london','2026-09-10',{endDate:'2026-09-18',title:'London'})],tasks:[],movementTypes:[],books:[{id:'b1',title:'Piranesi'}],aspirations:[]};
 const r=[star,plane,book].map(m=>M.resolveMark(m,sources));
 assert.deepEqual([r[0].linked,r[0].start,r[0].missing],[false,'2026-11-10',false],'Scenario 4: a star on a date, nothing linked');
 assert.deepEqual([r[1].start,r[1].end,r[1].title],['2026-09-10','2026-09-18','London'],'linked event Mark follows the event’s dates and name');
 assert.equal(r[2].title,'Piranesi');assert.equal(r[2].href,'/whimsy/bookshelf');
 const gone=M.resolveMark(plane,{...sources,events:[]});assert.deepEqual([gone.missing,gone.start],[true,'2026-09-01'],'deleted source: Mark stays, marked unlinked');
 assert.deepEqual(M.dayMarks(r,'2026-11-10').map(m=>m.id),['m1']);assert.equal(M.itemMark(r,'event','london').id,'m2');
 assert.equal(M.markFromRow({id:'x',local_date:'2026-01-01',end_date:null,icon:'rocket',color:'pop',label:'',link_kind:null,link_id:null,revision:1}),null,'only curated icons');
 assert.deepEqual(M.markToRow({...star,endDate:'2026-11-09'}).end_date,null,'ranges never run backwards');
 assert.ok(M.statusLegend.every(s=>s.label.length>3),'every symbol has words');
 // A Mark never touches activity: the marks module and editor write only planner_marks.
 const editor=read('components/planner/MuseMarks.tsx');assert.doesNotMatch(editor,/dispatch\(|movement\/complete|addUpdate|save_wellness/);
});

test('Movement plans are Dayview’s movement intention; completion stays separate (no new tracker)',()=>{
 const s=read('components/planner/AgendaSections.tsx');
 assert.match(s,/dispatch\(\{ kind: "movement",/,'plans through the same Wellness movement selection Dayview uses');
 assert.doesNotMatch(s,/movement\/complete/,'planning never logs a workout');
 assert.match(s,/state\.activities\.filter\(\(a\) => a\.date === ctx\.day\)/,'done comes only from logged activity');
 assert.match(s,/sessionSeconds/,'reading minutes come from Bookshelf sessions on that date');
 assert.match(s,/last\?\.endingPage/,'position uses the page recorded that day, never a fabricated value');
});

test('migration: additive event fields, separate event command on the Planner revision, owner-only new tables',()=>{
 const sql=read('supabase/migrations/20261118000100_planner_agenda_foundation.sql');
 assert.doesNotMatch(sql,/drop table|drop column|truncate|delete from public\.planner_events where (?!id)/i);
 assert.match(sql,/alter column local_time drop not null/);assert.match(sql,/check \(all_day = \(local_time is null\)/);
 assert.match(sql,/status in \('confirmed', 'tentative', 'canceled'\)/);
 assert.match(sql,/update public\.planner_versions set revision = revision \+ 1/);assert.match(sql,/insert into public\.planner_commands/);
 assert.match(sql,/where public\.planner_events\.user_id = uid and kind = 'event\/save'/,'cannot overwrite someone else’s event id');
 assert.equal((sql.match(/create policy owner_/g)??[]).length,4,'four owner policies, applied to each new table in the loop');
 for(const t of ['planner_marks','planner_agenda_layouts','planner_day_notes'])assert.ok(sql.includes(`'${t}'`),t);
 assert.match(sql,/revoke all on public\.%I from public, anon, authenticated/);
 assert.match(read('app/api/account/export/route.ts'),/plannerAgenda:\{weekSections/,'new records are in the personal export');
});

test('Agenda shell: one view menu, contextual settings, layout customization, hidden-filter note, eight weekly slots',()=>{
 const a=read('components/planner/Agenda.tsx');
 assert.match(a,/Customize layout/);assert.match(a,/View settings and key/);assert.match(a,/Hiding \{hiding\.join/);
 assert.match(a,/agenda\.layout\.sections\.map\(\(s\) => <AgendaSectionView/,'every day renders the same template');
 assert.equal(A.weekSlots('2026-11-06').length,8,'seven days + the planning column');
 assert.doesNotMatch(read('components/planner/Planner.tsx'),/tagIds=\{activeTags\}\/>\}/,'Tasks-tab filters do not silently filter the Agenda');
 const css=read('components/planner/Agenda.css');assert.match(css,/\[data-flow=fixed\]\{height:var\(--section-h\)/,'bands share one height across days');
 assert.match(css,/\.muse-agenda-section-body\{min-height:0;overflow-y:auto/,'overflow scrolls inside the band, never hidden');
});
