import {dailyFixture,dailyTestTree} from './daily-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load, root } from './helpers.mjs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { weekDates, shiftDate, todayInTimeZone } = load('lib/dates');
const { planPreview } = load('lib/plan-preview');
const { themes } = load('lib/themes');
const { mockProfile, personalizedGreeting } = load('lib/mock-profile');
const css = readFileSync(resolve(root, 'app/themes.css'), 'utf8');
const palettes = Object.fromEntries(themes.map((theme) => {
  const match = css.match(new RegExp(`:root\\[data-theme="${theme.id}"\\]\\s*\\{([^}]+)\\}`));
  assert.ok(match, theme.id);
  const declarations = [...match[1].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([\w-]+):\s*([^;]+);/g)];
  assert.ok(declarations.every(([, name]) => name.startsWith('--')), 'Theme blocks must contain visual variables only');
  return [theme.id, Object.fromEntries(declarations.map(([, name, value]) => [name, value.trim()]))];
}));

function color(value) {
  if (value.startsWith('#')) {
    const hex = value.slice(1).length === 3 ? [...value.slice(1)].map((part) => part + part).join('') : value.slice(1);
    return [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16)).concat(1);
  }
  const values = value.match(/[\d.]+/g).map(Number);
  return values.length === 3 ? [...values, 1] : values;
}
function blend(front, back) { return front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3])).concat(1); }
function luminance(rgb) {
  const linear = rgb.slice(0, 3).map((part) => part / 255).map((part) => part <= .04045 ? part / 12.92 : ((part + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); }

test('Monday-first week derives from selectedDate across month/year/leap boundaries', () => {
  assert.deepEqual(weekDates('2026-10-29'), ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
  assert.deepEqual(weekDates('2026-11-01'), weekDates('2026-10-29'));
  assert.equal(weekDates('2027-01-01')[0], '2026-12-28');
  assert.equal(weekDates('2028-02-29')[1], '2028-02-29');
  assert.equal(shiftDate('2026-11-01', 1), '2026-11-02');
  assert.equal(todayInTimeZone('America/Los_Angeles', new Date('2026-10-30T01:00:00Z')), '2026-10-29');
});

test('week strip has seven date actions and the official MuseStar selection', () => {
  const { WeekNavigator } = load('components/WeekNavigator');
  const html = renderToStaticMarkup(React.createElement(WeekNavigator, { selectedDate: '2026-10-29', timeZone: mockProfile.timeZone, onChange() {} }));
  assert.equal((html.match(/class="muse-week-day"/g) ?? []).length, 7);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.ok(html.includes('muse-week-selection'));
  assert.ok(html.includes('viewBox="0 0 24 40"'));
});

test('greeting uses the supplied profile and gracefully handles an absent name', () => {
  assert.equal(personalizedGreeting('Make room for a little magic.', mockProfile.firstName), 'Make room for a little magic, Stephanie.');
  assert.equal(personalizedGreeting('Hello.', '  Alex  '), 'Hello, Alex.');
  assert.equal(personalizedGreeting('Hello.', ''), 'Hello.');
  assert.ok(!readFileSync(resolve(root, 'components/MuseHeader.tsx'), 'utf8').includes('Stephanie'));
});

function largePlan() {
  const events = Array.from({ length: 20 }, (_, index) => ({ id: `event-${index}`, kind: 'event', date: '2026-10-29', dateTime: `2026-10-29T${String(index).padStart(2,'0')}:00`, time: `${index}:00`, title: `Event ${index}` }));
  const tasks = Array.from({ length: 40 }, (_, index) => ({ id: `task-${index}`, kind: 'task', plannedDate: '2026-10-29', complete: index % 2 === 0, title: `Task ${index}` }));
  return [...events, ...tasks, { id: 'other-day', kind: 'task', plannedDate: '2026-10-30', complete: false, title: 'Tomorrow' }];
}

test('plan preview is bounded and counts all selected-day items including completed tasks', () => {
  const items = largePlan();
  const before = items.map((item) => item.id);
  const result = planPreview(items, '2026-10-29');
  assert.equal(result.total, 60);
  assert.equal(result.visibleEvents.length, 3);
  assert.equal(result.visibleTasks.length, 5);
  assert.equal(result.hiddenEvents, 17);
  assert.equal(result.hiddenTasks, 35);
  assert.deepEqual(items.map((item) => item.id), before);
  assert.equal(planPreview(items, '2026-10-30').total, 1);
  assert.equal(planPreview(items, '2026-10-29', { events: 1, tasks: 2 }).hiddenTasks, 38);
});

test('long plan markup renders only preview rows with correct View all actions and total', () => {
  const { ScheduleCard } = load('components/ScheduleCard');
  const html = renderToStaticMarkup(React.createElement(load('components/PlannerStore').PlannerProvider, { initialState: { ...load('lib/planner-sample').plannerSample, tasks: largePlan().filter((item) => item.kind === 'task'), events: largePlan().filter((item) => item.kind === 'event') } }, React.createElement(ScheduleCard, { selectedDate: '2026-10-29' })));
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 5);
  assert.equal((html.match(/<time /g) ?? []).length, 3);
  assert.ok(!html.includes('60 items'));
  assert.ok(html.includes('data-module="planner"'));
  assert.ok(html.includes('Manage today’s plan'));
  assert.ok(html.includes('View all 40 tasks'));
  assert.ok(html.includes('View all 20 events'));
  assert.ok(html.includes('/planner?date=2026-10-29'));
  assert.ok(!html.includes('plan-overflow'));
});

test('every theme supplies the same complete visual token set and the correct light/dark mode', () => {
  const expected = Object.keys(palettes.iridescent).sort();
  assert.equal(themes.length, 9);
  assert.ok(expected.length >= 70);
  for (const theme of themes) {
    assert.deepEqual(Object.keys(palettes[theme.id]).sort(), expected, theme.id);
    assert.equal(palettes[theme.id]['--color-scheme'], theme.mode);
    for (const value of Object.values(palettes[theme.id])) for (const [, reference] of value.matchAll(/var\((--[\w-]+)/g)) assert.ok(reference in palettes[theme.id], reference);
    const alpha = color(palettes[theme.id]['--glass-background'])[3];
    assert.ok(alpha > 0 && alpha < 1, `${theme.id}: glass must remain translucent`);
  }
  assert.equal(palettes.iridescent['--background'], '#f8f5fd');
  assert.equal(palettes.iridescent['--glass-background'], 'rgba(255, 255, 255, .52)');
  assert.equal(palettes.iridescent['--atmosphere-aqua'], 'rgba(0, 194, 224, .72)');
  assert.equal(palettes.iridescent['--water-gradient-start'], '#00b9ce');
});

test('theme text and filled control labels have readable numeric contrast', () => {
  for (const theme of themes) {
    const token = palettes[theme.id];
    const background = color(token['--background']);
    const popover = blend(color(token['--floating-background']), background);
    for (const text of ['--foreground','--text-muted']) assert.ok(contrast(color(token[text]), popover) >= 4.5, `${theme.id}: ${text}`);
    for (const ink of ['--ink-purple','--ink-aqua','--ink-pink']) assert.ok(contrast(color(token['--on-accent']), color(token[ink])) >= 4.5, `${theme.id}: filled ${ink}`);
  }
});

test('theme preference restores, changes immediately, ignores invalid values, and tolerates blocked storage', () => {
  const storage = new Map([['muse.theme','astral']]);
  const events = new EventTarget();
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) };
  try {
    let preference = load('lib/theme-preference', true);
    assert.equal(preference.readThemePreference(), 'astral');
    let notifications = 0;
    const unsubscribe = preference.subscribeThemePreference(() => notifications++);
    for (const theme of themes) { preference.selectTheme(theme.id); assert.equal(preference.readThemePreference(), theme.id); assert.equal(storage.get('muse.theme'), theme.id); }
    assert.equal(notifications, themes.length); unsubscribe();
    preference = load('lib/theme-preference', true);
    assert.equal(preference.readThemePreference(), themes.at(-1).id);
    storage.set('muse.theme','not-a-theme');
    assert.equal(preference.readThemePreference(), 'iridescent');
    window.localStorage.setItem = () => { throw new Error('storage blocked'); };
    preference.selectTheme('nightbloom');
    assert.equal(preference.readThemePreference(), 'nightbloom');
  } finally { delete globalThis.window; }
});

test('picker footer is separate from results; shared CSS preserves alignment and responsive Mood', () => {
  const { EmotionPicker } = load('components/EmotionPicker');
  const { emotionCatalog } = load('lib/emotions');
  const html = renderToStaticMarkup(React.createElement(EmotionPicker, { emotions: emotionCatalog, selectedIds: [], onToggle() {}, onClose() {} }));
  assert.ok(html.includes('</div><footer class="emotion-picker-footer">'));
  assert.ok(html.includes('>Done</button></footer>'));
  const styles = readFileSync(resolve(root, 'app/globals.css'), 'utf8');
  assert.match(styles, /\.emotion-picker-footer\s*\{[^}]*flex:\s*0 0 auto/);
  assert.match(styles, /\.emotion-picker \.emotion-options\s*\{[^}]*overflow-y:\s*auto[^}]*var\(--space-4\)/);
  assert.match(styles, /\.movement-quick-chip \.choice-mark\s*\{[^}]*position:\s*absolute/);
  assert.ok(styles.includes('.mood-content > .tag-selector'));
  assert.ok(!styles.includes('nextjs-portal'));
});

