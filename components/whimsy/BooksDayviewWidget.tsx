'use client';
import {useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {MuseCard} from '@/components/MuseCard';
import {MuseStar} from '@/components/MuseStar';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {bookPosition,featuredReadingBook,todayForReading} from '@/lib/whimsy/books';
import {saveWhimsyRecord} from '@/lib/whimsy/persistence';
import {validTimeZone} from '@/lib/dates';
import {readReadingTimer,saveReadingTimer} from '@/lib/whimsy/reading-timer';
import {BookCover} from './Bookshelf';
import {useWhimsyData} from './WhimsyData';
import './BooksDayviewWidget.css';

/** One chosen canonical book is projected onto Daily Edit; Collections keeps every active book. */
export function BooksDayviewWidget({date}:{date:string}){
 const {records,status,timeZone,retry}=useWhimsyData(),client=useMemo(()=>createMuseBrowserClient(),[]),anchor=useRef<HTMLButtonElement>(null);
 const [pickerOpen,setPickerOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[started,setStarted]=useState(false),[attempt,setAttempt]=useState<{id:string;revision:number;commandId:string;featuredBookId:string}|null>(null);
 if(!validTimeZone(timeZone)||!status.loaded||!records)return null;
 const preference=records.widgets.find(item=>item.experience==='bookshelf');if(!preference?.enabled)return null;
 const books=records.books.filter(item=>item.status==='reading'),book=featuredReadingBook(records.books,preference.featuredBookId),today=todayForReading(timeZone);
 async function choose(featuredBookId:string){if(busy)return;if(featuredBookId===preference?.featuredBookId){setPickerOpen(false);anchor.current?.focus();return;}const next=attempt?.featuredBookId===featuredBookId?attempt:{id:preference!.id,revision:preference!.revision,commandId:crypto.randomUUID(),featuredBookId};setAttempt(next);setBusy(true);setError('');try{await saveWhimsyRecord(client,'widgets',{record:{id:next.id,experience:'bookshelf',enabled:true,featuredBookId},expectedRevision:next.revision,commandId:next.commandId});await retry();setAttempt(null);setPickerOpen(false);anchor.current?.focus();}catch(cause){setError(cause instanceof Error?cause.message:'Book choice was not saved. Retry your selection.');}finally{setBusy(false);}}
 async function start(){if(!book||busy)return;setBusy(true);setError('');try{const existing=await readReadingTimer(client);if(existing){setError('A reading session is already open. Continue it in Bookshelf.');return;}const now=new Date().toISOString();await saveReadingTimer(client,{bookId:book.id,phase:'running',date:today,timeZone,startedAt:now,startingPage:bookPosition(book,records?.sessions??[]),sessionId:crypto.randomUUID(),sessionCommandId:crypto.randomUUID(),segments:[],runningSince:now},0,crypto.randomUUID());setStarted(true);}catch(cause){setError(cause instanceof Error?cause.message:'Could not start reading. Try again.');}finally{setBusy(false);}}
 return <MuseCard id="daily-bookshelf" className="muse-daily-bookshelf"><div className="muse-card-header"><h2 id="daily-bookshelf-title">Bookshelf <MuseStar size={15} prismatic/></h2><button ref={anchor} type="button" className="muse-button button-ghost muse-daily-bookshelf-settings" aria-label="Choose featured book" title="Choose featured book" aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={()=>setPickerOpen(value=>!value)}><MuseIcon name="settings" size={16}/></button></div><GlassPopover id="daily-bookshelf-picker" label="Choose featured book" open={pickerOpen} anchorRef={anchor} onClose={()=>setPickerOpen(false)} width={300}><div className="muse-daily-bookshelf-picker"><strong>Feature a current read</strong>{books.length?books.map(item=><button type="button" className="muse-button button-ghost" aria-pressed={book?.id===item.id} disabled={busy} key={item.id} onClick={()=>void choose(item.id)}>{item.title}</button>):<p>No Currently Reading books yet.</p>}</div></GlassPopover>{book?<div className="muse-daily-bookshelf-feature"><BookCover book={book}/><div><strong className="muse-daily-bookshelf-title">{book.title}</strong><span>{book.author||'Author not recorded'}</span><span>Page {bookPosition(book,records.sessions)}{book.totalPages?` of ${book.totalPages}`:''}</span>{book.totalPages&&<progress value={Math.min(bookPosition(book,records.sessions),book.totalPages)} max={book.totalPages} aria-label={`${book.title} reading progress`}/>}</div></div>:<p className="card-description">A story will find its place here when you mark a book Currently Reading.</p>}{error&&<p role="alert">{error}</p>}{started&&<p role="status">Reading timer started.</p>}<div className="muse-books-actions">{book&&date===today&&!started&&<button type="button" className="muse-button" disabled={busy} onClick={()=>void start()}>Start reading</button>}<Link href={book?`/collections?view=books&book=${book.id}`:'/collections?view=books'} className="muse-button button-ghost">{started?'Continue reading':'Open Bookshelf'} →</Link></div></MuseCard>;
}
