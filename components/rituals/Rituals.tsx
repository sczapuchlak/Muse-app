"use client";
import {useDailyData} from "../daily/DailyData";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MuseSectionNav } from "../MuseSectionNav";
import { Aspirations } from "./aspirations/Aspirations";
import { BucketList } from "./bucket/BucketList";
import {AlmanacWhisper} from "../almanac/AlmanacWhisper";
import {surfaces} from "@/lib/almanac/select";
import {ritualSignals} from "@/lib/almanac/signals";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { dateLabel, weekDates } from "@/lib/dates";
import { entryFor, weekSummary, type RitualDefinition } from "@/lib/rituals";
import { MusePageHeader } from "../MusePageHeader";
import { DateNavigator } from "../DateNavigator";
import { RitualWeekNavigator } from "./RitualWeekNavigator";
import { useMuseDate } from "../MuseSession";
import { useMuseToday } from "../useMuseToday";
import {RitualSaveStatus,RitualCapture} from "./RitualStore";
import { useRitualView } from "./ConnectedRituals";
import { RitualGroup } from "./RitualGroup";
import { RitualEditor } from "./RitualEditor";
import { RitualGroupManager } from "./RitualGroupManager";
import { RitualEntryEditor } from "./RitualEntryEditor";
import { RitualTracker } from "./RitualTracker";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { effectivePeriod, periodTitle, shiftPeriod, trackerLayouts, trackerPeriods, type TrackerLayout, type TrackerPeriod } from "@/lib/ritual-tracker";
import "./Rituals.css";

