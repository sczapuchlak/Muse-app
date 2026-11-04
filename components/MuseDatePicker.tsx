"use client";
import {useId,useLayoutEffect,useRef,useState} from 'react';
import {dateLabel} from '@/lib/dates';
import {calendarDays,calendarKey,shiftCalendarMonth} from '@/lib/calendar';
import {GlassPopover} from './GlassPopover';
import {MuseIcon} from './MuseIcon';
import './MuseDatePicker.css';

/** Reusable civil-date picker. Today must come from the saved profile timezone. */
export function MuseDatePicker({date,today,onChange,label='Inspect a date'}:{date:string;today:string;onChange:(date:string)=>void;label?:string}){
  const [open,setOpen]=useState(false),id=useId(),trigger=useRef<HTMLButtonElement>(null);
  return <><button type="button" ref={trigger} className="muse-button muse-date-picker-trigger" aria-label={`${label}: ${dateLabel(date)}, ${date.slice(0,4)}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><MuseIcon name="calendar" size={17}/><time dateTime={date}>{dateLabel(date)}, {date.slice(0,4)}</time><MuseIcon name="chevron" size={14}/></button><GlassPopover id={id} label="Choose a date" open={open} anchorRef={trigger} onClose={()=>setOpen(false)} width={360}><MuseCalendar date={date} today={today} onChange={value=>{onChange(value);setOpen(false);trigger.current?.focus();}}/></GlassPopover></>;
}

/** A compact, clearable date filter using the same calendar and keyboard controls. */
export function MuseOptionalDatePicker({date,today,onChange,label}:{date:string;today:string;onChange:(date:string)=>void;label:string}){
  const [open,setOpen]=useState(false),id=useId(),trigger=useRef<HTMLButtonElement>(null);
  return <div className="muse-optional-date-picker"><button type="button" ref={trigger} className="muse-button muse-date-picker-trigger" aria-label={`${label}: ${date?`${dateLabel(date)}, ${date.slice(0,4)}`:'Any date'}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><MuseIcon name="calendar" size={16}/><span>{date?`${dateLabel(date)}, ${date.slice(0,4)}`:'Any date'}</span><MuseIcon name="chevron" size={13}/></button>{date&&<button type="button" className="muse-optional-date-clear" aria-label={`Clear ${label.toLowerCase()} filter`} title="Clear date" onClick={()=>onChange('')}>×</button>}<GlassPopover id={id} label={label} open={open} anchorRef={trigger} onClose={()=>setOpen(false)} width={360}><MuseCalendar date={date||today} today={today} onChange={value=>{onChange(value);setOpen(false);trigger.current?.focus();}}/></GlassPopover></div>;
}

export function MuseCalendar({date,today,onChange}:{date:string;today:string;onChange:(date:string)=>void}){
  const [focus,setFocus]=useState(date),[month,setMonth]=useState(date),grid=useRef<HTMLDivElement>(null),moveFocus=useRef(false),id=useId();
  useLayoutEffect(()=>{if(moveFocus.current){grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus();moveFocus.current=false;}},[focus,month]);
  const days=calendarDays(month),monthLabel=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}T12:00:00Z`));
  function navigate(amount:number){const next=shiftCalendarMonth(focus,amount);setFocus(next);setMonth(next);}
  return <div className="muse-calendar"><div className="muse-calendar-navigation"><button type="button" aria-label="Previous year" onClick={()=>navigate(-12)}>«</button><button type="button" aria-label="Previous month" onClick={()=>navigate(-1)}>‹</button><strong id={id} aria-live="polite">{monthLabel}</strong><button type="button" aria-label="Next month" onClick={()=>navigate(1)}>›</button><button type="button" aria-label="Next year" onClick={()=>navigate(12)}>»</button></div><p className="sr-only" id={`${id}-help`}>Arrow keys move by day or week. Home and End move within a week. Page Up and Down move by month; add Shift to move by year.</p><div ref={grid} role="grid" aria-labelledby={id} aria-describedby={`${id}-help`} className="muse-calendar-grid"><div role="row" className="muse-calendar-week">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span role="columnheader" key={day} aria-label={day}>{day.slice(0,2)}</span>)}</div>{Array.from({length:6},(_,row)=><div role="row" className="muse-calendar-week" key={row}>{days.slice(row*7,row*7+7).map(day=><div role="gridcell" aria-selected={day===date} key={day}><button type="button" data-date={day} data-popover-autofocus={day===focus?true:undefined} data-outside={day.slice(0,7)!==month.slice(0,7)} aria-current={day===today?'date':undefined} aria-label={`${dateLabel(day)}, ${day.slice(0,4)}${day===date?', selected':''}`} tabIndex={day===focus?0:-1} onClick={()=>onChange(day)} onFocus={()=>setFocus(day)} onKeyDown={event=>{const next=calendarKey(day,event.key,event.shiftKey);if(next){event.preventDefault();moveFocus.current=true;setFocus(next);setMonth(next);}}}>{Number(day.slice(8))}</button></div>)}</div>)}</div><div className="muse-calendar-footer"><span>Today follows your saved timezone.</span><button type="button" className="muse-button" onClick={()=>onChange(today)}>Today</button></div></div>;
}
