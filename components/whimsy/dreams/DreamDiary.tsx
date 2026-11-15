'use client';
import {useState} from 'react';
import Link from 'next/link';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseIcon} from '@/components/MuseIcon';
import {emotionCatalog} from '@/lib/emotions';
import {dateLabel,shiftDate,weekDates} from '@/lib/dates';
import type {DreamEntry} from '@/lib/whimsy/models';
import {dreamClassifications,dreamDisplayTitle,dreamSearch,dreamsByMonth,paginate,type DreamSymbol} from '@/lib/whimsy/dreams';
import {MuseInviteCard,MuseJournalStats,sparkle} from '@/components/design/MuseJournal';
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
 if(!p.dreams.length)return <div className="muse-journal muse-dream-diary"><DreamHero dreams={p.dreams} today={p.today} onCapture={p.onCapture}/><section className="muse-journal-archive muse-dream-section" aria-label="Dream Diary"><div className="muse-journal-empty-row"><span className="muse-journal-empty-art muse-dream-empty-moon" aria-hidden="true">☾</span><div><h4>Your dream archive is waiting for its first strange little story.</h4><p>A fragment is enough: a place, a face, a feeling that followed you out of sleep.</p></div></div></section></div>;
 return <div className="muse-journal muse-dream-diary"><DreamHero dreams={p.dreams} today={p.today} onCapture={p.onCapture}/><section className="muse-journal-archive muse-dream-section" aria-label="Dream Diary" data-filters-open={filtersOpen}>
  <div className="muse-dream-controls">
   <DreamSearch label="Search dreams" value={search} onChange={v=>reset(()=>setSearch(v))} placeholder="Search stories, titles, symbols…" count={matches.length} noun={['dream','dreams']}/>
   <div className="muse-segmented muse-dream-segmented" role="group" aria-label="Dream display"><button type="button" aria-pressed={p.view==='timeline'} onClick={()=>p.setView('timeline')}><MuseIcon name="sort" size={14}/>Timeline</button><button type="button" aria-pressed={p.view==='calendar'} onClick={()=>p.setView('calendar')}><MuseIcon name="calendar" size={14}/>Calendar</button></div>
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
   :<div className="muse-dream-timeline muse-dream-reveal" key={`${page.page}-${p.selectedDate}-${type}`}>{dreamsByMonth(page.items).map((group,gi)=><section key={group.month} className="muse-dream-month" aria-label={monthTitle(group.month)}>
     <header><h3>{monthTitle(group.month)}</h3><span className="small-label">{matches.filter(d=>d.date.startsWith(group.month)).length} {matches.filter(d=>d.date.startsWith(group.month)).length===1?'dream':'dreams'}</span></header>
     <div className="muse-dream-list">{group.dreams.map(entry=><DreamCard key={entry.id} entry={entry} series={p.seriesName(entry.id)} symbolName={symbolName} symbols={p.symbols} symbolHref={p.symbolHref} onOpen={p.onOpen} onEdit={p.onEdit} onDelete={p.onDelete} onDecode={p.onDecode}/>)}{gi===0&&p.view==='timeline'&&<MuseInviteCard count={group.dreams.length} title="Capture a dream" note="Even a fragment is worth keeping: a place, a face, a feeling." cta="Capture" art={<DreamInviteArt/>} onClick={p.onCapture}/>}</div>
    </section>)}</div>}
  {(p.view==='timeline'||p.selectedDate)&&<DreamPager page={page} onPage={n=>{setPageNo(n);document.querySelector('[aria-label="Dream Diary"]')?.scrollIntoView({block:'start',behavior:'smooth'});}} label="Dream pages"/>}
 </section></div>;
}

