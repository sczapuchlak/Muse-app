'use client';
import {useState} from 'react';
import Link from 'next/link';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseIcon} from '@/components/MuseIcon';
import {emotionCatalog} from '@/lib/emotions';
import {dateLabel,shiftDate,weekDates} from '@/lib/dates';
import type {DreamEntry} from '@/lib/whimsy/models';
import {dreamClassifications,dreamDisplayTitle,dreamSearch,dreamsByMonth,paginate,type DreamSymbol} from '@/lib/whimsy/dreams';
import {DreamPager,DreamSearch,DreamTypeBadge,emotionName,monthTitle,shortDate} from './parts';

const PAGE=12;
/** The symbol's own picture, or its category glyph when it has none (your own symbols). */
export const symbolGlyph=(s?:Pick<DreamSymbol,'icon'|'category'>)=>s?.icon||categoryGlyph[s?.category??'']||'✧';
export const categoryGlyph:Record<string,string>={'Animals':'♞','Nature and Elements':'✿','Water':'≈','People and Relationships':'♡','Places and Buildings':'⌂','Objects':'◇','Transportation':'➶','Body and Health':'◌','Emotions':'☾','Actions and Events':'✦','Supernatural and Fantasy':'☽','Common Dream Scenarios':'✧','Your symbols':'✍'};

type Props={dreams:DreamEntry[];symbols:DreamSymbol[];today:string;seriesName:(dreamId:string)=>string;symbolHref:(id:string,dreamId:string)=>string;onCapture:()=>void;onOpen:(dream:DreamEntry)=>void;onEdit:(dream:DreamEntry)=>void;onDelete:(dream:DreamEntry)=>void;onDecode:(dream:DreamEntry)=>void;view:'timeline'|'calendar';setView:(view:'timeline'|'calendar')=>void;selectedDate:string;setSelectedDate:(date:string)=>void;calendarMonth:string;setCalendarMonth:(month:string)=>void};

