'use client';
import {useId,useRef,useState} from 'react';
import {GlassPopover} from './GlassPopover';
import {MuseIcon} from './MuseIcon';
import './DailyEditWidgetControl.css';

/** Presentation only: the owning module retains its canonical preference and retry command. */
export function DailyEditWidgetControl({name,enabled,disabled=false,saving=false,onChange}:{name:string;enabled:boolean;disabled?:boolean;saving?:boolean;onChange:(enabled:boolean)=>void}){
 const id=useId(),anchor=useRef<HTMLButtonElement>(null),[open,setOpen]=useState(false);
 return <div className="muse-widget-display"><button ref={anchor} type="button" className="muse-button button-ghost" aria-label={`${name} display settings`} title="Daily Edit display settings" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}><MuseIcon name="settings" size={17}/><span>Display</span></button><GlassPopover id={id} label={`${name} display`} open={open} anchorRef={anchor} align="end" width={300} onClose={()=>setOpen(false)}><p className="muse-widget-display-description">Keep a little of {name} in your daily view.</p><button type="button" className="muse-widget-display-toggle" role="switch" aria-checked={enabled} disabled={disabled||saving} onClick={()=>onChange(!enabled)}><span>Show on Daily Edit</span><span className="muse-widget-switch-track" aria-hidden="true"><span/></span></button><p className="muse-widget-display-status" role="status">{saving?'Saving preference…':disabled?'Available once your preferences load.':enabled?'Shown in Daily Edit.':'Hidden from Daily Edit.'}</p></GlassPopover></div>;
}
