import { validDate,shiftDate } from "./dates";
export type Recurrence={interval:number;unit:"day"|"week"|"month"|"year"};
export type RecurringPayment={id:string;name:string;amountCents?:number;amountBehavior:"fixed"|"estimated";categoryId?:string;recurrence:Recurrence;nextChargeDate:string;billingSource:string;cardId?:string;paymentMethodId?:string;status:"active"|"paused"|"cancelled";note?:string;manageAt?:string;cancelledDate?:string;endDate?:string};
export type ManualPaymentMethod={id:string;name:string};
export const recurrencePresets=[{id:"monthly",label:"Monthly",value:{interval:1,unit:"month"}},{id:"yearly",label:"Yearly",value:{interval:1,unit:"year"}},{id:"weekly",label:"Weekly",value:{interval:1,unit:"week"}},{id:"fortnightly",label:"Every 2 weeks",value:{interval:2,unit:"week"}},{id:"quarterly",label:"Quarterly",value:{interval:3,unit:"month"}},{id:"half-year",label:"Every 6 months",value:{interval:6,unit:"month"}}] satisfies {id:string;label:string;value:Recurrence}[];
export const validRecurrence=(value:Recurrence)=>Number.isSafeInteger(value.interval)&&value.interval>0&&["day","week","month","year"].includes(value.unit);
export function recurrenceLabel(value:Recurrence){const preset=recurrencePresets.find((item)=>item.value.interval===value.interval&&item.value.unit===value.unit);return preset?.label??`Every ${value.interval} ${value.unit}${value.interval===1?'':'s'}`;}
/** Compute each occurrence from the original anchor, so Jan 31 -> Feb 28 -> Mar 31. */
export function recurrenceDate(anchor:string,recurrence:Recurrence,steps:number):string|null {
  if(!validDate(anchor)||!validRecurrence(recurrence)||!Number.isSafeInteger(steps)||steps<0)return null;
  try {
    if(recurrence.unit==='day'||recurrence.unit==='week') {const result=shiftDate(anchor,steps*recurrence.interval*(recurrence.unit==='week'?7:1));return validDate(result)?result:null;}
    const date=new Date(`${anchor}T12:00:00Z`),day=date.getUTCDate();date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth()+steps*recurrence.interval*(recurrence.unit==='year'?12:1));
    const end=new Date(date);end.setUTCMonth(end.getUTCMonth()+1,0);date.setUTCDate(Math.min(day,end.getUTCDate()));
    const result=date.toISOString().slice(0,10);return validDate(result)?result:null;
  }catch{return null;}
}
export function nextRecurringDate(item:RecurringPayment,today:string):string|null {
  if(item.status!=='active'||!validDate(today)||!validDate(item.nextChargeDate)||!validRecurrence(item.recurrence))return null;
  const anchor=item.nextChargeDate;if(anchor>=today)return item.endDate&&anchor>item.endDate?null:anchor;
  const r=item.recurrence,months=(Number(today.slice(0,4))-Number(anchor.slice(0,4)))*12+Number(today.slice(5,7))-Number(anchor.slice(5,7));
  const days=(Date.parse(`${today}T12:00:00Z`)-Date.parse(`${anchor}T12:00:00Z`))/86400000;
  let steps=Math.max(0,Math.floor((r.unit==='year'?months/12:r.unit==='month'?months:r.unit==='week'?days/7:days)/r.interval));
  let next=recurrenceDate(anchor,r,steps);while(next&&next<today)next=recurrenceDate(anchor,r,++steps);
  return next&&(!item.endDate||next<=item.endDate)?next:null;
}
export function annualizedCents(item:RecurringPayment):number|null {
  if(item.amountCents===undefined||!validRecurrence(item.recurrence))return null;
  const factor=item.recurrence.unit==='month'?12:item.recurrence.unit==='year'?1:item.recurrence.unit==='week'?52:365.2425;
  return item.amountCents*factor/item.recurrence.interval;
}
export function recurringSummary(items:RecurringPayment[],today:string){
  const active=items.filter((item)=>nextRecurringDate(item,today)!==null),known=active.filter((item)=>item.amountCents!==undefined);
  const annual=known.reduce((sum,item)=>sum+annualizedCents(item)!,0);
  return {monthlyEstimated:known.some((item)=>item.recurrence.unit==='month'&&item.recurrence.interval===1&&item.amountBehavior==='estimated'),active:active.length,unknown:active.length-known.length,estimated:active.filter((item)=>item.amountBehavior==='estimated').length,monthlyBilled:known.filter((item)=>item.recurrence.unit==='month'&&item.recurrence.interval===1).reduce((sum,item)=>sum+item.amountCents!,0),annualized:Math.round(annual),monthlyEquivalent:Math.round(annual/12)};
}
export const upcomingRecurring=(items:RecurringPayment[],today:string)=>items.flatMap((item)=>{const date=nextRecurringDate(item,today);return date?[{item,date}]:[];}).sort((a,b)=>a.date.localeCompare(b.date)||a.item.name.localeCompare(b.item.name));
export function recurringBucket(date:string,today:string){if(date<=shiftDate(today,7))return 'Next 7 days';if(date.slice(0,7)===today.slice(0,7))return 'Later this month';const nextMonth=new Date(`${today.slice(0,7)}-01T12:00:00Z`);nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);return date.slice(0,7)===nextMonth.toISOString().slice(0,7)?'Next month':'Later';}
export function recurringError(item:RecurringPayment,refs:{categoryIds:string[];cardIds:string[];methodIds:string[]}):string|null {
  if(!item.id||!item.name.trim()||!validDate(item.nextChargeDate)||!validRecurrence(item.recurrence))return 'Enter a name, valid next date and recurrence.';
  if(item.amountCents!==undefined&&(!Number.isSafeInteger(item.amountCents)||item.amountCents<0))return 'Enter a nonnegative amount with at most two decimal places.';
  if(!['fixed','estimated'].includes(item.amountBehavior)||!['active','paused','cancelled'].includes(item.status))return 'Choose a valid amount behavior and status.';
  if((item.categoryId&&!refs.categoryIds.includes(item.categoryId))||(item.cardId&&!refs.cardIds.includes(item.cardId))||(item.paymentMethodId&&!refs.methodIds.includes(item.paymentMethodId))||(item.cardId&&item.paymentMethodId))return 'Choose an existing category and one card or payment method.';
  if((item.cancelledDate&&!validDate(item.cancelledDate))||(item.endDate&&!validDate(item.endDate)))return 'Check cancellation and end dates.';
  if(!item.billingSource.trim())return 'Enter where this charge is managed or billed through.';
  return null;
}
export type RecurringFilters={frequency:string;search:string;category:string;method:string;source:string;status:string};
export function filterRecurring(items:RecurringPayment[],filters:RecurringFilters){return items.filter((item)=>(filters.frequency==='all'||item.recurrence.interval===1&&item.recurrence.unit===(filters.frequency==='monthly'?'month':'year'))&&item.name.toLowerCase().includes(filters.search.trim().toLowerCase())&&(!filters.category||item.categoryId===filters.category)&&(!filters.method||(item.cardId?`card:${item.cardId}`:item.paymentMethodId?`method:${item.paymentMethodId}`:'')===filters.method)&&(!filters.source||item.billingSource===filters.source)&&(!filters.status||item.status===filters.status));}
/** Editing a label/amount must not turn a clamped February date into a new billing day. */
export function recurringAnchorAfterEdit(previous:RecurringPayment|undefined,displayedDate:string,recurrence:Recurrence,dateEdited:boolean):string {
  return previous&&!dateEdited&&previous.recurrence.unit===recurrence.unit&&previous.recurrence.interval===recurrence.interval?previous.nextChargeDate:displayedDate;
}

/** Half-open local-date window: next seven days = today through today+6. Expectations only. */
export function expectedRecurringWindow(items:RecurringPayment[],start:string,days:number){const occurrences:{id:string;recordId:string;date:string;amountCents?:number;estimated:boolean}[]=[];if(!validDate(start)||!Number.isInteger(days)||days<1||days>366)return {occurrences,totalCents:0,unknown:0,estimated:0};const end=shiftDate(start,days);for(const item of new Map(items.map(item=>[item.id,item])).values()){let date=nextRecurringDate(item,start),guard=0;while(date&&date<end&&guard++<=days){occurrences.push({id:`${item.id}/${date}`,recordId:item.id,date,amountCents:item.amountCents,estimated:item.amountBehavior==='estimated'});date=nextRecurringDate(item,shiftDate(date,1));}}return {occurrences,totalCents:occurrences.reduce((sum,item)=>sum+(item.amountCents??0),0),unknown:occurrences.filter(item=>item.amountCents===undefined).length,estimated:occurrences.filter(item=>item.estimated).length};}
