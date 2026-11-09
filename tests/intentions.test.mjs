import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const P=load('lib/intentions/periods'),M=load('lib/intentions/model'),read=f=>readFileSync(resolve(root,f),'utf8');
let n=0;const ids=()=>`id-${n++}`;

test('#117 period boundaries: Monday weeks, calendar months, quarters and years',()=>{
 assert.deepEqual(P.intentionRange('week','2026-11-09'),{period:'week',start:'2026-11-09',end:'2026-11-15'},'Monday starts its own week');
 assert.deepEqual(P.intentionRange('week','2026-11-15'),{period:'week',start:'2026-11-09',end:'2026-11-15'},'Sunday ends it');
 assert.deepEqual(P.intentionRange('week','2027-01-01'),{period:'week',start:'2026-12-28',end:'2027-01-03'},'a week can span the new year');
 assert.deepEqual(P.intentionRange('month','2028-02-14'),{period:'month',start:'2028-02-01',end:'2028-02-29'},'leap February');
 assert.deepEqual(P.intentionRange('quarter','2026-11-09'),{period:'quarter',start:'2026-10-01',end:'2026-12-31'});
 assert.deepEqual(P.intentionRange('quarter','2026-03-31'),{period:'quarter',start:'2026-01-01',end:'2026-03-31'});
 assert.deepEqual(P.intentionRange('quarter','2026-04-01'),{period:'quarter',start:'2026-04-01',end:'2026-06-30'});
 assert.deepEqual(P.intentionRange('year','2026-11-09'),{period:'year',start:'2026-01-01',end:'2026-12-31'});
 assert.throws(()=>P.intentionRange('month','nope'));
});

test('#117 navigating periods crosses year boundaries and lands on period starts',()=>{
 assert.equal(P.shiftIntention('week','2026-12-30',1),'2027-01-04');
 assert.equal(P.shiftIntention('month','2026-12-31',1),'2027-01-01');
 assert.equal(P.shiftIntention('month','2026-01-31',-1),'2025-12-01');
 assert.equal(P.shiftIntention('quarter','2026-11-09',1),'2027-01-01');
 assert.equal(P.shiftIntention('quarter','2026-02-10',-1),'2025-10-01');
 assert.equal(P.shiftIntention('year','2026-06-15',-1),'2025-01-01');
 assert.equal(P.intentionTitle(P.intentionRange('quarter','2026-11-09')),'Q4 2026');
 assert.equal(P.intentionTitle(P.intentionRange('month','2026-11-09')),'November 2026');
 assert.equal(P.intentionTitle(P.intentionRange('week','2026-12-30')),'Dec 28 – Jan 3, 2027');
 const r=P.intentionRange('month','2026-12-01');
 assert.equal(P.intentionTense(r,'2026-11-09'),'future');assert.equal(P.intentionTense(r,'2026-12-15'),'current');assert.equal(P.intentionTense(r,'2027-01-01'),'past');
});

test('#117 one thoughtful template per period, each with its own emphasis; nothing pre-filled',()=>{
 const keys=p=>M.templates[p].seeds.map(s=>s.key);
 assert.deepEqual(keys('month'),['theme','intention','priorities','aspirations','forward','rituals','try','promise'],'the classic opening page holds every §7 section');
 assert.ok(keys('week').length<=4&&keys('week').includes('priorities')&&keys('week').includes('forward'),'weekly stays short and practical');
 for(const k of ['milestones','growth','simplify','aspirations'])assert.ok(keys('quarter').includes(k),`quarter: ${k}`);
 for(const k of ['theme','vision','aspirations','bucket','areas'])assert.ok(keys('year').includes(k),`year: ${k}`);
 assert.equal(new Set(['week','month','quarter','year'].map(p=>keys(p).join())).size,4,'no repeated form with different dates');
 for(const p of ['week','month','quarter','year']){const s=M.seedSections(p,ids);assert.ok(s.length>0);assert.ok(!M.pageHasContent(s),`${p} starts empty`);assert.deepEqual(M.parseSections(JSON.parse(JSON.stringify(s))),s,'round-trips');}
 assert.equal(M.seedSections('year',ids)[0].title,'Word of the year');
});

test('#117 parsing keeps content, drops junk, bounds sizes and validates references by kind',()=>{
 const s=M.parseSections([
  {id:'a',type:'priorities',title:'Top',content:{items:[1,2,3,4,5,6].map(i=>({id:`p${i}`,text:`P${i}`,...(i===1?{ref:{kind:'aspiration',id:'asp-1',label:'Learn to sew'}}:{}),...(i===2?{ref:{kind:'ritual',id:'r1',label:'nope'}}:{}),...(i===3?{taskId:'task-9'}:{})}))}},
  {id:'b',type:'aspirations',content:{items:[{id:'x',ref:{kind:'aspiration',id:'asp-1',label:'Learn to sew'},note:'Make a skirt'},{id:'y',ref:{kind:'task',id:'t',label:'wrong kind'}},{id:'z'}]}},
  {id:'c',type:'forward',content:{items:[{id:'f1',text:'Concert',event:{kind:'event',id:'ev-1',label:'Concert',date:'2026-11-20'}}]}},
  {id:'d',type:'writing',hidden:true,collapsed:true,content:{prompt:'whatever',text:'Soft and brave'}},
  {id:'a',type:'theme'},{id:'e',type:'canvas'},{id:'bad id!',type:'theme'},
 ]);
 assert.deepEqual(s.map(x=>x.id),['a','b','c','d'],'duplicates, unknown types and bad ids are dropped');
 assert.equal(s[0].content.items.length,5,'priorities stay at five');
 assert.equal(s[0].content.items[0].ref.label,'Learn to sew');assert.equal(s[0].content.items[1].ref,undefined,'priorities link only aspirations or tasks');assert.equal(s[0].content.items[2].taskId,'task-9');
 assert.deepEqual(s[1].content.items.map(i=>i.id),['x'],'an aspirations section holds only aspiration references');
 assert.equal(s[2].content.items[0].event.date,'2026-11-20');
 assert.equal(s[3].hidden,true);assert.equal(s[3].collapsed,true);assert.equal(s[3].content.prompt,'custom');assert.equal(s[3].title,'Notes to self','missing titles fall back to the kind');
 assert.ok(M.hasContent(s[3]),'a hidden section keeps its words');
 assert.deepEqual(M.parseSections(JSON.parse(JSON.stringify(s))),s);
});

