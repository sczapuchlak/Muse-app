'use client';
import {AtlasMark} from './parts';
import {useState} from 'react';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import {favoriteGenres,genreBreakdown,genrePersona,hourLabel,readingHabits,readingTraits,type Persona} from '@/lib/whimsy/reading-dna';
import {PagedList} from './PagedList';
import {EmojiBoard} from './EmojiBoard';
import {Donut,paletteAt} from './Graphics';
import type {CSSProperties} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {ActivityBars,Insight,duration,hours,monthLabel,num,plural} from './parts';

/** Personality, genres, habits and book emojis for one period. Every line is computed from saved records. */
export function ReadingDNA({books,sessions,range,label,today}:{books:Book[];sessions:ReadingSession[];range:DateRange|null;label:string;today:string}){
 const genres=genreBreakdown(books,sessions,range),fav=favoriteGenres(genres.rows),persona=genrePersona(books,range),traits=readingTraits(books,sessions,range,today);
 const habits=readingHabits(sessions,range,today);
 const isPersona=(p:Persona|{needed:number}):p is Persona=>'title' in p;
 return <div className="muse-atlas-section">
  <article className="muse-books-panel muse-atlas-persona"><span className="small-label">Your reading personality · {label}</span>
   {isPersona(persona)?<><h4>{persona.title}</h4><p>{persona.line}</p><small className="small-label">{persona.evidence}</small></>
    :<><h4>Still taking shape</h4><p>Finish {plural(persona.needed,'more book')} with a genre {label==='all time'?'':`${label} `}to reveal your genre personality.</p></>}
   {traits.length>0&&<ul className="muse-atlas-traits">{traits.map(t=><li key={t.title}><strong>{t.title}</strong><span>{t.line}</span><small className="small-label">{t.evidence}</small></li>)}</ul>}
   <p className="small-label">Personalities follow fixed rules about your genres and reading times, never guesses.</p>
  </article>
  <article className="muse-books-panel muse-dna-highlights"><div className="muse-books-panel-head"><h4><AtlasMark title="Genre highlights"/>Genre highlights</h4><span className="small-label">{label}</span></div>
  <div className="muse-atlas-insights" data-tone="genre">
   <Insight label="Most read genre" value={fav.mostRead?.genre} detail={fav.mostRead&&plural(fav.mostRead.reads,'finished read')} empty="Add genres to finished books"/>
   <Insight label="Most time spent" value={fav.mostTime?.genre} detail={fav.mostTime&&hours(fav.mostTime.seconds)} empty="Needs timed sessions on books with genres"/>
   <Insight label="Most pages read" value={fav.mostPages?.genre} detail={fav.mostPages&&`${num(fav.mostPages.pages)} pages`} empty="Needs sessions with pages on books with genres"/>
  </div>
  <div className="muse-books-panel-head"><h4><AtlasMark title="Reading habits"/>Reading habits</h4><span className="small-label">{label}</span></div>
  <div className="muse-atlas-insights" data-tone="habit">
   <Insight label="Favorite reading day" value={habits.favoriteDay?.name} detail={habits.favoriteDay&&(habits.anyTime?`${hours(habits.favoriteDay.seconds)} across ${plural(habits.favoriteDay.days,'reading day')}`:plural(habits.favoriteDay.days,'reading day'))} empty="No reading days yet"/>
   <Insight label="Most active month" value={habits.mostActiveMonth&&monthLabel(habits.mostActiveMonth.month)} detail={habits.mostActiveMonth&&(habits.anyTime?hours(habits.mostActiveMonth.seconds):`${habits.mostActiveMonth.pages} pages`)} empty="No reading months yet"/>
   <Insight label="Most consistent month" value={habits.mostConsistentMonth&&monthLabel(habits.mostConsistentMonth.month)} detail={habits.mostConsistentMonth&&`Read on ${habits.mostConsistentMonth.days} of ${habits.mostConsistentMonth.eligible} days`} empty="Needs a month with at least 14 days"/>
   <Insight label="Favorite reading hour" value={habits.topHour!==null?hourLabel(habits.topHour):undefined} detail={habits.topHour!==null?`From ${plural(habits.timedSessions,'timed session')}; manual entries excluded`:undefined} empty="Needs three timed sessions"/>
   <Insight label="Longest session" value={habits.longestSession?duration(habits.longestSession.seconds):undefined} detail="Active time, pauses excluded" empty="No timed sessions yet"/>
   <Insight label="Average session" value={habits.averageSessionSeconds!==null?duration(habits.averageSessionSeconds):undefined} detail="Timed sessions only" empty="No timed sessions yet"/>
  </div>
  </article>
  <div className="muse-dna-pair">
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4><AtlasMark title="Genre breakdown"/>Genre breakdown</h4><span className="small-label">{plural(genres.finishedBooks,'book')} finished {label}</span></div>
   {!genres.rows.length?<p>Add genres to your books to see their place in your reading life.</p>:<div className="muse-genre-ring">
    <Donut slices={genres.rows.slice(0,7).map(r=>({key:r.key,label:r.genre,value:r.finished||r.reads}))} main={genres.rows.length} sub={genres.rows.length===1?'genre':'genres'} label={`Genres by finished books: ${genres.rows.slice(0,7).map(r=>`${r.genre} ${r.share}%`).join(', ')}`}/>
    <PagedList tag="ul" className="muse-genre-legend" items={genres.rows} size={4} label="genres" render={r=>{const i=genres.rows.indexOf(r);return <li key={r.key} style={{'--c':paletteAt(i<7?i:7)} as CSSProperties}><i aria-hidden="true"/><strong>{r.genre}</strong><span className="type-numeric">{genres.finishedBooks?`${r.share}%`:'—'} · {r.finished} {r.finished===1?'book':'books'}</span><small className="type-numeric">{r.seconds?hours(r.seconds):'no timed reading'}{r.pages?` · ${num(r.pages)} pages`:''}</small></li>;}}/></div>}
   <p className="small-label">A book with several genres counts fully in each, so shares can add up to more than 100%{genres.overlapping?' (they do here)':''}.{genres.untagged?` ${plural(genres.untagged,'finished book')} without a genre ${genres.untagged===1?'is':'are'} not shown.`:''}</p>
  </article>
  <EmojiBoard books={books} range={range} label={label} title="Most popular book emojis"/>
  </div>
  <div className="muse-books-atlas-grid">
   <ActivityBars title="When you read" note="Timed sessions only, by local hour in each session's time zone; a session crossing an hour is split." items={habits.hours.map((s,h)=>({key:String(h),label:hourLabel(h),short:h%6===0?hourLabel(h):'',value:s,text:duration(s)}))}/>
   <ActivityBars title="Your reading week" note={habits.anyTime?'Reading time by weekday; time crossing midnight is split.':'Reading days by weekday.'} items={habits.weekdays.map(w=>({key:w.name,label:w.name,short:w.name.slice(0,1),value:habits.anyTime?w.seconds:w.days,text:habits.anyTime?duration(w.seconds):plural(w.days,'day')}))}/>
  </div>
  <p className="small-label">Periods use finish dates for books and each session’s saved local date.</p>
 </div>;
}
