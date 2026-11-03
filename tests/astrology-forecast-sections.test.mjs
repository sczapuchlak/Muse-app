import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {parseForecastContent,forecastPreview,parseForecastKeyDates}=load('lib/astrology/forecast-content');

const cases=[
 {period:'daily',content:'✨ Tuesday, November 3 — Aries\n\n🪐 Overview: A first sentence. A second sentence.\n\n💼 Work & goals: A work paragraph.\n\n❤️ Relationships: A relationship paragraph.\n\n⚡ Energy & mood: An energy paragraph.\n\n🔮 Today’s tip: A tip.',headings:['Overview:','Work & goals:','Relationships:','Energy & mood:','Today’s tip:']},
 {period:'weekly',content:'✨ Week of 2026-11-02 — Aries\n\n🎯 This week, the introduction remains unlabelled.\n\n💼 Work & goals: A work paragraph.\n\n❤️ Relationships: A relationship paragraph.\n\n📈 The arc: The arc paragraph.\n\n⚡ Key moment: The key moment.\n\n💡 Your edge this week: An edge.\n\n🔮 Where this is heading: An ending.',headings:['Work & goals:','Relationships:','The arc:','Key moment:','Your edge this week:','Where this is heading:']},
 {period:'monthly',content:'✨ November — Aries\n\nThis November, an unlabelled lead contains **emphasis**.\n\n🌟 The bigger picture: The larger picture.\n\n💼 Career & ambition: Career paragraph.\n\n❤️ Love & relationships: Relationships paragraph.\n\n💰 Money & practical matters: Money paragraph.\n\n🌿 Wellbeing: Wellbeing paragraph.\n\n🗓️ Three moments that matter:\n  1. One exact provider line.\n  2. Another exact provider line.\n\n💪 Where you have power: A strength.\n\n⚠️ Where to be gentle: A caution.\n\n🔮 By month’s end: A conclusion.',headings:['The bigger picture:','Career & ambition:','Love & relationships:','Money & practical matters:','Wellbeing:','Three moments that matter:','Where you have power:','Where to be gentle:','By month’s end:']}
];
for(const {period,content,headings} of cases)test(`${period} source sections stay distinct and complete`,()=>{
 const blocks=parseForecastContent(content);
 assert.equal(blocks.map(block=>block.raw).join('\n\n'),content);
 assert.deepEqual(blocks.filter(block=>block.kind==='section').map(block=>block.heading),headings);
 assert.equal(blocks[0].kind,'dateline');
 assert.ok(forecastPreview(blocks).length>0);
 if(period!=='daily')assert.equal(blocks[1].kind,'paragraph');
 if(period==='monthly')assert.ok(blocks.some(block=>block.body.includes('  2. Another exact provider line.')));
});
test('unrecognized headings remain intact; no invented category is introduced',()=>{
 const source='✨ A provider dateline\n\nPlain introduction: with a colon.\n\nSomething unfamiliar\nNext line.';
 const blocks=parseForecastContent(source);
 assert.deepEqual(blocks.map(block=>block.kind),['dateline','paragraph','paragraph']);
 assert.equal(blocks.map(block=>block.raw).join('\n\n'),source);
});
test('structured key dates preserve supplied wording and reject malformed entries',()=>{
 const dates=[{date:'2026-11-03',title:'Provider title',description:'Provider description.'}];
 assert.deepEqual(parseForecastKeyDates(dates),dates);
 assert.deepEqual(parseForecastKeyDates(undefined),[]);
 assert.equal(parseForecastKeyDates([{date:'2026-11-03',title:'Provider title'}]),null);
});