test('#117 layout changes never silently lose content',()=>{
 const list=M.seedSections('month',ids),filled=list.map((x,i)=>i===1?{...x,content:{...x.content,text:'Gentle'}}:x);
 const r=M.removeSection(filled,filled[1].id);assert.equal(r.needsConfirmation,true);assert.equal(r.sections,filled,'nothing removed until confirmed');
 assert.equal(M.removeSection(filled,filled[1].id,true).sections.length,filled.length-1);
 assert.equal(M.removeSection(filled,filled[2].id).needsConfirmation,false,'an empty section goes straight away');
 const moved=M.moveSection(filled,filled[1].id,-1);assert.equal(moved[0].id,filled[1].id);assert.equal(M.moveSection(filled,filled[0].id,-1),filled,'the first cannot move earlier');
 assert.equal(M.canAddItem('priorities',5),false);assert.equal(M.canAddItem('list',3),true);
});

test('#117 historical integrity: a reference keeps the name it was chosen with',()=>{
 const r={kind:'aspiration',id:'a1',label:'Learn to sew'};
 assert.deepEqual(M.refStatus(r,{label:'Learn to sew'}),{label:'Learn to sew',missing:false});
 assert.deepEqual(M.refStatus(r,{label:'Sew a capsule wardrobe'}),{label:'Learn to sew',note:'now “Sew a capsule wardrobe”',missing:false},'renaming later never rewrites the page');
 assert.deepEqual(M.refStatus(r,undefined),{label:'Learn to sew',note:'no longer there',missing:true},'deleting the record leaves the page readable');
});

test('#117 storage: owner-only, one page per period, aligned period dates; export includes it',()=>{
 const sql=read('supabase/migrations/20261201000100_intentions.sql');
 assert.match(sql,/unique \(user_id, period, period_start\)/);
 assert.match(sql,/period in \('week', 'month', 'quarter', 'year'\)/);
 assert.match(sql,/extract\(isodow from period_start\) = 1 and period_end = period_start \+ 6/,'weeks start Monday');
 assert.match(sql,/extract\(month from period_start\) in \(1, 4, 7, 10\)/,'calendar quarters');
 assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.intention_pages from public, anon, authenticated/);
 for(const p of ['owner_read','owner_insert','owner_update','owner_delete'])assert.match(sql,new RegExp(`create policy ${p} on public\\.intention_pages`));
 assert.doesNotMatch(sql,/to anon/);
 assert.match(read('app/api/account/export/route.ts'),/client\.from\('intention_pages'\)\.select\('\*'\)/);
});

test('#117 Intentions stay independent: no writes to other modules, Daily Edit intentions untouched',()=>{
 const ui=read('components/planner/intentions/Intentions.tsx'),model=read('lib/intentions/model.ts'),persist=read('lib/intentions/persistence.ts');
 assert.doesNotMatch(ui+model+persist,/lib\/data\/daily|day_expression|daily_entries|setIntention/,'never reads or writes the Daily Edit intention');
 assert.equal((ui.match(/dispatch\(/g)??[]).length,1,'the only Planner write is the explicit Make it a task');
 assert.match(ui,/item\.taskId \|\| item\.ref\?\.kind === "task" \|\| making\.current\.has\(itemId\)/,'a priority makes at most one task');
 assert.doesNotMatch(ui,/\.save\(|saveAspiration|saveBucketEntry|ritual\/|dispatch\(\{ type: "event/,'aspirations, dreams, rituals and events are read-only here');
 assert.doesNotMatch(persist,/\.from\('(?!intention_pages)/,'persistence touches only its own table');
});

test('#117 Planner tabs and Reflections ↔ Intentions pairing',()=>{
 const planner=read('components/planner/Planner.tsx'),reflections=read('components/planner/reflections/Reflections.tsx'),ui=read('components/planner/intentions/Intentions.tsx');
 assert.match(planner,/tab === "intentions" && <Intentions /);
 assert.match(ui,/\/planner\?view=reflections&period=\$\{range\.period\}&date=\$\{range\.start\}/);
 assert.match(reflections,/\/planner\?view=intentions&period=\$\{period\}&date=\$\{start\}/);
 assert.match(reflections,/hasIntentions\(/,'Reflections only reads whether intentions exist');
 assert.match(ui,/Reflections are kept by week, month and year/,'quarters say why there is no matching reflection');
});