test('global navigation covers every destination and keeps mobile primary/More choices centralized', () => {
  const { navigation, desktopGroups, mobilePrimaryIds, mobileMoreIds, navItems, isActiveDestination } = load('lib/navigation');
  assert.deepEqual(desktopGroups, ['Everyday','Reflect','Life']);
  assert.equal(new Set(navigation.map((item) => item.href)).size, 11);
  assert.deepEqual(navItems(mobilePrimaryIds).map((item) => item.id), ['daily','planner','rituals']);
  assert.deepEqual(navItems(mobileMoreIds).map((item) => item.id), ['mood','nourish','insights','money','notes','whimsy','settings']);
  assert.equal(new Set([...mobilePrimaryIds,...mobileMoreIds]).size, navigation.filter(item=>item.id!=='appearance').length);
  assert.equal(isActiveDestination('/','/'), true);
  assert.equal(isActiveDestination('/planner','/'), false);
  assert.equal(isActiveDestination('/planner/week','/planner'), true);
  assert.equal(isActiveDestination('/planner-other','/planner'), false);
});

test('Day Pulse keeps all signals optional, independent, dated, and bounded to integer 1–10', () => {
  const { emptyDayPulse, updatePulse, pulseLine, pulseCopy } = load('lib/pulse');
  const original = emptyDayPulse('2026-10-29');
  assert.equal(original.energy, null); assert.equal(original.stress, null); assert.equal(original.overallDay, null);
  const energy = updatePulse(original,'energy',7,'2026-10-29T15:00:00Z');
  const stress = updatePulse(energy,'stress',3,'2026-10-29T16:00:00Z');
  assert.deepEqual([stress.energy,stress.stress,stress.overallDay], [7,3,null]);
  assert.equal(stress.id, original.id); assert.equal(stress.date, original.date);
  assert.equal(stress.updatedAt,'2026-10-29T16:00:00Z');
  assert.equal(original.energy,null);
  const overall = updatePulse(stress,'overallDay',8,'2026-10-29T20:00:00Z');
  assert.deepEqual([overall.energy,overall.stress,overall.overallDay],[7,3,8]);
  assert.equal(updatePulse(overall,'stress',null,'later').stress,null);
  for (const value of [0,11,1.5,NaN,Infinity]) assert.throws(() => updatePulse(original,'energy',value,'now'), RangeError);
  assert.ok(pulseCopy.includes(pulseLine(original.date)));
  assert.notEqual(emptyDayPulse('2026-10-30').id,original.id);
});

