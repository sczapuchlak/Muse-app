import type {AstrologyEntry} from '@/lib/astrology/library';
import {libraryEntry} from '@/lib/astrology/library';

/** One complete reading surface for every library category; its visual identity comes from the entry metadata. */
export function AstrologyEntryDetail({entry,onOpen,onReflect,onCalendar}:{entry:AstrologyEntry;onOpen:(id:string)=>void;onReflect?:(id:string)=>void;onCalendar?:()=>void}){
 return <article className="muse-cosmic-entry" data-entry-id={entry.id} data-category={entry.category}>
  <header className="muse-cosmic-entry-hero"><span className="muse-cosmic-entry-symbol" aria-hidden="true">{entry.glyph??({Planets:'☉',Houses:'⌂',Elements:'◇',Modalities:'✧',Aspects:'✳',Concepts:'✦',Signs:'✦'} as const)[entry.category]}</span><div><p className="small-label">{entry.category} · Muse original editorial</p><h3>{entry.title}</h3><p className="muse-cosmic-lead">{entry.summary}</p></div></header>
  {entry.tags.length>0&&<div className="muse-cosmic-entry-badges" aria-label="Related themes">{entry.tags.slice(0,4).map(tag=><span key={tag}>{tag}</span>)}</div>}
  <div className="muse-cosmic-entry-sections">{entry.sections.map(section=><section key={section.title}><h4>{section.title}</h4><p>{section.text}</p></section>)}</div>
  {onReflect&&<button type="button" className="muse-button button-primary muse-cosmic-entry-reflect" onClick={()=>onReflect(entry.id)}>✦ Keep a Reflection</button>}
  {onCalendar&&['concept-lunar-phases','concept-transits'].includes(entry.id)&&<button type="button" className="muse-button button-ghost muse-cosmic-entry-calendar" onClick={onCalendar}>View calculated lunar and seasonal events →</button>}
  <section className="muse-cosmic-entry-related"><h4>Keep exploring</h4><div className="muse-cosmic-actions">{entry.related.map(id=>{const related=libraryEntry(id);return related?<button type="button" className="muse-button button-ghost" key={id} onClick={()=>onOpen(id)}>{related.glyph&&<span aria-hidden="true">{related.glyph} </span>}{related.title}</button>:null;})}</div></section>
  <p className="small-label">Reference traditions and factual sources: {entry.sources.map((source,index)=><span key={source.url}>{index?' · ':''}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.name} ↗</a></span>)}</p>
 </article>;
}
