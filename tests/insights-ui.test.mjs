import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';
const {calendarDays,shiftCalendarMonth,calendarKey}=load('lib/calendar');
test('Muse calendar uses Monday-first civil dates across leap years and month/year boundaries',()=>{
 const days=calendarDays('2024-02-29');assert.equal(days.length,42);assert.equal(days[0],'2024-01-29');assert.equal(days[41],'2024-03-10');assert.ok(days.includes('2024-02-29'));
 assert.equal(shiftCalendarMonth('2024-01-31',1),'2024-02-29');assert.equal(shiftCalendarMonth('2024-02-29',12),'2025-02-28');assert.equal(shiftCalendarMonth('2026-12-31',1),'2027-01-31');
 for(const [key,expected]of [['ArrowRight','2026-11-01'],['ArrowLeft','2026-10-30'],['ArrowUp','2026-10-24'],['ArrowDown','2026-11-07'],['Home','2026-10-26'],['End','2026-11-01'],['PageUp','2026-09-30'],['PageDown','2026-11-30']])assert.equal(calendarKey('2026-10-31',key),expected);
 assert.equal(calendarKey('2024-02-29','PageDown',true),'2025-02-28');assert.equal(calendarKey('2026-10-31','Enter'),null);
});
test('calendar exposes selected/today independently, outside-month dates and one roving tab stop',()=>{
 const {MuseCalendar}=load('components/MuseDatePicker'),html=renderToStaticMarkup(React.createElement(MuseCalendar,{date:'2024-02-29',today:'2024-02-28',onChange(){}}));
 assert.equal((html.match(/role="gridcell"/g)||[]).length,42);assert.equal((html.match(/tabindex="0"/g)||[]).length,1);assert.equal((html.match(/aria-selected="true"/g)||[]).length,1);assert.equal((html.match(/aria-current="date"/g)||[]).length,1);assert.ok(html.includes('data-outside="true"'));assert.ok(html.includes('Previous year'));assert.ok(html.includes('Next month'));assert.ok(html.includes('Today follows your saved timezone.'));
});
test('personal Overview excludes financial totals and revelations without changing the financial metrics',()=>{
 const {normalizeInsights}=load('lib/insights/normalize'),{calculateInsights}=load('lib/insights/metrics'),{emptyPlannerState}=load('lib/data/planner'),{emptyMoney}=load('lib/data/money'),{emptyWellness}=load('lib/wellness'),{emptyRituals}=load('lib/data/rituals'),{Overview}=load('components/insights/Overview');
 const raw={planner:emptyPlannerState(),rituals:emptyRituals(),money:{...emptyMoney(),transactions:[{id:'t',merchant:'Shop',date:'2026-10-30',amountCents:4500,tagIds:[],splits:[]}]},nourish:emptyWellness(),mood:{records:[],influences:[],favoriteEmotionIds:[]},dailyPulse:[{date:'2026-10-30',energy:8,stress:null,overallDay:null}],movement:[],water:[],timeZone:'America/Los_Angeles',today:'2026-10-31'},metrics=calculateInsights(normalizeInsights(raw),{start:'2026-10-26',end:'2026-11-01'}),financial={module:'money',type:'spending-category',title:'Food is your largest recorded spending category.',explanation:'financial',href:'/money',basis:'Transactions',recordIds:['t'],sampleSize:3,rank:60,range:metrics.range};
 const html=renderToStaticMarkup(React.createElement(Overview,{metrics,revelations:[financial],onDate(){}}));assert.ok(!html.includes('Food is your'));assert.ok(!html.includes('Recorded spending'));assert.ok(!html.includes('$45.00'));assert.ok(html.includes('Recorded Energy'));assert.equal(metrics.money.spending,4500);
 const {RevelationList}=load('components/insights/RevelationList'),money=renderToStaticMarkup(React.createElement(RevelationList,{items:[financial]}));assert.ok(money.includes('Food is your'));assert.ok(money.includes('<details'));assert.ok(money.includes('What this is based on'));assert.ok(money.includes('button-ghost'));assert.ok(money.includes('href="/money"'));
});
