'use client';
import {AtlasMark} from './parts';
import type {CSSProperties,ReactNode} from 'react';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import {bookSuperlatives,favoriteGenres,genreBreakdown,genrePersona,readingHabits,hourLabel,type Persona} from '@/lib/whimsy/reading-dna';
import {Cover} from './CoverCalendar';
import {PagedList} from './PagedList';
import {hours,monthName,plural,num,duration} from './parts';

type Tone='violet'|'aqua'|'orange'|'pink'|'green'|'blue';
type Card={key:string;tone:Tone;icon:MuseIconName;label:string;value?:string|null;detail?:string|null;empty:string;art?:ReactNode};
const isPersona=(p:Persona|{needed:number}):p is Persona=>'title' in p;
const Bars=({values,hot,labels,className=''}:{values:number[];hot:number;labels?:string[];className?:string})=>{const max=Math.max(1,...values);return <span className={`muse-hl-bars ${className}`.trim()} aria-hidden="true">{values.map((v,i)=><i key={i} data-hot={i===hot||undefined} style={{'--h':`${Math.max(8,Math.round(100*v/max))}%`} as CSSProperties}>{labels&&<small>{labels[i]}</small>}</i>)}</span>;};
const Thumb=({book}:{book:Book})=><span className="muse-hl-cover" aria-hidden="true"><Cover book={book}/></span>;

/**
 * Highlights: the standout facts of a period, each with its own colour, an icon and a little picture (a cover, weekday
 * bars, a month shape, an hour dial). Built from the same saved records as the rest of the Atlas, for any period.
 */
