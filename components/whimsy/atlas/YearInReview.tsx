'use client';
import {AtlasMark} from './parts';
import {useState,type CSSProperties,type ReactNode} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {OverviewHighlights} from './Highlights3';
import {Cover} from './CoverCalendar';
import {KeepsakeExport} from './KeepsakeExport';
import {MonthBooksModal,YearBooksModal} from './BooksOfYear';
import {completionEvents} from '@/lib/whimsy/reading-stats';
import {readEmojis,readOpinion} from '@/lib/whimsy/reading-cycles';
import {emojiRanking,yearReview,yearsWithReading} from '@/lib/whimsy/reading-dna';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import {isFavoriteRead} from '@/lib/whimsy/reading-cycles';
import {compactTime,days,duration,monthLabel,num,plural,shortMonth,yearDate} from './parts';
import {RatingStars} from '@/components/collections/StarRating';

/** A literary scrapbook of one year, computed live from saved records (nothing is stored as a snapshot). */
export function YearInReview({books,sessions,today,goals=[],onOpenBook}:{books:Book[];sessions:ReadingSession[];today:string;goals?:ReadingGoal[];onOpenBook?:(id:string)=>void}){
 const years=yearsWithReading(books,sessions),[chosen,setChosen]=useState(today.slice(0,4)),[keepsake,setKeepsake]=useState(false),[allBooks,setAllBooks]=useState(false),[month,setMonth]=useState<string|null>(null),year=years.includes(chosen)?chosen:years[0];
 if(!year)return <div className="muse-empty-state muse-books-empty" data-variant="editorial"><h4>Your first year in books is waiting.</h4><p>Once you log a session or finish a book, its year will have a recap here.</p></div>;
 const r=yearReview(books,sessions,year,today),n=r.numbers,progress=year===today.slice(0,4);
 const covers=completionEvents(books).filter(e=>e.completion.finishedOn?.startsWith(year)).sort((x,y)=>(x.completion.finishedOn??'').localeCompare(y.completion.finishedOn??''));
 const range={start:`${year}-01-01`,end:`${year}-12-31`},stats=[
  {k:'Books finished',v:String(n.reads),d:n.reads?`${plural(n.uniqueBooks,'title')}${n.rereads?` · ${plural(n.rereads,'reread')}`:''}`:'None yet'},
  {k:'Pages read',v:num(n.pages),d:'From saved sessions'},
  {k:'Reading time',v:compactTime(n.seconds),d:'Pauses excluded'},
  {k:'Reading days',v:String(n.readingDays),d:'Each day once'},
  {k:'Sessions',v:String(n.sessions),d:'Saved sittings'},
  {k:'Longest streak',v:days(n.longestStreak),d:'Within this year'}];
 const emo=emojiRanking(books,range),share=(x:number)=>emo.finishedBooks?Math.round(100*x/emo.finishedBooks):0;
 const rated=covers.map(e=>({e,rating:readOpinion(e.book,e.completion).rating??0})).filter(x=>x.rating>0).sort((a2,b2)=>b2.rating-a2.rating);
 const favs=covers.filter(e=>isFavoriteRead(e.book,e.completion)).reverse(),recent=r.recent;
 const halves=[r.months.slice(0,6),r.months.slice(6)];
 const icons:MuseIconName[]=['book','series','timer','calendar','chart','flame'];
 const open=(id:string)=>onOpenBook?.(id);
 return <div className="muse-atlas-section muse-yir2">
  <header className="muse-yir2-hero">
   <div className="muse-yir2-title"><span className="muse-yir2-kicker"><span aria-hidden="true">✦</span>{progress?'Your year so far':'Your year in reading'}</span><h3 className="muse-gradient-num type-numeric">{year}</h3>
    <p>{n.reads?`${progress?'So far: ':''}${plural(n.reads,'book')}, ${num(n.pages)} pages and ${n.seconds?compactTime(n.seconds):'no timed reading'} across ${plural(n.readingDays,'reading day')}.`:`${num(n.pages)} pages across ${plural(n.readingDays,'reading day')}; no finished books ${progress?'yet':'that year'}.`}</p>
    <div className="muse-yir-controls"><MuseChoiceMenu label="Year" valueLabel={year} options={years.map(y=>({id:y,label:y}))} selectedIds={[year]} onSelect={setChosen}/><button type="button" className="muse-button button-ghost muse-keepsake-open" onClick={()=>setKeepsake(true)}>Make a keepsake</button>{covers.length>0&&<button type="button" className="muse-button button-ghost muse-yb-open" onClick={()=>setAllBooks(true)}><MuseIcon name="book" size={14}/>See all {year} books</button>}</div></div>
   <div className="muse-yir2-covers" aria-label={`Books finished in ${year}`}>{covers.length?covers.slice(-4).reverse().map((e,i)=><button key={`${e.book.id}-${i}`} type="button" title={e.book.title} onClick={()=>open(e.book.id)}><Cover book={e.book}/></button>):Array.from({length:4},(_,i)=><span key={i} data-empty/>)}</div>
   <ul className="muse-yir2-lines">{[['book',n.reads,n.reads===1?'finished read':'finished reads'],['series',num(n.pages),'pages'],['timer',compactTime(n.seconds),'reading time'],['calendar',n.readingDays,'reading days']].map(([ic,v,l])=><li key={String(l)}><MuseIcon name={ic as MuseIconName} size={18}/><strong className="type-numeric">{v}</strong><span>{l}</span></li>)}</ul>
   <div className="muse-yir2-spark" role="img" aria-label={`Books finished each month of ${year}`}>{r.months.map(m=><span key={m.month} title={`${monthLabel(m.month)}: ${m.finished} finished · ${duration(m.seconds)}`}><i data-on={m.finished>0||undefined} style={{'--h':`${m.finished?Math.max(14,Math.round(100*m.finished/Math.max(1,...r.months.map(x=>x.finished)))):6}%`} as CSSProperties}/><small>{shortMonth(m.month).slice(0,1)}</small></span>)}</div>
  </header>
  {allBooks&&<YearBooksModal books={books} year={year} onOpenBook={onOpenBook} onClose={()=>setAllBooks(false)}/>}
  {month&&<MonthBooksModal books={books} month={month} onOpenBook={onOpenBook} onClose={()=>setMonth(null)}/>}
  {keepsake&&<KeepsakeExport books={books} sessions={sessions} goals={goals} year={year} today={today} onClose={()=>setKeepsake(false)}/>}
  <dl className="muse-yir2-chips" aria-label="The numbers">{stats.map((x,i)=><div key={x.k} title={x.d}><span aria-hidden="true"><MuseIcon name={icons[i]} size={20}/></span><dd className="type-numeric">{x.v}</dd><dt>{x.k}</dt></div>)}</dl>
  {/* Her note (Nov 26): Highlights get their own row, the same three-part panel as the Overview, so every highlight shows. */}
  <OverviewHighlights books={books} sessions={sessions} range={range} label={year} today={today}/>
  <div className="muse-yir2-row" data-row="story">
   <article className="muse-books-panel muse-yir2-emoji"><div className="muse-books-panel-head"><h4><AtlasMark title="Vibes"/>Your {year} in emojis</h4></div>
    {!emo.ranking.length?<p>Add emojis to finished books and their mood gathers here.</p>:<><ul className="muse-dna-vibes">{emo.ranking.slice(0,4).map(e=><li key={e.emoji} title={`${e.emoji} on ${plural(e.books,'book')}`}><span aria-hidden="true">{e.emoji}</span><strong className="type-numeric">{share(e.books)}%</strong><small className="type-numeric">×{e.books}</small></li>)}</ul>
     <p className="muse-dna-note">{emo.ranking[0].emoji} is on {share(emo.ranking[0].books)}% of finished books ({plural(emo.ranking[0].books,'book')}).</p></>}</article>
   <article className="muse-books-panel muse-yir2-journey"><div className="muse-books-panel-head"><h4><AtlasMark title="Your reading journey"/>Your reading journey</h4>{covers.length>0?<button type="button" className="muse-yir2-seeall" onClick={()=>setAllBooks(true)}>{plural(n.reads,'book')} · See all</button>:<span className="small-label">No books finished yet</span>}</div>
    {halves.map((half,hi)=><ol key={hi} className="muse-yir2-line">{half.map(m=>{const list=covers.filter(e=>e.completion.finishedOn.startsWith(m.month));return <li key={m.month} data-on={list.length>0||undefined}>
     <span className="muse-yir2-line-covers">{list.slice(-1).map((e,i)=><button key={i} type="button" title={list.map(x=>x.book.title).join(', ')} aria-label={list.length>1?`${monthLabel(m.month)}: ${list.length} finished. Show the books`:undefined} onClick={()=>list.length>1?setMonth(m.month):open(e.book.id)}><Cover book={e.book}/>{list.length>1&&<b className="type-numeric">{list.length}</b>}</button>)}</span>
     <i aria-hidden="true"/><small>{shortMonth(m.month)}</small></li>;})}</ol>)}</article>
  </div>
  {/* Recently finished (a little narrower), Top rated and Favorites: one row, each a carousel; no Milestones here. */}
  <div className="muse-yir2-row" data-row="close">
   <article className="muse-books-panel muse-yir2-books" data-kind="recent"><Carousel title="Recently finished" per={1} items={recent} empty={`Nothing finished ${progress?'yet':'that year'}.`} render={x=>{const o=readOpinion(x.book,x.completion);return <button key={`${x.book.id}${x.completion.id}`} type="button" className="muse-yir2-last" onClick={()=>open(x.book.id)}><span className="muse-yir2-last-cover"><Cover book={x.book}/></span><span><strong>{x.book.title}{x.reread?' · reread':''}</strong><small>{yearDate(x.completion.finishedOn)}</small>{o.rating?<RatingStars value={o.rating}/>:null}<em>{readEmojis(x.book,x.completion).join(' ')}</em></span></button>;}}/></article>
   <article className="muse-books-panel muse-yir2-books" data-kind="rated"><Carousel title="Top rated" per={4} items={rated} empty="No rated reads." render={({e,rating})=><button key={`${e.book.id}${e.completion.id}`} type="button" className="muse-yir2-shelfbook" title={`${e.book.title} · ${rating}/5`} onClick={()=>open(e.book.id)}><span><Cover book={e.book}/></span><RatingStars value={rating}/></button>}/></article>
   <article className="muse-books-panel muse-yir2-books" data-kind="favs"><Carousel title="Favorites" per={4} items={favs} empty="Heart a finished read." render={e=><button key={`${e.book.id}${e.completion.id}`} type="button" className="muse-yir2-shelfbook" title={e.book.title} onClick={()=>open(e.book.id)}><span><Cover book={e.book}/></span></button>}/></article>
  </div>
 </div>;
}

/** A titled shelf that pages through its items (per at a time) with the shared round arrows. */
function Carousel<T>({title,per,items,empty,render}:{title:string;per:number;items:T[];empty:string;render:(item:T)=>ReactNode}){
 const [at,setAt]=useState(0),pages=Math.max(1,Math.ceil(items.length/per)),page=Math.min(at,pages-1);
 return <><div className="muse-books-panel-head"><h4><AtlasMark title={title}/>{title}</h4>{pages>1&&<span className="muse-yir2-nav"><small className="type-numeric">{page+1} / {pages}</small><button type="button" aria-label={`Previous ${title.toLowerCase()}`} disabled={page===0} onClick={()=>setAt(page-1)}><MuseIcon name="chevron" size={14}/></button><button type="button" aria-label={`Next ${title.toLowerCase()}`} disabled={page>=pages-1} onClick={()=>setAt(page+1)}><MuseIcon name="chevron" size={14}/></button></span>}</div>
  {items.length?<div className="muse-yir2-shelf" data-per={per}>{items.slice(page*per,page*per+per).map(render)}</div>:<p>{empty}</p>}</>;
}
