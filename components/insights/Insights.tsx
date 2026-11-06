"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {MusePageHeader} from '../MusePageHeader';
import {DateNavigator} from '../DateNavigator';
import {MuseSectionNav} from '../MuseSectionNav';
import {useMuseDate} from '../MuseSession';
import {useMuseToday} from '../useMuseToday';
import {dailyEditSample} from '@/lib/daily-edit-data';
import {useDailyData,useDailyRange} from '../daily/DailyData';
import {insightAvailability} from '@/lib/insights/sources';
import {validTimeZone,validDate} from '@/lib/dates';
import {rangeFor,previousRange,type InsightRange,type RangePreset} from '@/lib/insights/ranges';
import {useInsightAnalysis} from './useInsightAnalysis';
import {useInsightsSources} from './useInsightsSources';
import {RangeControls} from './RangeControls';
import {AstrologyInsights} from './AstrologyInsights';
import {CollectionsInsights} from './CollectionsInsights';
import {Overview} from './Overview';
import {PlansInsights} from './PlansInsights';
import {MoodInsights} from './MoodInsights';
import {MoneyInsights} from './MoneyInsights';
import {NourishInsights} from './NourishInsights';
import {PeriodComparison} from './PeriodComparison';
import {MuseIcon} from '../MuseIcon';
import {DateInspection} from './DateInspection';
import {AcrossMuse,CrossConnections} from './AcrossMuse';
import {Constellations,FieldNotes,useVoicedRevelations} from '../almanac/InsightsAlmanac';
import {WellnessGoalInsights} from './WellnessGoalInsights';
import {InsightsCustomize} from './InsightsCustomize';
import {useInsightsPreferences} from './useInsightsPreferences';
import {crossModuleConnections,macroSummary} from '@/lib/insights/across';
import type {InsightSection} from '@/lib/insights/preferences';
import './Insights.css';
const sections=[{id:'overview',label:'Overview'},{id:'plans',label:'Plans & Rituals'},{id:'mood',label:'Mood & Energy'},{id:'money',label:'Money'},{id:'nourish',label:'Wellness'},{id:'astrology',label:'Astrology'},{id:'collections',label:'Collections'}];
export function Insights(){const [date,setDate]=useMuseDate(dailyEditSample.date.iso),{profile}=useDailyData(),today=useMuseToday(profile.timeZone),{input,sources,astrology,progress,goals}=useInsightsSources(date,today),query=useSearchParams(),insightPrefs=useInsightsPreferences(profile.id),requestedView=sections.find((item)=>item.id===query.get('view'))?.id,view=requestedView??insightPrefs.preferences.defaultView;
 const [preset,setPresetState]=useState<RangePreset>('30'),[customizing,setCustomizing]=useState<HTMLElement|null>(null),presetTouched=useRef(false),[custom,setCustom]=useState<InsightRange>(rangeFor('30',date)),[compare,setCompare]=useState(true),[inspected,setInspected]=useState<string|null>(null),[anchor,setAnchor]=useState<HTMLElement|null>(null),inspectRef=useRef<HTMLButtonElement>(null);
 const setPreset=(value:RangePreset)=>{presetTouched.current=true;setPresetState(value);};
 const defaultRange=insightPrefs.preferences.defaultRange;
 // The saved default period applies once, unless a period was already chosen on this visit.
 useEffect(()=>{if(insightPrefs.loaded&&!presetTouched.current)setPresetState(defaultRange);},[insightPrefs.loaded,defaultRange]);
 const {range,metrics,prior,revelations:factRevelations}=useInsightAnalysis(input,preset,date,custom.start,custom.end);
 const revelations=useVoicedRevelations(factRevelations,today);
 const macro=useMemo(()=>macroSummary({current:metrics,previous:prior,sources:progress,previousRange:previousRange(range),compare}),[metrics,prior,progress,range,compare]);
 const connections=useMemo(()=>crossModuleConnections(metrics,progress),[metrics,progress]);
 const hidden=insightPrefs.preferences.hidden,navItems=sections.filter(item=>item.id==='overview'||item.id===view||!hidden.includes(item.id as InsightSection));
 const sectionLabels=Object.fromEntries(sections.filter(item=>item.id!=='overview').map(item=>[item.id,item.label])) as Record<InsightSection,string>;
 const dataStart=previousRange(range).start,dataRange=useDailyRange(dataStart,range.end),{snapshot,store:dailyStore}=useDailyData();
 const dailyStatuses=Object.entries(snapshot.statuses).filter(([day])=>day>=dataStart&&day<=range.end).map(([,status])=>status);
 const availability=insightAvailability([...sources.map(source=>source.status),...dailyStatuses,{loaded:dataRange.loaded,error:dataRange.error}]);
 const owners=insightAvailability(sources.map(source=>source.status));
 const ready=availability.ready&&!!today&&validTimeZone(profile.timeZone);
 function retry(){for(const source of sources)if(source.status.error||!source.status.loaded)source.retry();void dataRange.retry();for(const [day,status]of Object.entries(snapshot.statuses))if(day>=dataStart&&day<=range.end&&status.error)dailyStore?.retry(day);}

 function inspect(value:string){if(!validDate(value))return;const focused=document.activeElement;setAnchor(focused instanceof HTMLElement&&focused!==document.body&&focused!==document.documentElement?focused:inspectRef.current);setInspected(value);}
 return <main className="muse-page muse-insights-page"><MusePageHeader title="Insights"><DateNavigator date={date} onChange={setDate}/></MusePageHeader><MuseSectionNav label="Insights sections" current={view} items={navItems.map((item)=>({...item,href:`/insights?view=${item.id}`}))}/><RangeControls preset={preset} range={range} onPreset={setPreset} onCustom={(value)=>{setCustom(value);setPreset('custom');}} compare={compare} onCompare={setCompare}/>

 {!validTimeZone(profile.timeZone)?<p role="alert">Set a valid saved timezone in Settings before viewing date-based insights.</p>:availability.error?<div role="alert"><p>Some saved sources could not load. Insights are paused to avoid an incomplete picture.</p>{sources.filter(source=>source.status.error).map(source=><p key={source.name}>{source.name}: {source.status.error}</p>)}<button className="muse-button" type="button" onClick={retry}>Retry Insights</button></div>:availability.pending?<p role="status">Waiting for source changes to be saved. Unsaved drafts remain in their source modules.</p>:!ready?<p role="status">Loading saved observations…</p>:null}
 <div hidden={!ready} aria-busy={!ready}>{input.quality.duplicatesRemoved+input.quality.invalidDailyDates+input.quality.invalidNumericRecords>0&&<p className="muse-insight-note">Normalization removed {input.quality.duplicatesRemoved} duplicate records and excluded {input.quality.invalidDailyDates} invalid daily dates; {input.quality.invalidNumericRecords} invalid numeric records were omitted or had invalid optional fields left unknown.</p>}
 <div className="muse-insight-period-row">{compare?<PeriodComparison current={metrics} previous={prior} view={view}/>:<p className="small-label">Previous period comparison is off.</p>}<button ref={inspectRef} type="button" className="muse-button muse-insight-action" onClick={()=>inspect(today||date)}><MuseIcon name="calendar" size={17}/>Inspect a date</button><button type="button" className="muse-button button-ghost muse-insight-action" onClick={event=>setCustomizing(event.currentTarget)}><MuseIcon name="settings" size={17}/>Customize</button></div>
 {view==='collections'&&<CollectionsInsights range={range}/>} {view==='astrology'&&<AstrologyInsights metrics={metrics.astrology} error={astrology.error} onRetry={()=>void astrology.store.retry()}/>}{view==='overview'&&<Overview macro={<AcrossMuse rows={macro}/>} metrics={metrics} revelations={(compare?revelations:revelations.filter((item)=>item.type!=='completion-comparison')).filter(item=>item.module!=='money')} onDate={inspect}/>}{view==='overview'&&<FieldNotes input={input} sources={progress} today={today} loadedFrom={dataStart}/>}{view==='plans'&&<PlansInsights metrics={metrics} today={today} onDate={inspect}/>}{view==='mood'&&<><MoodInsights metrics={metrics} onDate={inspect}/><CrossConnections items={connections}/><Constellations connections={connections} today={today}/></>}{view==='money'&&<MoneyInsights revelations={revelations.filter(item=>item.module==='money')} metrics={metrics} previous={prior} compare={compare} input={input} onDate={inspect}/>}{view==='nourish'&&<><div className="muse-insight-sections"><WellnessGoalInsights sources={progress} goals={goals} range={range} today={today}/></div><NourishInsights metrics={metrics} onDate={inspect}/></>}
 <div className="muse-insight-source-note"><div><strong>Insights from your saved records</strong><p>Planner, Rituals, Wellness, Mood and Money share their existing records here. Planned, completed and missing data remain distinct.</p></div></div>
 <footer className="muse-footer">Saved local dates · Missing values stay missing · Planned and recorded values remain separate</footer></div>
 {customizing&&<InsightsCustomize preferences={insightPrefs.preferences} labels={sectionLabels} saving={insightPrefs.saving} error={insightPrefs.error} returnFocus={customizing} onSave={insightPrefs.save} onClose={()=>setCustomizing(null)}/>}
 {inspected&&<DateInspection sourcesReady={owners.ready&&validTimeZone(profile.timeZone)} date={inspected} input={input} range={range} anchor={anchor} onDate={setInspected} onOpenDate={setDate} onClose={()=>setInspected(null)}/>}</main>;}
