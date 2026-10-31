import {validAccent,validGradient,type AccentColor,type CustomGradient} from "./appearance-values";
import { shiftDate, validDate, weekDates } from "./dates";
import type { MuseIconName } from "@/components/MuseIcon";

export type RitualAccent = AccentColor;
export const ritualGradients = ["primary-secondary", "secondary-pop", "pop-primary"] as const;
export type RitualGradient = typeof ritualGradients[number] | CustomGradient;
export type RitualGroupDefinition = { id: string; name: string; accent: RitualAccent; icon: MuseIconName; collapsed: boolean; gradient?: RitualGradient };
export type RitualRecurrence = { kind: "daily" } | { kind: "weekly"; weekday: number } | { kind: "weekdays"; weekdays: number[] };
export type RitualType = "checkbox" | "numeric" | "duration" | "weekly-target";
export type RitualDefinition = {
  id: string; name: string; groupId: string; type: RitualType; goal: number; unit: string;
  recurrence: RitualRecurrence; startDate: string; createdAt: string;
};
export type RitualEntry = { id: string; ritualId: string; date: string; value: number; outcome?: "missed"; updatedAt: string };
export type RitualState = { groups: RitualGroupDefinition[]; rituals: RitualDefinition[]; entries: RitualEntry[]; celebratedMilestones: string[] };
export type RitualAction =
  | { type: "ritual/save"; ritual: RitualDefinition }
  | { type: "group/save"; group: RitualGroupDefinition }
  | { type: "group/toggle"; id: string }
  | { type: "group/delete"; id: string }
  | { type: "entry/set"; ritualId: string; date: string; value: number | null; today: string; now: string };
export const ritualTypeLabels: Record<RitualType, string> = { checkbox: "Checkbox", numeric: "Quantity", duration: "Duration", "weekly-target": "Weekly target" };
export const weekdayOptions = [{ day: 1, label: "Mon" }, { day: 2, label: "Tue" }, { day: 3, label: "Wed" }, { day: 4, label: "Thu" }, { day: 5, label: "Fri" }, { day: 6, label: "Sat" }, { day: 0, label: "Sun" }];
export function isScheduled(ritual: RitualDefinition, date: string) {
  if (date < ritual.startDate) return false;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return ritual.recurrence.kind === "daily" || (ritual.recurrence.kind === "weekly" ? ritual.recurrence.weekday === weekday : ritual.recurrence.weekdays.includes(weekday));
}
export function recurrenceLabel(recurrence: RitualRecurrence) {
  if (recurrence.kind === "daily") return "Every day";
  const days = recurrence.kind === "weekly" ? [recurrence.weekday] : recurrence.weekdays;
  return weekdayOptions.filter((option) => days.includes(option.day)).map((option) => option.label).join(" · ");
}
export function entryFor(state: RitualState, id: string, date: string) { return state.entries.find((entry) => entry.ritualId === id && entry.date === date); }
export function weeklyValue(state: RitualState, ritual: RitualDefinition, date: string) {
  const week = weekDates(date);
  return state.entries.filter((entry) => entry.ritualId === ritual.id && week.includes(entry.date) && isScheduled(ritual, entry.date)).reduce((sum, entry) => sum + entry.value, 0);
}
export function ritualCell(state: RitualState, ritual: RitualDefinition, date: string, today: string) {
  const entry = entryFor(state, ritual.id, date);
  const value = entry?.value ?? null;
  const recorded = entry !== undefined;
  let status: "unscheduled" | "complete" | "partial" | "missed" | "unknown" | "upcoming" | "open" | "available" | "logged";
  if (!isScheduled(ritual, date)) status = "unscheduled";
  else if (today && date > today) status = "upcoming";
  else if (recorded && (entry.outcome === "missed" || value === 0)) status = "missed";
  else if (ritual.type === "weekly-target") status = value !== null && value > 0 ? "logged" : "available";
  else if (value !== null && value >= ritual.goal) status = "complete";
  else if (value !== null && value > 0) status = "partial";
  else if (today && date < today) status = "unknown";
  else status = "open";
  return { status, value, recorded };
}

