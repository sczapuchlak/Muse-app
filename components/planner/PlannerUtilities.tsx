"use client";
import { TaskDensityToggle } from "./TaskDensityToggle";
import {useId,useRef,useState,type ReactNode} from 'react';
import {GlassPopover} from '../GlassPopover';
import {MuseIcon} from '../MuseIcon';
import {PlannerOrganizationPanel} from './PlannerOrganization';
import {PeriodTitle} from './PeriodTitle';
import {MuseChoiceMenu} from '../MuseChoiceMenu';
import {tasksViews,type TasksView} from '@/lib/running-list';

/**
 * The Scheduled Board toolbar, built on the same pattern as Agenda's: ‹ Today › and the date (a day picker) on the
 * left; board controls on the right as outlined buttons. Search and Filters live in the Task List header (#79 §12).
 */
export function PlannerUtilities({date,title,onDate,today,onToday,onPrevious,onNext,taskList,view,onView}:{date:string;title:string;onDate:(date:string)=>void;today:string;onToday:()=>void;onPrevious:()=>void;onNext:()=>void;taskList?:ReactNode;view:TasksView;onView:(view:TasksView)=>void}) {
  const [settingsOpen,setSettingsOpen]=useState(false),anchor=useRef<HTMLElement|null>(null),id=useId();
  return <div className="muse-agenda-toolbar muse-planner-bar">
    <PeriodTitle title={title} date={date} onChange={onDate}/>
    <div className="muse-agenda-tools">
    <nav className="muse-agenda-nav" aria-label="Rolling planning window">
      <button className="muse-button" type="button" aria-label={view==="running"?"Previous week":"Previous planning day"} onClick={onPrevious}>‹</button>
      <button className="muse-button" type="button" disabled={!today} onClick={onToday}>Today</button>
      <button className="muse-button" type="button" aria-label={view==="running"?"Next week":"Next planning day"} onClick={onNext}>›</button>
    </nav>
      <MuseChoiceMenu label="Tasks view" valueLabel={tasksViews.find(v=>v.id===view)!.label} options={tasksViews.map(v=>({id:v.id,label:v.label}))} selectedIds={[view]} onSelect={id=>onView(id as TasksView)}/>
      {view==='board'&&taskList}
      <button className="muse-button muse-agenda-icon" type="button" aria-label="Board Settings" aria-haspopup="dialog" aria-expanded={settingsOpen} aria-controls={id} onClick={event=>{anchor.current=event.currentTarget;setSettingsOpen(value=>!value);}}><MuseIcon name="settings" size={16}/></button>
      <GlassPopover id={id} label="Board Settings" open={settingsOpen} anchorRef={anchor} onClose={()=>setSettingsOpen(false)} width={390} scrollMode="content"><TaskDensityToggle/><PlannerOrganizationPanel onClose={()=>{setSettingsOpen(false);anchor.current?.focus();}}/></GlassPopover>
    </div>
  </div>;
}
