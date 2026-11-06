import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';

const P=load('lib/aspirations/progress');
const M=load('lib/aspirations/models');
const sig=load('lib/almanac/signals');
const {almanacLibrary}=load('lib/almanac/library');
const read=f=>readFileSync(resolve(root,f),'utf8');
const today='2026-11-06';
const asp=(o={})=>({id:'a1',title:'Learn to sew a skirt',description:null,motivation:null,category:'Creative',icon:null,accent:null,startDate:'2026-09-01',targetDate:'2026-12-31',timeframe:'year',status:'active',
 progressKind:'milestones',target:null,unit:null,connection:null,milestones:[],ritualIds:[],taskIds:[],reflection:null,completedOn:null,celebrated:[],position:0,revision:1,createdAt:'2026-09-01T00:00:00Z',updatedAt:'2026-09-01T00:00:00Z',...o});
const upd=(id,recordedOn,value,o={})=>({id,aspirationId:'a1',recordedOn,value,note:null,milestoneId:null,createdAt:`${recordedOn}T12:00:00Z`,...o});

test('each progress kind has one honest calculation',()=>{
 const ms=[{id:'m1',title:'Pattern',completedOn:'2026-10-01'},{id:'m2',title:'Cut'},{id:'m3',title:'Sew',weight:2}];
 assert.deepEqual(P.aspirationProgress(asp({milestones:ms}),{updates:[],today}).percent,25,'weights: 1 of 4');
 assert.equal(P.aspirationProgress(asp(),{updates:[],today}).percent,null,'no milestones: unknown, not zero');
 const numeric=asp({progressKind:'numeric',target:3000,unit:'dollars'});
 assert.equal(P.aspirationProgress(numeric,{updates:[],today}).percent,0);
 const journal=[upd('u1','2026-10-01',800),upd('u2','2026-11-01',1500),upd('u3','2026-10-15',1200)];
 const p=P.aspirationProgress(numeric,{updates:journal,today});assert.deepEqual([p.current,p.percent,p.automatic],[1500,50,false],'latest by date, not by entry order');
 assert.equal(P.aspirationProgress(asp({progressKind:'manual'}),{updates:[upd('u','2026-11-01',140)],today}).percent,100,'clamped');
 assert.equal(P.aspirationProgress(asp({progressKind:'binary'}),{updates:[],today}).percent,0);
 assert.equal(P.aspirationProgress(asp({progressKind:'binary',status:'completed',completedOn:today}),{updates:[],today}).percent,100);
 assert.deepEqual(P.progressHistory(numeric,journal).map(h=>h.value),[800,1200,1500],'progress over time keeps every update');
});

