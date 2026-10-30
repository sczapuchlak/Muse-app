"use client";
import { useState } from "react";
import { mealLabels, type DailyMealAssignment, type MealSlot as Slot } from "@/lib/models";
import { mealsFor } from "@/lib/nourish";
import { useNourish } from "../NourishStore";
import { MuseIcon } from "../MuseIcon";
import { useMuseSpark } from "../MuseSpark";
import { useMuseDropTarget } from "../useMuseDropTarget";
export const MEAL_DRAG_TYPE="application/x-muse-meal";
export type MealOpen=(date:string,slot:Slot,anchor:HTMLElement,onSaved:()=>void,assignment?:DailyMealAssignment)=>void;
export type MealPlace=(assignment:DailyMealAssignment,mode:"move"|"copy",anchor:HTMLElement)=>void;
function MealItem({meal,onOpen,onPlace,onSaved}:{meal:DailyMealAssignment;onOpen:MealOpen;onPlace:MealPlace;onSaved:()=>void}) {
  const [dragging,setDragging]=useState(false);
  return <li className="muse-meal-entry muse-drag-surface" data-dragging={dragging}>
    <button type="button" className="muse-meal-title muse-edge" onClick={(event)=>onOpen(meal.date,meal.slot,event.currentTarget,onSaved,meal)}>{meal.title}</button>
    {meal.note&&<p className="small-label muse-meal-note">{meal.note}</p>}
    <div className="muse-meal-meta">{meal.savedMealId&&<span className="small-label">Saved meal</span>}<button type="button" className="muse-meal-drag text-button" draggable aria-label={`Drag ${meal.title}; Move is also available`} onDragStart={(event)=>{setDragging(true);event.dataTransfer.setData(MEAL_DRAG_TYPE,meal.id);event.dataTransfer.effectAllowed="move";}} onDragEnd={()=>setDragging(false)}><MuseIcon name="grip" size={15}/></button><button className="text-button" type="button" onClick={(event)=>onPlace(meal,"move",event.currentTarget)}>Move</button><button className="text-button" type="button" onClick={(event)=>onPlace(meal,"copy",event.currentTarget)}>Copy</button></div>
  </li>;
}
export function MealSlot({date,slot,onOpen,onPlace}:{date:string;slot:Slot;onOpen:MealOpen;onPlace:MealPlace}) {
  const {state,dispatch}=useNourish(), {trigger,spark}=useMuseSpark();
  const meals=mealsFor(state,date,slot);
  const {active,dropProps}=useMuseDropTarget(MEAL_DRAG_TYPE,(id)=>{const meal=state.assignments.find((item)=>item.id===id);if(meal&&(meal.date!==date||meal.slot!==slot)){dispatch({type:"assignment/move",id,date,slot});trigger();}});
  const label=slot==="snacks"?"snack":slot;
  return <section className="muse-meal-slot muse-drop-zone" data-drop-active={active} aria-label={`${mealLabels[slot]} for ${date}`} {...dropProps}>
    <h3 className="muse-meal-slot-title">{mealLabels[slot]}</h3><ul className="muse-meal-entries">{meals.map((meal)=><MealItem key={meal.id} meal={meal} onOpen={onOpen} onPlace={onPlace} onSaved={trigger}/>)}</ul>
    <button className="text-button muse-meal-add" type="button" onClick={(event)=>onOpen(date,slot,event.currentTarget,trigger)}>+ Add {label}</button><span className="muse-slot-feedback">{spark}</span>
  </section>;
}
