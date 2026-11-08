"use client";
import { defaultWaterSettings } from "@/lib/water";
import { EmojiButton } from "../EmojiPicker";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { useState, type FormEvent } from "react";
import { categoryPalette, ritualTypeLabels, usedCategories, weekdayOptions, type RitualCategory, type RitualDefinition, type RitualRecurrence, type RitualType } from "@/lib/rituals";
import { MuseDrawer } from "../MuseDrawer";
import { useRituals } from "./RitualStore";
import { useRitualView } from "./ConnectedRituals";
import { useWellness } from "../WellnessStore";
import { compatibleMetrics, connectionUnit, materializeConnection, type ConnectionMetric, type RitualConnection } from "@/lib/ritual-connections";
import { metricInfo } from "@/lib/progress/engine";
import { movementCategories, movementCategoryLabels, type MovementCategory } from "@/lib/progress/movement";
import {ShareToStream} from '../stream/ShareToStream';

const sourceLabels: Record<ConnectionMetric, string> = { water: "Water", workouts: "Workouts", "workout-minutes": "Workout minutes", "reading-minutes": "Reading time", "reading-pages": "Pages read", "books-finished": "Books finished", "tasks-completed": "Tasks completed" };
const defaultThreshold: Partial<Record<ConnectionMetric, number>> = { water: defaultWaterSettings.goal, "workout-minutes": 20, "reading-minutes": 20, "reading-pages": 10 };
const sameConnection = (a?: RitualConnection | null, b?: RitualConnection | null) => JSON.stringify(a ? { ...a, since: "" } : null) === JSON.stringify(b ? { ...b, since: "" } : null);

