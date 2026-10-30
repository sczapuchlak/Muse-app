import type { DailyMealAssignment } from "@/lib/models";
import { dailyNutrition,nutritionFields,nutritionLabels } from "@/lib/nourish";

import "./DailyNutrition.css";

const format=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
export function DailyNutrition({meals,compact=false}:{meals:DailyMealAssignment[];compact?:boolean}) {
  const total=dailyNutrition(meals);
  if(!total.trackedMeals)return null;
  const fields=compact?nutritionFields.filter((field)=>total.fields[field].value!==null).slice(0,2):nutritionFields;
  return <section className={`muse-nutrition-total${compact?" muse-nutrition-total-compact":""}`} aria-label="Daily nutrition totals">
    <div className="muse-nutrition-caption"><span>{total.complete?"Daily total":"Known daily total"}</span><small>{total.trackedMeals} of {total.mealCount} meals with data{!total.complete&&" · Incomplete"}</small></div>
    <dl>{fields.map((field)=>{const {value,trackedMeals}=total.fields[field];return <div key={field} title={`${trackedMeals} of ${total.mealCount} meals have ${nutritionLabels[field].toLowerCase()} entered`}><dt>{nutritionLabels[field]}</dt><dd>{value===null?"—":format.format(value)}{value!==null&&<span> {field==="calories"?"kcal":"g"}</span>}</dd><span className="sr-only">{trackedMeals} of {total.mealCount} meals tracked for {nutritionLabels[field].toLowerCase()}</span></div>;})}</dl>
  </section>;
}
