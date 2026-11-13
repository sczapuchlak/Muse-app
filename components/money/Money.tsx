"use client";
import {useDailyData} from "../daily/DailyData";
import { useEffect,useRef,useState } from "react";
import { useRouter,useSearchParams } from "next/navigation";
import { validDate } from "@/lib/dates";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { currentPaycheck,monthPeriod,paycheckPeriod,formatMoney,periodTransactions,spendingTotal,type MoneyPeriod } from "@/lib/money";
import { activeSpendingFilters,filterSpending,filteredTotal,parseSpendingSort,spendingSorts,type SpendingSort } from "@/lib/money-spending";
import { DateNavigator } from "../DateNavigator";
import { useMuseDate } from "../MuseSession";
import { MusePageHeader } from "../MusePageHeader";
import { MuseSectionNav } from "../MuseSectionNav";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { GlassPopover } from "../GlassPopover";
import { useMuseToday } from "../useMuseToday";
import { useMuseSpark } from "../MuseSpark";
import { MoneyField } from "./MoneyFields";
import { MoneyEditors,type MoneyEditorRequest } from "./MoneyEditors";
import { MoneyRecurring } from "./MoneyRecurring";
import { MoneyOverview,MoneyPaychecks,MoneyTransactions,MoneyCards,MoneyCategories ,SpendingSummary} from "./MoneyViews";
import {MoneyCapture,MoneySaveStatus} from "./MoneyStore";
import { useMoney } from "./MoneyStore";
import "./Money.css";
import "./MoneyTabs.css";
import {MuseSearch} from '@/components/design/MuseSearch';
import {MuseIcon} from '@/components/MuseIcon';

