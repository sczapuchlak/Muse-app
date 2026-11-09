import {validAccent,type AccentColor} from "./appearance-values";
import { nextRecurringDate,recurringError,type RecurringPayment,type ManualPaymentMethod } from "./recurring";
import { validDate } from "./dates";
import type { MuseIconName } from "@/components/MuseIcon";
export const moneyAccents=["primary","secondary","pop","warm","info"] as const;
export type MoneyAccent=AccentColor;
export type MoneyCategory={id:string;name:string;accent:MoneyAccent;icon?:MuseIconName;archived:boolean;subcategories:{id:string;name:string}[]};
export type MoneyTag={id:string;name:string;archived:boolean};
export type AllocationGroup={id:string;name:string;accent:MoneyAccent};
export type Paycheck={id:string;name:string;receivedDate:string;periodStart:string;periodEnd:string;expectedCents?:number;actualCents?:number;note?:string;templateId?:string};
export type Allocation={id:string;paycheckId:string;name:string;plannedCents:number;groupId:string;categoryId?:string;subcategoryId?:string;actualCents?:number;dueDate?:string;billId?:string;cardId?:string;note?:string};
export type TemplateAllocation=Omit<Allocation,"id"|"paycheckId"|"actualCents"|"dueDate">;
export type PaycheckTemplate={id:string;name:string;expectedCents?:number;allocations:TemplateAllocation[]};
export type MoneySplit={id:string;categoryId?:string;subcategoryId?:string;amountCents:number};
export type MoneyTransaction={id:string;merchant:string;amountCents:number;date:string;categoryId?:string;subcategoryId?:string;tagIds:string[];paymentMethod:string;paymentMethodId?:string;cardId?:string;note?:string;splits:MoneySplit[];allocationId?:string};
export type CreditCard={id:string;name:string;/** #12: chosen color; unset cards use cardAccent()'s stable default. */accent?:MoneyAccent;balanceCents:number;openingBalanceCents?:number;openingAsOf?:string;limitCents?:number;apr?:number;dueDate?:string;minimumCents?:number;plannedPaymentCents?:number;note?:string};
export type CardPayment={id:string;cardId:string;amountCents:number;date:string;paycheckId?:string;allocationId?:string;note?:string};
export type MoneyBill={id:string;name:string;amountCents:number;dueDate:string;recurrence:"once"|"weekly"|"monthly"|"yearly";categoryId?:string;cardId?:string;paid:boolean;note?:string;recurringId?:string};
export type MoneyRecords={paychecks:Paycheck;allocations:Allocation;templates:PaycheckTemplate;transactions:MoneyTransaction;cards:CreditCard;payments:CardPayment;bills:MoneyBill;categories:MoneyCategory;tags:MoneyTag;groups:AllocationGroup;recurring:RecurringPayment;paymentMethods:ManualPaymentMethod};
export type MoneyState={[K in keyof MoneyRecords]:MoneyRecords[K][]};
export type MoneySaveAction={[K in keyof MoneyRecords]:{type:"save";collection:K;record:MoneyRecords[K]}}[keyof MoneyRecords];
export type MoneyAction=MoneySaveAction|{type:"remove";collection:"transactions"|"allocations"|"payments";id:string}|{type:"archive";collection:"categories"|"tags";id:string;archived:boolean}|{type:"apply-template";templateId:string;paycheck:Paycheck;allocationIds?:string[]};
export type MoneyPeriod={start:string;end:string;label:string};
const cents=(value:unknown)=>typeof value==="number"&&Number.isSafeInteger(value)&&value>=0;
const optionalCents=(value:unknown)=>value===undefined||cents(value);
export function parseMoney(value:string):number|undefined {
  if(!/^-?\d+(\.\d{1,2})?$/.test(value.trim()))return undefined;
  const negative=value.trim().startsWith("-"),[whole,decimal=""]=value.trim().replace(/^-/ ,"").split(".");
  const amount=Number(whole)*100+Number(decimal.padEnd(2,"0"));return Number.isSafeInteger(amount)?(negative?-amount:amount):undefined;
}
export const moneyText=(value?:number)=>value===undefined?"":(value/100).toFixed(2);
export const formatMoney=(value:number|null|undefined)=>value==null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value/100);
export const inPeriod=(date:string,period:MoneyPeriod)=>date>=period.start&&date<=period.end;
export const splitRemainder=(transaction:Pick<MoneyTransaction,"amountCents"|"splits">)=>transaction.amountCents-transaction.splits.reduce((sum,split)=>sum+split.amountCents,0);
export function monthPeriod(date:string):MoneyPeriod {const [year,month]=date.split("-").map(Number);return {start:`${date.slice(0,7)}-01`,end:new Date(Date.UTC(year,month,0,12)).toISOString().slice(0,10),label:new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${date}T12:00:00Z`))};}
export function paycheckPeriod(paycheck:Paycheck):MoneyPeriod{return {start:paycheck.periodStart,end:paycheck.periodEnd,label:paycheck.name};}
export function currentPaycheck(state:MoneyState,date:string){return [...state.paychecks].sort((a,b)=>b.receivedDate.localeCompare(a.receivedDate)).find((item)=>date>=item.periodStart&&date<=item.periodEnd)??[...state.paychecks].filter((item)=>item.receivedDate<=date).sort((a,b)=>b.receivedDate.localeCompare(a.receivedDate))[0]??state.paychecks[0];}
export function paycheckSummary(state:MoneyState,paycheck:Paycheck){const rows=state.allocations.filter((row)=>row.paycheckId===paycheck.id),planned=rows.reduce((sum,row)=>sum+row.plannedCents,0),basis=paycheck.actualCents??paycheck.expectedCents;return {rows,planned,basis,basisKind:paycheck.actualCents!==undefined?"received":"expected",remaining:basis===undefined?null:basis-planned,fullyAllocated:basis!==undefined&&basis>0&&rows.length>0&&planned===basis};}
export const periodTransactions=(state:MoneyState,period:MoneyPeriod)=>state.transactions.filter((item)=>inPeriod(item.date,period));
export const spendingTotal=(state:MoneyState,period:MoneyPeriod)=>periodTransactions(state,period).reduce((sum,item)=>sum+item.amountCents,0);
export const utilization=(card:CreditCard)=>card.limitCents&&card.limitCents>0?Math.max(0,card.balanceCents)/card.limitCents:null;
export function allocationActual(state:MoneyState,allocation:Allocation):number|null {
  if(allocation.actualCents!==undefined)return allocation.actualCents;
  const rows=allocation.cardId?state.payments.filter((item)=>item.allocationId===allocation.id):state.transactions.filter((item)=>item.allocationId===allocation.id);
  return rows.length?rows.reduce((sum,item)=>sum+item.amountCents,0):null;
}
export function categorySpending(state:MoneyState,period:MoneyPeriod){const amounts=new Map<string,number>();for(const transaction of periodTransactions(state,period)){const parts=transaction.splits.length?transaction.splits:[{categoryId:transaction.categoryId,amountCents:transaction.amountCents}];for(const part of parts)amounts.set(part.categoryId??"",(amounts.get(part.categoryId??"")??0)+part.amountCents);if(transaction.splits.length&&splitRemainder(transaction)>0)amounts.set("",(amounts.get("")??0)+splitRemainder(transaction));}return [...amounts].map(([id,amount])=>({id,name:state.categories.find((item)=>item.id===id)?.name??"Unassigned",accent:state.categories.find((item)=>item.id===id)?.accent??"info" as MoneyAccent,amount})).sort((a,b)=>b.amount-a.amount);}
function classificationValid(state:MoneyState,categoryId?:string,subcategoryId?:string){return (!categoryId&&!subcategoryId)||!!state.categories.find((item)=>item.id===categoryId&&(!subcategoryId||item.subcategories.some((sub)=>sub.id===subcategoryId)));}
export function moneyError(state:MoneyState,action:MoneyAction):string|null {
  if(action.type==="apply-template")return state.templates.some((item)=>item.id===action.templateId)?moneyError(state,{type:"save",collection:"paychecks",record:action.paycheck}):"Choose an existing template.";
  if(action.type==="remove"&&(action.collection==="transactions"||action.collection==="payments")){
    const old=state[action.collection].find((item)=>item.id===action.id),card=state.cards.find((item)=>item.id===old?.cardId);
    if(old&&card&&(!card.openingAsOf||old.date>=card.openingAsOf)&&!Number.isSafeInteger(card.balanceCents+(action.collection==="payments"?old.amountCents:-old.amountCents)))return "Undo exceeds the supported balance precision.";
  }
  if(action.type!=="save")return null;
  const record=action.record;if(!record.id)return "A stable record ID is required.";
  if(action.collection==="transactions"||action.collection==="payments") {
    const old=state[action.collection].find((item)=>item.id===record.id),sign=action.collection==="transactions"?1:-1;
    for(const card of state.cards){const change=(action.record.cardId===card.id&&(!card.openingAsOf||action.record.date>=card.openingAsOf)?action.record.amountCents*sign:0)-(old?.cardId===card.id&&(!card.openingAsOf||old.date>=card.openingAsOf)?old.amountCents*sign:0);if(!Number.isSafeInteger(card.balanceCents+change))return "The amount exceeds the supported balance precision.";}
  }
  switch(action.collection){
    case "recurring": return recurringError(action.record,{categoryIds:state.categories.map((item)=>item.id),cardIds:state.cards.map((item)=>item.id),methodIds:state.paymentMethods.map((item)=>item.id)});
    case "paymentMethods": return action.record.name.trim()?null:"Enter a payment-method label.";
    case "paychecks": {const item=action.record;return !item.name.trim()||![item.receivedDate,item.periodStart,item.periodEnd].every(validDate)||item.periodStart>item.periodEnd?"Enter a name and valid received/period dates.":!optionalCents(item.expectedCents)||!optionalCents(item.actualCents)?"Income must be nonnegative, with at most two decimal places.":null;}
    case "allocations": {const item=action.record;
      if(state.transactions.some((tx)=>tx.allocationId===item.id&&item.cardId)||state.payments.some((payment)=>payment.allocationId===item.id&&(payment.cardId!==item.cardId||(payment.paycheckId&&payment.paycheckId!==item.paycheckId))))return "Unlink the recorded activity before changing this planned amount’s card or paycheck.";
      return !item.name.trim()||!state.paychecks.some((p)=>p.id===item.paycheckId)||!state.groups.some((g)=>g.id===item.groupId)||!cents(item.plannedCents)||!optionalCents(item.actualCents)?"Enter a name, a valid paycheck and group, and nonnegative amounts for this planned amount.":!classificationValid(state,item.categoryId,item.subcategoryId)||(item.billId&&!state.bills.some((b)=>b.id===item.billId))||(item.cardId&&!state.cards.some((c)=>c.id===item.cardId))||(item.dueDate&&!validDate(item.dueDate))?"Check the linked category, bill, card or due date.":null;}
    case "transactions": {const item=action.record;return !item.merchant.trim()||!cents(item.amountCents)||!validDate(item.date)?"Enter a description, valid date and nonnegative amount.":!classificationValid(state,item.categoryId,item.subcategoryId)||item.splits.some((split)=>!cents(split.amountCents)||!classificationValid(state,split.categoryId,split.subcategoryId))?"Check transaction and split categories/amounts.":splitRemainder(item)<0?`${formatMoney(-splitRemainder(item))} exceeds the transaction total.`:item.tagIds.some((id)=>!state.tags.some((tag)=>tag.id===id))||(item.paymentMethodId&&!state.paymentMethods.some((method)=>method.id===item.paymentMethodId))||(item.cardId&&item.paymentMethodId)||(item.cardId&&!state.cards.some((card)=>card.id===item.cardId))||(item.allocationId&&!state.allocations.some((row)=>row.id===item.allocationId&&!row.cardId))?"Choose valid tags, card and planned amount.":null;}
    case "cards": {const item=action.record;return !item.name.trim()||!Number.isSafeInteger(item.balanceCents)||(item.openingBalanceCents!==undefined&&(!Number.isSafeInteger(item.openingBalanceCents)||!validDate(item.openingAsOf)))||!optionalCents(item.limitCents)||!optionalCents(item.minimumCents)||!optionalCents(item.plannedPaymentCents)||(item.apr!==undefined&&(!Number.isFinite(item.apr)||item.apr<0))||(item.dueDate&&!validDate(item.dueDate))?"Check nickname, amounts, APR and due date.":null;}
    case "payments": {const item=action.record;return !cents(item.amountCents)||!item.amountCents||!validDate(item.date)||!state.cards.some((card)=>card.id===item.cardId)?"Choose a card, valid date and a positive payment amount.":item.paycheckId&&!state.paychecks.some((p)=>p.id===item.paycheckId)||item.allocationId&&!state.allocations.some((a)=>a.id===item.allocationId&&a.cardId===item.cardId&&(!item.paycheckId||a.paycheckId===item.paycheckId))?"The planned amount must belong to this card and paycheck.":null;}
    case "bills": {const item=action.record;return !item.name.trim()||!cents(item.amountCents)||!validDate(item.dueDate)||!classificationValid(state,item.categoryId)||(item.cardId&&!state.cards.some((c)=>c.id===item.cardId))||(item.recurringId&&!state.recurring.some((r)=>r.id===item.recurringId))?"Check bill name, amount, due date and links.":null;}
    case "categories": {const item=action.record;return !item.name.trim()||!validAccent(item.accent)||item.subcategories.some((sub)=>!sub.id||!sub.name.trim())||new Set(item.subcategories.map((sub)=>sub.id)).size!==item.subcategories.length?"Enter a category name, color and valid subcategory names.":null;}
    case "tags": return action.record.name.trim()?null:"Enter a tag name.";
    case "groups": return action.record.name.trim()&&validAccent(action.record.accent)?null:"Enter a group name and color.";
    case "templates": return action.record.name.trim()&&optionalCents(action.record.expectedCents)&&action.record.allocations.every((row)=>row.name.trim()&&cents(row.plannedCents)&&state.groups.some((group)=>group.id===row.groupId))?null:"Check template name, expected amount and what’s planned from it.";
  }
}
function updateBalance(state:MoneyState,cardId:string|undefined,delta:number):MoneyState{return !cardId||!delta?state:{...state,cards:state.cards.map((card)=>card.id===cardId?{...card,balanceCents:card.balanceCents+delta}:card)};}
export function templateFromPaycheck(state:MoneyState,paycheck:Paycheck,id:string,name:string):PaycheckTemplate {return {id,name,expectedCents:paycheck.expectedCents,allocations:state.allocations.filter((item)=>item.paycheckId===paycheck.id).map(({name,plannedCents,groupId,categoryId,subcategoryId,billId,cardId,note})=>({name,plannedCents,groupId,categoryId,subcategoryId,billId,cardId,note}))};}
function reduceMoney(state:MoneyState,action:MoneyAction):MoneyState {
  if(moneyError(state,action))return state;
  if(action.type==="archive")return {...state,[action.collection]:state[action.collection].map((item)=>item.id===action.id?{...item,archived:action.archived}:item)};
  if(action.type==="apply-template"){const template=state.templates.find((item)=>item.id===action.templateId);if(!template||state.paychecks.some((item)=>item.id===action.paycheck.id))return state;return {...state,paychecks:[...state.paychecks,{...action.paycheck,templateId:template.id}],allocations:[...state.allocations,...template.allocations.map((row,index)=>({...row,id:action.allocationIds?.[index]??`${action.paycheck.id}/allocation/${index}`,paycheckId:action.paycheck.id}))]};}
  if(action.type==="remove"){let next=state;if(action.collection==="transactions"){const old=state.transactions.find((item)=>item.id===action.id);if(old)next=updateBalance(next,old.cardId,-old.amountCents);}if(action.collection==="payments"){const old=state.payments.find((item)=>item.id===action.id);if(old)next=updateBalance(next,old.cardId,old.amountCents);}if(action.collection==="allocations")return {...state,allocations:state.allocations.filter((item)=>item.id!==action.id),transactions:state.transactions.map((item)=>item.allocationId===action.id?{...item,allocationId:undefined}:item),payments:state.payments.map((item)=>item.allocationId===action.id?{...item,allocationId:undefined}:item)};return {...next,[action.collection]:next[action.collection].filter((item)=>item.id!==action.id)};}
  let next=state;
  if(action.collection==="transactions"){const old=state.transactions.find((item)=>item.id===action.record.id);if(old)next=updateBalance(next,old.cardId,-old.amountCents);next=updateBalance(next,action.record.cardId,action.record.amountCents);}
  if(action.collection==="payments"){const old=state.payments.find((item)=>item.id===action.record.id);if(old)next=updateBalance(next,old.cardId,old.amountCents);next=updateBalance(next,action.record.cardId,-action.record.amountCents);}
  const records=next[action.collection] as {id:string}[];
  return {...next,[action.collection]:records.some((item)=>item.id===action.record.id)?records.map((item)=>item.id===action.record.id?structuredClone(action.record):item):[...records,structuredClone(action.record)]};
}
export function upcomingMoney(state:MoneyState,today:string){return [...state.bills.filter((item)=>!item.paid&&(!item.recurringId||!state.recurring.some((recurring)=>recurring.id===item.recurringId&&nextRecurringDate(recurring,today)===item.dueDate))&&item.dueDate>=today).map((item)=>({id:`bill-${item.id}`,kind:"bill" as const,recordId:item.id,name:item.name,date:item.dueDate,amount:item.amountCents})),...state.cards.filter((item)=>item.dueDate&&item.dueDate>=today).map((item)=>({id:`card-${item.id}`,kind:"card" as const,recordId:item.id,name:item.name,date:item.dueDate!,amount:item.plannedPaymentCents??item.minimumCents}))].sort((a,b)=>a.date.localeCompare(b.date));}

/** Fixed three-record quick shelf, independent of the currently browsed historical paycheck. */
export function paycheckNavigation(state:MoneyState,today:string){
 const ordered=[...state.paychecks].sort((a,b)=>a.periodStart.localeCompare(b.periodStart)||a.receivedDate.localeCompare(b.receivedDate)||a.id.localeCompare(b.id));
 const current=currentPaycheck(state,today),index=ordered.findIndex((item)=>item.id===current?.id),quick=[{label:'Previous',paycheck:ordered[index-1]},{label:'Current',paycheck:current},{label:'Next',paycheck:ordered[index+1]}];
 const visible=new Set(quick.flatMap((item)=>item.paycheck?[item.paycheck.id]:[]));return {quick,history:ordered.filter((item)=>!visible.has(item.id)&&(!current||item.periodStart<current.periodStart)).reverse()};
}
export function billStatus(bill:MoneyBill,today:string):'paid'|'overdue'|'upcoming'|'unpaid'{return bill.paid?'paid':!validDate(today)?'unpaid':bill.dueDate<today?'overdue':bill.dueDate===today?'unpaid':'upcoming';}

/** Server projection and optimistic edits use the same dated-opening-balance rule. */
export function reconcileMoney(state:MoneyState):MoneyState{if(!state.cards.some(c=>c.openingBalanceCents!==undefined))return state;return {...state,cards:state.cards.map(card=>{
 if(card.openingBalanceCents===undefined||!card.openingAsOf)return card;
 const charges=state.transactions.filter(t=>t.cardId===card.id&&t.date>=card.openingAsOf!).reduce((n,t)=>n+BigInt(t.amountCents),BigInt(0)),payments=state.payments.filter(p=>p.cardId===card.id&&p.date>=card.openingAsOf!).reduce((n,p)=>n+BigInt(p.amountCents),BigInt(0)),balance=BigInt(card.openingBalanceCents)+charges-payments;
 return {...card,balanceCents:Number(balance)};
})};}
export function moneyReducer(state:MoneyState,action:MoneyAction):MoneyState{const next=reduceMoney(state,action);return next===state?state:reconcileMoney(next);}

/** #12: a card's color — the saved one, else a stable preset from its position so neighbouring cards differ. */
export const cardAccent=(state:Pick<MoneyState,'cards'>,cardId:string|undefined):MoneyAccent|undefined=>{
 if(!cardId)return undefined;const index=state.cards.findIndex(card=>card.id===cardId);if(index<0)return undefined;
 return state.cards[index].accent??(['secondary','pop','warm','info','primary'] as const)[index%5];
};