test('Day Pulse renders three named optional radio scales and no HTML range sliders', () => {
  const { DayPulseCard } = load('components/DayPulseCard');
  const html = renderToStaticMarkup(React.createElement(DayPulseCard,{date:'2026-10-29'}));
  assert.equal((html.match(/type="radio"/g) ?? []).length,30);
  for (const signal of ['energy','stress','overallDay']) assert.equal((html.match(new RegExp(`name="pulse-${signal}-[^"]+"`,'g')) ?? []).length,10);
  assert.equal((html.match(/>Optional<\/output>/g) ?? []).length,3);
  assert.equal((html.match(/checked=""/g) ?? []).length,0);
  assert.equal((html.match(/type="range"/g) ?? []).length,0);
  assert.ok(html.includes('running low') && html.includes('electric') && html.includes('rough one') && html.includes('lovely'));
  const filled = renderToStaticMarkup(dailyTestTree(React.createElement(DayPulseCard,{date:'2026-10-29'}),dailyFixture({pulse:{energy:7,stress:3,overall_day:8}})));
  assert.equal((filled.match(/checked=""/g) ?? []).length,3);
  assert.equal((filled.match(/class="muse-spark"/g) ?? []).length,0,'Saved values must not celebrate on page load');
});

test('Muse Spark uses three official four-point stars with reduced-motion glow and clean timeout removal', () => {
  const { MuseSpark } = load('components/MuseSpark');
  const html = renderToStaticMarkup(React.createElement(MuseSpark));
  assert.equal((html.match(/viewBox="0 0 24 40"/g) ?? []).length,3);
  assert.ok(html.includes('aria-hidden="true"'));
  const styles = readFileSync(resolve(root,'components/MuseSpark.css'),'utf8');
  assert.ok(styles.includes('prefers-reduced-motion: reduce'));
  assert.ok(styles.includes('animation: none'));
  assert.ok(styles.includes('pointer-events: none'));
  const source = readFileSync(resolve(root,'components/MuseSpark.tsx'),'utf8');
  assert.ok(source.includes('setTimeout(() => setSequence(null), motion.success)'));
  assert.ok(source.includes('clearTimeout'));
});

test('shell reserves rail width, switches mobile navigation, and stacks grids using remaining content width', () => {
  const shell = readFileSync(resolve(root,'components/AppShell.css'),'utf8');
  assert.match(shell,/--muse-rail-width:\s*200px/);
  assert.match(shell,/data-rail="collapsed"[^}]*--muse-rail-width:\s*68px/);
  assert.match(shell,/margin-inline-start:\s*var\(--muse-rail-width\)/);
  assert.ok(shell.includes('@media (max-width: 1023px)'));
  assert.ok(shell.includes('@container muse-content (max-width: 760px)'));
  assert.ok(shell.includes('env(safe-area-inset-bottom)'));
  const header = readFileSync(resolve(root,'components/MuseHeader.css'),'utf8');
  assert.ok(header.includes('.muse-daily-header-right')); // The right column owns its own responsive tracks.
  assert.ok(readFileSync(resolve(root,'components/MusePageHeader.css'),'utf8').includes('align-items:start'));
  assert.ok(header.includes('@container muse-content (max-width:850px)'));
  const daily = readFileSync(resolve(root,'components/DailyEdit.tsx'),'utf8');
  assert.ok(daily.indexOf('id="daily-edit"') < daily.indexOf('className="daily-grid"'));
  assert.ok(!daily.includes('MuseSessionProvider'),'Records must live above route pages');
  const mood = readFileSync(resolve(root,'components/MoodCard.css'),'utf8');
  assert.ok(mood.includes('grid-column: span 7'));
  const pulse = readFileSync(resolve(root,'components/DayPulseCard.css'),'utf8');
  assert.ok(pulse.includes('grid-column: span 5'));
  assert.ok(pulse.includes('prefers-reduced-motion: reduce'));
});

