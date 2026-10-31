import {validAccent,type AccentColor} from "./appearance-values";
import { validDate } from "./dates";
export { validDate } from "./dates";
import type {MuseIconName} from "@/components/MuseIcon";
import type { DayEvent, PlannedTask } from "./models";

export const plannerAccentIds = ["primary", "secondary", "pop"] as const;
export type PlannerAccent = AccentColor;
export type Workspace = { id: string; name: string; accent: PlannerAccent; icon?:MuseIconName };
export type TaskGroup = { id: string; name: string; workspaceId: string; accent?:AccentColor; icon?:MuseIconName };
export type TaskTag = { id: string; name: string; accent: PlannerAccent; icon?:MuseIconName };
export type TaskCompletion={id:string;taskId:string;complete:boolean;occurredAt:string;localDate:string;timeZone:string;title:string;workspaceId:string;plannedDate?:string};
export type PlannerState = {
  completionHistory?:TaskCompletion[];
  tasks: PlannedTask[]; events: DayEvent[]; workspaces: Workspace[]; groups: TaskGroup[]; tags: TaskTag[];
  activeTimer: { taskId: string; startedAt: string } | null;
};
export type TaskPatch = Partial<Omit<PlannedTask, "id" | "kind" | "createdAt">>;
export type PlannerAction =
  | { type: "task/add"; task: PlannedTask }
  | { type: "task/update"; id: string; patch: TaskPatch }
  | { type: "task/move"; id: string; date: string | undefined }
  | { type: "task/place"; id: string; date: string | undefined; beforeId?: string }
  | { type: "task/toggle"; id: string; now: string }
  | { type: "task/delete"; id: string; now: string }
  | { type: "event/add"; event: DayEvent }
  | { type: "workspace/save"; workspace: Workspace }
  | { type: "workspace/delete"; id: string }
  | { type: "group/save"; group: TaskGroup }
  | { type: "group/delete"; id: string }
  | { type: "tag/save"; tag: TaskTag }
  | { type: "tag/delete"; id: string }
  | { type: "timer/start"; id: string; now: string }
  | { type: "timer/pause"; now: string };

