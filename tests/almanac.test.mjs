import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const {validateAlmanac,similarity}=load('lib/almanac/validate');
const {signalCatalog}=load('lib/almanac/signal-catalog');
const r=load('lib/almanac/render');
const {voiceProblems}=load('lib/almanac/voice-rules');
const dir=resolve(root,'content/almanac');
const files=()=>readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(readFileSync(resolve(dir,f),'utf8')));

const review={author:'Claude',reviewedBy:'Claude',updatedAt:'2026-11-06'};
const entry=(over={})=>({id:'ALM-TEST-001',version:1,status:'approved',family:'test',format:'whisper',trigger:{signal:'reading.streak'},sensitivity:'ordinary',tone:['warm'],
 variants:[{id:'a',body:'{current} in a row with a book.'},{id:'b',body:'The streak has your number now.'},{id:'c',body:'Pages every day lately, quietly stacking up.'}],
 variables:{current:{fact:'current',format:'count',plural:['day','days']}},cooldownDays:7,review,...over});
const check=e=>validateAlmanac([{family:'test',description:'d',voice:'v',entries:[e]}],signalCatalog);

test('the Almanac library validates: every entry, variant and variable fits the catalog and the voice rules',()=>{
 const report=validateAlmanac(files(),signalCatalog);
 assert.deepEqual(report.errors,[]);
 assert.ok(report.entries>=35,`${report.entries} entries`);assert.ok(report.variants>=100);
 for(const f of files())for(const e of f.entries)assert.ok(signalCatalog[e.trigger.signal],e.id);
});

test('the validator rejects off-voice, broken, unsafe and duplicate content',()=>{
 const errs=e=>check(e).errors.join('\n');
 assert.match(errs(entry()),/^$/,'the fixture itself is valid');
 assert.match(errs(entry({variants:[{id:'a',body:'Great job, {current} in a row!'},...entry().variants.slice(1)]})),/generic congratulation/);
 assert.match(errs(entry({variants:[{id:'a',body:'Reading makes you calmer.'},...entry().variants.slice(1)]})),/claims a cause/);
 assert.match(errs(entry({variants:[{id:'a',body:'You should read tonight.'},...entry().variants.slice(1)]})),/instruction/);
 assert.match(errs(entry({variants:[{id:'a',body:'{nope} in a row.'},...entry().variants.slice(1)]})),/\{nope\} is not declared/);
 assert.match(errs(entry({variables:{current:{fact:'current',format:'percent'}}})),/format percent does not fit a count fact/);
 assert.match(errs(entry({variants:entry().variants.slice(0,2)})),/at least 3 variants/);
 assert.match(errs(entry({variants:[{id:'a',body:'Pages every day lately, quietly stacking up nicely.'},...entry().variants.slice(1)]})),/near-duplicates/);
 assert.match(errs(entry({variants:[{id:'a',body:'x'.repeat(130)},...entry().variants.slice(1)]})),/limit 110/);
 assert.match(errs(entry({variants:[{id:'a',body:'One! {current}'},{id:'b',body:'Two! The streak has your number.'},entry().variants[2]]})),/exclamation/);
 assert.match(errs(entry({review:{author:'Claude',updatedAt:'2026-11-06'}})),/need review.reviewedBy/);
 assert.match(errs(entry({trigger:{signal:'reading.streak',when:[['current','>=',50]]}})),/sample facts do not meet the trigger/);
 assert.match(errs(entry({trigger:{signal:'nope'}})),/unknown signal/);
 // Sensitive content: never a whisper, never playful, never lower than its signal.
 assert.match(errs(entry({trigger:{signal:'mood.often-felt'},variables:{},variants:entry().variants.map(v=>({...v,body:'A plain line about feelings, number '+v.id}))})),/sensitivity ordinary is lower than its signal/);
 const sensitive=entry({trigger:{signal:'mood.often-felt'},sensitivity:'sensitive',tone:['playful'],variables:{}});
 assert.match(errs(sensitive),/cannot be whispers/);assert.match(errs(sensitive),/cannot use a playful tone/);
 assert.match(errs(entry({trigger:{signal:'money.top-category'},sensitivity:'sensitive',tone:['plain'],variables:{amount:{fact:'cents',format:'money'}},variants:entry().variants.map((v,i)=>({...v,body:`{amount} spent, line ${'abc'[i]}.`}))})),/money appears only in revelations/);
 // A comparison must always state both sample sizes.
 const constellation=entry({format:'constellation',trigger:{signal:'cross.reading-day'},sensitivity:'sensitive',tone:['plain'],variables:{m:{fact:'withMean',format:'number'}},
  variants:[{id:'a',title:'Reading days',body:'Overall Day averaged {m} on reading days.'},{id:'b',title:'Side by side',body:'A different sentence entirely, {m} on average.'}]});
 assert.match(errs(constellation),/must show withN/);assert.match(errs(constellation),/must show withoutN/);
 // A fact that can be missing may only appear in a section that requires it.
 const note=entry({format:'field-note',trigger:{signal:'recap.week'},sensitivity:'personal',variables:{tasks:{fact:'tasks',format:'count'}},
  variants:[{id:'a',title:'Week',body:[{text:'{tasks} done.'}]},{id:'b',title:'Week two',body:[{text:'Different words, {tasks} again.',requires:['tasks']}]}]});
 assert.match(errs(note),/a\: \{tasks\} can be missing/);
});

