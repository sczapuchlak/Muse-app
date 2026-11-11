'use client';
import {useRef,useState} from 'react';
import {GlassPopover} from '@/components/GlassPopover';
import {MuseIcon} from '@/components/MuseIcon';
import {MuseSearch} from '@/components/design/MuseSearch';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {dateLabel} from '@/lib/dates';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {sessionSeconds} from '@/lib/whimsy/reading-stats';

const minutes=(seconds:number)=>seconds?seconds<60?'under a minute':`${Math.round(seconds/60)} min`:'time not recorded';
const kinds={all:'All sessions',timed:'Timed',manual:'Logged manually',reread:'Rereads'} as const;
type Kind=keyof typeof kinds;
const PAGE=40;

function RowMenu({id,label,onEdit,onDelete}:{id:string;label:string;onEdit:()=>void;onDelete:()=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[open,setOpen]=useState(false);
 return <span className="muse-history-menu"><button ref={anchor} type="button" className="muse-button button-ghost" aria-label={`Session ${label}: edit or delete`} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>⋯</button>
  <GlassPopover id={`history-${id}`} label={`Session ${label}`} open={open} anchorRef={anchor} onClose={()=>setOpen(false)} width={200} align="end" bare><div className="muse-history-actions"><button type="button" className="popover-choice" onClick={()=>{setOpen(false);onEdit();}}><MuseIcon name="edit" size={15}/>Edit session</button><button type="button" className="popover-choice" onClick={()=>{setOpen(false);onDelete();}}><MuseIcon name="trash" size={15}/>Delete</button></div></GlassPopover></span>;
}

/** Every saved session, newest first, filterable by book, date range, type and text. Edits reuse the session editor. */
export function SessionHistory({sessions,books,onEdit,onDelete}:{sessions:ReadingSession[];books:Book[];onEdit:(session:ReadingSession)=>void;onDelete:(session:ReadingSession)=>void}){
 const [bookId,setBookId]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[kind,setKind]=useState<Kind>('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(PAGE);
 const title=(id:string)=>{const book=books.find(b=>b.id===id);return book?`${book.title}${book.archivedAt?' (archived)':''}`:'Book unavailable';};
 const text=query.trim().toLowerCase();
 const rows=sessions.filter(s=>(!bookId||s.bookId===bookId)&&(!from||s.date>=from)&&(!to||s.date<=to)
  &&(kind==='all'||(kind==='reread'?!!s.reread:kind==='manual'?!!s.manual:!s.manual))
  &&(!text||`${title(s.bookId)} ${s.notes??''}`.toLowerCase().includes(text)))
  .sort((a,b)=>b.date.localeCompare(a.date)||(b.activeSegments[0]?.start??b.createdAt).localeCompare(a.activeSegments[0]?.start??a.createdAt));
 const seconds=rows.reduce((n,s)=>n+sessionSeconds(s),0),pages=rows.reduce((n,s)=>n+s.pages,0);
 const bookOptions=[{id:'',label:'All books'},...[...books].sort((a,b)=>a.title.localeCompare(b.title)).map(b=>({id:b.id,label:`${b.title}${b.archivedAt?' (archived)':''}`}))];
 return <article className="muse-books-panel muse-books-history">
  <div className="muse-books-panel-head"><h4>Session history</h4><span className="small-label">{rows.length} {rows.length===1?'session':'sessions'} · {minutes(seconds)} · {pages} pages</span></div>
  <div className="muse-books-history-filters">
   <MuseChoiceMenu label="Book" valueLabel={bookOptions.find(o=>o.id===bookId)?.label??'All books'} options={bookOptions} selectedIds={[bookId]} onSelect={id=>{setBookId(id);setLimit(PAGE);}}/>
   <MuseChoiceMenu label="Session type" valueLabel={kinds[kind]} options={Object.entries(kinds).map(([id,label])=>({id,label}))} selectedIds={[kind]} onSelect={id=>{setKind(id as Kind);setLimit(PAGE);}}/>
   <MuseSearch className="muse-books-history-search" label="Search sessions" value={query} onChange={v=>{setQuery(v);setLimit(PAGE);}} placeholder="Search titles and notes"/>
   <details className="muse-history-dates" open={!!(from||to)}><summary>{from||to?`${from?dateLabel(from):'Start'} – ${to?dateLabel(to):'today'}`:'Dates'}</summary><div><label>From<input type="date" value={from} max={to||undefined} onChange={e=>{setFrom(e.target.value);setLimit(PAGE);}}/></label><label>To<input type="date" value={to} min={from||undefined} onChange={e=>{setTo(e.target.value);setLimit(PAGE);}}/></label>{(from||to)&&<button type="button" className="text-button" onClick={()=>{setFrom('');setTo('');}}>Clear</button>}</div></details>
  </div>
  {!sessions.length?<p>Saved sessions will be listed here.</p>:!rows.length?<p>No sessions match these filters.</p>:<ol className="muse-books-history-list">
   {rows.slice(0,limit).map(s=>{const d=new Date(`${s.date}T12:00:00Z`);return <li key={s.id} className="muse-history-row" data-manual={s.manual||undefined}>
    <span className="muse-history-date" aria-hidden="true"><span>{new Intl.DateTimeFormat(undefined,{month:'short',timeZone:'UTC'}).format(d)}</span><strong className="type-numeric">{d.getUTCDate()}</strong></span>
    <div className="muse-history-body"><strong className="muse-history-title"><span className="sr-only">{dateLabel(s.date)} · </span>{title(s.bookId)}</strong>
     <p className="muse-history-line"><span className="type-numeric">{minutes(sessionSeconds(s))}</span><span className="type-numeric">{s.pages} {s.pages===1?'page':'pages'}</span>{s.startingPage!==undefined&&s.endingPage!==undefined&&<span className="type-numeric">p. {s.startingPage}–{s.endingPage}</span>}{s.reread&&<em>reread</em>}{s.manual&&<em>logged</em>}</p>
     {s.notes&&<blockquote>{s.notes}</blockquote>}</div>
    <RowMenu id={s.id} label={`${dateLabel(s.date)} ${title(s.bookId)}`} onEdit={()=>onEdit(s)} onDelete={()=>onDelete(s)}/>
   </li>;})}
  </ol>}
  {rows.length>limit&&<button type="button" className="muse-button button-ghost" onClick={()=>setLimit(limit+PAGE)}>Show {Math.min(PAGE,rows.length-limit)} more</button>}
 </article>;
}
