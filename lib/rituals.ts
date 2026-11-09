import {validConnection,type RitualConnection} from './ritual-connection-rules';
import {validAccent,validGradient,type AccentColor,type CustomGradient} from "./appearance-values";
import { shiftDate, validDate, weekDates } from "./dates";
import type { MuseIconName } from "@/components/MuseIcon";

export type RitualAccent = AccentColor;
export const ritualGradients = ["primary-secondary", "secondary-pop", "pop-primary"] as const;
export type RitualGradient = typeof ritualGradients[number] | CustomGradient;
export type RitualGroupDefinition = { id: string; name: string; accent: RitualAccent; icon: MuseIconName; collapsed: boolean; gradient?: RitualGradient };
export type RitualRecurrence = { kind: "daily" } | { kind: "weekly"; weekday: number } | { kind: "weekdays"; weekdays: number[] };
export type RitualType = "checkbox" | "numeric" | "duration" | "weekly-target" | "category";
/** A categorical habit's legend (#85), e.g. Strength / Cardio / Rest. Colors are stored hex values. */
export type RitualCategory = { id: string; label: string; color: string };
export type RitualDefinition = {
  id: string; name: string; groupId: string; type: RitualType; goal: number; unit: string;
  status?:"active"|"paused"|"archived"; inactivePeriods?:{start:string;end:string|null;kind:"paused"|"archived"}[];
  recurrence: RitualRecurrence; startDate: string; createdAt: string;
  /** Present when values derive from another module's records; null/absent means manual check-offs. */
  connection?: RitualConnection | null;
  /** Categorical habits only: the legend. A used category can be renamed or recolored, never removed. */
  categories?: RitualCategory[];
  /** #104: "X times per week" (1–7). Available every day; the week is met by this many distinct completed days. */
  timesPerWeek?: number | null;
  /** #104: optional emoji shown beside the habit. Cosmetic, so it stays editable after history exists. */
  emoji?: string | null;
};
export type RitualEntry = { id: string; ritualId: string; date: string; value: number; outcome?: "missed"; updatedAt: string; /** Categorical habits: the chosen category id (value is 1). */ category?: string; /** Display-only value derived from a connected tracker; never saved. */ derived?: true; /** #104: that date's goal when a connected ritual follows a shared goal (water). */ goal?: number };
export type RitualState = { groups: RitualGroupDefinition[]; rituals: RitualDefinition[]; entries: RitualEntry[]; celebratedMilestones: string[]; /** True once the server stores connections. */ connectionsEnabled?: boolean; /** True once the server stores categorical habits (#85). */ categoriesEnabled?: boolean };
export type RitualAction =
  | {type:"ritual/lifecycle";id:string;operation:"pause"|"resume"|"archive"|"restore"|"delete";today:string}
  | { type: "ritual/save"; ritual: RitualDefinition }
  /** #12: reorder within a group or move to another group. Lands before `before` (a ritual id), else at the group's end. Identity, history and settings are untouched. */
  | { type: "ritual/move"; id: string; groupId: string; before: string | null }
  | { type: "group/save"; group: RitualGroupDefinition }
  | { type: "group/toggle"; id: string }
  | { type: "group/delete"; id: string }
  | { type: "entry/cycle"; ritualId:string;date:string;today:string;now:string }
  | { type: "entry/set"; ritualId: string; date: string; value: number | null; today: string; now: string }
  | { type: "entry/category"; ritualId: string; date: string; category: string | null; today: string; now: string }
  | { type: "ritual/connect"; id: string; connection: RitualConnection | null; materialize: { date: string; value: number }[]; today: string; now: string };