test('water retains quantity additions and offers separate accessible current-total and goal editors', () => {
  const { WaterCard } = load('components/WaterCard');
  const html = renderToStaticMarkup(React.createElement(WaterCard,{initialDay:{date:'2026-10-29',total:72},settings:{goal:100,unit:'oz',quickAdds:[12,24,32,40]}}));
  for (const amount of [12,24,32,40]) assert.ok(html.includes(`+${amount} oz`));
  assert.ok(html.includes('Edit today’s water total'));
  assert.ok(html.includes('Edit daily water goal: 100 oz'));
  assert.ok(html.includes('aria-valuenow="72"') && html.includes('aria-valuemax="100"'));
  const { WaterAmountForm } = load('components/WaterAmountForm');
  const editor = renderToStaticMarkup(React.createElement(WaterAmountForm,{mode:'goal',unit:'oz',initialAmount:100,onApply(){return null;},onCancel(){}}));
  assert.ok(editor.includes('Daily goal in oz') && editor.includes('Save goal'));
});

const planner = load('lib/planner');
const { plannerSample } = load('lib/planner-sample');
function freshPlanner() { return structuredClone(plannerSample); }

test('Planner rescheduling preserves identity, due date, subtasks, and time estimates without duplicates', () => {
  const before = freshPlanner();
  const task = before.tasks.find((entry) => entry.id === 'launch-story');
  const moved = planner.plannerReducer(before, { type: 'task/move', id: task.id, date: '2026-11-05' });
  assert.deepEqual(moved.tasks.find((entry) => entry.id === task.id), { ...task, plannedDate: '2026-11-05' });
  assert.equal(moved.tasks.length, before.tasks.length);
  assert.equal(before.tasks.find((entry) => entry.id === task.id).plannedDate, '2026-10-30');
  const inbox = planner.plannerReducer(moved, { type: 'task/move', id: task.id, date: undefined });
  assert.ok(planner.plannedTasks(inbox).some((entry) => entry.id === task.id));
  assert.equal(inbox.tasks.find((entry) => entry.id === task.id).dueDate, '2026-11-02');
  assert.equal(planner.plannerReducer(before, { type: 'task/move', id: task.id, date: '2026-02-30' }), before);
  assert.equal(planner.validDate('2028-02-29'), true);
  assert.equal(planner.validDate('not-a-date'), false);
});

test('one shared task record renders completed in both Daily Edit and Planner and follows its planned day', () => {
  const { PlannerProvider } = load('components/PlannerStore');
  const { ScheduleCard } = load('components/ScheduleCard');
  const { PlannerTaskCard } = load('components/planner/PlannerTaskCard');
  let state = planner.plannerReducer(freshPlanner(), { type: 'task/toggle', id: 'flowers', now: '2026-10-29T18:00:00Z' });
  const render = (date) => renderToStaticMarkup(React.createElement(PlannerProvider, { initialState: state },
    React.createElement(ScheduleCard, { selectedDate: date }),
    React.createElement('ul', null, React.createElement(PlannerTaskCard, { task: state.tasks.find((task) => task.id === 'flowers'), onOpen() {} }))));
  let html = render('2026-10-29');
  assert.equal((html.match(/aria-label="Complete task: Pick up fresh flowers" checked=""/g) ?? []).length, 2);
  state = planner.plannerReducer(state, { type: 'task/move', id: 'flowers', date: '2026-10-30' });
  const preview = planPreview([...state.tasks, ...state.events], '2026-10-29');
  assert.ok(!preview.tasks.some((task) => task.id === 'flowers'));
  assert.ok(planPreview([...state.tasks, ...state.events], '2026-10-30').tasks.some((task) => task.id === 'flowers' && task.complete));
  html = render('2026-10-30');
  assert.equal((html.match(/aria-label="Complete task: Pick up fresh flowers" checked=""/g) ?? []).length, 2);
});

