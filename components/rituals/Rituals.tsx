"use client";
import {useDailyData} from "../daily/DailyData";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { weekDates } from "@/lib/dates";
import { entryFor, weekSummary, type RitualDefinition } from "@/lib/rituals";
import { MusePageHeader } from "../MusePageHeader";
import { DateNavigator } from "../DateNavigator";
import { RitualWeekNavigator } from "./RitualWeekNavigator";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { MuseIcon } from "../MuseIcon";
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
import { periodTitle, shiftPeriod, trackerLayouts, trackerPeriods, type TrackerLayout, type TrackerPeriod } from "@/lib/ritual-tracker";
import "./Rituals.css";

type Editor = { kind: "ritual"; ritual?: RitualDefinition; groupId?: string; anchor: HTMLElement } | { kind: "groups"; anchor: HTMLElement } | { kind: "entry"; ritual: RitualDefinition; date: string; anchor: HTMLElement; apply: (value: number | null) => void };
function RitualsView() {
  const {profile}=useDailyData();
  // Envision (#117): Aspirations and the Bucket List moved to /envision; old ?view= links redirect there (next.config).
  const requested = useSearchParams()?.get("view"), router = useRouter();
  useEffect(() => { if (requested === "aspirations" || requested === "bucket") router.replace(`/envision?${new URLSearchParams(window.location.search)}`); }, [requested, router]);
  const { state } = useRitualView();
  const [date, setDate] = useMuseDate(dailyEditSample.date.iso);
  const [archived,setArchived]=useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  // Tracker view (#85): period, layout and focused ritual, remembered per device. Week + Grid is the original screen.
  const [tracker, setTracker] = useState<{ period: TrackerPeriod; layout: TrackerLayout; habitId: string }>({ period: "week", layout: "grid", habitId: "all" });
  useEffect(() => { const t = window.setTimeout(() => { try { const v = JSON.parse(window.localStorage.getItem("muse.rituals.tracker") ?? "{}"); setTracker({ period: ["week", "month", "year"].includes(v.period) ? v.period : "week", layout: v.layout === "grid" ? "grid" : v.layout ? "focus" : "grid", habitId: typeof v.habitId === "string" ? v.habitId : "all" }); } catch { /* per device only */ } }, 0); return () => window.clearTimeout(t); }, []);
  const changeTracker = (patch: Partial<typeof tracker>) => setTracker((v) => { const next = { ...v, ...patch }; try { window.localStorage.setItem("muse.rituals.tracker", JSON.stringify(next)); } catch { /* per device only */ } return next; });
  const today = useMuseToday(profile.timeZone);
  const week = weekDates(date), summary = weekSummary(state, week, today);
  // Year is always the year sheet (Focus); a year "grid" isn't a view.
  const period = tracker.period, layout: TrackerLayout = period === "year" ? "focus" : tracker.layout, classic = period === "week" && layout === "grid";
  const trackable = state.rituals.filter((r) => archived ? r.status === "archived" : r.status !== "archived");
  const focusId = layout === "focus" ? (trackable.some((r) => r.id === tracker.habitId) ? tracker.habitId : trackable[0]?.id ?? "all") : "all";
  const noun = period === "week" ? "week" : period === "month" ? "month" : "year";
  return <main className="muse-page muse-rituals-page">
    <MusePageHeader title="Rituals"><DateNavigator date={date} onChange={setDate} /></MusePageHeader>
    <RitualCapture>
    <div className="muse-rituals-toolbar"><nav className="muse-ritual-week-navigation muse-week-jump" aria-label={`Ritual ${noun} navigation`}><button className="muse-button" type="button" aria-label={`Previous ${noun}`} onClick={() => setDate(shiftPeriod(period, date, -1))}>‹</button><button className="muse-button" type="button" disabled={!today} onClick={() => setDate(today)}>This {noun}</button><button className="muse-button" type="button" aria-label={`Next ${noun}`} onClick={() => setDate(shiftPeriod(period, date, 1))}>›</button></nav>{!classic && <span className="muse-tracker-title">{periodTitle(period, date)}</span>}
    <div className="muse-tracker-controls">
      <MuseChoiceMenu label="Period" valueLabel={trackerPeriods.find((p) => p.id === period)!.label} options={trackerPeriods} selectedIds={[period]} onSelect={(id) => changeTracker({ period: id as TrackerPeriod })} />
      <MuseChoiceMenu label="Layout" valueLabel={trackerLayouts.find((l) => l.id === layout)!.label} options={trackerLayouts.filter((l) => period !== "year" || l.id === "focus")} selectedIds={[layout]} onSelect={(id) => changeTracker({ layout: id as TrackerLayout })} />
      {layout !== "grid" && trackable.length > 0 && <MuseChoiceMenu label="Ritual" searchable valueLabel={trackable.find((r) => r.id === focusId)?.name ?? "All rituals"} options={[...trackable.map((r) => ({ id: r.id, label: r.name, accent: state.groups.find((g) => g.id === r.groupId)?.accent }))]} selectedIds={[focusId]} onSelect={(id) => changeTracker({ habitId: id })} />}
    </div><div className="muse-rituals-actions muse-wide-only"><button className="muse-button button-ghost" type="button" aria-pressed={archived} onClick={()=>setArchived(value=>!value)}>{archived?"Back to tracking":"View archived"}</button><button className="muse-button" type="button" onClick={(event) => setEditor({ kind: "groups", anchor: event.currentTarget })}>Manage groups</button><button className="muse-button button-primary" type="button" onClick={(event) => setEditor({ kind: state.groups.length?"ritual":"groups", anchor: event.currentTarget })}>+ Add ritual</button></div>
    {/* #101 Phones: the less frequent management actions live in one ⋯ menu beside a compact + Add. */}
    <div className="muse-rituals-phone-actions muse-phone-only"><MuseOverflowMenu label="Rituals" actions={[{ id: "archived", label: archived ? "Back to tracking" : "View archived", onSelect: () => setArchived((value) => !value) }, { id: "groups", label: "Manage groups", onSelect: () => setEditor({ kind: "groups", anchor: document.activeElement as HTMLElement }) }]} /><button className="muse-button button-primary muse-search-add" type="button" aria-label="Add ritual" onClick={(event) => setEditor({ kind: state.groups.length ? "ritual" : "groups", anchor: event.currentTarget })}><MuseIcon name="plus" size={16} /></button></div></div>
    {!classic && <RitualTracker period={period} layout={layout} habitId={focusId} date={date} today={today} rituals={trackable} onDate={(d, p, l) => { setDate(d); changeTracker({ ...(p ? { period: p } : {}), ...(l ? { layout: l } : {}) }); }} onEditEntry={(ritual, entryDate, anchor, apply) => setEditor({ kind: "entry", ritual, date: entryDate, anchor, apply })} />}
    {classic && <><div className="muse-rituals-week-context"><RitualWeekNavigator selectedDate={date} today={today} onChange={setDate}/></div>
    <p className="muse-rituals-summary-line" aria-label="This week">{today ? <><strong>{summary.completed}</strong> complete{summary.partial ? <> · {summary.partial} partial</> : null}{summary.unknown ? <> · {summary.unknown} not logged</> : null}</> : "…"}</p>
    <div className="muse-ritual-groups">{state.groups.map((group) => <RitualGroup key={group.id} group={group} archived={archived} week={week} selectedDate={date} today={today} onEdit={(ritual, anchor) => setEditor({ kind: "ritual", ritual, anchor })} onAdd={(groupId, anchor) => setEditor({ kind: "ritual", groupId, anchor })} onEditEntry={(ritual, entryDate, anchor, apply) => setEditor({ kind: "entry", ritual, date: entryDate, anchor, apply })} />)}</div>
    <div className="muse-ritual-legend" aria-label="Week status legend"><span><i data-status="complete" />Complete</span><span><i data-status="partial" />Partial progress</span><span>× Explicitly missed</span><span>○ Not logged / unknown</span><span><i data-status="upcoming" />Upcoming</span><span>— Not scheduled</span></div>
    <p className="small-label muse-ritual-semantics" data-classic>Partial progress is its own state. Past blanks stay unknown until you log them. Weekly targets accumulate across available days; unscheduled days never count against a streak.</p></>}
    {editor?.kind === "ritual" && <RitualEditor key={editor.ritual?.id ?? `new-${editor.groupId ?? ""}`} initial={editor.ritual} groupId={editor.groupId} date={date} returnFocus={editor.anchor} onClose={() => setEditor(null)} />}
    {editor?.kind === "groups" && <RitualGroupManager returnFocus={editor.anchor} onClose={() => setEditor(null)} />}
    {editor?.kind === "entry" && <RitualEntryEditor ritual={editor.ritual} date={editor.date} current={entryFor(state, editor.ritual.id, editor.date)?.value ?? null} returnFocus={editor.anchor} onApply={editor.apply} onClose={() => setEditor(null)} />}
    </RitualCapture><footer className="muse-footer"><RitualSaveStatus/>Rituals and your recorded progress save to your account.</footer>
  </main>;
}
export function Rituals() { return <Suspense fallback={<main className="muse-page muse-rituals-page" aria-busy="true"><h1>Rituals</h1></main>}><RitualsView /></Suspense>; }
