import { mealSlots, type DailyMealAssignment, type MealSlot, type MealNutrition } from "./models";
import { validDate } from "./dates";
export type SavedMeal = { id: string; name: string; mealTypes: MealSlot[]; nutrition?: MealNutrition; note?: string; link?: string; createdAt: string };
export type GrocerySection = { id: string; name: string };
export type GroceryItem = { id: string; name: string; quantity?: string; note?: string; sectionId: string; complete: boolean; createdAt: string };
export const UNSORTED_GROCERY_SECTION="unsorted";
export const defaultGrocerySections:GrocerySection[]=[
  {id:"unsorted",name:"Unsorted"},{id:"produce",name:"Produce"},{id:"protein",name:"Meat & Protein"},
  {id:"dairy",name:"Dairy & Eggs"},{id:"pantry",name:"Pantry"},{id:"frozen",name:"Frozen"},
  {id:"bakery",name:"Bakery"},{id:"snacks",name:"Snacks"},{id:"drinks",name:"Beverages"},
  {id:"household",name:"Household"},{id:"personal-care",name:"Personal Care"},{id:"pets",name:"Pets"},{id:"other",name:"Other"},
];
export function createGroceryItem(name:string,id:string,now:string,sectionId=UNSORTED_GROCERY_SECTION):GroceryItem {
  return {id,name:name.trim(),sectionId,complete:false,createdAt:now};
}
export function groceryItemsFor(state:NourishState,sectionId:string) {
  return state.groceryItems.filter((item)=>item.sectionId===sectionId).sort((a,b)=>Number(a.complete)-Number(b.complete));
}
export type NourishState = { assignments: DailyMealAssignment[]; savedMeals: SavedMeal[]; groceryItems: GroceryItem[]; grocerySections: GrocerySection[] };
export type NourishAction =
  | { type: "assignment/save"; assignment: DailyMealAssignment }
  | { type: "assignment/remove"; id: string }
  | { type: "assignment/move"; id: string; date: string; slot: MealSlot }
  | { type: "assignment/copy"; id: string; targets: { id: string; date: string; slot: MealSlot }[]; now: string }
  | { type: "saved/save"; meal: SavedMeal }
  | { type: "saved/remove"; id: string }
  | { type: "grocery/save"; item: Omit<GroceryItem,"sectionId"> & {sectionId?:string} }
  | { type: "grocery/complete"; id: string; complete: boolean }
  | { type: "grocery/remove"; id: string }
  | { type: "grocery/clear-completed" };