test('title-first creation uses stable IDs and one canonical task with separate dates and reusable tags', () => {
  const before = freshPlanner();
  const created = planner.createTask('  Prepare the review  ', 'work', 'new-stable-id', '2026-10-29T12:00:00Z', '2026-10-29');
  assert.equal(created.title, 'Prepare the review');
  assert.equal(created.dueDate, undefined); assert.equal(created.actualMinutes, 0); assert.equal(created.complete, false);
  let state = planner.plannerReducer(before, { type: 'task/add', task: created });
  state = planner.plannerReducer(state, { type: 'task/update', id: created.id, patch: { dueDate: '2026-11-01', groupId: 'launch', tagIds: ['deep-work','quick','quick'], estimatedMinutes: 45, notes: 'Bring sketches' } });
  const task = state.tasks.find((entry) => entry.id === created.id);
  assert.equal(task.createdAt, created.createdAt); assert.equal(task.plannedDate, '2026-10-29');
  assert.equal(task.dueDate, '2026-11-01'); assert.deepEqual(task.tagIds, ['deep-work','quick']);
  assert.equal(planner.plannerReducer(state, { type: 'task/add', task: created }).tasks.length, state.tasks.length);
  state = planner.plannerReducer(state, { type: 'task/update', id: created.id, patch: { workspaceId: 'personal' } });
  assert.equal(state.tasks.find((entry) => entry.id === created.id).groupId, undefined);
  assert.equal(before.tasks.length + 1, state.tasks.length);
});

test('workspace/group/tag semantics remain distinct and deletion preserves referential integrity', () => {
  let state = freshPlanner();
  const before = state;
  assert.equal(planner.plannerReducer(state, { type: 'workspace/delete', id: 'work' }), state, 'Occupied workspace deletion is blocked');
  state = planner.plannerReducer(state, { type: 'workspace/save', workspace: { id: 'studio', name: 'Studio', accent: 'pop' } });
  state = planner.plannerReducer(state, { type: 'workspace/save', workspace: { id: 'studio', name: 'Creative studio', accent: 'secondary' } });
  assert.equal(state.workspaces.find((entry) => entry.id === 'studio').name, 'Creative studio');
  state = planner.plannerReducer(state, { type: 'workspace/delete', id: 'studio' });
  assert.ok(!state.workspaces.some((entry) => entry.id === 'studio'));
  state = planner.plannerReducer(state, { type: 'tag/delete', id: 'errand' });
  assert.ok(state.tasks.every((task) => !task.tagIds.includes('errand')));
  state = planner.plannerReducer(state, { type: 'group/save', group: { id: 'home', name: 'Home admin', workspaceId: 'work' } });
  assert.ok(state.tasks.every((task) => task.workspaceId === 'work' || task.groupId !== 'home'));
  state = planner.plannerReducer(state, { type: 'group/delete', id: 'launch' });
  assert.ok(state.tasks.every((task) => task.groupId !== 'launch'));
  assert.ok(before.groups.some((entry) => entry.id === 'launch'), 'Reducer must not mutate previous state');
});

test('timer accumulates actual separately, pauses before switching/completing, and survives rescheduling', () => {
  let state = freshPlanner();
  const originalEstimate = state.tasks.find((task) => task.id === 'flowers').estimatedMinutes;
  state = planner.plannerReducer(state, { type: 'timer/start', id: 'flowers', now: '2026-10-29T12:00:00Z' });
  assert.equal(planner.runningMinutes(state, 'flowers', '2026-10-29T12:02:30Z'), 2.5);
  state = planner.plannerReducer(state, { type: 'task/move', id: 'flowers', date: '2026-10-30' });
  assert.equal(state.activeTimer.taskId, 'flowers');
  state = planner.plannerReducer(state, { type: 'timer/start', id: 'read', now: '2026-10-29T12:03:00Z' });
  assert.equal(state.tasks.find((task) => task.id === 'flowers').actualMinutes, 3);
  state = planner.plannerReducer(state, { type: 'task/toggle', id: 'read', now: '2026-10-29T12:04:00Z' });
  assert.equal(state.activeTimer, null);
  assert.equal(state.tasks.find((task) => task.id === 'read').actualMinutes, 1);
  assert.equal(state.tasks.find((task) => task.id === 'flowers').estimatedMinutes, originalEstimate);
  assert.equal(planner.plannerReducer(state, { type: 'timer/start', id: 'read', now: '2026-10-29T12:05:00Z' }), state, 'Completed tasks cannot start a timer');
});

test('profile constellation uses registered MuseStar nodes and omits itself without a supported sign', () => {
  const { ProfileConstellation } = load('components/ProfileConstellation');
  assert.equal(renderToStaticMarkup(React.createElement(ProfileConstellation, {})), '');
  assert.equal(renderToStaticMarkup(React.createElement(ProfileConstellation, { zodiacSign: 'unknown' })), '');
  const html = renderToStaticMarkup(React.createElement(ProfileConstellation, { zodiacSign: mockProfile.zodiacSign }));
  assert.equal((html.match(/viewBox="0 0 24 40"/g) ?? []).length, 7);
  assert.equal((html.match(/<line /g) ?? []).length, 6);
  assert.ok(html.includes('aria-hidden="true"'));
  assert.ok(!readFileSync(resolve(root, 'components/ProfileConstellation.tsx'), 'utf8').includes('Virgo'));
});

