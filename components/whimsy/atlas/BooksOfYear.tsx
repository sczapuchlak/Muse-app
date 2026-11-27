'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {MuseModal} from '@/components/MuseModal';
import type {Book} from '@/lib/whimsy/models';
import {completionEvents} from '@/lib/whimsy/reading-stats';
import {Cover} from './CoverCalendar';
import {monthLabel,plural,yearDate} from './parts';

type Finished=ReturnType<typeof completionEvents>[number];
const finishedIn=(books:Book[],prefix:string)=>completionEvents(books).filter(e=>e.completion.finishedOn?.startsWith(prefix)).sort((x,y)=>(x.completion.finishedOn??'').localeCompare(y.completion.finishedOn??''));

/** A finished book as a small cover with its title: opens the book (in place when the page can, else its Book Detail page). */
function BookPick({e,onOpenBook,onClose,children}:{e:Finished;onOpenBook?:(id:string)=>void;onClose:()=>void;children:ReactNode}){
 const label=`${e.book.title}, finished ${yearDate(e.completion.finishedOn!)}`;
 return onOpenBook?<button type="button" title={label} onClick={()=>{onClose();onOpenBook(e.book.id);}}>{children}</button>:<Link href={`/collections/books/${e.book.id}`} title={label} onClick={onClose}>{children}</Link>;
}

/** The books finished in one month (Books a month, the reading journey): a small cover grid in a modal. */
export function MonthBooksModal({books,month,onClose,onOpenBook}:{books:Book[];month:string;onClose:()=>void;onOpenBook?:(id:string)=>void}){
 const shown=finishedIn(books,month);
 return <MuseModal id="atlas-month-books" label={`Books finished in ${monthLabel(month)}`} title={monthLabel(month)} returnFocus={null} onClose={onClose}>
  <ol className="muse-bam-modal">{shown.map(e=><li key={`${e.book.id}:${e.completion.id}`}><BookPick e={e} onOpenBook={onOpenBook} onClose={onClose}><span className="muse-bam-modal-cover"><Cover book={e.book}/></span><strong>{e.book.title}</strong><small>{yearDate(e.completion.finishedOn!)}</small></BookPick></li>)}</ol>
 </MuseModal>;
}

/**
 * Every book finished in a year, month by month (her note, Nov 26: "a way to see all the books read in 2026 … a modal, so
 * it doesn't take us out of the view"). Months without a finished book are left out; newest month first. Rereads count
 * once per finish, as everywhere else.
 */
export function YearBooksModal({books,year,onClose,onOpenBook}:{books:Book[];year:string;onClose:()=>void;onOpenBook?:(id:string)=>void}){
 const all=finishedIn(books,year),months=Array.from({length:12},(_,i)=>`${year}-${String(12-i).padStart(2,'0')}`).map(m=>({m,list:all.filter(e=>e.completion.finishedOn.startsWith(m))})).filter(x=>x.list.length);
 const best=months.reduce<{m:string;n:number}|null>((b,x)=>!b||x.list.length>b.n?{m:x.m,n:x.list.length}:b,null);
 return <MuseModal id="atlas-year-books" label={`Books finished in ${year}`} title={`Your ${year} in books`} returnFocus={null} onClose={onClose} size="tall">
  <p className="muse-yb-sum">{all.length?<>{plural(all.length,'book')} finished{best?<> · best month <strong>{monthLabel(best.m).split(' ')[0]}</strong>, {best.n}</>:null}</>:`Nothing finished in ${year} yet.`}</p>
  <div className="muse-yb">{months.map(({m,list})=><section key={m} className="muse-yb-month" aria-label={`${monthLabel(m)}: ${plural(list.length,'book')}`}>
   <header><strong>{monthLabel(m).split(' ')[0]}</strong><small className="type-numeric">{list.length}</small></header>
   <ol>{list.map(e=><li key={`${e.book.id}:${e.completion.id}`}><BookPick e={e} onOpenBook={onOpenBook} onClose={onClose}><span className="muse-yb-cover"><Cover book={e.book}/></span><small>{e.book.title}</small></BookPick></li>)}</ol>
  </section>)}</div>
 </MuseModal>;
}