export function RitualEditor({ initial, groupId: presetGroup, date, returnFocus, onClose }: { initial?: RitualDefinition; groupId?: string; date: string; returnFocus: HTMLElement; onClose: () => void }) {
  const { state, dispatch, status } = useRituals();
  const view = useRitualView(), wellness = useWellness();
  const [mode, setMode] = useState<"manual" | "connected">(initial?.connection ? "connected" : "manual");
  const [metric, setMetric] = useState<ConnectionMetric>(initial?.connection?.metric ?? "water");
  const [scope, setScope] = useState<string>(initial?.connection?.typeId ? `type:${initial.connection.typeId}` : initial?.connection?.category ? `category:${initial.connection.category}` : "any");
  const [waterUnit, setWaterUnit] = useState<"oz" | "mL">(initial?.connection?.unit ?? "oz");
  const [threshold, setThreshold] = useState(String(initial?.connection?.threshold ?? defaultThreshold[initial?.connection?.metric ?? "water"] ?? 1));
  const [captureId]=useState(()=>initial?.id??crypto.randomUUID());
  const [name, setName] = useState(initial?.name ?? ""), [emoji, setEmoji] = useState<string | null>(initial?.emoji ?? null);
  const [groupId, setGroup] = useState(initial?.groupId ?? presetGroup ?? state.groups[0]?.id??"");
  const [type, setType] = useState<RitualType>(initial?.type ?? "checkbox");
  const [goal, setGoal] = useState(String(initial?.goal ?? 1));
  const [unit, setUnit] = useState(initial?.unit ?? "check-in");
  const [kind, setKind] = useState<RitualRecurrence["kind"] | "times">(initial?.timesPerWeek ? "times" : initial?.recurrence.kind ?? "daily");
  const [times, setTimes] = useState(initial?.timesPerWeek ?? 3);
  const [followGoal, setFollowGoal] = useState(initial?.connection?.followGoal ?? (!initial && true));
  const waterGoal = wellness.state.waterSettings?.goal;
  const [days, setDays] = useState<number[]>(initial?.recurrence.kind === "weekdays" ? initial.recurrence.weekdays : initial?.recurrence.kind === "weekly" ? [initial.recurrence.weekday] : [1, 3, 5]);
  const [startDate, setStartDate] = useState(initial?.startDate ?? date);
  // Categorical legend (#85): starts with a workout-style example the person can rename.
  const [categories, setCategories] = useState<RitualCategory[]>(initial?.categories ?? [{ id: "c1", label: "Strength", color: categoryPalette[0] }, { id: "c2", label: "Cardio", color: categoryPalette[1] }, { id: "c3", label: "Rest", color: categoryPalette[7] }]);
  const used = initial ? usedCategories(state, initial.id) : new Set<string>();
  const legendValid = categories.length >= 1 && categories.length <= 12 && categories.every((c) => c.label.trim());
  // Derived values count as history too: changing a connected ritual's goal must not re-grade the days already shown.
  const locked = !!initial && view.state.entries.some((entry) => entry.ritualId === initial.id);
  const available = compatibleMetrics(type), chosenMetric = available.includes(metric) ? metric : available[0];
  const movementTypes = wellness.state.types.filter((item) => !item.archived);
  function connection(since: string): RitualConnection | null {
    if (mode === "manual" || !state.connectionsEnabled) return null;
    const next: RitualConnection = { metric: chosenMetric, since };
    if (chosenMetric === "workouts" || chosenMetric === "workout-minutes") { if (scope.startsWith("type:")) next.typeId = scope.slice(5); else if (scope.startsWith("category:")) next.category = scope.slice(9) as MovementCategory; }
    if (chosenMetric === "water") { next.unit = waterUnit; if (followGoal) next.followGoal = true; }
    if (type === "checkbox") next.threshold = Number(threshold) > 0 ? Number(threshold) : 1;
    return next;
  }
  const valid = name.trim() && Number.isFinite(Number(goal)) && Number(goal) > 0 && Number(goal)<=1000000 && (kind === "daily" || kind === "times" || days.length > 0) && (type !== "category" || legendValid);
  function submit(event: FormEvent) {
    event.preventDefault(); if (!valid||!status.loaded||status.error) return;
    const flexibleWeek = kind === "times" && type !== "weekly-target" && type !== "category";
    const recurrence: RitualRecurrence = kind === "daily" || kind === "times" ? { kind: "daily" } : kind === "weekly" ? { kind, weekday: days[0] } : { kind, weekdays: days };
    const now = new Date().toISOString(), today = view.today || date;
    // A new connected ritual reflects records from its start date; an existing one connects from today, keeping manual history.
    const nextConnection = connection(initial ? today : startDate);
    dispatch({ type: "ritual/save", ritual: { id:captureId, name, groupId, type, goal: type === "category" ? 1 : Number(goal), unit: type === "duration" ? "min" : type === "weekly-target" ? "times" : type === "checkbox" ? "check-in" : type === "category" ? "category" : unit.trim(), startDate, createdAt: initial?.createdAt ?? now, recurrence, timesPerWeek: flexibleWeek ? times : null, emoji, connection: initial ? initial.connection : type === "category" ? null : nextConnection, ...(type === "category" ? { categories } : {}) } });
    if (initial && state.connectionsEnabled && !sameConnection(initial.connection, nextConnection)) {
      // Ending or changing a connection stores exactly what was shown, so history survives the change of mode.
      const materialize = initial.connection ? materializeConnection(initial, view.sources, today) : [];
      dispatch({ type: "ritual/connect", id: initial.id, connection: nextConnection, materialize, today, now });
    }
    onClose();
  }
  return <MuseDrawer title={initial ? "Edit ritual" : "A new ritual"} onClose={onClose} returnFocus={returnFocus}>
    <form className="muse-ritual-form" onSubmit={submit}>
      <div className="muse-ritual-name-row"><label className="editor-label">Name<input data-drawer-autofocus type="text" required maxLength={100} placeholder="Something you want to return to…" value={name} onChange={(event) => setName(event.target.value)} /></label><span className="editor-label">Icon<EmojiButton value={emoji} onChange={setEmoji} label="Ritual emoji" /></span></div>
      <fieldset><legend>Group</legend><div className="muse-form-choice-list">{state.groups.map((group) => <button key={group.id} type="button" className="choice-button" data-accent={group.accent} aria-pressed={groupId === group.id} onClick={() => setGroup(group.id)}>{group.name}</button>)}</div></fieldset>
      <fieldset disabled={locked || mode === "connected"}><legend>Ritual type</legend><div className="muse-form-choice-list">{(Object.keys(ritualTypeLabels) as RitualType[]).filter((value) => value !== "category" || state.categoriesEnabled || initial?.type === "category").map((value) => <button className="choice-button" type="button" key={value} aria-pressed={type === value} onClick={() => { setType(value); setGoal(value === "checkbox" ? "1" : value === "duration" ? "15" : value === "weekly-target" ? "4" : "20"); setUnit(value === "numeric" ? "pages" : "check-in"); }}>{ritualTypeLabels[value]}</button>)}</div></fieldset>
      {type === "category" && <fieldset className="muse-ritual-categories"><legend>Categories</legend>
        <p className="small-label">Each day you pick one, like a workout type or a rest day. Colors make the tracker; names say what they mean.</p>
        <ul>{categories.map((c, i) => <li key={c.id}>
          <input type="color" aria-label={`Color for ${c.label || "category"}`} value={c.color} onChange={(e) => setCategories((list) => list.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} />
          <input type="text" aria-label="Category name" maxLength={40} value={c.label} onChange={(e) => setCategories((list) => list.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
          <button type="button" className="text-button" disabled={used.has(c.id) || categories.length <= 1} title={used.has(c.id) ? "Used in your history, so it stays. Rename or recolor it instead." : undefined} onClick={() => setCategories((list) => list.filter((_, j) => j !== i))}>Remove</button>
        </li>)}</ul>
        {categories.length < 12 && <button type="button" className="muse-button" onClick={() => setCategories((list) => [...list, { id: `c${Date.now().toString(36)}`, label: "", color: categoryPalette[list.length % categoryPalette.length] }])}>+ Category</button>}
      </fieldset>}
      {type !== "checkbox" && type !== "category" && <fieldset disabled={locked}><legend>{type === "weekly-target" ? "Weekly goal" : "Daily goal"}</legend><div className="muse-ritual-goal-fields"><label>{type === "duration" ? "Minutes" : type === "weekly-target" ? "Times per week" : "Quantity"}<input type="number" required min={type === "weekly-target" ? 1 : .01} step={type === "weekly-target" ? 1 : "any"} value={goal} onChange={(event) => setGoal(event.target.value)} /></label>{type === "numeric" && <label>Unit<input type="text" required maxLength={20} value={unit} onChange={(event) => setUnit(event.target.value)} /></label>}</div></fieldset>}
      <fieldset disabled={locked}><legend>{type === "weekly-target" ? "Available logging days" : "Recurrence"}</legend><div className="muse-form-choice-list">{(["daily", "weekdays", ...(type === "weekly-target" || type === "category" ? ["weekly"] as const : ["times"] as const)] as const).map((value) => <button type="button" className="choice-button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); if (value === "weekly") setDays([days[0] ?? 1]); }}>{value === "daily" ? "Every day" : value === "weekly" ? "Once a week" : value === "times" ? "Times per week" : "Specific weekdays"}</button>)}</div>
        {kind === "times" && <div className="muse-ritual-weekday-choices" role="group" aria-label="Times per week">{[1, 2, 3, 4, 5, 6, 7].map((n) => <button type="button" className="choice-button" key={n} aria-pressed={times === n} onClick={() => setTimes(n)}>{n}×</button>)}</div>}
        {kind === "times" && <p className="small-label">Any day counts. The week is met after {times} different {times === 1 ? "day" : "days"}; logging twice on one day still counts once.</p>}
        {kind !== "daily" && kind !== "times" && <div className="muse-ritual-weekday-choices" role="group" aria-label="Scheduled weekdays">{weekdayOptions.map(({ day, label }) => <button type="button" className="choice-button" key={day} aria-pressed={days.includes(day)} onClick={() => setDays((current) => kind === "weekly" ? [day] : current.includes(day) ? current.filter((value) => value !== day) : [...current, day])}>{label}</button>)}</div>}
        <label className="muse-ritual-start-date">Starts on<input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      </fieldset>
      {type !== "category" && <fieldset className="muse-ritual-tracking"><legend>Tracking</legend>
        <div className="muse-form-choice-list" role="group" aria-label="Tracking mode"><button type="button" className="choice-button" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>I check it off</button><button type="button" className="choice-button" aria-pressed={mode === "connected"} disabled={!state.connectionsEnabled} onClick={() => setMode("connected")}>Connected to a tracker</button></div>
        {!state.connectionsEnabled && <p className="small-label">Connected tracking needs the latest database update before it can be saved.</p>}
        {mode === "connected" && state.connectionsEnabled && <>
          <span className="editor-label">Source<MuseChoiceMenu label="Source" valueLabel={`${sourceLabels[chosenMetric]} · ${metricInfo[chosenMetric].owner}`} options={available.map((value) => ({ id: value, label: `${sourceLabels[value]} · ${metricInfo[value].owner}` }))} selectedIds={[chosenMetric]} onSelect={(id) => { const next = id as ConnectionMetric; setMetric(next); setThreshold(String(defaultThreshold[next] ?? 1)); }} /></span>
          {(chosenMetric === "workouts" || chosenMetric === "workout-minutes") && <span className="editor-label">Which movement{(() => { const opts = [{ id: "any", label: "Any movement" }, ...movementCategories.filter((value) => value !== "other").map((value) => ({ id: `category:${value}`, label: `${movementCategoryLabels[value]} (by category)` })), ...movementTypes.map((item) => ({ id: `type:${item.id}`, label: item.name }))]; return <MuseChoiceMenu label="Which movement" valueLabel={opts.find((o) => o.id === scope)?.label ?? "Any movement"} options={opts} selectedIds={[scope]} onSelect={setScope} />; })()}</span>}
          {chosenMetric === "water" && <span className="editor-label">Unit<MuseChoiceMenu label="Water unit" valueLabel={waterUnit} options={[{ id: "oz", label: "oz" }, { id: "mL", label: "mL" }]} selectedIds={[waterUnit]} onSelect={(id) => setWaterUnit(id as "oz" | "mL")} /></span>}
          {chosenMetric === "water" && type !== "weekly-target" && <label className="muse-agenda-check"><input type="checkbox" checked={followGoal} onChange={(e) => setFollowGoal(e.target.checked)} /> Use my water goal{waterGoal ? ` (${waterGoal} ${wellness.state.waterSettings?.unit ?? "oz"} now)` : ""} — each day uses the goal it had in Daily Edit</label>}
          {type === "checkbox" && !(chosenMetric === "water" && followGoal) && <label className="editor-label">Counts as done at<span className="muse-ritual-threshold"><input type="number" min={0.01} step="any" value={threshold} onChange={(event) => setThreshold(event.target.value)} /><span>{connectionUnit({ metric: chosenMetric, unit: waterUnit })}</span></span></label>}
          <p className="small-label">Values come from {metricInfo[chosenMetric].owner}. Log there or in Daily Edit and this ritual follows; edits and deletions there update it. Days without a record stay unknown, never missed. {initial ? "It connects from today; earlier entries stay as they are. Switching back to manual keeps everything shown so far." : "It reflects records from its start date."}</p>
        </>}
      </fieldset>}
      {locked && <p className="small-label">This ritual has history. Its type, goal, and schedule stay fixed to preserve those entries. You can change its name or group; create a new ritual for a new rhythm.</p>}
      {type === "weekly-target" && <p className="small-label">The goal applies to the whole week. Available days are opportunities to log, not separate daily obligations.</p>}
      <div className="editor-actions"><button className="muse-button button-primary" type="submit" disabled={!valid||!status.loaded||!!status.error}>{initial ? "Save ritual" : "Add ritual"}</button><button className="text-button" type="button" onClick={onClose}>Cancel</button>{initial&&<ShareToStream kind="ritual" id={initial.id} category="rituals" label="Share this ritual" className="text-button"/>}</div>
    </form>
  </MuseDrawer>;
}
