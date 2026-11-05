'use client';
import {useId} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {emotionCatalog} from '@/lib/emotions';
import {dreamTypeMeta,pageWindow,type Page} from '@/lib/whimsy/dreams';

export const emotionName=(id:string)=>emotionCatalog.find(e=>e.id===id)?.name??id;
export const monthTitle=(month:string)=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
export const shortDate=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));

/** A dream type as a small theme-toned glyph and label (Lucid ◐, Nightmare ☾, Recurring ↻ …). */
export function DreamTypeBadge({type,compact=false}:{type:string;compact?:boolean}){
 const meta=dreamTypeMeta[type]??{glyph:'✧',tone:'neutral'};
 return <span className="muse-dream-type" data-tone={meta.tone} title={type}><span aria-hidden="true">{meta.glyph}</span>{compact?<span className="sr-only">{type}</span>:type}</span>;
}

/** Search with an icon, a clear button and a live result count. */
export function DreamSearch({label,value,onChange,placeholder,count,noun}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string;count?:number;noun?:[string,string]}){
 const id=useId();
 return <div className="muse-dream-search"><label htmlFor={id} className="sr-only">{label}</label><MuseIcon name="search" size={17}/>
  <input id={id} type="search" value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&value){e.preventDefault();onChange('');}}}/>
  {value&&<button type="button" className="muse-dream-search-clear" aria-label={`Clear ${label.toLowerCase()}`} onClick={()=>onChange('')}><MuseIcon name="close" size={14}/></button>}
  {count!==undefined&&noun&&<span className="muse-dream-search-count" role="status">{count} {count===1?noun[0]:noun[1]}</span>}
 </div>;
}

/** Numbered pagination with gaps, previous/next and a "1–12 of 62" summary. Hidden when everything fits. */
export function DreamPager({page,onPage,label}:{page:Page<unknown>;onPage:(page:number)=>void;label:string}){
 if(page.pages<=1)return page.total?<p className="muse-dream-pager-summary small-label">{page.total} shown</p>:null;
 return <nav className="muse-dream-pager" aria-label={label}>
  <span className="small-label">{page.start}–{page.end} of {page.total}</span>
  <div>
   <button type="button" className="muse-dream-page" disabled={page.page===0} onClick={()=>onPage(page.page-1)} aria-label="Previous page">‹</button>
   {pageWindow(page.page,page.pages).map((p,i)=>p==='gap'?<span key={`gap-${i}`} className="muse-dream-page-gap" aria-hidden="true">…</span>:<button key={p} type="button" className="muse-dream-page" aria-current={p===page.page?'page':undefined} aria-label={`Page ${p+1}`} onClick={()=>onPage(p)}>{p+1}</button>)}
   <button type="button" className="muse-dream-page" disabled={page.page>=page.pages-1} onClick={()=>onPage(page.page+1)} aria-label="Next page">›</button>
  </div>
 </nav>;
}
