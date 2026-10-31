import {dailyFixture,dailyTestTree} from './daily-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';
const mood=load('lib/mood'),{emotionCatalog}=load('lib/emotions');

test('Mood upserts one record per date/period, preserves independent optional signals and distinguishes missing',()=>{
 let state=structuredClone(mood.initialMoodState);
 state=mood.updateMood(state,'2026-10-29','morning',{emotionIds:['emotion-calm'],energy:8},'first');
 const id=state.records[0].id;
 state=mood.updateMood(state,'2026-10-29','morning',{stress:2,reflection:'A quieter start.'},'second');
 assert.equal(state.records.length,1);assert.equal(state.records[0].id,id);assert.equal(state.records[0].energy,8);assert.equal(state.records[0].overallDay,null);
 state=mood.updateMood(state,'2026-10-29','evening',{overallDay:6},'third');assert.equal(state.records.length,2);assert.equal(state.records[1].energy,null);
 for(const value of [0,11,2.5,NaN,Infinity])assert.equal(mood.updateMood(state,'2026-10-29','morning',{energy:value},'bad'),state);
 assert.equal(mood.updateMood(state,'2026-02-30','morning',{energy:2},'bad'),state);
 state=mood.updateMood(state,'2026-10-29','evening',{overallDay:null},'clear');assert.equal(state.records.length,1,'clearing the only value returns to missing');
});

test('influence limit/custom library and historical edits do not create competing check-ins',()=>{
 let state={...mood.initialMoodState,influences:[...mood.initialMoodState.influences,{id:'custom','name':'A new chapter'}]};
 state=mood.updateMood(state,'2025-12-31','evening',{emotionIds:['emotion-calm','emotion-calm','emotion-anxious'],causeTagIds:['custom','context-work','context-sleep','context-social']},'now');
 assert.deepEqual(state.records[0].emotionIds,['emotion-calm','emotion-anxious']);assert.equal(state.records[0].causeTagIds.length,3);assert.equal(state.records[0].causeTagIds[0],'custom');
 const edited=mood.updateMood(state,'2025-12-31','evening',{reflection:'Looking back.'},'later');assert.equal(edited.records.length,1);assert.equal(edited.records[0].date,'2025-12-31');
});

test('Daily Edit feelings remain period-scoped while both periods share the same daily Pulse',()=>{
 const {MuseSessionProvider}=load('components/MuseSession'),{MoodCard}=load('components/MoodCard'),{DayPulseCard}=load('components/DayPulseCard');
 let state=mood.updateMood(mood.initialMoodState,'2026-10-29','morning',{emotionIds:['emotion-calm'],energy:9,stress:3},'now');
 state=mood.updateMood(state,'2026-10-29','evening',{emotionIds:['emotion-anxious'],overallDay:4},'then');
 function render(period){return renderToStaticMarkup(dailyTestTree(React.createElement(MuseSessionProvider,{initialDate:'2026-10-29',initialRecords:{'library/emotional-observatory':state,'library/mood-sessions':{'2026-10-29':period}}},React.createElement(MoodCard,{emotions:emotionCatalog}),React.createElement(DayPulseCard,{date:'2026-10-29'})),dailyFixture({checkins:state.records,pulse:{energy:9,stress:3}})));}
 const morning=render('morning'),evening=render('evening');assert.ok(morning.includes('Remove feeling: Calm'));assert.ok(!morning.includes('Remove feeling: Anxious'));assert.equal((morning.match(/checked=""/g)??[]).length,2);assert.ok(evening.includes('Remove feeling: Anxious'));assert.equal((evening.match(/checked=""/g)??[]).length,2);
});

test('Mood statistics count only recorded dimensions and known emotion families',()=>{
 const a=mood.emptyCheckIn('2026-10-29','morning'),b=mood.emptyCheckIn('2026-10-29','evening');
 const summary=mood.moodSummary([{...a,overallDay:8,emotionIds:['emotion-calm','emotion-anxious']},{...b,energy:2,emotionIds:['emotion-calm']}],emotionCatalog);
 assert.equal(summary.averageDay,8);assert.equal(summary.dayCount,1);assert.equal(summary.count,2);assert.equal(summary.families.green,2);assert.equal(summary.families.red,1);assert.deepEqual(summary.frequent[0],['emotion-calm',2]);assert.equal(mood.moodSummary([],emotionCatalog).averageDay,null);
});

