import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const G=load('lib/insights/glance'),{emptyCheckIn}=load('lib/mood'),{emotionCatalog}=load('lib/emotions');
const read=f=>readFileSync(resolve(root,f),'utf8');
const record=(date,patch={})=>({date,intention_text:'',intention_emoji:null,day_in_three:[],energy:null,stress:null,overall_day:null,...patch});
const day=(date,patch={},priorities=[])=>({record:record(date,patch),priorities,checkins:[]});
const priority=(id,patch)=>({id,text:id,task_id:null,standalone_complete:null,display_complete:null,...patch});

test('#97 periods: Monday weeks, month and leap-year boundaries, year transitions, safe shifting',()=>{
 assert.deepEqual([G.glanceRange('week','2026-01-01').start,G.glanceRange('week','2026-01-01').end],['2025-12-29','2026-01-04'],'a week can span the new year');
 assert.equal(G.glanceRange('month','2024-02-10').end,'2024-02-29');assert.equal(G.glanceRange('month','2026-02-10').days.length,28);
 assert.equal(G.glanceRange('year','2024-06-01').days.length,366);
 assert.equal(G.shiftGlance('month','2026-01-31',1),'2026-02-28','month shift clamps the day');
 assert.equal(G.shiftGlance('year','2024-02-29',1),'2025-02-28');
 assert.equal(G.shiftGlance('month','2026-12-15',1),'2027-01-15');assert.equal(G.shiftGlance('week','2026-11-07',-1),'2026-10-31');
 assert.equal(G.glanceTitle(G.glanceRange('week','2026-11-04')),'Nov 2 – 8, 2026');assert.equal(G.glanceTitle(G.glanceRange('month','2026-11-04')),'November 2026');
 assert.throws(()=>G.glanceRange('day','nope'));
});

test('#97 Daily Edit: missing is never zero, priorities keep done/open/unknown and linked/standalone apart',()=>{
 const range=G.glanceRange('week','2026-11-04');
 const days={
  '2026-11-02':day('2026-11-02',{overall_day:8,energy:6,day_in_three:['☕','🌧️','🌙'],intention_text:'Slow down',intention_emoji:'🌱'},[priority('a',{standalone_complete:true}),priority('b',{task_id:'t1',display_complete:false})]),
  '2026-11-03':day('2026-11-03',{overall_day:4,day_in_three:['☕','📚','🌙']},[priority('c',{task_id:'t2',display_complete:null})]),
  '2026-11-04':day('2026-11-04',{overall_day:0}),
  '2026-10-30':day('2026-10-30',{overall_day:10}),
 };
 const checkIns=[{...emptyCheckIn('2026-11-02','morning'),emotionIds:['emotion-calm','emotion-calm']},{...emptyCheckIn('2026-11-02','evening'),emotionIds:['emotion-calm']},{...emptyCheckIn('2026-10-30','evening'),emotionIds:['emotion-calm']}];
 const g=G.dailyGlance(days,checkIns,emotionCatalog,range);
 assert.equal(g.rating.days,3,'a recorded 0 counts; unrated days and days outside the week do not');
 assert.equal(g.rating.average,4);assert.equal(g.energy.days,1);assert.equal(g.stress.average,null,'no stress recorded stays unknown');
 assert.deepEqual(g.rating.best,[{date:'2026-11-02',value:8}]);
 assert.deepEqual(g.priorities,{planned:3,completed:1,open:1,unknown:1,linked:2,standalone:1,days:2});
 assert.equal(g.emotions.find(e=>e.id==='emotion-calm')?.count,2,'once per check-in; out-of-range check-ins ignored');assert.equal(g.checkIns,2);
 assert.deepEqual(g.dayInThree.slice(0,2),[{emoji:'☕',count:2},{emoji:'🌙',count:2}]);assert.equal(g.dayInThreeDays,2);
 assert.deepEqual(g.intentions,[{date:'2026-11-02',emoji:'🌱',text:'Slow down'}]);
 assert.equal(g.recordedDays,3);
 assert.equal(g.ratings.length,7,'one entry per day, with nulls where nothing was rated');assert.equal(g.ratings.filter(r=>r.overallDay===null).length,4);
 const months=G.monthlyRatings(G.dailyGlance(days,[],emotionCatalog,G.glanceRange('year','2026-11-04')).ratings);
 assert.equal(months.length,12);assert.deepEqual(months.find(m=>m.month==='2026-10'),{month:'2026-10',average:10,days:1});assert.deepEqual(months.find(m=>m.month==='2026-01'),{month:'2026-01',average:null,days:0});
});

test('#97 water: unlogged days are missing, a logged 0 is real, units are never mixed',()=>{
 const range=G.glanceRange('week','2026-11-04');
 const w=G.waterGlance([{date:'2026-11-02',total:64,goal:64,unit:'oz'},{date:'2026-11-03',total:0,goal:64,unit:'oz'},{date:'2026-11-04',total:1500,goal:2000,unit:'mL'},{date:'2026-11-20',total:99,unit:'oz'}],range,'oz');
 assert.deepEqual(w.map(x=>[x.unit,x.days,x.average,x.goalMet,x.goalDays]),[['oz',2,32,1,2],['mL',1,1500,0,1]]);
 assert.deepEqual(G.waterGlance([],range,'oz'),[]);
});

