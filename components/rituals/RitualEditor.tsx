"use client";
import { useState, type FormEvent } from "react";
import { ritualTypeLabels, weekdayOptions, type RitualDefinition, type RitualRecurrence, type RitualType } from "@/lib/rituals";
import { MuseDrawer } from "../MuseDrawer";
import { useRituals } from "./RitualStore";
import { useRitualView } from "./ConnectedRituals";
import { useWellness } from "../WellnessStore";
import { compatibleMetrics, connectionUnit, materializeConnection, type ConnectionMetric, type RitualConnection } from "@/lib/ritual-connections";
import { metricInfo } from "@/lib/progress/engine";
import { movementCategories, movementCategoryLabels, type MovementCategory } from "@/lib/progress/movement";

const sourceLabels: Record<ConnectionMetric, string> = { water: "Water", workouts: "Workouts", "workout-minutes": "Workout minutes", "reading-minutes": "Reading time", "reading-pages": "Pages read", "books-finished": "Books finished", "tasks-completed": "Tasks completed" };
const defaultThreshold: Partial<Record<ConnectionMetric, number>> = { water: 64, "workout-minutes": 20, "reading-minutes": 20, "reading-pages": 10 };
const sameConnection = (a?: RitualConnection | null, b?: RitualConnection | null) => JSON.stringify(a ? { ...a, since: "" } : null) === JSON.stringify(b ? { ...b, since: "" } : null);