/** Dream Diary, the Archive: month-grouped journal fragments with search, filters, calendar and pagination. */
export function DreamDiary(p:Props){
 const [search,setSearch]=useState(''),[type,setType]=useState(''),[symbol,setSymbol]=useState(''),[emotion,setEmotion]=useState(''),[sort,setSort]=useState<'newest'|'oldest'>('newest'),[filtersOpen,setFiltersOpen]=useState(false),[pageNo,setPageNo]=useState(0);
 const reset=(fn:()=>void)=>{fn();setPageNo(0);};
 const symbolName=(id:string)=>p.symbols.find(s=>s.id===id)?.name??'Unavailable symbol';
 const matches=dreamSearch(p.dreams,search,{classification:type,symbol,emotion,from:p.selectedDate,to:p.selectedDate}).sort((a,b)=>sort==='newest'?b.date.localeCompare(a.date)||b.loggedAt.localeCompare(a.loggedAt):a.date.localeCompare(b.date)||a.loggedAt.localeCompare(b.loggedAt));
 const page=paginate(matches,pageNo,PAGE),advanced=[symbol,emotion,type].filter(Boolean).length+(sort==='oldest'?1:0);
 const filters=[type&&{key:'type',label:`Type: ${type}`,clear:()=>setType('')},sort==='oldest'&&{key:'sort',label:'Oldest first',clear:()=>setSort('newest')},symbol&&{key:'symbol',label:`Symbol: ${symbolName(symbol)}`,clear:()=>setSymbol('')},emotion&&{key:'emotion',label:`Feeling: ${emotionName(emotion)}`,clear:()=>setEmotion('')},p.selectedDate&&{key:'date',label:`Night of ${dateLabel(p.selectedDate)}`,clear:()=>p.setSelectedDate('')}].filter(Boolean) as {key:string;label:string;clear:()=>void}[];
 const used=new Set(p.dreams.flatMap(d=>d.symbolIds));
 if(!p.dreams.length)return <section className="muse-dream-section" aria-label="Dream Diary"><div className="muse-dream-empty-state"><span className="muse-dream-moon" aria-hidden="true">☾</span><h3>Your dream archive is waiting for its first strange little story.</h3><p>A fragment is enough: a place, a face, a feeling that followed you out of sleep.</p><button type="button" className="muse-button button-primary" onClick={p.onCapture}>+ Capture a dream</button></div></section>;
 return <section className="muse-dream-section" aria-label="Dream Diary" data-filters-open={filtersOpen}>
  <div className="muse-dream-controls">
   <DreamSearch label="Search dreams" value={search} onChange={v=>reset(()=>setSearch(v))} placeholder="Search stories, titles, symbols…" count={matches.length} noun={['dream','dreams']}/>
   <div className="muse-dream-segmented" role="group" aria-label="Dream display"><button type="button" aria-pressed={p.view==='timeline'} onClick={()=>p.setView('timeline')}><MuseIcon name="sort" size={14}/>Timeline</button><button type="button" aria-pressed={p.view==='calendar'} onClick={()=>p.setView('calendar')}><MuseIcon name="calendar" size={14}/>Calendar</button></div>
   <MuseChoiceMenu label="Sort" valueLabel={sort==='newest'?'Newest first':'Oldest first'} options={[{id:'newest',label:'Newest first'},{id:'oldest',label:'Oldest first'}]} selectedIds={[sort]} onSelect={id=>reset(()=>setSort(id as 'newest'|'oldest'))}/>
   <button type="button" className="muse-button button-ghost muse-dream-filter-toggle" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}><MuseIcon name="filter" size={14}/>Filters{advanced?` · ${advanced}`:''}</button>
  </div>
  <div className="muse-dream-type-chips" role="group" aria-label="Dream type">
   <button type="button" aria-pressed={!type} onClick={()=>reset(()=>setType(''))}>All dreams</button>
   {dreamClassifications.map(t=><button type="button" key={t} aria-pressed={type===t} onClick={()=>reset(()=>setType(type===t?'':t))}><DreamTypeBadge type={t}/></button>)}
  </div>
  {filtersOpen&&<div className="muse-dream-more-filters muse-dream-reveal">
   <MuseChoiceMenu label="Symbol" valueLabel={symbol?symbolName(symbol):'Any symbol'} options={[{id:'',label:'Any symbol'},...p.symbols.filter(s=>used.has(s.id)).map(s=>({id:s.id,label:s.name}))]} selectedIds={[symbol]} onSelect={id=>reset(()=>setSymbol(id))} searchable/>
   <MuseChoiceMenu label="Feeling" valueLabel={emotion?emotionName(emotion):'Any feeling'} options={[{id:'',label:'Any feeling'},...emotionCatalog.filter(e=>p.dreams.some(d=>d.emotions.includes(e.id))).map(e=>({id:e.id,label:e.name}))]} selectedIds={[emotion]} onSelect={id=>reset(()=>setEmotion(id))} searchable/>
  </div>}
  {filters.length>0&&<div className="muse-dream-active-filters">{filters.map(f=><button type="button" key={f.key} onClick={()=>reset(f.clear)}>{f.label}<MuseIcon name="close" size={12}/></button>)}<button type="button" className="text-button" onClick={()=>reset(()=>{setSymbol('');setEmotion('');setType('');setSort('newest');setSearch('');p.setSelectedDate('');})}>Clear all</button></div>}
  {p.view==='calendar'&&<DreamCalendar month={p.calendarMonth} setMonth={p.setCalendarMonth} dreams={p.dreams} selected={p.selectedDate} today={p.today} onDate={date=>reset(()=>p.setSelectedDate(p.selectedDate===date?'':date))}/>}
  {p.view==='calendar'&&!p.selectedDate?<p className="muse-dream-quiet">Choose a night to read what you remembered.</p>
   :!matches.length?<p className="muse-dream-quiet">{p.selectedDate?'No dreams recorded for this night. Some stories slip away before morning.':'No dreams match these filters. Try a softer search.'}</p>
   :<div className="muse-dream-timeline muse-dream-reveal" key={`${page.page}-${p.selectedDate}-${type}`}>{dreamsByMonth(page.items).map(group=><section key={group.month} className="muse-dream-month" aria-label={monthTitle(group.month)}>
     <header><h3>{monthTitle(group.month)}</h3><span className="small-label">{matches.filter(d=>d.date.startsWith(group.month)).length} {matches.filter(d=>d.date.startsWith(group.month)).length===1?'dream':'dreams'}</span></header>
     <div className="muse-dream-list">{group.dreams.map(entry=><DreamCard key={entry.id} entry={entry} series={p.seriesName(entry.id)} symbolName={symbolName} symbols={p.symbols} symbolHref={p.symbolHref} onOpen={p.onOpen} onEdit={p.onEdit} onDelete={p.onDelete} onDecode={p.onDecode}/>)}</div>
    </section>)}</div>}
  {(p.view==='timeline'||p.selectedDate)&&<DreamPager page={page} onPage={n=>{setPageNo(n);document.querySelector('[aria-label="Dream Diary"]')?.scrollIntoView({block:'start',behavior:'smooth'});}} label="Dream pages"/>}
 </section>;
}

function Intensity({value}:{value?:number}){if(value==null)return null;return <span className="muse-dream-intensity" title={`Intensity ${value} of 5`} aria-label={`Intensity ${value} of 5`}>{[1,2,3,4,5].map(n=><i key={n} data-on={n<=value}/>)}</span>;}

