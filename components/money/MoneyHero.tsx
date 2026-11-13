import type {CSSProperties} from "react";
import {accentStyle} from "@/lib/appearance-values";
import {categorySpending,comingUp,formatMoney,paycheckSummary,periodTransactions,spendingTotal,type MoneyPeriod,type Paycheck} from "@/lib/money";
import {AchievementBadge} from "../AchievementStar";
import {MuseIcon} from "../MuseIcon";
import {useMoney} from "./MoneyStore";
import {EntryCarousel} from "../design/EntryCarousel";
import type {MoneyOpen} from "./MoneyEditors";
import "./MoneyHero.css";

/**
 * Money glow-up (Nov 2026): the Overview opens on the pay period itself, art-directed like the Books dashboard.
 * Everything here is read from the existing records: expected income is never shown as received, unknown stays
 * unknown, and bills/recurring charges are pins on the calendar, never added to spending.
 */
const DAY=86400000;
const utc=(d:string)=>Date.parse(`${d}T12:00:00Z`);
const iso=(t:number)=>new Date(t).toISOString().slice(0,10);
const fmt=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat("en-US",{...o,timeZone:"UTC"}).format(new Date(`${d}T12:00:00Z`));
const r2=(n:number)=>Math.round(n*100)/100;

/** "$3,842" + ".00": the whole dollars carry the drama, the cents sit small beside them. */
export function MoneyNumeral({cents,className=""}:{cents:number;className?:string}){
 const [whole,fraction]=formatMoney(cents).split(".");
 return <span className={`muse-money-numeral ${className}`.trim()}>{whole}<small>.{fraction}</small></span>;
}

export function AllocationRing({paycheck,onPlan}:{paycheck:Paycheck;onPlan?:()=>void}){
 const {state}=useMoney(),summary=paycheckSummary(state,paycheck);
 const groups=state.groups.map(group=>({...group,amount:summary.rows.filter(row=>row.groupId===group.id).reduce((sum,row)=>sum+row.plannedCents,0)})).filter(group=>group.amount>0);
 const total=Math.max(summary.planned,summary.basis??0,1),R=56,C=2*Math.PI*R;
 const arcs=groups.map((group,i)=>{const before=groups.slice(0,i).reduce((sum,g)=>sum+g.amount,0)/total*C,length=group.amount/total*C;return {...group,dash:`${r2(Math.max(0,length-3))} ${r2(C)}`,offset:r2(-before)};});
 const assigned=summary.basis?Math.min(100,Math.round(summary.planned/summary.basis*100)):null;
 return <figure className="muse-money-ring" aria-label={`Planned from this paycheck: ${groups.map(g=>`${g.name} ${formatMoney(g.amount)}`).join(", ")}${summary.remaining!==null&&summary.remaining>0?`; ${formatMoney(summary.remaining)} not yet planned`:""}`}>
  <svg viewBox="0 0 140 140" aria-hidden="true"><circle className="muse-money-ring-track" cx="70" cy="70" r={R}/>{!groups.length&&<circle className="muse-money-ring-invite" cx="70" cy="70" r={R}/>}{arcs.map(arc=><circle key={arc.id} className="muse-money-ring-arc" cx="70" cy="70" r={R} data-money-accent={arc.accent} style={{...accentStyle(arc.accent),strokeDasharray:arc.dash,strokeDashoffset:arc.offset}}/>)}</svg>
  <figcaption><span className="muse-money-ring-value">{assigned===null?"—":`${assigned}%`}</span><span className="muse-money-ring-label">{assigned===null?"Add income to plan":"planned"}</span><AchievementBadge achieved={summary.fullyAllocated} label="Every dollar is planned" size={22}/></figcaption>
  {groups.length>0&&<ul className="muse-money-ring-legend">{groups.map(group=><li key={group.id} data-money-accent={group.accent} style={accentStyle(group.accent)}><i aria-hidden="true"/><span>{group.name}</span><strong>{formatMoney(group.amount)}</strong></li>)}{summary.remaining!==null&&summary.remaining!==0&&<li data-unplanned><i aria-hidden="true"/><span>{summary.remaining>0?"Unplanned":"Over plan"}</span><strong>{formatMoney(Math.abs(summary.remaining))}</strong></li>}</ul>}
  {!groups.length&&<div className="muse-money-ring-empty"><p><strong>Nothing planned yet.</strong> Give each dollar a job: bills, savings, the fun part.</p>{onPlan&&<button className="muse-button" type="button" onClick={onPlan}>Plan this paycheck →</button>}</div>}
 </figure>;
}

