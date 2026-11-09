import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('#104 Frosted: page-level panels share the card glass instead of the nested subtle surface',()=>{
  const css=read('app/materials.css');
  const rule=css.slice(css.indexOf('Page sheets (#104)'));
  for(const c of ['.muse-hero','.muse-panel','.muse-empty-state[data-variant]','.muse-collections-controls','.muse-fortune-stage','.muse-books-panel','.muse-nourish-week'])assert.ok(rule.includes(c),c);
  assert.match(rule,/background-color: var\(--glass-background\)/);
  assert.match(rule,/:not\(:is\(\.muse-card/,'nested copies keep the subtle surface');
});

test('#104 Dropdowns: single-choice menus have no repeated heading, multi-select keeps Done/Clear',()=>{
  assert.match(read('components/MuseChoiceMenu.tsx'),/bare=\{!multiple\}/);
  const pop=read('components/GlassPopover.tsx');
  assert.match(pop,/role==="dialog"&&!bare&&/);
  assert.match(pop,/aria-label=\{label\}/,'the label stays for assistive tech');
});

test('#104 Mobile: 16px field floor on touch only, pinch zoom left alone, Collections toolbar can shrink',()=>{
  const g=read('app/globals.css');
  assert.match(g,/@media \(pointer: coarse\) \{\s*:is\(input[^}]*font-size: max\(16px, 1em\) !important/);
  assert.doesNotMatch(read('app/layout.tsx'),/maximumScale|userScalable/);
  assert.match(read('components/collections/Collections.css'),/\.muse-collections-overview\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test('#104 Theme selector: dock icon is centered regardless of rail-footer alignment',()=>{
  assert.match(read('components/AppShell.css'),/\.muse-theme-root\[data-variant="dock"\] \.muse-theme-trigger\{justify-content:center;place-content:center\}/);
});

test('#104 My Meals: one sheet, slot-colored chips, toolbar rules no longer leak into the week strip',()=>{
  assert.match(read('components/nourish/MealSlot.tsx'),/data-slot=\{slot\}/);
  const css=read('components/nourish/Nourish.css');
  assert.match(css,/\.muse-meal-slot\[data-slot="breakfast"\][^{]*\{--meal-ink:var\(--chart-4\)\}/);
  assert.doesNotMatch(css,/\.muse-nourish-toolbar nav\b/);
});

import {load} from './helpers.mjs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('#104 Water: one shared default; a logged day keeps its own goal; connected rituals can follow it per date',()=>{
  const W=load('lib/water');assert.deepEqual(W.defaultWaterSettings,{goal:100,unit:'oz',quickAdds:[12,24,32,40]});
  assert.equal(load('lib/daily-edit-data').dailyEditSample.water.settings.goal,100,'Daily Edit uses the same default');
  assert.doesNotMatch(read('components/planner/AgendaSections.tsx'),/goal: 64/,'Agenda no longer falls back to 64 oz');
  const C=load('lib/ritual-connections'),sources=(water,settings)=>({timeZone:'UTC',wellness:{water,waterSettings:settings,activities:[],types:[],assignments:[]}});
  assert.equal(C.waterGoalFor(sources([{date:'2026-11-01',total:50,goal:64,unit:'oz'}],{goal:100,unit:'oz',quickAdds:[]}),'2026-11-01','oz'),64,'historical goal kept');
  assert.equal(C.waterGoalFor(sources([],{goal:100,unit:'oz',quickAdds:[]}),'2026-11-02','oz'),100,'other days use the current shared goal');
  assert.equal(C.waterGoalFor(sources([],null),'2026-11-02','oz'),undefined,'no goal is invented');
  const R=load('lib/ritual-connection-rules');
  assert.equal(R.validConnection({type:'checkbox'},{metric:'water',since:'2026-11-01',followGoal:true}),true);
  assert.equal(R.validConnection({type:'duration'},{metric:'workout-minutes',since:'2026-11-01',followGoal:true}),false,'only water can follow a shared goal');
});

test('#104 Rituals: "X times per week" counts distinct completed days, and other days are not missed',()=>{
  const R=load('lib/rituals');
  const ritual={id:'r',name:'Stretch',groupId:'g',type:'checkbox',goal:1,unit:'check-in',recurrence:{kind:'daily'},startDate:'2026-10-01',createdAt:'',timesPerWeek:4};
  const e=(date,value=1,extra={})=>({id:`r/${date}`,ritualId:'r',date,value,updatedAt:'',...extra});
  const state={groups:[{id:'g',name:'Body',accent:'pop',icon:'heart',collapsed:false}],rituals:[ritual],entries:[e('2026-11-02'),e('2026-11-03'),e('2026-11-05'),e('2026-11-04',0,{outcome:'missed'})],celebratedMilestones:[]};
  assert.equal(R.weeklyDays(state,ritual,'2026-11-06'),3);
  assert.equal(R.ritualCell(state,ritual,'2026-11-06','2026-11-08').status,'available','a day without a check-in is open, not unknown');
  const sum=R.weekSummary(state,['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08'],'2026-11-08');
  assert.equal(sum.weeklyTargets,1);assert.equal(sum.weeklyMet,0);assert.equal(sum.scheduled,0,'not counted as seven daily obligations');
  const met={...state,entries:[...state.entries,e('2026-11-07')]};assert.equal(R.weekSummary(met,['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08'],'2026-11-08').weeklyMet,1);
  assert.equal(R.rhythmLabel(ritual),'4× a week');
  assert.match(read('supabase/migrations/20261127000200_rituals_frequency.sql'),/times_per_week integer check \(times_per_week between 1 and 7\)/);
  assert.match(read('supabase/migrations/20261127000200_rituals_frequency.sql'),/'followGoal'/);
});

test('#104 Series: Next up is the first released unfinished installment; gaps are reported, never invented',()=>{
  const M=load('lib/collections/models');
  const book=(id,title,status)=>({id,title,author:'A',status,reviewEmojis:[],startingPage:0,currentPage:0,positionUpdatedAt:'',format:'physical'});
  const books=[book('b1','One','finished'),book('b2','Two','reading'),book('b4','Four','want-to-read'),book('b5','Five','want-to-read')];
  const member=(id,book_id,sequence,release_state='released')=>({id,series_id:'s',book_id,media_id:null,sequence,role:'mainline',release_state});
  const series={id:'s',scope:'announced',conclusion_state:'ongoing'};
  const p=M.seriesProgress(series,[member('m1','b1',1),member('m5','b5',0.5,'announced'),member('m2','b2',2),member('m4','b4',4)],books,[]);
  assert.equal(p.next.title,'Two','announced installment is never "next"');assert.deepEqual(p.missing,[3]);assert.equal(p.completed,1);assert.equal(p.availableTotal,3);
  assert.match(read('components/collections/SeriesLibrary.tsx'),/linkSeries=\{\{id:series\.id/,'Create New Book uses the existing Add Book flow');
  assert.match(read('components/whimsy/Bookshelf.tsx'),/if\(!old&&linkSeries\)\{await saveSeriesMember/);
});

test('#104 Task cards: Compact by default; Spacious persists on this device',()=>{
  const D=load('lib/task-density-preference');assert.equal(D.parseTaskDensity(null),'compact');assert.equal(D.parseTaskDensity('spacious'),'spacious');assert.equal(D.parseTaskDensity('huge'),'compact');
  assert.equal(D.TASK_DENSITY_KEY,'muse.planner.taskDensity');
  assert.match(read('components/planner/Planner.tsx'),/data-task-density=\{density\}/);
});

test('#104 Bucket List: crop is a saved focal point + zoom; the upload is never cut',()=>{
  const M=load('lib/bucket-list/models');
  assert.deepEqual(M.photoFrame({path:'p'}),{x:50,y:50,zoom:1});
  assert.deepEqual(M.photoFrame({frame:{x:140,y:-5,zoom:9}}),{x:100,y:0,zoom:3},'clamped');
  const img={id:'i',path:'a.webp',thumbnailPath:'t.webp',name:'',alt:'',width:4000,height:3000,mime:'image/webp'};
  const framed=M.withFrame(img,{x:33.333,y:70,zoom:1.756});assert.equal(framed.path,'a.webp');assert.deepEqual(framed.frame,{x:33.3,y:70,zoom:1.76});
  assert.match(read('components/envision/bucket/BucketList.css'),/\.muse-bucket-card-photo\{position:absolute;inset:0/);
});

test('#104 Money: the summary keeps projection and actual apart and invents nothing without a paycheck',()=>{
  const src=read('components/money/MoneyViews.tsx');const a=src.indexOf('export function SpendingSummary'),body=src.slice(a,src.indexOf('\n}\n',a));
  assert.match(body,/spent=spendingTotal\(state,period\)/,'spent is recorded transactions only');
  assert.doesNotMatch(body,/bills|recurring|upcoming/i,'bills are never added to spending');
  assert.match(body,/Choose a paycheck period to see income/);
  assert.match(read('components/money/MoneyRecurring.tsx'),/'Paused','Ended'/);
});

test('#104 Future Log: own entries only; dated entries stay inside their month; no tasks or intentions',()=>{
  const F=load('lib/future-log');
  assert.equal(F.validEntry({month:'2026-12',date:'2026-12-12',title:'Birthday'}),'');
  assert.equal(F.validEntry({month:'2026-12',date:'2027-01-01',title:'x'}),'That day is outside this month.');
  assert.equal(F.validEntry({month:'2026-12',date:null,title:'  '}),'Give it a few words.');
  const sorted=F.sortEntries([{id:'a',month:'2026-12',date:null,title:'Plan',position:0},{id:'b',month:'2026-12',date:'2026-12-12',title:'Bday',position:1}]);assert.equal(sorted[0].id,'b','dated first');
  const agenda=read('components/planner/Agenda.tsx');assert.doesNotMatch(agenda,/monthItems\(/,'#112: nothing (tasks, events) is passed to the Future Log automatically');
  const sql=read('supabase/migrations/20261127000100_future_log.sql');assert.match(sql,/date_trunc\('month', local_date\)::date = month/);assert.match(sql,/enable row level security/);
});

test('#104 Insights: month intentions run 1st → last day of the selected month only',()=>{
  const {MonthIntentions}=load('components/insights/glance/GlanceSections');
  const days=Array.from({length:30},(_,i)=>`2026-11-${String(i+1).padStart(2,'0')}`);
  const html=renderToStaticMarkup(React.createElement(MonthIntentions,{days,intentions:[{date:'2026-11-03',emoji:'☕',text:'Walk'},{date:'2026-11-01',emoji:null,text:'First'}],today:'2026-11-08',onOpen:()=>{}}));
  const nums=[...html.matchAll(/<strong>(\d+)<\/strong>/g)].map(m=>+m[1]);assert.deepEqual(nums,days.map((_,i)=>i+1));
  assert.ok(html.indexOf('First')<html.indexOf('Walk'),'chronological');assert.match(html,/data-future="true"/);
});

test('#104 Reflections: a set, concise page — three wins and three memories',()=>{
  const M=load('lib/reflections/model');
  assert.equal(M.canAddItem('highlights',2),true);assert.equal(M.canAddItem('highlights',3),false);assert.equal(M.canAddItem('memories',3),false);assert.equal(M.canAddItem('writing',99),true);
  for(const l of M.layouts){const halves=l.seeds.filter(s=>s.size==='half').length;assert.equal(halves%2,0,`${l.id}: halves pair up, so no row has a gap`);}
  assert.doesNotMatch(read('components/planner/reflections/Reflections.tsx'),/Add a section/);
});

test('#104 Mindspace: resizing never starts a card drag; search Enter only drafts',()=>{
  const src=read('components/notes/Constellations.tsx');
  assert.match(src,/onDragStart=\{e=>\{if\(resizing\.current\|\|/);assert.match(src,/setAttribute\('draggable','false'\)/);
  assert.match(src,/e\.nativeEvent\.isComposing/);assert.match(src,/function createFromSearch\(\)[\s\S]{0,400}setComposerOpen\(true\)/);assert.doesNotMatch(src.slice(src.indexOf("function createFromSearch"),src.indexOf("function createFromSearch")+500),/dispatch\(/,"never saves on its own");
});

test('#104 Frosted: every blur lists -webkit- first, so the CSS build keeps the standard property Chrome needs',async()=>{
  const {globSync}=await import('node:fs');
  const files=[...globSync('app/*.css',{cwd:new URL('..',import.meta.url).pathname}),...globSync('components/**/*.css',{cwd:new URL('..',import.meta.url).pathname})];
  const bad=[];for(const f of files){const s=read(f);for(const m of s.matchAll(/\{([^{}]*)\}/g)){const b=m[1],std=b.search(/(?<![-\w])backdrop-filter\s*:/),wk=b.indexOf('-webkit-backdrop-filter');if(std>=0&&wk>=0&&std<wk)bad.push(f);}}
  assert.deepEqual([...new Set(bad)],[],'unprefixed backdrop-filter before -webkit- is dropped by the build');
});
