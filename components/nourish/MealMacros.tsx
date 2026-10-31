import type { MealNutrition } from "@/lib/models";
import { nutritionFields } from "@/lib/nourish";
const format=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
/** Only recorded values appear; zero is known, blank is not. */
export function MealMacros({nutrition}:{nutrition?:MealNutrition}) {
  const known=nutritionFields.filter((field)=>nutrition?.[field]!==undefined);
  return known.length?<p className="muse-meal-macros" aria-label="Meal nutrition">{known.map((field)=><span key={field}>{field==="calories"?'Cal':field==="protein"?'P':field==="carbs"?'C':'F'} {format.format(nutrition![field]!)}{field==='calories'?'':'g'}</span>)}</p>:null;
}