/** The period as a strip of days: what was spent each day rises as a bar, today glows, and what is due sits as a pin. */
function PeriodTrack({period,today}:{period:MoneyPeriod;today:string}){
 const {state}=useMoney(),start=utc(period.start),count=Math.round((utc(period.end)-start)/DAY)+1;
 if(count<2||count>42)return null;
 const days=Array.from({length:count},(_,i)=>iso(start+i*DAY)),spent=new Map<string,number>();
 for(const item of periodTransactions(state,period))spent.set(item.date,(spent.get(item.date)??0)+item.amountCents);
 const due=comingUp(state,period.start).filter(item=>item.date<=period.end),max=Math.max(1,...spent.values());
 const nextPay=state.paychecks.filter(item=>item.receivedDate>period.end).sort((a,b)=>a.receivedDate.localeCompare(b.receivedDate))[0];
 return <ol className="muse-money-track" aria-label={`Each day of ${period.label}`} style={{"--days":count} as CSSProperties}>
  {days.map((day,i)=>{const amount=spent.get(day),pins=due.filter(item=>item.date===day),state=day<today?"past":day===today?"today":"future";
   return <li key={day} data-state={state} data-weekend={[0,6].includes(new Date(utc(day)).getUTCDay())||undefined} title={`${fmt(day,{weekday:"short",month:"short",day:"numeric"})}${amount?` · ${formatMoney(amount)} spent`:""}${pins.map(p=>` · ${p.name} due`).join("")}`}>
    <span className="muse-money-track-pins">{pins.slice(0,3).map(pin=><i key={pin.id} data-kind={pin.kind}/>)}</span>
    <span className="muse-money-track-bar" style={{"--h":amount?Math.max(.08,amount/max):0} as CSSProperties}/>
    <span className="muse-money-track-day">{i===0||day.endsWith("-01")?<small>{fmt(day,{month:"short"})}</small>:null}{Number(day.slice(8))}</span>
   </li>;})}
  {nextPay&&<li className="muse-money-track-payday" title={`Next paycheck ${fmt(nextPay.receivedDate,{month:"short",day:"numeric"})}`}><MuseIcon name="money" size={14}/><span>{fmt(nextPay.receivedDate,{month:"short",day:"numeric"})}</span></li>}
 </ol>;
}

export function PaycheckHero({paycheck,period,today,onOpen,onPlan}:{paycheck?:Paycheck;period:MoneyPeriod;today:string;onOpen:MoneyOpen;onPlan?:()=>void}){
 const {state}=useMoney(),spent=spendingTotal(state,period);
 if(!paycheck)return <section className="muse-money-hero muse-money-current" data-empty>
  <span className="muse-money-hero-envelope" aria-hidden="true"><i/></span>
  <div className="muse-money-hero-copy"><p className="muse-kicker">Current paycheck</p><h2 className="muse-money-hero-title">Every dollar wants a job.</h2><p className="muse-money-hero-note">Add a paycheck to plan where it goes. Expected income stays expected until you record it.</p><button className="muse-button button-primary" type="button" onClick={e=>onOpen({kind:"paycheck",anchor:e.currentTarget})}>+ New paycheck</button></div>
  <PeriodTrack period={period} today={today}/>
 </section>;
 const summary=paycheckSummary(state,paycheck),inside=today>=paycheck.periodStart&&today<=paycheck.periodEnd;
 const daysLeft=inside?Math.round((utc(paycheck.periodEnd)-utc(today))/DAY)+1:null,elapsed=inside?Math.round((utc(today)-utc(paycheck.periodStart))/DAY)+1:null;
 const received=paycheck.actualCents!==undefined;
 return <section className="muse-money-hero muse-money-current" aria-label={inside?"Current paycheck":"Selected paycheck"}>
  <div className="muse-money-hero-copy">
   <p className="muse-kicker">{inside?"Current paycheck":"Selected paycheck"} · {paycheck.name}</p>
   <h2 className="muse-money-hero-amount">{summary.basis===undefined?<span className="muse-money-hero-unknown">Income not recorded</span>:<MoneyNumeral cents={summary.basis}/>}</h2>
   <p className="muse-money-hero-basis"><span className="muse-money-basis-chip" data-kind={received?"received":"expected"}>{received?"Received":"Expected"}</span>{fmt(paycheck.receivedDate,{month:"short",day:"numeric"})} · covers {fmt(paycheck.periodStart,{month:"short",day:"numeric"})} – {fmt(paycheck.periodEnd,{month:"short",day:"numeric"})}{!received&&paycheck.expectedCents!==undefined&&<> · planned amounts use expected income</>}</p>
   <dl className="muse-money-hero-facts">
    <div><dt>Planned</dt><dd>{formatMoney(summary.planned)}</dd></div>
    <div><dt>Spent so far</dt><dd>{formatMoney(spent)}</dd>{elapsed&&spent>0&&<small>about {formatMoney(Math.round(spent/elapsed))} a day</small>}</div>
    <div data-tone={summary.remaining!==null&&summary.remaining<0?"over":undefined}><dt>{summary.remaining!==null&&summary.remaining<0?"Over plan":"Yours to assign"}</dt><dd>{summary.remaining===null?"—":formatMoney(Math.abs(summary.remaining))}</dd></div>
   </dl>
   <div className="muse-money-hero-actions">{daysLeft!==null&&<span className="muse-money-days-left"><b>{daysLeft}</b> {daysLeft===1?"day":"days"} left</span>}<button className="muse-button button-ghost" type="button" onClick={e=>onOpen({kind:"paycheck",initial:paycheck,anchor:e.currentTarget})}>Edit paycheck</button><button className="muse-button button-primary" type="button" onClick={e=>onOpen({kind:"transaction",anchor:e.currentTarget})}>+ Add transaction</button></div>
  </div>
  <AllocationRing paycheck={paycheck} onPlan={onPlan}/>
  <PeriodTrack period={period} today={today}/>
 </section>;
}

