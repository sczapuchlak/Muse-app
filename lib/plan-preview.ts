import type { DayEvent, PlannedTask } from "./models";
import { eventOnDay } from "./agenda";

export const PLAN_PREVIEW_LIMITS = { events: 3, tasks: 5 } as const;

export function planPreview(items: (DayEvent | PlannedTask)[], selectedDate: string, limits: { events: number; tasks: number } = PLAN_PREVIEW_LIMITS, priorityTaskIds: ReadonlySet<string> = new Set()) {
  // Multi-day events show on every day they cover (one record); all-day ones first, then by start time.
  const events = items.filter((item): item is DayEvent => item.kind === "event" && eventOnDay(item, selectedDate))
    .sort((a, b) => Number(!a.allDay) - Number(!b.allDay) || a.dateTime.localeCompare(b.dateTime));
  const tasks = items.filter((item): item is PlannedTask => item.kind === "task" && item.plannedDate === selectedDate && !priorityTaskIds.has(item.id));
  return {
    events, tasks, total: events.length + tasks.length,
    visibleEvents: events.slice(0, limits.events), visibleTasks: tasks.slice(0, limits.tasks),
    hiddenEvents: Math.max(0, events.length - limits.events), hiddenTasks: Math.max(0, tasks.length - limits.tasks),
  };
}