/** One dream as a journal fragment. The title opens the whole entry; links and the menu stay independently usable. */
function DreamCard({entry,series,symbolName,symbols,symbolHref,onOpen,onEdit,onDelete,onDecode}:{entry:DreamEntry;series:string;symbolName:(id:string)=>string;symbols:DreamSymbol[];symbolHref:(id:string,dreamId:string)=>string;onOpen:(d:DreamEntry)=>void;onEdit:(d:DreamEntry)=>void;onDelete:(d:DreamEntry)=>void;onDecode:(d:DreamEntry)=>void}){
 const types=entry.classifications?.length?entry.classifications:entry.lucid?['Lucid']:[];
 return <article className="muse-dream-entry" data-type={types[0]?.toLowerCase()}>
  <div className="muse-dream-entry-head"><time dateTime={entry.date} className="muse-dream-stamp">{shortDate(entry.date)}</time><span className="muse-dream-entry-types">{types.slice(0,2).map(t=><DreamTypeBadge key={t} type={t}/>)}</span>
   <details className="muse-dream-entry-menu"><summary aria-label={`Actions for ${dreamDisplayTitle(entry)}`}>•••</summary><div><button type="button" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onDecode(entry);}}>Explore in Decoder</button><button type="button" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onEdit(entry);}}>Edit dream</button><button type="button" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onDelete(entry);}}>Delete dream</button></div></details></div>
  <h4><button type="button" className="muse-dream-open" onClick={()=>onOpen(entry)}>{dreamDisplayTitle(entry)}</button></h4>
  <p className="muse-dream-preview">{entry.text}</p>
  {(entry.emotions.length>0||entry.intensity!=null)&&<div className="muse-dream-feelings">{entry.emotions.slice(0,3).map(id=><span className="muse-dream-chip" key={id}>{emotionName(id)}</span>)}{entry.emotions.length>3&&<span className="small-label">+{entry.emotions.length-3}</span>}<Intensity value={entry.intensity}/></div>}
  {entry.symbolIds.length>0&&<div className="muse-dream-artifacts">{entry.symbolIds.slice(0,3).map(id=>{const s=symbols.find(x=>x.id===id);return <Link className="muse-dream-artifact" key={id} href={symbolHref(id,entry.id)}><span aria-hidden="true">{symbolGlyph(s)}</span>{symbolName(id)}</Link>;})}{entry.symbolIds.length>3&&<span className="small-label">+{entry.symbolIds.length-3} more</span>}</div>}
  {(series||entry.notes||entry.interpretation)&&<div className="muse-dream-entry-foot">{series&&<span className="muse-dream-series-tag">↻ {series}</span>}{entry.interpretation&&<span className="small-label">✎ Reflection</span>}{entry.notes&&<span className="small-label">Private note</span>}</div>}
 </article>;
}

/** A month of nights; each night shows a small glow per remembered dream. */
export function DreamCalendar({month,setMonth,dreams,selected,today,onDate}:{month:string;setMonth:(m:string)=>void;dreams:DreamEntry[];selected:string;today:string;onDate:(date:string)=>void}){
 const first=`${month}-01`,start=weekDates(first)[0],last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate(),offset=Math.round((Date.parse(first)-Date.parse(start))/86400000),days=Math.ceil((last+offset)/7)*7,counts=new Map<string,number>();
 for(const d of dreams)counts.set(d.date,(counts.get(d.date)??0)+1);
 const move=(n:number)=>{const date=new Date(`${first}T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()+n);setMonth(date.toISOString().slice(0,7));};
 const inMonth=dreams.filter(d=>d.date.startsWith(month)).length;
 return <div className="muse-dream-calendar">
  <div className="muse-dream-calendar-head"><button type="button" className="muse-dream-page" onClick={()=>move(-1)} aria-label="Previous month">‹</button><div><strong>{monthTitle(month)}</strong><span className="small-label">{inMonth} {inMonth===1?'dream':'dreams'} remembered</span></div><button type="button" className="muse-dream-page" onClick={()=>move(1)} aria-label="Next month">›</button></div>
  <div className="muse-dream-days">{['M','T','W','T','F','S','S'].map((d,i)=><span key={i} className="small-label" aria-hidden="true">{d}</span>)}
   {Array.from({length:days},(_,i)=>{const date=shiftDate(start,i),count=counts.get(date)??0;return <button key={date} type="button" data-outside={date.slice(0,7)!==month} data-count={Math.min(count,3)} aria-pressed={selected===date} aria-current={date===today?'date':undefined} onClick={()=>onDate(date)} aria-label={`${dateLabel(date)}, ${count} ${count===1?'dream':'dreams'}`}><span>{Number(date.slice(8))}</span>{count>0&&<i aria-hidden="true">{'•'.repeat(Math.min(count,3))}</i>}</button>;})}
  </div>
 </div>;
}