/** Where it went: one ribbon of category shares and a tile per category, each in its own colour. */
export function SpendingMix({period}:{period:MoneyPeriod}){
 const {state}=useMoney(),rows=categorySpending(state,period),total=rows.reduce((sum,row)=>sum+row.amount,0);
 if(!rows.length)return <p className="card-description">No spending recorded for this period.</p>;
 return <div className="muse-money-mix">
  <div className="muse-money-mix-ribbon" role="img" aria-label={rows.map(row=>`${row.name} ${formatMoney(row.amount)}`).join(", ")}>{rows.map(row=><span key={row.id} data-money-accent={row.accent} style={{...accentStyle(row.accent),flexGrow:row.amount}}/>)}</div>
  <EntryCarousel items={rows} label="Spending by category" minWidth={118} itemKey={row=>row.id||"unassigned"} describe={row=>row.name} render={row=><div className="muse-money-mix-tile" data-money-accent={row.accent} style={accentStyle(row.accent)}><span className="muse-money-mix-share">{Math.round(row.amount/total*100)}%</span><span className="muse-money-mix-name">{row.name}</span><strong>{formatMoney(row.amount)}</strong></div>}/>
 </div>;
}

/**
 * Plan / actual as gauges: one tile per category, the plan is the full track and what was recorded fills it. Going
 * over shows the overflow in the warning colour with the amount in words, so colour is never the only signal.
 */
export function PlanActualGauges({paycheck,period}:{paycheck:Paycheck;period:MoneyPeriod}){
 const {state}=useMoney(),actual=categorySpending(state,period);
 const rows=state.categories.map(category=>{const allocations=state.allocations.filter(row=>row.paycheckId===paycheck.id&&row.categoryId===category.id&&!row.cardId);return {...category,planned:allocations.length?allocations.reduce((sum,row)=>sum+row.plannedCents,0):null,actual:actual.find(row=>row.id===category.id)?.amount??0};}).filter(row=>row.planned!==null||row.actual>0);
 if(!rows.length)return <p className="card-description">Nothing planned or recorded in this period yet.</p>;
 return <><p className="small-label">Planned from {paycheck.name} · recorded in {period.label}</p><EntryCarousel items={rows} label="Plan and actual by category" minWidth={210} itemKey={row=>row.id} describe={row=>row.name} render={row=>{const over=row.planned!==null&&row.actual>row.planned,fill=row.planned?Math.min(1,row.actual/row.planned):row.actual?1:0;
  return <div className="muse-money-gauge" data-money-accent={row.accent} data-state={row.planned===null?"unplanned":over?"over":"within"} style={accentStyle(row.accent)}>
   <span className="muse-money-gauge-name">{row.name}</span>
   <span className="muse-money-gauge-figures"><MoneyNumeral cents={row.actual}/><small>{row.planned===null?"no plan":`of ${formatMoney(row.planned)}`}</small></span>
   <span className="muse-money-gauge-track" aria-hidden="true"><span style={{"--fill":fill} as CSSProperties}/>{over&&<i style={{"--over":Math.min(1,(row.actual-row.planned!)/row.planned!)} as CSSProperties}/>}</span>
   <span className="muse-money-gauge-note">{row.planned===null?"Recorded without a plan":over?`${formatMoney(row.actual-row.planned!)} over plan`:`${formatMoney(row.planned!-row.actual)} left`}</span>
  </div>;}}/></>;
}

/** Three quick reads of the period's spending: pace, the biggest day and the largest single purchase. */
export function SpendingFacts({period,today}:{period:MoneyPeriod;today:string}){
 const {state}=useMoney(),items=periodTransactions(state,period);
 if(!items.length)return null;
 const byDay=new Map<string,number>();for(const item of items)byDay.set(item.date,(byDay.get(item.date)??0)+item.amountCents);
 const through=today<period.end?today:period.end,elapsed=Math.max(1,Math.round((utc(through<period.start?period.start:through)-utc(period.start))/DAY)+1);
 const [bigDay,bigDayAmount]=[...byDay].sort((a,b)=>b[1]-a[1])[0],largest=[...items].sort((a,b)=>b.amountCents-a.amountCents)[0];
 return <dl className="muse-money-facts">
  <div><dt>Per day</dt><dd>{formatMoney(Math.round(items.reduce((sum,item)=>sum+item.amountCents,0)/elapsed))}</dd><small>over {elapsed} {elapsed===1?"day":"days"}</small></div>
  <div><dt>Biggest day</dt><dd>{formatMoney(bigDayAmount)}</dd><small>{fmt(bigDay,{weekday:"short",month:"short",day:"numeric"})}</small></div>
  <div><dt>Largest purchase</dt><dd>{formatMoney(largest.amountCents)}</dd><small>{largest.merchant}</small></div>
 </dl>;
}
