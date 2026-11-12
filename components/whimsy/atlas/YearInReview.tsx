'use client';
import {useState,type CSSProperties} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseStar} from '@/components/MuseStar';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {PagedList} from './PagedList';
import {Highlights} from './Highlights2';
import {Cover} from './CoverCalendar';
import {MonthShelf} from './Highlights';
import {TopRated} from './TopRated';
import {Favorites} from './Favourites';
import {KeepsakeExport} from './KeepsakeExport';
import {completionEvents} from '@/lib/whimsy/reading-stats';
import {readEmojis,readOpinion} from '@/lib/whimsy/reading-cycles';
import {hourLabel,yearReview,yearsWithReading,type Persona} from '@/lib/whimsy/reading-dna';
import {ActivityBars,InsightIcon,days,duration,hours,monthLabel,monthName,num,plural,shortMonth,yearDate} from './parts';

/** A literary scrapbook of one year, computed live from saved records (nothing is stored as a snapshot). */
export function YearInReview({books,sessions,today,goals=[]}:{books:Book[];sessions:ReadingSession[];today:string;goals?:ReadingGoal[]}){
 const years=yearsWithReading(books,sessions),[chosen,setChosen]=useState(today.slice(0,4)),[keepsake,setKeepsake]=useState(false),year=years.includes(chosen)?chosen:years[0];
 if(!year)return <div className="muse-empty-state muse-books-empty" data-variant="editorial"><h4>Your first year in books is waiting.</h4><p>Once you log a session or finish a book, its year will have a recap here.</p></div>;
 const r=yearReview(books,sessions,year,today),n=r.numbers,isPersona=(p:Persona|{needed:number}):p is Persona=>'title' in p,progress=year===today.slice(0,4);
 const covers=completionEvents(books).filter(e=>e.completion.finishedOn?.startsWith(year)).sort((x,y)=>(x.completion.finishedOn??'').localeCompare(y.completion.finishedOn??'')),sparkMax=Math.max(1,...r.months.map(m=>m.seconds||m.pages));
 const range={start:`${year}-01-01`,end:`${year}-12-31`},stats=[
  {k:'Books finished',v:String(n.reads),d:n.reads?`${plural(n.uniqueBooks,'title')}${n.rereads?` · ${plural(n.rereads,'reread')}`:''}`:'None yet'},
  {k:'Pages read',v:num(n.pages),d:'From saved sessions'},
  {k:'Reading time',v:n.seconds?hours(n.seconds):'—',d:'Pauses excluded'},
  {k:'Reading days',v:String(n.readingDays),d:'Each day once'},
  {k:'Sessions',v:String(n.sessions),d:'Saved sittings'},
  {k:'Longest streak',v:days(n.longestStreak),d:'Within this year'}];
 const tiles=[
  {k:'Personality',v:isPersona(r.persona)?r.persona.title:undefined,d:isPersona(r.persona)?r.persona.line:undefined,e:`Finish ${isPersona(r.persona)?0:plural(r.persona.needed,'more book')} with a genre`},
  {k:'Favorite genre',v:r.favorites.mostRead?.genre,d:r.favorites.mostRead&&plural(r.favorites.mostRead.reads,'finished read'),e:'Add genres to finished books'},
  {k:'Genres explored',v:r.genres.rows.filter(g=>g.finished).length?String(r.genres.rows.filter(g=>g.finished).length):undefined,d:'Across finished books',e:'No finished books with genres'},
  {k:'Favorite reading day',v:r.habits.favoriteDay?.name,d:r.habits.favoriteDay&&plural(r.habits.favoriteDay.days,'reading day'),e:'No reading days'},
  {k:'Most active month',v:r.habits.mostActiveMonth&&monthName(r.habits.mostActiveMonth.month),d:r.habits.mostActiveMonth&&(r.habits.anyTime?hours(r.habits.mostActiveMonth.seconds):`${r.habits.mostActiveMonth.pages} pages`),e:'No reading months'},
  {k:'Favorite reading hour',v:r.habits.topHour!==null?hourLabel(r.habits.topHour):undefined,d:'Timed sessions only',e:'Needs three timed sessions'},
  {k:'Longest book',v:r.superlatives.longest?.book.title,d:r.superlatives.longest&&`${r.superlatives.longest.book.totalPages} pages`,e:'Needs a page count'},
  {k:'Shortest book',v:r.superlatives.shortest?.book.title,d:r.superlatives.shortest&&`${r.superlatives.shortest.book.totalPages} pages`,e:'Needs two page counts'},
  {k:'Highest rated',v:r.superlatives.highestRated?.book.title,d:r.superlatives.highestRated&&`${r.superlatives.highestRated.rating}/5`,e:'No rated reads'},
  {k:'Most time with',v:r.superlatives.mostTime?.book.title,d:r.superlatives.mostTime&&hours(r.superlatives.mostTime.seconds),e:'No timed sessions'}];
 return <div className="muse-atlas-section muse-atlas-year">
  <header className="muse-atlas-year-hero muse-yir-hero"><span className="muse-atlas-year-stars" aria-hidden="true"><MuseStar size={18}/><MuseStar size={12} color="aqua"/><MuseStar size={10} color="pink"/></span>
   <div className="muse-yir-title"><span className="small-label">{progress?'Your year so far':'Your year in reading'}</span><h4 className="muse-rainbow-year">{year}</h4>
    <div className="muse-yir-controls"><MuseChoiceMenu label="Year" valueLabel={year} options={years.map(y=>({id:y,label:y}))} selectedIds={[year]} onSelect={setChosen}/><button type="button" className="muse-button button-primary muse-keepsake-open" onClick={()=>setKeepsake(true)}>Make a keepsake</button></div></div>
   <div className="muse-yir-glimpse"><p className="muse-yir-lede">{n.reads?`${plural(n.reads,'finished read')}${n.rereads?` (${plural(n.uniqueBooks,'book')}, ${plural(n.rereads,'reread')})`:''}, ${num(n.pages)} pages and ${n.seconds?hours(n.seconds):'no timed reading'} across ${plural(n.readingDays,'reading day')}.`:`${num(n.pages)} pages and ${n.seconds?hours(n.seconds):'no timed reading'} across ${plural(n.readingDays,'reading day')}; no finished books ${progress?'yet':'that year'}.`}</p>
    <div className="muse-yir-covers" aria-label={`Books finished in ${year}`}>{covers.length?<>{covers.slice(0,6).map((e,i)=><span key={`${e.book.id}-${i}`} className="muse-yir-cover" title={e.book.title}><Cover book={e.book}/></span>)}{covers.length>6&&<span className="muse-yir-more type-numeric">+{covers.length-6}</span>}</>:Array.from({length:4},(_,i)=><span key={i} className="muse-yir-cover" data-empty/>)}</div>
    <div className="muse-yir-spark" role="img" aria-label="Reading time by month">{r.months.map(m=><span key={m.month} title={`${monthLabel(m.month)}: ${duration(m.seconds)} · ${m.finished} finished`}><i style={{'--h':`${Math.round(100*(m.seconds||m.pages)/sparkMax)}%`} as CSSProperties}/><small>{shortMonth(m.month).slice(0,1)}</small></span>)}</div></div>
  </header>
  {keepsake&&<KeepsakeExport books={books} sessions={sessions} goals={goals} year={year} today={today} onClose={()=>setKeepsake(false)}/>}
  <dl className="muse-yir-stats" aria-label="The numbers">{stats.map(s=><div key={s.k}><dt>{s.k}</dt><dd className="type-numeric">{s.v}</dd><small>{s.d}</small></div>)}</dl>
  <Highlights books={books} sessions={sessions} range={range} label={String(year)} today={today} wholeYear/>
  <div className="muse-yir-emoji-shelf"><section aria-label="Your year in three emojis" className="muse-books-panel muse-atlas-three"><span className="small-label">Your {year} in three emojis</span>
    {r.emojis.top.length?<><p className="muse-atlas-three-emojis">{r.emojis.top.map(e=><span key={e.emoji} title={plural(e.books,'book')}>{e.emoji}</span>)}</p>
     <small className="small-label">{r.emojis.top.map(e=>`${e.emoji} ${plural(e.books,'book')}`).join(' · ')}</small></>
     :<p>{r.emojis.finishedBooks?`Add Book in Three Emojis to your ${year} finished books to see your year in three.`:`Finish a book in ${year} to start your year in three.`}</p>}
   </section>
   <MonthShelf books={books} today={today} fixedYear={year}/></div>
  <div className="muse-yir-pair muse-yir-pair-even">
   <ActivityBars unit="time" title="Reading timeline" note={`Reading time by month in ${year}${progress?' (so far)':''}.`} items={r.months.map(m=>({key:m.month,label:monthLabel(m.month),short:shortMonth(m.month),value:m.seconds||m.pages,text:`${duration(m.seconds)} · ${m.pages} pages · ${m.finished} finished`}))}/>
   <section aria-label="Milestones this year" className="muse-books-panel"><div className="muse-books-panel-head"><h4>Milestones</h4><span className="small-label">{year}</span></div>{r.milestones.length?<PagedList tag="ol" className="muse-atlas-milestones" items={r.milestones} size={4} label="milestones" render={m=><li key={m.id}><span className="muse-atlas-milestone-star" aria-hidden="true">✦</span><strong>{m.title}</strong><small>{yearDate(m.achievedOn!)}</small></li>}/>:<p>No new milestones{progress?' yet':''} this year.</p>}</section>
  </div>
  <div className="muse-yir-pair muse-yir-pair-even"><TopRated books={books} range={range} label={String(year)}/><Favorites books={books} range={range} label={String(year)}/></div>
  {r.recent.length>0&&<section aria-label="Recently finished" className="muse-books-panel"><div className="muse-books-panel-head"><h4>Recently finished</h4><span className="small-label">{year}</span></div>
   <PagedList items={r.recent} size={4} label="recently finished" render={({book,completion,reread})=>{const o=readOpinion(book,completion);return <div role="listitem" className="muse-books-finished-row" key={`${book.id}:${completion.id}`}><span className="muse-finished-cover" aria-hidden="true"><Cover book={book}/></span><span className="muse-finished-copy"><strong>{book.title}{reread?' · reread':''}</strong><span>{yearDate(completion.finishedOn)}{o.rating?` · ${o.rating}/5`:''} {readEmojis(book,completion).join(' ')}</span></span></div>;}}/></section>}
 </div>;
}
