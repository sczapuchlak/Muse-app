"use client";
import type { RitualDefinition } from "@/lib/rituals";
import { dateLabel } from "@/lib/dates";
import { ritualCell, ritualFeedback, ritualReducer } from "@/lib/rituals";
import { MuseProgressRing } from "../MuseProgressRing";
import { MuseIcon } from "../MuseIcon";
import { MuseStar } from "../MuseStar";
import { useRitualFeedback } from "../MuseRitualFeedback";
import { useRituals } from "./RitualStore";

export function RitualWeekCell({ ritual, date, today, selected, onEditEntry }: { ritual: RitualDefinition; date: string; today: string; selected: boolean; onEditEntry: (ritual: RitualDefinition, date: string, anchor: HTMLElement, onComplete: (value: number | null) => void) => void }) {
  const { state, dispatch,store,status } = useRituals();
  const cell = ritualCell(state, ritual, date, today);
  const { trigger, effect } = useRitualFeedback();
  const statusLabel = cell.status === "unscheduled" ? "not scheduled" : cell.status === "upcoming" ? "upcoming" : cell.status === "missed" ? ritual.type === "weekly-target" ? "no session recorded; weekly goal tracked separately" : "explicitly missed" : cell.status === "unknown" ? "not logged; unknown" : cell.status === "available" ? "available to log; weekly goal" : cell.status === "complete" ? `complete${ritual.type === "checkbox" ? "" : `: ${cell.value} of ${ritual.goal} ${ritual.unit}`}` : cell.status === "partial" ? `partial: ${cell.value} of ${ritual.goal} ${ritual.unit}` : cell.status === "logged" ? `${cell.value} ${ritual.unit} logged toward the weekly goal` : "not logged yet";
  function record(value: number | null,cycle=false) {
    const action = { type: cycle?"entry/cycle" as const:"entry/set" as const, ritualId: ritual.id, date, value, today, now: new Date().toISOString() };
    const next = ritualReducer(state, action);
    const feedback = ritualFeedback(state, next, ritual, date, today);
    dispatch(action);
    if(feedback)store.whenSaved(()=>trigger(feedback.kind));
  }
  const disabled = !status.loaded||!!status.error||!today || cell.status === "unscheduled" || cell.status === "upcoming";
  return <div className="muse-ritual-week-cell" data-selected={selected} data-status={cell.status} data-recorded={cell.recorded} data-today={date === today}>
    {cell.status==="unscheduled"?<span className="muse-ritual-unavailable" aria-label={`${ritual.name}, ${dateLabel(date)}: not scheduled`}>—</span>:<button className="muse-ritual-cell-control muse-edge" type="button" disabled={disabled} aria-label={`${ritual.name}, ${dateLabel(date)}: ${statusLabel}`} aria-haspopup={ritual.type==='checkbox'?undefined:'dialog'} title={`${dateLabel(date)} · ${statusLabel}`} onClick={(event) => {
      if(ritual.type==='checkbox')record(null,true);else onEditEntry(ritual, date, event.currentTarget, record);
    }}>
      {cell.status === "upcoming" ? <MuseStar size={15}/>
        : cell.status === "missed" ? <MuseIcon name="close" size={16}/>
        : cell.status === "complete" ? ritual.type==="checkbox"?<MuseIcon name="check" size={19}/>:<><span className="muse-ritual-completed-value">{new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(cell.value!)}</span><span className="muse-ritual-completion-badge"><MuseIcon name="check" size={11}/></span></>
        : cell.status === "partial" ? <MuseProgressRing value={cell.value!} goal={ritual.goal}><span>{cell.value}</span><small>{ritual.type === "duration" ? "m" : ritual.unit.length<=3?ritual.unit:""}</small></MuseProgressRing>
        : cell.value !== null ? <span>{cell.value}</span>
        : <span className="muse-ritual-unlogged" aria-hidden="true"/>}

    </button>}{effect}
  </div>;
}
