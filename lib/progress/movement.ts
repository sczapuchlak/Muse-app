import type {MovementType} from '../models';
export const movementCategories=['strength','cardio','mobility','other'] as const;
export type MovementCategory=typeof movementCategories[number];
export const movementCategoryLabels:Record<MovementCategory,string>={strength:'Strength',cardio:'Cardio',mobility:'Mobility',other:'Other'};
/** Starter types have a sensible default; custom types stay "Other" until the person classifies them. */
const starterCategories:Record<string,MovementCategory>={'movement-upper':'strength','movement-lower':'strength','movement-cardio':'cardio','movement-walk':'cardio','movement-yoga':'mobility'};
export function movementCategory(type:Pick<MovementType,'id'>&{category?:MovementCategory|null}):MovementCategory{return type.category??starterCategories[type.id]??'other';}
