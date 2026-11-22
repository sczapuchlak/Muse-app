"use client";
import {pinAccent} from "@/lib/appearance-values";
import {MuseIconPicker} from "../MuseIconPicker";
import { useState } from "react";
import { categoryUses,moneyError,type MoneyCategory,type MoneyTag,type AllocationGroup,type MoneyAccent } from "@/lib/money";
import type { MuseIconName } from "../MuseIcon";
import { useMoney } from "./MoneyStore";
import { MuseDrawer } from "../MuseDrawer";
import { MoneyField,MoneyColor } from "./MoneyFields";
export function CategoryEditor({initial,anchor,onClose}:{initial?:MoneyCategory;anchor:HTMLElement;onClose:()=>void}){
 const [captureId]=useState(()=>crypto.randomUUID());
 const {state,dispatch,status}=useMoney(),[name,setName]=useState(initial?.name??""),[accent,setAccent]=useState<MoneyAccent>(initial?.accent??"primary"),[icon,setIcon]=useState<MuseIconName|"">(initial?.icon??""),[subs,setSubs]=useState(initial?.subcategories??[]),[newSub,setNewSub]=useState(""),[error,setError]=useState("");
 return <MuseDrawer title={initial?"Edit category":"New category"} returnFocus={anchor} onClose={onClose}><form className="muse-money-form" onSubmit={(e)=>{e.preventDefault();if(!status.loaded||status.error)return;const record:MoneyCategory={id:initial?.id??captureId,name,accent:pinAccent(accent),icon:icon as MuseIconName||undefined,archived:initial?.archived??false,subcategories:subs},action={type:"save" as const,collection:"categories" as const,record};const message=moneyError(state,action);if(message){setError(message);return;}dispatch(action);onClose();}}><MoneyField label="Category name"><input data-drawer-autofocus required type="text" maxLength={60} value={name} onChange={(e)=>setName(e.target.value)}/></MoneyField><MoneyColor value={accent} onChange={setAccent}/><MuseIconPicker value={icon} onChange={setIcon}/><fieldset className="muse-money-subcategories"><legend>Subcategories</legend><div className="muse-money-fieldset-body"><p className="small-label">Rename any subcategory here; Save keeps the change everywhere it’s used.</p>{subs.map((sub)=><SubcategoryRow key={sub.id} name={sub.name} uses={initial&&initial.subcategories.some((x)=>x.id===sub.id)?categoryUses(state,initial.id,sub.id):{total:0,summary:""}}
  onRename={(name)=>setSubs((items)=>items.map((item)=>item.id===sub.id?{...item,name}:item))}
  onDelete={()=>{setSubs((items)=>items.filter((item)=>item.id!==sub.id));if(initial?.subcategories.some((x)=>x.id===sub.id))dispatch({type:"delete-subcategory",categoryId:initial.id,id:sub.id});}}/>)}<div className="muse-money-inline-add"><input type="text" aria-label="New subcategory name" placeholder="Add a subcategory" value={newSub} onChange={(e)=>setNewSub(e.target.value)} maxLength={60}/><button className="muse-button" type="button" disabled={!newSub.trim()} onClick={()=>{setSubs((items)=>[...items,{id:crypto.randomUUID(),name:newSub.trim()}]);setNewSub("");}}>Add</button></div></div></fieldset><p className="small-label">Archive categories to preserve their historical references. Renaming keeps their identity.</p>{error&&<p className="field-error" role="alert">{error}</p>}<button className="muse-button button-primary" type="submit" disabled={!status.loaded||!!status.error}>Save category</button>{initial&&<DeleteCategory category={initial} onDeleted={onClose}/>}</form></MuseDrawer>;
}
export function TaxonomyEditor({kind,initial,anchor,onClose}:{kind:"tags"|"groups";initial?:MoneyTag|AllocationGroup;anchor:HTMLElement;onClose:()=>void}){
 const [captureId]=useState(()=>crypto.randomUUID());
 const {state,dispatch,status}=useMoney(),[name,setName]=useState(initial?.name??""),[accent,setAccent]=useState<MoneyAccent>(initial&&'accent' in initial?initial.accent:"secondary"),[error,setError]=useState("");
 return <MuseDrawer title={`${initial?"Edit":"New"} ${kind==="tags"?"tag":"planning group"}`} returnFocus={anchor} onClose={onClose}><form className="muse-money-form" onSubmit={(e)=>{e.preventDefault();if(!status.loaded||status.error)return;const id=initial?.id??captureId,action=kind==="tags"?{type:"save" as const,collection:"tags" as const,record:{id,name:name.replace(/^#/,""),archived:initial&&'archived' in initial?initial.archived:false}}:{type:"save" as const,collection:"groups" as const,record:{id,name,accent:pinAccent(accent)}};const message=moneyError(state,action);if(message){setError(message);return;}dispatch(action);onClose();}}><MoneyField label="Name"><input data-drawer-autofocus type="text" required maxLength={60} value={name} onChange={(e)=>setName(e.target.value)}/></MoneyField>{kind==="groups"&&<MoneyColor value={accent} onChange={setAccent}/>} {error&&<p className="field-error" role="alert">{error}</p>}<button className="muse-button button-primary" type="submit" disabled={!status.loaded||!!status.error}>Save</button></form></MuseDrawer>;
}

/** One subcategory: rename it in place, or delete it. Records that used it keep their category. */
function SubcategoryRow({name,uses,onRename,onDelete}:{name:string;uses:{total:number;summary:string};onRename:(name:string)=>void;onDelete:()=>void}){
 const [confirm,setConfirm]=useState(false);
 return <div className="muse-money-subcategory"><div className="muse-money-subcategory-row"><input type="text" aria-label="Subcategory name" required maxLength={60} value={name} onChange={(e)=>onRename(e.target.value)}/>
  <button type="button" className="muse-button button-ghost" aria-label={`Delete ${name||"subcategory"}`} onClick={()=>uses.total?setConfirm(true):onDelete()}>Delete</button></div>
  {confirm&&<div className="muse-money-confirm" role="alertdialog" aria-label={`Delete ${name}?`}><p>{`${uses.summary} use “${name}”. They’ll keep the category and lose just this subcategory.`}</p>
   <div className="editor-actions"><button type="button" className="muse-button" onClick={()=>setConfirm(false)}>Keep it</button><button type="button" className="muse-button muse-money-danger" onClick={()=>{setConfirm(false);onDelete();}}>Delete subcategory</button></div></div>}
 </div>;
}

/** Delete a category for good (Archive keeps it for history instead). What used it stays, without a category. */
function DeleteCategory({category,onDeleted}:{category:MoneyCategory;onDeleted:()=>void}){
 const {state,dispatch,status}=useMoney(),[confirm,setConfirm]=useState(false),uses=categoryUses(state,category.id);
 if(!confirm)return <button type="button" className="muse-button button-ghost muse-money-danger-text" disabled={!status.loaded||!!status.error} onClick={()=>setConfirm(true)}>Delete category</button>;
 return <div className="muse-money-confirm" role="alertdialog" aria-label={`Delete ${category.name}?`}>
  <p>{uses.total?`${uses.summary} use “${category.name}”. They’ll stay, without a category. To keep its history instead, archive it.`:`Delete “${category.name}” and its subcategories? Nothing uses it.`}</p>
  <div className="editor-actions"><button type="button" className="muse-button" onClick={()=>setConfirm(false)}>Keep it</button><button type="button" className="muse-button muse-money-danger" onClick={()=>{dispatch({type:"delete-category",id:category.id});onDeleted();}}>Delete category</button></div>
 </div>;
}