export function Highlights({books,sessions,range,label,today,wholeYear=false}:{books:Book[];sessions:ReadingSession[];range:DateRange|null;label:string;today:string;wholeYear?:boolean}){
 const sup=bookSuperlatives(books,sessions,range),habits=readingHabits(sessions,range,today),genres=genreBreakdown(books,sessions,range),fav=favoriteGenres(genres.rows),persona=genrePersona(books,range);
 const weekdayValues=habits.weekdays.map(w=>habits.anyTime?w.seconds:w.days),favDayIndex=habits.favoriteDay?habits.favoriteDay.index:-1;
 const monthLabels=habits.months.map(m=>m.month);
 const yearMonths=range&&wholeYear?Array.from({length:12},(_,i)=>`${range.start.slice(0,4)}-${String(i+1).padStart(2,'0')}`):null;
 const monthValues=yearMonths?yearMonths.map(m=>{const f=habits.months.find(x=>x.month===m);return f?(habits.anyTime?f.seconds:f.pages):0;}):habits.months.map(m=>habits.anyTime?m.seconds:m.pages);
 const hotMonth=habits.mostActiveMonth?(yearMonths?yearMonths.indexOf(habits.mostActiveMonth.month):monthLabels.indexOf(habits.mostActiveMonth.month)):-1;
 const cards:Card[]=[
  {key:'persona',tone:'violet',icon:'sparkle',label:'Reading personality',value:isPersona(persona)?persona.title:undefined,detail:isPersona(persona)?persona.line:undefined,empty:isPersona(persona)?'':`Finish ${plural(persona.needed,'more book')} with a genre`,art:<span className="muse-hl-orb" aria-hidden="true"><MuseIcon name="sparkle" size={30}/></span>},
  {key:'genre',tone:'pink',icon:'tag',label:'Favorite genre',value:fav.mostRead?.genre,detail:fav.mostRead&&plural(fav.mostRead.reads,'finished read'),empty:'Add genres to finished books',art:genres.rows.length?<span className="muse-hl-chips" aria-hidden="true">{[...genres.rows].sort((a,b)=>b.reads-a.reads).slice(0,3).map(r=><em key={r.key}>{r.genre}</em>)}</span>:undefined},
  {key:'explored',tone:'aqua',icon:'series',label:'Genres explored',value:genres.rows.filter(g=>g.finished).length?String(genres.rows.filter(g=>g.finished).length):undefined,detail:'Across finished books',empty:'No finished books with genres',art:<span className="muse-hl-dots" aria-hidden="true">{Array.from({length:Math.min(12,genres.rows.filter(g=>g.finished).length)},(_,i)=><i key={i}/>)}</span>},
  {key:'timegenre',tone:'blue',icon:'timer',label:'Most time in a genre',value:fav.mostTime?.genre,detail:fav.mostTime&&hours(fav.mostTime.seconds),empty:'Needs timed sessions on books with genres'},
  {key:'longest',tone:'orange',icon:'book',label:'Longest book',value:sup.longest?.book.title,detail:sup.longest&&`${num(sup.longest.book.totalPages??0)} pages`,empty:'Needs a page count',art:sup.longest?<Thumb book={sup.longest.book}/>:undefined},
  {key:'shortest',tone:'green',icon:'bookmark',label:'Shortest book',value:sup.shortest?.book.title,detail:sup.shortest&&`${num(sup.shortest.book.totalPages??0)} pages`,empty:'Needs two page counts',art:sup.shortest?<Thumb book={sup.shortest.book}/>:undefined},
  {key:'rated',tone:'pink',icon:'favorite',label:'Highest rated',value:sup.highestRated?.book.title,detail:sup.highestRated&&`${'★'.repeat(Math.round(sup.highestRated.rating))} ${sup.highestRated.rating}/5`,empty:'No rated reads',art:sup.highestRated?<Thumb book={sup.highestRated.book}/>:undefined},
  {key:'mosttime',tone:'blue',icon:'flame',label:'Most time with',value:sup.mostTime?.book.title,detail:sup.mostTime&&hours(sup.mostTime.seconds),empty:'No timed sessions',art:sup.mostTime?<Thumb book={sup.mostTime.book}/>:undefined},
  {key:'fastest',tone:'orange',icon:'timer',label:'Fastest finish',value:sup.fastest?.book.title,detail:sup.fastest&&`${plural(sup.fastest.days,'day')}, start to finish`,empty:'Needs a finished read with a start date',art:sup.fastest?<Thumb book={sup.fastest.book}/>:undefined},
  {key:'day',tone:'aqua',icon:'calendar',label:'Favorite reading day',value:habits.favoriteDay?.name,detail:habits.favoriteDay&&plural(habits.favoriteDay.days,'reading day'),empty:'No reading days',art:habits.favoriteDay?<Bars values={weekdayValues} hot={favDayIndex} labels={['M','T','W','T','F','S','S']}/>:undefined},
  {key:'month',tone:'green',icon:'flame',label:wholeYear?'Most active month':'Busiest stretch',value:habits.mostActiveMonth&&monthName(habits.mostActiveMonth.month),detail:habits.mostActiveMonth&&(habits.anyTime?hours(habits.mostActiveMonth.seconds):`${habits.mostActiveMonth.pages} pages`),empty:'No reading months',art:habits.mostActiveMonth&&monthValues.length>1?<Bars values={monthValues} hot={hotMonth} className="muse-hl-bars-12"/>:undefined},
  {key:'hour',tone:'violet',icon:'moon',label:'Favorite reading hour',value:habits.topHour!==null?hourLabel(habits.topHour):undefined,detail:habits.topHour!==null?'Timed sessions only':undefined,empty:'Needs three timed sessions',art:habits.topHour!==null?<Bars values={habits.hours} hot={habits.topHour} className="muse-hl-bars-24"/>:undefined},
  {key:'session',tone:'pink',icon:'play',label:'Longest sitting',value:habits.longestSession?duration(habits.longestSession.seconds):undefined,detail:'Active time, pauses excluded',empty:'No timed sessions yet'},
 ];
 return <section className="muse-highlights" aria-label="Highlights"><div className="muse-books-panel-head"><h4><AtlasMark title="Highlights"/>Highlights</h4><span className="small-label">{label}</span></div>
  <PagedList items={cards} size={4} cols={4} label="highlights" className="muse-hl-grid" render={c=><div role="listitem" key={c.key} className="muse-hl-card" data-tone={c.tone}>
   <div className="muse-hl-head"><span className="muse-hl-icon" aria-hidden="true"><MuseIcon name={c.icon} size={16}/></span><span className="small-label">{c.label}</span></div>
   <div className="muse-hl-body">{c.art&&<div className="muse-hl-art">{c.art}</div>}<div className="muse-hl-text">{c.value?<><strong>{c.value}</strong>{c.detail&&<small>{c.detail}</small>}</>:<small className="muse-hl-empty">{c.empty}</small>}</div></div></div>}/>
 </section>;
}