const sections=[{id:"overview",label:"Overview"},{id:"paychecks",label:"Paychecks"},{id:"spending",label:"Spending"},{id:"recurring",label:"Recurring"},{id:"cards",label:"Cards"},{id:"categories",label:"Categories"}] as const;
/** A reporting period in words: “Nov 1 – 30, 2026”, “Nov 15 – Dec 14, 2026” or “Dec 15, 2026 – Jan 14, 2027”. */
export function periodRangeLabel(start:string,end:string){const f=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat("en-US",{...o,timeZone:"UTC"}).format(new Date(`${d}T12:00:00Z`));if(start.slice(0,4)!==end.slice(0,4))return `${f(start,{month:"short",day:"numeric",year:"numeric"})} – ${f(end,{month:"short",day:"numeric",year:"numeric"})}`;if(start.slice(0,7)===end.slice(0,7))return `${f(start,{month:"short",day:"numeric"})} – ${Number(end.slice(8))}, ${end.slice(0,4)}`;return `${f(start,{month:"short",day:"numeric"})} – ${f(end,{month:"short",day:"numeric"})}, ${end.slice(0,4)}`;}
export function Money() {const {profile}=useDailyData();
  const [selectedDate,setSelectedDate]=useMuseDate(dailyEditSample.date.iso);
  const {state,store}=useMoney(),query=useSearchParams(),router=useRouter(),today=useMuseToday(profile.timeZone),date=today||selectedDate;
  const view=sections.find((item)=>item.id===query.get("view"))?.id??"overview";
  const initialReportingDate=validDate(query.get("date"))?query.get("date")!:selectedDate;
  const [paycheckId,setPaycheckId]=useState(""),[periodMode,setPeriodMode]=useState("paycheck"),[month,setMonth]=useState(()=>initialReportingDate.slice(0,7)),[start,setStart]=useState(initialReportingDate),[end,setEnd]=useState(initialReportingDate),[editor,setEditor]=useState<MoneyEditorRequest|null>(null);
  const [search,setSearch]=useState(""),[category,setCategory]=useState(""),[tag,setTag]=useState(""),[card,setCard]=useState(""),[sort,setSort]=useState<SpendingSort>("newest"),[filtersOpen,setFiltersOpen]=useState(false),filterRef=useRef<HTMLButtonElement>(null),{trigger,spark}=useMuseSpark();
  const paycheck=state.paychecks.find((item)=>item.id===paycheckId)??currentPaycheck(state,date),customValid=validDate(start)&&validDate(end)&&start<=end;
  const period:MoneyPeriod=periodMode==="month"?monthPeriod(`${month||date.slice(0,7)}-01`):periodMode==="custom"&&customValid?{start,end,label:"Custom period"}:paycheck?paycheckPeriod(paycheck):monthPeriod(date);
  const filterCount=[category,tag,card].filter(Boolean).length;
  // #112 Sort is remembered on this device; filters reset with the page, like search.
  useEffect(()=>{const t=window.setTimeout(()=>{try{setSort(parseSpendingSort(window.localStorage.getItem("muse.money.spendingSort")));}catch{/* default */}},0);return()=>window.clearTimeout(t);},[]);
  const chooseSort=(next:SpendingSort)=>{setSort(next);try{window.localStorage.setItem("muse.money.spendingSort",next);}catch{/* this device only */}};
  const spendingFilters={search,category,tag,payment:card},periodSpent=spendingTotal(state,period),shownItems=filterSpending(periodTransactions(state,period),spendingFilters),filtering=activeSpendingFilters(spendingFilters)>0;
  function changeView(next:string){router.replace(`/money?view=${next}&date=${selectedDate}`,{scroll:false});}
  return <main className="muse-page muse-money-page">
    <MusePageHeader title="Money"><DateNavigator date={selectedDate} onChange={setSelectedDate}/></MusePageHeader>
    <MoneyCapture>
    <MuseSectionNav label="Money sections" current={view} items={sections.map((item)=>({...item,href:`/money?view=${item.id}&date=${selectedDate}`}))}/>
    {(view==="overview"||view==="spending")&&<section className="muse-money-period" aria-label="Money reporting period"><MuseChoiceMenu label="Period type" valueLabel={periodMode==="month"?"Calendar month":periodMode==="custom"?"Custom period":"Paycheck period"} selectedIds={[periodMode]} options={[{id:"paycheck",label:"Paycheck period"},{id:"month",label:"Calendar month"},{id:"custom",label:"Custom period"}]} onSelect={setPeriodMode}/>
      {periodMode==="paycheck"&&<MuseChoiceMenu label="Reporting paycheck" valueLabel={paycheck?.name??"No paycheck"} selectedIds={paycheck?[paycheck.id]:[]} options={state.paychecks.map((item)=>({id:item.id,label:`${item.name} · ${item.periodStart}`}))} onSelect={setPaycheckId}/>}
      {periodMode==="month"&&<MoneyField label="Calendar month"><input className="date-input" type="month" value={month} onChange={(e)=>{if(/^\d{4}-\d{2}$/.test(e.target.value)&&validDate(`${e.target.value}-01`))setMonth(e.target.value);}}/></MoneyField>}
      {periodMode==="custom"&&<><MoneyField label="From"><input className="date-input" type="date" value={start} onChange={(e)=>setStart(e.target.value)}/></MoneyField><MoneyField label="Through"><input className="date-input" type="date" value={end} onChange={(e)=>setEnd(e.target.value)}/></MoneyField></>}
      <p className="small-label muse-money-period-label">{periodMode==="paycheck"&&!paycheck?<>No paycheck covers this date yet · showing {periodRangeLabel(period.start,period.end)}</>:<>{periodRangeLabel(period.start,period.end)}{date>=period.start&&date<=period.end?` · includes ${new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${date}T12:00:00Z`))}`:""}</>}</p>{periodMode==="custom"&&!customValid&&<p role="alert" className="field-error">Choose an end on or after the start. Showing the selected paycheck until then.</p>}
    </section>}
    {view==="overview"&&<MoneyOverview paycheck={paycheck} period={period} today={date} onOpen={setEditor} onSpending={()=>changeView("spending")} onRecurring={()=>changeView("recurring")} onPaychecks={()=>changeView("paychecks")}/>}
    {view==="paychecks"&&<MoneyPaychecks today={date} paycheck={paycheck} onSelect={setPaycheckId} onOpen={setEditor}/>}
    {view==="spending"&&<SpendingSummary paycheck={periodMode==="paycheck"?paycheck:undefined} period={period}/>}
    {view==="spending"&&<section className="muse-money-panel"><div className="muse-money-spending-tools"><div className="muse-search-row muse-money-search-row"><MuseSearch label="Search transactions" className="muse-money-search" value={search} onChange={setSearch} placeholder="Find a transaction…"/><button className="muse-button button-primary muse-search-add muse-phone-only" type="button" onClick={(e)=>setEditor({kind:"transaction",anchor:e.currentTarget})}><MuseIcon name="plus" size={14}/><span className="muse-search-add-label">Add transaction</span></button></div><button className="muse-button" ref={filterRef} type="button" aria-expanded={filtersOpen} aria-controls="money-spending-filters" aria-haspopup="dialog" onClick={()=>setFiltersOpen((open)=>!open)}>Filters{filterCount?` · ${filterCount}`:""}</button><MuseChoiceMenu label="Sort transactions" valueLabel={spendingSorts.find((s)=>s.id===sort)!.label} options={spendingSorts.map((s)=>({id:s.id,label:s.label}))} selectedIds={[sort]} onSelect={(id)=>chooseSort(id as SpendingSort)}/><button className="muse-button button-primary muse-wide-only" type="button" onClick={(e)=>setEditor({kind:"transaction",anchor:e.currentTarget})}>+ Add transaction</button><span className="small-label muse-money-spending-total" role="status">{filtering?<><strong>{formatMoney(filteredTotal(shownItems,category))}</strong> in {shownItems.length} shown · {formatMoney(periodSpent)} recorded this period</>:<>{formatMoney(periodSpent)} recorded this period</>}</span></div><MoneyTransactions period={period} filters={spendingFilters} sort={sort} onOpen={setEditor}/></section>}
    {view==="recurring"&&<MoneyRecurring today={date} onOpen={setEditor}/>}
    {view==="cards"&&<MoneyCards onOpen={setEditor}/>}
    {view==="categories"&&<MoneyCategories onOpen={setEditor}/>}
    <GlassPopover id="money-spending-filters" label="Filter spending" open={filtersOpen&&view==="spending"} anchorRef={filterRef} onClose={()=>setFiltersOpen(false)} width={340}><div className="muse-money-form">{[{label:"Category",value:category,set:setCategory,options:state.categories},{label:"Tag",value:tag,set:setTag,options:state.tags},{label:"Paid with",value:card,set:setCard,options:[...state.cards.map((item)=>({id:`card:${item.id}`,name:item.name})),...state.paymentMethods.map((item)=>({id:`method:${item.id}`,name:item.name}))]}].map((filter)=><fieldset key={filter.label}><legend>{filter.label}</legend><div className="muse-filter-options"><button className="choice-button" type="button" aria-pressed={!filter.value} onClick={()=>filter.set("")}>All</button>{filter.options.map((item)=><button key={item.id} className="choice-button" type="button" aria-pressed={filter.value===item.id} onClick={()=>filter.set(item.id)}>{item.name}</button>)}</div></fieldset>)}<div className="editor-actions"><button className="text-button" type="button" onClick={()=>{setCategory("");setTag("");setCard("");}}>Clear</button><button className="muse-button" type="button" onClick={()=>{setFiltersOpen(false);filterRef.current?.focus();}}>Done</button></div></div></GlassPopover>
    {editor&&<MoneyEditors editor={editor} date={selectedDate} paycheckId={paycheck?.id} onClose={()=>setEditor(null)} onSaved={()=>store.whenSaved(trigger)} onPaycheckSaved={(id)=>{setPaycheckId(id);store.whenSaved(trigger);changeView("paychecks");}}/>}
    <div className="muse-feedback-anchor" aria-hidden="true">{spark}</div>
    </MoneyCapture><footer className="muse-footer"><MoneySaveStatus/>Money records save to your account · USD · No bank connection</footer>
  </main>;
}
