'use client';
import {useState} from 'react';
import {MuseStar} from '@/components/MuseStar';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {KeepsakeExport} from './KeepsakeExport';
import {readEmojis,readOpinion} from '@/lib/whimsy/reading-cycles';
import {hourLabel,yearReview,yearsWithReading,type Persona} from '@/lib/whimsy/reading-dna';
import {ActivityBars,AtlasMetric,Insight,days,duration,hours,monthLabel,monthName,num,plural,shortMonth,yearDate} from './parts';

/** A literary scrapbook of one year, computed live from saved records (nothing is stored as a snapshot). */
export function YearInReview({books,sessions,today,goals=[]}:{books:Book[];sessions:ReadingSession[];today:string;goals?:ReadingGoal[]}){
 const years=yearsWithReading(books,sessions),[chosen,setChosen]=useState(today.slice(0,4)),[keepsake,setKeepsake]=useState(false),year=years.includes(chosen)?chosen:years[0];
 if(!year)return <div className="muse-empty-state muse-books-empty" data-variant="editorial"><h4>Your first year in books is waiting.</h4><p>Once you log a session or finish a book, its year will have a recap here.</p></div>;
 const r=yearReview(books,sessions,year,today),n=r.numbers,isPersona=(p:Persona|{needed:number}):p is Persona=>'title' in p,progress=year===today.slice(0,4);
 return <div className="muse-atlas-section muse-atlas-year">
  <div className="muse-books-atlas-period" role="group" aria-label="Year">{years.map(y=><button key={y} type="button" className="muse-button button-ghost" aria-pressed={y===year} onClick={()=>setChosen(y)}>{y}</button>)}</div>
  <header className="muse-atlas-year-hero"><span className="muse-atlas-year-stars" aria-hidden="true"><MuseStar size={18}/><MuseStar size={12} color="aqua"/><MuseStar size={10} color="pink"/></span>
   <span className="small-label">{progress?'Your year so far':'Your year in reading'}</span><h4>{year}</h4>
   <p>{n.reads?`${plural(n.reads,'finished read')}${n.rereads?` (${plural(n.uniqueBooks,'book')}, ${plural(n.rereads,'reread')})`:''}, ${num(n.pages)} pages and ${n.seconds?hours(n.seconds):'no timed reading'} across ${plural(n.readingDays,'reading day')}.`:`${num(n.pages)} pages and ${n.seconds?hours(n.seconds):'no timed reading'} across ${plural(n.readingDays,'reading day')}; no finished books ${progress?'yet':'that year'}.`}</p>
   <button type="button" className="muse-button button-ghost muse-keepsake-open" onClick={()=>setKeepsake(true)}>Make a keepsake</button>
  </header>
  {keepsake&&<KeepsakeExport books={books} sessions={sessions} goals={goals} year={year} today={today} onClose={()=>setKeepsake(false)}/>}
  <section aria-label="The numbers"><h4 className="muse-atlas-year-heading">The numbers</h4><div className="muse-books-stats muse-books-atlas-metrics">
   <AtlasMetric label="Books finished" value={String(n.reads)} detail={n.reads?`${plural(n.uniqueBooks,'title')}${n.rereads?` · ${plural(n.rereads,'reread')}`:''}`:'None finished'}/>
   <AtlasMetric label="Pages read" value={num(n.pages)} detail="From saved sessions"/>
   <AtlasMetric label="Reading time" value={n.seconds?hours(n.seconds):'—'} detail="Active time · pauses excluded"/>
   <AtlasMetric label="Reading days" value={String(n.readingDays)} detail="Each day counted once"/>
   <AtlasMetric label="Sessions" value={String(n.sessions)} detail="Saved reading sessions"/>
   <AtlasMetric label="Longest streak" value={days(n.longestStreak)} detail="Within this year"/>
  </div></section>
  <section aria-label="Your year in three emojis" className="muse-books-panel muse-atlas-three"><span className="small-label">Your {year} in three emojis</span>
   {r.emojis.top.length?<><p className="muse-atlas-three-emojis">{r.emojis.top.map(e=><span key={e.emoji} title={plural(e.books,'book')}>{e.emoji}</span>)}</p>
    <small className="small-label">{r.emojis.top.map(e=>`${e.emoji} ${plural(e.books,'book')}`).join(' · ')} · each finished book counted once{r.emojis.top.length<3?` · ${r.emojis.top.length===1?'one emoji':'two emojis'} so far`:''}</small></>
    :<p>{r.emojis.finishedBooks?`Add Book in Three Emojis to your ${year} finished books to see your year in three.`:`Finish a book in ${year} to start your year in three.`}</p>}
  </section>
  <section aria-label="Your reading personality"><h4 className="muse-atlas-year-heading">Your reading personality</h4><div className="muse-atlas-insights">
   <Insight label="Personality" value={isPersona(r.persona)?r.persona.title:undefined} detail={isPersona(r.persona)?`${r.persona.line} ${r.persona.evidence}`:undefined} empty={isPersona(r.persona)?'':`Finish ${plural(r.persona.needed,'more book')} with a genre this year`}/>
   <Insight label="Favorite genre" value={r.favorites.mostRead?.genre} detail={r.favorites.mostRead&&plural(r.favorites.mostRead.reads,'finished read')} empty="Add genres to finished books"/>
   <Insight label="Genres explored" value={r.genres.rows.filter(g=>g.finished).length?String(r.genres.rows.filter(g=>g.finished).length):undefined} detail="Across books finished this year" empty="No finished books with genres"/>
   <Insight label="Favorite reading day" value={r.habits.favoriteDay?.name} detail={r.habits.favoriteDay&&plural(r.habits.favoriteDay.days,'reading day')} empty="No reading days"/>
   <Insight label="Most active month" value={r.habits.mostActiveMonth&&monthName(r.habits.mostActiveMonth.month)} detail={r.habits.mostActiveMonth&&(r.habits.anyTime?hours(r.habits.mostActiveMonth.seconds):`${r.habits.mostActiveMonth.pages} pages`)} empty="No reading months"/>
   <Insight label="Favorite reading hour" value={r.habits.topHour!==null?hourLabel(r.habits.topHour):undefined} detail="Timed sessions only" empty="Needs three timed sessions"/>
  </div>{r.traits.length>0&&<ul className="muse-atlas-traits">{r.traits.map(t=><li key={t.title}><strong>{t.title}</strong><span>{t.line}</span><small className="small-label">{t.evidence}</small></li>)}</ul>}</section>
  <section aria-label="Your books"><h4 className="muse-atlas-year-heading">Your books</h4><div className="muse-atlas-insights">
   <Insight label="Longest book" value={r.superlatives.longest?.book.title} detail={r.superlatives.longest&&`${r.superlatives.longest.book.totalPages} pages`} empty="Needs a page count"/>
   <Insight label="Shortest book" value={r.superlatives.shortest?.book.title} detail={r.superlatives.shortest&&`${r.superlatives.shortest.book.totalPages} pages`} empty="Needs two page counts"/>
   <Insight label="Highest rated" value={r.superlatives.highestRated?.book.title} detail={r.superlatives.highestRated&&`${r.superlatives.highestRated.rating}/5`} empty="No rated reads"/>
   <Insight label="Most time with" value={r.superlatives.mostTime?.book.title} detail={r.superlatives.mostTime&&hours(r.superlatives.mostTime.seconds)} empty="No timed sessions"/>
  </div>
   {r.recent.length>0&&<div className="muse-books-finished-list"><span className="small-label">Recently finished</span>{r.recent.map(({book,completion,reread})=>{const o=readOpinion(book,completion);return <div key={`${book.id}:${completion.id}`}><strong>{book.title}{reread?' · reread':''}</strong><span>{yearDate(completion.finishedOn)}{o.rating?` · ${o.rating}/5`:''} {readEmojis(book,completion).join(' ')}</span></div>;})}</div>}
  </section>
  <ActivityBars title="Reading timeline" note={`Reading time by month in ${year}${progress?' (so far)':''}.`} items={r.months.map(m=>({key:m.month,label:monthLabel(m.month),short:shortMonth(m.month),value:m.seconds||m.pages,text:`${duration(m.seconds)} · ${m.pages} pages · ${m.finished} finished`}))}/>
  <section aria-label="Milestones this year" className="muse-books-panel"><h4>Milestones in {year}</h4>{r.milestones.length?<ol className="muse-atlas-milestones">{r.milestones.map(m=><li key={m.id}><span className="muse-atlas-milestone-star" aria-hidden="true">✦</span><strong>{m.title}</strong><small>{yearDate(m.achievedOn!)}</small></li>)}</ol>:<p>No new milestones{progress?' yet':''} this year.</p>}</section>
 </div>;
}