test('connected progress reads the authority: the Reading Challenge and the progress engine, never a copy',()=>{
 const book=(id,finishedOn)=>({id,userId:'u',revision:1,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',title:id,status:'finished',reviewEmojis:[],completions:[{id:`${id}-c`,finishedOn,recordedAt:`${finishedOn}T00:00:00Z`}]});
 const goal={id:'g',userId:'u',revision:1,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',period:'year',unit:'books',start:'2026-01-01',end:'2026-12-31',target:4,recurs:false};
 const reading=asp({progressKind:'connected',connection:{kind:'reading-challenge',year:'2026'}});
 const p=P.aspirationProgress(reading,{updates:[],books:[book('a','2026-03-01'),book('b','2026-05-01'),book('c','2025-05-01')],readingGoals:[goal],today});
 assert.deepEqual([p.current,p.target,p.percent,p.source,p.automatic],[2,4,50,'Bookshelf',true]);
 const edited={...goal,target:8,updatedAt:'2026-06-01T00:00:00Z'};
 assert.equal(P.aspirationProgress(reading,{updates:[],books:[book('a','2026-03-01')],readingGoals:[edited],today}).target,8,'editing the challenge updates the aspiration');
 assert.equal(P.aspirationProgress(reading,{updates:[],books:[],readingGoals:[],today}).available,false,'no challenge: unavailable, not zero');
 const tasks=asp({progressKind:'connected',target:10,connection:{kind:'metric',metric:'tasks-completed'},startDate:'2026-11-01'});
 const planner={tasks:[{id:'t1',kind:'task',title:'a',complete:true,completedAt:'2026-11-02T15:00:00Z',workspaceId:'w',tagIds:[]},{id:'t2',kind:'task',title:'b',complete:true,completedAt:'2026-10-20T15:00:00Z',workspaceId:'w',tagIds:[]}],completionHistory:[]};
 const t=P.aspirationProgress(tasks,{updates:[],sources:{timeZone:'UTC',planner},today});
 assert.deepEqual([t.current,t.percent,t.source],[1,10,'Planner'],'counted from the start date only');
 assert.equal(P.aspirationProgress(tasks,{updates:[],today}).available,false,'waiting for sources is said, not guessed');
});

test('home: timeframe filters, default dates, attention lists and sorting',()=>{
 assert.equal(P.inTimeFilter({targetDate:'2026-11-30',timeframe:'month'},'month',today),true);
 assert.equal(P.inTimeFilter({targetDate:'2026-12-31',timeframe:'year'},'month',today),false);
 assert.equal(P.inTimeFilter({targetDate:'2026-12-31',timeframe:'year'},'quarter',today),true);
 assert.equal(P.inTimeFilter({targetDate:null,timeframe:'someday'},'someday',today),true);
 assert.equal(P.inTimeFilter({targetDate:null,timeframe:'someday'},'year',today),false);
 assert.deepEqual(P.timeframeDates('quarter','2026-11-06'),{start:'2026-11-06',target:'2026-12-31'});
 assert.deepEqual(P.timeframeDates('month','2026-02-10'),{start:'2026-02-10',target:'2026-02-28'});
 const list=[asp({id:'x',title:'Soon',targetDate:'2026-11-10',milestones:[{id:'m',title:'Step',targetDate:'2026-11-20'},{id:'d',title:'Done',completedOn:'2026-11-01'}]}),asp({id:'y',title:'Later',targetDate:'2027-06-01'}),asp({id:'z',title:'Done',status:'completed',completedOn:'2026-10-01'})];
 const at=P.attention(list,today);
 assert.deepEqual(at.approaching.map(a=>a.id),['x']);assert.deepEqual(at.upcomingMilestones.map(x=>x.milestone.id),['m']);assert.deepEqual(at.recentMilestones.map(x=>x.milestone.id),['d']);
 assert.deepEqual(P.sortAspirations(list,'target',()=>null).map(a=>a.id),['z','x','y'].sort((a,b)=>({x:'2026-11-10',y:'2027-06-01',z:'2026-12-31'})[a].localeCompare(({x:'2026-11-10',y:'2027-06-01',z:'2026-12-31'})[b])));
 assert.deepEqual(P.newThresholds({celebrated:['p25'],status:'active'},60),['p50'],'each quarter celebrates once');
 assert.deepEqual(P.newThresholds({celebrated:[],status:'active'},null),[]);
});

test('supporting habits show their own consistency and never count as the aspiration’s progress',()=>{
 const ritual={id:'r',name:'French practice',groupId:'g',type:'checkbox',goal:1,unit:'',recurrence:{kind:'daily'},startDate:'2026-10-01',createdAt:'2026-10-01T00:00:00Z'};
 const entries=['2026-11-05','2026-11-04','2026-11-02'].map(d=>({id:d,ritualId:'r',date:d,value:1,updatedAt:`${d}T12:00:00Z`}));
 const h=P.habitConsistency({groups:[],rituals:[ritual],entries,celebratedMilestones:[]},'r',today,7);
 assert.deepEqual([h.complete,h.opportunities,h.streak.count],[3,6,2],'7 days, today still open');
 assert.equal(P.habitConsistency({groups:[],rituals:[],entries:[],celebratedMilestones:[]},'gone',today),null,'a removed habit is skipped, not an error');
 const linked=asp({ritualIds:['r'],progressKind:'milestones',milestones:[{id:'m',title:'x'}]});
 assert.equal(P.aspirationProgress(linked,{updates:[],today}).percent,0,'habit streaks do not move progress');
});

test('stats count from what was checked off; archiving keeps a completion date',()=>{
 const list=[asp({id:'a',status:'completed',completedOn:'2026-03-04',milestones:[{id:'1',title:'x',completedOn:'2026-03-01'}]}),asp({id:'b',status:'archived',completedOn:'2026-05-02'}),asp({id:'c'})];
 const s=P.aspirationStats(list,today);
 assert.deepEqual([s.active,s.completedThisYear,s.milestonesThisYear],[1,2,1]);
 assert.equal(s.completedByMonth[2].completed,1);assert.equal(s.completedByMonth[4].completed,1);
 assert.equal(M.toRow(asp({status:'archived',completedOn:'2026-05-02'})).completed_on,'2026-05-02');
 assert.equal(M.toRow(asp({status:'active',completedOn:'2026-05-02'})).completed_on,null);
 const sql=read('supabase/migrations/20261114000100_aspirations.sql');
 assert.match(sql,/check \(status <> 'completed' or completed_on is not null\)/);assert.match(sql,/check \(completed_on is null or status in \('completed','archived'\)\)/);
 assert.match(sql,/aspiration_update_owner/);assert.match(sql,/on delete cascade/);
 assert.doesNotMatch(sql,/references public\.(rituals|planner|whimsy)/,'links are ids only: deleting an aspiration never touches linked records');
 assert.doesNotMatch(sql,/grant[^;]*update[^;]*aspiration_updates to authenticated/,'the journal is append-only');
});

test('aspirations speak through the Almanac, and only from real changes',()=>{
 const list=[asp({id:'m',title:'Website',milestones:[{id:'1',title:'Homepage',completedOn:'2026-11-04'},{id:'2',title:'Publish'}]}),
  asp({id:'h',title:'Save for Lisbon',progressKind:'numeric',target:100}),asp({id:'c',title:'Certification',status:'completed',completedOn:'2026-11-01'}),asp({id:'r',title:'French'})];
 const updates=[{aspirationId:'r',recordedOn:'2026-09-01'},{aspirationId:'r',recordedOn:'2026-11-05'}];
 const s=sig.aspirationSignals(list,updates,a=>({percent:a.id==='h'?62:10,available:true}),today);
 assert.deepEqual(s.map(x=>x.key).sort(),['aspirations.complete','aspirations.halfway','aspirations.milestone','aspirations.return']);
 for(const key of s.map(x=>x.key))assert.ok(almanacLibrary.some(e=>e.trigger.signal===key&&e.status==='published'),key);
 assert.ok(!almanacLibrary.filter(e=>e.trigger.signal==='aspirations.return').some(e=>Object.keys(e.variables).length>1),'the quiet weeks are never counted out loud');
});

test('Rituals keeps Habits intact and adds Aspirations as a tab',()=>{
 const rituals=read('components/rituals/Rituals.tsx');
 assert.match(rituals,/<MuseSectionNav label="Rituals views"/);assert.match(rituals,/view === "aspirations" \? <Aspirations \/> : <RitualCapture>/);
 assert.match(rituals,/<Suspense /,'search params need a boundary');
 const {ProgressRing,progressText}=load('components/rituals/aspirations/parts');
 assert.match(renderToStaticMarkup(createElement(ProgressRing,{percent:null})),/Progress unknown/);
 assert.equal(progressText(asp({progressKind:'numeric',unit:'dollars'}),{percent:0,current:null,target:3000,unit:'dollars',source:'you',automatic:false,available:true}),'0 of 3,000 dollars');
 assert.equal(progressText(asp(),{percent:null,current:0,target:0,unit:'milestones',source:'you',automatic:false,available:true,note:'Add a milestone to start measuring'}),'Add a milestone to start measuring');
});