test('#97 reading: "now reading" is a current snapshot; period stats use only dated sessions and finishes',()=>{
 const seg=(date,min)=>[{start:`${date}T18:00:00Z`,end:new Date(Date.parse(`${date}T18:00:00Z`)+min*60000).toISOString()}];
 const owned={userId:'u',revision:1,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',reviewEmojis:[]};
 const books=[{...owned,id:'b1',title:'Piranesi',status:'reading',totalPages:250,currentPage:100},{...owned,id:'b2',title:'No total',status:'reading',currentPage:40},
  {...owned,id:'b3',title:'Done',status:'finished',finishedOn:'2026-11-03',startedOn:'2026-10-01'},{...owned,id:'b4',title:'Shelved',status:'reading',archivedAt:'2026-05-01T00:00:00Z'}];
 const sessions=[{...owned,id:'s1',bookId:'b1',date:'2026-11-03',timeZone:'UTC',pages:20,activeSegments:seg('2026-11-03',30)},{...owned,id:'s2',bookId:'b1',date:'2026-10-20',timeZone:'UTC',pages:50,activeSegments:seg('2026-10-20',60)}];
 const now=G.currentlyReading(books,sessions);
 assert.deepEqual(now.map(x=>x.book.id).sort(),['b1','b2'],'finished and archived books are not on the nightstand');
 const piranesi=now.find(x=>x.book.id==='b1');assert.equal(piranesi.percent,40);assert.equal(piranesi.seconds,90*60);
 assert.equal(now.find(x=>x.book.id==='b2').percent,null,'no total pages means no invented percent');
 const week=G.readingGlance(books,sessions,G.glanceRange('week','2026-11-04'));
 assert.deepEqual([week.seconds,week.pages,week.readingDays,week.sessions],[1800,20,1,1]);
 assert.deepEqual(week.completed.map(c=>c.book.id),['b3']);
 const earlier=G.readingGlance(books,sessions,G.glanceRange('week','2026-09-10'));
 assert.deepEqual([earlier.seconds,earlier.completed.length],[0,0],'current status never leaks into a past period');
 assert.equal(G.readingDuration(90*60),'1 h 30 min');assert.equal(G.readingDuration(600),'10 min');
});

test('#97 glance cards render honest empty states and never shade unrated days as zero',()=>{
 const S=load('components/insights/glance/GlanceSections');
 const range=G.glanceRange('month','2026-11-04'),daily=G.dailyGlance({},[],emotionCatalog,range);
 const html=[React.createElement(S.RatingSummary,{daily}),React.createElement(S.WaterSummary,{water:[],loaded:true}),React.createElement(S.PrioritiesSummary,{summary:daily.priorities}),React.createElement(S.EmotionSnapshot,{daily}),React.createElement(S.MovementCard,{movement:G.movementGlance([],[],range),loaded:true})].map(e=>renderToStaticMarkup(e)).join('');
 for(const text of ['No days rated yet.','No water logged.','No priorities set.','No feelings recorded.','No movement recorded.'])assert.ok(html.includes(text),text);
 const cal=renderToStaticMarkup(React.createElement(S.MonthCalendar,{range,days:{'2026-11-04':day('2026-11-04',{overall_day:0})},today:'2026-11-07',onOpen:()=>{}}));
 assert.equal((cal.match(/data-rated="true"/g)??[]).length,1,'only the rated day (even a 0) is shaded');
 assert.match(cal,/Wednesday, November 4: Overall Day 0 of 10/);assert.match(cal,/Thursday, November 5: not rated/);
 const strip=renderToStaticMarkup(React.createElement(S.DayStrip,{range:G.glanceRange('week','2026-11-04'),days:{},checkIns:[],today:'2026-11-04',onOpen:()=>{}}));
 assert.match(strip,/Thursday, November 5, not yet/);assert.match(strip,/muse-today-ring/);
});

test('#97 non-destructive: detailed Insights hidden behind a flag, not deleted; Dayprint moved to Insights; Mood keeps logging',()=>{
 assert.equal(load('lib/insights/flags').CLASSIC_INSIGHTS,false);
 const page=read('app/(app)/insights/page.tsx');assert.match(page,/CLASSIC_INSIGHTS\?<Insights\/>:<InsightsGlance\/>/);
 for(const f of ['Insights','Overview','PlansInsights','MoodInsights','MoneyInsights','NourishInsights','AstrologyInsights','CollectionsInsights','InsightsCustomize','DateInspection','PeriodComparison'])assert.ok(existsSync(resolve(root,`components/insights/${f}.tsx`)),f);
 const classic=read('components/insights/Insights.tsx');for(const id of ['overview','plans','mood','money','nourish','astrology','collections'])assert.match(classic,new RegExp(`id:'${id}'`),id);
 const glance=read('components/insights/glance/InsightsGlance.tsx');
 assert.match(glance,/<Dayprint /);assert.match(glance,/editHref=\{\(r\) => `\/mood\?date=/,'edits go back to Mood');
 assert.doesNotMatch(glance,/store\?\.edit|dispatch\(|saveMark|\.insert\(|\.update\(/,'Insights is read-only');
 const mood=read('components/mood/Mood.tsx');
 assert.doesNotMatch(mood,/<Dayprint /,'Mood no longer hosts the Dayprint portrait');
 assert.match(mood,/<MoodCheckInLayout /);assert.match(mood,/<ReflectionEditor /);assert.match(mood,/function CheckInHistory/);
 assert.match(mood,/store\?\.edit\(removed\.date,\{kind:'delete',id:removed\.id\}\)/,'deleting a check-in still works');
 assert.match(mood,/\/insights\?period=day&date=/);
 const prefs=load('lib/insights/preferences');
 assert.equal(prefs.parseInsightsPreferences({readingProgress:'time'}).readingProgress,'time');assert.equal(prefs.parseInsightsPreferences({readingProgress:'nope'}).readingProgress,'percent');
 assert.equal(readdir('supabase/migrations').some(f=>f.slice(0,14)>'20261123000100'),false,'no new migration');
});
import {readdirSync} from 'node:fs';
function readdir(p){return readdirSync(resolve(root,p));}
