"use client";
import { useRef,useState } from "react";
import { groceryItemsFor,type GroceryItem,type GrocerySection } from "@/lib/nourish";
import { visibleGrocerySections } from "@/lib/grocery-sections";
import { useNourish } from "../NourishStore";
import { MuseIcon } from "../MuseIcon";
import { useMuseSpark } from "../MuseSpark";
import { GroceryQuickAdd } from "./GroceryQuickAdd";
import { GroceryItemEditor } from "./GroceryItemEditor";

type EditItem=(item:GroceryItem,anchor:HTMLElement)=>void;
function GroceryRow({item,onEdit,onRemove}:{item:GroceryItem;onEdit:EditItem;onRemove:()=>void}) {
 const {dispatch}=useNourish(),{trigger,spark}=useMuseSpark();
 return <li className="muse-grocery-item" data-complete={item.complete}>
 <button className="muse-grocery-check muse-feedback-anchor" type="button" role="checkbox" aria-checked={item.complete} aria-label={`${item.complete?"Uncheck":"Check off"} ${item.name}`} onClick={()=>{dispatch({type:"grocery/complete",id:item.id,complete:!item.complete});if(!item.complete)trigger();}}><span><MuseIcon name="check" size={13}/></span>{spark}</button>
 <div className="muse-grocery-item-copy"><strong>{item.name}</strong>{item.quantity&&<span className="muse-grocery-quantity">{item.quantity}</span>}</div>
 <div className="muse-grocery-row-actions"><button className="muse-grocery-icon muse-edge" type="button" title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} onClick={(event)=>onEdit(item,event.currentTarget)}><MuseIcon name="edit" size={16}/></button><button className="muse-grocery-icon muse-edge" type="button" title={`Remove ${item.name}`} aria-label={`Remove ${item.name}`} onClick={onRemove}><MuseIcon name="trash" size={16}/></button></div>
 </li>;
}
function GroceryCategory({category,onEdit,onRemove}:{category:GrocerySection;onEdit:EditItem;onRemove:(item:GroceryItem)=>void}) {
 const {state}=useNourish(),items=groceryItemsFor(state,category.id),remaining=items.filter((item)=>!item.complete).length;
 return <details className="muse-grocery-section" aria-label={category.name} open><summary><span>{category.name}</span><span className="small-label">{items.length?`${remaining} / ${items.length}`:"0 items"}</span><MuseIcon name="chevron" size={14}/></summary><ul>{items.map((item)=><GroceryRow item={item} key={item.id} onEdit={onEdit} onRemove={()=>onRemove(item)}/>)}</ul><GroceryQuickAdd sectionId={category.id} sectionName={category.name}/></details>;
}
export function GroceryList() {
 const {state,dispatch}=useNourish(),[editor,setEditor]=useState<{item:GroceryItem;anchor:HTMLElement}|null>(null),[showAll,setShowAll]=useState(false),[removed,setRemoved]=useState<GroceryItem[]>([]);
 const titleRef=useRef<HTMLHeadingElement>(null),complete=state.groceryItems.filter((item)=>item.complete).length,categories=visibleGrocerySections(state.grocerySections,state.groceryItems,showAll);
 return <section aria-label="Grocery list" className="muse-grocery-view">
 <div className="muse-nourish-section-heading"><div><h2 tabIndex={-1} ref={titleRef}>Grocery list</h2><p className="card-description">{state.groceryItems.length?"A little list. Something lovely to bring home.":"Start with a few essentials. There’s room for the extras."}</p></div><button className="text-button" type="button" disabled={!complete} onClick={()=>{setRemoved(state.groceryItems.filter((item)=>item.complete));dispatch({type:"grocery/clear-completed"});}}>Clear completed{complete>0&&` (${complete})`}</button></div>
 <GroceryQuickAdd global/>
 {removed.length>0&&<div className="muse-grocery-undo" role="status"><span>{removed.length===1?`${removed[0].name} removed`:`${removed.length} items cleared`}</span><button className="text-button" type="button" onClick={()=>{dispatch({type:"grocery/restore",items:removed});setRemoved([]);titleRef.current?.focus();}}>Undo</button><button className="muse-grocery-icon" type="button" aria-label="Dismiss undo" onClick={()=>setRemoved([])}><MuseIcon name="close" size={14}/></button></div>}
 <div className="muse-grocery-category-tools"><span className="small-label">Shopping categories</span><button className="text-button" type="button" aria-pressed={showAll} onClick={()=>setShowAll((value)=>!value)}>{showAll?"Show relevant categories":"Show all categories"}</button></div>
 <div className="muse-grocery-sections">{categories.map((category)=><GroceryCategory key={category.id} category={category} onEdit={(item,anchor)=>setEditor({item,anchor})} onRemove={(item)=>{setRemoved([item]);dispatch({type:"grocery/remove",id:item.id});titleRef.current?.focus();}}/>)}</div>
 {editor&&<GroceryItemEditor item={editor.item} anchor={editor.anchor} onClose={()=>setEditor(null)}/>}</section>;
}
