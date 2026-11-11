/** Steps persistence (#130): owner-only rows read and written straight to their own tables. Nothing else is touched. */
import type { createMuseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_STEP_GOAL, MAX_STEPS, MIN_GOAL, type StepDay } from "./steps";

type Client = ReturnType<typeof createMuseBrowserClient>;
/** Postgres "table missing" codes: this server hasn't had the steps migration yet. */
export const stepsUnavailable = (e: unknown) => ["PGRST205", "42P01"].includes((e as { code?: string })?.code ?? "");
const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const toDay = (r: { local_date: string; steps: number; goal: number }): StepDay => ({ date: r.local_date, steps: r.steps, goal: r.goal });

export async function readGoal(client: Client): Promise<number> {
  const { data, error } = await client.from("step_settings").select("goal").maybeSingle();
  if (error) throw error;
  return data?.goal ?? DEFAULT_STEP_GOAL;
}
export async function saveGoal(client: Client, goal: number) {
  if (!Number.isInteger(goal) || goal < MIN_GOAL || goal > MAX_STEPS) throw RangeError("Choose a goal between 100 and 200,000 steps.");
  const { error } = await client.from("step_settings").upsert({ goal }, { onConflict: "user_id" });
  if (error) throw error;
}
export async function readStepDay(client: Client, date: string): Promise<StepDay | null> {
  if (!isDate(date)) throw RangeError("Choose a valid date.");
  const { data, error } = await client.from("step_days").select("local_date,steps,goal").eq("local_date", date).maybeSingle();
  if (error) throw error;
  return data ? toDay(data) : null;
}
export async function readStepRange(client: Client, start: string, end: string): Promise<StepDay[]> {
  if (!isDate(start) || !isDate(end) || end < start) return [];
  const { data, error } = await client.from("step_days").select("local_date,steps,goal").gte("local_date", start).lte("local_date", end).order("local_date").limit(4000);
  if (error) throw error;
  return data.map(toDay);
}
/** Saves (or replaces) one day. The goal is snapshotted the first time a day is recorded and kept when only the count changes. */
export async function saveStepDay(client: Client, input: { date: string; steps: number; goal: number; timeZone: string }, existing: StepDay | null): Promise<StepDay> {
  if (!isDate(input.date)) throw RangeError("Choose a valid date.");
  if (!Number.isInteger(input.steps) || input.steps < 0 || input.steps > MAX_STEPS) throw RangeError("Enter a step count between 0 and 200,000.");
  const goal = existing?.goal ?? input.goal;
  const { data, error } = await client.from("step_days").upsert({ local_date: input.date, steps: input.steps, goal, captured_time_zone: input.timeZone || "UTC" }, { onConflict: "user_id,local_date" }).select("local_date,steps,goal").single();
  if (error) throw error;
  return toDay(data);
}
export async function clearStepDay(client: Client, date: string) {
  if (!isDate(date)) throw RangeError("Choose a valid date.");
  const { error } = await client.from("step_days").delete().eq("local_date", date);
  if (error) throw error;
}
