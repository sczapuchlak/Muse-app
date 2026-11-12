'use client';
import {useState} from 'react';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import {emojiRanking,favoriteGenres,genreBreakdown,genrePersona,hourLabel,readingHabits,readingTraits,type Persona} from '@/lib/whimsy/reading-dna';
import {PagedList} from './PagedList';
import {MuseIcon} from '@/components/MuseIcon';
import {ActivityBars,Insight,duration,hours,monthLabel,num,plural} from './parts';

/** Personality, genres, habits and book emojis for one period. Every line is computed from saved records. */
export function ReadingDNA({books,sessions,range,label,today}:{books:Book[];sessions:ReadingSession[];range:DateRange|null;label:string;today:string}){
 const [genrePage,setGenrePage]=useState(0);
 const genres=genreBreakdown(books,sessions,range),fav=favoriteGenres(genres.rows),persona=genrePersona(books,range),traits=readingTraits(books,sessions,range,today);
 const habits=readingHabits(sessions,range,today),emojis=emojiRanking(books,range);
 const isPersona=(p:Persona|{needed:number}):p is Persona=>'title' in p;
 return <div className="muse-atlas-section">
  <article className="muse-books-panel muse-atlas-persona"><span className="small-label">Your reading personality · {label}</span>
   {isPersona(persona)?<><h4>{persona.title}</h4><p>{persona.line}</p><small className="small-label">{persona.evidence}</small></>
    :<><h4>Still taking shape</h4><p>Finish {plural(persona.needed,'more book')} with a genre {label==='all time'?'':`${label} `}to reveal your genre personality.</p></>}
   {traits.length>0&&<ul className="muse-atlas-traits">{traits.map(t=><li key={t.title}><strong>{t.title}</strong><span>{t.line}</span><small className="small-label">{t.evidence}</small></li>)}</ul>}
   <p className="small-label">Personalities follow fixed rules about your genres and reading times, never guesses.</p>
  </article>
  <div className="muse-atlas-insights" data-tone="genre">
   <Insight label="Most read genre" value={fav.mostRead?.genre} detail={fav.mostRead&&plural(fav.mostRead.reads,'finished read')} empty="Add genres to finished books"/>
   <Insight label="Most time spent" value={fav.mostTime?.genre} detail={fav.mostTime&&hours(fav.mostTime.seconds)} empty="Needs timed sessions on books with genres"/>
   <Insight label="Most pages read" value={fav.mostPages?.genre} detail={fav.mostPages&&`${num(fav.mostPages.pages)} pages`} empty="Needs sessions with pages on books with genres"/>
  </div>
  <div className="muse-atlas-insights" data-tone="habit">
   <Insight label="Favorite reading day" value={habits.favoriteDay?.name} detail={habits.favoriteDay&&(habits.anyTime?`${hours(habits.favoriteDay.seconds)} across ${plural(habits.favoriteDay.days,'reading day')}`:plural(habits.favoriteDay.days,'reading day'))} empty="No reading days yet"/>
   <Insight label="Most active month" value={habits.mostActiveMonth&&monthLabel(habits.mostActiveMonth.month)} detail={habits.mostActiveMonth&&(habits.anyTime?hours(habits.mostActiveMonth.seconds):`${habits.mostActiveMonth.pages} pages`)} empty="No reading months yet"/>
   <Insight label="Most consistent month" value={habits.mostConsistentMonth&&monthLabel(habits.mostConsistentMonth.month)} detail={habits.mostConsistentMonth&&`Read on ${habits.mostConsistentMonth.days} of ${habits.mostConsistentMonth.eligible} days`} empty="Needs a month with at least 14 days"/>
   <Insight label="Favorite reading hour" value={habits.topHour!==null?hourLabel(habits.topHour):undefined} detail={habits.topHour!==null?`From ${plural(habits.timedSessions,'timed session')}; manual entries excluded`:undefined} empty="Needs three timed sessions"/>
   <Insight label="Longest session" value={habits.longestSession?duration(habits.longestSession.seconds):undefined} detail="Active time, pauses excluded" empty="No timed sessions yet"/>
   <Insight label="Average session" value={habits.averageSessionSeconds!==null?duration(habits.averageSessionSeconds):undefined} detail="Timed sessions only" empty="No timed sessions yet"/>
  </div>
  <div className="muse-dna-pair">
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Genre breakdown</h4><span className="small-label">{plural(genres.finishedBooks,'book')} finished {label}</span></div>
   {!genres.rows.length?<p>Add genres to your books to see their place in your reading life.</p>:<div className="muse-atlas-table-wrap"><table className="muse-atlas-table">
    <thead><tr><th scope="col">Genre</th><th scope="col">Books finished</th><th scope="col">Share</th><th scope="col">Reading time</th><th scope="col">Pages</th></tr></thead>
    <tbody>{genres.rows.slice(genrePage*6,genrePage*6+6).map(r=><tr key={r.key}><th scope="row">{r.genre}</th><td>{r.finished}{r.reads>r.finished?` (${plural(r.reads,'read')})`:''}</td><td>{genres.finishedBooks?`${r.share}%`:'—'}</td><td>{r.seconds?hours(r.seconds):'—'}</td><td>{r.pages?num(r.pages):'—'}</td></tr>)}</tbody>
   </table></div>}
   {genres.rows.length>6&&<div className="muse-paged-nav"><span className="small-label type-numeric">{genrePage*6+1}–{Math.min(genres.rows.length,genrePage*6+6)} of {genres.rows.length}</span><button type="button" className="muse-button button-ghost" aria-label="Previous genres" disabled={genrePage===0} onClick={()=>setGenrePage(genrePage-1)}><MuseIcon name="chevron" size={15}/></button><button type="button" className="muse-button button-ghost" aria-label="Next genres" disabled={(genrePage+1)*6>=genres.rows.length} onClick={()=>setGenrePage(genrePage+1)}><MuseIcon name="chevron" size={15}/></button></div>}
   <p className="small-label">A book with several genres counts fully in each, so shares can add up to more than 100%{genres.overlapping?' (they do here)':''}.{genres.untagged?` ${plural(genres.untagged,'finished book')} without a genre ${genres.untagged===1?'is':'are'} not shown.`:''}</p>
  </article>
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Most popular book emojis</h4><span className="small-label">{label}</span></div>
   {!emojis.ranking.length?<p>{emojis.finishedBooks?'Add Book in Three Emojis to your finished books to see them here.':`No finished books ${label} yet.`}</p>:<PagedList tag="ol" className="muse-atlas-emojis" items={emojis.ranking} size={5} label="emojis" render={e=><li key={e.emoji}><span className="muse-atlas-emoji" aria-hidden="true">{e.emoji}</span><span>{plural(e.books,'book')}</span><span className="sr-only">{e.emoji}</span></li>}/>}
   <p className="small-label">Each finished book counts each of its emojis once{emojis.finishedBooks?` · ${emojis.booksWithEmojis} of ${plural(emojis.finishedBooks,'finished book')} have emojis`:''}.</p>
  </article>
  </div>
  <div className="muse-books-atlas-grid">
   <ActivityBars title="When you read" note="Timed sessions only, by local hour in each session's time zone; a session crossing an hour is split." items={habits.hours.map((s,h)=>({key:String(h),label:hourLabel(h),short:h%6===0?hourLabel(h):'',value:s,text:duration(s)}))}/>
   <ActivityBars title="Your reading week" note={habits.anyTime?'Reading time by weekday; time crossing midnight is split.':'Reading days by weekday.'} items={habits.weekdays.map(w=>({key:w.name,label:w.name,short:w.name.slice(0,1),value:habits.anyTime?w.seconds:w.days,text:habits.anyTime?duration(w.seconds):plural(w.days,'day')}))}/>
  </div>
  <p className="small-label">Periods use finish dates for books and each session’s saved local date.</p>
 </div>;
}
