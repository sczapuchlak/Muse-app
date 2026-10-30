import type { MealNutrition } from "@/lib/models";
import { nutritionFields,nutritionLabels,type NutritionField } from "@/lib/nourish";

export type NutritionDraft=Record<NutritionField,string>;
export function nutritionDraft(nutrition?:MealNutrition):NutritionDraft {
  return Object.fromEntries(nutritionFields.map((field)=>[field,nutrition?.[field]===undefined?"":String(nutrition[field])])) as NutritionDraft;
}
export function nutritionValue(draft:NutritionDraft):MealNutrition {
  return Object.fromEntries(nutritionFields.filter((field)=>draft[field].trim()!=="").map((field)=>[field,Number(draft[field])]));
}
export function NutritionFields({value,onChange}:{value:NutritionDraft;onChange:(value:NutritionDraft)=>void}) {
  return <details className="muse-nutrition-editor" onInvalidCapture={(event)=>{const details=event.currentTarget;details.open=true;}}><summary>Nutrition <span className="small-label">optional</span></summary><div className="muse-nutrition-fields">{nutritionFields.map((field)=><label key={field}>{nutritionLabels[field]} <span className="small-label">{field==="calories"?"kcal":"g"}</span><input type="number" min="0" step="any" inputMode="decimal" placeholder="Not entered" value={value[field]} onChange={(event)=>onChange({...value,[field]:event.target.value})}/></label>)}</div><p className="small-label">Only what you choose to track. Blank values stay unknown.</p></details>;
}
