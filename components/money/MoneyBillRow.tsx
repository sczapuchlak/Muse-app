import { shortDate } from "@/lib/display-date";
import { MuseIcon } from "../MuseIcon";
import { useRef } from "react";
import type { MoneyBill } from "@/lib/money";
import { billStatus,formatMoney } from "@/lib/money";
import { useMoney } from "./MoneyStore";
import type { MoneyOpen } from "./MoneyEditors";
import { useMuseSpark } from "../MuseSpark";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
export function MoneyBillRow({bill,onOpen,today}:{bill:MoneyBill;onOpen:MoneyOpen;today:string}) {
 const {dispatch}=useMoney(),{trigger,spark}=useMuseSpark(),status=billStatus(bill,today),nameRef=useRef<HTMLButtonElement>(null);
 return <li className="muse-money-bill-row"><div><button ref={nameRef} className="muse-ledger-name muse-bill-name" type="button" onClick={(e)=>onOpen({kind:'bill',initial:bill,anchor:e.currentTarget})}>{bill.name}</button><small>{bill.recurrence==='once'?'One-time':bill.recurrence[0].toUpperCase()+bill.recurrence.slice(1)}</small></div><time dateTime={bill.dueDate}><span className="muse-money-mobile-label">Due</span>{shortDate(bill.dueDate)}</time><strong className="muse-money-ledger-number">{formatMoney(bill.amountCents)}</strong><span className="muse-bill-status" data-status={status}>{status[0].toUpperCase()+status.slice(1)}</span><button type="button" className="muse-button muse-bill-paid-action muse-feedback-anchor" onClick={()=>{dispatch({type:'save',collection:'bills',record:{...bill,paid:!bill.paid}});if(!bill.paid)trigger();}}><MuseIcon name="check" size={14}/>{bill.paid?'Undo paid':'Mark paid'}{spark}</button><MuseOverflowMenu label={bill.name} actions={[{id:'edit',label:'Edit bill',onSelect:()=>{if(nameRef.current)onOpen({kind:'bill',initial:bill,anchor:nameRef.current});}}]}/></li>;
}
