import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load, root } from './helpers.mjs';

const R = load('lib/rituals');
const T = load('lib/ritual-tracker');
const read = (f) => readFileSync(resolve(root, f), 'utf8');
const today = '2026-11-06';
const cats = [{ id: 'c1', label: 'Strength', color: '#e0457b' }, { id: 'c2', label: 'Cardio', color: '#2f8fe0' }, { id: 'c3', label: 'Rest', color: '#8a8f98' }];
const base = () => ({ groups: [{ id: 'g', name: 'Body', accent: 'primary', icon: 'rituals', collapsed: false }], rituals: [], entries: [], celebratedMilestones: [], categoriesEnabled: true });
const ritual = (o = {}) => ({ id: 'r', name: 'Meditate', groupId: 'g', type: 'checkbox', goal: 1, unit: 'check-in', recurrence: { kind: 'daily' }, startDate: '2026-01-01', createdAt: '2026-01-01T00:00:00Z', ...o });
const save = (s, r) => R.ritualReducer(s, { type: 'ritual/save', ritual: r });
const log = (s, id, date, value) => R.ritualReducer(s, { type: 'entry/set', ritualId: id, date, value, today, now: `${today}T12:00:00Z` });
const pick = (s, id, date, category) => R.ritualReducer(s, { type: 'entry/category', ritualId: id, date, category, today, now: `${today}T12:00:00Z` });

test('period dates and calendar helpers', () => {
  assert.equal(T.monthDates('2026-02-10').length, 28);
  assert.equal(T.monthDates('2028-02-01').length, 29);
  assert.equal(T.periodDates('year', '2026-06-01').length, 365);
  assert.deepEqual(T.calendarWeeks('2026-11-01')[0], [null, null, null, null, null, null, '2026-11-01'], 'Monday-first, Nov 1 2026 is a Sunday');
  assert.equal(T.shiftMonth('2026-12-15', 1), '2027-01-01');
  assert.equal(T.shiftMonth('2026-01-15', -1), '2025-12-01');
  assert.equal(T.shiftPeriod('week', '2026-11-06', -1), '2026-10-30');
  assert.equal(T.periodTitle('month', '2026-11-06'), 'November 2026');
  assert.deepEqual(T.trackerLayouts.map((l) => l.id), ['grid', 'focus'], 'Heatmap is hidden (not useful)');
});

test('squares use the one ritualCell rule: complete, partial levels, missed, unknown and unscheduled stay distinct', () => {
  let s = save(base(), ritual({ id: 'read', type: 'numeric', goal: 20, unit: 'pages' }));
  s = save(s, ritual({ id: 'mwf', recurrence: { kind: 'weekdays', weekdays: [1, 3, 5] } }));
  s = log(s, 'read', '2026-11-02', 20); s = log(s, 'read', '2026-11-03', 7); s = log(s, 'read', '2026-11-04', 0);
  const r = s.rituals.find((x) => x.id === 'read'), sq = (d) => T.square(s, r, d, today);
  assert.equal(sq('2026-11-02').level, 4);
  assert.equal(sq('2026-11-03').level, 2);
  assert.equal(sq('2026-11-03').status, 'partial');
  assert.equal(sq('2026-11-04').status, 'missed');
  assert.equal(sq('2026-11-04').level, 0);
  assert.equal(sq('2026-11-05').status, 'unknown');
  assert.equal(sq('2026-11-09').status, 'upcoming');
  assert.equal(T.square(s, s.rituals.find((x) => x.id === 'mwf'), '2026-11-03', today).status, 'unscheduled');
  const sh = T.share(s, r, T.monthDates('2026-11-01'), today);
  assert.deepEqual([sh.met, sh.decided], [1, 3], 'unknown and future days are not counted as failures');
  assert.equal(T.ratioLevel(null), 0); assert.equal(T.ratioLevel(1), 4); assert.equal(T.ratioLevel(.5), 2);
});

test('views read the same records: a log made anywhere shows in every period', () => {
  let s = save(base(), ritual());
  s = log(s, 'r', '2026-03-14', 1);
  const r = s.rituals[0], slice = T.habitState(s, r);
  assert.equal(T.square(slice, r, '2026-03-14', today).level, 4);
  assert.equal(T.share(slice, r, T.periodDates('year', '2026-01-01'), today).met, 1);
  assert.equal(T.share(slice, r, T.monthDates('2026-03-01'), today).met, 1);
  assert.equal(s.entries.length, 1, 'no copies per view');
});