test('rendering formats facts precisely and never fills in missing ones',()=>{
 assert.deepEqual([0,12,21,9,23].map(r.formatHour),['midnight','noon','9 pm','9 am','11 pm']);
 assert.deepEqual([60,960,3600,4380,36000].map(r.formatDuration),['1 minute','16 minutes','1 hour','1.2 hours','10 hours']);
 assert.deepEqual([1,2,3,4,11,12,13,21,22,111].map(r.formatOrdinal),['1st','2nd','3rd','4th','11th','12th','13th','21st','22nd','111th']);
 assert.equal(r.formatVariable({fact:'n',format:'count',plural:['day','days']},{n:1}),'1 day');
 assert.equal(r.formatVariable({fact:'n',format:'count',plural:['day','days']},{n:1200}),'1,200 days');
 assert.equal(r.formatVariable({fact:'c',format:'money'},{c:41280}),'$412.80');
 assert.equal(r.formatVariable({fact:'s',format:'percent'},{s:.523}),'52%');
 assert.equal(r.formatVariable({fact:'d',format:'date'},{d:'2026-10-14'}),'October 14');
 const e=entry();
 assert.deepEqual(r.renderVariant(e,e.variants[0],{current:9}),{sections:[{text:'9 days in a row with a book.'}]});
 assert.equal(r.renderVariant(e,e.variants[0],{current:null}),null,'a missing fact never renders half a sentence');
 const note={variables:{t:{fact:'tasks',format:'count'},w:{fact:'workouts',format:'count'}}};
 const v={id:'a',title:'Week',body:[{text:'Opening.'},{text:'{t} tasks.',requires:['tasks']},{text:'{w} workouts.',requires:['workouts'],when:[['workouts','>',0]]}]};
 assert.deepEqual(r.renderVariant(note,v,{tasks:null,workouts:0}).sections.map(s=>s.text),['Opening.'],'missing and zero sections drop out');
 assert.deepEqual(r.renderVariant(note,v,{tasks:3,workouts:2}).sections.map(s=>s.text),['Opening.','3 tasks.','2 workouts.']);
 assert.equal(r.conditionsHold([['a','present'],['b','absent'],['c','>=',3]],{a:1,b:null,c:3}),true);
 assert.equal(r.conditionsHold([['c','>',3]],{c:null}),false,'a missing fact never satisfies a comparison');
});

test('the catalog carries only computed facts and display names, never free text people wrote',()=>{
 const allowed=new Set(['count','ratio','hour','seconds','date','label','cents','boolean']);
 for(const [key,spec] of Object.entries(signalCatalog)){
  assert.match(key,/^[a-z]+\.[a-z0-9.-]+$/,key);assert.ok(spec.source&&spec.means,key);
  for(const [name,fact] of Object.entries(spec.facts)){assert.ok(allowed.has(fact.type),`${key}.${name}`);
   assert.doesNotMatch(name,/reflection|note|review|text|thought|body|description|journal/i,`${key}.${name} looks like free text`);}
  if(spec.module==='mood'||spec.module==='money'||spec.crossModule?.includes('mood'))assert.equal(spec.sensitivity,'sensitive',key);
 }
});

test('one voice: Muse’s existing celebration lines pass the same Almanac rules',()=>{
 const {celebrationCopy}=load('lib/celebration-copy');
 for(const line of Object.values(celebrationCopy).flat())assert.deepEqual(voiceProblems(line),[],line);
 assert.ok(similarity('Seven days. Seven little victories.','Seven days. Seven little victories!')>.9);
});
