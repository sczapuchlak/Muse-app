"use client";
import { useState } from "react";
import type { GroceryItem } from "@/lib/nourish";
import { useNourish } from "../NourishStore";
import {useWellness} from "../WellnessStore";
import { MuseDrawer } from "../MuseDrawer";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
export function GroceryItemEditor({item,anchor,onClose}:{item:GroceryItem;anchor:HTMLElement;onClose:()=>void}) {
  const {state,dispatch}=useNourish();
  const {status}=useWellness();
  const [name,setName]=useState(item.name),[quantity,setQuantity]=useState(item.quantity??""),[note,setNote]=useState(item.note??""),[sectionId,setSectionId]=useState(item.sectionId);
  return <MuseDrawer title="Grocery item" returnFocus={anchor} onClose={onClose}><form className="muse-meal-form" onSubmit={(event)=>{event.preventDefault();if(!status.loaded||status.error)return;const current=state.groceryItems.find((entry)=>entry.id===item.id);if(!name.trim()||!current)return;dispatch({type:"grocery/save",item:{...current,name,quantity,note,sectionId}});onClose();}}>
    <label>Item<input data-drawer-autofocus type="text" required maxLength={120} value={name} onChange={(event)=>setName(event.target.value)}/></label>
    <label>Quantity · optional<input type="text" maxLength={60} placeholder="2 containers, 500 g…" value={quantity} onChange={(event)=>setQuantity(event.target.value)}/></label>
    <div><p className="editor-label">Category</p><MuseChoiceMenu label="Grocery category" valueLabel={state.grocerySections.find((section)=>section.id===sectionId)?.name??"Unsorted"} options={state.grocerySections.map((section)=>({id:section.id,label:section.name}))} selectedIds={[sectionId]} onSelect={setSectionId}/></div>
    <label>Note · optional<textarea rows={2} maxLength={250} placeholder="Green-ish bananas…" value={note} onChange={(event)=>setNote(event.target.value)}/></label>
    {status.error&&<p role="alert">Resolve the wellness save error before saving this item. Your input is still here.</p>}<div className="editor-actions"><button className="muse-button button-primary" type="submit" disabled={!status.loaded||!!status.error}>Save item</button><button className="text-button" type="button" onClick={onClose}>Cancel</button></div>
  </form></MuseDrawer>;
}
