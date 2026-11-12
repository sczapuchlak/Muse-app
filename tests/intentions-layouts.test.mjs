import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';
const {PeriodGuide}=load('components/planner/intentions/PeriodGuide');
const {intentionRange}=load('lib/intentions/periods');
const guide=(period,anchor,today='2026-11-12')=>renderToStaticMarkup(React.createElement(PeriodGuide,{range:intentionRange(period,anchor),today,go(){}}));
const count=(html,re)=>(html.match(re)??[]).length;

test('each Intentions period has its own guide, derived from the range alone (#119 Option A)',()=>{
 const week=guide('week','2026-11-12');
 assert.equal(count(week,/<li[ >]/g),7,'a week is seven days');
 assert.match(week,/data-today="true"/,'today is marked');
 assert.match(week,/\/planner\?view=agenda&amp;date=2026-11-09/,'days open the planner');
 assert.match(week,/Day 4 of 7/);
 const month=guide('month','2026-11-12');
 assert.equal(count(month,/<li[ >]/g),6,'November 2026 touches six Monday-start weeks');
 assert.match(month,/Day 12 of 30/);
 const quarter=guide('quarter','2026-11-12');
 assert.equal(count(quarter,/<li[ >]/g),3);assert.match(quarter,/October/);assert.match(quarter,/December/);assert.match(quarter,/Day 43 of 92/);
 const year=guide('year','2026-11-12');
 assert.equal(count(year,/<li[ >]/g),4);assert.match(year,/Q4/);assert.match(year,/Oct – Dec/);
 assert.match(guide('month','2027-02-10','2026-11-12'),/Starts Feb 1/,'a future period has not started');
 assert.match(guide('week','2026-10-05','2026-11-12'),/complete/,'a past period is complete');
});

test('period layouts arrange sections by type without changing the saved data',()=>{
 const css=readFileSync(root+'/components/planner/intentions/Intentions.css','utf8');
 for(const period of ['week','month','quarter','year'])assert.match(css,new RegExp(`\\.muse-intentions-page\\[data-period=${period}\\] \\.muse-intentions-grid\\{grid-template-columns`),`${period} has its own grid`);
 const tsx=readFileSync(root+'/components/planner/intentions/PeriodGuide.tsx','utf8');
 assert.doesNotMatch(tsx,/supabase|saveIntentions|fetch\(/,'the guide stores and loads nothing');
});
