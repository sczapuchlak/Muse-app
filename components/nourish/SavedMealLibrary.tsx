"use client";
import {MuseChoiceMenu} from "../MuseChoiceMenu";
import { useRef,useState } from "react";
import { mealSlots,mealLabels,type MealSlot } from "@/lib/models";
import { safeMealLink,savedMealsFor,sortSavedMeals,validNutrition,type SavedMeal,type SavedMealSort } from "@/lib/nourish";
import { useNourish } from "../NourishStore";
import {useWellness} from "../WellnessStore";
import { MuseDrawer } from "../MuseDrawer";
import { useMuseSpark } from "../MuseSpark";
import { SavedMealCard } from "./SavedMealCard";
import { MealTypeSelector } from "./MealTypeSelector";
import { NutritionFields,nutritionDraft,nutritionValue } from "./NutritionFields";
import {MuseSearch} from '@/components/design/MuseSearch';

function SavedMealEditor({initial,anchor,onClose,onSaved}:{initial?:SavedMeal;anchor:HTMLElement;onClose:()=>void;onSaved:()=>void}) {
  const {state,dispatch}=useNourish();
  const {store,status}=useWellness();
  const [captureId]=useState(()=>initial?.id??crypto.randomUUID());
  const [name,setName]=useState(initial?.name??""),[note,setNote]=useState(initial?.note??""),[link,setLink]=useState(initial?.link??""),[types,setTypes]=useState<MealSlot[]>(initial?.mealTypes??[]),[nutrition,setNutrition]=useState(()=>nutritionDraft(initial?.nutrition)),[error,setError]=useState("");
  return <MuseDrawer title={initial?"Edit saved meal":"Add saved meal"} onClose={onClose} returnFocus={anchor}>
    <form className="muse-meal-form" onSubmit={(event)=>{
      event.preventDefault();if(!status.loaded||status.error)return;if(!name.trim())return;
      if(link.trim()&&!safeMealLink(link)){setError("Use a full http or https link.");return;}
      if(state.savedMeals.some((meal)=>meal.id!==initial?.id&&meal.name.toLocaleLowerCase("en-US")===name.trim().toLocaleLowerCase("en-US"))){setError("A saved meal already uses that name.");return;}
      const macros=nutritionValue(nutrition);if(!validNutrition(macros)){setError("Nutrition values must be finite numbers, zero or greater.");return;}
      dispatch({type:"saved/save",meal:{id:captureId,name,note:note.trim()||undefined,link:link.trim()||undefined,mealTypes:types,nutrition:macros,createdAt:initial?.createdAt??new Date().toISOString()}});store.whenSaved(onSaved);onClose();
    }}>
      <label>Name<input data-drawer-autofocus type="text" required maxLength={160} value={name} onChange={(event)=>setName(event.target.value)}/></label>
      <MealTypeSelector value={types} onChange={setTypes}/>
      <label>Note · optional<textarea rows={2} maxLength={500} value={note} onChange={(event)=>setNote(event.target.value)}/></label>
      <label>Link · optional<input type="url" value={link} onChange={(event)=>setLink(event.target.value)} placeholder="https://…"/></label>
      <NutritionFields value={nutrition} onChange={setNutrition}/>
      {status.error&&<p role="alert" className="field-error">Resolve the wellness save error before saving this form. Your input is still here.</p>}{error&&<p role="alert" className="field-error">{error}</p>}
      <div className="editor-actions"><button className="muse-button button-primary" type="submit" disabled={!status.loaded||!!status.error}>Save meal</button><button className="muse-button button-ghost" type="button" onClick={onClose}>Cancel</button></div>
      <p className="small-label">Defaults for next time. Existing plans keep their own names, notes and nutrition values.</p>
    </form>
  </MuseDrawer>;
}

export function SavedMealLibrary() {
  const {state,dispatch}=useNourish(),{trigger,spark}=useMuseSpark();
  const [filter,setFilter]=useState<MealSlot|"all">("all"),[query,setQuery]=useState("");
  const [editor,setEditor]=useState<{initial?:SavedMeal;anchor:HTMLElement}|null>(null);
  const [sort,setSort]=useState<SavedMealSort>("az"),sortOptions=[{id:"az",label:"Name: A–Z"},{id:"za",label:"Name: Z–A"},{id:"newest",label:"Recently added"},{id:"oldest",label:"Oldest added"}];
  const meals=sortSavedMeals(savedMealsFor(state,filter,query),sort);
  const addAnchor=useRef<HTMLButtonElement>(null);
  return <section aria-label="Saved meals" className="muse-saved-view">
    <div className="muse-nourish-section-heading"><div><h2>Saved meals</h2><p className="card-description">The things you like coming back to. No recipe required.</p></div><button ref={addAnchor} className="muse-button button-primary muse-feedback-anchor" type="button" onClick={(event)=>setEditor({anchor:event.currentTarget})}>+ Add saved meal{spark}</button></div>
    <div className="muse-library-toolbar"><MuseSearch label="Find a saved meal" value={query} onChange={setQuery} placeholder="Find a meal…"/><div className="muse-filter-options" role="group" aria-label="Filter saved meals by type"><button className="choice-button" type="button" aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>All</button>{mealSlots.map((slot)=><button className="choice-button" type="button" key={slot} aria-pressed={filter===slot} onClick={()=>setFilter(slot)}>{mealLabels[slot]}</button>)}<MuseChoiceMenu label="Sort saved meals" variant="icon" valueLabel={sortOptions.find(o=>o.id===sort)!.label} options={sortOptions} selectedIds={[sort]} onSelect={id=>setSort(id as SavedMealSort)}/></div></div>
    <ul className="muse-saved-grid">{meals.map((meal)=><SavedMealCard key={meal.id} meal={meal} onEdit={(initial,anchor)=>setEditor({initial,anchor})} onRemove={()=>{dispatch({type:"saved/remove",id:meal.id});addAnchor.current?.focus();}}/>)}</ul>
    {!meals.length&&<p className="muse-empty-state muse-nourish-empty" data-variant="quiet">{query||filter!=="all"?"No saved meals match. Try All or a different search.":"A good meal is worth remembering. Save your first one."}</p>}
    {editor&&<SavedMealEditor initial={editor.initial} anchor={editor.anchor} onClose={()=>setEditor(null)} onSaved={trigger}/>}
  </section>;
}
