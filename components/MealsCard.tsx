"use client";
import Link from "next/link";
import { mealLabels,mealSlots,type MealSlot } from "@/lib/models";
import { createMealAssignment,mealsFor } from "@/lib/nourish";
import { useNourish } from "./NourishStore";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { DailyNutrition } from "./nourish/DailyNutrition";
import { EditableText } from "./EditableText";
const DAILY_MEAL_PREVIEW=2;
export function MealsCard({selectedDate}:{selectedDate:string}) {
  const {state,dispatch}=useNourish();
  function add(slot:MealSlot,title:string){if(title.trim())dispatch({type:"assignment/save",assignment:createMealAssignment(title,selectedDate,slot,crypto.randomUUID(),new Date().toISOString())});}
  return <MuseCard id="meals" className="meals-card"><CardHeading id="meals" title="Meals" icon="meals" sourceModule="nourish" manage={{href:`/nourish?date=${selectedDate}&view=plan`}}/>
    <dl className="meal-list">{mealSlots.map((slot)=>{const meals=mealsFor(state,selectedDate,slot);return <div className="meal-item" key={slot}><dt>{mealLabels[slot]}</dt><dd>{meals.slice(0,DAILY_MEAL_PREVIEW).map((meal)=><div className="muse-daily-meal" key={meal.id}><EditableText value={meal.title} label={`Edit ${mealLabels[slot].toLowerCase()}`} allowEmpty placeholder={`Add ${slot}`} onSave={(title)=>{if(!title.trim())dispatch({type:"assignment/remove",id:meal.id});else dispatch({type:"assignment/save",assignment:{...meal,title,savedMealId:title===meal.title?meal.savedMealId:undefined}});}}/></div>)}{!meals.length&&<EditableText value="" label={`Add ${slot}`} allowEmpty placeholder={`Add ${slot==="snacks"?"snack":slot}`} onSave={(title)=>add(slot,title)}/>} {meals.length>DAILY_MEAL_PREVIEW&&<Link className="small-label" href={`/nourish?date=${selectedDate}&view=plan`}>+ {meals.length-DAILY_MEAL_PREVIEW} more</Link>}</dd></div>;})}</dl><DailyNutrition meals={mealsFor(state,selectedDate)} compact/>
  </MuseCard>;
}
