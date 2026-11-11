'use client';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {completedBookSeries} from '@/lib/whimsy/books';
import {completedReadAverages,inclusiveCalendarDays,type DateRange} from '@/lib/whimsy/reading-stats';
import {readOpinion} from '@/lib/whimsy/reading-cycles';
import {bookSuperlatives,emojiRanking,favoriteGenres,genreBreakdown,milestoneUnit,readsIn,readingMilestones} from '@/lib/whimsy/reading-dna';
import {PagedList} from './PagedList';
import {Insight,days,hours,monthLabel,plural,yearDate} from './parts';

/** Superlatives and completion history for one period, plus every milestone (all time). */
export function BooksMilestones({books,sessions,range,label}:{books:Book[];sessions:ReadingSession[];range:DateRange|null;label:string}){
 const sup=bookSuperlatives(books,sessions,range),reads=readsIn(books,range),averages=completedReadAverages(books,sessions),genre=favoriteGenres(genreBreakdown(books,sessions,range).rows).mostRead,emoji=emojiRanking(books,range).ranking[0];
 const milestones=readingMilestones(books,sessions),reached=milestones.filter(m=>m.achievedOn).sort((a,b)=>b.achievedOn!.localeCompare(a.achievedOn!)),next=milestones.filter(m=>!m.achievedOn).slice(0,3);
 const monthly=completedBookSeries(books,'month'),maxMonth=Math.max(1,...monthly.map(s=>s.count)),byMost=[...monthly].sort((x,y)=>y.count-x.count||y.start.localeCompare(x.start));
 return <div className="muse-atlas-section">
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Book superlatives</h4><span className="small-label">{plural(sup.finishedBooks,'book')} finished {label}</span></div>
   <div className="muse-atlas-insights">
    <Insight label="Longest book finished" value={sup.longest?.book.title} detail={sup.longest&&`${sup.longest.book.totalPages} pages`} empty="Needs a finished book with its page count"/>
    <Insight label="Shortest book finished" value={sup.shortest?.book.title} detail={sup.shortest&&`${sup.shortest.book.totalPages} pages`} empty="Needs two finished books with page counts"/>
    <Insight label="Fastest finish" value={sup.fastest?.book.title} detail={sup.fastest&&`${days(sup.fastest.days)}, start to finish (inclusive)${sup.fastest.reread?' · reread':''}`} empty="Needs a finished read with a start date"/>
    <Insight label="Most reading time" value={sup.mostTime?.book.title} detail={sup.mostTime&&hours(sup.mostTime.seconds)} empty="No timed sessions yet"/>
    <Insight label="Most sessions" value={sup.mostSessions?.book.title} detail={sup.mostSessions&&plural(sup.mostSessions.sessions,'session')} empty="No sessions yet"/>
    <Insight label="Highest rated" value={sup.highestRated?.book.title} detail={sup.highestRated&&`${sup.highestRated.rating}/5 for that read${sup.highestRated.tied?` · tied with ${plural(sup.highestRated.tied,'other read')}`:''}`} empty="Rate a finished read to see it here"/>
    <Insight label="Most read genre" value={genre?.genre} detail={genre&&plural(genre.reads,'finished read')} empty="Add genres to finished books"/>
    <Insight label="Most common book emoji" value={emoji&&<span className="muse-atlas-emoji">{emoji.emoji}</span>} detail={emoji&&plural(emoji.books,'book')} empty="Add emojis to finished books"/>
   </div>
  </article>
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Milestones</h4><span className="small-label">{reached.length} of {milestones.length} reached · all time</span></div>
   {!reached.length?<p>Your first finished book or first 100 pages will light the first star.</p>:<ol className="muse-atlas-milestones">{reached.map(m=><li key={m.id}><span className="muse-atlas-milestone-star" aria-hidden="true">✦</span><strong>{m.title}</strong><small>{yearDate(m.achievedOn!)}</small></li>)}</ol>}
   {next.length>0&&<div className="muse-atlas-next"><span className="small-label">Next up</span>{next.map(m=><div key={m.id}><span>{m.title}</span><progress value={m.progress} max={m.threshold} aria-label={`${m.title}: ${Math.floor(m.progress)} of ${m.threshold} ${milestoneUnit[m.metric]}`}/><small>{m.metric==='hours'?m.progress.toFixed(1):Math.floor(m.progress)} / {m.threshold} {milestoneUnit[m.metric]}</small></div>)}</div>}
   <p className="small-label">Reached on the first day your saved history crossed each line. Editing past sessions recalculates them; a milestone is only ever celebrated once.</p>
  </article>
  <div className="muse-atlas-books-pair">
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Completed books</h4><span className="small-label">{label}</span></div>{!reads.length?<p>{label==='all time'?'A finished book belongs here whenever you reach its last page.':`Nothing finished ${label} yet.`}</p>:<>
   <p className="muse-atlas-books-note">{averages.averageCalendarDays!==null?`${averages.averageCalendarDays.toFixed(1)} calendar days on average (inclusive), from ${plural(averages.datedCompletions,'read')} with a start date`:'Start dates not recorded'}{averages.averageActiveSeconds!==null?` · ${hours(averages.averageActiveSeconds)} average active time, from ${averages.timedCompletions} timed ${averages.timedCompletions===1?'read':'reads'}`:''} · all time</p>
   <PagedList items={reads} size={4} label="completed books" render={({book,completion,reread})=>{const opinion=readOpinion(book,completion);return <div role="listitem" className="muse-books-finished-row" key={`${book.id}:${completion.id}`}><strong>{book.title}{reread?' · reread':''}</strong><span>{yearDate(completion.finishedOn)}{completion.startedOn?` · ${days(inclusiveCalendarDays(completion.startedOn,completion.finishedOn)??0)} (inclusive)`:''}{opinion.rating?` · ${opinion.rating}/5`:''} {book.reviewEmojis.join(' ')}</span></div>;}}/></>}
  </article>
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Finished by month</h4><span className="small-label">busiest first</span></div>
   {monthly.length>0?<PagedList items={byMost} size={5} label="months" render={item=><div role="listitem" className="muse-books-month-row" key={item.start}><div><span>{monthLabel(item.start.slice(0,7))}</span><strong>{item.count} finished</strong></div><progress value={item.count} max={maxMonth} aria-label={`${monthLabel(item.start.slice(0,7))}: ${item.count} books finished`}/></div>}/>:<p>Months appear as books are finished.</p>}
   <p className="small-label">Yearly: {completedBookSeries(books,'year').map(item=>`${item.start.slice(0,4)} · ${item.count}`).join(' · ')||'none yet'} · ratings belong to each read.</p>
  </article>
  </div>
 </div>;
}
