'use client';
import {useState,type CSSProperties} from 'react';
import {MuseModal} from '@/components/MuseModal';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import type {MediaItem,Series,SeriesMember} from '@/lib/collections/models';
import {Cover} from './CoverCalendar';
import {PagedList} from './PagedList';
import {authorStats,bookSeries,finishSpeed,formatBreakdown,ratingsDistribution,readingRhythm,weekdayLabels,type BookRef} from '@/lib/whimsy/atlas-insights';
import {emojisByGenre,emojisByYear,hourLabel} from '@/lib/whimsy/reading-dna';
import {Insight,days,duration,hours,plural,yearDate} from './parts';

/** The books behind a figure: a button that opens them in a modal, so every number can be checked without reflowing the page. */
function BookList({books,label,title,onOpenBook}:{books:BookRef[];label:string;title:string;onOpenBook?:(id:string)=>void}){
 const [open,setOpen]=useState(false);
 if(!books.length)return null;
 return <><button type="button" className="muse-atlas-booklist-open" onClick={()=>setOpen(true)}>{label} <span aria-hidden="true">›</span></button>
  {open&&<MuseModal id="atlas-books-behind" label={`${title}: ${label}`} title={title} returnFocus={null} onClose={()=>setOpen(false)}><ul className="muse-atlas-modal-books">{books.map((b,i)=><li key={`${b.bookId}:${b.finishedOn??i}`}>
   {onOpenBook?<button type="button" className="text-button" onClick={()=>{setOpen(false);onOpenBook(b.bookId);}}>{b.title}</button>:<span>{b.title}</span>}{b.finishedOn&&<small>{yearDate(b.finishedOn)}</small>}</li>)}</ul></MuseModal>}</>;
}

/** A horizontal bar row with its own count and books list. */
function Row({label,value,max,text,books,onOpenBook}:{label:string;value:number;max:number;text:string;books:BookRef[];onOpenBook?:(id:string)=>void}){
 return <li className="muse-atlas-row"><div><span>{label}</span><strong>{text}</strong></div>
  <span className="muse-atlas-row-bar" style={{'--bar':`${max?Math.round(value/max*100):0}%`} as CSSProperties} aria-hidden="true"/>
  <BookList books={books} title={label} label={`Show ${plural(books.length,'book')}`} onOpenBook={onOpenBook}/></li>;
}

const stars=(v:number)=>`${'★'.repeat(Math.floor(v))}${v%1?'½':''}`;
const bandNames={morning:'Morning (5–12)',afternoon:'Afternoon (12–5)',evening:'Evening (5–10)',lateNight:'Late night (10–5)'};

/**
 * Patterns (#50): ratings, rhythm, formats, finish speed, authors, series and emojis by genre and year. Every figure
 * names what it counts and opens the books behind it. Nothing here is estimated; missing data stays visible as such.
 */
