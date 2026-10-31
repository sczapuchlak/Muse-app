"use client";
import { useRef,useState } from "react";
import { mealSlots,mealLabels,type DailyMealAssignment,type MealSlot } from "@/lib/models";
import { dateLabel,weekDates } from "@/lib/dates";
import { validDate } from "@/lib/dates";
import { useNourish } from "../NourishStore";
import {useWellness} from "../WellnessStore";
import { MuseDrawer } from "../MuseDrawer";
export function MealPlacementEditor({meal,mode,anchor,onClose,onSaved}:{meal:DailyMealAssignment;mode:"move"|"copy";anchor:HTMLElement;onClose:()=>void;onSaved:()=>void}) {
  const {dispatch}=useNourish();
  const {store,status}=useWellness();
  const copies=useRef<Record<string,string>>({});
  const [date,setDate]=useState(meal.date),[slot,setSlot]=useState<MealSlot>(meal.slot),[dates,setDates]=useState<string[]>([meal.date]);
  return <MuseDrawer title={`${mode==="move"?"Move":"Copy"} meal`} onClose={onClose} returnFocus={anchor}>
    <form className="muse-meal-form" onSubmit={(event)=>{event.preventDefault();if(!status.loaded||status.error)return;if(!validDate(date))return;if(mode==="move")dispatch({type:"assignment/move",id:meal.id,date,slot});else dispatch({type:"assignment/copy",id:meal.id,now:new Date().toISOString(),targets:dates.map((target)=>({id:copies.current[target]??(copies.current[target]=crypto.randomUUID()),date:target,slot}))});store.whenSaved(onSaved);onClose();}}>
      <p>{meal.title}</p><label>Destination date<input data-drawer-autofocus className="date-input" type="date" required value={date} onChange={(event)=>{setDate(event.target.value);setDates([event.target.value]);}}/></label>
      <fieldset><legend>Meal slot</legend><div className="muse-filter-options">{mealSlots.map((value)=><button className="choice-button" type="button" key={value} aria-pressed={slot===value} onClick={()=>setSlot(value)}>{mealLabels[value]}</button>)}</div></fieldset>
      {mode==="copy"&&validDate(date)&&<fieldset><legend>Copy to one or more days</legend><div className="muse-filter-options">{weekDates(date).map((day)=><button className="choice-button" key={day} type="button" aria-label={dateLabel(day)} aria-pressed={dates.includes(day)} onClick={()=>setDates((items)=>items.includes(day)?items.filter((item)=>item!==day):[...items,day])}>{new Intl.DateTimeFormat("en-US",{weekday:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${day}T12:00:00Z`))}</button>)}</div><button className="muse-button button-ghost" type="button" onClick={()=>setDates(weekDates(date).slice(0,5))}>Choose weekdays</button></fieldset>}
      {status.error&&<p role="alert">Resolve the wellness save error before saving this form. Your input is still here.</p>}<div className="editor-actions"><button className="muse-button button-primary" type="submit" disabled={!status.loaded||!!status.error||(mode==="copy"&&!dates.length)}>{mode==="copy"?`Copy to ${dates.length} ${dates.length===1?"day":"days"}`:"Move meal"}</button><button className="muse-button button-ghost" type="button" onClick={onClose}>Cancel</button></div>
    </form>
  </MuseDrawer>;
}
