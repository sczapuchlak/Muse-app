'use client';
import {AtlasMark} from './parts';
import {useState,type CSSProperties} from 'react';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import type {MediaItem,Series,SeriesMember} from '@/lib/collections/models';
import {emojiRanking,favoriteGenres,genreBreakdown,genrePersona,hourLabel,readingHabits,readingTraits,type Persona} from '@/lib/whimsy/reading-dna';
import {authorStats,bookSeries,finishSpeed,formatBreakdown,ratingsDistribution,readingRhythm,weekdayLabels} from '@/lib/whimsy/atlas-insights';
import {Donut,paletteAt} from './Graphics';
import {Cover} from './CoverCalendar';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import {days,duration,hours,monthLabel,num,plural} from './parts';

const bandNames={morning:'Morning',afternoon:'Afternoon',evening:'Evening',lateNight:'Late night'};
const isPersona=(p:Persona|{needed:number}):p is Persona=>'title' in p;

/** A small previous / next for a card that holds more than it shows (the card never grows). */
function Pager({at,pages,onAt,label}:{at:number;pages:number;onAt:(n:number)=>void;label:string}){
 if(pages<2)return null;
 return <span className="muse-dna-pager"><button type="button" aria-label={`Previous ${label}`} disabled={at===0} onClick={()=>onAt(at-1)}><MuseIcon name="chevron" size={13}/></button><button type="button" aria-label={`Next ${label}`} disabled={at>=pages-1} onClick={()=>onAt(at+1)}><MuseIcon name="chevron" size={13}/></button></span>;
}

/**
 * Reading DNA (Atlas V2, her mock): who you are as a reader at a glance. A heading band (personality and four numbers),
 * then rows of equal height: genres | vibes, rhythm | habits, finish speed | formats & series. Every figure is computed
 * from saved records by the same functions as Patterns and the rest of the Atlas; nothing is estimated.
 */
