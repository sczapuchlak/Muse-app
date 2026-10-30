import { defaultGrocerySections,type NourishState } from "./nourish";
import type { DailyMealAssignment } from "./models";
// Illustrative, manually seeded nutrition values are sample data, never inferred from names.
// One set of seed assignments; both views consume Nourish's canonical live collection.
export const nourishSeedAssignments: DailyMealAssignment[] = [
  { id:"meal-2026-10-29-breakfast",date:"2026-10-29",slot:"breakfast",title:"Greek yogurt, berries & honey",recipeId:null,order:0,savedMealId:"yogurt",nutrition:{calories:310,protein:23,carbs:40,fat:8} },
  { id:"meal-2026-10-29-lunch",date:"2026-10-29",slot:"lunch",title:"Lunch out with Sophie",recipeId:null,order:0,note:"The corner café" },
  { id:"meal-2026-10-29-dinner",date:"2026-10-29",slot:"dinner",title:"Lemon salmon & roasted greens",recipeId:null,order:0,savedMealId:"salmon",nutrition:{calories:520,protein:35,carbs:58,fat:18} },
  { id:"meal-2026-10-29-snacks",date:"2026-10-29",slot:"snacks",title:"Apple slices & almond butter",recipeId:null,order:0 },
  { id:"meal-2026-10-28-dinner",date:"2026-10-28",slot:"dinner",title:"Taco bowls",recipeId:null,order:0,savedMealId:"tacos" },
  { id:"meal-2026-10-30-lunch",date:"2026-10-30",slot:"lunch",title:"Chicken wrap",recipeId:null,order:0 },
];
export const nourishSample: NourishState = {
  assignments:nourishSeedAssignments,
  grocerySections:defaultGrocerySections.map((section)=>({...section})),
  groceryItems:[],
  savedMeals:[
    {id:"yogurt",nutrition:{calories:310,protein:23,carbs:40,fat:8},name:"Greek yogurt, berries & honey",mealTypes:["breakfast","snacks"],createdAt:"2026-10-25T12:00:00Z"},
    {id:"tacos",name:"Taco bowls",mealTypes:["lunch","dinner"],note:"Easy to use up what's in the fridge",createdAt:"2026-10-25T12:00:00Z"},
    {id:"salmon",nutrition:{calories:520,protein:35,carbs:58,fat:18},name:"Lemon salmon & roasted greens",mealTypes:["lunch","dinner"],createdAt:"2026-10-25T12:00:00Z"},
    {id:"latte",nutrition:{calories:430,protein:38,carbs:47,fat:11},name:"Protein latte + bagel",mealTypes:["breakfast","snacks"],createdAt:"2026-10-25T12:00:00Z"},
  ],
};
