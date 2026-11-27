'use client';
import type {CSSProperties,ReactNode} from 'react';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import {bookSuperlatives,favoriteGenres,genreBreakdown,genrePersona,readingHabits,hourLabel,type Persona} from '@/lib/whimsy/reading-dna';
import {Cover} from './CoverCalendar';
import {paletteAt} from './Graphics';
import {compactTime,monthName,plural,num} from './parts';

const isPersona=(p:Persona|{needed:number}):p is Persona=>'title' in p;
/** A little constellation: the personality's mark. */
function Constellation({seed=''}:{seed?:string}){
 const seedNum=[...seed].reduce((n,ch)=>(n*31+ch.charCodeAt(0))>>>0,7),rnd=(i:number)=>((Math.sin(seedNum*12.9898+i*78.233)*43758.5453)%1+1)%1;
 const n=seed?5+Math.floor(rnd(0)*3):5,pts=Array.from({length:n},(_,i)=>{const a=(i/n)*Math.PI*2-Math.PI/2+(rnd(i+1)-.5)*.5,r=26+rnd(i+11)*14;return [50+r*Math.cos(a),50+r*Math.sin(a)];}),star='M50 34 Q53 47 66 50 Q53 53 50 66 Q47 53 34 50 Q47 47 50 34Z';
 return <svg className="muse-hl3-const" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/>{pts.map(([x,y],i)=>{const [nx,ny]=pts[(i+1)%pts.length];return <line key={i} x1={x} y1={y} x2={nx} y2={ny}/>;})}{pts.map(([x,y],i)=><circle key={`s${i}`} className="muse-hl3-dot" cx={x} cy={y} r="2.6"/>)}<path className="muse-hl3-star" d={star}/></svg>;
}
/** A crescent moon with a dashed dial: the favourite reading hour. */
function HourMoon({label}:{label:string}){
 return <span className="muse-hl3-moon" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" className="muse-hl3-dial"/><path d="M58 18a33 33 0 1 0 24 52A28 28 0 0 1 58 18z" className="muse-hl3-crescent"/><path d="M70 26 Q71.5 31 76 32 Q71.5 33 70 38 Q68.5 33 64 32 Q68.5 31 70 26Z" className="muse-hl3-star"/></svg><strong className="type-numeric">{label}</strong></span>;
}
const Line=({icon,children}:{icon:MuseIconName;children:ReactNode})=><li><MuseIcon name={icon} size={15}/><span>{children}</span></li>;

/**
 * Highlights (Nov 26, her mock): one panel in three parts. Reader portrait (personality, favourite genre, genres explored,
 * most time in a genre); Book superlatives (the longest and the best book as covers, the rest as a short list); Reading
 * rhythm (the week's bars and favourite day, the hour as a moon, the busiest stretch and longest sitting). Same records
 * and functions as before; nothing estimated, honest empty states.
 */
