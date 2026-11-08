import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';
const R = load('lib/recurrence');
const take = (rule, start, n) => R.upcoming(rule, start, start, n);

test('daily and every-N-days, with until and count', () => {
  assert.deepEqual(take({ freq: 'daily', interval: 1 }, '2026-12-30', 4), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  assert.deepEqual(take({ freq: 'daily', interval: 3 }, '2026-11-01', 3), ['2026-11-01', '2026-11-04', '2026-11-07']);
  assert.deepEqual(take({ freq: 'daily', interval: 1, until: '2026-11-03' }, '2026-11-01', 10), ['2026-11-01', '2026-11-02', '2026-11-03']);
  assert.deepEqual(take({ freq: 'daily', interval: 1, count: 2 }, '2026-11-01', 10), ['2026-11-01', '2026-11-02']);
});

test('weekly: chosen weekdays, every weekday, every two weeks', () => {
  assert.deepEqual(take({ freq: 'weekly', interval: 1, weekdays: [1, 4] }, '2026-11-04', 4), ['2026-11-05', '2026-11-09', '2026-11-12', '2026-11-16'], 'Mon & Thu, starting on a Wednesday');
  assert.deepEqual(take({ freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }, '2026-11-06', 3), ['2026-11-06', '2026-11-09', '2026-11-10'], 'every weekday skips the weekend');
  assert.deepEqual(take({ freq: 'weekly', interval: 2, weekdays: [2] }, '2026-11-03', 3), ['2026-11-03', '2026-11-17', '2026-12-01']);
  assert.deepEqual(take({ freq: 'weekly', interval: 1 }, '2026-11-06', 2), ['2026-11-06', '2026-11-13'], 'defaults to the start weekday');
});

test('monthly: day numbers clamp at month end (Jan 31 → Feb 28 → Mar 31), leap years respected', () => {
  assert.deepEqual(take({ freq: 'monthly', interval: 1, placement: { kind: 'day', day: 31 } }, '2027-01-31', 4), ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  assert.deepEqual(take({ freq: 'monthly', interval: 1, placement: { kind: 'day', day: 30 } }, '2028-01-30', 2), ['2028-01-30', '2028-02-29'], 'leap February');
  assert.deepEqual(take({ freq: 'monthly', interval: 3, placement: { kind: 'day', day: 15 } }, '2026-11-15', 3), ['2026-11-15', '2027-02-15', '2027-05-15']);
  assert.deepEqual(take({ freq: 'monthly', interval: 1 }, '2026-11-15', 2), ['2026-11-15', '2026-12-15'], 'defaults to the start day');
});

test('monthly: nth and last weekday', () => {
  assert.deepEqual(take({ freq: 'monthly', interval: 1, placement: { kind: 'nth', nth: 1, weekday: 5 } }, '2026-11-01', 3), ['2026-11-06', '2026-12-04', '2027-01-01'], 'first Friday');
  assert.deepEqual(take({ freq: 'monthly', interval: 1, placement: { kind: 'nth', nth: 2, weekday: 2 } }, '2026-11-01', 2), ['2026-11-10', '2026-12-08'], 'second Tuesday');
  assert.deepEqual(take({ freq: 'monthly', interval: 1, placement: { kind: 'nth', nth: -1, weekday: 1 } }, '2026-11-01', 3), ['2026-11-30', '2026-12-28', '2027-01-25'], 'last Monday');
});

test('yearly, including Feb 29 in non-leap years', () => {
  assert.deepEqual(take({ freq: 'yearly', interval: 1 }, '2026-11-06', 3), ['2026-11-06', '2027-11-06', '2028-11-06']);
  assert.deepEqual(take({ freq: 'yearly', interval: 1, month: 2, placement: { kind: 'day', day: 29 } }, '2028-02-29', 3), ['2028-02-29', '2029-02-28', '2030-02-28']);
  assert.deepEqual(take({ freq: 'yearly', interval: 1, month: 11, placement: { kind: 'nth', nth: 4, weekday: 4 } }, '2026-01-01', 2), ['2026-11-26', '2027-11-25'], 'fourth Thursday of November');
});

test('civil dates are immune to daylight-saving changes', () => {
  // US DST ends Nov 1 2026 and starts Mar 14 2027: every day still appears exactly once.
  assert.deepEqual(R.occurrencesBetween({ freq: 'daily', interval: 1 }, '2026-10-31', '2026-10-31', '2026-11-02'), ['2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(R.occurrencesBetween({ freq: 'weekly', interval: 1, weekdays: [0] }, '2027-03-07', '2027-03-07', '2027-03-21'), ['2027-03-07', '2027-03-14', '2027-03-21']);
});

test('windows, skipped dates, next occurrence, membership, last date and "this and future"', () => {
  const rule = { freq: 'weekly', interval: 1, weekdays: [1, 3] };
  assert.deepEqual(R.occurrencesBetween(rule, '2026-11-02', '2026-11-09', '2026-11-16', ['2026-11-11']), ['2026-11-09', '2026-11-16'], 'a skipped date is left out');
  assert.equal(R.nextOccurrence(rule, '2026-11-02', '2026-11-05'), '2026-11-09');
  assert.equal(R.occursOn(rule, '2026-11-02', '2026-11-04'), true);
  assert.equal(R.occursOn(rule, '2026-11-02', '2026-11-05'), false);
  assert.equal(R.occursOn(rule, '2026-11-02', '2026-10-26'), false, 'nothing before the start');
  assert.equal(R.lastOccurrence(rule, '2026-11-02'), null, 'indefinite');
  assert.equal(R.lastOccurrence({ ...rule, count: 3 }, '2026-11-02'), '2026-11-09');
  const ended = R.endBefore({ ...rule, count: 10 }, '2026-11-02', '2026-11-09');
  assert.deepEqual([ended.until, ended.count], ['2026-11-04', undefined]);
  assert.equal(R.nextOccurrence({ freq: 'daily', interval: 1, until: '2026-11-03' }, '2026-11-01', '2026-11-04'), null, 'ended');
});

test('validation rejects malformed rules', () => {
  for (const bad of [null, { freq: 'hourly', interval: 1 }, { freq: 'daily', interval: 0 }, { freq: 'weekly', interval: 1, weekdays: [] }, { freq: 'weekly', interval: 1, weekdays: [1, 1] }, { freq: 'monthly', interval: 1, placement: { kind: 'day', day: 32 } }, { freq: 'monthly', interval: 1, placement: { kind: 'nth', nth: 5, weekday: 1 } }, { freq: 'yearly', interval: 1, month: 13 }, { freq: 'daily', interval: 1, until: '2026-13-01' }, { freq: 'daily', interval: 1, count: 0 }])
    assert.equal(R.validRule(bad), false, JSON.stringify(bad));
  assert.deepEqual(take({ freq: 'nope', interval: 1 }, '2026-11-01', 3), []);
});

test('plain-language labels match the examples in the issue', () => {
  const s = '2026-11-06'; // a Friday
  assert.equal(R.ruleLabel({ freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }, s), 'Every weekday');
  assert.equal(R.ruleLabel({ freq: 'weekly', interval: 1, weekdays: [4, 1] }, s), 'Every Monday and Thursday');
  assert.equal(R.ruleLabel({ freq: 'weekly', interval: 2 }, s), 'Every 2 weeks on Friday');
  assert.equal(R.ruleLabel({ freq: 'monthly', interval: 1, placement: { kind: 'nth', nth: 1, weekday: 5 } }, s), 'First Friday of every month');
  assert.equal(R.ruleLabel({ freq: 'monthly', interval: 1, placement: { kind: 'day', day: 15 } }, s), 'Every month on the 15th');
  assert.equal(R.ruleLabel({ freq: 'yearly', interval: 1 }, s), 'Every year on November 6');
  assert.equal(R.ruleLabel({ freq: 'daily', interval: 1, until: '2026-12-31' }, s), 'Every day · until Dec 31, 2026');
  assert.equal(R.ruleLabel({ freq: 'monthly', interval: 3, placement: { kind: 'day', day: 1 } }, s), 'Every 3 months on the 1st');
  assert.equal(R.ruleLabel({ freq: 'monthly', interval: 1, placement: { kind: 'nth', nth: -1, weekday: 1 } }, s), 'Last Monday of every month');
  assert.equal(R.ruleLabel({ freq: 'daily', interval: 1, count: 1 }, s), 'Every day · 1 time');
  assert.equal(R.ruleLabel(null, s), "Doesn't repeat");
  const ids = R.presets(s).map((p) => p.id);
  assert.deepEqual(ids, ['daily', 'weekdays', 'weekly', 'biweekly', 'monthly-day', 'monthly-nth', 'yearly'], 'Nov 6 2026 is the first Friday, not the last');
  assert.ok(R.presets('2026-11-27').some((p) => p.id === 'monthly-last' && p.label === 'Last Friday of every month'));
});

test('existing task recurrence converts without rewriting anything', () => {
  assert.deepEqual(R.fromLegacy({ frequency: 'weekly', interval: 2, until: null }, '2026-11-06'), { freq: 'weekly', interval: 2, weekdays: [5] });
  assert.deepEqual(R.fromLegacy({ frequency: 'monthly', interval: 1, until: '2027-06-30' }, '2026-11-15'), { freq: 'monthly', interval: 1, until: '2027-06-30', placement: { kind: 'day', day: 15 } });
  assert.equal(R.fromLegacy(null, '2026-11-06'), null);
  assert.equal(R.fromLegacy({ frequency: 'daily', interval: 1 }, 'not-a-date'), null);
});
