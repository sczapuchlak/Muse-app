"use client";
import { useId,useRef,useState } from "react";
import { createGroceryItem,UNSORTED_GROCERY_SECTION } from "@/lib/nourish";
import { useNourish } from "../NourishStore";
import { InlineTextEditor } from "../InlineTextEditor";

export function GroceryQuickAdd({sectionId=UNSORTED_GROCERY_SECTION,sectionName="Unsorted",global=false}:{sectionId?:string;sectionName?:string;global?:boolean}) {
  const {dispatch}=useNourish(),[open,setOpen]=useState(false),anchor=useRef<HTMLButtonElement>(null),id=useId();
  function close(){setOpen(false);anchor.current?.focus();}
  return <div className={`muse-grocery-quick-add${global?" muse-grocery-quick-add-global":""}`}>
    <button ref={anchor} type="button" className={global?"muse-button muse-edge":"text-button"} aria-expanded={open} aria-controls={id} aria-label={global?"Quick add anything to Unsorted":`Add item to ${sectionName}`} onClick={()=>setOpen((value)=>!value)}>{global?"+ Quick add anything…":"+ Add"}</button>
    {open&&<div id={id}><InlineTextEditor id={`${id}-name`} label={global?"Add anything · goes to Unsorted":`Add to ${sectionName}`} initialValue="" maxLength={120} submitLabel="Add" onCancel={close} onSave={(name)=>{if(!name.trim())return "Enter an item name.";dispatch({type:"grocery/save",item:createGroceryItem(name,crypto.randomUUID(),new Date().toISOString(),sectionId)});close();return null;}}/></div>}
  </div>;
}
