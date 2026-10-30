import type { DayEvent, PlannedTask } from "./models";

export const PLAN_PREVIEW_LIMITS = { events: 3, tasks: 5 } as const;

export function planPreview(items: (DayEvent | PlannedTask)[], selectedDate: string, limits: { events: number; tasks: number } = PLAN_PREVIEW_LIMITS) {
  const events = items.filter((item): item is DayEvent => item.kind === "event" && item.date === selectedDate)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const tasks = items.filter((item): item is PlannedTask => item.kind === "task" && item.plannedDate === selectedDate);
  return {
    events, tasks, total: events.length + tasks.length,
    visibleEvents: events.slice(0, limits.events), visibleTasks: tasks.slice(0, limits.tasks),
    hiddenEvents: Math.max(0, events.length - limits.events), hiddenTasks: Math.max(0, tasks.length - limits.tasks),
  };
}
