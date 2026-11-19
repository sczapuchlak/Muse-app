// Journal: On This Day and monthly/yearly Life Reviews (Nov 19). Pure checks: anniversary matching (years, this year
// excluded, February 29, drafts), period boundaries and unlock rules, range counts, the bounded review input, the
// prompts and parsed sections.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const S = load('lib/journal/stats'), C = load('lib/journal/context'), M = load('lib/journal/model'), I = load('lib/journal/instructions');
const conv = (id, localDate, o = {}) => ({ id, localDate, startedAt: `${localDate}T12:00:00Z`, status: 'completed', userWords: 10, journalId: 'j', revision: 1, title: id, summary: '', ...o });

test('On This Day: earlier years only, newest first, drafts never, February 29 kept', () => {
  const list = [conv('a', '2025-11-19'), conv('b', '2024-11-19'), conv('b2', '2024-11-19', { startedAt: '2024-11-19T20:00:00Z' }), conv('now', '2026-11-19'), conv('earlier-this-year', '2026-01-19'), conv('d', '2023-11-19', { status: 'draft' }), conv('x', '2025-11-18')];
  assert.deepEqual(S.onThisDay(list, '2026-11-19').map((c) => c.id), ['a', 'b2', 'b'], 'two on one day both appear, the later first; today and drafts never');
  const leapDay = [conv('leap', '2024-02-29'), conv('feb28', '2025-02-28')];
  assert.deepEqual(S.onThisDay(leapDay, '2026-02-28').map((c) => c.id), ['feb28', 'leap'], 'a Feb 29 memory surfaces on Feb 28 in a year without one');
  assert.deepEqual(S.onThisDay(leapDay, '2028-02-28').map((c) => c.id), ['feb28'], 'in a leap year it waits for the 29th');
  assert.deepEqual(S.onThisDay(leapDay, '2028-02-29').map((c) => c.id), ['leap']);
  assert.deepEqual(S.onThisDay([], '2026-11-19'), []);
});

test('periods: boundaries, navigation and when a review may be written', () => {
  assert.equal(S.periodEnd('month', '2028-02-01'), '2028-02-29'); assert.equal(S.periodEnd('month', '2026-02-01'), '2026-02-28');
  assert.equal(S.periodEnd('month', '2026-12-01'), '2026-12-31'); assert.equal(S.periodEnd('year', '2025-01-01'), '2025-12-31');
  assert.equal(S.shiftPeriod('month', '2026-01-01', -1), '2025-12-01'); assert.equal(S.shiftPeriod('month', '2025-12-01', 1), '2026-01-01');
  assert.equal(S.shiftPeriod('year', '2025-01-01', 1), '2026-01-01'); assert.equal(S.shiftPeriod('week', '2026-11-16', -1), '2026-11-09');
  assert.equal(S.periodStart('month', '2026-11-19'), '2026-11-01'); assert.equal(S.periodStart('year', '2026-11-19'), '2026-01-01');
  assert.ok(S.validPeriodStart('month', '2026-11-01') && !S.validPeriodStart('month', '2026-11-02') && !S.validPeriodStart('year', '2026-02-01') && !S.validPeriodStart('month', 'nope'));
  assert.equal(S.reviewLock('month', '2026-11-01', '2026-11-30'), 'until-end', 'the last day of the month is still the month');
  assert.equal(S.reviewLock('month', '2026-11-01', '2026-12-01'), 'open');
  assert.equal(S.reviewLock('year', '2026-01-01', '2026-12-31'), 'until-end'); assert.equal(S.reviewLock('year', '2025-01-01', '2026-11-19'), 'open', 'a finished (imported) year');
  assert.equal(S.reviewLock('month', '2026-12-01', '2026-11-19'), 'future');
  assert.equal(S.reviewLock('week', '2026-11-16', '2026-11-22'), 'open', 'weeks keep the Sunday unlock'); assert.equal(S.reviewLock('week', '2026-11-16', '2026-11-21'), 'until-sunday');
  const r = S.rangeStats('2026-11-01', '2026-11-30', [conv('a', '2026-11-02'), conv('b', '2026-11-02'), conv('c', '2026-11-29'), conv('out', '2026-12-01')], [], []);
  assert.deepEqual([r.entries, r.days, r.words, r.byDay.length], [3, 2, 30, 0]);
});

const pe = (date, o = {}) => ({ date, journal: 'My Journal', title: '', tags: [], summary: '', summarySource: null, excerpt: '', ownChars: 0, ...o });
test('review input: every entry in order, bounded however long the period, secondary text labelled', () => {
  const year = Array.from({ length: 365 }, (_, i) => pe(S.addDays('2025-01-01', i), { title: `Day ${i}`, summary: 's'.repeat(1300), summarySource: 'import', excerpt: `OWN${i} ${'w '.repeat(400)}`, ownChars: 9000 }));
  const notes = Array.from({ length: 12 }, (_, i) => ({ label: `Month of 2025-${String(i + 1).padStart(2, '0')}-01`, title: 'T', text: 'r'.repeat(20000) }));
  const { text, shortened } = C.periodInput(year, notes, 150000);
  assert.ok(text.length <= 150000, `bounded (${text.length})`); assert.equal(shortened, true);
  for (const i of [0, 180, 364]) assert.match(text, new RegExp(`Day ${i}”`), 'every entry is represented');
  assert.ok(text.indexOf('Day 0”') < text.indexOf('Day 364”'), 'chronological');
  assert.match(text, /Earlier summary \(imported, secondary\)/); assert.match(text, /In their words \(excerpt\): OWN0/);
  assert.match(text, /Reflections already written for parts of this period \(secondary\)/);
  const notesPart = text.slice(text.indexOf('Reflections already written'));
  assert.ok(notesPart.length <= 150000 * 0.25 + 200, 'saved reflections take at most a quarter');
  const small = C.periodInput([pe('2026-10-03', { title: 'Only one', excerpt: 'Short day.', ownChars: 10 })], [], 120000);
  assert.equal(small.shortened, false); assert.match(small.text, /In their words: Short day\./);
});

test('month and year prompts and sections', () => {
  for (const k of ['month', 'year']) {
    const r = I.periodRules(k);
    assert.match(r, /one emoji that genuinely fits/); assert.match(r, /Never any person's name/); assert.match(r, /Scale to the material/);
    assert.match(r, /never as facts about the person, never as their words/); assert.match(r, /don't force a growth narrative/);
  }
  assert.match(I.periodRules('year'), /chapters and turning points/); assert.match(I.periodRules('year'), /what stayed constant/);
  assert.deepEqual([...I.periodSchema.required], ['title', 'review', 'chapters', 'themes', 'people', 'shifts', 'insights', 'wins', 'closing']);
  const d = M.parseReportData({ title: '🌊 X', review: 'R', chapters: [{ heading: 'Spring', body: 'b' }], people: [{ heading: 'A friend', body: 'b' }], shifts: [{ heading: 'S', body: 'b' }], themes: [], insights: [], wins: [], closing: '' });
  assert.deepEqual([d.chapters.length, d.people.length, d.shifts.length], [1, 1, 1]);
  assert.deepEqual(M.parseReportData({ title: 'w', review: 'r' }).chapters, [], 'weekly reports have none');
});