/** Consecutive scheduled opportunities, never consecutive calendar days. An open day/week is not a missed opportunity. */
export function ritualStreak(state: RitualState, ritual: RitualDefinition, today: string): { count: number; start: string | null; unit: "scheduled days" | "weeks" } {
  let count = 0, start: string | null = null;
  const unit = ritual.type === "weekly-target" ? "weeks" : "scheduled days";
  if (!validDate(today) || today < ritual.startDate) return { count, start, unit };
  if (ritual.type === "weekly-target") {
    let monday = weekDates(today)[0];
    if (weeklyValue(state, ritual, monday) < ritual.goal) monday = shiftDate(monday, -7);
    while (shiftDate(monday, 6) >= ritual.startDate) {
      if (weeklyValue(state, ritual, monday) < ritual.goal) break;
      count++; start = monday; monday = shiftDate(monday, -7);
    }
  } else {
    let day = today;
    if (isScheduled(ritual, day)) {
      const current = ritualCell(state, ritual, day, today).status;
      if (current === "missed") return { count, start, unit };
      if (current !== "complete") day = shiftDate(day, -1);
    }
    while (day >= ritual.startDate) {
      if (isScheduled(ritual, day)) {
        if (ritualCell(state, ritual, day, today).status !== "complete") break;
        count++; start = day;
      }
      day = shiftDate(day, -1);
    }
  }
  return { count, start, unit };
}
export function weekSummary(state: RitualState, week: string[], today: string) {
  const daily = state.rituals.filter((ritual) => ritual.type !== "weekly-target");
  const elapsed = daily.flatMap((ritual) => week.filter((date) => today && date <= today && isScheduled(ritual, date)).map((date) => ({ ritual, date })));
  const countStatus = (status: ReturnType<typeof ritualCell>["status"]) => elapsed.filter(({ ritual, date }) => ritualCell(state, ritual, date, today).status === status).length;
  const completed = elapsed.filter(({ ritual, date }) => ritualCell(state, ritual, date, today).status === "complete").length;
  const logged = state.entries.filter((entry) => week.includes(entry.date) && today && entry.date <= today).length;
  const targets = state.rituals.filter((ritual) => ritual.type === "weekly-target" && week.some((date) => isScheduled(ritual, date)));
  return { completed, partial: countStatus("partial"), missed: countStatus("missed"), unknown: countStatus("unknown"), scheduled: elapsed.length, logged, weeklyMet: targets.filter((ritual) => weeklyValue(state, ritual, week[0]) >= ritual.goal).length, weeklyTargets: targets.length };
}
export function ritualFeedback(before: RitualState, after: RitualState, ritual: RitualDefinition, date: string, today: string): { kind: "orbital" | "constellation"; key?: string; keys?: string[] } | null {
  const previousEntry = entryFor(before, ritual.id, date), nextEntry = entryFor(after, ritual.id, date);
  if (!nextEntry || nextEntry.value <= 0 || nextEntry.value <= (previousEntry?.value ?? -1)) return null;
  const oldCell = ritualCell(before, ritual, date, today), nextCell = ritualCell(after, ritual, date, today);
  const oldStreak = ritualStreak(before, ritual, today), streak = ritualStreak(after, ritual, today);
  const milestones = ritual.type === "weekly-target" ? [4, 8, 12, 26, 52] : [3, 7, 14, 30, 60, 100, 365];
  const crossed = milestones.filter((value) => oldStreak.count < value && streak.count >= value);
  const threshold = crossed.at(-1);
  const key = threshold && streak.start ? `${ritual.id}/${streak.start}/${threshold}` : undefined;
  if (key && !before.celebratedMilestones.includes(key)) return { kind: "constellation", key, keys: crossed.map((value) => `${ritual.id}/${streak.start}/${value}`) };
  if ((nextCell.status === "complete" && oldCell.status !== "complete") || (ritual.type === "weekly-target" && weeklyValue(before, ritual, date) < ritual.goal && weeklyValue(after, ritual, date) >= ritual.goal)) return { kind: "orbital" };
  return null;
}
function validRecurrence(recurrence: RitualRecurrence) {
  const validDay = (day: number) => Number.isInteger(day) && day >= 0 && day <= 6;
  return recurrence.kind === "daily" || (recurrence.kind === "weekly" ? validDay(recurrence.weekday) : recurrence.weekdays.length > 0 && recurrence.weekdays.every(validDay));
}
export function ritualReducer(state: RitualState, action: RitualAction): RitualState {
  switch (action.type) {
    case "ritual/save": {
      const ritual = action.ritual;
      if (!ritual.name.trim() || !validDate(ritual.startDate) || !Number.isFinite(ritual.goal) || ritual.goal <= 0 || !validRecurrence(ritual.recurrence) || !state.groups.some((group) => group.id === ritual.groupId)) return state;
      if (ritual.type === "weekly-target" && !Number.isInteger(ritual.goal)) return state;
      const previous = state.rituals.find((entry) => entry.id === ritual.id);
      // Protect the meaning of history until effective-dated schedule/goal changes exist.
      const locked = previous && state.entries.some((entry) => entry.ritualId === ritual.id);
      const next = locked ? { ...previous, name: ritual.name.trim(), groupId: ritual.groupId } : { ...ritual, name: ritual.name.trim(), goal: ritual.type === "checkbox" ? 1 : ritual.goal };
      return { ...state, rituals: previous ? state.rituals.map((entry) => entry.id === ritual.id ? next : entry) : [...state.rituals, next] };
    }
    case "group/save": return !action.group.name.trim() || !validAccent(action.group.accent) || (action.group.gradient && typeof action.group.gradient !== "string" && !validGradient(action.group.gradient)) ? state : { ...state, groups: state.groups.some((group) => group.id === action.group.id) ? state.groups.map((group) => group.id === action.group.id ? { ...action.group, name: action.group.name.trim() } : group) : [...state.groups, { ...action.group, name: action.group.name.trim() }] };
    case "group/toggle": return { ...state, groups: state.groups.map((group) => group.id === action.id ? { ...group, collapsed: !group.collapsed } : group) };
    case "group/delete": return state.groups.length <= 1 || state.rituals.some((ritual) => ritual.groupId === action.id) ? state : { ...state, groups: state.groups.filter((group) => group.id !== action.id) };
    case "entry/set": {
      const ritual = state.rituals.find((entry) => entry.id === action.ritualId);
      if (!ritual || !validDate(action.date) || !validDate(action.today) || action.date > action.today || !isScheduled(ritual, action.date)) return state;
      if (action.value !== null && (!Number.isFinite(action.value) || action.value < 0 || (ritual.type === "checkbox" && ![0, 1].includes(action.value)) || (ritual.type === "weekly-target" && !Number.isInteger(action.value)))) return state;
      const rest = state.entries.filter((entry) => entry.ritualId !== ritual.id || entry.date !== action.date);
      const next = { ...state, entries: action.value === null ? rest : [...rest, { id: `${ritual.id}/${action.date}`, ritualId: ritual.id, date: action.date, value: action.value, ...(action.value === 0 ? { outcome: "missed" as const } : {}), updatedAt: action.now }] };
      const feedback = ritualFeedback(state, next, ritual, action.date, action.today);
      return feedback?.key ? { ...next, celebratedMilestones: [...new Set([...state.celebratedMilestones, ...(feedback.keys ?? [feedback.key])])] } : next;
    }
  }
}

/** Daily goal completion only. Weekly targets remain independent weekly obligations.
 * Unknown elapsed days can lack completion credit without being classified as Missed.
 * This prototype has no approved fractional-adherence model: Partial is not full credit.
 */
export function ritualDayProgress(state:RitualState,date:string,today:string) {
  const scheduled=state.rituals.filter((ritual)=>ritual.type!=="weekly-target"&&isScheduled(ritual,date));
  const completed=scheduled.filter((ritual)=>ritualCell(state,ritual,date,today).status==="complete").length;
  const future=!today||date>today;
  return {total:scheduled.length,completed,fraction:future||!scheduled.length?null:completed/scheduled.length,perfect:!future&&scheduled.length>0&&completed===scheduled.length};
}
