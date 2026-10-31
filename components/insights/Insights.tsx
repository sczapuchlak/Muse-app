"use client";
import {useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {MusePageHeader} from '../MusePageHeader';
import {DateNavigator} from '../DateNavigator';
import {MuseSectionNav} from '../MuseSectionNav';
import {useMuseDate} from '../MuseSession';
import {useMuseToday} from '../useMuseToday';
import {dailyEditSample} from '@/lib/daily-edit-data';
import {mockProfile} from '@/lib/mock-profile';
import {validDate} from '@/lib/dates';
import {rangeFor,type InsightRange,type RangePreset} from '@/lib/insights/ranges';
import {useInsightAnalysis} from './useInsightAnalysis';
import {useInsightsSources} from './useInsightsSources';
import {RangeControls} from './RangeControls';
import {Overview} from './Overview';
import {PlansInsights} from './PlansInsights';
import {MoodInsights} from './MoodInsights';
import {MoneyInsights} from './MoneyInsights';
import {NourishInsights} from './NourishInsights';
import {PeriodComparison} from './PeriodComparison';
import {DateInspection} from './DateInspection';
import './Insights.css';
const sections=[{id:'overview',label:'Overview'},{id:'plans',label:'Plans & Rituals'},{id:'mood',label:'Mood & Energy'},{id:'money',label:'Money'},{id:'nourish',label:'Nourish'}];
export function Insights(){const [date,setDate]=useMuseDate(dailyEditSample.date.iso),today=useMuseToday(mockProfile.timeZone),input=useInsightsSources(date,today),query=useSearchParams(),view=sections.find((item)=>item.id===query.get('view'))?.id??'overview';
 const [preset,setPreset]=useState<RangePreset>('30'),[custom,setCustom]=useState<InsightRange>(rangeFor('30',date)),[compare,setCompare]=useState(true),[inspected,setInspected]=useState<string|null>(null),[anchor,setAnchor]=useState<HTMLElement|null>(null),inspectRef=useRef<HTMLButtonElement>(null);
 const {range,metrics,prior,revelations}=useInsightAnalysis(input,preset,date,custom.start,custom.end);
 function inspect(value:string){if(!validDate(value))return;const focused=document.activeElement;setAnchor(focused instanceof HTMLElement&&focused!==document.body&&focused!==document.documentElement?focused:inspectRef.current);setInspected(value);}
 return <main className="muse-page muse-insights-page"><MusePageHeader title="Insights"><DateNavigator date={date} onChange={setDate}/></MusePageHeader><MuseSectionNav label="Insights sections" current={view} items={sections.map((item)=>({...item,href:`/insights?view=${item.id}`}))}/><RangeControls preset={preset} range={range} onPreset={setPreset} onCustom={(value)=>{setCustom(value);setPreset('custom');}} compare={compare} onCompare={setCompare}/>
 <div className="muse-insight-source-note"><div><strong>Prototype insights</strong><p>Calculated from Muse’s existing fictional starter records and your current session edits. No demonstration history is added here. Refresh resets records; no health service, external analytics or AI is connected.</p></div><button ref={inspectRef} type="button" className="muse-button" onClick={()=>inspect(range.end)}>Inspect a date</button></div>
 {input.quality.duplicatesRemoved+input.quality.invalidDailyDates+input.quality.invalidNumericRecords>0&&<p className="muse-insight-note">Normalization removed {input.quality.duplicatesRemoved} duplicate records and excluded {input.quality.invalidDailyDates} invalid daily dates; {input.quality.invalidNumericRecords} invalid numeric records were omitted or had invalid optional fields left unknown.</p>}
 {compare&&<PeriodComparison current={metrics} previous={prior} view={view}/>}
 {view==='overview'&&<Overview metrics={metrics} revelations={compare?revelations:revelations.filter((item)=>item.type!=='completion-comparison')} onDate={inspect}/>}{view==='plans'&&<PlansInsights metrics={metrics} today={today} onDate={inspect}/>}{view==='mood'&&<MoodInsights metrics={metrics} onDate={inspect}/>}{view==='money'&&<MoneyInsights metrics={metrics} previous={prior} compare={compare} input={input} onDate={inspect}/>}{view==='nourish'&&<NourishInsights metrics={metrics} onDate={inspect}/>}
 <footer className="muse-footer">Local dates use {mockProfile.timeZone} · Missing values stay missing · Expected, planned and recorded values remain separate</footer>
 {inspected&&<DateInspection date={inspected} input={input} range={range} anchor={anchor} onDate={setInspected} onOpenDate={setDate} onClose={()=>setInspected(null)}/>}</main>;}
