import type { Allocation } from "@/lib/money";
import {accentStyle} from "@/lib/appearance-values";
import { formatMoney,planLabel } from "@/lib/money";
import { planActual } from "@/lib/money-reconcile";
import { useState } from "react";
import { ActualDetails } from "./ActualDetails";
import { shortDate } from "@/lib/display-date";
import { useMoney } from "./MoneyStore";
import type { MoneyOpen } from "./MoneyEditors";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
export function MoneyAllocationRow({allocation,onOpen}:{allocation:Allocation;onOpen:MoneyOpen}) {
 const {state,dispatch}=useMoney(),detail=planActual(state,allocation),actual=detail.actual,[details,setDetails]=useState<HTMLElement|null>(null),category=state.categories.find((item)=>item.id===allocation.categoryId);
 const label=planLabel(state,allocation);
 return <li className="muse-money-allocation-row" data-money-accent={label.accent} style={accentStyle(label.accent)} data-state={actual===null?"unrecorded":actual>allocation.plannedCents?"over":"within"}>
 <div className="muse-money-allocation-title"><div className="muse-money-allocation-identity">
 <button className="muse-ledger-name" type="button" onClick={(e)=>onOpen({kind:'allocation',initial:allocation,anchor:e.currentTarget})}>{allocation.name}</button>
 <MuseChoiceMenu variant="chip" label={`Category for ${allocation.name}`} valueLabel={category?label.name:label.legacy?`${label.name} · choose a category`:allocation.cardId?label.name:'Choose a category'} searchable options={[{id:'',label:'Unassigned'},...state.categories.filter((item)=>!item.archived||item.id===allocation.categoryId).map((item)=>({id:item.id,label:item.name,accent:item.accent}))]} selectedIds={[allocation.categoryId??'']} onSelect={(id)=>dispatch({type:'save',collection:'allocations',record:{...allocation,categoryId:id||undefined,subcategoryId:id===allocation.categoryId?allocation.subcategoryId:undefined}})}/>
 </div>{allocation.dueDate&&<small>Due <time dateTime={allocation.dueDate}>{shortDate(allocation.dueDate)}</time></small>}</div>
 <strong className="muse-money-ledger-number" aria-label={`Planned ${formatMoney(allocation.plannedCents)}`}><span className="muse-money-mobile-label">Planned</span>{formatMoney(allocation.plannedCents)}</strong>
 <span className="muse-money-ledger-number" aria-label={`Actual ${formatMoney(actual)}`}><span className="muse-money-mobile-label">Actual</span>{formatMoney(actual)}<small>{actual===null?'Nothing recorded yet':actual===allocation.plannedCents?'On plan':actual>allocation.plannedCents?`${formatMoney(actual-allocation.plannedCents)} over`:`${formatMoney(allocation.plannedCents-actual)} under`}{detail.source==='manual'?' · manual':''}</small></span>
 <MuseOverflowMenu label={allocation.name} actions={[{id:'counts',label:'What counts toward this',onSelect:()=>{const anchor=document.activeElement;setDetails(anchor instanceof HTMLElement?anchor:document.body);}},{id:'edit',label:'Edit planned amount',onSelect:()=>{const anchor=document.activeElement;if(anchor instanceof HTMLElement)onOpen({kind:'allocation',initial:allocation,anchor});}},{id:'remove',label:'Remove planned amount',destructive:true,onSelect:()=>dispatch({type:'remove',collection:'allocations',id:allocation.id})}]}/>{details&&<ActualDetails allocation={allocation} anchor={details} onClose={()=>setDetails(null)}/>}</li>;
}
