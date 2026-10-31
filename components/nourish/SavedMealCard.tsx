import {MuseIconButton} from "../MuseIconButton";
import type { SavedMeal } from "@/lib/nourish";
import { mealLabels } from "@/lib/models";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
const format=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
export function SavedMealCard({meal,onEdit,onRemove}:{meal:SavedMeal;onEdit:(meal:SavedMeal,anchor:HTMLElement)=>void;onRemove:()=>void}) {
  const macros=([['protein','P','g'],['carbs','C','g'],['fat','F','g'],['calories','','cal']] as const).flatMap(([field,label,unit])=>meal.nutrition?.[field]===undefined?[]:[`${label?`${label} `:""}${format.format(meal.nutrition[field])}${unit==="cal"?" ":""}${unit}`]);
  return <li className="muse-saved-meal"><div className="muse-saved-meal-heading"><h3 title={meal.name}>{meal.name}</h3><div className="muse-saved-meal-actions"><MuseIconButton icon="edit" label={`Edit ${meal.name}`} onClick={(event)=>onEdit(meal,event.currentTarget)}/><MuseOverflowMenu label={meal.name} actions={[...(meal.link?[{id:"link",label:"Open reference link",href:meal.link}]:[]),{id:"remove",label:"Remove saved meal",destructive:true,onSelect:onRemove}]}/></div></div>
    <div className="muse-meal-type-labels">{meal.mealTypes.map((slot)=><span key={slot}>{mealLabels[slot]}</span>)}</div>
    {macros.length>0&&<p className="muse-saved-macros" aria-label="Saved meal nutrition">{macros.join(" · ")}</p>}

  </li>;
}
