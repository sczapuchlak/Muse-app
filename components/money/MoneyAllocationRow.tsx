import type { Allocation } from "@/lib/money";
import { allocationActual,formatMoney } from "@/lib/money";
import { shortDate } from "@/lib/display-date";
import { useMoney } from "./MoneyStore";
import type { MoneyOpen } from "./MoneyEditors";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
export function MoneyAllocationRow({allocation,onOpen}:{allocation:Allocation;onOpen:MoneyOpen}) {
 const {state,dispatch}=useMoney(),actual=allocationActual(state,allocation),category=state.categories.find((item)=>item.id===allocation.categoryId);
 return <li className="muse-money-allocation-row">
 <div className="muse-money-allocation-title"><div className="muse-money-allocation-identity">
 <button className="muse-ledger-name" type="button" onClick={(e)=>onOpen({kind:'allocation',initial:allocation,anchor:e.currentTarget})}>{allocation.name}</button>
 <MuseChoiceMenu variant="chip" label={`Category for ${allocation.name}`} valueLabel={category?.name??'Unassigned'} searchable options={[{id:'',label:'Unassigned'},...state.categories.filter((item)=>!item.archived||item.id===allocation.categoryId).map((item)=>({id:item.id,label:item.name,accent:item.accent}))]} selectedIds={[allocation.categoryId??'']} onSelect={(id)=>dispatch({type:'save',collection:'allocations',record:{...allocation,categoryId:id||undefined,subcategoryId:id===allocation.categoryId?allocation.subcategoryId:undefined}})}/>
 </div>{allocation.dueDate&&<small>Due <time dateTime={allocation.dueDate}>{shortDate(allocation.dueDate)}</time></small>}</div>
 <strong className="muse-money-ledger-number" aria-label={`Planned ${formatMoney(allocation.plannedCents)}`}><span className="muse-money-mobile-label">Planned</span>{formatMoney(allocation.plannedCents)}</strong>
 <span className="muse-money-ledger-number" aria-label={`Actual ${formatMoney(actual)}`}><span className="muse-money-mobile-label">Actual</span>{formatMoney(actual)}<small>{actual===null?'Not recorded':actual===allocation.plannedCents?'On plan':actual>allocation.plannedCents?`${formatMoney(actual-allocation.plannedCents)} over`:`${formatMoney(allocation.plannedCents-actual)} under`}</small></span>
 <MuseOverflowMenu label={allocation.name} actions={[{id:'edit',label:'Edit planned amount',onSelect:()=>{const anchor=document.activeElement;if(anchor instanceof HTMLElement)onOpen({kind:'allocation',initial:allocation,anchor});}},{id:'remove',label:'Remove planned amount',destructive:true,onSelect:()=>dispatch({type:'remove',collection:'allocations',id:allocation.id})}]}/></li>;
}