export function createTask(title: string, workspaceId: string, id: string, createdAt: string, plannedDate?: string): PlannedTask {
  return { id, kind: "task", title: title.trim(), workspaceId, tagIds: [], plannedDate, complete: false, actualMinutes: 0, subtasks: [], createdAt };
}
export function plannedTasks(state: PlannerState, date?: string) { return state.tasks.filter((task) => task.plannedDate === date); }
export function runningMinutes(state: PlannerState, id: string, now: string): number {
  if (state.activeTimer?.taskId !== id) return 0;
  return Math.max(0, (Date.parse(now) - Date.parse(state.activeTimer.startedAt)) / 60000) || 0;
}
function pause(state: PlannerState, now: string): PlannerState {
  if (!state.activeTimer) return state;
  const { taskId } = state.activeTimer;
  return { ...state, activeTimer: null, tasks: state.tasks.map((task) => task.id === taskId ? { ...task, actualMinutes: task.actualMinutes + runningMinutes(state, taskId, now) } : task) };
}
function replace<T extends { id: string }>(items: T[], item: T) { return items.some((entry) => entry.id === item.id) ? items.map((entry) => entry.id === item.id ? item : entry) : [...items, item]; }
function normalizeTask(state: PlannerState, task: PlannedTask): PlannedTask {
  const workspaceId = state.workspaces.some((entry) => entry.id === task.workspaceId) ? task.workspaceId : state.workspaces[0].id;
  return { ...task, workspaceId, groupId: state.groups.some((entry) => entry.id === task.groupId && entry.workspaceId === workspaceId) ? task.groupId : undefined,
    tagIds: [...new Set(task.tagIds.filter((id) => state.tags.some((tag) => tag.id === id)))],
    estimatedMinutes: task.estimatedMinutes === undefined ? undefined : Math.max(0, task.estimatedMinutes), actualMinutes: Math.max(0, task.actualMinutes) };
}
/** One domain reducer for both surfaces. Rescheduling only changes plannedDate. */
export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case "task/add": return !action.task.title.trim() || state.tasks.some((task) => task.id === action.task.id) ? state : { ...state, tasks: [...state.tasks, normalizeTask(state, action.task)] };
    case "task/update": return { ...state, tasks: state.tasks.map((task) => task.id === action.id ? normalizeTask(state, { ...task, ...action.patch, title: action.patch.title?.trim() || task.title }) : task) };
    case "task/move": return action.date !== undefined && !validDate(action.date) ? state : plannerReducer(state, { type: "task/update", id: action.id, patch: { plannedDate: action.date } });
    case "task/place": {
      const task = state.tasks.find((entry) => entry.id === action.id);
      if (!task || action.beforeId === action.id || (action.date !== undefined && !validDate(action.date))) return state;
      const tasks = state.tasks.filter((entry) => entry.id !== action.id);
      const beforeIndex = tasks.findIndex((entry) => entry.id === action.beforeId && entry.plannedDate === action.date);
      const lastIndex = tasks.reduce((found, entry, index) => entry.plannedDate === action.date ? index : found, -1);
      const insertion = beforeIndex >= 0 ? beforeIndex : lastIndex >= 0 ? lastIndex + 1 : tasks.length;
      tasks.splice(insertion, 0, { ...task, plannedDate: action.date });
      return { ...state, tasks };
    }
    case "task/toggle": {
      const next = state.activeTimer?.taskId === action.id ? pause(state, action.now) : state;
      return { ...next, tasks: next.tasks.map((task) => task.id === action.id ? { ...task, complete: !task.complete, completedAt: task.complete ? undefined : action.now } : task) };
    }
    case "task/delete": {
      const next = state.activeTimer?.taskId === action.id ? pause(state, action.now) : state;
      return { ...next, tasks: next.tasks.filter((task) => task.id !== action.id) };
    }
    case "event/add": return state.events.some((event) => event.id === action.event.id) ? state : { ...state, events: [...state.events, action.event] };
    case "workspace/save": return !action.workspace.name.trim() || !validAccent(action.workspace.accent) ? state : { ...state, workspaces: replace(state.workspaces, action.workspace) };
    case "workspace/delete": return state.workspaces.length <= 1 || state.tasks.some((task) => task.workspaceId === action.id) || state.groups.some((group) => group.workspaceId === action.id) ? state : { ...state, workspaces: state.workspaces.filter((entry) => entry.id !== action.id) };
    case "group/save": return !action.group.name.trim() || (action.group.accent && !validAccent(action.group.accent)) || !state.workspaces.some((entry) => entry.id === action.group.workspaceId) ? state : { ...state, groups: replace(state.groups, action.group), tasks: state.tasks.map((task) => task.groupId === action.group.id && task.workspaceId !== action.group.workspaceId ? { ...task, groupId: undefined } : task) };
    case "group/delete": return { ...state, groups: state.groups.filter((entry) => entry.id !== action.id), tasks: state.tasks.map((task) => task.groupId === action.id ? { ...task, groupId: undefined } : task) };
    case "tag/save": return !action.tag.name.trim() || !validAccent(action.tag.accent) ? state : { ...state, tags: replace(state.tags, action.tag) };
    case "tag/delete": return { ...state, tags: state.tags.filter((entry) => entry.id !== action.id), tasks: state.tasks.map((task) => ({ ...task, tagIds: task.tagIds.filter((id) => id !== action.id) })) };
    case "timer/start": {
      if (!state.tasks.some((task) => task.id === action.id && !task.complete) || state.activeTimer?.taskId === action.id) return state;
      return { ...pause(state, action.now), activeTimer: { taskId: action.id, startedAt: action.now } };
    }
    case "timer/pause": return pause(state, action.now);
  }
}

export function formatPlannedMinutes(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60), remainder = rounded % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ""}` : `${remainder}m`;
}

export const PLANNING_WINDOW_DAYS = 3;
export type PlannerFilters = { groupId: string; tagIds: string[]; status: "all" | "open" | "complete";timeboxedOnly?:boolean };
export const emptyPlannerFilters: PlannerFilters = { groupId: "", tagIds: [], status: "all" };
export function filterPlannerTasks(tasks: PlannedTask[], workspaceId: string, filters: PlannerFilters, search: string): PlannedTask[] {
  const query = search.trim().toLocaleLowerCase("en-US");
  return tasks.filter((task) => (!workspaceId || task.workspaceId === workspaceId) && (!filters.groupId || task.groupId === filters.groupId) && filters.tagIds.every((id) => task.tagIds.includes(id)) && (filters.status === "all" || task.complete === (filters.status === "complete")) && (!filters.timeboxedOnly||!!task.timeSlot) && task.title.toLocaleLowerCase("en-US").includes(query));
}
export function placementChanges(state: PlannerState, action: Extract<PlannerAction, { type: "task/place" }>): boolean {
  const next = plannerReducer(state, action);
  return next.tasks.some((task, index) => state.tasks[index]?.id !== task.id || state.tasks[index]?.plannedDate !== task.plannedDate);
}
