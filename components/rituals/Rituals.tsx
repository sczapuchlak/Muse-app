"use client";
import {useDailyData} from "../daily/DailyData";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MuseSectionNav } from "../MuseSectionNav";
import { Aspirations } from "./aspirations/Aspirations";
import {AlmanacWhisper} from "../almanac/AlmanacWhisper";
import {surfaces} from "@/lib/almanac/select";
import {ritualSignals} from "@/lib/almanac/signals";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { dateLabel, shiftDate, weekDates } from "@/lib/dates";
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
import "./Rituals.css";

type Editor = { kind: "ritual"; ritual?: RitualDefinition; anchor: HTMLElement } | { kind: "groups"; anchor: HTMLElement } | { kind: "entry"; ritual: RitualDefinition; date: string; anchor: HTMLElement; apply: (value: number | null) => void };
function RitualsView() {
  const {profile}=useDailyData();
  const view = useSearchParams()?.get("view") === "aspirations" ? "aspirations" : "habits";
  const { state } = useRitualView();
  const [date, setDate] = useMuseDate(dailyEditSample.date.iso);
  const [archived,setArchived]=useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const today = useMuseToday(profile.timeZone);
  const week = weekDates(date), summary = weekSummary(state, week, today);
  const almanacSignals = useMemo(() => today ? ritualSignals(state, today) : [], [state, today]);
  return <main className="muse-page muse-rituals-page">
    <MusePageHeader title="Rituals">{view === "habits" && <DateNavigator date={date} onChange={setDate} />}</MusePageHeader>
    <MuseSectionNav label="Rituals views" current={view} items={[{ id: "habits", label: "Habits", href: "/rituals" }, { id: "aspirations", label: "Aspirations", href: "/rituals?view=aspirations" }]} />
    {view === "aspirations" ? <Aspirations /> : <RitualCapture>
    <div className="muse-rituals-toolbar"><nav className="muse-ritual-week-navigation muse-week-jump" aria-label="Ritual week navigation"><button className="muse-button" type="button" aria-label="Previous week" onClick={() => setDate(shiftDate(date, -7))}>‹</button><button className="muse-button" type="button" disabled={!today} onClick={() => setDate(today)}>This week</button><button className="muse-button" type="button" aria-label="Next week" onClick={() => setDate(shiftDate(date, 7))}>›</button></nav><div className="muse-rituals-actions"><button className="muse-button button-ghost" type="button" aria-pressed={archived} onClick={()=>setArchived(value=>!value)}>{archived?"Back to tracking":"View archived"}</button><button className="muse-button" type="button" onClick={(event) => setEditor({ kind: "groups", anchor: event.currentTarget })}>Manage groups</button><button className="muse-button button-primary" type="button" onClick={(event) => setEditor({ kind: state.groups.length?"ritual":"groups", anchor: event.currentTarget })}>+ Add ritual</button></div></div>
    <div className="muse-rituals-week-context"><RitualWeekNavigator selectedDate={date} today={today} onChange={setDate}/><p className="small-label">{dateLabel(date)} · {today && date > today ? "Upcoming days are ready to plan, then log when they arrive." : "Past scheduled days remain editable."}</p></div>
    <dl className="muse-rituals-summary"><div><dt>Complete</dt><dd>{today ? summary.completed : "…"}<span>{summary.partial} partial · {summary.missed} explicitly missed</span></dd></div><div><dt>Not logged</dt><dd>{today ? summary.unknown : "…"}<span>past scheduled days · unknown</span></dd></div><div><dt>Weekly goals met</dt><dd>{today ? `${summary.weeklyMet} / ${summary.weeklyTargets}` : "…"}<span>separate from daily goals</span></dd></div></dl>
    <AlmanacWhisper surface={surfaces.rituals} signals={almanacSignals} today={today} className="muse-rituals-whisper"/>
    <div className="muse-ritual-groups">{state.groups.map((group) => <RitualGroup key={group.id} group={group} archived={archived} week={week} selectedDate={date} today={today} onEdit={(ritual, anchor) => setEditor({ kind: "ritual", ritual, anchor })} onEditEntry={(ritual, entryDate, anchor, apply) => setEditor({ kind: "entry", ritual, date: entryDate, anchor, apply })} />)}</div>
    <div className="muse-ritual-legend" aria-label="Week status legend"><span><i data-status="complete" />Complete</span><span><i data-status="partial" />Partial progress</span><span>× Explicitly missed</span><span>○ Not logged / unknown</span><span><i data-status="upcoming" />Upcoming</span><span>— Not scheduled</span></div>
    <p className="small-label muse-ritual-semantics">Partial progress is its own state. Past blanks stay unknown until you log them. Weekly targets accumulate across available days; unscheduled days never count against a streak.</p>
    {editor?.kind === "ritual" && <RitualEditor key={editor.ritual?.id ?? "new"} initial={editor.ritual} date={date} returnFocus={editor.anchor} onClose={() => setEditor(null)} />}
    {editor?.kind === "groups" && <RitualGroupManager returnFocus={editor.anchor} onClose={() => setEditor(null)} />}
    {editor?.kind === "entry" && <RitualEntryEditor ritual={editor.ritual} date={editor.date} current={entryFor(state, editor.ritual.id, editor.date)?.value ?? null} returnFocus={editor.anchor} onApply={editor.apply} onClose={() => setEditor(null)} />}
    </RitualCapture>}<footer className="muse-footer"><RitualSaveStatus/>Rituals and your recorded progress save to your account.</footer>
  </main>;
}
export function Rituals() { return <Suspense fallback={<main className="muse-page muse-rituals-page" aria-busy="true"><h1>Rituals</h1></main>}><RitualsView /></Suspense>; }
