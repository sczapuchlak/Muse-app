import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {validateDailyPatch}=load('lib/data/daily');
test('daily patches preserve null/zero distinction and ordered compound native emoji without accepting ownership fields',()=>{
 assert.doesNotThrow(()=>validateDailyPatch({energy:null,stress:1,overall_day:10,intention_text:null,intention_emoji:'👩🏽‍💻',day_in_three:['🇺🇸','🌱','👨‍👩‍👧']}));
 assert.doesNotThrow(()=>validateDailyPatch({day_in_three:[]}));
 for(const energy of [0,11,1.5,'5',NaN,undefined])assert.throws(()=>validateDailyPatch({energy}));
 for(const day_in_three of [null,['a','b','c','d'],['🌱🌱'],[null]])assert.throws(()=>validateDailyPatch({day_in_three}));
 assert.throws(()=>validateDailyPatch({user_id:'other'}));
 assert.throws(()=>validateDailyPatch({local_date:'2026-01-01'}));
 assert.throws(()=>validateDailyPatch({intention_emoji:'🌱🌱'}));
});