export const ritualTypeLabels: Record<RitualType, string> = { checkbox: "Checkbox", numeric: "Quantity", duration: "Duration", "weekly-target": "Weekly target", category: "Category" };
export const categoryPalette = ["#e0457b", "#2f8fe0", "#4cb944", "#f08a24", "#8a63d2", "#1fb5a8", "#e8c22c", "#8a8f98"] as const;
const validCategories = (list: unknown): list is RitualCategory[] => Array.isArray(list) && list.length >= 1 && list.length <= 12 && new Set(list.map((c) => c?.id)).size === list.length && list.every((c) => c && typeof c.id === "string" && /^[A-Za-z0-9-]{1,40}$/.test(c.id) && typeof c.label === "string" && c.label.trim().length >= 1 && c.label.trim().length <= 40 && typeof c.color === "string" && /^#[0-9a-fA-F]{6}$/.test(c.color));
/** Categories a habit's history uses; these must stay in its legend. */
export const usedCategories = (state: RitualState, ritualId: string) => new Set(state.entries.filter((e) => e.ritualId === ritualId && e.category).map((e) => e.category!));
export const weekdayOptions = [{ day: 1, label: "Mon" }, { day: 2, label: "Tue" }, { day: 3, label: "Wed" }, { day: 4, label: "Thu" }, { day: 5, label: "Fri" }, { day: 6, label: "Sat" }, { day: 0, label: "Sun" }];
function matchesSchedule(ritual:RitualDefinition,date:string){
  if(date<ritual.startDate)return false;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return ritual.recurrence.kind === "daily" || (ritual.recurrence.kind === "weekly" ? ritual.recurrence.weekday === weekday : ritual.recurrence.weekdays.includes(weekday));
}
export function isScheduled(ritual:RitualDefinition,date:string){return matchesSchedule(ritual,date)&&!ritual.inactivePeriods?.some(period=>period.start<=date&&(!period.end||date<period.end));}
export function rhythmLabel(ritual: Pick<RitualDefinition, "recurrence" | "timesPerWeek">) { return ritual.timesPerWeek ? `${ritual.timesPerWeek}× a week` : recurrenceLabel(ritual.recurrence); }
export function recurrenceLabel(recurrence: RitualRecurrence) {
  if (recurrence.kind === "daily") return "Every day";
  const days = recurrence.kind === "weekly" ? [recurrence.weekday] : recurrence.weekdays;
  return weekdayOptions.filter((option) => days.includes(option.day)).map((option) => option.label).join(" · ");
}
export function entryFor(state: RitualState, id: string, date: string) { return state.entries.find((entry) => entry.ritualId === id && entry.date === date); }
/** Previously recorded measurements remain meaningful even on the day pausing began. */
export function ritualOpportunity(state:RitualState,ritual:RitualDefinition,date:string){return matchesSchedule(ritual,date)&&(isScheduled(ritual,date)||!!entryFor(state,ritual.id,date));}
export function weeklyValue(state: RitualState, ritual: RitualDefinition, date: string) {
  const week = weekDates(date);
  return state.entries.filter((entry) => entry.ritualId === ritual.id && week.includes(entry.date)&&matchesSchedule(ritual,entry.date)).reduce((sum, entry) => sum + entry.value, 0);
}
/** #104: an "X times per week" ritual — any day counts, none is a separate obligation. */
export const flexible = (ritual: RitualDefinition) => !!ritual.timesPerWeek && ritual.type !== "weekly-target" && ritual.type !== "category";
/** Distinct days this week the ritual was completed (a day counts once however many times it was logged). */
export function weeklyDays(state: RitualState, ritual: RitualDefinition, date: string) {
  const week = weekDates(date);
  return new Set(state.entries.filter((e) => e.ritualId === ritual.id && week.includes(e.date) && e.outcome !== "missed" && e.value > 0 && e.value >= (e.goal ?? ritual.goal)).map((e) => e.date)).size;
}
export function ritualCell(state: RitualState, ritual: RitualDefinition, date: string, today: string) {
  const entry = entryFor(state, ritual.id, date);
  const value = entry?.value ?? null;
  const recorded = entry !== undefined;
  let status: "unscheduled" | "complete" | "partial" | "missed" | "unknown" | "upcoming" | "open" | "available" | "logged";
  if (!ritualOpportunity(state,ritual,date)) status = "unscheduled";
  else if (today && date > today) status = "upcoming";
  else if (recorded && (entry.outcome === "missed" || value === 0)) status = "missed";
  else if (ritual.type === "weekly-target") status = value !== null && value > 0 ? "logged" : "available";
  else if (value !== null && value >= (entry?.goal ?? ritual.goal)) status = "complete";
  else if (value !== null && value > 0) status = "partial";
  else if (flexible(ritual)) status = "available";
  else if (today && date < today) status = "unknown";
  else status = "open";
  return { status, value, recorded };
}

/** Consecutive scheduled opportunities, never consecutive calendar days. An open day/week is not a missed opportunity. */
export function ritualStreak(state: RitualState, ritual: RitualDefinition, today: string): { count: number; start: string | null; unit: "scheduled days" | "weeks" } {
  let count = 0, start: string | null = null;
  const weekly = ritual.type === "weekly-target" || flexible(ritual), unit = weekly ? "weeks" : "scheduled days";
  if (!validDate(today) || today < ritual.startDate) return { count, start, unit };
  const met = (monday: string) => flexible(ritual) ? weeklyDays(state, ritual, monday) >= ritual.timesPerWeek! : weeklyValue(state, ritual, monday) >= ritual.goal;
  if (weekly) {
    let monday = weekDates(today)[0];
    if (!met(monday)) monday = shiftDate(monday, -7);
    while (shiftDate(monday, 6) >= ritual.startDate) {
      if(!weekDates(monday).some(date=>ritualOpportunity(state,ritual,date))){monday=shiftDate(monday,-7);continue;}
      if (!met(monday)) break;
      count++; start = monday; monday = shiftDate(monday, -7);
    }
  } else {
    let day = today;
    if (ritualOpportunity(state,ritual,day)) {
      const current = ritualCell(state, ritual, day, today).status;
      if (current === "missed") return { count, start, unit };
      if (current !== "complete") day = shiftDate(day, -1);
    }
    while (day >= ritual.startDate) {
      if (ritualOpportunity(state,ritual,day)) {
        if (ritualCell(state, ritual, day, today).status !== "complete") break;
        count++; start = day;
      }
      day = shiftDate(day, -1);
    }
  }
  return { count, start, unit };
}
export function weekSummary(state: RitualState, week: string[], today: string) {
  const daily = state.rituals.filter((ritual) => ritual.type !== "weekly-target" && !flexible(ritual));
  const elapsed = daily.flatMap((ritual) => week.filter((date) => today && date <= today && ritualOpportunity(state,ritual,date)).map((date) => ({ ritual, date })));
  const countStatus = (status: ReturnType<typeof ritualCell>["status"]) => elapsed.filter(({ ritual, date }) => ritualCell(state, ritual, date, today).status === status).length;
  const completed = elapsed.filter(({ ritual, date }) => ritualCell(state, ritual, date, today).status === "complete").length;
  const logged = state.entries.filter((entry) => week.includes(entry.date) && today && entry.date <= today).length;
  const targets = state.rituals.filter((ritual) => (ritual.type === "weekly-target" || flexible(ritual)) && week.some((date) => ritualOpportunity(state,ritual,date)));
  return { completed, partial: countStatus("partial"), missed: countStatus("missed"), unknown: countStatus("unknown"), scheduled: elapsed.length, logged, weeklyMet: targets.filter((ritual) => flexible(ritual) ? weeklyDays(state, ritual, week[0]) >= ritual.timesPerWeek! : weeklyValue(state, ritual, week[0]) >= ritual.goal).length, weeklyTargets: targets.length };
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
    case 'ritual/lifecycle': {
      const ritual=state.rituals.find(r=>r.id===action.id);if(!ritual||!validDate(action.today))return state;
      if(action.operation==='delete')return {...state,rituals:state.rituals.filter(r=>r.id!==action.id),entries:state.entries.filter(e=>e.ritualId!==action.id)};
      const status=action.operation==='pause'?'paused':action.operation==='archive'?'archived':'active';
      if((ritual.status??'active')===status)return state;
      const periods=(ritual.inactivePeriods??[]).filter(p=>p.end||p.start!==action.today).map(p=>p.end?p:{...p,end:action.today});
      if(status!=='active')periods.push({start:action.today,end:null,kind:status});
      return {...state,rituals:state.rituals.map(r=>r.id===action.id?{...r,status,inactivePeriods:periods}:r)};
    }
    case "ritual/move": {
      const ritual = state.rituals.find((entry) => entry.id === action.id);
      if (!ritual || !state.groups.some((group) => group.id === action.groupId) || action.before === action.id) return state;
      const moved = ritual.groupId === action.groupId ? ritual : { ...ritual, groupId: action.groupId }, rest = state.rituals.filter((entry) => entry.id !== action.id);
      const anchor = action.before ? rest.findIndex((entry) => entry.id === action.before && entry.groupId === action.groupId) : -1;
      const lastInGroup = rest.reduce((at, entry, index) => entry.groupId === action.groupId ? index : at, -1);
      const at = anchor >= 0 ? anchor : lastInGroup >= 0 ? lastInGroup + 1 : rest.length;
      const rituals = [...rest.slice(0, at), moved, ...rest.slice(at)];
      return rituals.every((entry, index) => entry === state.rituals[index]) ? state : { ...state, rituals };
    }
    case "ritual/connect": {
      const ritual = state.rituals.find((entry) => entry.id === action.id);
      if (!state.connectionsEnabled || !ritual || !validDate(action.today) || (action.connection && !validConnection(ritual, action.connection))) return state;
      // Store exactly the values that were shown while connected, so ending or changing a connection keeps history.
      let entries = state.entries;
      for (const item of action.materialize) {
        if (!validDate(item.date) || item.date > action.today || !isScheduled(ritual, item.date) || !(item.value > 0 && item.value <= 1000000)) continue;
        if ((ritual.type === "checkbox" && item.value !== 1) || (ritual.type === "weekly-target" && !Number.isInteger(item.value))) continue;
        entries = [...entries.filter((entry) => entry.ritualId !== ritual.id || entry.date !== item.date), { id: `${ritual.id}/${item.date}`, ritualId: ritual.id, date: item.date, value: item.value, updatedAt: action.now }];
      }
      return { ...state, entries, rituals: state.rituals.map((entry) => entry.id === ritual.id ? { ...entry, connection: action.connection } : entry) };
    }
    case "entry/cycle": {const current=entryFor(state,action.ritualId,action.date);return ritualReducer(state,{...action,type:"entry/set",value:current?.value===1?0:current?.value===0?null:1});}
    case "ritual/save": {
      const ritual = action.ritual;
      if (!ritual.name.trim() || !validDate(ritual.startDate) || !Number.isFinite(ritual.goal) || ritual.goal <= 0 || !validRecurrence(ritual.recurrence) || !state.groups.some((group) => group.id === ritual.groupId)) return state;
      if (ritual.type === "weekly-target" && !Number.isInteger(ritual.goal)) return state;
      if (ritual.type === "category" && !validCategories(ritual.categories)) return state;
      if (ritual.timesPerWeek != null && (!Number.isInteger(ritual.timesPerWeek) || ritual.timesPerWeek < 1 || ritual.timesPerWeek > 7 || ritual.recurrence.kind !== "daily" || ritual.type === "weekly-target" || ritual.type === "category")) return state;
      const previous = state.rituals.find((entry) => entry.id === ritual.id);
      // Protect the meaning of history until effective-dated schedule/goal changes exist.
      const locked = previous && state.entries.some((entry) => entry.ritualId === ritual.id);
      const lifecycle=previous?{...(previous.status?{status:previous.status}:{}),...(previous.inactivePeriods?{inactivePeriods:previous.inactivePeriods}:{})}:{};
      const connection = previous ? previous.connection : ritual.connection && validConnection(ritual, ritual.connection) ? ritual.connection : null;
      const unlocked = { ...ritual,...lifecycle, name: ritual.name.trim(), goal: ritual.type === "checkbox" ? 1 : ritual.goal };
      // A categorical legend stays editable after history exists (rename, recolor, add), but a used category is kept.
      if (previous?.type === "category" && ritual.categories) { const keep = usedCategories(state, ritual.id); if (![...keep].every((id) => ritual.categories!.some((c) => c.id === id))) return state; }
      const legend = previous?.type === "category" && validCategories(ritual.categories) ? { categories: ritual.categories.map((c) => ({ ...c, label: c.label.trim() })) } : {};
      const emoji = ritual.emoji?.trim() ? ritual.emoji.trim().slice(0, 16) : null;
      const next = locked ? { ...previous, name: ritual.name.trim(), groupId: ritual.groupId, emoji, ...legend } : { ...unlocked, emoji, ...(ritual.type === "category" ? { categories: ritual.categories!.map((c) => ({ ...c, label: c.label.trim() })), connection: null } : { categories: undefined }), connection: ritual.type === "category" ? null : connection && validConnection(unlocked, connection) ? connection : null };
      return { ...state, rituals: previous ? state.rituals.map((entry) => entry.id === ritual.id ? next : entry) : [...state.rituals, next] };
    }
    case "group/save": return !action.group.name.trim() || !validAccent(action.group.accent) || (action.group.gradient && typeof action.group.gradient !== "string" && !validGradient(action.group.gradient)) ? state : { ...state, groups: state.groups.some((group) => group.id === action.group.id) ? state.groups.map((group) => group.id === action.group.id ? { ...action.group, name: action.group.name.trim() } : group) : [...state.groups, { ...action.group, name: action.group.name.trim() }] };
    case "group/toggle": return { ...state, groups: state.groups.map((group) => group.id === action.id ? { ...group, collapsed: !group.collapsed } : group) };
    case "group/delete": return state.groups.length <= 1 || state.rituals.some((ritual) => ritual.groupId === action.id) ? state : { ...state, groups: state.groups.filter((group) => group.id !== action.id) };
    case "entry/category": {
      const ritual = state.rituals.find((entry) => entry.id === action.ritualId);
      if (!ritual || ritual.type !== "category" || (action.category !== null && !ritual.categories?.some((c) => c.id === action.category))) return state;
      const set = ritualReducer(state, { type: "entry/set", ritualId: action.ritualId, date: action.date, value: action.category === null ? null : 1, today: action.today, now: action.now });
      if (set === state || action.category === null) return set;
      return { ...set, entries: set.entries.map((e) => e.ritualId === ritual.id && e.date === action.date ? { ...e, category: action.category! } : e) };
    }
    case "entry/set": {
      const ritual = state.rituals.find((entry) => entry.id === action.ritualId);
      if (!ritual || !validDate(action.date) || !validDate(action.today) || action.date > action.today || !ritualOpportunity(state,ritual,action.date)) return state;
      if (ritual.connection && action.date >= ritual.connection.since) return state; // Connected values are read-only; edit the source record.
      if (action.value !== null && (!Number.isFinite(action.value) || action.value < 0 || ((ritual.type === "checkbox" || ritual.type === "category") && ![0, 1].includes(action.value)) || (ritual.type === "weekly-target" && !Number.isInteger(action.value)))) return state;
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
  const scheduled=state.rituals.filter((ritual)=>ritual.type!=="weekly-target"&&ritualOpportunity(state,ritual,date));
  const completed=scheduled.filter((ritual)=>ritualCell(state,ritual,date,today).status==="complete").length;
  const future=!today||date>today;
  return {total:scheduled.length,completed,fraction:future||!scheduled.length?null:completed/scheduled.length,perfect:!future&&scheduled.length>0&&completed===scheduled.length};
}
