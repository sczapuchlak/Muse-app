import { mealLabels, mealSlots, type MealSlot } from "@/lib/models";

export function MealTypeSelector({value,onChange}:{value:MealSlot[];onChange:(value:MealSlot[])=>void}) {
  return <fieldset><legend>Meal types · choose any</legend><div className="muse-filter-options">{mealSlots.map((slot)=><button className="choice-button" type="button" key={slot} aria-pressed={value.includes(slot)} onClick={()=>onChange(value.includes(slot)?value.filter((item)=>item!==slot):[...value,slot])}>{mealLabels[slot]}</button>)}</div></fieldset>;
}
