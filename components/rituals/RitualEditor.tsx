"use client";
import { useState, type FormEvent } from "react";
import { ritualTypeLabels, weekdayOptions, type RitualDefinition, type RitualRecurrence, type RitualType } from "@/lib/rituals";
import { MuseDrawer } from "../MuseDrawer";
import { useRituals } from "./RitualStore";

export function RitualEditor({ initial, date, returnFocus, onClose }: { initial?: RitualDefinition; date: string; returnFocus: HTMLElement; onClose: () => void }) {
  const { state, dispatch } = useRituals();
  const [name, setName] = useState(initial?.name ?? "");
  const [groupId, setGroup] = useState(initial?.groupId ?? state.groups[0].id);
  const [type, setType] = useState<RitualType>(initial?.type ?? "checkbox");
  const [goal, setGoal] = useState(String(initial?.goal ?? 1));
  const [unit, setUnit] = useState(initial?.unit ?? "check-in");
  const [kind, setKind] = useState<RitualRecurrence["kind"]>(initial?.recurrence.kind ?? "daily");
  const [days, setDays] = useState<number[]>(initial?.recurrence.kind === "weekdays" ? initial.recurrence.weekdays : initial?.recurrence.kind === "weekly" ? [initial.recurrence.weekday] : [1, 3, 5]);
  const [startDate, setStartDate] = useState(initial?.startDate ?? date);
  const locked = !!initial && state.entries.some((entry) => entry.ritualId === initial.id);
  const valid = name.trim() && Number(goal) > 0 && (kind === "daily" || days.length > 0);
  function submit(event: FormEvent) {
    event.preventDefault(); if (!valid) return;
    const recurrence: RitualRecurrence = kind === "daily" ? { kind } : kind === "weekly" ? { kind, weekday: days[0] } : { kind, weekdays: days };
    dispatch({ type: "ritual/save", ritual: { id: initial?.id ?? crypto.randomUUID(), name, groupId, type, goal: Number(goal), unit: type === "duration" ? "min" : type === "weekly-target" ? "times" : type === "checkbox" ? "check-in" : unit.trim(), startDate, createdAt: initial?.createdAt ?? new Date().toISOString(), recurrence } });
    onClose();
  }
  return <MuseDrawer title={initial ? "Edit ritual" : "A new ritual"} onClose={onClose} returnFocus={returnFocus}>
    <form className="muse-ritual-form" onSubmit={submit}>
      <label className="editor-label">Name<input data-drawer-autofocus type="text" required maxLength={100} placeholder="Something you want to return to…" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <fieldset><legend>Group</legend><div className="muse-form-choice-list">{state.groups.map((group) => <button key={group.id} type="button" className="choice-button" data-accent={group.accent} aria-pressed={groupId === group.id} onClick={() => setGroup(group.id)}>{group.name}</button>)}</div></fieldset>
      <fieldset disabled={locked}><legend>Ritual type</legend><div className="muse-form-choice-list">{(Object.keys(ritualTypeLabels) as RitualType[]).map((value) => <button className="choice-button" type="button" key={value} aria-pressed={type === value} onClick={() => { setType(value); setGoal(value === "checkbox" ? "1" : value === "duration" ? "15" : value === "weekly-target" ? "4" : "20"); setUnit(value === "numeric" ? "pages" : "check-in"); }}>{ritualTypeLabels[value]}</button>)}</div></fieldset>
      {type !== "checkbox" && <fieldset disabled={locked}><legend>{type === "weekly-target" ? "Weekly goal" : "Daily goal"}</legend><div className="muse-ritual-goal-fields"><label>{type === "duration" ? "Minutes" : type === "weekly-target" ? "Times per week" : "Quantity"}<input type="number" required min={type === "weekly-target" ? 1 : .01} step={type === "weekly-target" ? 1 : "any"} value={goal} onChange={(event) => setGoal(event.target.value)} /></label>{type === "numeric" && <label>Unit<input type="text" required maxLength={20} value={unit} onChange={(event) => setUnit(event.target.value)} /></label>}</div></fieldset>}
      <fieldset disabled={locked}><legend>{type === "weekly-target" ? "Available logging days" : "Recurrence"}</legend><div className="muse-form-choice-list">{(["daily", "weekly", "weekdays"] as const).map((value) => <button type="button" className="choice-button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); if (value === "weekly") setDays([days[0] ?? 1]); }}>{value === "daily" ? "Every day" : value === "weekly" ? "Once a week" : "Specific weekdays"}</button>)}</div>
        {kind !== "daily" && <div className="muse-ritual-weekday-choices" role="group" aria-label="Scheduled weekdays">{weekdayOptions.map(({ day, label }) => <button type="button" className="choice-button" key={day} aria-pressed={days.includes(day)} onClick={() => setDays((current) => kind === "weekly" ? [day] : current.includes(day) ? current.filter((value) => value !== day) : [...current, day])}>{label}</button>)}</div>}
        <label className="muse-ritual-start-date">Starts on<input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      </fieldset>
      {locked && <p className="small-label">This ritual has history. Its type, goal, and schedule stay fixed to preserve those entries. You can change its name or group; create a new ritual for a new rhythm.</p>}
      {type === "weekly-target" && <p className="small-label">The goal applies to the whole week. Available days are opportunities to log, not separate daily obligations.</p>}
      <div className="editor-actions"><button className="muse-button button-primary" type="submit" disabled={!valid}>{initial ? "Save ritual" : "Add ritual"}</button><button className="text-button" type="button" onClick={onClose}>Cancel</button></div>
    </form>
  </MuseDrawer>;
}
