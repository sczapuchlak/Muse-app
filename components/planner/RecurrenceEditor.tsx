"use client";
import { useState } from "react";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseDatePicker } from "../MuseDatePicker";
import { MuseIcon } from "../MuseIcon";
import { nthOfMonth, presets, ruleLabel, scopeLabels, upcoming, validRule, weekdayOf, type EditScope, type Frequency, type Nth, type RecurrenceRule, type Weekday } from "@/lib/recurrence";
import "./RecurrenceEditor.css";

const units: { id: Frequency; one: string; many: string }[] = [{ id: "daily", one: "day", many: "days" }, { id: "weekly", one: "week", many: "weeks" }, { id: "monthly", one: "month", many: "months" }, { id: "yearly", one: "year", many: "years" }];
const dayLetters: { day: Weekday; short: string; long: string }[] = [{ day: 1, short: "M", long: "Monday" }, { day: 2, short: "T", long: "Tuesday" }, { day: 3, short: "W", long: "Wednesday" }, { day: 4, short: "T", long: "Thursday" }, { day: 5, short: "F", long: "Friday" }, { day: 6, short: "S", long: "Saturday" }, { day: 0, short: "S", long: "Sunday" }];
const nthWords: Record<string, string> = { "1": "first", "2": "second", "3": "third", "4": "fourth", "-1": "last" };
const longDay = (d: Weekday) => dayLetters.find((x) => x.day === d)!.long;
const shortDate = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const same = (a: RecurrenceRule | null, b: RecurrenceRule | null) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Recurrence 2.0 (#89): the one recurrence editor for tasks and events. Plain-language presets for the start date, a
 * Custom panel for intervals, weekdays, month placement and an end, plus a live summary and the next few dates, so
 * nobody has to learn recurrence syntax. `value` null means "Doesn't repeat".
 */
export function RecurrenceEditor({ value, start, today, onChange, label = "Repeat" }: { value: RecurrenceRule | null; start: string; today: string; onChange: (rule: RecurrenceRule | null) => void; label?: string }) {
  const quick = presets(start);
  const preset = value ? quick.find((p) => same(p.rule, { ...value, until: undefined, count: undefined } as RecurrenceRule) || same(p.rule, value)) : null;
  const [custom, setCustom] = useState(!!value && !preset);
  const rule = value;
  const set = (patch: Partial<RecurrenceRule>) => { if (!rule) return; const next = { ...rule, ...patch } as RecurrenceRule; for (const k of Object.keys(next) as (keyof RecurrenceRule)[]) if (next[k] === undefined) delete next[k]; if (validRule(next)) onChange(next); };
  const ends = rule?.until ? "on" : rule?.count ? "after" : "never";
  const next = rule ? upcoming(rule, start, start < today ? today : start, 4) : [];
  const { nth, last } = nthOfMonth(start), wd = weekdayOf(start);
  const choiceId = !rule ? "none" : custom ? "custom" : preset?.id ?? "custom";
  return <div className="muse-recurrence">
    <div><p className="editor-label">{label}</p>
      <MuseChoiceMenu label={label} valueLabel={!rule ? "Doesn't repeat" : custom || !preset ? "Custom…" : preset.label}
        options={[{ id: "none", label: "Doesn't repeat" }, ...quick.map((p) => ({ id: p.id, label: p.label })), { id: "custom", label: "Custom…" }]} selectedIds={[choiceId]}
        onSelect={(id) => { if (id === "none") { setCustom(false); onChange(null); return; } if (id === "custom") { setCustom(true); if (!rule) onChange({ freq: "weekly", interval: 1, weekdays: [wd] }); return; } setCustom(false); const p = quick.find((x) => x.id === id)!; onChange({ ...p.rule, ...(rule?.until ? { until: rule.until } : {}), ...(rule?.count ? { count: rule.count } : {}) }); }} /></div>
    {rule && custom && <div className="muse-recurrence-custom" role="group" aria-label="Custom repeat">
      <div className="muse-recurrence-every"><span>Every</span>
        <input type="number" min={1} max={999} aria-label="Interval" value={rule.interval} onChange={(e) => set({ interval: Math.max(1, Math.min(999, Math.round(Number(e.target.value) || 1))) })} />
        <MuseChoiceMenu label="Repeat unit" valueLabel={units.find((u) => u.id === rule.freq)![rule.interval === 1 ? "one" : "many"]} options={units.map((u) => ({ id: u.id, label: rule.interval === 1 ? u.one : u.many }))} selectedIds={[rule.freq]}
          onSelect={(id) => { const f = id as Frequency; onChange({ freq: f, interval: rule.interval, ...(f === "weekly" ? { weekdays: [wd] } : {}), ...(rule.until ? { until: rule.until } : {}), ...(rule.count ? { count: rule.count } : {}) }); }} /></div>
      {rule.freq === "weekly" && <div className="muse-chip-row muse-recurrence-days" role="group" aria-label="On these days">{dayLetters.map((d) => { const on = (rule.weekdays ?? [wd]).includes(d.day);
        return <button key={d.day} type="button" aria-pressed={on} aria-label={d.long} title={d.long} onClick={() => { const cur = rule.weekdays ?? [wd], nextDays = on ? cur.filter((x) => x !== d.day) : [...cur, d.day]; if (nextDays.length) set({ weekdays: nextDays }); }}>{d.short}</button>; })}</div>}
      {(rule.freq === "monthly" || rule.freq === "yearly") && <div className="muse-chip-row" role="group" aria-label="Which day">
        <button type="button" aria-pressed={!rule.placement || rule.placement.kind === "day"} onClick={() => set({ placement: { kind: "day", day: Number(start.slice(8)) } })}>On day {Number(start.slice(8))}</button>
        {nth <= 4 && <button type="button" aria-pressed={rule.placement?.kind === "nth" && rule.placement.nth === nth} onClick={() => set({ placement: { kind: "nth", nth: nth as Nth, weekday: wd } })}>On the {nthWords[String(nth)]} {longDay(wd)}</button>}
        {last && <button type="button" aria-pressed={rule.placement?.kind === "nth" && rule.placement.nth === -1} onClick={() => set({ placement: { kind: "nth", nth: -1, weekday: wd } })}>On the last {longDay(wd)}</button>}
      </div>}
    </div>}
    {rule && <div className="muse-recurrence-ends"><p className="editor-label">Ends</p>
      <div className="muse-chip-row" role="group" aria-label="Ends">
        <button type="button" aria-pressed={ends === "never"} onClick={() => set({ until: undefined, count: undefined })}>Never</button>
        <button type="button" aria-pressed={ends === "on"} onClick={() => set({ count: undefined, until: rule.until ?? upcoming(rule, start, start, 6).at(-1) ?? start })}>On a date</button>
        <button type="button" aria-pressed={ends === "after"} onClick={() => set({ until: undefined, count: rule.count ?? 10 })}>After…</button>
      </div>
      {ends === "on" && <MuseDatePicker date={rule.until!} today={today} label="Repeat until" onChange={(d) => set({ until: d < start ? start : d })} />}
      {ends === "after" && <label className="muse-recurrence-count"><input type="number" min={1} max={10000} value={rule.count} aria-label="Number of times" onChange={(e) => set({ count: Math.max(1, Math.min(10000, Math.round(Number(e.target.value) || 1))) })} /> times</label>}
    </div>}
    {rule && <div className="muse-recurrence-summary" aria-live="polite"><MuseIcon name="undo" size={14} /><div><strong>{ruleLabel(rule, start)}</strong>
      {next.length > 0 ? <p>Next: {next.map(shortDate).join(" · ")}</p> : <p>No more dates after today.</p>}</div></div>}
  </div>;
}

/** "This one / This and future / Entire series" — asked before changing a recurring item, so the reach is never a surprise. */
export function RecurrenceScopeChoice({ value, onChange, allowed = ["occurrence", "future", "series"] }: { value: EditScope; onChange: (scope: EditScope) => void; allowed?: EditScope[] }) {
  return <fieldset className="muse-recurrence-scope"><legend className="editor-label">Apply to</legend>
    {allowed.map((s) => <label key={s} data-selected={value === s || undefined}><input type="radio" name="recurrence-scope" checked={value === s} onChange={() => onChange(s)} /><span><strong>{scopeLabels[s].label}</strong><small>{scopeLabels[s].detail}</small></span></label>)}
  </fieldset>;
}
