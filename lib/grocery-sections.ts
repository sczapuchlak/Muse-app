import type { GrocerySection } from "./nourish";
export const UNSORTED_GROCERY_SECTION="unsorted";
export const defaultGrocerySections:GrocerySection[]=[
  {id:"unsorted",name:"Unsorted"},{id:"produce",name:"Produce"},{id:"protein",name:"Meat & Protein"},
  {id:"dairy",name:"Dairy & Eggs"},{id:"pantry",name:"Pantry"},{id:"frozen",name:"Frozen"},
  {id:"bakery",name:"Bakery"},{id:"snacks",name:"Snacks"},{id:"drinks",name:"Beverages"},
  {id:"household",name:"Household"},{id:"personal-care",name:"Personal Care"},{id:"pets",name:"Pets"},{id:"other",name:"Other"},
];

/** Empty lists retain a curated shopping skeleton; populated lists show their actual sections. */
export const emptyGrocerySectionIds = ["produce", "protein", "dairy", "pantry", "bakery", "household"];
export function visibleGrocerySections(sections:GrocerySection[], items:{sectionId:string}[], revealAll=false):GrocerySection[] {
 const ids = new Set(items.length ? items.map((item)=>item.sectionId) : emptyGrocerySectionIds);
 return sections.filter((section)=>revealAll || ids.has(section.id));
}