test('favorites belong to shared preferences without inventing a check-in',()=>{
 const {MuseSessionProvider}=load('components/MuseSession'),{EmotionPicker}=load('components/EmotionPicker');
 const state={...mood.initialMoodState,favoriteEmotionIds:['emotion-calm']};
 const html=renderToStaticMarkup(React.createElement(MuseSessionProvider,{initialDate:'2026-10-29',initialRecords:{'library/emotional-observatory':state}},React.createElement(EmotionPicker,{emotions:emotionCatalog,selectedIds:[],onToggle(){},onClose(){}})));
 assert.match(html,/aria-label="Favorite Calm" aria-pressed="true"/);assert.equal(state.records.length,0);assert.ok(html.includes('Favorites'));
});

test('Mood page has honest empty history, independent Pulse and a secondary category visualization',()=>{
 const {Mood}=load('components/mood/Mood');const html=renderToStaticMarkup(React.createElement(Mood));
 for(const label of ['FEEL IT. NAME IT. TRACK IT.','A little reflection','An emotional landscape','Your emotional history','Loading history…','0 recorded check-ins','morning','evening'])assert.ok(html.includes(label),label);
 assert.equal((html.match(/type="radio"/g)??[]).length,30);assert.equal((html.match(/class="muse-mood-history-feeling"/g)??[]).length,0);
});

test('Daily Edit and Insights editorial collections remain stable for a local day, including DST',()=>{
 const {mantraLibrary,mantraWindow,nextMantraBoundary,selectMantra}=load('lib/mantras');assert.equal(Object.keys(mantraLibrary).length,2);
 for(const [module,lines] of Object.entries(mantraLibrary)){assert.equal(lines.length,5);assert.equal(new Set(lines).size,5);const start=new Date('2026-10-30T07:00:00Z'),end=new Date('2026-10-31T06:59:59Z');assert.equal(mantraWindow(start),mantraWindow(end));assert.equal(selectMantra(module,mantraWindow(start)),selectMantra(module,mantraWindow(end)));assert.notEqual(selectMantra(module,mantraWindow(start)),selectMantra(module,mantraWindow(nextMantraBoundary(start))));}
 assert.equal(nextMantraBoundary(new Date('2026-10-30T20:00:00Z')).toISOString(),'2026-10-31T07:00:00.000Z');
 assert.equal(nextMantraBoundary(new Date('2026-11-01T07:00:00Z')).toISOString(),'2026-11-02T08:00:00.000Z');
});

test('forecast provider caches only valid successful same-day/sign results and handles unavailable/errors',async()=>{
 const {cachedForecastProvider,unavailableForecastProvider,parseCosmicPreferences}=load('lib/cosmic-forecast');
 assert.equal((await cachedForecastProvider(unavailableForecastProvider).getForecast('virgo','2026-10-30')).status,'unavailable');
 let calls=0;const service=cachedForecastProvider({async getForecast(sign,date){calls++;return {status:'ready',forecast:{sign,date,text:'A test response, not production copy.',attribution:'Test provider',retrievedAt:'now'},cached:false};}});
 assert.equal((await service.getForecast('virgo','2026-10-30')).cached,false);assert.equal((await service.getForecast('virgo','2026-10-30')).cached,true);assert.equal(calls,1);await service.getForecast('aries','2026-10-30');await service.getForecast('virgo','2026-10-31');assert.equal(calls,3);
 assert.equal((await cachedForecastProvider({async getForecast(){throw Error('offline');}}).getForecast('virgo','2026-10-30')).status,'error');
 assert.equal((await service.getForecast('virgo','invalid')).status,'error');assert.deepEqual(parseCosmicPreferences('{"enabled":false,"sign":"virgo"}'),{enabled:false,sign:'virgo'});assert.equal(parseCosmicPreferences('{"sign":"unknown"}').sign,null);
});

