/**
 * Recurrence 2.0 (#89): recurring tasks and events in the Planner, as occurrences.
 *
 * A recurring task or event stays ONE record (the series). For any date window, `projectTasks` / `projectEvents`
 * swap each series for its dated occurrences, with stable ids `<series id>::<YYYY-MM-DD>` (the scheduled date, even if
 * the occurrence was moved). Every view reads the projected list, so an occurrence exists once per date and is never
 * counted twice. Only what actually happened to a date is stored (completed, skipped, moved, exceptions); nothing is
 * generated ahead of time. `translateAction` turns ordinary task actions on an occurrence id (toggle, drag, delete,
 * edit) into the matching recurrence change, so existing controls work on occurrences unchanged.
 */
import { endBefore, fromLegacy, occurrencesBetween, validRule, type RecurrenceRule } from "./recurrence";
import { shiftDate } from "./dates";
import type { DayEvent, PlannedTask } from "./models";

export type TaskOccurrence = { taskId: string; date: string; status: "completed" | "skipped" | "moved"; movedTo?: string; completedAt?: string; completedOn?: string };
export type EventOverrides = Partial<Pick<DayEvent, "title" | "time" | "endTime" | "location" | "detail" | "status" | "allDay">> & { deleted?: boolean; /** 24-hour HH:MM, for ordering. */ clock?: string };
export type EventException = { eventId: string; date: string; canceled?: boolean; movedTo?: string; overrides?: EventOverrides };
export type RecurrenceChange =
  | { op: "task/rule"; taskId: string; rule: RecurrenceRule | null }
  | { op: "task/split"; taskId: string; from: string; newId: string; before: RecurrenceRule; rule: RecurrenceRule | null; title?: string }
  | { op: "occurrence/complete"; taskId: string; date: string; complete: boolean }
  | { op: "occurrence/skip"; taskId: string; date: string; skip: boolean }
  | { op: "occurrence/move"; taskId: string; date: string; to: string | null }
  | { op: "event/rule"; eventId: string; rule: RecurrenceRule | null }
  | { op: "event/occurrence"; eventId: string; date: string; canceled?: boolean; movedTo?: string | null; overrides?: EventOverrides; clear?: boolean }
  | { op: "event/split"; eventId: string; from: string; newId: string; before: RecurrenceRule; rule: RecurrenceRule | null; title?: string };

const SEP = "::";
export const occurrenceId = (seriesId: string, date: string) => `${seriesId}${SEP}${date}`;
export function parseOccurrenceId(id: string): { seriesId: string; date: string } | null {
  const i = id.lastIndexOf(SEP); if (i < 0) return null;
  const date = id.slice(i + SEP.length); return /^\d{4}-\d{2}-\d{2}$/.test(date) ? { seriesId: id.slice(0, i), date } : null;
}

/** A task's rule: the new rule, or the older frequency/interval/until columns read as one (never rewritten). */
export function taskRule(task: Pick<PlannedTask, "rule" | "recurrence" | "plannedDate">): RecurrenceRule | null {
  if (!task.plannedDate) return null;
  if (task.rule && validRule(task.rule)) return task.rule;
  return task.recurrence ? fromLegacy({ frequency: task.recurrence.frequency, interval: task.recurrence.interval, until: task.recurrence.until ?? null }, task.plannedDate) : null;
}
export const isSeries = (task: Pick<PlannedTask, "rule" | "recurrence" | "plannedDate" | "seriesId">) => !task.seriesId && !!taskRule(task);

/** Occurrences of recurring tasks between two dates (inclusive); non-recurring tasks pass through unchanged. */
export function projectTasks(tasks: PlannedTask[], occurrences: TaskOccurrence[] = [], from: string, to: string): PlannedTask[] {
  const out: PlannedTask[] = [];
  const byTask = new Map<string, Map<string, TaskOccurrence>>();
  for (const o of occurrences) { let m = byTask.get(o.taskId); if (!m) byTask.set(o.taskId, (m = new Map())); m.set(o.date, o); }
  for (const task of tasks) {
    const rule = taskRule(task);
    if (!rule || task.seriesId) { out.push(task); continue; }
    const occ = byTask.get(task.id) ?? new Map<string, TaskOccurrence>();
    const instance = (date: string, shown: string, o?: TaskOccurrence): PlannedTask => ({
      ...task, id: occurrenceId(task.id, date), plannedDate: shown, dueDate: undefined, rule,
      complete: o?.status === "completed", completedAt: o?.status === "completed" ? o.completedAt : undefined, seriesId: task.id, occurrenceDate: date,
    });
    for (const d of occurrencesBetween(rule, task.plannedDate!, from, to)) {
      const o = occ.get(d);
      if (o?.status === "skipped" || o?.status === "moved") continue;
      out.push(instance(d, d, o));
    }
    for (const o of occ.values()) if (o.status === "moved" && o.movedTo && o.movedTo >= from && o.movedTo <= to) out.push(instance(o.date, o.movedTo, o));
  }
  return out;
}

