"use client";
import {useId,useRef,useState} from 'react';
import type { PlannerFilters as Filters } from "@/lib/planner";
import { MuseIcon } from "../MuseIcon";
import {MuseIconButton} from '../MuseIconButton';
import {GlassPopover} from '../GlassPopover';
import { PlannerFilters } from "./PlannerFilters";
import {PlannerOrganizationPanel} from './PlannerOrganization';
export function PlannerUtilities({search,onSearch,filters,onFilter,workspaceId,today,onToday,onPrevious,onNext}:{search:string;onSearch:(value:string)=>void;filters:Filters;onFilter:(value:Filters)=>void;workspaceId:string;today:string;onToday:()=>void;onPrevious:()=>void;onNext:()=>void}) {
  const [settingsOpen,setSettingsOpen]=useState(false),anchor=useRef<HTMLElement|null>(null),id=useId();
  return <div className="muse-planner-toolbar"><div className="muse-planner-toolbar-left"><label className="muse-planner-search"><MuseIcon name="search" size={16}/><input aria-label="Search Planner tasks" type="search" value={search} onChange={(event)=>onSearch(event.target.value)} placeholder="Search tasks…"/></label><PlannerFilters value={filters} onChange={onFilter} workspaceId={workspaceId}/></div><div className="muse-planner-utility-row"><nav className="muse-planning-window-nav" aria-label="Rolling planning window"><button className="muse-button" type="button" disabled={!today} onClick={onToday}>Today</button><button className="muse-button" type="button" aria-label="Previous planning day" onClick={onPrevious}>←</button><button className="muse-button" type="button" aria-label="Next planning day" onClick={onNext}>→</button></nav><MuseIconButton icon="settings" label="Board Settings" aria-haspopup="dialog" aria-expanded={settingsOpen} aria-controls={id} onClick={event=>{anchor.current=event.currentTarget;setSettingsOpen(value=>!value);}}/><GlassPopover id={id} label="Board Settings" open={settingsOpen} anchorRef={anchor} onClose={()=>setSettingsOpen(false)} width={390} scrollMode="content"><PlannerOrganizationPanel onClose={()=>{setSettingsOpen(false);anchor.current?.focus();}}/></GlassPopover></div></div>;
}
