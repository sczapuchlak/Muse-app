/** Task card density (#104 §8): Compact by default, Spacious optional. One preference for every planner task view. */
import { useSyncExternalStore } from "react";
export const taskDensities = ["compact", "spacious"] as const;
export type TaskDensity = typeof taskDensities[number];
export const TASK_DENSITY_KEY = "muse.planner.taskDensity";
const changeEvent = "muse-task-density-change";
let session: TaskDensity | null = null;
export const parseTaskDensity = (v: unknown): TaskDensity => v === "spacious" ? "spacious" : "compact";
export function readTaskDensity(): TaskDensity { if (session) return session; try { return parseTaskDensity(window.localStorage.getItem(TASK_DENSITY_KEY)); } catch { return "compact"; } }
export function selectTaskDensity(d: TaskDensity) { session = d; try { window.localStorage.setItem(TASK_DENSITY_KEY, d); } catch { /* in memory */ } window.dispatchEvent(new Event(changeEvent)); }
function subscribe(update: () => void) {
  const storage = (e: StorageEvent) => { if (e.key === TASK_DENSITY_KEY || e.key === null) { session = null; update(); } };
  window.addEventListener("storage", storage); window.addEventListener(changeEvent, update);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(changeEvent, update); };
}
export const useTaskDensity = () => useSyncExternalStore(subscribe, readTaskDensity, () => "compact" as TaskDensity);