type Editor = { kind: "ritual"; ritual?: RitualDefinition; anchor: HTMLElement } | { kind: "groups"; anchor: HTMLElement } | { kind: "entry"; ritual: RitualDefinition; date: string; anchor: HTMLElement; apply: (value: number | null) => void };
function RitualsView() {
  const {profile}=useDailyData();
  const requested = useSearchParams()?.get("view");
  const view = requested === "aspirations" || requested === "bucket" ? requested : "habits";
  const { state } = useRitualView();
  const [date, setDate] = useMuseDate(dailyEditSample.date.iso);
  const [archived,setArchived]=useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  // Tracker view (#85): period, layout and focused ritual, remembered per device. Week + Grid is the original screen.
  const [tracker, setTracker] = useState<{ period: TrackerPeriod; layout: TrackerLayout; habitId: string }>({ period: "week", layout: "grid", habitId: "all" });
  useEffect(() => { const t = window.setTimeout(() => { try { const v = JSON.parse(window.localStorage.getItem("muse.rituals.tracker") ?? "{}"); setTracker({ period: ["week", "month", "year"].includes(v.period) ? v.period : "week", layout: ["grid", "focus", "heatmap"].includes(v.layout) ? v.layout : "grid", habitId: typeof v.habitId === "string" ? v.habitId : "all" }); } catch { /* per device only */ } }, 0); return () => window.clearTimeout(t); }, []);
  const changeTracker = (patch: Partial<typeof tracker>) => setTracker((v) => { const next = { ...v, ...patch }; try { window.localStorage.setItem("muse.rituals.tracker", JSON.stringify(next)); } catch { /* per device only */ } return next; });
  const today = useMuseToday(profile.timeZone);
  const week = weekDates(date), summary = weekSummary(state, week, today);
  const period = effectivePeriod(tracker.period, tracker.layout), classic = period === "week" && tracker.layout === "grid";
  const trackable = state.rituals.filter((r) => archived ? r.status === "archived" : r.status !== "archived");
  const focusId = tracker.layout === "focus" ? (trackable.some((r) => r.id === tracker.habitId) ? tracker.habitId : trackable[0]?.id ?? "all") : tracker.layout === "heatmap" && trackable.some((r) => r.id === tracker.habitId) ? tracker.habitId : "all";
  const noun = period === "week" ? "week" : period === "month" ? "month" : "year";
  const almanacSignals = useMemo(() => today ? ritualSignals(state, today) : [], [state, today]);
  return <main className="muse-page muse-rituals-page">
    <MusePageHeader title="Rituals">{view === "habits" && <DateNavigator date={date} onChange={setDate} />}</MusePageHeader>
    <MuseSectionNav label="Rituals views" current={view} items={[{ id: "habits", label: "Habits", href: "/rituals" }, { id: "aspirations", label: "Aspirations", href: "/rituals?view=aspirations" }, { id: "bucket", label: "Bucket List", href: "/rituals?view=bucket" }]} />
    {view === "aspirations" ? <Aspirations /> : view === "bucket" ? (today ? <BucketList today={today} /> : <p className="small-label" role="status">Loading…</p>) : <RitualCapture>
    <div className="muse-rituals-toolbar"><nav className="muse-ritual-week-navigation muse-week-jump" aria-label={`Ritual ${noun} navigation`}><button className="muse-button" type="button" aria-label={`Previous ${noun}`} onClick={() => setDate(shiftPeriod(period, date, -1))}>‹</button><button className="muse-button" type="button" disabled={!today} onClick={() => setDate(today)}>This {noun}</button><button className="muse-button" type="button" aria-label={`Next ${noun}`} onClick={() => setDate(shiftPeriod(period, date, 1))}>›</button></nav>{!classic && <span className="muse-tracker-title">{periodTitle(period, date)}</span>}
    <div className="muse-tracker-controls">
      <MuseChoiceMenu label="Period" valueLabel={trackerPeriods.find((p) => p.id === period)!.label} options={trackerPeriods.filter((p) => tracker.layout !== "heatmap" || p.id !== "week")} selectedIds={[period]} onSelect={(id) => changeTracker({ period: id as TrackerPeriod })} />
      <MuseChoiceMenu label="Layout" valueLabel={trackerLayouts.find((l) => l.id === tracker.layout)!.label} options={trackerLayouts} selectedIds={[tracker.layout]} onSelect={(id) => changeTracker({ layout: id as TrackerLayout })} />
      {tracker.layout !== "grid" && trackable.length > 0 && <MuseChoiceMenu label="Ritual" searchable valueLabel={trackable.find((r) => r.id === focusId)?.name ?? "All rituals"} options={[...(tracker.layout === "heatmap" ? [{ id: "all", label: "All rituals" }] : []), ...trackable.map((r) => ({ id: r.id, label: r.name, accent: state.groups.find((g) => g.id === r.groupId)?.accent }))]} selectedIds={[focusId]} onSelect={(id) => changeTracker({ habitId: id })} />}
    </div><div className="muse-rituals-actions"><button className="muse-button button-ghost" type="button" aria-pressed={archived} onClick={()=>setArchived(value=>!value)}>{archived?"Back to tracking":"View archived"}</button><button className="muse-button" type="button" onClick={(event) => setEditor({ kind: "groups", anchor: event.currentTarget })}>Manage groups</button><button className="muse-button button-primary" type="button" onClick={(event) => setEditor({ kind: state.groups.length?"ritual":"groups", anchor: event.currentTarget })}>+ Add ritual</button></div></div>
    {!classic && <RitualTracker period={period} layout={tracker.layout} habitId={focusId} date={date} today={today} rituals={trackable} onDate={(d, p, l) => { setDate(d); changeTracker({ ...(p ? { period: p } : {}), ...(l ? { layout: l } : {}) }); }} onEditEntry={(ritual, entryDate, anchor, apply) => setEditor({ kind: "entry", ritual, date: entryDate, anchor, apply })} />}
    {classic && <><div className="muse-rituals-week-context"><RitualWeekNavigator selectedDate={date} today={today} onChange={setDate}/><p className="small-label">{dateLabel(date)} · {today && date > today ? "Upcoming days are ready to plan, then log when they arrive." : "Past scheduled days remain editable."}</p></div>
    <dl className="muse-rituals-summary"><div><dt>Complete</dt><dd>{today ? summary.completed : "…"}<span>{summary.partial} partial · {summary.missed} explicitly missed</span></dd></div><div><dt>Not logged</dt><dd>{today ? summary.unknown : "…"}<span>past scheduled days · unknown</span></dd></div><div><dt>Weekly goals met</dt><dd>{today ? `${summary.weeklyMet} / ${summary.weeklyTargets}` : "…"}<span>separate from daily goals</span></dd></div></dl>
    <AlmanacWhisper surface={surfaces.rituals} signals={almanacSignals} today={today} className="muse-rituals-whisper"/>
    <div className="muse-ritual-groups">{state.groups.map((group) => <RitualGroup key={group.id} group={group} archived={archived} week={week} selectedDate={date} today={today} onEdit={(ritual, anchor) => setEditor({ kind: "ritual", ritual, anchor })} onEditEntry={(ritual, entryDate, anchor, apply) => setEditor({ kind: "entry", ritual, date: entryDate, anchor, apply })} />)}</div>
    <div className="muse-ritual-legend" aria-label="Week status legend"><span><i data-status="complete" />Complete</span><span><i data-status="partial" />Partial progress</span><span>× Explicitly missed</span><span>○ Not logged / unknown</span><span><i data-status="upcoming" />Upcoming</span><span>— Not scheduled</span></div>
    <p className="small-label muse-ritual-semantics" data-classic>Partial progress is its own state. Past blanks stay unknown until you log them. Weekly targets accumulate across available days; unscheduled days never count against a streak.</p></>}
    {editor?.kind === "ritual" && <RitualEditor key={editor.ritual?.id ?? "new"} initial={editor.ritual} date={date} returnFocus={editor.anchor} onClose={() => setEditor(null)} />}
    {editor?.kind === "groups" && <RitualGroupManager returnFocus={editor.anchor} onClose={() => setEditor(null)} />}
    {editor?.kind === "entry" && <RitualEntryEditor ritual={editor.ritual} date={editor.date} current={entryFor(state, editor.ritual.id, editor.date)?.value ?? null} returnFocus={editor.anchor} onApply={editor.apply} onClose={() => setEditor(null)} />}
    </RitualCapture>}<footer className="muse-footer">{view === "bucket" ? "Your bucket list is private and saves to your account." : <><RitualSaveStatus/>Rituals and your recorded progress save to your account.</>}</footer>
  </main>;
}
export function Rituals() { return <Suspense fallback={<main className="muse-page muse-rituals-page" aria-busy="true"><h1>Rituals</h1></main>}><RitualsView /></Suspense>; }
