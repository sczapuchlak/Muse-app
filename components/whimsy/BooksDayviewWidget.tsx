'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {MuseCard} from '@/components/MuseCard';
import {MuseStar} from '@/components/MuseStar';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {bookPosition,todayForReading} from '@/lib/whimsy/books';
import {validTimeZone} from '@/lib/dates';
import {readingByDay} from '@/lib/whimsy/integrations';
import {readReadingTimer,saveReadingTimer} from '@/lib/whimsy/reading-timer';
import {useWhimsyData} from './WhimsyData';
/** Source-only, opt-in Dayview projection; a start action writes the same canonical timer as Bookshelf. */
export function BooksDayviewWidget({date}:{date:string}){const {records,status,timeZone}=useWhimsyData(),client=useMemo(()=>createMuseBrowserClient(),[]),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[started,setStarted]=useState(false);if(!validTimeZone(timeZone)||!status.loaded||!records?.widgets.some(item=>item.experience==='bookshelf'&&item.enabled))return null;const books=records.books.filter(b=>b.status==='reading'),book=books.find(b=>b.id===selected)??books[0],day=readingByDay(records.sessions).find(d=>d.date===date),today=validTimeZone(timeZone)?todayForReading(timeZone):'';
 async function start(){if(!book||busy)return;setBusy(true);setError('');try{const existing=await readReadingTimer(client);if(existing){setError('A reading session is already open. Continue it in Bookshelf.');return;}const now=new Date().toISOString();await saveReadingTimer(client,{bookId:book.id,phase:'running',date:today,timeZone,startedAt:now,startingPage:bookPosition(book,records?.sessions??[]),sessionId:crypto.randomUUID(),sessionCommandId:crypto.randomUUID(),segments:[],runningSince:now},0,crypto.randomUUID());setStarted(true);}catch(e){setError(e instanceof Error?e.message:'Could not start reading. Try again.');}finally{setBusy(false);}}
 return <MuseCard id="daily-bookshelf"><div className="muse-card-header"><h2 id="daily-bookshelf-title">Bookshelf <MuseStar size={15} prismatic/></h2></div>{book?<><p className="card-description">{book.title}{book.author?` · ${book.author}`:''}</p><p className="small-label">Page {bookPosition(book,records.sessions)}{book.totalPages?` of ${book.totalPages}`:''} · Today: {day?`${Math.round(day.seconds/60)} min and ${day.pages} pages`:'no session recorded'}</p>{books.length>1&&<MuseChoiceMenu label="Current book" valueLabel={book.title} options={books.map(item=>({id:item.id,label:item.title}))} selectedIds={[book.id]} onSelect={setSelected}/>}</>:<p className="card-description">A story will find its place here when you add a book.</p>}{error&&<p role="alert">{error}</p>}{started&&<p role="status">Reading timer started.</p>}<div className="muse-books-actions">{book&&date===today&&!started&&<button type="button" className="muse-button" disabled={busy} onClick={()=>void start()}>Start reading</button>}<Link href="/collections?view=books" className="muse-button button-ghost">{started?'Continue reading':'Open Bookshelf'} →</Link></div></MuseCard>;
}