/** Occurrences of recurring events overlapping a window, with per-date exceptions (canceled, moved, edited, deleted). */
export function projectEvents(events: DayEvent[], exceptions: EventException[] = [], from: string, to: string): DayEvent[] {
  const out: DayEvent[] = [];
  for (const event of events) {
    if (!event.rule || !validRule(event.rule) || event.seriesId) { out.push(event); continue; }
    const span = event.endDate ? Math.round((Date.parse(`${event.endDate}T12:00:00Z`) - Date.parse(`${event.date}T12:00:00Z`)) / 86400000) : 0;
    const ex = new Map(exceptions.filter((x) => x.eventId === event.id).map((x) => [x.date, x]));
    const make = (date: string, shown: string, x?: EventException): DayEvent | null => {
      const o = x?.overrides ?? {};
      if (o.deleted) return null;
      const { clock: overrideClock, deleted: _deleted, ...fields } = o; void _deleted;
      const time = fields.time ?? event.time, allDay = fields.allDay ?? event.allDay, clock = overrideClock ?? event.dateTime.slice(11, 16);
      return { ...event, ...fields, id: occurrenceId(event.id, date), date: shown, endDate: span ? shiftDate(shown, span) : undefined, time, allDay,
        dateTime: `${shown}T${allDay || !/^\d{2}:\d{2}$/.test(clock) ? "00:00" : clock}`, status: x?.canceled ? "canceled" : o.status ?? event.status, seriesId: event.id, occurrenceDate: date };
    };
    for (const d of occurrencesBetween(event.rule, event.date, shiftDate(from, -span), to)) {
      const x = ex.get(d);
      if (x?.movedTo) continue;
      const e = make(d, d, x); if (e) out.push(e);
    }
    for (const x of ex.values()) if (x.movedTo && x.movedTo <= to && shiftDate(x.movedTo, span) >= from) { const e = make(x.date, x.movedTo, x); if (e) out.push(e); }
  }
  return out;
}

/** The status of one task occurrence. */
export const occurrenceOf = (occurrences: TaskOccurrence[] = [], taskId: string, date: string) => occurrences.find((o) => o.taskId === taskId && o.date === date);

/** "This and future" for a task or event series: the original ends before `from`, a new series starts on `from`. */
export function splitChange(kind: "task" | "event", seriesId: string, start: string, oldRule: RecurrenceRule, from: string, rule: RecurrenceRule | null, newId: string, title?: string): RecurrenceChange {
  const before = endBefore(oldRule, start, from);
  return kind === "task" ? { op: "task/split", taskId: seriesId, from, newId, before, rule, ...(title ? { title } : {}) } : { op: "event/split", eventId: seriesId, from, newId, before, rule, ...(title ? { title } : {}) };
}

/** Apply a recurrence change to Planner state (optimistically, and identically to the server). */
export function applyRecurrence<S extends { tasks: PlannedTask[]; events: DayEvent[]; occurrences?: TaskOccurrence[]; eventExceptions?: EventException[] }>(state: S, c: RecurrenceChange, now: string, today: string): S {
  const occ = state.occurrences ?? [], exc = state.eventExceptions ?? [];
  const setOcc = (taskId: string, date: string, next: TaskOccurrence | null) => [...occ.filter((o) => !(o.taskId === taskId && o.date === date)), ...(next ? [next] : [])];
  switch (c.op) {
    case "task/rule": return { ...state, tasks: state.tasks.map((t) => t.id === c.taskId ? { ...t, rule: c.rule ?? undefined, recurrence: undefined, ...(c.rule ? { complete: false, completedAt: undefined } : {}) } : t) };
    case "task/split": {
      const src = state.tasks.find((t) => t.id === c.taskId); if (!src) return state;
      const copy: PlannedTask = { ...src, id: c.newId, title: c.title?.trim() || src.title, plannedDate: c.from, dueDate: undefined, rule: c.rule ?? undefined, recurrence: undefined, complete: false, completedAt: undefined, subtasks: [], actualMinutes: 0, createdAt: now };
      return { ...state, tasks: [...state.tasks.map((t) => t.id === c.taskId ? { ...t, rule: c.before, recurrence: undefined } : t), copy], occurrences: occ.map((o) => o.taskId === c.taskId && o.date >= c.from ? { ...o, taskId: c.newId } : o) };
    }
    case "occurrence/complete": {
      const cur = occurrenceOf(occ, c.taskId, c.date);
      if (c.complete) return { ...state, occurrences: setOcc(c.taskId, c.date, { taskId: c.taskId, date: c.date, status: "completed", completedAt: now, completedOn: today }) };
      return cur?.status === "completed" ? { ...state, occurrences: setOcc(c.taskId, c.date, null) } : state;
    }
    case "occurrence/skip": return { ...state, occurrences: c.skip ? setOcc(c.taskId, c.date, { taskId: c.taskId, date: c.date, status: "skipped" }) : occurrenceOf(occ, c.taskId, c.date)?.status === "skipped" ? setOcc(c.taskId, c.date, null) : occ };
    case "occurrence/move": return { ...state, occurrences: !c.to || c.to === c.date ? (occurrenceOf(occ, c.taskId, c.date)?.status === "moved" ? setOcc(c.taskId, c.date, null) : occ) : setOcc(c.taskId, c.date, { taskId: c.taskId, date: c.date, status: "moved", movedTo: c.to }) };
    case "event/rule": return { ...state, events: state.events.map((e) => e.id === c.eventId ? { ...e, rule: c.rule ?? undefined } : e), eventExceptions: c.rule ? exc : exc.filter((x) => x.eventId !== c.eventId) };
    case "event/occurrence": {
      const rest = exc.filter((x) => !(x.eventId === c.eventId && x.date === c.date));
      return { ...state, eventExceptions: c.clear ? rest : [...rest, { eventId: c.eventId, date: c.date, canceled: !!c.canceled, ...(c.movedTo ? { movedTo: c.movedTo } : {}), ...(c.overrides ? { overrides: c.overrides } : {}) }] };
    }
    case "event/split": {
      const src = state.events.find((e) => e.id === c.eventId); if (!src) return state;
      const span = src.endDate ? Math.round((Date.parse(`${src.endDate}T12:00:00Z`) - Date.parse(`${src.date}T12:00:00Z`)) / 86400000) : 0;
      const copy: DayEvent = { ...src, id: c.newId, title: c.title?.trim() || src.title, date: c.from, endDate: span ? shiftDate(c.from, span) : undefined, dateTime: `${c.from}${src.dateTime.slice(10)}`, rule: c.rule ?? undefined };
      return { ...state, events: [...state.events.map((e) => e.id === c.eventId ? { ...e, rule: c.before } : e), copy], eventExceptions: exc.map((x) => x.eventId === c.eventId && x.date >= c.from ? { ...x, eventId: c.newId } : x) };
    }
  }
}

