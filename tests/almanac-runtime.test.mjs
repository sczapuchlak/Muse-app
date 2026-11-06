import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const sel=load('lib/almanac/select');
const sig=load('lib/almanac/signals');
const {almanacLibrary,almanacFiles}=load('lib/almanac/library');
const {signalCatalog}=load('lib/almanac/signal-catalog');
const {parseAlmanacPreferences}=load('lib/almanac/store');
const read=f=>readFileSync(resolve(root,f),'utf8');
const prefs={...sel.defaultAlmanacPreferences};
const shift=(d,n)=>new Date(Date.parse(`${d}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);
const nightOwl=(today='2026-11-06')=>sig.makeSignal('reading.trait.night-owl',{share:.52,timedSessions:24},{observedOn:today,strength:.4,href:'/whimsy/bookshelf'});
const streak=(today='2026-11-06',current=9)=>sig.makeSignal('reading.streak',{current,longest:14,readToday:true},{observedOn:today,strength:.6,href:'/whimsy/bookshelf'});
const pick=(o={})=>sel.selectAlmanac({signals:[nightOwl(),streak()],library:almanacLibrary,prefs,history:[],today:'2026-11-06',surface:sel.surfaces.bookshelf,userId:'u1',...o});

test('the selector is deterministic, quiet when asked, and silent without signals',()=>{
 assert.deepEqual(pick().map(p=>[p.entry.id,p.variant.id]),pick().map(p=>[p.entry.id,p.variant.id]),'same inputs, same words');
 assert.equal(pick().length,1,'balanced: one whisper per surface');
 assert.equal(pick({prefs:{...prefs,quietness:'chatty'}}).length,2);
 assert.deepEqual(pick({prefs:{...prefs,quietness:'quiet'}}),[],'quiet: no whispers');
 assert.deepEqual(pick({prefs:{...prefs,enabled:false}}),[],'off means off');
 assert.deepEqual(pick({signals:[]}),[],'nothing true to say: nothing said');
 assert.equal(pick()[0].signal.key,'reading.streak','the stronger signal leads');
 assert.ok(pick()[0].rendered.sections[0].text.includes('9 days'));
});

test('dismissals, muted families and cooldowns are respected; a day stays stable',()=>{
 const first=pick()[0],today='2026-11-06';
 const dismissed=[{entryId:first.entry.id,version:1,variantId:first.variant.id,signalKey:first.signal.key,surface:'bookshelf',shownOn:today,dismissedAt:'2026-11-06T10:00:00Z'}];
 assert.ok(!pick({history:dismissed,prefs:{...prefs,quietness:'chatty'}}).some(p=>p.entry.id===first.entry.id),'a dismissed line never returns');
 assert.ok(!pick({prefs:{...prefs,quietness:'chatty',mutedFamilies:['reading-moments']}}).some(p=>p.entry.family==='reading-moments'));
 const shownYesterday=[{entryId:first.entry.id,version:1,variantId:first.variant.id,signalKey:first.signal.key,surface:'bookshelf',shownOn:shift(today,-1)}];
 assert.notEqual(pick({history:shownYesterday})[0]?.entry.id,first.entry.id,'cooling down after yesterday');
 const shownToday=[{...shownYesterday[0],shownOn:today}];
 assert.deepEqual([pick({history:shownToday})[0].entry.id,pick({history:shownToday})[0].variant.id],[first.entry.id,first.variant.id],'today’s line stays all day');
 assert.equal(sel.exclusion(first.entry,first.signal,{prefs,history:shownYesterday,today,surface:sel.surfaces.bookshelf}),'cooling down');
});

test('over a simulated year, variants never repeat back to back and cooldowns hold',()=>{
 const history=[];let today='2026-01-01';
 for(let day=0;day<365;day++,today=shift(today,1)){
  for(const p of sel.selectAlmanac({signals:[streak(today,5+day%40),nightOwl(today)],library:almanacLibrary,prefs:{...prefs,quietness:'chatty'},history,today,surface:sel.surfaces.bookshelf,userId:'u1'})){
   const previous=history.filter(h=>h.entryId===p.entry.id).at(-1);
   if(previous){assert.notEqual(previous.variantId,p.variant.id,`${p.entry.id} repeated on ${today}`);
    assert.ok((Date.parse(today)-Date.parse(previous.shownOn))/86400000>=p.entry.cooldownDays,`${p.entry.id} inside its cooldown on ${today}`);}
   history.push({entryId:p.entry.id,version:p.entry.version,variantId:p.variant.id,signalKey:p.signal.key,surface:'bookshelf',shownOn:today});
  }}
 assert.ok(history.length>20,'it still speaks regularly');
});

test('sensitive and cross-module observations follow the settings; existing Insights cards keep showing',()=>{
 const mood=sig.makeSignal('mood.often-felt',{feeling:'Hopeful',count:7,checkins:12},{observedOn:'2026-11-06',strength:.7,href:'/mood'});
 const cards=o=>sel.selectAlmanac({signals:[mood],library:almanacLibrary,prefs,history:[],today:'2026-11-06',surface:sel.surfaces.insightsCards,userId:'u1',...o});
 assert.equal(cards().length,1,'the established mood card keeps its place even with sensitive off');
 const cross=sig.makeSignal('cross.reading-day',{withN:14,withoutN:11,withMean:7.2,withoutMean:6.1},{observedOn:'2026-11-06',strength:.5,href:'/insights'});
 const stars=o=>sel.selectAlmanac({signals:[cross],library:almanacLibrary,prefs,history:[],today:'2026-11-06',surface:sel.surfaces.constellations,userId:'u1',...o});
 assert.deepEqual(stars(),[],'constellations involve Mood: off by default');
 assert.equal(stars({prefs:{...prefs,sensitive:true}}).length,1);
 assert.deepEqual(stars({prefs:{...prefs,sensitive:true,crossModule:false}}),[]);
 assert.match(stars({prefs:{...prefs,sensitive:true}})[0].rendered.sections[0].text,/14.*11|11.*14/,'both sample sizes are stated');
});

test('settings parse defensively with private-by-default values',()=>{
 assert.deepEqual(parseAlmanacPreferences(undefined),{enabled:true,sensitive:false,crossModule:true,quietness:'balanced',mutedFamilies:[]});
 assert.deepEqual(parseAlmanacPreferences({enabled:false,sensitive:'yes',quietness:'loud',mutedFamilies:['rituals','rituals','<script>',3]}),{enabled:false,sensitive:false,crossModule:true,quietness:'balanced',mutedFamilies:['rituals']});
});

const own=id=>({id,userId:'u',revision:1,createdAt:'2025-01-01T00:00:00Z',updatedAt:'2025-01-01T00:00:00Z'});
const done=(id,finishedOn,startedOn)=>({id:`${id}-${finishedOn}`,finishedOn,...(startedOn?{startedOn}:{}),recordedAt:`${finishedOn}T00:00:00Z`});
const book=(id,over={})=>({...own(id),title:`Book ${id}`,status:'finished',reviewEmojis:[],...over});
let n=0;const session=(date,hour,minutes=60)=>({...own(`s${n++}`),bookId:'a',date,timeZone:'UTC',pages:10,manual:false,activeSegments:[{start:`${date}T${String(hour).padStart(2,'0')}:00:00.000Z`,end:new Date(Date.parse(`${date}T${String(hour).padStart(2,'0')}:00:00.000Z`)+minutes*60000).toISOString()}]});

test('reading adapter: traits, streaks, challenge crossings, records and swift finishes come from existing functions',()=>{
 const today='2026-11-06',sessions=Array.from({length:12},(_,i)=>session(shift(today,-i),22));
 const books=[book('a',{author:'A. Writer',completions:[done('a','2025-03-01'),done('a','2026-11-05','2026-11-04')]}),book('b',{author:'A. Writer',completions:[done('b','2026-10-01'),done('b2','2026-11-01')]})];
 const goals=[{...own('g'),period:'year',unit:'books',start:'2026-01-01',end:'2026-12-31',target:6,recurs:false}];
 const keys=sig.readingSignals({books,sessions,goals,today}).map(s=>s.key);
 for(const k of ['reading.trait.night-owl','reading.streak','reading.challenge.progress','reading.challenge.record','reading.speed.swift','reading.rhythm.hour'])assert.ok(keys.includes(k),k);
 const owl=sig.readingSignals({books,sessions,goals,today}).find(s=>s.key==='reading.trait.night-owl');
 assert.equal(owl.facts.share,1);assert.equal(owl.facts.timedSessions,12);assert.equal(owl.sensitivity,'ordinary');
 const crossing=sig.readingSignals({books,sessions,goals,today}).find(s=>s.key==='reading.challenge.progress');assert.equal(crossing.facts.threshold,50,'3 of 6 crossed half');
 assert.deepEqual(sig.readingSignals({books:[],sessions:[],goals:[],today}),[],'sparse: nothing to say');
 assert.throws(()=>sig.makeSignal('nope',{},{observedOn:today,strength:1,href:'/'}),/Unknown Almanac signal/);
});

test('rituals adapter: streaks count scheduled opportunities; a return never mentions the gap as failure',()=>{
 const today='2026-11-06',ritual={id:'r',name:'Stretch',groupId:'g',type:'checkbox',goal:1,unit:'',recurrence:{kind:'daily'},startDate:'2026-09-01',createdAt:'2026-09-01T00:00:00Z'};
 const entries=days=>days.map(d=>({id:`e${d}`,ritualId:'r',date:d,value:1,updatedAt:`${d}T12:00:00Z`}));
 const state=e=>({groups:[],rituals:[ritual],entries:e,celebratedMilestones:[]});
 const run=Array.from({length:6},(_,i)=>shift(today,-i));
 const s=sig.ritualSignals(state(entries(run)),today);assert.equal(s[0].key,'rituals.streak');assert.equal(s[0].facts.count,6);
 const back=sig.ritualSignals(state(entries(['2026-10-01',today])),today).find(x=>x.key==='rituals.return');
 assert.ok(back);assert.ok(back.facts.gapOpportunities>=7);
 const entry=almanacLibrary.find(e=>e.trigger.signal==='rituals.return');assert.deepEqual(Object.keys(entry.variables),['ritual'],'the gap is never put into words');
});

test('Insights revelations carry catalog signals, and every one has published words',()=>{
 const src=read('lib/insights/revelations.ts'),keys=[...src.matchAll(/signal:\{key:'([^']+)'/g)].map(m=>m[1]);
 assert.equal(keys.length,7,'every existing revelation type');
 for(const k of keys){assert.ok(signalCatalog[k],k);assert.ok(almanacLibrary.some(e=>e.trigger.signal===k&&e.format==='revelation'),`${k} has revelation words`);}
 const r={type:'water-goals',title:'t',explanation:'e',range:{start:'2026-10-01',end:'2026-10-31'},sampleSize:13,basis:'b',recordIds:['x'],module:'daily',href:'/nourish',rank:65,signal:{key:'wellness.water-goals',facts:{met:9,knownGoals:13}}};
 const [s]=sig.revelationSignals([r,{...r,signal:undefined}],'2026-11-06');assert.equal(s.evidence.sampleSize,13);assert.deepEqual(s.evidence.recordIds,['x']);
});

test('recaps, dreams and tarot adapters stay honest about missing data',()=>{
 const recap={tasks:{completed:null},rituals:{fullGoals:0},wellness:null,reading:null,mood:{checkins:0}};
 assert.equal(sig.recapSignal('week',recap,{end:'2026-11-01'}),null,'nothing recorded: no note');
 const r=sig.recapSignal('month',{...recap,reading:{minutes:120,readingDays:4,booksFinished:0}},{label:'October',end:'2026-10-31'});
 assert.equal(r.facts.readingSeconds,7200);assert.equal(r.facts.tasks,null);
 const note=almanacLibrary.find(e=>e.trigger.signal==='recap.month');
 const text=load('lib/almanac/render').renderVariant(note,note.variants[0],r.facts).sections.map(s=>s.text).join(' ');
 assert.match(text,/2 hours of reading across 4 days/);assert.doesNotMatch(text,/0 books|tasks|null|undefined/,'missing and zero sections drop out');
 const dream=(id,date,symbolIds)=>({...own(id),date,timeZone:'UTC',loggedAt:`${date}T08:00:00Z`,text:'private dream text',symbolIds,emotions:[],interpretation:''});
 const dreams=[dream('d1','2026-11-01',['water','door']),dream('d2','2026-11-03',['water','door']),dream('d3','2026-11-05',['water'])];
 const ds=sig.dreamSignals(dreams,id=>({water:'Water',door:'Doors'})[id],'2026-11-06');
 assert.deepEqual(ds.map(s=>s.key),['dreams.recurring-symbol','dreams.symbol-pair']);
 assert.doesNotMatch(JSON.stringify(ds),/private dream text/,'dream text never becomes a fact');
 assert.deepEqual(sig.dreamSignals(dreams,()=>undefined,'2026-11-06'),[],'unknown symbols are not guessed');
});

test('surfaces are wired, and what is stored is ids and dates only',()=>{
 for(const [file,surface] of [['components/whimsy/Bookshelf.tsx','surfaces.bookshelf'],['components/rituals/Rituals.tsx','surfaces.rituals'],['components/whimsy/Dreamscapes.tsx','surfaces.dreams'],['components/whimsy/TarotExperience.tsx','surfaces.tarot'],['components/whimsy/ReadingAtlas.tsx','surfaces.atlas']])
  assert.match(read(file),new RegExp(`<AlmanacWhisper surface=\\{${surface.replace('.','\\.')}\\}`),file);
 const insights=read('components/insights/Insights.tsx');assert.match(insights,/useVoicedRevelations\(factRevelations,today\)/);assert.match(insights,/<FieldNotes /);assert.match(insights,/<Constellations /);
 assert.match(read('components/Settings.tsx'),/id="muse-observations"/);
 const sql=read('supabase/migrations/20261113000100_almanac_impressions.sql');
 const columns=[...sql.matchAll(/^ ([a-z_]+) (?:uuid|text|integer|date|timestamptz)/gm)].map(m=>m[1]);
 assert.deepEqual(columns,['user_id','entry_id','version','variant_id','signal_key','surface','shown_on','dismissed_at','created_at']);
 assert.match(sql,/enable row level security/);assert.equal((sql.match(/create policy owner_/g)??[]).length,4);
 assert.ok(almanacFiles.every(f=>f.entries.every(e=>e.status==='published')));
});
