'use client';
import {AtlasMark} from './parts';
import {useState,type ReactNode} from 'react';
import {MonthBooksModal,YearBooksModal} from './BooksOfYear';
import {Cover} from './CoverCalendar';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {completedReadAverages,inclusiveCalendarDays,type DateRange} from '@/lib/whimsy/reading-stats';
import {readOpinion} from '@/lib/whimsy/reading-cycles';
import {bookSuperlatives,emojiRanking,favoriteGenres,genreBreakdown,milestoneUnit,readsIn,readingMilestones} from '@/lib/whimsy/reading-dna';
import {PagedList} from './PagedList';
import {EmojiBoard} from './EmojiBoard';
import {Insight,days,hours,plural,yearDate} from './parts';
import {MonthShelf} from './Highlights';
import {AtlasBand} from './AtlasBand';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import {RatingStars} from '@/components/collections/StarRating';

export type AtlasStat={icon:MuseIconName;value:string;label:string};
/** A section's heading band: its title and line, and the period's headline numbers on the right. */
export function AtlasHero({title,line,stats}:{title:string;line:string;stats:AtlasStat[]}){
 return <AtlasBand art="milestones" kicker="Your reading journey" title={title} line={line} stats={stats}/>;
}

/**
 * Books & Milestones (Atlas V2): the period at a glance, the superlatives (the longest book featured, the rest in a row
 * you can swipe), the milestone journey, the book emojis, and the year as a cover timeline beside the completed list.
 * Milestones are all time; everything else follows the period.
 */