test('theme identities cover semantic navigation, selected, focus, success and progress beyond atmosphere', () => {
  for (const role of ['accent-primary','accent-secondary','accent-pop','selected-background','selected-border','selected-text','navigation-background','navigation-text','focus-ring','success-primary','success-secondary','hover-start','hover-middle','hover-end','progress-start','progress-middle','progress-end','star-1','star-2','star-3']) {
    for (const theme of themes) assert.ok(palettes[theme.id][`--${role}`], `${theme.id}: ${role}`);
  }
  assert.equal(new Set(themes.map((theme) => palettes[theme.id]['--selected-background'])).size, themes.length);
  assert.equal(palettes.astral['--accent-primary'], '#327dff');
  assert.equal(palettes.astral['--focus-ring'], '#17eaff');
  assert.equal(palettes.astral['--water-gradient-end'], '#26f0ff');
  assert.equal(palettes['prism-noir']['--atmosphere-blush'], 'rgba(223, 30, 157, .45)');
  assert.equal(palettes['prism-noir']['--water-gradient-end'], '#ff35c5');
});

test('Planner adapts to one focused mobile day and retains Move alternatives and native-modal focus semantics', () => {
  const styles = readFileSync(resolve(root, 'components/planner/Planner.css'), 'utf8');
  assert.ok(styles.includes('repeat(3, minmax(0, 1fr))'));
  assert.match(styles, /@container muse-content \(max-width: 820px\)[\s\S]*\.muse-planner-day\[data-mobile-visible="false"\] \{ display: none; \}/);
  const { TaskMoveControl } = load('components/planner/TaskMoveControl');
  const { PlannerProvider } = load('components/PlannerStore');
  const html = renderToStaticMarkup(React.createElement(PlannerProvider, null, React.createElement(TaskMoveControl, { task: plannerSample.tasks[0] })));
  assert.ok(html.includes('aria-label="Move Pick up fresh flowers"'));
  const drawer = readFileSync(resolve(root, 'components/MuseDrawer.tsx'), 'utf8');
  assert.ok(drawer.includes('<dialog') && drawer.includes('useMuseDialog') && drawer.includes('onCancel='));
  const lifecycle=readFileSync(resolve(root,'components/useMuseDialog.ts'),'utf8');
  assert.ok(lifecycle.includes('showModal()')&&lifecycle.includes('returnFocus.focus()'));
});

test('drag placement and accessible order commands preserve task identity, dates and completion', () => {
  let state=freshPlanner();
  const original=state.tasks.find((task)=>task.id==='availability');
  state=planner.plannerReducer(state,{type:'task/place',id:'availability',date:'2026-10-29',beforeId:'flowers'});
  assert.deepEqual(state.tasks.find((task)=>task.id==='availability'),{...original,plannedDate:'2026-10-29'});
  assert.deepEqual(planner.plannedTasks(state,'2026-10-29').map((task)=>task.id),['availability','flowers','read']);
  state=planner.plannerReducer(state,{type:'task/place',id:'read',date:'2026-10-29',beforeId:'flowers'});
  assert.deepEqual(planner.plannedTasks(state,'2026-10-29').map((task)=>task.id),['availability','read','flowers']);
  state=planner.plannerReducer(state,{type:'task/place',id:'availability',date:undefined});
  assert.equal(state.tasks.find((task)=>task.id==='availability').dueDate,original.dueDate);
  assert.equal(new Set(state.tasks.map((task)=>task.id)).size,state.tasks.length);
  assert.equal(planPreview([...state.tasks,...state.events],'2026-10-29').tasks.length,2);
  assert.equal(planner.formatPlannedMinutes(165),'2h 45m');
  assert.equal(planner.formatPlannedMinutes(60),'1h');
});

test('Planner rail is a workspace-driven unscheduled source without a day header', () => {
  const {PlannerProvider}=load('components/PlannerStore');
  const {PlannerRail}=load('components/planner/PlannerRail');
  const state=freshPlanner(); state.workspaces.push({id:'studio',name:'Studio',accent:'pop'});
  const html=renderToStaticMarkup(React.createElement(PlannerProvider,{initialState:state},React.createElement(PlannerRail,{workspaceId:'studio',tasks:[],onWorkspaceChange(){},onOpen(){}})));
  assert.ok(html.includes('aria-label="Task List"'));
  assert.ok(html.includes('aria-label="Workspace: Studio"'));
  assert.ok(!html.includes('>Unscheduled<'));
  assert.ok(!html.includes('Ideas waiting for their day'));
  assert.ok(!html.includes('muse-new-workspace'));
  assert.ok(html.includes('New Inbox task'));
  assert.ok(!html.includes('<time'));
  assert.ok(!html.includes('<select'));
});

