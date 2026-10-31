import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';
const mood=load('lib/mood');
test('Mood defaults at 3pm in the configured timezone, not UTC, and historical edits preserve identity and capture metadata',()=>{
 for(const [time,expected] of [['2026-10-30T21:59:59Z','morning'],['2026-10-30T22:00:00Z','evening']])assert.equal(mood.defaultMoodPeriod(new Date(time),'America/Los_Angeles'),expected);
 assert.equal(mood.defaultMoodPeriod(new Date('2026-10-30T21:00:00Z'),'Europe/London'),'evening');
 let state=mood.updateMood(mood.initialMoodState,'2026-01-05','morning',{energy:8},'2026-10-30T21:00:00Z','America/Los_Angeles');const original=state.records[0];
 state=mood.updateMood(state,'2026-01-05','morning',{stress:10},'2026-10-31T01:00:00Z','Europe/London');const edited=state.records[0];
 assert.equal(edited.id,original.id);assert.equal(edited.createdAt,original.createdAt);assert.equal(edited.timeZone,'America/Los_Angeles');assert.equal(edited.date,'2026-01-05');assert.equal(edited.period,'morning');assert.notEqual(edited.updatedAt,original.updatedAt);
 const legacy={...edited};delete legacy.createdAt;state=mood.updateMood({...state,records:[legacy]},legacy.date,legacy.period,{reflection:'Edited legacy'},'later');assert.equal(state.records[0].createdAt,null,'never invent a historical capture time');
});
test('independent signal averages disclose independent denominators and deduplicate sessions',()=>{
 const a={...mood.emptyCheckIn('2026-10-30','morning'),energy:8,stress:10,updatedAt:'a'},b={...mood.emptyCheckIn('2026-10-30','evening'),energy:4,overallDay:2,updatedAt:'b'};
 const summary=mood.moodSummary([a,b,{...a,updatedAt:'z'}],[]);assert.equal(summary.count,2);assert.deepEqual(summary.signals,{energy:{count:2,average:6},stress:{count:1,average:10},overallDay:{count:1,average:2}});
});
test('date expressions retain ordered emoji separately from period-based Yale feelings; invalid reorder is a no-op',()=>{
 const {dailyExpression,reorderDayInThree}=load('lib/daily-expression');const records={'2026-10-30/intention':'Take a breath','2026-10-30/intention-emoji':'🌿','2026-10-30/day-in-three':['📚','☕','🌙']};
 assert.deepEqual(dailyExpression(records,'2026-10-30'),{intention:'Take a breath',intentionEmoji:'🌿',dayInThree:['📚','☕','🌙']});assert.deepEqual(dailyExpression(records,'2026-10-31'),{intention:'',intentionEmoji:null,dayInThree:[]});assert.deepEqual(reorderDayInThree(['📚','☕','🌙'],2,0),['🌙','📚','☕']);const values=['📚'];assert.equal(reorderDayInThree(values,0,4),values);
});
test('Dayprint omits missing signals and renders both sessions from existing records, without duplicate daily data',()=>{
 const {Dayprint}=load('components/mood/Dayprint');const record={...mood.emptyCheckIn('2026-10-30','morning'),stress:7};const html=renderToStaticMarkup(React.createElement(Dayprint,{date:record.date,expression:{intention:'A quieter day',intentionEmoji:'🌿',dayInThree:['☕']},records:[record],influences:[],onOpen(){},onDelete(){},onDate(){}}));assert.ok(html.includes('A quieter day'));assert.ok(html.includes('Stress'));assert.ok(!html.includes('Energy'));assert.ok(!html.includes('NaN'));assert.ok(html.includes('Edit morning check-in'));
});
test('milestones never replay loaded history or undo/recomplete, including deferred readiness',()=>{
 const {observeAchievement}=load('lib/achievement');let state=observeAchievement({observed:false,awarded:false},false);state=observeAchievement(state,true);assert.equal(state.celebrate,true);state=observeAchievement(state,false);assert.equal(observeAchievement(state,true).celebrate,false);assert.equal(observeAchievement({observed:false,awarded:false},true).celebrate,false);assert.equal(observeAchievement({observed:false,awarded:false},true,false).celebrate,false);
});
