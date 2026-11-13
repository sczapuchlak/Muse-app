import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const A=load('lib/aspirations/atlas');
const M=load('lib/aspirations/models');
const read=f=>readFileSync(resolve(root,f),'utf8');
const asp=(o={})=>({id:'a1',title:'Learn to sew',description:null,motivation:null,category:'Personal',icon:null,accent:null,startDate:'2026-11-01',targetDate:null,targetPeriod:null,timeframe:'none',status:'active',
 progressKind:'binary',target:null,unit:null,connection:null,milestones:[],ritualIds:[],taskIds:[],reflection:null,completedOn:null,celebrated:[],position:0,renewedFrom:null,revision:1,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z',...o});
const pri=(o={})=>({id:'p1',user_id:'u',year:2027,aspiration_id:'a1',aspiration_name:'Learn to sew',area_id:'fun',area_name:'Fun',note:'',revision:1,created_at:'',updated_at:'',removed_at:null,...o});
const plan=(o={})=>({user_id:'u',year:2027,theme:'',vision_board_id:null,vision_board_name:null,feelings:[],focus:'',extraordinary:'',ritual_step:null,ritual_started_at:null,ritual_completed_at:null,established_at:null,revision:1,created_at:'',updated_at:'',...o});

test('the planning year turns to next year from October, and is never hardcoded',()=>{
 assert.equal(A.planningYear('2026-11-13'),2027);
 assert.equal(A.planningYear('2026-09-30'),2026);
 assert.equal(A.planningYear('2031-12-01'),2032);
});

test('a year is a lens: chosen years and target years, never a second collection',()=>{
 const chosen=asp(),dated=asp({id:'a2',targetDate:'2027-06-01'}),range=asp({id:'a3',targetPeriod:'2026/2028'}),reading=asp({id:'a4',connection:{kind:'reading-challenge',year:'2026'}}),none=asp({id:'a5'});
 const ps=[pri(),pri({id:'p2',aspiration_id:'a5',year:2027,removed_at:'2026-12-01'})];
 const in2027=[chosen,dated,range,reading,none].filter(a=>A.inLens(a,{kind:'year',year:2027},ps)).map(a=>a.id);
 assert.deepEqual(in2027,['a1','a2','a3'],'a removed priority no longer counts; the 2026 challenge stays in 2026');
 assert.ok(A.inLens(reading,{kind:'year',year:2026},ps),'Journey G: the 2026 Reading Challenge stays associated with 2026');
 assert.deepEqual([chosen,dated,range,reading,none].filter(a=>A.inLens(a,{kind:'undated'},ps)).map(a=>a.id),['a5']);
 assert.equal([chosen,dated,none].filter(a=>A.inLens(a,{kind:'all'},ps)).length,3);
 assert.deepEqual(A.yearsOf('a1',[...ps,pri({id:'p3',year:2028})]),[2027,2028],'one aspiration, many years, one identity');
});

test('the default lens respects an explicit choice, then a started plan for next year',()=>{
 assert.deepEqual(A.defaultLens('2026-11-13',[],'all'),{kind:'all'});
 assert.deepEqual(A.defaultLens('2026-11-13',[],'2025'),{kind:'year',year:2025});
 assert.deepEqual(A.defaultLens('2026-11-13',[],null),{kind:'year',year:2026},'nothing designed yet: the current year');
 assert.deepEqual(A.defaultLens('2026-11-13',[plan({ritual_started_at:'x'})],null),{kind:'year',year:2027});
 assert.deepEqual(A.defaultLens('2026-05-13',[plan({ritual_started_at:'x'})],null),{kind:'year',year:2026},'mid-year stays on the current year');
});

test('the welcome shows once: an Atlas is established by the ritual, building it, or existing placements',()=>{
 assert.equal(A.isEstablished([],[],[]),false);
 assert.equal(A.isEstablished([plan({ritual_started_at:'x'})],[],[]),false,'a started ritual alone is a draft');
 assert.equal(A.isEstablished([plan({established_at:'x'})],[],[]),true);
 assert.equal(A.isEstablished([],[{aspiration_id:'a1',area_id:'fun',is_primary:true}],[]),true);
 assert.equal(A.isEstablished([],[],[pri()]),true);
});

test('tracking choices change only how progress is recognized; nothing is cleared',()=>{
 const a=asp({target:5,unit:'pull-ups',milestones:[{id:'m',title:'One'}]});
 assert.equal(A.trackingPatch('know',a).progressKind,'binary');
 assert.equal(A.trackingPatch('know',a).planningStyle,'achievement');
 assert.equal(A.trackingPatch('later',a).planningStyle,null);
 assert.deepEqual([A.trackingPatch('target',a).progressKind,A.trackingPatch('target',a).target],['numeric',5]);
 assert.ok(!('milestones' in A.trackingPatch('milestones',a)),'milestones are never touched by a tracking change');
 for(const t of ['know','milestones','target','connected','later'])assert.equal(A.trackingOf({...a,...A.trackingPatch(t,a)}),t,`${t} round-trips`);
 assert.equal(A.trackingOf(asp({progressKind:'manual'})),'target');
});

test('carry forward offers unfinished aspirations from earlier years and never moves them itself',()=>{
 const open=asp(),done=asp({id:'a2',status:'completed',completedOn:'2027-05-01'}),already=asp({id:'a3'});
 const ps=[pri(),pri({id:'p2',aspiration_id:'a2'}),pri({id:'p3',aspiration_id:'a3'}),pri({id:'p4',aspiration_id:'a3',year:2028})];
 assert.deepEqual(A.carryCandidates(2028,[open,done,already],ps).map(x=>[x.a.id,x.from]),[['a1',2027]]);
 assert.equal(ps.filter(p=>p.year===2028).length,1,'no rows were created');
});

test('ritual steps: prologue, optional carry, every area, the final page; resume where you were',()=>{
 const steps=A.ritualSteps(['h','f'],true);
 assert.deepEqual(steps.map(A.stepKey),['imagine','carry','h','f','declare']);
 assert.equal(A.resumeIndex(steps,'f'),3);
 assert.equal(A.resumeIndex(steps,'gone-area'),0,'an unknown position starts at the beginning');
 assert.equal(A.focusNudge(5),false);assert.equal(A.focusNudge(7),true,'a nudge, never a cap');
});

test('filters, quarters and related links',()=>{
 assert.equal(A.matchesStatus(asp({status:'archived'}),'all'),false,'archived stays out of the everyday Atlas');
 assert.equal(A.matchesStatus(asp({status:'archived'}),'archived'),true);
 assert.equal(A.matchesStatus(asp({status:'paused'}),'resting'),true);
 assert.equal(A.matchesStatus(asp({status:'completed'}),'achieved'),true);
 assert.equal(A.quarterIn(asp({targetDate:'2027-05-02'}),2027),2);
 assert.equal(A.quarterIn(asp({targetPeriod:'2027-11'}),2027),4);
 assert.equal(A.quarterIn(asp({targetDate:'2028-05-02'}),2027),null);
 assert.ok(A.matchesSearch(asp({milestones:[{id:'m',title:'Buy a zipper'}]}),'zipper'),'search reaches milestones');
 assert.deepEqual(A.relatedPair('b','a'),{aspiration_id:'a',related_id:'b'});
 assert.deepEqual(A.relatedOf('a',[{aspiration_id:'a',related_id:'b'},{aspiration_id:'c',related_id:'a'}]),['b','c']);
});

test('every one of the ten Level 10 areas has its own glyph and a thoughtful prompt',()=>{
 const labels=['Health & fitness','Career','Finances','Family','Friends','Romance','Personal growth','Fun & recreation','Home & environment','Spirituality'];
 const voices=labels.map(A.areaVoice);
 assert.equal(new Set(voices.map(v=>v.glyph)).size,10,'ten distinct glyphs');
 assert.equal(new Set(voices.map(v=>v.prompt)).size,10);
 assert.ok(voices.every(v=>v.prompt.endsWith('?')));
 assert.match(A.areaVoice('Fun & recreation').prompt,/playful, adventurous, or unforgettable/);
 assert.equal(A.areaVoice('My own area').glyph,'sparkle','a renamed area still gets a voice');
 assert.equal(A.roman(9),'X');
});

test('completion words and keepsakes round-trip; empty reflections are not stored',()=>{
 const row=M.toRow(asp({status:'completed',completedOn:'2027-03-01',completion:{meaningful:' My first dress ',learned:''},showProgress:false}));
 assert.deepEqual(row.completion,{meaningful:'My first dress'});
 assert.equal(row.show_progress,false);
 assert.equal(M.toRow(asp({completion:{learned:'  '}})).completion,null);
 const back=M.fromRow({...row,user_id:'u',revision:1,created_at:'',updated_at:'',keepsake:null,cover:null});
 assert.deepEqual([back.completion,back.showProgress],[{meaningful:'My first dress'},false]);
 assert.equal(M.fromRow({...row,user_id:'u',revision:1,created_at:'',updated_at:'',show_progress:undefined}).showProgress,true,'older rows show numbers');
});

test('the #190 migration is additive, owner-scoped and keeps every snapshot',()=>{
 const sql=read('supabase/migrations/20261218000100_life_atlas_ritual.sql');
 assert.doesNotMatch(sql,/drop table|drop column|delete from|update public\./i,'nothing is removed or rewritten');
 assert.match(sql,/add column feelings text\[\]/);assert.match(sql,/add column ritual_step/);assert.match(sql,/add column established_at/);
 assert.match(sql,/alter column area_name drop not null/,'a year can be chosen before a Life Area');
 assert.match(sql,/keepsake images must belong to this aspiration/i);
 assert.match(sql,/check \(aspiration_id < related_id\)/,'related links are stored once');
 assert.match(sql,/aspiration_links enable row level security/);
 for(const p of ['owner_read','owner_insert','owner_delete'])assert.match(sql,new RegExp(`create policy ${p} on public\\.aspiration_links`));
 assert.doesNotMatch(sql,/to anon|grant .* anon/i);
});

test('one Life Atlas home: no competing tabs; the ritual and details are editors of the same records',()=>{
 const home=read('components/envision/aspirations/Aspirations.tsx');
 assert.doesNotMatch(home,/All Aspirations|>Life Areas</,'the three competing destinations are gone');
 assert.match(home,/<AtlasWelcome /);assert.match(home,/<DesignMyYear /);assert.match(home,/<AtlasArea /);assert.match(home,/<CompletionSheet /);
 assert.match(home,/\?open=<id>/,'links from other modules still open an aspiration');
 const ritual=read('components/envision/aspirations/DesignMyYear.tsx');
 for(const w of ['Movement I · Imagine','Movement II · Become','Movement III · Declare','The Year in Your Own Words','Bring My Year to Life','Skip this area','Save &amp; close'])assert.ok(ritual.includes(w),w);
 assert.match(ritual,/chooseForYear/,'adding in the ritual uses the same annual association');
 assert.doesNotMatch(ritual,/Finalize|Lock|Complete Setup/);
 const area=read('components/envision/aspirations/AtlasArea.tsx');
 assert.match(area,/aria-expanded=\{expanded\}/);assert.match(area,/role="region"/);
 assert.match(read('components/envision/aspirations/AspirationDetail.tsx'),/\{atlasPanel\}/);
 for(const f of ['components/envision/aspirations/LifeAtlas.css','components/envision/aspirations/DesignMyYear.css']){const css=read(f);
  assert.match(css,/prefers-reduced-motion:no-preference/,`${f} gates motion`);assert.doesNotMatch(css,/infinite/,`${f} has no endless animation`);}
});

test('Life Atlas classes never collide with the Books Reading Atlas (plain global CSS)',()=>{
  const css=['LifeAtlas.css','DesignMyYear.css'].map(f=>read(`components/envision/aspirations/${f}`)).join('');
 assert.doesNotMatch(css,/\.muse-atlas-/,'the Reading Atlas owns muse-atlas-*; the Life Atlas uses muse-lifeatlas-*');
 assert.match(read('app/surfaces.css'),/\.muse-lifeatlas-area, /,'light-card themes give Atlas sections their card ink');
});
