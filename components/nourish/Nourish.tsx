"use client";
import {WellnessCapture,WellnessSaveStatus} from "../WellnessStore";
import {useDailyData} from "../daily/DailyData";
import { MuseSectionNav } from "../MuseSectionNav";
import { useEffect,useState } from "react";
import { useRouter,useSearchParams } from "next/navigation";
import { dateLabel,shiftDate,validDate,weekDates } from "@/lib/dates";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { mealSlots,mealLabels,type DailyMealAssignment,type MealSlot as Slot } from "@/lib/models";
import { useMuseDate } from "../MuseSession";
import { useMuseToday } from "../useMuseToday";
import { MusePageHeader } from "../MusePageHeader";
import { DateNavigator } from "../DateNavigator";
import { WeekNavigator } from "../WeekNavigator";
import { MuseStar } from "../MuseStar";
import { useNourish } from "../NourishStore";
import { mealsFor } from "@/lib/nourish";
import { DailyNutrition } from "./DailyNutrition";
import { GroceryList } from "./GroceryList";
import { useMuseSpark } from "../MuseSpark";
import { MealSlot,type MealOpen,type MealPlace } from "./MealSlot";
import { MealEditor } from "./MealEditor";
import { MealPlacementEditor } from "./MealPlacementEditor";
import { SavedMealLibrary } from "./SavedMealLibrary";
import "./Nourish.css";

type Editor={kind:"meal";date:string;slot:Slot;initial?:DailyMealAssignment;anchor:HTMLElement;onSaved:()=>void}|{kind:"place";meal:DailyMealAssignment;mode:"move"|"copy";anchor:HTMLElement};
export function Nourish() {const {profile}=useDailyData();
  const [date,setDate]=useMuseDate(dailyEditSample.date.iso),[editor,setEditor]=useState<Editor|null>(null);
  const query=useSearchParams(),router=useRouter(),today=useMuseToday(profile.timeZone),{trigger,spark}=useMuseSpark();
  const requested=query.get("date");
  const {state}=useNourish();
  const view=query.get("view")==="saved-meals"?"saved-meals":query.get("view")==="grocery"?"grocery":"plan";
  useEffect(()=>{if(validDate(requested))setDate(requested);},[requested,setDate]);
  function changeDate(next:string){setDate(next);router.replace(`/nourish?date=${next}&view=${view}`,{scroll:false});}
  const onOpen:MealOpen=(entryDate,slot,anchor,onSaved,initial)=>setEditor({kind:"meal",date:entryDate,slot,anchor,onSaved,initial});
  const onPlace:MealPlace=(meal,mode,anchor)=>setEditor({kind:"place",meal,mode,anchor});
  const week=weekDates(date);
  return <main className="muse-page muse-nourish-page">
    <MusePageHeader title="Nourish"><DateNavigator date={date} onChange={changeDate}/></MusePageHeader>
    <MuseSectionNav label="Nourish sections" current={view} items={[{id:"plan",label:"Plan"},{id:"saved-meals",label:"Saved Meals"},{id:"grocery",label:"Grocery List"}].map((item)=>({...item,href:`/nourish?date=${date}&view=${item.id}`}))}/>
    <WellnessSaveStatus/><WellnessCapture>
    {view==="plan"&&<>
    <div className="muse-nourish-toolbar"><nav aria-label="Meal planning week"><button className="muse-button" type="button" disabled={!today} onClick={()=>changeDate(today)}>This week</button><button className="muse-button" type="button" aria-label="Previous meal planning week" onClick={()=>changeDate(shiftDate(date,-7))}>←</button><button className="muse-button" type="button" aria-label="Next meal planning week" onClick={()=>changeDate(shiftDate(date,7))}>→</button><span className="small-label">{new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${week[0]}T12:00:00Z`))} – {new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${week[6]}T12:00:00Z`))}</span></nav><span className="muse-feedback-anchor" aria-hidden="true">{spark}</span></div>
    <WeekNavigator selectedDate={date} timeZone={profile.timeZone} onChange={changeDate}/>
    <div className="muse-nourish-week" aria-label="Weekly meal plan"><div className="muse-meal-week-heading" aria-hidden="true"><span>Your week</span>{mealSlots.map((slot)=><span key={slot}>{mealLabels[slot]}</span>)}</div>
      {week.map((day)=><section className="muse-nourish-day" key={day} aria-label={dateLabel(day)} data-selected={day===date} data-today={day===today}><header className="muse-meal-day-heading"><h2><time dateTime={day}><span>{new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:"UTC"}).format(new Date(`${day}T12:00:00Z`))}</span><strong>{Number(day.slice(-2))}</strong></time></h2>{day===today&&<MuseStar size={24} color="aqua"/>}</header>{mealSlots.map((slot)=><MealSlot key={slot} date={day} slot={slot} onOpen={onOpen} onPlace={onPlace}/>) }<DailyNutrition meals={mealsFor(state,day)}/></section>)}
    </div>
    </>}
    {view==="saved-meals"&&<SavedMealLibrary/>}
    {view==="grocery"&&<GroceryList/>}
    {editor?.kind==="meal"&&<MealEditor date={editor.date} slot={editor.slot} initial={editor.initial} anchor={editor.anchor} onSaved={editor.onSaved} onClose={()=>setEditor(null)}/>}
    {editor?.kind==="place"&&<MealPlacementEditor meal={editor.meal} mode={editor.mode} anchor={editor.anchor} onSaved={trigger} onClose={()=>setEditor(null)}/>}
    </WellnessCapture><footer className="muse-footer">Meals and groceries save to your account.</footer>
  </main>;
}
