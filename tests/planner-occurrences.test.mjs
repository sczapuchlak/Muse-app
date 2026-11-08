import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load, root } from './helpers.mjs';

const O = load('lib/planner-occurrences');
const P = load('lib/planner');
const A = load('lib/agenda');
const RL = load('lib/running-list');
const E = load('lib/progress/engine');
const read = (f) => readFileSync(resolve(root, f), 'utf8');
const now = '2026-11-07T18:00:00.000Z', today = '2026-11-07';
const task = (o = {}) => ({ id: 't1', kind: 'task', title: 'Water plants', complete: false, workspaceId: 'w', tagIds: [], plannedDate: '2026-11-02', actualMinutes: 0, subtasks: [], createdAt: now, ...o });
const weekly = { freq: 'weekly', interval: 1, weekdays: [1, 4] }; // Mon & Thu
const state = (o = {}) => ({ ...P.emptyPlannerState?.() ?? {}, tasks: [task({ rule: weekly })], events: [], workspaces: [{ id: 'w', name: 'Home', accent: 'primary' }], groups: [], tags: [], activeTimer: null, occurrences: [], eventExceptions: [], ...o });

test('ids: occurrence ids are stable "series::date" and parse back', () => {
  assert.equal(O.occurrenceId('t1', '2026-11-05'), 't1::2026-11-05');
  assert.deepEqual(O.parseOccurrenceId('t1::2026-11-05'), { seriesId: 't1', date: '2026-11-05' });
  assert.equal(O.parseOccurrenceId('t1'), null);
  assert.equal(O.parseOccurrenceId('t1::nope'), null);
});

test('tasks project into dated occurrences; skipped, moved and completed dates are respected; one-offs pass through', () => {
  const s = state({ tasks: [task({ rule: weekly }), task({ id: 'plain', plannedDate: '2026-11-03' })],
    occurrences: [{ taskId: 't1', date: '2026-11-05', status: 'completed', completedAt: now, completedOn: '2026-11-05' }, { taskId: 't1', date: '2026-11-09', status: 'skipped' }, { taskId: 't1', date: '2026-11-12', status: 'moved', movedTo: '2026-11-13' }] });
  const shown = O.projectTasks(s.tasks, s.occurrences, '2026-11-02', '2026-11-15');
  assert.deepEqual(shown.filter((t) => t.seriesId).map((t) => [t.id, t.plannedDate, t.complete]), [['t1::2026-11-02', '2026-11-02', false], ['t1::2026-11-05', '2026-11-05', true], ['t1::2026-11-12', '2026-11-13', false]]);
  assert.ok(shown.some((t) => t.id === 'plain'), 'ordinary tasks unchanged');
  assert.equal(shown.filter((t) => t.id.startsWith('t1')).length, 3, 'the series record itself is never shown alongside its occurrences');
});

test('older task recurrence columns still project (never rewritten)', () => {
  const legacy = task({ recurrence: { frequency: 'daily', interval: 2 } });
  assert.deepEqual(O.projectTasks([legacy], [], '2026-11-02', '2026-11-07').map((t) => t.plannedDate), ['2026-11-02', '2026-11-04', '2026-11-06']);
});

test('ordinary actions on an occurrence become recurrence changes', () => {
  const s = state();
  const toggled = O.translateAction({ type: 'task/toggle', id: 't1::2026-11-05', now }, s);
  assert.deepEqual(toggled.change, { op: 'occurrence/complete', taskId: 't1', date: '2026-11-05', complete: true });
  assert.equal(O.translateAction({ type: 'task/toggle', id: 't1::2026-11-05', now }, { occurrences: [{ taskId: 't1', date: '2026-11-05', status: 'completed' }] }).change.complete, false, 'reopen');
  assert.deepEqual(O.translateAction({ type: 'task/place', id: 't1::2026-11-05', date: '2026-11-06' }, s).change, { op: 'occurrence/move', taskId: 't1', date: '2026-11-05', to: '2026-11-06' });
  assert.deepEqual(O.translateAction({ type: 'task/move', id: 't1::2026-11-05', date: undefined }, s).change, { op: 'occurrence/skip', taskId: 't1', date: '2026-11-05', skip: true });
  assert.equal(O.translateAction({ type: 'task/delete', id: 't1::2026-11-05', now }, s).change.op, 'occurrence/skip');
  const edit = O.translateAction({ type: 'task/update', id: 't1::2026-11-05', patch: { title: 'New', plannedDate: '2026-12-01', complete: true } }, s);
  assert.deepEqual([edit.id, edit.patch], ['t1', { title: 'New' }], 'edits go to the series; date and completion stay per occurrence');
  const plain = { type: 'task/toggle', id: 'plain', now };
  assert.equal(O.translateAction(plain, s), plain);
});

test('the reducer completes one occurrence without completing the series (and the same via toggle)', () => {
  let s = P.plannerReducer(state(), { type: 'task/toggle', id: 't1::2026-11-05', now });
  assert.equal(s.tasks[0].complete, false, 'series stays open');
  assert.deepEqual(s.occurrences.map((o) => [o.date, o.status]), [['2026-11-05', 'completed']]);
  s = P.plannerReducer(s, { type: 'task/toggle', id: 't1::2026-11-05', now });
  assert.equal(s.occurrences.length, 0, 'reopened');
  s = P.plannerReducer(s, { type: 'recurrence', now, change: { op: 'occurrence/skip', taskId: 't1', date: '2026-11-09', skip: true } });
  assert.equal(O.projectTasks(s.tasks, s.occurrences, '2026-11-09', '2026-11-09').length, 0, 'skipped date disappears everywhere');
});