export function Patterns({books,sessions,range,label,series,seriesMembers,media,onOpenBook}:{books:Book[];sessions:ReadingSession[];range:DateRange|null;label:string;series:Series[];seriesMembers:SeriesMember[];media:MediaItem[];onOpenBook?:(id:string)=>void}){
 const [table,setTable]=useState(false);
 const ratings=ratingsDistribution(books,range),rhythm=readingRhythm(sessions,range),formats=formatBreakdown(books,range),speed=finishSpeed(books,range),authors=authorStats(books,range);
 const shelves=bookSeries(books,series,seriesMembers,media),seriesCover=(id:string)=>{const own=seriesMembers.filter(m=>m.series_id===id&&m.book_id).map(m=>books.find(b=>b.id===m.book_id)).filter((b):b is Book=>!!b);return own.find(b=>b.coverUrl)??own[0];},byGenre=emojisByGenre(books,range,3),byYear=emojisByYear(books,3);
 const maxRating=Math.max(0,...ratings.buckets.map(b=>b.reads)),maxCell=Math.max(1,...rhythm.grid.flat()),maxFormat=Math.max(0,...formats.rows.map(r=>r.reads)),maxSpeed=Math.max(0,...speed.bands.map(b=>b.reads));
 const bands=Object.entries(rhythm.bands) as [keyof typeof bandNames,number][],topBand=rhythm.total?bands.reduce((a,b)=>b[1]>a[1]?b:a):null;
 return <div className="muse-atlas-section muse-atlas-patterns">
  <div className="muse-atlas-insights">
   <Insight label="Average rating" value={ratings.average!==null?`${ratings.average}/5`:undefined} detail={ratings.rated?`${plural(ratings.rated,'rated read')} ${label}`:undefined} empty="No rated reads in this period"/>
   <Insight label="Typical time to finish" value={speed.typicalDays!==null?days(speed.typicalDays):undefined} detail={speed.reads?`Median of ${plural(speed.reads,'read')} with a start date`:undefined} empty="Needs finished reads with a start date"/>
   <Insight label="Favorite time of day" value={topBand?bandNames[topBand[0]].split(' (')[0]:undefined} detail={topBand?`${hours(topBand[1])} of active time`:undefined} empty="Needs timed sessions"/>
   {range?<Insight label="New authors" value={authors.authors.length?String(authors.newAuthors):undefined} detail={authors.authors.length?plural(authors.returningAuthors,'returning author'):undefined} empty="No finished books with an author"/>
    :<Insight label="Authors read" value={authors.authors.length?String(authors.authors.length):undefined} detail={authors.authors[0]?`Most read: ${authors.authors[0].author}`:undefined} empty="No finished books with an author"/>}
  </div>

  <div className="muse-atlas-books-pair muse-atlas-pair-top">
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Reading rhythm</h4><span className="small-label">Weekday × hour</span></div>
   {!rhythm.total?<p>Timed sessions will draw your week here.</p>:<>
    <div className="muse-atlas-heatmap" role="img" aria-label={`Reading time by weekday and hour. Most on ${weekdayLabels[rhythm.topDay!]}s, around ${hourLabel(rhythm.topHour!)}.`}>
     <span aria-hidden="true"/>{Array.from({length:24},(_,h)=><span key={h} className="muse-atlas-heat-hour" aria-hidden="true">{h%6===0?hourLabel(h):''}</span>)}
     {rhythm.grid.map((row,d)=>[<span key={`d${d}`} className="muse-atlas-heat-day" aria-hidden="true">{weekdayLabels[d].slice(0,3)}</span>,
      ...row.map((v,h)=><span key={`${d}:${h}`} className="muse-atlas-heat-cell" title={`${weekdayLabels[d]} ${hourLabel(h)}: ${duration(v)}`} style={{'--heat':v?.15+.85*v/maxCell:0} as CSSProperties} aria-hidden="true"/>)])}
    </div>
    <button type="button" className="muse-atlas-booklist-open" onClick={()=>setTable(true)}>Show as a table <span aria-hidden="true">›</span></button>
    {table&&<MuseModal id="atlas-rhythm-table" label="Reading rhythm as a table" title="Reading rhythm" returnFocus={null} onClose={()=>setTable(false)}><div className="muse-atlas-table-wrap"><table className="muse-atlas-table"><thead><tr><th scope="col">Day</th>{bands.map(([k])=><th key={k} scope="col">{bandNames[k]}</th>)}</tr></thead>
     <tbody>{rhythm.grid.map((row,d)=>{const sum=(a:number,b:number)=>row.slice(a,b).reduce((x,y)=>x+y,0);const cells=[sum(5,12),sum(12,17),sum(17,22),sum(22,24)+sum(0,5)];
      return <tr key={d}><th scope="row">{weekdayLabels[d]}</th>{cells.map((v,i)=><td key={i}>{v?duration(v):'—'}</td>)}</tr>;})}</tbody></table></div></MuseModal>}
    <p className="muse-atlas-bands">{bands.map(([k,v])=><span key={k}><strong>{bandNames[k].split(' (')[0]}</strong> {rhythm.total?Math.round(v/rhythm.total*100):0}%</span>)}</p></>}
   <p className="small-label">Active time from {plural(rhythm.timedSessions,'timed session')}, in each session’s own time zone and split across hours, so late nights land on both days.{rhythm.excludedSessions?` ${plural(rhythm.excludedSessions,'manual entry','manual entries')} without times excluded.`:''}</p>
  </article>
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Ratings</h4><span className="small-label">{label}</span></div>
   {!ratings.rated?<p>{ratings.unrated?'Rate a finished read to see your ratings take shape.':`No finished reads ${label} yet.`}</p>
    :<ol className="muse-atlas-rows" aria-label="Ratings distribution">{ratings.buckets.map(b=><Row key={b.value} label={`${stars(b.value)} ${b.value}`} value={b.reads} max={maxRating} text={plural(b.reads,'read')} books={b.books} onOpenBook={onOpenBook}/>)}</ol>}
   <p className="small-label">Each finished read counts with its own rating, so a reread can rate differently.{ratings.unrated?` ${plural(ratings.unrated,'unrated read')} not shown.`:''}</p>
  </article>
  </div>

  <div className="muse-books-atlas-grid">
   <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Formats</h4><span className="small-label">{plural(formats.reads,'finished read')}</span></div>
    {!formats.reads?<p>No finished reads {label} yet.</p>:<ol className="muse-atlas-rows">{formats.rows.filter(r=>r.reads).map(r=><Row key={r.format} label={r.label} value={r.reads} max={maxFormat} text={`${r.reads} · ${r.share}%`} books={r.books} onOpenBook={onOpenBook}/>)}</ol>}
    <p className="small-label">From each book’s saved format; books without one stay “Not recorded”.</p></article>
   <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Finish speed</h4><span className="small-label">Start to finish</span></div>
    {!speed.reads?<p>Reads with a start and finish date will show how long stories stay with you.</p>:<>
     <div className="muse-atlas-speed"><span><small className="small-label">Fastest</small><strong>{days(speed.fastest!.days)}</strong><small>{speed.fastest!.book.title}</small></span><span><small className="small-label">Slowest</small><strong>{days(speed.slowest!.days)}</strong><small>{speed.slowest!.book.title}</small></span></div>
     <ol className="muse-atlas-rows">{speed.bands.filter(b=>b.reads).map(b=><Row key={b.id} label={b.label} value={b.reads} max={maxSpeed} text={plural(b.reads,'read')} books={b.books} onOpenBook={onOpenBook}/>)}</ol></>}
    <p className="small-label">Calendar days, counting the start and finish days, for each read’s own dates.{speed.missingStart?` ${plural(speed.missingStart,'read')} without a start date not included.`:''}</p></article>
  </div>

  <div className="muse-atlas-books-pair muse-atlas-pair-short" data-solo={shelves.length===0||undefined}>
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Authors</h4><span className="small-label">{authors.authors.length&&range?`${authors.newAuthors} new · ${authors.returningAuthors} returning`:label}</span></div>
   {!authors.authors.length?<p>Finished books with an author will gather here.</p>:<PagedList tag="ol" className="muse-atlas-rows" items={authors.authors} size={5} label="authors" render={a=><Row key={a.author} label={`${a.author}${a.isNew&&range?' · new':''}`} value={a.reads} max={authors.authors[0].reads} text={`${plural(a.books,'book')}${a.reads>a.books?` · ${plural(a.reads,'read')}`:''}`} books={a.bookList} onOpenBook={onOpenBook}/>}/>}
   <p className="small-label">Co-authors each count. “New” means your first finished read by them falls in this period.{authors.unknownAuthorReads?` ${plural(authors.unknownAuthorReads,'read')} without an author not shown.`:''}</p>
  </article>

  {shelves.length>0&&<article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Series</h4><span className="small-label">From Collections</span></div>
   <PagedList tag="ul" className="muse-atlas-series" items={shelves} size={3} label="series" render={({series:s,progress:p})=><li key={s.id}><span className="muse-atlas-series-cover" aria-hidden="true"><Cover book={seriesCover(s.id)}/></span><div className="muse-atlas-series-body"><div><strong>{s.title}</strong><small>{p.availableTotal?`${p.completed} of ${p.availableTotal} ${s.kind==='book'&&s.catalog_source?'primary books read':'released'}`:'Release order not set'}{s.kind==='book'&&s.catalog_source?(p.availableTotal&&p.completed>=p.availableTotal?(p.total>p.availableTotal?' · caught up':' · core complete'):''):p.status==='completed'?' · complete':p.status==='caught-up'?' · caught up':''}</small></div>
    {p.percentage!==null&&<progress value={p.completed} max={p.availableTotal} aria-label={`${s.title}: ${p.completed} of ${p.availableTotal}`}/>}
    {p.next&&<span className="small-label">Next: {p.next.kind==='book'&&onOpenBook?<button type="button" className="text-button" onClick={()=>onOpenBook(p.next!.id)}>{p.next.title}</button>:p.next.title}</span>}</div></li>}/>
   <p className="small-label">Progress follows the series order and scope set in Collections.</p></article>}
  </div>

  <div className="muse-books-atlas-grid">
   <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Emojis by genre</h4><span className="small-label">{label}</span></div>
    {!byGenre.length?<p>Emojis on finished books with genres will show each genre’s mood.</p>:<ul className="muse-atlas-emoji-rows">{byGenre.slice(0,8).map(g=><li key={g.genre}><span>{g.genre}</span><span className="muse-atlas-emoji-set" aria-label={g.top.map(e=>`${e.emoji} on ${plural(e.books,'book')}`).join(', ')}>{g.top.map(e=><span key={e.emoji} aria-hidden="true">{e.emoji}</span>)}</span></li>)}</ul>}</article>
   <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Emojis by year</h4><span className="small-label">All years</span></div>
    {!byYear.length?<p>Each year’s three emojis will appear once finished books have them.</p>:<ul className="muse-atlas-emoji-rows">{byYear.map(y=><li key={y.year}><span>{y.year}</span><span className="muse-atlas-emoji-set" aria-label={y.top.map(e=>`${e.emoji} on ${plural(e.books,'book')}`).join(', ')}>{y.top.map(e=><span key={e.emoji} aria-hidden="true">{e.emoji}</span>)}</span></li>)}</ul>}</article>
  </div>
  <p className="small-label">Emoji counts use each read’s own emojis; a book counts each emoji once per period.</p>
 </div>;
}
