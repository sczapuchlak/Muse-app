"use client";
import { useState } from "react";
import { mealSlots,mealLabels, type DailyMealAssignment, type MealSlot } from "@/lib/models";
import { createMealAssignment, recentMeals, savedMealsFor, validNutrition } from "@/lib/nourish";
import { dateLabel } from "@/lib/dates";
import { useNourish } from "../NourishStore";
import { MealTypeSelector } from "./MealTypeSelector";
import { NutritionFields,nutritionDraft,nutritionValue } from "./NutritionFields";
import {useWellness} from "../WellnessStore";
import { MuseDrawer } from "../MuseDrawer";

export function MealEditor({date,slot,initial,anchor,onClose,onSaved}:{date:string;slot:MealSlot;initial?:DailyMealAssignment;anchor:HTMLElement;onClose:()=>void;onSaved:()=>void}) {
  const {state,dispatch}=useNourish();
  const {store,status}=useWellness();
  const [captureId]=useState(()=>initial?.id??crypto.randomUUID());
  const [templateId]=useState(()=>crypto.randomUUID());
  const [title,setTitle]=useState(initial?.title??"");
  const [note,setNote]=useState(initial?.note??"");
  const [savedId,setSavedId]=useState(initial?.savedMealId);
  const [saveMeal,setSaveMeal]=useState(false);
  const [mealTypes,setMealTypes]=useState<MealSlot[]>([slot]);
  const [filter,setFilter]=useState<MealSlot|"all">(slot);
  const [nutrition,setNutrition]=useState(()=>nutritionDraft(initial?.nutrition));
  const [error,setError]=useState("");
  const query=title.toLocaleLowerCase("en-US");
  const saved=savedMealsFor(state,filter,query);
  const recent=recentMeals(state).filter((meal)=>meal.title.toLocaleLowerCase("en-US").includes(query));
  return <MuseDrawer title={`${initial?"Edit":"Add"} ${slot==="snacks"?"snack":slot}`} onClose={onClose} returnFocus={anchor}>
    <form className="muse-meal-form" onSubmit={(event)=>{
      event.preventDefault();if(!status.loaded||status.error)return; if(!title.trim())return;
      const macros=nutritionValue(nutrition);if(!validNutrition(macros)){setError("Nutrition values must be finite numbers, zero or greater.");return;}
      const now=new Date().toISOString(); let linkedId=savedId;
      if(saveMeal&&!savedId){
        if(state.savedMeals.some((meal)=>meal.name.toLocaleLowerCase("en-US")===title.trim().toLocaleLowerCase("en-US"))){setError("That meal is already saved. Choose it below, or change the name.");return;}
        linkedId=templateId;dispatch({type:"saved/save",meal:{id:linkedId,name:title.trim(),note:note.trim()||undefined,mealTypes,nutrition:macros,createdAt:now}});
      }
      const assignment=initial?{...initial,title:title.trim(),note:note.trim()||undefined,nutrition:macros,savedMealId:linkedId}:{...createMealAssignment(title,date,slot,captureId,now,linkedId),note:note.trim()||undefined,nutrition:macros};
      dispatch({type:"assignment/save",assignment});store.whenSaved(onSaved);onClose();
    }}>
      <p className="small-label">{dateLabel(date)} · {mealLabels[slot]}</p>
      <label className="editor-label">Meal<input data-drawer-autofocus type="text" required maxLength={160} value={title} placeholder="Tacos. Dinner out. Anything goes." onChange={(event)=>{setTitle(event.target.value);setSavedId(undefined);setError("");}}/></label>
      <label className="editor-label"><span className="muse-field-label">Note <small className="small-label">optional</small></span><textarea rows={2} maxLength={500} value={note} onChange={(event)=>setNote(event.target.value)} placeholder="Use the leftover rice…"/></label>
      {!savedId&&<label className="muse-meal-save-toggle"><input type="checkbox" checked={saveMeal} onChange={(event)=>setSaveMeal(event.target.checked)}/>Save this meal to use again</label>}
      {saveMeal&&!savedId&&<MealTypeSelector value={mealTypes} onChange={setMealTypes}/>}
      <NutritionFields value={nutrition} onChange={setNutrition}/>
      {status.error&&<p role="alert" className="field-error">Resolve the wellness save error before saving this form. Your input is still here.</p>}{error&&<p className="field-error" role="alert">{error}</p>}
      <div className="editor-actions"><button className="muse-button button-primary" type="submit" disabled={!status.loaded||!!status.error}>{initial?"Save meal":"Add meal"}</button><button className="muse-button button-ghost" type="button" onClick={onClose}>Cancel</button>{initial&&<button className="muse-button button-ghost" type="button" onClick={()=>{dispatch({type:"assignment/remove",id:initial.id});onClose();}}>Remove from this day</button>}</div>
    </form>
    <section className="muse-meal-picker" aria-label="Choose a saved or recent meal"><h3>Saved meals</h3><div className="muse-filter-options" role="group" aria-label="Saved meal types">{([slot,'all',...mealSlots.filter(value=>value!==slot)] as const).map(value=><button className="choice-button" type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'All':mealLabels[value]}</button>)}</div><div className="muse-saved-choices">{saved.map((meal)=><button className="popover-choice" key={meal.id} type="button" aria-pressed={savedId===meal.id} onClick={()=>{setTitle(meal.name);setNote(meal.note??"");setSavedId(meal.id);setNutrition(nutritionDraft(meal.nutrition));setSaveMeal(false);setError("");}}>{meal.name}</button>)}{!saved.length&&<p className="small-label">No matching saved meals. Quick text is all you need.</p>}</div>
      {recent.length>0&&<><h3>Recent meals</h3><div className="muse-saved-choices">{recent.map((meal)=><button className="popover-choice" type="button" key={meal.id} onClick={()=>{setTitle(meal.title);setNote(meal.note??"");setSavedId(meal.savedMealId);setNutrition(nutritionDraft(meal.nutrition));setError("");}}>{meal.title}</button>)}</div></>}
    </section>
  </MuseDrawer>;
}
