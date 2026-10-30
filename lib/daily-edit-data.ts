import { nourishSeedAssignments } from "./nourish-sample";
import type { WaterSettings } from "./water";
import type { DailyMovement, DayEvent, MoodCheckIn, PlannedTask } from "./models";

// Sample data for the UI. Replace this module with the daily data source later.
// The date, agenda, and meals intentionally describe the same sample day.
export type Priority = { id: string; title: string; complete: boolean };
export type ScheduleItem = PlannedTask | DayEvent;

export const dailyEditSample = {
  date: { iso: "2026-10-29", label: "Thursday, October 29" },
  greeting: "Make room for a little magic.",
  intention: "A focused morning, an unhurried evening.",
  priorities: [
    { id: "project", title: "Finish my project", complete: true },
    { id: "movement", title: "Get some movement in", complete: false },
    { id: "lovely", title: "Plan something lovely", complete: false },
  ] satisfies Priority[],
  movement: { date: "2026-10-29", typeIds: ["movement-yoga"] } satisfies DailyMovement,
  water: {
    date: "2026-10-29",
    total: 72,
    settings: { goal: 100, unit: "oz", quickAdds: [12, 24, 32, 40] } satisfies WaterSettings,
  },
  schedule: [
    { id: "focus", kind: "event", date: "2026-10-29", time: "9:00 AM", dateTime: "2026-10-29T09:00", title: "Project focus time", detail: "Design review & final edits" },
    { id: "lunch", kind: "event", date: "2026-10-29", time: "12:30 PM", dateTime: "2026-10-29T12:30", title: "Lunch with Sophie", detail: "The corner café" },
  ] satisfies ScheduleItem[],
  meals: nourishSeedAssignments.filter((meal) => meal.date === "2026-10-29"),
  mood: {
    id: "mood-2026-10-29",
    occurredAt: "2026-10-29T18:00:00-07:00",
    emotionIds: ["emotion-calm", "emotion-hopeful"],
    causeTagIds: [],
  } satisfies MoodCheckIn,
};