export function createMealAssignment(title: string, date: string, slot: MealSlot, id: string, now: string, savedMealId?: string): DailyMealAssignment {
  return { id, date, slot, title: title.trim(), savedMealId, recipeId: null, order: 0, createdAt: now };
}
export function mealsFor(state: NourishState, date: string, slot?: MealSlot) {
  return state.assignments.filter((item) => item.date === date && (!slot || item.slot === slot)).sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
}
export function safeMealLink(link?: string) {
  if (!link?.trim()) return undefined;
  try { const url = new URL(link); return ["http:","https:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export function recentMeals(state: NourishState) {
  const names = new Set<string>();
  return [...state.assignments].sort((a,b)=>(b.createdAt??b.date).localeCompare(a.createdAt??a.date)).filter((item)=>{
    const key=item.title.toLocaleLowerCase("en-US"); if(names.has(key))return false; names.add(key); return true;
  }).slice(0,8);
}
function validPlace(date: string, slot: MealSlot) { return validDate(date) && mealSlots.includes(slot); }
function nextOrder(state: NourishState, date: string, slot: MealSlot) { return Math.max(-1,...mealsFor(state,date,slot).map((item)=>item.order??0))+1; }
export function nourishReducer(state: NourishState, action: NourishAction): NourishState {
  switch(action.type) {
    case "assignment/save": {
      const item=action.assignment;
      if(!item.title.trim() || !validPlace(item.date,item.slot) || !validNutrition(item.nutrition))return state;
      const existing=state.assignments.find((entry)=>entry.id===item.id);
      const next={...item,nutrition:cleanNutrition(item.nutrition),title:item.title.trim(),order:existing?.order??nextOrder(state,item.date,item.slot),savedMealId:state.savedMeals.some((meal)=>meal.id===item.savedMealId)?item.savedMealId:undefined};
      return {...state,assignments:existing?state.assignments.map((entry)=>entry.id===item.id?next:entry):[...state.assignments,next]};
    }
    case "assignment/remove": return {...state,assignments:state.assignments.filter((item)=>item.id!==action.id)};
    case "assignment/move": {
      if(!validPlace(action.date,action.slot))return state;
      const item=state.assignments.find((entry)=>entry.id===action.id);
      if(!item || (item.date===action.date&&item.slot===action.slot))return state;
      return {...state,assignments:state.assignments.map((entry)=>entry.id===action.id?{...entry,date:action.date,slot:action.slot,order:nextOrder(state,action.date,action.slot)}:entry)};
    }
    case "assignment/copy": {
      const item=state.assignments.find((entry)=>entry.id===action.id); if(!item)return state;
      return action.targets.reduce((next,target)=>next.assignments.some((entry)=>entry.id===target.id)?next:nourishReducer(next,{type:"assignment/save",assignment:{...item,...target,createdAt:action.now}}),state);
    }
    case "saved/save": {
      const meal=action.meal; if(!meal.name.trim() || !validNutrition(meal.nutrition))return state;
      const next={...meal,name:meal.name.trim(),mealTypes:[...new Set(meal.mealTypes.filter((slot)=>mealSlots.includes(slot)))],nutrition:cleanNutrition(meal.nutrition),link:safeMealLink(meal.link)};
      return {...state,savedMeals:state.savedMeals.some((entry)=>entry.id===meal.id)?state.savedMeals.map((entry)=>entry.id===meal.id?next:entry):[...state.savedMeals,next]};
    }
    case "grocery/save": {
      const item={...action.item,sectionId:action.item.sectionId||UNSORTED_GROCERY_SECTION};
      const sections=item.sectionId===UNSORTED_GROCERY_SECTION&&!state.grocerySections.some((section)=>section.id===UNSORTED_GROCERY_SECTION)?[{id:UNSORTED_GROCERY_SECTION,name:"Unsorted"},...state.grocerySections]:state.grocerySections;
      if(!item.name.trim() || !sections.some((section)=>section.id===item.sectionId))return state;
      const next={...item,name:item.name.trim(),quantity:item.quantity?.trim()||undefined,note:item.note?.trim()||undefined};
      return {...state,grocerySections:sections,groceryItems:state.groceryItems.some((entry)=>entry.id===item.id)?state.groceryItems.map((entry)=>entry.id===item.id?next:entry):[...state.groceryItems,next]};
    }
    case "grocery/complete": return {...state,groceryItems:state.groceryItems.map((item)=>item.id===action.id?{...item,complete:action.complete}:item)};
    case "grocery/remove": return {...state,groceryItems:state.groceryItems.filter((item)=>item.id!==action.id)};
    case "grocery/clear-completed": return {...state,groceryItems:state.groceryItems.filter((item)=>!item.complete)};
    case "saved/remove": return {...state,savedMeals:state.savedMeals.filter((meal)=>meal.id!==action.id),assignments:state.assignments.map((item)=>item.savedMealId===action.id?{...item,savedMealId:undefined}:item)};
  }
}


export const nutritionFields = ["calories", "protein", "carbs", "fat"] as const;
export type NutritionField = typeof nutritionFields[number];
export const nutritionLabels: Record<NutritionField,string> = {calories:"Calories",protein:"Protein",carbs:"Carbs",fat:"Fat"};
export function validNutrition(nutrition?: MealNutrition): boolean {
  return !nutrition || nutritionFields.every((field)=>nutrition[field]===undefined || (typeof nutrition[field]==="number" && Number.isFinite(nutrition[field]) && nutrition[field]! >= 0));
}
export function cleanNutrition(nutrition?: MealNutrition): MealNutrition | undefined {
  if(!nutrition || !validNutrition(nutrition))return undefined;
  const entries=nutritionFields.filter((field)=>nutrition[field]!==undefined).map((field)=>[field,nutrition[field]]);
  return entries.length?Object.fromEntries(entries):undefined;
}
export function dailyNutrition(meals: DailyMealAssignment[]) {
  const fields=Object.fromEntries(nutritionFields.map((field)=>{
    const values=meals.flatMap((meal)=>typeof meal.nutrition?.[field]==="number" && Number.isFinite(meal.nutrition[field]) && meal.nutrition[field]! >= 0?[meal.nutrition[field]!]:[]);
    return [field,{value:values.length?Math.round(values.reduce((sum,value)=>sum+value,0)*100)/100:null,trackedMeals:values.length}];
  })) as Record<NutritionField,{value:number|null;trackedMeals:number}>;
  const trackedMeals=meals.filter((meal)=>nutritionFields.some((field)=>meal.nutrition?.[field]!==undefined)).length;
  return {fields,mealCount:meals.length,trackedMeals,complete:meals.length>0&&nutritionFields.every((field)=>fields[field].trackedMeals===meals.length)};
}
export function savedMealsFor(state:NourishState,slot:MealSlot|"all",query="") {
  return state.savedMeals.filter((meal)=>(slot==="all"||meal.mealTypes.includes(slot))&&meal.name.toLocaleLowerCase("en-US").includes(query.trim().toLocaleLowerCase("en-US")));
}
