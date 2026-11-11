/**
 * Manual steps (#130): a typed daily count and a daily goal. Pure rules only. A day's goal is the goal in effect when
 * it was recorded, so changing the goal later never rewrites an earlier day. Steps are separate from planned movement
 * and completed activity. `source` is always "manual"; a device connection would add its own provenance later.
 */
export const MAX_STEPS = 200000;
export const MIN_GOAL = 100;
export const DEFAULT_STEP_GOAL = 8000;
export type StepDay = { date: string; steps: number; goal: number };

export type Parsed = { ok: true; value: number } | { ok: false; reason: string };
/** "8,432", "8432 " and "8 432" are all fine; fractions, negatives and text are not. */
function whole(raw: string, min: number, max: number, what: string): Parsed {
  const text = raw.replace(/[\s,]/g, "");
  if (!text) return { ok: false, reason: `Enter ${what}.` };
  if (!/^\d+$/.test(text)) return { ok: false, reason: "Use whole numbers only." };
  const value = Number(text);
  if (value < min) return { ok: false, reason: `Use ${min.toLocaleString("en-US")} or more.` };
  if (value > max) return { ok: false, reason: `That’s more than ${max.toLocaleString("en-US")}. Check the number.` };
  return { ok: true, value };
}
export const parseSteps = (raw: string) => whole(raw, 0, MAX_STEPS, "a step count");
export const parseGoal = (raw: string) => whole(raw, MIN_GOAL, MAX_STEPS, "a daily goal");

export const formatSteps = (n: number) => n.toLocaleString("en-US");
/** 0–1 for a progress bar; a day over goal is full, never beyond. */
export const stepProgress = (steps: number, goal: number) => goal > 0 ? Math.min(1, Math.max(0, steps / goal)) : 0;
export const goalMet = (day: Pick<StepDay, "steps" | "goal">) => day.steps >= day.goal;
export const stepsLeft = (steps: number, goal: number) => Math.max(0, goal - steps);

/** Honest range summary: only days with a recorded count. A missing day is not zero. */
export function summarizeSteps(days: readonly StepDay[]) {
  const recorded = days.filter((d) => Number.isInteger(d.steps) && d.steps >= 0);
  const total = recorded.reduce((sum, d) => sum + d.steps, 0), best = recorded.reduce<StepDay | null>((top, d) => !top || d.steps > top.steps ? d : top, null);
  return { days: recorded.length, total, average: recorded.length ? Math.round(total / recorded.length) : null, goalDays: recorded.filter(goalMet).length, best: best ? { date: best.date, steps: best.steps } : null };
}
