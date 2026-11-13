"use client";
import {MuseMark,type MuseMarkIcon,type MuseTone} from '@/components/design/MuseHeading';
import {accentStyle,customGradientCss} from "@/lib/appearance-values";
import type { RitualDefinition, RitualGroupDefinition } from "@/lib/rituals";
import { rhythmLabel, ritualStreak, weeklyValue, weeklyDays, flexible, ritualCell,ritualOpportunity } from "@/lib/rituals";
import { EmojiGlyph } from "../EmojiPicker";
import { MuseIcon } from "../MuseIcon";
import { RitualWeekCell } from "./RitualWeekCell";
import {MuseMilestone} from "../MuseMilestone";
import {RitualLifecycle} from "./RitualLifecycle";
import {StreakMoments} from "./StreakMoments";
import { connectionLabel } from "@/lib/ritual-connections";
import { useRituals } from "./RitualStore";
import { useRitualView } from "./ConnectedRituals";
import { useState } from "react";

/** Drag payload for reordering rituals (desktop); the ⋯ menu offers Move up / down / to group everywhere. */
const DRAG = "application/x-muse-ritual";

type Props = { group: RitualGroupDefinition; week: string[]; today: string; selectedDate: string; archived?:boolean; onEdit: (ritual: RitualDefinition, anchor: HTMLElement) => void; onAdd?: (groupId: string, anchor: HTMLElement) => void; onEditEntry: (ritual: RitualDefinition, date: string, anchor: HTMLElement, onComplete: (value: number | null) => void) => void };
export function RitualGroup({ group, week, today, selectedDate, archived=false,onEdit, onAdd, onEditEntry }: Props) {
  const { dispatch, status: saveStatus } = useRituals();
  const [over, setOver] = useState<string | null>(null);
  const { state } = useRitualView();
  const rituals = state.rituals.filter((ritual) => ritual.groupId === group.id && (archived?ritual.status==='archived':ritual.status!=='archived'));
  const scheduled=rituals.filter(ritual=>ritual.type!=="weekly-target"&&!flexible(ritual)&&ritualOpportunity(state,ritual,selectedDate));
  const settled=saveStatus.loaded&&!saveStatus.pending&&!saveStatus.saving&&!saveStatus.error;
  const groupComplete=scheduled.length>0&&scheduled.every(ritual=>ritualCell(state,ritual,selectedDate,today).status==="complete");
  const logged = state.entries.filter((entry) => week.includes(entry.date) && rituals.some((ritual) => ritual.id === entry.ritualId)).length;
  return <section className="muse-ritual-group" data-accent={group.accent} style={{...accentStyle(group.accent),...(group.gradient&&typeof group.gradient!=="string"?{"--ritual-banner-gradient":customGradientCss(group.gradient),"--ritual-gradient-start":group.gradient.colors[0],"--ritual-gradient-end":group.gradient.colors[group.gradient.colors.length-1]}:{})} as React.CSSProperties} data-gradient={typeof group.gradient==="string"?group.gradient:group.gradient?"custom":group.accent==="secondary"?"secondary-pop":"primary-secondary"} aria-labelledby={`ritual-group-${group.id}`}>
    <MuseMilestone key={selectedDate} achieved={groupComplete}/><header className="muse-ritual-group-header"><div className="muse-ritual-group-title"><MuseMark icon={group.icon as MuseMarkIcon} tone={(({primary:1,secondary:5,pop:2,warm:4,info:6} as Record<string,MuseTone>)[group.accent]??1)} size="lg" className="muse-ritual-group-mark"/><div><h2 id={`ritual-group-${group.id}`}>{group.name}</h2><p className="small-label">{rituals.length} {rituals.length === 1 ? "ritual" : "rituals"} · {logged} logged this week</p></div></div><span className="muse-ritual-group-tools">{onAdd && !archived && <button type="button" className="muse-button muse-ritual-group-add" aria-label={`Add a ritual to ${group.name}`} title={`Add to ${group.name}`} onClick={(event) => onAdd(group.id, event.currentTarget)}><MuseIcon name="plus" size={15} /></button>}<button type="button" className="muse-button" aria-expanded={!group.collapsed} aria-controls={`ritual-group-body-${group.id}`} aria-label={`${group.collapsed ? "Expand" : "Collapse"} ${group.name}`} onClick={() => dispatch({ type: "group/toggle", id: group.id })}><span className={group.collapsed ? "chevron-right" : undefined}><MuseIcon name="chevron" size={16} /></span></button></span></header>
    {!group.collapsed && <div id={`ritual-group-body-${group.id}`} data-drop={over === "end" || undefined}
      onDragOver={(e) => { if (archived || !e.dataTransfer.types.includes(DRAG)) return; e.preventDefault(); setOver("end"); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
      onDrop={(e) => { const id = e.dataTransfer.getData(DRAG); setOver(null); if (!id) return; e.preventDefault(); dispatch({ type: "ritual/move", id, groupId: group.id, before: null }); }}>
      <div className="muse-ritual-week-head" aria-hidden="true"><span>Ritual / rhythm</span>{week.map((date) => <span key={date} data-today={date === today} data-selected={date===selectedDate}>{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}<strong>{Number(date.slice(-2))}</strong></span>)}</div>
      {rituals.map((ritual) => {
        const streak = ritualStreak(state, ritual, today);
        const flex = flexible(ritual), weekly = ritual.type === "weekly-target" || flex;
        const value = flex ? weeklyDays(state, ritual, selectedDate) : weekly ? weeklyValue(state, ritual, selectedDate) : 0, target = flex ? ritual.timesPerWeek! : ritual.goal;
        return <div className="muse-ritual-row" key={ritual.id} draggable={!archived && saveStatus.loaded} data-drop={over === ritual.id || undefined}
          onDragStart={(e) => { if ((e.target as HTMLElement).closest("button,a,input")) { e.preventDefault(); return; } e.dataTransfer.setData(DRAG, ritual.id); e.dataTransfer.effectAllowed = "move"; }}
          onDragOver={(e) => { if (!e.dataTransfer.types.includes(DRAG)) return; e.preventDefault(); e.stopPropagation(); setOver(ritual.id); }}
          onDragLeave={() => setOver((x) => x === ritual.id ? null : x)}
          onDrop={(e) => { const id = e.dataTransfer.getData(DRAG); setOver(null); if (!id || id === ritual.id) return; e.preventDefault(); e.stopPropagation(); dispatch({ type: "ritual/move", id, groupId: group.id, before: ritual.id }); }}>
          <div className="muse-ritual-description"><button className="muse-ritual-name muse-edge" type="button" onClick={(event) => onEdit(ritual, event.currentTarget)}>{ritual.emoji && <span className="muse-ritual-emoji" aria-hidden="true"><EmojiGlyph value={ritual.emoji} /></span>}{ritual.name}</button> <RitualLifecycle ritual={ritual} today={today}/>{ritual.status&&ritual.status!=='active'&&<span className="small-label"> {ritual.status==='paused'?'Paused':'Archived'}</span>}<p>{ritual.connection?.followGoal ? `Your water goal · ${rhythmLabel(ritual)}` : ritual.type === "checkbox" ? rhythmLabel(ritual) : `${ritual.goal} ${ritual.unit}${ritual.type === "weekly-target" ? " / week" : " · " + rhythmLabel(ritual)}`}{ritual.connection&&<span className="muse-ritual-connected-note" title="Values come from the source record; edit it there."><span aria-hidden="true">⟲ </span>From {connectionLabel(ritual.connection).split(" · ")[1]}</span>}</p>
            {weekly && week.some(date=>ritualOpportunity(state,ritual,date)) && <div className="muse-ritual-weekly-progress"><span>{value} / {target} {flex ? "days " : ""}this week{value>=target&&<span className="muse-ritual-weekly-met"><MuseIcon name="check" size={13}/>Goal reached</span>}{value>target&&<span className="small-label"> · {value-target} above goal</span>}</span><div role="progressbar" aria-label={`${ritual.name} weekly progress`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(value, target)} aria-valuetext={`${value} of ${target} ${flex ? "days" : ritual.unit}`}><span style={{ width: `${Math.min(100, value / target * 100)}%` }} /></div></div>}
            {streak.count > 0 && <p className="muse-ritual-streak">{streak.count} {streak.unit} in rhythm · through today</p>}
            <StreakMoments ritualId={ritual.id} name={ritual.name} count={streak.count} unit={streak.unit} ready={settled} today={today}/>
          </div>
          {week.map((date) => <RitualWeekCell key={date} ritual={ritual} date={date} today={today} selected={date === selectedDate} onEditEntry={onEditEntry} />)}
        </div>;
      })}
      {!rituals.length && <p className="muse-ritual-empty">{archived?'No archived rituals in this group.':'A little room for a new rhythm. Use Add ritual to start.'}</p>}
    </div>}
  </section>;
}
