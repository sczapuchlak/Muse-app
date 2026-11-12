import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';
const {astrologyLibrary,libraryEntry,searchAstrologyLibrary}=load('lib/astrology/library');
const {astrologyMetrics,astrologyRecap}=load('lib/astrology/insights');
const {AstrologyStore}=load('lib/astrology/store'),{emptyAstrology}=load('lib/astrology/models');
const {wheelLabels}=load('lib/astrology/wheel');
const {AstrologyEntryDetail}=load('components/astrology/AstrologyEntryDetail');
const {PlacementDetail,CosmicChart}=load('components/astrology/CosmicChart');
const {CosmicCalendar}=load('components/astrology/CosmicCalendar');
const {AstrologyLibrary,libraryCategories}=load('components/astrology/AstrologyLibrary');
const {calculateNatal}=load('lib/astrology/calculations');
const escape=value=>renderToStaticMarkup(React.createElement('span',null,value)).slice(6,-7);
const range={start:'2026-11-01',end:'2026-11-30'},status={loaded:true};
const activity=(kind,reference_id,date='2026-11-02')=>({user_id:'synthetic-owner',kind,reference_id,date,time_zone:'America/Los_Angeles',created_at:'2026-11-03T00:01:00Z'});
test('60 original library entries have stable valid relationships, substantive sections, and all requested topics',()=>{
 assert.equal(astrologyLibrary.length,60);assert.equal(new Set(astrologyLibrary.map(e=>e.id)).size,60);
 assert.deepEqual(Object.fromEntries([...new Set(astrologyLibrary.map(e=>e.category))].map(c=>[c,astrologyLibrary.filter(e=>e.category===c).length])),{Signs:12,Planets:10,Houses:12,Elements:4,Modalities:3,Aspects:5,Concepts:14});
 for(const entry of astrologyLibrary){assert.equal(entry.author,'Muse original editorial');assert.ok(entry.summary.length>40);assert.ok(entry.sections.length);assert.ok(entry.sections.every(s=>s.title&&s.text.length>18));assert.ok(entry.sources.every(s=>new URL(s.url).protocol==='https:'));for(const id of entry.related)assert.ok(libraryEntry(id),`${entry.id} -> ${id}`);}
 assert.ok(searchAstrologyLibrary('RETROGRADE','Concepts').some(e=>e.id==='concept-retrograde'));assert.equal(searchAstrologyLibrary('no-such-constellation-123','').length,0);
 for(const sign of astrologyLibrary.filter(e=>e.category==='Signs'))assert.ok(sign.sections.some(s=>s.title==='Love & relationships'));
});
test('opened library and placement experiences render complete interpretations immediately',()=>{
 const entry=libraryEntry('sign-aries'),html=renderToStaticMarkup(React.createElement(AstrologyEntryDetail,{entry,onOpen(){}}));
 for(const section of entry.sections)assert.ok(html.includes(escape(section.title)));assert.ok(html.includes(escape(entry.sections.at(-1).text)));assert.ok(!html.includes('See full details'));
 const chart=calculateNatal({date:'2000-01-01',time:'12:00',accuracy:'exact',uncertaintyMinutes:0,place:{id:'synthetic',name:'Synthetic reference',latitude:51.4779,longitude:0,timeZone:'UTC'},zodiac:'tropical',houseSystem:'whole-sign'});
 const full=renderToStaticMarkup(React.createElement(PlacementDetail,{placement:chart.placements[0],chart,onLibrary(){}}));
 assert.ok(full.includes('Interpretive tradition'));assert.ok(full.includes('Career &amp; creativity'));assert.ok(full.includes(escape(libraryEntry('sign-capricorn').sections.at(-1).text)));
});
test('natal snapshot derives angles, lunar phase and distributions from calculated placements',()=>{
 const chart=calculateNatal({date:'2000-01-01',time:'12:00',accuracy:'exact',uncertaintyMinutes:0,place:{id:'synthetic',name:'Synthetic reference',latitude:51.4779,longitude:0,timeZone:'UTC'},zodiac:'tropical',houseSystem:'whole-sign'});
 const html=renderToStaticMarkup(React.createElement(CosmicChart,{chart,onPlanet(){},onLibrary(){},onDelete(){},onProfile(){}}));
 for(const label of ['My Cosmic Snapshot','Approximate natal lunar phase','Elements','Modalities','Ascendant','Descendant','Midheaven','IC'])assert.ok(html.includes(label));
 assert.ok(html.includes('Moon–Sun ecliptic separation'));
});
test('Library starts on a one-lesson-at-a-time Astro 101 path, with seven real collections under Topics, and Calendar tolerates an unresolved local date during server render',()=>{
 const library=renderToStaticMarkup(React.createElement(AstrologyLibrary,{onOpen(){}}));
 assert.equal(Object.keys(libraryCategories).length,7);assert.ok(library.includes('>Topics<')&&library.includes('>Learn<'));
 assert.ok(library.includes('aria-labelledby="cosmic-astro101-heading"'));
 assert.equal((library.match(/class="muse-cosmic-astro101-number"/g)??[]).length,7);
 for(const title of ['What is a birth chart?','Meet the Big Three','Read a placement','Understand an aspect','Natal sky and moving sky','Compare two charts','Understand a composite'])assert.ok(library.includes(title));
 const calendar=renderToStaticMarkup(React.createElement(CosmicCalendar,{today:'',timeZone:'UTC',active:false,onOpen(){},onLibrary(){},onReflect(){}}));
 assert.ok(calendar.includes('Calculating celestial events'));
 assert.ok(!calendar.includes('Invalid Date'));
});
test('wheel glyphs separate at clusters and zodiac seam while retaining planet identity',()=>{
 const labels=wheelLabels(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].map((body,i)=>({body,longitude:(358+i/10)%360})));
 assert.equal(labels.size,10);const angles=[...labels.values()].sort((a,b)=>a-b);for(let i=0;i<angles.length;i++){const gap=(angles[(i+1)%angles.length]-angles[i]+360)%360;assert.ok(gap>=15.999,gap);}
});
test('Insights and arbitrary recap ranges use actual local dates, deduplicate actions and exclude unavailable sources',()=>{
 const journal=[{id:'j1',date:'2026-11-01',reference:{type:'event',id:'new-moon/instant'}},{id:'j1',date:'2026-11-01',reference:null},{id:'outside',date:'2026-10-31',reference:null}];
 const source={status,activity:[activity('library-viewed','sign-aries'),activity('library-viewed','sign-aries'),activity('library-viewed','sign-taurus','2026-10-31'),activity('event-saved','new-moon/instant'),activity('chart-explored','chart/Sun')],journal};
 const metrics=astrologyMetrics(source,range);assert.equal(metrics.journalEntries,1);assert.equal(metrics.libraryVisits,1);assert.equal(metrics.distinctLibraryTopics,1);assert.equal(metrics.eventsSaved,1);assert.equal(metrics.placementsExplored,1);assert.equal(metrics.activityDays,1);assert.equal(metrics.forecastViews,0);
 assert.deepEqual(metrics.journalSourceIds,['j1']);assert.equal(astrologyRecap(source,{start:'2026-01-01',end:'2026-12-31'}).journalEntries,2);
 for(const status of [{loaded:false},{loaded:true,error:'Offline'},{loaded:true,pending:true}])assert.equal(astrologyMetrics({...source,status},range).ready,false);
 assert.throws(()=>astrologyMetrics(source,{start:range.end,end:range.start}));
 const wiring=readFileSync(root+'/components/insights/useInsightsSources.ts','utf8');assert.ok(wiring.includes('journal.map(({id,date,reference})=>({id,date,reference}))'));assert.ok(!JSON.stringify(metrics).includes('birth'));
});
test('failed writes keep exact command identity and records; retry acknowledges once, reload cannot fabricate success',async()=>{
 let calls=0;const commands=[],initial=emptyAstrology();const store=new AstrologyStore({read:async()=>initial,write:async c=>{commands.push(c);if(++calls===1)throw Error('Unconfirmed');return {...initial,journal:[{id:'one',text:'Kept'}]};}});
 await assert.rejects(()=>store.execute('journal-save',{id:'one'}),/Load/);await store.load();
 assert.equal(await store.execute('journal-save',{id:'one'}),false);assert.equal(store.getSnapshot().records.journal.length,0);assert.ok(store.getSnapshot().pending);
 await assert.rejects(()=>store.execute('journal-save',{id:'two'}),/Retry/);
 assert.equal(await store.retry(),true);assert.equal(commands[0].commandId,commands[1].commandId);assert.equal(store.getSnapshot().pending,null);assert.equal(store.getSnapshot().records.journal[0].text,'Kept');
});
test('reads do not race acknowledged writes, and failed reload preserves private saved records',async()=>{
 let finish,fail=false;const initial=emptyAstrology(),store=new AstrologyStore({read:()=>fail?Promise.reject(Error('Offline')):new Promise(resolve=>{finish=resolve;}),write:async()=>({...initial,journal:[{id:'new'}]})});
 const reading=store.load(),writing=store.execute('journal-save',{id:'new'});finish(initial);await reading;await writing;assert.equal(store.getSnapshot().records.journal[0].id,'new');
 fail=true;await store.load(true);assert.equal(store.getSnapshot().records.journal[0].id,'new');assert.ok(store.getSnapshot().error);
});
test('five Whimsy tabs preserve the Bookshelf redirect, widgets, and one Daily Edit forecast',()=>{
 const {experiences}=load('components/whimsy/WhimsyFoundation'),{whimsyWidgets}=load('lib/whimsy/integrations');assert.equal(experiences.length,5);assert.equal(whimsyWidgets.length,5);assert.ok(readFileSync(root+'/app/(app)/whimsy/bookshelf/page.tsx','utf8').includes('/collections?kind=book')&&readFileSync(root+'/app/(app)/whimsy/bookshelf/page.tsx','utf8').includes('/collections/reading-atlas'));
 for(const e of experiences)assert.ok(readFileSync(root+`/app/(app)/whimsy/${e.id}/page.tsx`,'utf8'));
 const daily=readFileSync(root+'/components/DailyEdit.tsx','utf8');assert.equal((daily.match(/<CosmicForecast\b/g)||[]).length,1);
 const forecast=readFileSync(root+'/components/CosmicForecast.tsx','utf8');assert.ok(forecast.includes('ForecastReading'));assert.ok(!forecast.includes('legacyForecastContent'));
});
test('authenticated return paths include the six canonical Whimsy destinations without accepting arbitrary paths',()=>{const {safeReturnPath}=load('lib/auth/paths'),{whimsyExperiences}=load('lib/whimsy/models');for(const id of whimsyExperiences)assert.equal(safeReturnPath(`/whimsy/${id}`),`/whimsy/${id}`);assert.equal(safeReturnPath('/whimsy/observatory?view=chart#placements'),'/whimsy/observatory?view=chart#placements');for(const path of ['/whimsy/not-a-destination','//example.test/whimsy/observatory','/auth/confirm','/whimsy/observatory/unknown'])assert.equal(safeReturnPath(path),'/');});
test('meaningful exploration queues behind an active save and coalesces repeated topic opens',async()=>{
 let release;const writes=[],initial=emptyAstrology();const store=new AstrologyStore({read:async()=>initial,write:async command=>{writes.push(command);if(command.operation==='journal-save')await new Promise(resolve=>{release=resolve;});return initial;}});await store.load();const writing=store.execute('journal-save',{id:'synthetic'});store.noteActivity('library-viewed','concept-retrograde','2026-11-02');store.noteActivity('library-viewed','concept-retrograde','2026-11-02');release();await writing;for(let i=0;store.getSnapshot().busy&&i<20;i++)await new Promise(r=>setTimeout(r,1));assert.equal(writes.length,2);assert.equal(writes[1].operation,'activity');assert.equal(writes[1].record.reference_id,'concept-retrograde');
});