test('all six themes supply readable planning materials and dark cards visibly separate from containers', () => {
  const resolveToken=(tokens,name)=>{
    const value=tokens[name]; const ref=value.match(/^var\((--[\w-]+)\)$/);
    return ref?resolveToken(tokens,ref[1]):value;
  };
  for(const theme of themes) {
    const tokens=palettes[theme.id];
    for(const role of ['--planning-container-background','--planning-rail-background','--planning-task-background','--planning-task-border','--planning-control-background']) assert.ok(tokens[role],`${theme.id}: ${role}`);
    const page=color(tokens['--background']);
    const container=blend(color(resolveToken(tokens,'--planning-container-background')),page);
    const task=blend(color(resolveToken(tokens,'--planning-task-background')),container);
    for(const text of ['--foreground','--text-muted']) assert.ok(contrast(color(tokens[text]),task)>=4.5,`${theme.id}: ${text} on task`);
    if(theme.mode==='dark') assert.ok(luminance(task)-luminance(container)>.015,`${theme.id}: elevated task luminance`);
  }
  assert.equal(palettes.afterglow['--background'],'#0d0e11');
  assert.equal(palettes.afterglow['--color-scheme'],'dark');
  assert.equal(palettes['prism-noir']['--glass-background'],'rgba(9, 8, 17, .64)');
});

test('Crystal and Frosted keep all six theme surfaces readable while Frosted increases opacity', () => {
  function value(tokens,name) { const current=tokens[name], ref=current.match(/^var\((--[\w-]+)\)$/); return ref?value(tokens,ref[1]):current; }
  for(const theme of themes) {
    const token=palettes[theme.id], base=color(token['--background']);
    const crystal=color(token['--glass-background']), frosted=color(token['--frosted-glass-background']);
    assert.ok(frosted[3]-crystal[3]>=.2,`${theme.id}: material opacity hierarchy`);
    assert.ok(frosted[3]<1,`${theme.id}: Frosted still has a translucent surface`);
    for(const material of ['crystal','frosted']) {
      const card=blend(material==='crystal'?crystal:frosted,base);
      const container=blend(color(value(token,material==='crystal'?'--planning-container-background':'--frosted-planning-container-background')),base);
      const task=blend(color(value(token,material==='crystal'?'--planning-task-background':'--frosted-planning-task-background')),container);
      const input=blend(color(value(token,material==='crystal'?'--planning-control-background':'--frosted-surface-control')),container);
      const popup=blend(color(value(token,material==='crystal'?'--floating-background':'--frosted-floating-background')),base);
      for(const [name,surface] of Object.entries({card,task,input,popup})) for(const text of ['--foreground','--text-muted']) {
        assert.ok(contrast(color(token[text]),surface)>=4.5,`${theme.id}/${material}: ${text} on ${name}`);
      }
    }
  }
  const style=readFileSync(resolve(root,'app/materials.css'),'utf8');
  assert.ok(style.includes('--material-blur: 34px'));
  assert.ok(!/grid-template|padding:|font-size:|width:/.test(style),'Materials cannot change geometry');
});

test('vivid action/completion fills keep readable labels and dark accents retain color intensity',()=>{
  const resolveColor=(tokens,name)=>{const value=tokens[name];const ref=value.match(/^var\((--[\w-]+)\)$/);return color(ref?resolveValue(tokens,ref[1]):value);};
  function resolveValue(tokens,name){const value=tokens[name],ref=value.match(/^var\((--[\w-]+)\)$/);return ref?resolveValue(tokens,ref[1]):value;}
  for(const theme of themes){
    const tokens=palettes[theme.id];
    for(const role of ['--action-fill','--success-primary'])assert.ok(contrast(color(tokens['--on-accent']),resolveColor(tokens,role))>=4.5,`${theme.id}: label on ${role}`);
    if(theme.mode==='dark')for(const role of ['--navigation-accent','--selected-border','--focus-ring','--success-primary','--star-color-1','--star-color-2','--star-color-3','--water-gradient-end']){
      if(theme.id==='disco-damage'&&['--star-color-1','--navigation-accent','--selected-border','--focus-ring'].includes(role)){assert.ok(contrast(resolveColor(tokens,role),color(tokens['--background']))>=7,'Disco chrome/ice glints must remain bright, not muddy');continue;}
      const rgb=resolveColor(tokens,role).slice(0,3),saturation=(Math.max(...rgb)-Math.min(...rgb))/Math.max(...rgb);
      assert.ok(saturation>=.42,`${theme.id}: ${role} should not become a gray/pastel ink token`);
    }
  }
});

test('material text remains readable over representative theme blooms and internal reflected light',()=>{
  const resolveValue=(tokens,name)=>{const value=tokens[name],ref=value.match(/^var\((--[\w-]+)\)$/);return ref?resolveValue(tokens,ref[1]):value;};
  for(const theme of themes){
    const tokens=palettes[theme.id],base=color(tokens['--background']);
    for(const bloom of ['--hero-glow','--atmosphere-aqua','--atmosphere-lavender','--atmosphere-blush'])for(const material of ['crystal','frosted']){
      const atmosphere=blend(color(tokens[bloom]),base);
      let surface=blend(color(tokens[material==='crystal'?'--glass-background':'--frosted-glass-background']),atmosphere);
      const reflection=color(resolveValue(tokens,'--accent-warm'));reflection[3]=material==='crystal'?.09:.02;surface=blend(reflection,surface);
      for(const text of ['--foreground','--text-muted'])assert.ok(contrast(color(tokens[text]),surface)>=4.5,`${theme.id}/${material}: ${text} over ${bloom}`);
    }
  }
});

