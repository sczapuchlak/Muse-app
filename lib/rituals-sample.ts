import type { RitualState, RitualEntry } from "./rituals";
const createdAt = "2026-10-19T12:00:00-07:00";
const logged = (ritualId: string, date: string, value: number): RitualEntry => ({ id: `${ritualId}/${date}`, ritualId, date, value, updatedAt: `${date}T18:00:00-07:00` });
/** Illustrative records, not generated analytics. Empty dates have no entry. */
export const ritualsSample: RitualState = {
  groups: [
    { id: "morning", name: "Morning", accent: "primary", icon: "rituals", collapsed: false },
    { id: "movement", name: "Movement", accent: "secondary", icon: "movement", collapsed: false },
    { id: "evening", name: "Evening", accent: "pop", icon: "moon", collapsed: false },
  ],
  rituals: [
    { id: "pause", name: "A moment before the scroll", groupId: "morning", type: "checkbox", goal: 1, unit: "check-in", recurrence: { kind: "weekdays", weekdays: [1, 3, 4] }, startDate: "2026-10-26", createdAt },
    { id: "pages", name: "Read a few pages", groupId: "morning", type: "numeric", goal: 20, unit: "pages", recurrence: { kind: "daily" }, startDate: "2026-10-26", createdAt },
    { id: "stretch", name: "Make space to stretch", groupId: "movement", type: "duration", goal: 15, unit: "min", recurrence: { kind: "weekdays", weekdays: [1, 3, 5] }, startDate: "2026-10-26", createdAt },
    { id: "lift", name: "Lift, at my own pace", groupId: "movement", type: "weekly-target", goal: 4, unit: "times", recurrence: { kind: "daily" }, startDate: "2026-10-19", createdAt },
    { id: "reset", name: "Reset the kitchen", groupId: "evening", type: "checkbox", goal: 1, unit: "check-in", recurrence: { kind: "daily" }, startDate: "2026-10-26", createdAt },
  ],
  entries: [logged("pause", "2026-10-26", 1), logged("pause", "2026-10-28", 1), logged("pages", "2026-10-26", 20), logged("pages", "2026-10-27", 12), logged("pages", "2026-10-28", 22), logged("stretch", "2026-10-26", 10), logged("stretch", "2026-10-28", 15), logged("lift", "2026-10-19", 1), logged("lift", "2026-10-21", 1), logged("lift", "2026-10-23", 1), logged("lift", "2026-10-24", 1), logged("lift", "2026-10-26", 1), logged("lift", "2026-10-28", 1), logged("reset", "2026-10-26", 1), logged("reset", "2026-10-28", 1)],
  celebratedMilestones: [],
};