test('empty grocery board retains curated categories; populated board keeps relevant categories and full library is revealable',()=>{
 const {visibleGrocerySections,defaultGrocerySections}=load('lib/grocery-sections'),{GroceryList}=load('components/nourish/GroceryList'),{NourishProvider}=load('components/NourishStore'),{nourishSample}=load('lib/nourish-sample');
 assert.equal(visibleGrocerySections(defaultGrocerySections,[]).length,6);assert.deepEqual(visibleGrocerySections(defaultGrocerySections,[{sectionId:'pets'}]).map((item)=>item.id),['pets']);assert.equal(visibleGrocerySections(defaultGrocerySections,[],true).length,13);
 const html=renderToStaticMarkup(React.createElement(NourishProvider,{initialState:{...nourishSample,groceryItems:[]}},React.createElement(GroceryList)));
 assert.equal((html.match(/class="muse-grocery-section"/g)??[]).length,6);assert.ok(html.includes('Quantity'));assert.ok(html.includes('Quick-add category'));assert.ok(html.includes('Show all categories'));
});

test('grocery removal is reversible without changing identity, quantity, note or completion',()=>{
 const domain=load('lib/nourish'),{nourishSample}=load('lib/nourish-sample');const item={...domain.createGroceryItem('Pears','stable','now','produce'),complete:true,quantity:'3',note:'For lunch'};
 let state=domain.nourishReducer(nourishSample,{type:'grocery/save',item});state=domain.nourishReducer(state,{type:'grocery/remove',id:item.id});assert.equal(state.groceryItems.length,0);state=domain.nourishReducer(state,{type:'grocery/restore',items:[item]});assert.deepEqual(state.groceryItems[0],item);assert.equal(domain.nourishReducer(state,{type:'grocery/restore',items:[item]}).groceryItems.length,1);
 const {GroceryList}=load('components/nourish/GroceryList'),{NourishProvider}=load('components/NourishStore');const html=renderToStaticMarkup(React.createElement(NourishProvider,{initialState:state},React.createElement(GroceryList)));
 assert.ok(html.includes('aria-label="Edit Pears"'));assert.ok(html.includes('title="Remove Pears"'));assert.ok(html.includes('data-complete="true"'));assert.ok(html.includes('aria-checked="true"'));
});

test('allocation identity contains an inline category chip and Bills show readable dates with no underlined name controls',()=>{
 const {MoneyAllocationRow}=load('components/money/MoneyAllocationRow'),{MoneyBillRow}=load('components/money/MoneyBillRow'),{MoneyProvider}=load('components/money/MoneyStore'),{moneySample}=load('lib/money-sample');
 const allocation=moneySample.allocations.find((item)=>item.dueDate),html=renderToStaticMarkup(React.createElement(MoneyProvider,null,React.createElement(MoneyAllocationRow,{allocation,onOpen(){}}),React.createElement(MoneyBillRow,{bill:moneySample.bills[0],today:'2026-10-30',onOpen(){}})));
 assert.ok(html.includes('muse-money-allocation-identity'));assert.ok(html.includes('data-variant="chip"'));assert.ok(!html.includes(`>${allocation.dueDate}<`));assert.ok(!html.includes(`>${moneySample.bills[0].dueDate}<`));assert.ok(html.includes('muse-bill-paid-action'));assert.ok(!html.includes('text-button muse-bill-name'));assert.ok(html.includes('muse-money-ledger-number'));
});

test('Cosmic Forecast preference restores, switches immediately and survives denied writes in-session',()=>{
 const storage=new Map([['muse-cosmic-preferences','{"enabled":false,"sign":"virgo"}']]),events=new EventTarget();
 globalThis.window={localStorage:{getItem:(key)=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
 try{const pref=load('lib/cosmic-preference',true);assert.equal(JSON.parse(pref.readCosmicPreference()).enabled,false);let notifications=0;const stop=pref.subscribeCosmicPreference(()=>notifications++);pref.changeCosmicPreference({enabled:true});assert.equal(JSON.parse(pref.readCosmicPreference()).sign,'virgo');assert.equal(notifications,1);window.localStorage.setItem=()=>{throw Error('denied');};pref.changeCosmicPreference({enabled:false,sign:'aries'});assert.deepEqual(JSON.parse(pref.readCosmicPreference()),{enabled:false,sign:'aries'});assert.equal(JSON.parse(storage.get('muse-cosmic-preferences')).enabled,true,'storage remains unchanged while the live preference works');stop();}finally{delete globalThis.window;}
});