export function RitualEditor({ initial, date, returnFocus, onClose }: { initial?: RitualDefinition; date: string; returnFocus: HTMLElement; onClose: () => void }) {
  const { state, dispatch, status } = useRituals();
  const view = useRitualView(), wellness = useWellness();
  const [mode, setMode] = useState<"manual" | "connected">(initial?.connection ? "connected" : "manual");
  const [metric, setMetric] = useState<ConnectionMetric>(initial?.connection?.metric ?? "water");
  const [scope, setScope] = useState<string>(initial?.connection?.typeId ? `type:${initial.connection.typeId}` : initial?.connection?.category ? `category:${initial.connection.category}` : "any");
  const [waterUnit, setWaterUnit] = useState<"oz" | "mL">(initial?.connection?.unit ?? "oz");
  const [threshold, setThreshold] = useState(String(initial?.connection?.threshold ?? defaultThreshold[initial?.connection?.metric ?? "water"] ?? 1));
  const [captureId]=useState(()=>initial?.id??crypto.randomUUID());
  const [name, setName] = useState(initial?.name ?? "");
  const [groupId, setGroup] = useState(initial?.groupId ?? state.groups[0]?.id??"");
  const [type, setType] = useState<RitualType>(initial?.type ?? "checkbox");
  const [goal, setGoal] = useState(String(initial?.goal ?? 1));
  const [unit, setUnit] = useState(initial?.unit ?? "check-in");
  const [kind, setKind] = useState<RitualRecurrence["kind"]>(initial?.recurrence.kind ?? "daily");
  const [days, setDays] = useState<number[]>(initial?.recurrence.kind === "weekdays" ? initial.recurrence.weekdays : initial?.recurrence.kind === "weekly" ? [initial.recurrence.weekday] : [1, 3, 5]);
  const [startDate, setStartDate] = useState(initial?.startDate ?? date);
  // Derived values count as history too: changing a connected ritual's goal must not re-grade the days already shown.
  const locked = !!initial && view.state.entries.some((entry) => entry.ritualId === initial.id);
  const available = compatibleMetrics(type), chosenMetric = available.includes(metric) ? metric : available[0];
  const movementTypes = wellness.state.types.filter((item) => !item.archived);
  function connection(since: string): RitualConnection | null {
    if (mode === "manual" || !state.connectionsEnabled) return null;
    const next: RitualConnection = { metric: chosenMetric, since };
    if (chosenMetric === "workouts" || chosenMetric === "workout-minutes") { if (scope.startsWith("type:")) next.typeId = scope.slice(5); else if (scope.startsWith("category:")) next.category = scope.slice(9) as MovementCategory; }
    if (chosenMetric === "water") next.unit = waterUnit;
    if (type === "checkbox") next.threshold = Number(threshold) > 0 ? Number(threshold) : 1;
    return next;
  }
  const valid = name.trim() && Number.isFinite(Number(goal)) && Number(goal) > 0 && Number(goal)<=1000000 && (kind === "daily" || days.length > 0);
  function submit(event: FormEvent) {
    event.preventDefault(); if (!valid||!status.loaded||status.error) return;
    const recurrence: RitualRecurrence = kind === "daily" ? { kind } : kind === "weekly" ? { kind, weekday: days[0] } : { kind, weekdays: days };
    const now = new Date().toISOString(), today = view.today || date;
    // A new connected ritual reflects records from its start date; an existing one connects from today, keeping manual history.
    const nextConnection = connection(initial ? today : startDate);
    dispatch({ type: "ritual/save", ritual: { id:captureId, name, groupId, type, goal: Number(goal), unit: type === "duration" ? "min" : type === "weekly-target" ? "times" : type === "checkbox" ? "check-in" : unit.trim(), startDate, createdAt: initial?.createdAt ?? now, recurrence, connection: initial ? initial.connection : nextConnection } });
    if (initial && state.connectionsEnabled && !sameConnection(initial.connection, nextConnection)) {
      // Ending or changing a connection stores exactly what was shown, so history survives the change of mode.
      const materialize = initial.connection ? materializeConnection(initial, view.sources, today) : [];
      dispatch({ type: "ritual/connect", id: initial.id, connection: nextConnection, materialize, today, now });
    }
    onClose();
  }
  return <MuseDrawer title={initial ? "Edit ritual" : "A new ritual"} onClose={onClose} returnFocus={returnFocus}>
    <form className="muse-ritual-form" onSubmit={submit}>
      <label className="editor-label">Name<input data-drawer-autofocus type="text" required maxLength={100} placeholder="Something you want to return to…" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <fieldset><legend>Group</legend><div className="muse-form-choice-list">{state.groups.map((group) => <button key={group.id} type="button" className="choice-button" data-accent={group.accent} aria-pressed={groupId === group.id} onClick={() => setGroup(group.id)}>{group.name}</button>)}</div></fieldset>
      <fieldset disabled={locked || mode === "connected"}><legend>Ritual type</legend><div className="muse-form-choice-list">{(Object.keys(ritualTypeLabels) as RitualType[]).map((value) => <button className="choice-button" type="button" key={value} aria-pressed={type === value} onClick={() => { setType(value); setGoal(value === "checkbox" ? "1" : value === "duration" ? "15" : value === "weekly-target" ? "4" : "20"); setUnit(value === "numeric" ? "pages" : "check-in"); }}>{ritualTypeLabels[value]}</button>)}</div></fieldset>
      {type !== "checkbox" && <fieldset disabled={locked}><legend>{type === "weekly-target" ? "Weekly goal" : "Daily goal"}</legend><div className="muse-ritual-goal-fields"><label>{type === "duration" ? "Minutes" : type === "weekly-target" ? "Times per week" : "Quantity"}<input type="number" required min={type === "weekly-target" ? 1 : .01} step={type === "weekly-target" ? 1 : "any"} value={goal} onChange={(event) => setGoal(event.target.value)} /></label>{type === "numeric" && <label>Unit<input type="text" required maxLength={20} value={unit} onChange={(event) => setUnit(event.target.value)} /></label>}</div></fieldset>}
      <fieldset disabled={locked}><legend>{type === "weekly-target" ? "Available logging days" : "Recurrence"}</legend><div className="muse-form-choice-list">{(["daily", "weekly", "weekdays"] as const).map((value) => <button type="button" className="choice-button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); if (value === "weekly") setDays([days[0] ?? 1]); }}>{value === "daily" ? "Every day" : value === "weekly" ? "Once a week" : "Specific weekdays"}</button>)}</div>
        {kind !== "daily" && <div className="muse-ritual-weekday-choices" role="group" aria-label="Scheduled weekdays">{weekdayOptions.map(({ day, label }) => <button type="button" className="choice-button" key={day} aria-pressed={days.includes(day)} onClick={() => setDays((current) => kind === "weekly" ? [day] : current.includes(day) ? current.filter((value) => value !== day) : [...current, day])}>{label}</button>)}</div>}
        <label className="muse-ritual-start-date">Starts on<input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      </fieldset>
      <fieldset className="muse-ritual-tracking"><legend>Tracking</legend>
        <div className="muse-form-choice-list" role="group" aria-label="Tracking mode"><button type="button" className="choice-button" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>I check it off</button><button type="button" className="choice-button" aria-pressed={mode === "connected"} disabled={!state.connectionsEnabled} onClick={() => setMode("connected")}>Connected to a tracker</button></div>
        {!state.connectionsEnabled && <p className="small-label">Connected tracking needs the latest database update before it can be saved.</p>}
        {mode === "connected" && state.connectionsEnabled && <>
          <label className="editor-label">Source<select value={chosenMetric} onChange={(event) => { const next = event.target.value as ConnectionMetric; setMetric(next); setThreshold(String(defaultThreshold[next] ?? 1)); }}>{available.map((value) => <option key={value} value={value}>{sourceLabels[value]} · {metricInfo[value].owner}</option>)}</select></label>
          {(chosenMetric === "workouts" || chosenMetric === "workout-minutes") && <label className="editor-label">Which movement<select value={scope} onChange={(event) => setScope(event.target.value)}><option value="any">Any movement</option>{movementCategories.filter((value) => value !== "other").map((value) => <option key={value} value={`category:${value}`}>{movementCategoryLabels[value]} (by category)</option>)}{movementTypes.map((item) => <option key={item.id} value={`type:${item.id}`}>{item.name}</option>)}</select></label>}
          {chosenMetric === "water" && <label className="editor-label">Unit<select value={waterUnit} onChange={(event) => setWaterUnit(event.target.value as "oz" | "mL")}><option value="oz">oz</option><option value="mL">mL</option></select></label>}
          {type === "checkbox" && <label className="editor-label">Counts as done at<span className="muse-ritual-threshold"><input type="number" min={0.01} step="any" value={threshold} onChange={(event) => setThreshold(event.target.value)} /><span>{connectionUnit({ metric: chosenMetric, unit: waterUnit })}</span></span></label>}
          <p className="small-label">Values come from {metricInfo[chosenMetric].owner}. Log there or in Daily Edit and this ritual follows; edits and deletions there update it. Days without a record stay unknown, never missed. {initial ? "It connects from today; earlier entries stay as they are. Switching back to manual keeps everything shown so far." : "It reflects records from its start date."}</p>
        </>}
      </fieldset>
      {locked && <p className="small-label">This ritual has history. Its type, goal, and schedule stay fixed to preserve those entries. You can change its name or group; create a new ritual for a new rhythm.</p>}
      {type === "weekly-target" && <p className="small-label">The goal applies to the whole week. Available days are opportunities to log, not separate daily obligations.</p>}
      <div className="editor-actions"><button className="muse-button button-primary" type="submit" disabled={!valid||!status.loaded||!!status.error}>{initial ? "Save ritual" : "Add ritual"}</button><button className="text-button" type="button" onClick={onClose}>Cancel</button></div>
    </form>
  </MuseDrawer>;
}