test('the full vocabulary is browseable in the large feeling picker without a search query',()=>{
 const {EmotionPicker}=load('components/EmotionPicker'),{emotionCatalog}=load('lib/emotions');
 const html=renderToStaticMarkup(React.createElement(EmotionPicker,{emotions:emotionCatalog,selectedIds:['emotion-calm'],onToggle(){},onClose(){}}));
 assert.equal((html.match(/class="emotion-option"/g)??[]).length,emotionCatalog.length);
 assert.ok(html.includes('aria-pressed="true"'));
 assert.ok(html.includes('Browse '+emotionCatalog.length+' feelings'));
 assert.equal((html.match(/tabindex="0"/g)??[]).length,emotionCatalog[0].definition?3:2,'only the active feeling and its available utility actions precede Done');
});

test('compact Planner cards share inline timer/classification and retain manual move only in Details',()=>{
 const {PlannerProvider}=load('components/PlannerStore'),{PlannerTaskCard}=load('components/planner/PlannerTaskCard'),{plannerSample}=load('lib/planner-sample');
 const state=plannerSample,task=state.tasks[0];
 const html=renderToStaticMarkup(React.createElement(PlannerProvider,{initialState:state},React.createElement(PlannerTaskCard,{task,onOpen(){}})));
 assert.ok(html.includes('draggable="true"'));assert.ok(html.includes('Timer for '+task.title));assert.ok(html.includes('Change workspace or group for '+task.title));assert.ok(!html.includes('muse-task-drag'));assert.ok(!html.includes('>Move</button>'));
 const details=readFileSync(resolve(root,'components/planner/TaskDetails.tsx'),'utf8');assert.ok(details.includes('<TaskMoveControl'));assert.ok(details.includes('<MuseChoiceMenu'));assert.ok(!details.includes('<select'));
});

test('Water earns one golden semantic star at or above the real target while its visual bar stays capped',()=>{
 const {WaterCard}=load('components/WaterCard'),{AchievementStar}=load('components/AchievementStar'),{MUSE_STAR_PATH}=load('components/MuseStar');
 const render=(total)=>renderToStaticMarkup(React.createElement(WaterCard,{initialDay:{date:'2026-10-30',total},settings:{unit:'oz',goal:100,quickAdds:[12,24,32,40]}}));
 assert.ok(!render(72).includes('muse-achievement-star'));
 for(const total of [100,108]){const html=render(total);assert.ok(html.includes('aria-label="Water goal achieved"'));assert.ok(html.includes('--water-progress:100%'));assert.ok(html.includes(`aria-valuetext="${total} of 100 oz, goal reached"`));assert.ok(html.includes('data-celebrating="false"'));}
 const star=renderToStaticMarkup(React.createElement(AchievementStar,{size:30}));assert.ok(star.includes(MUSE_STAR_PATH));assert.ok(star.includes('var(--achievement-gold)'));assert.ok(!star.includes('var(--star-'));
});

test('birthday siblings keep white/black bases, complete materials and deterministic shared candy roles',()=>{
 const light=palettes['issya-bday'],dark=palettes['issya-bday-xxx'];assert.equal(light['--background'],'#fffefd');assert.equal(dark['--background'],'#030304');
 for(const role of ['--chart-1','--chart-2','--chart-3','--chart-4','--chart-5','--chart-6','--chart-7','--chart-8','--completion-gradient','--water-progress-gradient'])assert.equal(light[role],dark[role],role);
 assert.equal(new Set(Array.from({length:8},(_,index)=>light[`--chart-${index+1}`])).size,8);
 const {PageCelestial}=load('components/PageCelestial'),html=(motif)=>renderToStaticMarkup(React.createElement(PageCelestial,{motif}));
 assert.notEqual(html('path'),html('garden'));assert.notEqual(html('orbit'),html('trajectories'));assert.ok(!html('daily').includes('achievement'));assert.equal((html('garden').match(/<path /g)??[]).length,2,'only the two official star paths remain');
 const styles=readFileSync(resolve(root,'app/atmosphere.css'),'utf8'),sprinkles=readFileSync(resolve(root,'components/CosmicSprinkles.css'),'utf8');assert.ok(styles.includes('prefers-reduced-motion'));assert.ok(sprinkles.includes('prefers-reduced-motion'));assert.ok(!styles.includes('canvas'));
});

test('completed orb center/badge white checks retain numeric contrast across every theme',()=>{
 for(const theme of themes){const tokens=palettes[theme.id],shadow=color(tokens['--completion-shadow']),ink=color(tokens['--completion-ink']);
  const ref=(name)=>{const raw=tokens[name],match=raw.match(/^var\((--[\w-]+)\)$/);return match?ref(match[1]):raw;};
  const center=blend(shadow,color(ref('--progress-middle')));assert.ok(contrast(ink,center)>=4.5,theme.id+' orb center');assert.ok(contrast(color(tokens['--completion-check']),color(tokens['--completion-badge']))>=4.5,theme.id+' badge');
 }
});