test('"this and future" splits the series and hands over later history', () => {
  let s = state({ occurrences: [{ taskId: 't1', date: '2026-11-12', status: 'completed', completedAt: now, completedOn: today }] });
  const change = O.splitChange('task', 't1', '2026-11-02', weekly, '2026-11-09', { freq: 'weekly', interval: 1, weekdays: [2] }, 'n1');
  assert.equal(change.before.until, '2026-11-05');
  s = P.plannerReducer(s, { type: 'recurrence', now, change });
  const shown = O.projectTasks(s.tasks, s.occurrences, '2026-11-02', '2026-11-18').map((t) => t.id);
  assert.deepEqual(shown, ['t1::2026-11-02', 't1::2026-11-05', 'n1::2026-11-10', 'n1::2026-11-17']);
  assert.equal(s.occurrences[0].taskId, 'n1');
});

test('events project with exceptions: canceled, moved, edited and deleted dates', () => {
  const ev = { id: 'e1', kind: 'event', title: 'Book club', date: '2026-11-03', dateTime: '2026-11-03T19:00', time: '7:00 PM', rule: { freq: 'weekly', interval: 1 } };
  const ex = [{ eventId: 'e1', date: '2026-11-10', canceled: true }, { eventId: 'e1', date: '2026-11-17', movedTo: '2026-11-18', overrides: { location: 'Cafe' } }, { eventId: 'e1', date: '2026-11-24', overrides: { deleted: true } }];
  const shown = O.projectEvents([ev], ex, '2026-11-01', '2026-11-30');
  assert.deepEqual(shown.map((e) => [e.date, e.status ?? 'confirmed', e.location ?? '']), [['2026-11-03', 'confirmed', ''], ['2026-11-10', 'canceled', ''], ['2026-11-18', 'confirmed', 'Cafe']]);
  assert.equal(shown[2].dateTime, '2026-11-18T19:00', 'the local wall time travels with the moved date');
  const multi = { ...ev, id: 'e2', endDate: '2026-11-04' };
  assert.deepEqual(O.projectEvents([multi], [], '2026-11-11', '2026-11-11').map((e) => [e.date, e.endDate]), [['2026-11-10', '2026-11-11']], 'multi-day occurrences overlapping the window');
});

test('a series is never overdue or unscheduled in the Task List; its occurrences are', () => {
  assert.equal(A.taskState(task({ rule: weekly, plannedDate: '2026-10-01' }), today), 'scheduled');
  assert.equal(A.taskState({ ...task({ plannedDate: '2026-11-05', rule: weekly }), seriesId: 't1' }, today), 'overdue');
});

test('Running List: ○ on due days, × on the day each occurrence was done, each acting on its own occurrence', () => {
  const s = state({ occurrences: [{ taskId: 't1', date: '2026-11-02', status: 'completed', completedAt: now, completedOn: '2026-11-03' }] });
  const week = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
  const cells = RL.weekStrip(s.tasks[0], week, undefined, today, s.occurrences);
  assert.deepEqual(cells.map((c) => [c.planned, c.completed, c.action]), [[true, false, 'reopen'], [false, true, 'reopen'], [false, false, null], [true, false, 'complete'], [false, false, null], [false, false, null], [false, false, null]]);
  assert.equal(cells[3].occurrence, 't1::2026-11-05');
});

test('Insights and Connected Rituals count each completed occurrence once', () => {
  const planner = { tasks: [task({ rule: weekly })], completionHistory: [
    { id: 'a', taskId: 't1', complete: true, occurredAt: '2026-11-02T10:00:00Z', localDate: '2026-11-02', plannedDate: '2026-11-02', timeZone: 'UTC', title: 'x', workspaceId: 'w' },
    { id: 'b', taskId: 't1', complete: true, occurredAt: '2026-11-05T10:00:00Z', localDate: '2026-11-05', plannedDate: '2026-11-05', timeZone: 'UTC', title: 'x', workspaceId: 'w' },
    { id: 'c', taskId: 't1', complete: false, occurredAt: '2026-11-06T10:00:00Z', localDate: '2026-11-06', plannedDate: '2026-11-05', timeZone: 'UTC', title: 'x', workspaceId: 'w' }] };
  assert.deepEqual([...E.taskCompletionDates(planner, 'UTC').values()], ['2026-11-02'], 'two occurrences done, one reopened');
});

test('resolveTask shows an occurrence with its own date and state', () => {
  const s = state({ occurrences: [{ taskId: 't1', date: '2026-11-05', status: 'moved', movedTo: '2026-11-06' }] });
  const r = O.resolveTask(s, 't1::2026-11-05');
  assert.deepEqual([r.task.plannedDate, r.occurrenceDate, r.series.id], ['2026-11-06', '2026-11-05', 't1']);
  assert.equal(O.resolveTask(s, 'missing::2026-11-05'), null);
});

test('migration: additive, owner-read only, writes only through the revision-checked command', () => {
  const sql = read('supabase/migrations/20261122000100_recurrence.sql');
  for (const t of ['task_occurrences', 'planner_event_exceptions']) {
    assert.match(sql, new RegExp(`'${t}'`));
  }
  assert.match(sql, /grant select on public.%I to authenticated/);
  assert.match(sql, /create policy owner_read on public.%I for select to authenticated using \(\(select auth.uid\(\)\) = user_id\)/);
  assert.match(sql, /Planner changed; review the latest version/);
  assert.match(sql, /Future occurrences can''t be completed yet/);
  assert.match(sql, /alter table public.task_completion_events add column occurrence_date date/);
  assert.doesNotMatch(sql, /drop table|drop column|delete from public.tasks/);
  assert.match(sql, /revoke all on function public.planner_recurrence_command\(bigint, uuid, jsonb\) from public, anon/);
});
