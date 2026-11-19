// Journal editorial upgrade (Nov 19): rich daily analyses and Weekly Reflection V2 with the Sunday unlock. Pure
// checks: the lock across week boundaries, the weekly input (their words first, secondary labels, faithful
// shortening), the new parsers alongside old saved analyses and reports, and the rules the prompts must carry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const S = load('lib/journal/stats'), C = load('lib/journal/context'), M = load('lib/journal/model'), I = load('lib/journal/instructions');

test('Sunday unlock: Monday–Sunday weeks in their own day; earlier weeks always open, later weeks never', () => {
  // Week of Mon Nov 9 – Sun Nov 15, 2026.
  assert.equal(S.reflectionLock('2026-11-09', '2026-11-09'), 'until-sunday', 'Monday');
  assert.equal(S.reflectionLock('2026-11-09', '2026-11-14'), 'until-sunday', 'Saturday, even late at night');
  assert.equal(S.reflectionLock('2026-11-09', '2026-11-15'), 'open', 'from midnight on Sunday');
  assert.equal(S.reflectionLock('2026-11-09', '2026-11-16'), 'open', 'a completed week');
  assert.equal(S.reflectionLock('2025-03-03', '2026-11-18'), 'open', 'an old (imported) week');
  assert.equal(S.reflectionLock('2026-11-16', '2026-11-15'), 'future');
  assert.equal(S.weekStart('2026-11-15'), '2026-11-09', 'Sunday belongs to the week that began Monday');
});

const entry = (o) => ({ date: '2026-11-10', journal: 'My Journal', title: '', summary: '', summarySource: null, tags: [], messages: [], ...o });
test('weekly input: date order kept, their words in full, earlier summaries and replies labelled as secondary', () => {
  const w = [
    entry({ date: '2026-11-10', title: 'Tuesday', summary: 'AI said a thing.', summarySource: 'ai', tags: ['Jamie', 'Work'], messages: [{ role: 'assistant', body: 'How was it?' }, { role: 'user', body: 'Annoyed at Jamie for ghosting.' }] }),
    entry({ date: '2026-11-12', title: 'Thursday', summary: 'Rosebud wrote this.', summarySource: 'import', messages: [{ role: 'user', body: 'Maybe I overreacted.', question: 'What changed?' }] }),
  ];
  const { text, shortened } = C.weekInput(w);
  assert.equal(shortened, false);
  assert.ok(text.indexOf('Tuesday, November 10, 2026') < text.indexOf('Thursday, November 12, 2026'), 'chronological');
  assert.match(text, /Me: Annoyed at Jamie for ghosting\./);
  assert.match(text, /Companion \(context\): How was it\?/);
  assert.match(text, /Earlier AI summary \(secondary, may be imperfect\): AI said a thing\./);
  assert.match(text, /imported from \(secondary\): Rosebud wrote this\./);
  assert.match(text, /Me: \(Answering “What changed\?”\) Maybe I overreacted\./);
  assert.match(text, /Tags: Jamie, Work/);
});

test('weekly input: a long week is shortened faithfully and in steps, never silently, and stays in bounds', () => {
  const long = Array.from({ length: 7 }, (_, i) => entry({ date: `2026-11-${10 + i}`, title: `Day ${i}`, messages: [{ role: 'assistant', body: 'r'.repeat(3000) }, { role: 'user', body: `START${i} ${'w '.repeat(9000)} END${i}` }] }));
  const step1 = C.weekInput(long, 140000);
  assert.ok(step1.text.length <= 140000);
  assert.match(step1.text, /START0/); assert.match(step1.text, /END6/, 'their own words stay whole while replies shrink');
  const tight = C.weekInput(long, 40000);
  assert.equal(tight.shortened, true); assert.ok(tight.text.length <= 40000);
  assert.match(tight.text, /left out for length/, 'shortening is marked');
  for (let i = 0; i < 7; i++) assert.match(tight.text, new RegExp(`Day ${i}`), 'every entry is still represented');
  assert.match(tight.text, /START3/); assert.match(tight.text, /END3/, 'a cut message keeps its beginning and end');
});

test('parsers: new analyses and reports read fully; older saved ones still read as written', () => {
  const a = M.parseAnalysisData({ title: 'Everything Has to Have an Answer', recap: 'R', overview: 'P1\n\nP2', insights: ['one', 'two', 'three'], people: ['Jamie'], topics: [], emotions: [], threads: [], memories: [] });
  assert.equal(a.overview, 'P1\n\nP2'); assert.deepEqual(a.insights, ['one', 'two', 'three']); assert.equal(a.reflection, '');
  const old = M.parseAnalysisData({ title: 't', recap: 'r', reflection: 'closer', insight: 'single', observations: ['o'] });
  assert.equal(old.overview, ''); assert.deepEqual(old.insights, []); assert.equal(old.insight, 'single');
  assert.equal(M.parseAnalysisData({ overview: 'x'.repeat(9000) }).overview.length, 9000, 'a long overview is not cut at the old 5,000 limit');
  const r = M.parseReportData({ title: 'The Art of Letting Things Be', review: 'A\n\nB', themes: [{ heading: 'H', body: 'x'.repeat(5000) }, { heading: 'empty', body: '' }], insights: [{ heading: 'I', body: 'b' }], wins: [{ heading: 'W', body: 'w' }], closing: '', covered: { start: '2026-11-09', end: '2026-11-15', entries: 6, generatedAt: 'now' } });
  assert.equal(r.title, 'The Art of Letting Things Be'); assert.equal(r.themes.length, 1, 'empty sections drop'); assert.equal(r.themes[0].body.length, 5000);
  assert.deepEqual(r.covered, { start: '2026-11-09', end: '2026-11-15', entries: 6, generatedAt: 'now' });
  const v1 = M.parseReportData({ narrative: 'Old week.', threads: ['t'], moments: [], observations: [] });
  assert.equal(v1.narrative, 'Old week.'); assert.equal(v1.title, ''); assert.equal(v1.covered, null);
});

test('the prompts carry the editorial rules (and the schemas ask for every section)', () => {
  assert.match(I.ANALYSIS_RULES, /No people's names/); assert.match(I.ANALYSIS_RULES, /never comma-separated topics/);
  assert.match(I.ANALYSIS_RULES, /Scale to the material/); assert.match(I.ANALYSIS_RULES, /primary evidence/);
  assert.match(I.ANALYSIS_RULES, /Keep observation and interpretation apart/); assert.doesNotMatch(I.ANALYSIS_RULES, /180–380 words/);
  assert.deepEqual([...I.analysisSchema.required], ['title', 'recap', 'overview', 'insights', 'people', 'topics', 'emotions', 'threads', 'memories']);
  assert.match(I.REPORT_RULES, /follow its progression day by day/); assert.match(I.REPORT_RULES, /Scale to the material/);
  assert.match(I.REPORT_RULES, /secondary/); assert.match(I.REPORT_RULES, /never force a grand narrative/); assert.doesNotMatch(I.REPORT_RULES, /short weekly reflection/);
  assert.deepEqual([...I.reportSchema.required], ['title', 'review', 'themes', 'insights', 'wins', 'closing']);
});
