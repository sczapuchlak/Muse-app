"use client";
import {useId,useRef,useState,type ReactNode} from 'react';
import {GlassPopover} from '../GlassPopover';
import {MuseIcon} from '../MuseIcon';
import {PlannerOrganizationPanel} from './PlannerOrganization';
import {PeriodTitle} from './PeriodTitle';

/**
 * The Scheduled Board toolbar, built on the same pattern as Agenda's: ‹ Today › and the date (a day picker) on the
 * left; board controls on the right as outlined buttons. Search and Filters live in the Task List header (#79 §12).
 */
export function PlannerUtilities({date,title,onDate,today,onToday,onPrevious,onNext,taskList}:{date:string;title:string;onDate:(date:string)=>void;today:string;onToday:()=>void;onPrevious:()=>void;onNext:()=>void;taskList?:ReactNode}) {
  const [settingsOpen,setSettingsOpen]=useState(false),anchor=useRef<HTMLElement|null>(null),id=useId();
  return <div className="muse-agenda-toolbar muse-planner-bar">
    <PeriodTitle title={title} date={date} onChange={onDate}/>
    <div className="muse-agenda-tools">
    <nav className="muse-agenda-nav" aria-label="Rolling planning window">
      <button className="muse-button" type="button" aria-label="Previous planning day" onClick={onPrevious}>‹</button>
      <button className="muse-button" type="button" disabled={!today} onClick={onToday}>Today</button>
      <button className="muse-button" type="button" aria-label="Next planning day" onClick={onNext}>›</button>
    </nav>
      {taskList}
      <button className="muse-button muse-agenda-icon" type="button" aria-label="Board Settings" aria-haspopup="dialog" aria-expanded={settingsOpen} aria-controls={id} onClick={event=>{anchor.current=event.currentTarget;setSettingsOpen(value=>!value);}}><MuseIcon name="settings" size={16}/></button>
      <GlassPopover id={id} label="Board Settings" open={settingsOpen} anchorRef={anchor} onClose={()=>setSettingsOpen(false)} width={390} scrollMode="content"><PlannerOrganizationPanel onClose={()=>{setSettingsOpen(false);anchor.current?.focus();}}/></GlassPopover>
    </div>
  </div>;
}