export function BooksMilestones({books,sessions,range,label,onOpenBook,today,stats=[],byYear}:{byYear?:ReactNode;books:Book[];sessions:ReadingSession[];range:DateRange|null;label:string;onOpenBook?:(id:string)=>void;today:string;stats?:AtlasStat[]}){
 const [openMonth,setOpenMonth]=useState<string|null>(null),[allBooks,setAllBooks]=useState(false),seeYear=range?range.end.slice(0,4)>today.slice(0,4)?today.slice(0,4):range.end.slice(0,4):today.slice(0,4),[allMilestones,setAllMilestones]=useState(false);
 const sup=bookSuperlatives(books,sessions,range),reads=readsIn(books,range),averages=completedReadAverages(books,sessions),genre=favoriteGenres(genreBreakdown(books,sessions,range).rows).mostRead,emoji=emojiRanking(books,range).ranking[0];
 const milestones=readingMilestones(books,sessions),reached=milestones.filter(m=>m.achievedOn).sort((a,b)=>b.achievedOn!.localeCompare(a.achievedOn!)),next=milestones.filter(m=>!m.achievedOn).slice(0,3);
 const journey=[...reached.slice(0,2).reverse(),...next],firstNext=next[0]?.id;
 return <div className="muse-atlas-section muse-atlas-bm">
  <AtlasHero title="Books & Milestones" line={`Your reading journey at a glance · ${label}`} stats={stats}/>
  <article className="muse-books-panel muse-sup"><div className="muse-books-panel-head"><h4><AtlasMark title="Book superlatives"/>Book superlatives</h4><span className="small-label">{plural(sup.finishedBooks,'book')} finished {label}</span></div>
   <div className="muse-sup-row">
    {sup.longest?<button type="button" className="muse-sup-feature" onClick={()=>onOpenBook?.(sup.longest!.book.id)}><span className="muse-sup-cover" aria-hidden="true"><Cover book={sup.longest.book}/></span><span className="muse-sup-copy"><span className="muse-sup-tag"><MuseIcon name="book" size={12}/>Longest book finished</span><strong>{sup.longest.book.title}</strong><small>{sup.longest.book.totalPages} pages</small></span></button>
     :<div className="muse-sup-feature" data-empty><span className="muse-sup-copy"><span className="muse-sup-tag"><MuseIcon name="book" size={12}/>Longest book finished</span><small>Needs a finished book with its page count</small></span></div>}
    <div className="muse-atlas-insights muse-sup-scroll" data-tone="book">
     <Insight label="Fastest finish" value={sup.fastest?.book.title} detail={sup.fastest&&`${days(sup.fastest.days)}, start to finish (inclusive)${sup.fastest.reread?' · reread':''}`} empty="Needs a finished read with a start date"/>
     <Insight label="Most read genre" value={genre?.genre} detail={genre&&plural(genre.reads,'finished read')} empty="Add genres to finished books"/>
     <Insight label="Most reading time" value={sup.mostTime?.book.title} detail={sup.mostTime&&hours(sup.mostTime.seconds)} empty="No timed sessions yet"/>
     <Insight label="Highest rated" value={sup.highestRated?.book.title} detail={sup.highestRated&&`${sup.highestRated.rating}/5 for that read${sup.highestRated.tied?` · tied with ${plural(sup.highestRated.tied,'other read')}`:''}`} empty="Rate a finished read to see it here"/>
     <Insight label="Shortest book finished" value={sup.shortest?.book.title} detail={sup.shortest&&`${sup.shortest.book.totalPages} pages`} empty="Needs two finished books with page counts"/>
     <Insight label="Most sessions" value={sup.mostSessions?.book.title} detail={sup.mostSessions&&plural(sup.mostSessions.sessions,'session')} empty="No sessions yet"/>
     <Insight label="Most common book emoji" value={emoji&&<span className="muse-atlas-emoji">{emoji.emoji}</span>} detail={emoji&&plural(emoji.books,'book')} empty="Add emojis to finished books"/>
    </div>
   </div>
  </article>
  <div className="muse-atlas-bm-pair">
  <article className="muse-books-panel muse-journey-panel"><div className="muse-books-panel-head"><h4><AtlasMark title="Milestones"/>Your milestone journey</h4><span className="small-label">{reached.length} of {milestones.length} reached · all time</span></div>
   {journey.length?<ol className="muse-journey" aria-label="Recent and next milestones">{journey.map(m=><li key={m.id} data-done={m.achievedOn?true:undefined} data-next={m.id===firstNext||undefined}><span className="muse-journey-dot" aria-hidden="true">{m.achievedOn?<MuseIcon name="check" size={14}/>:'✦'}</span><strong>{m.title}</strong><small className="type-numeric">{m.achievedOn?yearDate(m.achievedOn):`${m.metric==='hours'?m.progress.toFixed(1):Math.floor(m.progress)} / ${m.threshold} ${milestoneUnit[m.metric]}`}</small></li>)}</ol>
    :<p>Your first finished book or first 100 pages will light the first star.</p>}
   {reached.length>0&&<button type="button" className="text-button muse-journey-all" aria-expanded={allMilestones} onClick={()=>setAllMilestones(v=>!v)}>{allMilestones?'Hide':'All'} reached milestones ({reached.length})</button>}
   {allMilestones&&<PagedList tag="ol" className="muse-atlas-milestones" items={reached} size={6} label="milestones reached" render={m=><li key={m.id}><span className="muse-atlas-milestone-star" aria-hidden="true">✦</span><strong>{m.title}</strong><small>{yearDate(m.achievedOn!)}</small></li>}/>}
   <p className="small-label">Reached on the first day your saved history crossed each line; a milestone is only ever celebrated once.</p>
  </article>
  <EmojiBoard books={books} range={range} label={label} top={3} restSize={6} restCols={6}/>
  </div>
  <div className="muse-atlas-bm-timeline">
   {byYear}
   <MonthShelf books={books} today={today} onOpenBook={onOpenBook} onMonth={setOpenMonth} title="Your reading timeline"/>
   <article className="muse-books-panel muse-bm-completed" id="atlas-completed"><div className="muse-books-panel-head"><h4><AtlasMark title="Completed books"/>Completed books</h4><span className="small-label">{label}</span><button type="button" className="muse-yir2-seeall" onClick={()=>setAllBooks(true)}>See all of {seeYear} by month</button></div>{!reads.length?<p>{label==='all time'?'A finished book belongs here whenever you reach its last page.':`Nothing finished ${label} yet.`}</p>:<>
    <p className="muse-atlas-books-note">{averages.averageCalendarDays!==null?`${averages.averageCalendarDays.toFixed(1)} days on average, start to finish`:'Start dates not recorded'}{averages.averageActiveSeconds!==null?` · ${hours(averages.averageActiveSeconds)} average active time`:''} · all time</p>
    <PagedList items={reads} size={9} label="completed books" render={({book,completion,reread})=>{const opinion=readOpinion(book,completion);return <button type="button" role="listitem" className="muse-bm-row" key={`${book.id}:${completion.id}`} onClick={()=>onOpenBook?.(book.id)}><span className="muse-finished-cover" aria-hidden="true"><Cover book={book}/></span><span className="muse-finished-copy"><strong>{book.title}{reread?' · reread':''}</strong><span>{yearDate(completion.finishedOn)}{completion.startedOn?` · ${days(inclusiveCalendarDays(completion.startedOn,completion.finishedOn)??0)}`:''} {book.reviewEmojis.join(' ')}</span></span>{opinion.rating?<RatingStars value={opinion.rating} className="muse-bm-stars"/>:<span className="muse-bm-stars muse-lib-muted">Not rated</span>}</button>;}}/></>}
   </article>
  </div>
  {openMonth&&<MonthBooksModal books={books} month={openMonth} onOpenBook={onOpenBook} onClose={()=>setOpenMonth(null)}/>}
  {allBooks&&<YearBooksModal books={books} year={seeYear} onOpenBook={onOpenBook} onClose={()=>setAllBooks(false)}/>}
 </div>;
}
