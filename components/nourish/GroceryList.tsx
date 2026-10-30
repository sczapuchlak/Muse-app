"use client";
import { useRef,useState } from "react";
import { groceryItemsFor,type GroceryItem,type GrocerySection } from "@/lib/nourish";
import { useNourish } from "../NourishStore";
import { MuseIcon } from "../MuseIcon";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { useMuseSpark } from "../MuseSpark";
import { GroceryQuickAdd } from "./GroceryQuickAdd";
import { GroceryItemEditor } from "./GroceryItemEditor";

type EditItem=(item:GroceryItem,anchor:HTMLElement)=>void;
function GroceryRow({item,onEdit,onRemove}:{item:GroceryItem;onEdit:EditItem;onRemove:()=>void}) {
  const {dispatch}=useNourish(),{trigger,spark}=useMuseSpark();
  return <li className="muse-grocery-item" data-complete={item.complete}>
    <button className="muse-grocery-check muse-edge muse-feedback-anchor" type="button" role="checkbox" aria-checked={item.complete} aria-label={`${item.complete?"Uncheck":"Check off"} ${item.name}`} onClick={()=>{dispatch({type:"grocery/complete",id:item.id,complete:!item.complete});if(!item.complete)trigger();}}><MuseIcon name="check" size={17}/>{spark}</button>
    <button type="button" className="muse-grocery-item-copy muse-edge" aria-label={`Edit grocery item ${item.name}`} onClick={(event)=>onEdit(item,event.currentTarget)}><strong>{item.name}</strong>{item.quantity&&<span className="muse-grocery-quantity">{item.quantity}</span>}{item.note&&<span className="small-label muse-grocery-note">{item.note}</span>}</button>
    <MuseOverflowMenu label={item.name} actions={[{id:"remove",label:"Remove item",destructive:true,onSelect:onRemove}]}/>
  </li>;
}
function GroceryCategory({category,onEdit,onRemove}:{category:GrocerySection;onEdit:EditItem;onRemove:(id:string)=>void}) {
  const {state}=useNourish(),items=groceryItemsFor(state,category.id);
  return <details className="muse-grocery-section" open><summary><span>{category.name}</span><span className="small-label">{items.filter((item)=>!item.complete).length} to pick up</span><MuseIcon name="chevron" size={14}/></summary><ul>{items.map((item)=><GroceryRow item={item} key={item.id} onEdit={onEdit} onRemove={()=>onRemove(item.id)}/>)}</ul><GroceryQuickAdd sectionId={category.id} sectionName={category.name}/></details>;
}
export function GroceryList() {
  const {state,dispatch}=useNourish(),[editor,setEditor]=useState<{item:GroceryItem;anchor:HTMLElement}|null>(null);
  const titleRef=useRef<HTMLHeadingElement>(null),complete=state.groceryItems.filter((item)=>item.complete).length;
  return <section aria-label="Grocery list" className="muse-grocery-view">
    <div className="muse-nourish-section-heading"><div><h2 tabIndex={-1} ref={titleRef}>Grocery list</h2><p className="card-description">What you need, with room for a few extras.</p></div><button className="text-button" type="button" disabled={!complete} onClick={()=>dispatch({type:"grocery/clear-completed"})}>Clear completed{complete>0&&` (${complete})`}</button></div>
    <GroceryQuickAdd global/>
    <div className="muse-grocery-sections">{state.grocerySections.map((category)=><GroceryCategory key={category.id} category={category} onEdit={(item,anchor)=>setEditor({item,anchor})} onRemove={(id)=>{dispatch({type:"grocery/remove",id});titleRef.current?.focus();}}/>)}</div>
    {editor&&<GroceryItemEditor item={editor.item} anchor={editor.anchor} onClose={()=>setEditor(null)}/>}
  </section>;
}