/** The Dream Diary's hero (the shared journal pattern): what you've remembered, and the newest dream drifting by. */
function DreamHero({dreams,today,onCapture}:{dreams:DreamEntry[];today:string;onCapture:()=>void}){
 const month=today.slice(0,7),thisMonth=dreams.filter(d=>d.date.startsWith(month)).length,lucid=dreams.filter(d=>d.lucid||d.classifications?.includes('Lucid')).length;
 const felt=new Map<string,number>();for(const d of dreams)for(const e of d.emotions)felt.set(e,(felt.get(e)??0)+1);
 const top=[...felt].sort((a,b)=>b[1]-a[1])[0],latest=[...dreams].sort((a,b)=>b.date.localeCompare(a.date)||b.loggedAt.localeCompare(a.loggedAt))[0];
 return <section className="muse-journal-hero muse-dream-hero" aria-labelledby="dream-diary-title">
  <div className="muse-journal-hero-copy">
   <p className="muse-kicker">Dream Diary</p>
   <h3 id="dream-diary-title" className="muse-journal-title">What the night left behind</h3>
   <p>A place, a face, a feeling that followed you out of sleep. Every dream stays private, in your own words, ready to explore in the Decoder whenever you like.</p>
   {dreams.length>0&&<MuseJournalStats items={[{label:'Dreams',value:dreams.length},{label:'This month',value:thisMonth},{label:'Lucid',value:lucid},...(top?[{label:'Most felt',value:emotionName(top[0])}]:[])]}/>}
   <div className="muse-journal-actions"><button type="button" className="muse-button button-primary" onClick={onCapture}>{dreams.length?'+ Capture a dream':'Capture the first dream'}</button></div>
  </div>
  <div className="muse-journal-art muse-dream-hero-art" aria-hidden="true">
   <svg viewBox="0 0 280 210">
    <path className="muse-journal-art-trail" d="M30 70C80 40 130 36 196 60"/>
    <circle className="muse-journal-art-dot" cx="30" cy="70" r="2"/><circle className="muse-journal-art-dot" cx="110" cy="42" r="1.6"/>
    <g className="muse-journal-invite-float"><path className="muse-journal-art-moon" d="M214 30a34 34 0 1 0 30 52a29 29 0 1 1-30-52Z"/></g>
    <path className="muse-journal-art-cloud" data-back="" d="M40 186c-18 0-26-20-10-30c-2-18 22-26 34-14c8-18 38-16 42 4c18-4 28 16 16 28c4 10-4 12-14 12Z"/>
    <path className="muse-journal-art-cloud" data-back="" d="M168 196c-16 0-22-18-8-26c0-16 20-22 30-10c10-14 36-10 38 8c16 0 22 20 6 28Z"/>
    <path className="muse-journal-art-cloud" d="M96 202c-22 0-30-24-12-34c-2-22 26-30 40-16c10-22 46-20 50 6c22-4 34 20 18 34c4 8-2 10-14 10Z"/>
    <path className="muse-journal-art-twinkle" d={sparkle(70,104,6)}/><path className="muse-journal-art-twinkle" d={sparkle(252,128,5)}/><path className="muse-journal-art-twinkle" d={sparkle(150,96,4)}/><path className="muse-journal-art-twinkle" d={sparkle(22,128,3.5)}/>
    <path className="muse-journal-art-star" d={sparkle(186,118,10)}/>
   </svg>
   {latest&&<span className="muse-dream-hero-note"><small>Last remembered · {shortDate(latest.date)}</small><b>{dreamDisplayTitle(latest)}</b></span>}
  </div>
 </section>;
}

/** The invite card's drawing: a crescent resting in clouds under a few waking stars. Decorative. */
function DreamInviteArt(){
 return <svg viewBox="0 0 220 112">
  <g className="muse-journal-invite-float"><path className="muse-journal-art-moon" d="M118 14a28 28 0 1 0 24 44a24 24 0 1 1-24-44Z"/></g>
  <path className="muse-journal-art-cloud" data-back="" d="M44 104c-14 0-20-15-8-22c-1-14 17-19 26-10c7-13 30-11 32 4c14-2 21 13 11 21c2 5-2 7-10 7Z"/>
  <path className="muse-journal-art-cloud" d="M104 108c-16 0-22-17-9-25c-1-16 20-22 30-11c8-15 34-13 36 5c16-2 24 15 12 24c2 5-2 7-11 7Z"/>
  <path className="muse-journal-art-twinkle" d={sparkle(62,30,6)}/><path className="muse-journal-art-twinkle" d={sparkle(174,26,5)}/><path className="muse-journal-art-twinkle" d={sparkle(30,60,3.5)}/><path className="muse-journal-art-twinkle" d={sparkle(196,70,3.5)}/>
 </svg>;
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
  <span className="muse-dream-crescent" aria-hidden="true"/>
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
