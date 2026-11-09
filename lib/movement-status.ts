/**
 * Planned vs completed movement (#112). One status per movement per day, derived from the existing owners:
 * - Completed: a movement record exists (the only thing that counts toward completed movement metrics).
 * - Skipped / Rest / Sick: the day's outcome for a planned movement.
 * - Planned: planned that day with neither. Unresolved plans stay Planned; nothing is inferred.
 */
import type { DailyMovement, MovementOutcome } from "./models";

export const movementStatuses = [
  { id: "planned", label: "Planned" },
  { id: "completed", label: "Completed" },
  { id: "skipped", label: "Skipped" },
  { id: "rest", label: "Rest / Recovery" },
  { id: "sick", label: "Sick / Injured" },
] as const;
export type MovementStatus = typeof movementStatuses[number]["id"];
const outcomes: MovementOutcome[] = ["skipped", "rest", "sick"];
export const isMovementOutcome = (value: unknown): value is MovementOutcome => outcomes.includes(value as MovementOutcome);

type Recorded = { date: string; typeId: string };
export function movementStatus(day: DailyMovement | undefined, records: Recorded[], typeId: string): MovementStatus {
  if (records.some((r) => r.date === (day?.date ?? r.date) && r.typeId === typeId)) return "completed";
  const outcome = day?.typeIds.includes(typeId) ? day.outcomes?.[typeId] : undefined;
  return outcome ?? "planned";
}
/** The day's rows: planned movements first (in plan order), then anything recorded without a plan. */
export function movementRows(day: DailyMovement, records: Recorded[]) {
  const onDay = records.filter((r) => r.date === day.date);
  const ids = [...new Set([...day.typeIds, ...onDay.map((r) => r.typeId)])];
  return ids.map((typeId) => ({ typeId, planned: day.typeIds.includes(typeId), status: movementStatus(day, onDay, typeId) }));
}
/** Outcomes only for movements still planned that day; a removed plan drops its outcome. */
export function prunedOutcomes(day: DailyMovement): Record<string, MovementOutcome> {
  return Object.fromEntries(Object.entries(day.outcomes ?? {}).filter(([id, value]) => day.typeIds.includes(id) && isMovementOutcome(value)));
}
