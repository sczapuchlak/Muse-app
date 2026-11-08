"use client";
import { useState } from "react";
import { mealLabels, type DailyMealAssignment, type MealSlot as Slot } from "@/lib/models";
import { mealsFor } from "@/lib/nourish";
import { useNourish } from "../NourishStore";
import { MealMacros } from "./MealMacros";
import { useMuseSpark } from "../MuseSpark";
import { useMuseDropTarget } from "../useMuseDropTarget";
export const MEAL_DRAG_TYPE="application/x-muse-meal";
export type MealOpen=(date:string,slot:Slot,anchor:HTMLElement,onSaved:()=>void,assignment?:DailyMealAssignment)=>void;
export type MealPlace=(assignment:DailyMealAssignment,mode:"move"|"copy",anchor:HTMLElement)=>void;
function MealItem({meal,onOpen,onPlace,onSaved}:{meal:DailyMealAssignment;onOpen:MealOpen;onPlace:MealPlace;onSaved:()=>void}) {
  const [dragging,setDragging]=useState(false);
  return <li className="muse-meal-entry muse-drag-surface" data-dragging={dragging} draggable onDragStart={(event)=>{if((event.target as Element).closest("button,input,a")){event.preventDefault();return;}setDragging(true);event.dataTransfer.setData(MEAL_DRAG_TYPE,meal.id);event.dataTransfer.effectAllowed="move";}} onDragEnd={()=>setDragging(false)}>
    <button type="button" className="muse-meal-title muse-edge" onClick={(event)=>onOpen(meal.date,meal.slot,event.currentTarget,onSaved,meal)}>{meal.title}</button>
    <MealMacros nutrition={meal.nutrition}/>
    <div className="muse-meal-meta"><button className="muse-meal-action" type="button" aria-label={`Move ${meal.title}`} onClick={(event)=>onPlace(meal,"move",event.currentTarget)}>Move</button><button className="muse-meal-action" type="button" aria-label={`Copy ${meal.title}`} onClick={(event)=>onPlace(meal,"copy",event.currentTarget)}>Copy</button></div>
  </li>;
}
export function MealSlot({date,slot,onOpen,onPlace}:{date:string;slot:Slot;onOpen:MealOpen;onPlace:MealPlace}) {
  const {state,dispatch}=useNourish(), {trigger,spark}=useMuseSpark();
  const meals=mealsFor(state,date,slot);
  const {active,dropProps}=useMuseDropTarget(MEAL_DRAG_TYPE,(id)=>{const meal=state.assignments.find((item)=>item.id===id);if(meal&&(meal.date!==date||meal.slot!==slot)){dispatch({type:"assignment/move",id,date,slot});trigger();}});
  const label=slot==="snacks"?"snack":slot;
  return <section className="muse-meal-slot muse-drop-zone" data-slot={slot} data-drop-active={active} data-empty={!meals.length || undefined} aria-label={`${mealLabels[slot]} for ${date}`} {...dropProps}>
    <h3 className="muse-meal-slot-title">{mealLabels[slot]}</h3><ul className="muse-meal-entries">{meals.map((meal)=><MealItem key={meal.id} meal={meal} onOpen={onOpen} onPlace={onPlace} onSaved={trigger}/>)}</ul>
    <button className="muse-meal-add" type="button" aria-label={`Add ${label} on ${date}`} onClick={(event)=>onOpen(date,slot,event.currentTarget,trigger)}><span aria-hidden="true">+</span>{meals.length?"":` ${mealLabels[slot]}`}</button><span className="muse-slot-feedback">{spark}</span>
  </section>;
}
