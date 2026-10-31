"use client";
import {useDailyData} from "../daily/DailyData";
import { useRef,useState } from "react";
import { useRouter,useSearchParams } from "next/navigation";
import { validDate } from "@/lib/dates";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { currentPaycheck,monthPeriod,paycheckPeriod,formatMoney,spendingTotal,type MoneyPeriod } from "@/lib/money";
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
import { MoneyOverview,MoneyPaychecks,MoneyTransactions,MoneyCards,MoneyCategories } from "./MoneyViews";
import { useMoney } from "./MoneyStore";
import "./Money.css";

const sections=[{id:"overview",label:"Overview"},{id:"paychecks",label:"Paychecks"},{id:"spending",label:"Spending"},{id:"recurring",label:"Recurring"},{id:"cards",label:"Cards"},{id:"categories",label:"Categories"}] as const;
export function Money() {const {profile}=useDailyData();
  const [selectedDate,setSelectedDate]=useMuseDate(dailyEditSample.date.iso);
  const {state}=useMoney(),query=useSearchParams(),router=useRouter(),today=useMuseToday(profile.timeZone),date=today||dailyEditSample.date.iso;
  const view=sections.find((item)=>item.id===query.get("view"))?.id??"overview";
  const [paycheckId,setPaycheckId]=useState(""),[periodMode,setPeriodMode]=useState("paycheck"),[month,setMonth]=useState(dailyEditSample.date.iso.slice(0,7)),[start,setStart]=useState(dailyEditSample.date.iso),[end,setEnd]=useState(dailyEditSample.date.iso),[editor,setEditor]=useState<MoneyEditorRequest|null>(null);
  const [search,setSearch]=useState(""),[category,setCategory]=useState(""),[tag,setTag]=useState(""),[card,setCard]=useState(""),[filtersOpen,setFiltersOpen]=useState(false),filterRef=useRef<HTMLButtonElement>(null),{trigger,spark}=useMuseSpark();
  const paycheck=state.paychecks.find((item)=>item.id===paycheckId)??currentPaycheck(state,date),customValid=validDate(start)&&validDate(end)&&start<=end;
  const period:MoneyPeriod=periodMode==="month"?monthPeriod(`${month||date.slice(0,7)}-01`):periodMode==="custom"&&customValid?{start,end,label:"Custom period"}:paycheck?paycheckPeriod(paycheck):monthPeriod(date);
  const filterCount=[category,tag,card].filter(Boolean).length;
  function changeView(next:string){router.replace(`/money?view=${next}`,{scroll:false});}
  return <main className="muse-page muse-money-page">
    <MusePageHeader title="Money"><DateNavigator date={selectedDate} onChange={setSelectedDate}/></MusePageHeader>
    <MuseSectionNav label="Money sections" current={view} items={sections.map((item)=>({...item,href:`/money?view=${item.id}`}))}/>
    {(view==="overview"||view==="spending")&&<section className="muse-money-period" aria-label="Money reporting period"><MuseChoiceMenu label="Period type" valueLabel={periodMode==="month"?"Calendar month":periodMode==="custom"?"Custom period":"Paycheck period"} selectedIds={[periodMode]} options={[{id:"paycheck",label:"Paycheck period"},{id:"month",label:"Calendar month"},{id:"custom",label:"Custom period"}]} onSelect={setPeriodMode}/>
      {periodMode==="paycheck"&&<MuseChoiceMenu label="Reporting paycheck" valueLabel={paycheck?.name??"No paycheck"} selectedIds={paycheck?[paycheck.id]:[]} options={state.paychecks.map((item)=>({id:item.id,label:`${item.name} · ${item.periodStart}`}))} onSelect={setPaycheckId}/>}
      {periodMode==="month"&&<MoneyField label="Calendar month"><input className="date-input" type="month" value={month} onChange={(e)=>{if(/^\d{4}-\d{2}$/.test(e.target.value)&&validDate(`${e.target.value}-01`))setMonth(e.target.value);}}/></MoneyField>}
      {periodMode==="custom"&&<><MoneyField label="From"><input className="date-input" type="date" value={start} onChange={(e)=>setStart(e.target.value)}/></MoneyField><MoneyField label="Through"><input className="date-input" type="date" value={end} onChange={(e)=>setEnd(e.target.value)}/></MoneyField></>}
      <p className="small-label">{period.start} – {period.end}</p>{periodMode==="custom"&&!customValid&&<p role="alert" className="field-error">Choose an end on or after the start. Showing the selected paycheck until then.</p>}
    </section>}
    {view==="overview"&&<MoneyOverview paycheck={paycheck} period={period} today={date} onOpen={setEditor} onSpending={()=>changeView("spending")} onRecurring={()=>changeView("recurring")}/>}
    {view==="paychecks"&&<MoneyPaychecks today={date} paycheck={paycheck} onSelect={setPaycheckId} onOpen={setEditor}/>}
    {view==="spending"&&<section className="muse-money-panel"><div className="muse-money-spending-tools"><label className="muse-money-search"><span className="sr-only">Search transactions</span><input type="search" placeholder="Find a transaction…" value={search} onChange={(e)=>setSearch(e.target.value)}/></label><button className="muse-button" ref={filterRef} type="button" aria-expanded={filtersOpen} aria-controls="money-spending-filters" aria-haspopup="dialog" onClick={()=>setFiltersOpen((open)=>!open)}>Filters{filterCount?` · ${filterCount}`:""}</button><button className="muse-button button-primary" type="button" onClick={(e)=>setEditor({kind:"transaction",anchor:e.currentTarget})}>+ Add transaction</button><span className="small-label">{formatMoney(spendingTotal(state,period))} recorded this period</span></div><MoneyTransactions period={period} search={search} category={category} tag={tag} card={card} onOpen={setEditor}/></section>}
    {view==="recurring"&&<MoneyRecurring today={date} onOpen={setEditor}/>}
    {view==="cards"&&<MoneyCards onOpen={setEditor}/>}
    {view==="categories"&&<MoneyCategories onOpen={setEditor}/>}
    <GlassPopover id="money-spending-filters" label="Filter spending" open={filtersOpen&&view==="spending"} anchorRef={filterRef} onClose={()=>setFiltersOpen(false)} width={340}><div className="muse-money-form">{[{label:"Category",value:category,set:setCategory,options:state.categories},{label:"Tag",value:tag,set:setTag,options:state.tags},{label:"Card",value:card,set:setCard,options:state.cards}].map((filter)=><fieldset key={filter.label}><legend>{filter.label}</legend><div className="muse-filter-options"><button className="choice-button" type="button" aria-pressed={!filter.value} onClick={()=>filter.set("")}>All</button>{filter.options.map((item)=><button key={item.id} className="choice-button" type="button" aria-pressed={filter.value===item.id} onClick={()=>filter.set(item.id)}>{item.name}</button>)}</div></fieldset>)}<div className="editor-actions"><button className="text-button" type="button" onClick={()=>{setCategory("");setTag("");setCard("");}}>Clear</button><button className="muse-button" type="button" onClick={()=>{setFiltersOpen(false);filterRef.current?.focus();}}>Done</button></div></div></GlassPopover>
    {editor&&<MoneyEditors editor={editor} date={date} paycheckId={paycheck?.id} onClose={()=>setEditor(null)} onSaved={trigger} onPaycheckSaved={(id)=>{setPaycheckId(id);trigger();changeView("paychecks");}}/>}
    <div className="muse-feedback-anchor" aria-hidden="true">{spark}</div>
    <footer className="muse-footer">Fictional Money sample · USD · Records stay in this session and reset on refresh · No bank connection</footer>
  </main>;
}