export function ReadingDNA({books,sessions,range,label,today,series=[],seriesMembers=[],media=[],onOpenBook}:{books:Book[];sessions:ReadingSession[];range:DateRange|null;label:string;today:string;
 series?:Series[];seriesMembers?:SeriesMember[];media?:MediaItem[];onOpenBook?:(id:string)=>void}){
 const genres=genreBreakdown(books,sessions,range),fav=favoriteGenres(genres.rows),persona=genrePersona(books,range),traits=readingTraits(books,sessions,range,today);
 const habits=readingHabits(sessions,range,today),ratings=ratingsDistribution(books,range),speed=finishSpeed(books,range),authors=authorStats(books,range),rhythm=readingRhythm(sessions,range),formats=formatBreakdown(books,range);
 const {ranking,finishedBooks}=emojiRanking(books,range),shelves=bookSeries(books,series,seriesMembers,media);
 const bands=Object.entries(rhythm.bands) as [keyof typeof bandNames,number][],topBand=rhythm.total?bands.reduce((a,b)=>b[1]>a[1]?b:a):null;
 // The busiest six hours of timed reading (the same hours data as the clock it replaces).
 const total=habits.hours.reduce((n,v)=>n+v,0);let best=0,bestSum=-1;for(let h=0;h<24;h++){const sum=Array.from({length:6},(_,i)=>habits.hours[(h+i)%24]).reduce((n,v)=>n+v,0);if(sum>bestSum){bestSum=sum;best=h;}}
 const share=total?Math.round(100*bestSum/total):0,maxCell=Math.max(1,...rhythm.grid.flat());
 const [g,setG]=useState(0),[v,setV]=useState(0),[h,setH]=useState(0);
 const gPages=Math.max(1,Math.ceil(genres.rows.length/4)),gAt=Math.min(g,gPages-1),gShown=genres.rows.slice(gAt*4,gAt*4+4),maxGenre=Math.max(1,...genres.rows.map(r=>r.finished||r.reads));
 const vPages=Math.max(1,Math.ceil(ranking.length/4)),vAt=Math.min(v,vPages-1),vShown=ranking.slice(vAt*4,vAt*4+4);
 const habitRows:{icon:MuseIconName;label:string;value?:string;detail?:string}[]=[
  {icon:'flame',label:'Most active month',value:habits.mostActiveMonth?monthLabel(habits.mostActiveMonth.month):undefined,detail:habits.mostActiveMonth?(habits.anyTime?hours(habits.mostActiveMonth.seconds):`${habits.mostActiveMonth.pages} pages`):undefined},
  {icon:'calendar',label:'Favorite reading day',value:habits.favoriteDay?.name,detail:habits.favoriteDay?plural(habits.favoriteDay.days,'reading day'):undefined},
  {icon:'moon',label:'Favorite reading hour',value:habits.topHour!==null?hourLabel(habits.topHour):undefined,detail:habits.topHour!==null?plural(habits.timedSessions,'timed session'):'Needs three timed sessions'},
  {icon:'timer',label:'Longest session',value:habits.longestSession?duration(habits.longestSession.seconds):undefined,detail:'pauses excluded'},
  {icon:'chart',label:'Average session',value:habits.averageSessionSeconds!==null?duration(habits.averageSessionSeconds):undefined,detail:'timed sessions'},
  {icon:'check',label:'Most consistent month',value:habits.mostConsistentMonth?monthLabel(habits.mostConsistentMonth.month):undefined,detail:habits.mostConsistentMonth?`read on ${habits.mostConsistentMonth.days} of ${habits.mostConsistentMonth.eligible} days`:'Needs a month of 14+ days'},
  {icon:'timer',label:'Most time in a genre',value:fav.mostTime?.genre,detail:fav.mostTime?hours(fav.mostTime.seconds):undefined},
  {icon:'book',label:'Most pages in a genre',value:fav.mostPages?.genre,detail:fav.mostPages?`${num(fav.mostPages.pages)} pages`:undefined},
 ];
 const hPages=Math.ceil(habitRows.length/3),hAt=Math.min(h,hPages-1);
 const stats:{icon:MuseIconName;value:string;label:string}[]=[
  {icon:'favorite',value:ratings.average!==null?`${ratings.average} / 5`:'—',label:'Avg. rating'},
  {icon:'timer',value:speed.typicalDays!==null?days(speed.typicalDays):'—',label:'Typical finish'},
  {icon:'moon',value:topBand?bandNames[topBand[0]]:'—',label:'Favorite time'},
  {icon:'edit',value:authors.authors.length?String(authors.authors.length):'—',label:'Authors read'},
 ];
 const seriesCover=(id:string)=>{const own=seriesMembers.filter(m=>m.series_id===id&&m.book_id).map(m=>books.find(b=>b.id===m.book_id)).filter((b):b is Book=>!!b);return own.find(b=>b.coverUrl)??own[0];};
 const formatRows=formats.rows.filter(r=>r.reads);
 return <div className="muse-atlas-section muse-dna">
  <header className="muse-dna-hero">
   <span className="muse-dna-art" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M40 8a22 22 0 1 0 16 34A19 19 0 0 1 40 8z"/></svg><i/><i/><i/></span>
   <div className="muse-dna-who"><span className="small-label">Your reading DNA · {label}</span>
    {isPersona(persona)?<><h3>{persona.title}</h3><p>{persona.line}</p></>:<><h3>Still taking shape</h3><p>Finish {plural(persona.needed,'more book')} with a genre to reveal it.</p></>}
    {traits.length>0&&<span className="muse-dna-traits">{traits.map(t=><em key={t.title} title={t.evidence}>{t.title}</em>)}</span>}</div>
   <dl className="muse-dna-stats">{stats.map(s=><div key={s.label}><span aria-hidden="true"><MuseIcon name={s.icon} size={17}/></span><dd className="type-numeric">{s.value}</dd><dt>{s.label}</dt></div>)}</dl>
  </header>

  <div className="muse-dna-row" data-row="genres">
   <article className="muse-books-panel muse-dna-card"><div className="muse-books-panel-head"><h4><AtlasMark title="Genre breakdown"/>Genre breakdown</h4><Pager at={gAt} pages={gPages} onAt={setG} label="genres"/></div>
    {!genres.rows.length?<p>Add genres to your books to see their place in your reading life.</p>:<div className="muse-dna-genres">
     <Donut size={128} slices={genres.rows.slice(0,7).map(r=>({key:r.key,label:r.genre,value:r.finished||r.reads}))} main={genres.rows.length} sub={genres.rows.length===1?'genre':'genres'} label={`Genres by finished books: ${genres.rows.slice(0,7).map(r=>`${r.genre} ${r.share}%`).join(', ')}`}/>
     <ol className="muse-dna-genre-bars">{gShown.map(r=>{const i=genres.rows.indexOf(r),c=paletteAt(i<7?i:7);return <li key={r.key} style={{'--c':c,'--w':`${Math.max(4,Math.round(100*(r.finished||r.reads)/maxGenre))}%`} as CSSProperties}><i aria-hidden="true"/><strong>{r.genre}</strong><span className="muse-dna-bar" aria-hidden="true"><b/></span><small className="type-numeric">{genres.finishedBooks?`${r.share}%`:'—'} ({r.finished})</small></li>;})}</ol></div>}
    {genres.rows.length>0&&<p className="muse-dna-note">A book with several genres counts in each, so shares can add up to more than 100%{genres.overlapping?' (they do here)':''}.</p>}
   </article>
   <article className="muse-books-panel muse-dna-card"><div className="muse-books-panel-head"><h4><AtlasMark title="Reading vibes"/>Reading vibes</h4><Pager at={vAt} pages={vPages} onAt={setV} label="emojis"/></div>
    {!ranking.length?<p>{finishedBooks?'Add Book in Three Emojis to your finished books and their vibe collects here.':`No finished books ${label} yet.`}</p>
     :<><ul className="muse-dna-vibes">{vShown.map(e=><li key={e.emoji} title={`${e.emoji} on ${plural(e.books,'book')}, used ${plural(e.reads,'time')}`}><span aria-hidden="true">{e.emoji}</span><strong className="type-numeric">{finishedBooks?Math.round(100*e.books/finishedBooks):0}%</strong><small className="type-numeric">{plural(e.books,'book')}</small></li>)}</ul>
      <p className="muse-dna-note">Share of finished books with each emoji.</p></>}
   </article>
  </div>

  <div className="muse-dna-row" data-row="rhythm">
   <article className="muse-books-panel muse-dna-card"><div className="muse-books-panel-head"><h4><AtlasMark title="Reading rhythm"/>Reading rhythm</h4><span className="small-label">Weekday × hour</span></div>
    {!rhythm.total?<p>Timed sessions will draw your week here.</p>:<div className="muse-dna-rhythm">
     <div className="muse-atlas-heatmap" role="img" aria-label={`Reading time by weekday and hour. Most on ${weekdayLabels[rhythm.topDay!]}s, around ${hourLabel(rhythm.topHour!)}.`}>
      <span aria-hidden="true"/>{Array.from({length:24},(_,hh)=><span key={hh} className="muse-atlas-heat-hour" aria-hidden="true">{hh%6===0?hourLabel(hh):''}</span>)}
      {rhythm.grid.map((row,d)=>[<span key={`d${d}`} className="muse-atlas-heat-day" aria-hidden="true">{weekdayLabels[d].slice(0,3)}</span>,
       ...row.map((val,hh)=><span key={`${d}:${hh}`} className="muse-atlas-heat-cell" title={`${weekdayLabels[d]} ${hourLabel(hh)}: ${duration(val)}`} style={{'--heat':val?.15+.85*val/maxCell:0} as CSSProperties} aria-hidden="true"/>)])}
     </div>
     {total>0&&<p className="muse-dna-window"><strong className="muse-gradient-num type-numeric">{share}%</strong>of your reading happens between <b>{hourLabel(best)} – {hourLabel((best+6)%24)}</b></p>}
    </div>}
   </article>
   <article className="muse-books-panel muse-dna-card"><div className="muse-books-panel-head"><h4><AtlasMark title="Reading habits"/>Reading habits</h4><Pager at={hAt} pages={hPages} onAt={setH} label="habits"/></div>
    <ul className="muse-dna-habits">{habitRows.slice(hAt*3,hAt*3+3).map(r=><li key={r.label}><span className="muse-dna-habit-icon" aria-hidden="true"><MuseIcon name={r.icon} size={15}/></span><span>{r.label}</span>{r.value?<strong title={r.detail}>{r.value}</strong>:<small>{r.detail??'Not enough yet'}</small>}</li>)}</ul>
   </article>
  </div>

  <div className="muse-dna-row" data-row="speed">
   <article className="muse-books-panel muse-dna-card"><div className="muse-books-panel-head"><h4><AtlasMark title="Finish speed"/>Finish speed</h4><span className="small-label">Start to finish</span></div>
    {!speed.reads?<p>Reads with a start and finish date will show how long stories stay with you.</p>:<div className="muse-dna-speed">
     <button type="button" onClick={()=>onOpenBook?.(speed.fastest!.book.bookId)}><span aria-hidden="true">⚡</span><small>Fastest</small><strong>{days(speed.fastest!.days)}</strong><em>{speed.fastest!.book.title}</em></button>
     <button type="button" onClick={()=>onOpenBook?.(speed.slowest!.book.bookId)}><span aria-hidden="true">🐢</span><small>Slowest</small><strong>{days(speed.slowest!.days)}</strong><em>{speed.slowest!.book.title}</em></button></div>}
   </article>
   <article className="muse-books-panel muse-dna-card"><div className="muse-books-panel-head"><h4><AtlasMark title="Formats and series"/>Formats &amp; series</h4></div>
    <div className="muse-dna-formats">
     {formats.reads?<div><span className="muse-dna-segs" role="img" aria-label={formatRows.map(r=>`${r.label} ${r.share}%`).join(', ')}>{formatRows.map((r,i)=><b key={r.format} style={{flexGrow:r.reads,'--c':paletteAt(i)} as CSSProperties}/>)}</span>
      <ul className="muse-dna-seg-key">{formatRows.map((r,i)=><li key={r.format} style={{'--c':paletteAt(i)} as CSSProperties}><i aria-hidden="true"/>{r.label} <span className="type-numeric">{r.share}% ({r.reads})</span></li>)}</ul></div>:<p>No finished reads {label} yet.</p>}
     {shelves.length>0&&<ul className="muse-dna-series" aria-label="Series">{shelves.slice(0,3).map(({series:s,progress:p})=><li key={s.id} title={`${s.title}${p.availableTotal?` · ${p.completed} of ${p.availableTotal}`:''}`}><Cover book={seriesCover(s.id)}/></li>)}{shelves.length>3&&<li className="muse-dna-series-more type-numeric">+{shelves.length-3}</li>}</ul>}
    </div>
   </article>
  </div>
 </div>;
}
