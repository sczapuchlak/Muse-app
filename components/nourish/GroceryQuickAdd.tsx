"use client";
import { useId,useRef,useState } from "react";
import { createGroceryItem,UNSORTED_GROCERY_SECTION } from "@/lib/nourish";
import { useNourish } from "../NourishStore";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import {useWellness} from "../WellnessStore";
import { MuseIcon } from "../MuseIcon";

export function GroceryQuickAdd({sectionId=UNSORTED_GROCERY_SECTION,sectionName="Unsorted",global=false}:{sectionId?:string;sectionName?:string;global?:boolean}) {
 const {state,dispatch}=useNourish(),[open,setOpen]=useState(global),[name,setName]=useState(""),[quantity,setQuantity]=useState(""),[category,setCategory]=useState(sectionId),[message,setMessage]=useState("");
 const {store,status}=useWellness(),captureId=useRef<string|null>(null);
 const input=useRef<HTMLInputElement>(null),anchor=useRef<HTMLButtonElement>(null),id=useId();
 function close(){setOpen(false);anchor.current?.focus();}
 return <div className={`muse-grocery-quick-add${global?" muse-grocery-quick-add-global":""}`}>
 {!global&&<button ref={anchor} type="button" className="muse-button button-ghost" aria-expanded={open} aria-controls={id} aria-label={`Add item to ${sectionName}`} onClick={()=>setOpen((value)=>!value)}>+ Add item</button>}
 {open&&<form id={id} className={global?"muse-grocery-capture":"muse-grocery-scoped-capture"} onSubmit={(event)=>{event.preventDefault();if(!name.trim()||!status.loaded||status.error)return;const itemId=captureId.current??(captureId.current=crypto.randomUUID());dispatch({type:"grocery/save",item:{...createGroceryItem(name,itemId,new Date().toISOString(),category),quantity:quantity.trim()||undefined}});const captured=name.trim();setMessage(`${captured} queued for saving`);store.whenSaved(()=>setMessage(`${captured} saved`));setName("");setQuantity("");input.current?.focus();}}>
 <label>Item name<input ref={input} type="text" required maxLength={120} placeholder="What do you need?" value={name} onChange={(event)=>{captureId.current=null;setName(event.target.value);}} /></label>
 {global&&<><label>Quantity <span className="small-label">optional</span><input type="text" maxLength={60} placeholder="e.g. 2 cartons" value={quantity} onChange={(event)=>setQuantity(event.target.value)}/></label><div><p className="editor-label">Category</p><MuseChoiceMenu label="Quick-add category" valueLabel={state.grocerySections.find((section)=>section.id===category)?.name??"Unsorted"} options={state.grocerySections.map((section)=>({id:section.id,label:section.name}))} selectedIds={[category]} onSelect={setCategory}/></div></>}
 <button type="submit" className="muse-button button-primary" disabled={!name.trim()||!status.loaded||!!status.error}><MuseIcon name="plus" size={16}/>Add</button>{!global&&<button type="button" className="muse-button button-ghost" onClick={close}>Cancel</button>}
 </form>}<span className="sr-only" role="status">{message}</span>
 </div>;
}
