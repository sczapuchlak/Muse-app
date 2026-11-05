import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';

test('Mood is a Wellness pill and no longer appears in the main or mobile navigation',()=>{
 const {navigation,mobileMoreIds,isActiveDestination}=load('lib/navigation');
 assert.equal(navigation.some(item=>item.id==='mood'||item.href==='/mood'),false);
 assert.equal(mobileMoreIds.includes('mood'),false);
 assert.equal(navigation.find(item=>item.id==='nourish')?.label,'Wellness');
 assert.equal(isActiveDestination('/nourish','/nourish'),true);
 const wellness=readFileSync(root+'/components/nourish/Nourish.tsx','utf8');
 assert.match(wellness,/\{id:"mood",label:"Mood"\}/);
 assert.match(wellness,/view==="mood"\?<Mood embedded onDateChange=\{changeDate\}\/>/);
 assert.match(wellness,/query\.get\("view"\)==="plan"\?"plan":"mood"/,'Wellness opens on Mood');
 assert.ok(wellness.indexOf('{id:"mood",label:"Mood"}')<wellness.indexOf('{id:"plan",label:"Plan"}'),'Mood is the first Wellness section');
 for(const file of ['components/MealsCard.tsx','components/insights/NourishInsights.tsx'])assert.match(readFileSync(root+'/'+file,'utf8'),/\/nourish\?date=\$\{[^}]+\}&view=plan/,'meal links still open the meal plan');
});

test('legacy Mood URLs redirect to Wellness Mood while preserving date and other query values',async()=>{
 const {default:MoodPage}=load('app/(app)/mood/page');
 await assert.rejects(MoodPage({searchParams:Promise.resolve({date:'2026-11-03',source:'daily',view:'old'})}),error=>{
  assert.match(error.digest,/^NEXT_REDIRECT;replace;\/nourish\?date=2026-11-03&source=daily&view=mood;307;$/);
  return true;
 });
 const mood=readFileSync(root+'/components/mood/Mood.tsx','utf8');
 assert.match(mood,/embedded\?<h2 className="sr-only" id="mood-title">Mood<\/h2>/);
 assert.match(mood,/onDateChange\?\.\(item\.date\)/);
});
