"use client";
import { useEffect, useRef, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { clearStepDay, readGoal, readStepDay, saveGoal, saveStepDay, stepsUnavailable } from "@/lib/steps-store";
import { DEFAULT_STEP_GOAL, formatSteps, goalMet, parseGoal, parseSteps, stepProgress, stepsLeft, type StepDay } from "@/lib/steps";
import { useDailyData } from "../daily/DailyData";
import { MuseIcon } from "../MuseIcon";
import "./Steps.css";

type Client = ReturnType<typeof createMuseBrowserClient>;
let shared: Client | null = null;
const client = () => shared ??= createMuseBrowserClient();

/**
 * The Steps half of Movement (#130): type today's count, see it against the daily goal. Manual only, and separate from
 * planned movement and completed activity. Keyed by date by its parent, so each day starts from its own saved value.
 */
export function StepsArea({ date }: { date: string }) {
  const { profile } = useDailyData();
  const [day, setDay] = useState<StepDay | null>(null), [goal, setGoal] = useState(DEFAULT_STEP_GOAL), [phase, setPhase] = useState<"loading" | "ready" | "unavailable">("loading");
  const [draft, setDraft] = useState(""), [goalDraft, setGoalDraft] = useState<string | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { let live = true;
    Promise.all([readStepDay(client(), date), readGoal(client())])
      .then(([saved, g]) => { if (!live) return; setDay(saved); setGoal(g); setDraft(saved ? String(saved.steps) : ""); setPhase("ready"); })
      .catch((e) => { if (live) { if (stepsUnavailable(e)) setPhase("unavailable"); else { setPhase("ready"); setError("Steps couldn’t load. Try again in a moment."); } } });
    return () => { live = false; }; }, [date]);

  const parsed = draft.trim() === "" ? null : parseSteps(draft);
  const problem = parsed && !parsed.ok ? parsed.reason : "";
  const dirty = parsed?.ok ? parsed.value !== day?.steps : false;
  async function save() {
    if (!parsed?.ok || busy) return; setBusy(true); setError(""); setStatus("");
    try { const saved = await saveStepDay(client(), { date, steps: parsed.value, goal, timeZone: profile.timeZone }, day); setDay(saved); setDraft(String(saved.steps)); setStatus("Saved"); }
    catch (e) { setError(e instanceof Error ? e.message : "That didn’t save. Your number is still here."); }
    setBusy(false);
  }
  async function clear() {
    if (!day || busy) return; setBusy(true); setError(""); setStatus("");
    try { await clearStepDay(client(), date); setDay(null); setDraft(""); setStatus("Cleared"); input.current?.focus(); }
    catch (e) { setError(e instanceof Error ? e.message : "That couldn’t be cleared."); }
    setBusy(false);
  }
  const goalParsed = goalDraft === null ? null : parseGoal(goalDraft);
  async function commitGoal() {
    if (!goalParsed?.ok) return; setBusy(true); setError("");
    try { await saveGoal(client(), goalParsed.value); setGoal(goalParsed.value); setGoalDraft(null); }
    catch (e) { setError(e instanceof Error ? e.message : "The goal didn’t save."); }
    setBusy(false);
  }

  if (phase === "unavailable") return <section className="muse-steps" aria-label="Steps"><p className="small-label">Steps aren’t available on this server yet.</p></section>;
  const shown = day ?? (parsed?.ok ? { date, steps: parsed.value, goal } : null);
  const pct = shown ? stepProgress(shown.steps, day?.goal ?? goal) : 0, met = !!day && goalMet(day);
  const target = day?.goal ?? goal;
  return <section className="muse-steps" aria-label="Steps" data-met={met || undefined}>
    <div className="muse-steps-head">
      <span className="movement-row-label">Steps</span>
      {goalDraft === null
        ? <button type="button" className="text-button muse-steps-goal-button" disabled={phase !== "ready"} onClick={() => setGoalDraft(String(goal))}>{day && day.goal !== goal ? `Goal ${formatSteps(goal)} for new days` : `Goal ${formatSteps(goal)}`}<MuseIcon name="edit" size={12} /></button>
        : <form className="muse-steps-goal-form" onSubmit={(e) => { e.preventDefault(); void commitGoal(); }}>
            <label className="sr-only" htmlFor={`steps-goal-${date}`}>Daily step goal</label>
            <input id={`steps-goal-${date}`} inputMode="numeric" autoFocus value={goalDraft} aria-invalid={goalParsed ? !goalParsed.ok : undefined} onChange={(e) => setGoalDraft(e.target.value)} />
            <button type="submit" className="muse-button" disabled={!goalParsed?.ok || busy}>Set goal</button>
            <button type="button" className="text-button" onClick={() => setGoalDraft(null)}>Cancel</button>
          </form>}
    </div>
    {goalParsed && !goalParsed.ok && <p className="muse-steps-error" role="alert">{goalParsed.reason}</p>}
    <div className="muse-steps-count" aria-live="polite">
      <strong>{day ? formatSteps(day.steps) : "—"}</strong><span>{day ? `of ${formatSteps(target)}` : `Goal ${formatSteps(goal)}`}</span>
      {day && <b className="muse-steps-note">{met ? "Goal reached" : `${formatSteps(stepsLeft(day.steps, target))} to go`}</b>}
    </div>
    <div className="muse-steps-bar" role="progressbar" aria-label="Steps toward today’s goal" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(day?.steps ?? 0, target)} aria-valuetext={day ? `${formatSteps(day.steps)} of ${formatSteps(target)} steps` : "No steps recorded"}><span style={{ width: `${Math.round(pct * 100)}%` }} /></div>
    <form className="muse-steps-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <label className="sr-only" htmlFor={`steps-${date}`}>Steps for this day</label>
      <input id={`steps-${date}`} ref={input} inputMode="numeric" autoComplete="off" placeholder="Enter your steps" value={draft} disabled={phase !== "ready"} aria-invalid={!!problem} aria-describedby={problem ? `steps-err-${date}` : undefined} onChange={(e) => { setDraft(e.target.value); setStatus(""); }} />
      <button type="submit" className="muse-button" disabled={!dirty || busy}>{day ? "Update" : "Save"}</button>
      {day && <button type="button" className="text-button" disabled={busy} onClick={() => void clear()}>Clear</button>}
    </form>
    {(problem || error) && <p className="muse-steps-error" id={`steps-err-${date}`} role="alert">{problem || error}</p>}
    <p className="sr-only" role="status">{status}</p>
  </section>;
}