test('categorical habits: legend, picking, missed, clearing and protected history', () => {
  let s = save(base(), ritual({ id: 'w', name: 'Workout', type: 'category', categories: cats }));
  const w = s.rituals[0];
  assert.equal(w.goal, 1); assert.equal(w.connection, null); assert.equal(w.categories.length, 3);
  assert.equal(save(base(), ritual({ id: 'x', type: 'category', categories: [] })).rituals.length, 0, 'a legend needs at least one category');
  assert.equal(save(base(), ritual({ id: 'x', type: 'category', categories: [{ id: 'a', label: 'A', color: 'red' }] })).rituals.length, 0, 'colors are hex');
  s = pick(s, 'w', '2026-11-02', 'c2');
  assert.deepEqual(s.entries.map((e) => [e.date, e.value, e.category]), [['2026-11-02', 1, 'c2']]);
  assert.equal(pick(s, 'w', '2026-11-03', 'nope'), s, 'only categories from the legend');
  assert.equal(pick(s, 'w', '2026-11-09', 'c1'), s, 'no future logging');
  s = log(s, 'w', '2026-11-03', 0);
  assert.equal(s.entries.find((e) => e.date === '2026-11-03').outcome, 'missed');
  assert.equal(T.square(s, s.rituals[0], '2026-11-02', today).category, 'c2');
  assert.equal(T.squareLabel(s.rituals[0], T.square(s, s.rituals[0], '2026-11-02', today), 'Cardio'), 'Cardio');
  // Legend edits after history: rename/recolor/add allowed; removing a used category is refused.
  const renamed = save(s, { ...s.rituals[0], categories: cats.map((c) => c.id === 'c2' ? { ...c, label: 'Run', color: '#000000' } : c) });
  assert.equal(renamed.rituals[0].categories.find((c) => c.id === 'c2').label, 'Run');
  assert.equal(save(s, { ...s.rituals[0], categories: cats.filter((c) => c.id !== 'c2') }), s, 'a used category stays');
  assert.equal(save(s, { ...s.rituals[0], categories: cats.filter((c) => c.id !== 'c3') }).rituals[0].categories.length, 2, 'an unused one can go');
  s = pick(s, 'w', '2026-11-02', null);
  assert.equal(s.entries.some((e) => e.date === '2026-11-02'), false, 'clear removes the observation');
  // Coverage, not pass/fail: unknown past days count as not logged.
  const cov = T.share(pick(s, 'w', '2026-11-04', 'c1'), s.rituals[0], ['2026-11-04', '2026-11-05'], today);
  assert.deepEqual([cov.met, cov.decided], [1, 2]);
});

test('categorical habits cannot be connected', () => {
  const rules = load('lib/ritual-connection-rules');
  assert.deepEqual(rules.compatibleMetrics('category'), []);
});

test('migration adds categories through the wrapper and keeps rituals owner-read only', () => {
  const sql = read('supabase/migrations/20261121000100_ritual_categories.sql');
  assert.match(sql, /tracking_type in \('checkbox','numeric','duration','weekly-target','category'\)/);
  assert.match(sql, /alter table public.rituals add column categories jsonb check \(muse_private.valid_ritual_categories\(categories\)\)/);
  assert.match(sql, /A category used in history cannot be removed/);
  assert.match(sql, /Invalid categorical outcome/);
  assert.match(sql, /v:=muse_private.save_rituals\(p_expected_revision,p_command_id,p_state\)/, 'the core save function is reused, not rewritten');
  assert.match(sql, /'category',category/);
  assert.match(sql, /revoke all on function muse_private.valid_ritual_categories\(jsonb\) from public,anon,authenticated/);
  assert.doesNotMatch(sql, /to anon/);
});

test('Habits keeps Week + Grid as the original screen and adds period/layout/ritual controls', () => {
  const ui = read('components/rituals/Rituals.tsx');
  assert.match(ui, /layout: TrackerLayout = period === "year" \? "focus" : tracker.layout, classic = period === "week" && layout === "grid"/, 'Year is always the year sheet; Week + Grid is the original screen');
  assert.match(ui, /trackerLayouts.filter\(\(l\) => period !== "year" \|\| l.id === "focus"\)/);
  assert.match(ui, /<MuseChoiceMenu label="Period"/);
  assert.match(ui, /<MuseChoiceMenu label="Layout"/);
  assert.match(ui, /<MuseChoiceMenu label="Ritual"/);
  const tracker = read('components/rituals/RitualTracker.tsx');
  assert.match(tracker, /<RitualWeekCell ritual=\{habit\}/, 'Focus reuses the real week cell');
  assert.match(tracker, /function YearSheet/, 'Year is the paper sheet: months across, days down');
  assert.match(tracker, /muse-sheet-review/, 'with a Month \/ Review column');
  assert.match(tracker, /muse-today-ring/, 'today wears the shared rainbow ring');
  assert.match(ui, /v.layout === "grid" \? "grid" : v.layout \? "focus" : "grid"/, 'an old Heatmap choice opens Focus');
});