type AnyAction = { type: string; [k: string]: unknown };
/**
 * Ordinary task actions aimed at an occurrence id become recurrence changes: toggle → complete/reopen that date, drag
 * to a day → move it, drag back to the list or delete → skip it, edits → the series. Everything else passes through.
 */
export function translateAction<A extends AnyAction>(action: A, state: { occurrences?: TaskOccurrence[] }): A | { type: "recurrence"; change: RecurrenceChange; now: string } {
  const id = typeof action.id === "string" ? action.id : null, occ = id ? parseOccurrenceId(id) : null;
  const now = typeof action.now === "string" ? action.now : new Date().toISOString();
  if (!occ) return action;
  const { seriesId, date } = occ;
  switch (action.type) {
    case "task/toggle": return { type: "recurrence", now, change: { op: "occurrence/complete", taskId: seriesId, date, complete: occurrenceOf(state.occurrences, seriesId, date)?.status !== "completed" } };
    case "task/completeOn": return { type: "recurrence", now, change: { op: "occurrence/complete", taskId: seriesId, date, complete: true } };
    case "task/move": case "task/place": { const to = action.date as string | undefined; return { type: "recurrence", now, change: to ? { op: "occurrence/move", taskId: seriesId, date, to } : { op: "occurrence/skip", taskId: seriesId, date, skip: true } }; }
    case "task/delete": return { type: "recurrence", now, change: { op: "occurrence/skip", taskId: seriesId, date, skip: true } };
    case "task/update": { const patch = { ...(action.patch as Record<string, unknown>) }; delete patch.plannedDate; delete patch.complete; delete patch.completedAt; return { ...action, id: seriesId, patch }; }
    case "timer/start": return { ...action, id: seriesId };
    default: return action;
  }
}

/** Resolve any task id (an ordinary task, a series, or an occurrence id) to what Details should show and edit. */
export function resolveTask(state: { tasks: PlannedTask[]; occurrences?: TaskOccurrence[] }, id: string): { task: PlannedTask; series: PlannedTask | null; occurrenceDate: string | null } | null {
  const occ = parseOccurrenceId(id);
  if (!occ) { const task = state.tasks.find((t) => t.id === id); return task ? { task, series: taskRule(task) ? task : null, occurrenceDate: null } : null; }
  const series = state.tasks.find((t) => t.id === occ.seriesId); if (!series) return null;
  const o = occurrenceOf(state.occurrences, series.id, occ.date), rule = taskRule(series);
  const task: PlannedTask = { ...series, id, plannedDate: o?.status === "moved" ? o.movedTo : occ.date, dueDate: undefined, rule: rule ?? undefined,
    complete: o?.status === "completed", completedAt: o?.status === "completed" ? o.completedAt : undefined, seriesId: series.id, occurrenceDate: occ.date };
  return { task, series, occurrenceDate: occ.date };
}
