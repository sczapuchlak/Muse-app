import { dailyEditSample } from "./daily-edit-data";
import { createTask, type PlannerState } from "./planner";

const createdAt = "2026-10-28T16:00:00-07:00";
export const plannerSample: PlannerState = {
  workspaces: [{ id: "work", name: "Work", accent: "primary" }, { id: "personal", name: "Personal", accent: "secondary" }],
  groups: [{ id: "launch", name: "Launch", workspaceId: "work" }, { id: "home", name: "Home", workspaceId: "personal" }],
  tags: [{ id: "deep-work", name: "DeepWork", accent: "primary" }, { id: "quick", name: "Quick", accent: "secondary" }, { id: "errand", name: "Errand", accent: "pop" }],
  tasks: [
    { ...createTask("Pick up fresh flowers", "personal", "flowers", createdAt, "2026-10-29"), groupId: "home", tagIds: ["errand"], notes: "On the way home", estimatedMinutes: 15 },
    { ...createTask("Read a chapter", "personal", "read", createdAt, "2026-10-29"), groupId: "home", estimatedMinutes: 30, timeSlot: "20:00" },
    { ...createTask("Polish the launch story", "work", "launch-story", createdAt, "2026-10-30"), groupId: "launch", tagIds: ["deep-work"], dueDate: "2026-11-02", estimatedMinutes: 60, subtasks: [{ id: "story-intro", title: "Refine the opening", complete: false }] },
    { ...createTask("Book a little weekend escape", "personal", "weekend", createdAt, "2026-10-31"), estimatedMinutes: 20 },
    { ...createTask("Send November availability", "work", "availability", createdAt), tagIds: ["quick"], dueDate: "2026-11-03", estimatedMinutes: 10 },
    { ...createTask("Find a frame for the new print", "personal", "frame", createdAt), groupId: "home", tagIds: ["errand"] },
  ],
  events: dailyEditSample.schedule.filter((item) => item.kind === "event"),
  activeTimer: null,
};
