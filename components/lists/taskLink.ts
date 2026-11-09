"use client";
/**
 * Lists ↔ Planner task links (#110). While an item is linked, the Planner is the one source of truth for completion:
 * one-off items follow the task's checkbox; scheduled items follow the task's occurrence for that period's date, so
 * completing one week never completes another. Lists keeps a history COPY of what the Planner recorded (source
 * "task"), so unlinking — or the task being deleted in Planner — never loses history. While linked, the schedule is
 * edited in one place only (the list item's schedule is locked; reschedules and skips go to the Planner occurrence).
 */
import { occurrenceId } from "@/lib/planner-occurrences";
import type { PlannerAction, PlannerState } from "@/lib/planner";
import type { PlannedTask } from "@/lib/models";
import type { ListItem } from "@/lib/lists/model";
import { periodFor, type ListEvent } from "@/lib/lists/schedule";

export const linkedTask = (item: ListItem, planner: PlannerState): PlannedTask | null =>
  item.linkKind === "task" && item.linkId ? planner.tasks.find((t) => t.id === item.linkId) ?? null : null;

/** What the Planner recorded for a linked scheduled item, as list events (one per period and kind). */
export function plannerEvents(item: ListItem, planner: PlannerState): Omit<ListEvent, "id" | "recordedAt">[] {
  if (!item.schedule || !item.linkId) return [];
  const out: Omit<ListEvent, "id" | "recordedAt">[] = [];
  for (const o of planner.occurrences ?? []) {
    if (o.taskId !== item.linkId) continue;
    const p = periodFor(item.schedule, o.date); if (!p || p.start !== o.date) continue;
    if (o.status === "completed") out.push({ itemId: item.id, listId: item.listId, kind: "completed", periodStart: p.start, periodEnd: p.end, occurredOn: o.completedOn ?? o.date, source: "task" });
    else if (o.status === "skipped") out.push({ itemId: item.id, listId: item.listId, kind: "skipped", periodStart: p.start, periodEnd: p.end, source: "task" });
    else if (o.status === "moved" && o.movedTo) out.push({ itemId: item.id, listId: item.listId, kind: "rescheduled", periodStart: p.start, periodEnd: p.end, movedTo: o.movedTo, source: "task" });
  }
  return out;
}

/** Events to show for an item: while the task exists, the Planner's record wins; otherwise the saved copies. */
export function effectiveEvents(item: ListItem, listEvents: ListEvent[], planner: PlannerState): ListEvent[] {
  const own = listEvents.filter((e) => e.itemId === item.id);
  if (!linkedTask(item, planner) || !item.schedule) return own;
  const live = plannerEvents(item, planner).map((e) => ({ ...e, id: `task:${e.periodStart}:${e.kind}`, recordedAt: "" }));
  const key = (e: { periodStart: string; kind: string }) => `${e.periodStart}|${e.kind}`;
  const liveKeys = new Set(live.map(key)), settled = new Set(live.filter((e) => e.kind !== "rescheduled").map((e) => e.periodStart));
  // Keep list-side history from before linking; drop stale copies the Planner no longer has, and any list-side
  // outcome for a period the Planner has since settled (one outcome per period).
  return [...live, ...own.filter((e) => e.source === "list" && !liveKeys.has(key(e)) && !(e.kind !== "rescheduled" && settled.has(e.periodStart)))];
}

/** A Planner task for this item. Scheduled items become a recurring task whose occurrences are the period starts. */
export function taskFor(item: ListItem, workspaceId: string, today: string): PlannedTask {
  const p = item.schedule ? periodFor(item.schedule, today) : null;
  return { id: crypto.randomUUID(), kind: "task", title: item.title.slice(0, 160), complete: false, workspaceId, tagIds: [], actualMinutes: 0, subtasks: [], createdAt: new Date().toISOString(),
    notes: item.notes ?? undefined, plannedDate: item.schedule ? item.schedule.anchor : item.dueDate ?? p?.start ?? today };
}

/** Create the linked task the way the Planner does: add it, then (for a scheduled item) set its series rule. */
export function addLinkedTask(item: ListItem, workspaceId: string, today: string, dispatch: PlannerDispatch) {
  const task = taskFor(item, workspaceId, today);
  dispatch({ type: "task/add", task });
  if (item.schedule) dispatch({ type: "recurrence", change: { op: "task/rule", taskId: task.id, rule: item.schedule.rule }, now: new Date().toISOString(), today });
  return task.id;
}

export type PlannerDispatch = (action: PlannerAction) => void;
/** Check/uncheck through the Planner (occurrence-specific for scheduled items). */
export function toggleViaPlanner(item: ListItem, dispatch: PlannerDispatch, today: string) {
  const now = new Date().toISOString();
  if (!item.linkId) return;
  if (!item.schedule) return dispatch({ type: "task/toggle", id: item.linkId, now });
  const p = periodFor(item.schedule, today); if (!p) return;
  dispatch({ type: "task/toggle", id: occurrenceId(item.linkId, p.start), now });
}
export function skipViaPlanner(item: ListItem, dispatch: PlannerDispatch, today: string, skip: boolean) {
  if (!item.linkId || !item.schedule) return; const p = periodFor(item.schedule, today); if (!p) return;
  dispatch({ type: "recurrence", change: { op: "occurrence/skip", taskId: item.linkId, date: p.start, skip }, now: new Date().toISOString(), today });
}
export function moveViaPlanner(item: ListItem, dispatch: PlannerDispatch, today: string, to: string | null) {
  if (!item.linkId || !item.schedule) return; const p = periodFor(item.schedule, today); if (!p) return;
  dispatch({ type: "recurrence", change: { op: "occurrence/move", taskId: item.linkId, date: p.start, to }, now: new Date().toISOString(), today });
}
