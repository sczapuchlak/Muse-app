import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';

test('emoji drafts enforce the cap, replace an explicit slot and leave the confirmed list unchanged',()=>{
 const {changeEmojiDraft}=load('lib/daily-expression');const saved=['🌱'],first=changeEmojiDraft(saved,'☕'),second=changeEmojiDraft(first,'🌙');
 assert.deepEqual(saved,['🌱']);assert.deepEqual(second,['🌱','☕','🌙']);assert.equal(changeEmojiDraft(second,'📚'),second);assert.deepEqual(changeEmojiDraft(second,'📚',1),['🌱','📚','🌙']);assert.deepEqual(changeEmojiDraft(second,'☕'),['🌱','🌙']);assert.equal(changeEmojiDraft(second,'📚',-1),second);
});

test('Dayprint uses one authoritative daily Pulse and never renders legacy session scores',()=>{
 const {Dayprint}=load('components/mood/Dayprint'),{emptyCheckIn}=load('lib/mood');const morning={...emptyCheckIn('2026-10-30','morning'),energy:9,stress:3,reflection:'A recorded morning.'},evening={...emptyCheckIn('2026-10-30','evening'),energy:2,overallDay:6},other={...emptyCheckIn('2026-10-31','morning'),stress:10};
 const before=structuredClone([morning,evening,other]);const html=renderToStaticMarkup(React.createElement(Dayprint,{date:'2026-10-30',pulse:{date:'2026-10-30',energy:8,stress:4,overallDay:6},expression:{intention:'Go gently',intentionEmoji:'🌱',dayInThree:['☕','🌙']},records:[evening,morning,other],influences:[],onOpen(){},onDelete(){},onDate(){}}));
 const header=html.slice(html.indexOf('class="muse-dayprint-summary"')),sessions=html.slice(0,html.indexOf('class="muse-dayprint-summary"'));
 for(const text of ['Day in Three','Day Pulse','8','4','Overall Day'])assert.ok(header.includes(text),text);
 assert.ok(!header.includes('Morning ratings'));assert.ok(!header.includes('Evening ratings'));assert.ok(!header.includes('9<small>'));assert.ok(!header.includes('2<small>'));assert.ok(!header.includes('10<small>'));assert.ok(!sessions.includes('<dt>Energy</dt>'));assert.ok(sessions.includes('A recorded morning.'));assert.ok(sessions.indexOf('Edit morning')<sessions.indexOf('Edit evening'));assert.deepEqual([morning,evening,other],before);
});
