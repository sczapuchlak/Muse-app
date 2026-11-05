'use client';
import {useState} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {dateLabel} from '@/lib/dates';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {sessionSeconds} from '@/lib/whimsy/reading-stats';

const minutes=(seconds:number)=>seconds?seconds<60?'under a minute':`${Math.round(seconds/60)} min`:'time not recorded';
const kinds={all:'All sessions',timed:'Timed',manual:'Logged manually',reread:'Rereads'} as const;
type Kind=keyof typeof kinds;
const PAGE=40;

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
   <label>From<input type="date" value={from} max={to||undefined} onChange={e=>{setFrom(e.target.value);setLimit(PAGE);}}/></label>
   <label>To<input type="date" value={to} min={from||undefined} onChange={e=>{setTo(e.target.value);setLimit(PAGE);}}/></label>
   <label className="muse-books-history-search"><span className="sr-only">Search sessions</span><input type="search" placeholder="Search titles and notes" value={query} onChange={e=>{setQuery(e.target.value);setLimit(PAGE);}}/></label>
  </div>
  {!sessions.length?<p>Saved sessions will be listed here.</p>:!rows.length?<p>No sessions match these filters.</p>:<ol className="muse-books-history-list">
   {rows.slice(0,limit).map(s=><li key={s.id} className="muse-books-session-row">
    <div><strong>{dateLabel(s.date)} · {title(s.bookId)}</strong>
     <span>{minutes(sessionSeconds(s))} · {s.pages} {s.pages===1?'page':'pages'}{s.startingPage!==undefined&&s.endingPage!==undefined?` (p. ${s.startingPage}–${s.endingPage})`:''}{s.reread?' · reread':''}{s.manual?' · logged manually':''}</span>
     {s.notes&&<p>{s.notes}</p>}</div>
    <button type="button" className="text-button" onClick={()=>onEdit(s)}>Edit</button>
    <button type="button" className="text-button" onClick={()=>onDelete(s)}>Delete</button>
   </li>)}
  </ol>}
  {rows.length>limit&&<button type="button" className="muse-button button-ghost" onClick={()=>setLimit(limit+PAGE)}>Show {Math.min(PAGE,rows.length-limit)} more</button>}
 </article>;
}
