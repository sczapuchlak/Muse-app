"use client";
import type { RitualDefinition, RitualGroupDefinition } from "@/lib/rituals";
import { recurrenceLabel, ritualStreak, weeklyValue } from "@/lib/rituals";
import { MuseIcon } from "../MuseIcon";
import { RitualWeekCell } from "./RitualWeekCell";
import { useRituals } from "./RitualStore";

type Props = { group: RitualGroupDefinition; week: string[]; today: string; selectedDate: string; onEdit: (ritual: RitualDefinition, anchor: HTMLElement) => void; onEditEntry: (ritual: RitualDefinition, date: string, anchor: HTMLElement, onComplete: (value: number | null) => void) => void };
export function RitualGroup({ group, week, today, selectedDate, onEdit, onEditEntry }: Props) {
  const { state, dispatch } = useRituals();
  const rituals = state.rituals.filter((ritual) => ritual.groupId === group.id);
  const logged = state.entries.filter((entry) => week.includes(entry.date) && rituals.some((ritual) => ritual.id === entry.ritualId)).length;
  return <section className="muse-ritual-group" data-accent={group.accent} data-gradient={group.gradient ?? (group.accent === "primary" ? "primary-secondary" : group.accent === "secondary" ? "secondary-pop" : "pop-primary")} aria-labelledby={`ritual-group-${group.id}`}>
    <header className="muse-ritual-group-header"><div className="muse-ritual-group-title"><span className="muse-ritual-group-icon"><MuseIcon name={group.icon} /></span><div><h2 id={`ritual-group-${group.id}`}>{group.name}</h2><p className="small-label">{rituals.length} {rituals.length === 1 ? "ritual" : "rituals"} · {logged} logged this week</p></div></div><button type="button" className="muse-button" aria-expanded={!group.collapsed} aria-controls={`ritual-group-body-${group.id}`} aria-label={`${group.collapsed ? "Expand" : "Collapse"} ${group.name}`} onClick={() => dispatch({ type: "group/toggle", id: group.id })}><span className={group.collapsed ? "chevron-right" : undefined}><MuseIcon name="chevron" size={16} /></span></button></header>
    {!group.collapsed && <div id={`ritual-group-body-${group.id}`}>
      <div className="muse-ritual-week-head" aria-hidden="true"><span>Ritual / rhythm</span>{week.map((date) => <span key={date} data-today={date === today}>{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}<strong>{Number(date.slice(-2))}</strong></span>)}</div>
      {rituals.map((ritual) => {
        const streak = ritualStreak(state, ritual, today);
        const weekly = ritual.type === "weekly-target";
        const value = weekly ? weeklyValue(state, ritual, selectedDate) : 0;
        return <div className="muse-ritual-row" key={ritual.id}>
          <div className="muse-ritual-description"><button className="muse-ritual-name muse-edge" type="button" onClick={(event) => onEdit(ritual, event.currentTarget)}>{ritual.name}</button><p>{ritual.type === "checkbox" ? recurrenceLabel(ritual.recurrence) : `${ritual.goal} ${ritual.unit}${weekly ? " / week" : " · " + recurrenceLabel(ritual.recurrence)}`}</p>
            {weekly && <div className="muse-ritual-weekly-progress"><span>{value} / {ritual.goal} this week{value>=ritual.goal&&<span className="muse-ritual-weekly-met"><MuseIcon name="check" size={13}/>Weekly goal complete</span>}</span><div role="progressbar" aria-label={`${ritual.name} weekly progress`} aria-valuemin={0} aria-valuemax={ritual.goal} aria-valuenow={Math.min(value, ritual.goal)} aria-valuetext={`${value} of ${ritual.goal} ${ritual.unit}`}><span style={{ width: `${Math.min(100, value / ritual.goal * 100)}%` }} /></div></div>}
            {streak.count > 0 && <p className="muse-ritual-streak">{streak.count} {streak.unit} in rhythm · through today</p>}
          </div>
          {week.map((date) => <RitualWeekCell key={date} ritual={ritual} date={date} today={today} selected={date === selectedDate} onEditEntry={onEditEntry} />)}
        </div>;
      })}
      {!rituals.length && <p className="muse-ritual-empty">A little room for a new rhythm. Use Add ritual to start.</p>}
    </div>}
  </section>;
}