export function OverviewHighlights({books,sessions,range,label,today}:{books:Book[];sessions:ReadingSession[];range:DateRange|null;label:string;today:string}){
 const sup=bookSuperlatives(books,sessions,range),habits=readingHabits(sessions,range,today),genres=genreBreakdown(books,sessions,range),fav=favoriteGenres(genres.rows),persona=genrePersona(books,range);
 const explored=genres.rows.filter(g=>g.finished),week=habits.weekdays.map(w=>habits.anyTime?w.seconds:w.days),wmax=Math.max(1,...week),hot=habits.favoriteDay?habits.favoriteDay.index:-1;
 // Book superlatives grouped by book: a book that earned four distinctions shows once, with four accolades.
 const marks:{book:Book;label:string;value:string;icon:MuseIconName}[]=[
  ...(sup.longest?[{book:sup.longest.book,label:'Longest book',value:`${num(sup.longest.book.totalPages??0)} pages`,icon:'book' as MuseIconName}]:[]),
  ...(sup.shortest?[{book:sup.shortest.book,label:'Shortest book',value:`${num(sup.shortest.book.totalPages??0)} pages`,icon:'bookmark' as MuseIconName}]:[]),
  ...(sup.highestRated?[{book:sup.highestRated.book,label:'Highest rated',value:`${sup.highestRated.rating}/5`,icon:'favorite' as MuseIconName}]:[]),
  ...(sup.mostTime?[{book:sup.mostTime.book,label:'Most time with',value:compactTime(sup.mostTime.seconds),icon:'timer' as MuseIconName}]:[]),
  ...(sup.fastest?[{book:sup.fastest.book,label:'Fastest finish',value:plural(sup.fastest.days,'day'),icon:'flame' as MuseIconName}]:[])];
 const groups=[...marks.reduce((m,x)=>{const g=m.get(x.book.id)??{book:x.book,marks:[] as typeof marks};g.marks.push(x);m.set(x.book.id,g);return m;},new Map<string,{book:Book;marks:typeof marks}>()).values()].sort((a2,b2)=>b2.marks.length-a2.marks.length);
 return <section className="muse-books-panel muse-hl3" aria-labelledby="hl3">
  <header className="muse-hl3-head"><span className="muse-hl3-spark" aria-hidden="true">✦</span><h3 id="hl3">Highlights</h3><em>Little things that tell your reading story</em><span className="small-label">{label}</span></header>
  <div className="muse-hl3-cols">
   <section className="muse-hl3-col" aria-label="Reader portrait"><h4><span aria-hidden="true">✦</span>Reader portrait</h4>
    <div className="muse-hl3-portrait"><Constellation seed={isPersona(persona)?persona.title:''}/><div><small>Reading personality</small>{isPersona(persona)?<><strong>{persona.title}</strong><em>{persona.line}</em></>:<em><MuseIcon name="pin" size={13}/> Finish {plural(persona.needed,'more book')} with a genre to reveal your personality.</em>}</div></div>
    <ul className="muse-hl3-facts">
     <li><span className="muse-hl3-ic" style={{'--c':'var(--chart-4)'} as CSSProperties}><MuseIcon name="tag" size={17}/></span><span><strong>{fav.mostRead?.genre??'—'}</strong><small>Favorite genre</small></span>{fav.mostRead&&<em>{plural(fav.mostRead.reads,'finished read')}</em>}</li>
     <li><span className="muse-hl3-ic" style={{'--c':'var(--chart-2)'} as CSSProperties}><MuseIcon name="chart" size={17}/></span><span className="muse-hl3-genredots" aria-hidden="true">{explored.slice(0,6).map((g,i)=><i key={g.key} title={g.genre} style={{'--c':paletteAt(i)} as CSSProperties}/>)}</span><em>{explored.length?`${plural(explored.length,'genre')} explored`:'No genres yet'}</em></li>
     <li><span className="muse-hl3-ic" style={{'--c':'var(--chart-1)'} as CSSProperties}><MuseIcon name="timer" size={17}/></span><span><strong>{fav.mostTime?`${fav.mostTime.genre} · ${compactTime(fav.mostTime.seconds)}`:'—'}</strong><small>Most time in a genre</small></span></li>
    </ul></section>
   <section className="muse-hl3-col" aria-label="Book superlatives"><h4><span aria-hidden="true">♕</span>Book superlatives</h4>
    {!groups.length?<p className="muse-hl3-empty">Finish a book with its page count and these fill in.</p>:<div className="muse-hl3-books" data-count={Math.min(groups.length,3)}>
     {groups.slice(0,3).map(g=><figure key={g.book.id}><span className="muse-hl3-cover"><Cover book={g.book}/></span><figcaption><strong>{g.book.title}</strong>{g.book.author&&<small>by {g.book.author}</small>}
      <ul className="muse-hl3-list">{g.marks.map(m=><Line key={m.label} icon={m.icon}>{m.label}<b>{m.value}</b></Line>)}</ul></figcaption></figure>)}
     {groups.length>3&&<ul className="muse-hl3-list muse-hl3-rest">{groups.slice(3).flatMap(g=>g.marks.map(m=><Line key={g.book.id+m.label} icon={m.icon}>{m.label} · <b>{g.book.title}</b> · {m.value}</Line>))}</ul>}
    </div>}</section>
   <section className="muse-hl3-col" aria-label="Reading rhythm"><h4><span aria-hidden="true">☾</span>Reading rhythm</h4>
    <div className="muse-hl3-rhythm">
     <div className="muse-hl3-week"><span className="muse-hl3-bars" aria-hidden="true">{week.map((v,i)=><i key={i} data-hot={i===hot||undefined} style={{'--h':`${Math.max(10,Math.round(100*v/wmax))}%`} as CSSProperties}><small>{'MTWTFSS'[i]}</small></i>)}</span>
      <small>Favorite reading day</small><strong>{habits.favoriteDay?.name??'—'}</strong>{habits.favoriteDay&&<em>{plural(habits.favoriteDay.days,'reading day')}</em>}</div>
     <div className="muse-hl3-hour">{habits.topHour!==null?<HourMoon label={hourLabel(habits.topHour)}/>:<HourMoon label="—"/>}<small>{habits.topHour!==null?'Favorite reading hour':'Needs three timed sessions'}</small></div>
    </div>
    <div className="muse-hl3-foot">
     <span><MuseIcon name="calendar" size={20}/><span><strong>{habits.mostActiveMonth?`${monthName(habits.mostActiveMonth.month)} · ${habits.anyTime?compactTime(habits.mostActiveMonth.seconds):`${habits.mostActiveMonth.pages} pages`}`:'—'}</strong><small>Busiest stretch</small></span></span>
     <span><MuseIcon name="timer" size={20}/><span><strong>{habits.longestSession?compactTime(habits.longestSession.seconds):'—'}</strong><small>Longest sitting</small></span></span>
    </div></section>
  </div>
 </section>;
}
