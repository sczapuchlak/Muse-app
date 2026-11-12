'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {MuseModal} from '@/components/MuseModal';
import type {Book} from '@/lib/whimsy/models';
import {BookSearch} from '../BookSearch';
import {useQuickAdd} from '../QuickAdd';
import {Cover} from '../atlas/CoverCalendar';
import {seriesHref} from '@/lib/books/return-nav';
import type {PlanKind} from '@/lib/books/reading-plans';
import {StatusChip} from './PlanStatus';
import './ReadingPlans.css';

/**
 * Add books to a plan using the existing Muse Library search (your shelf first, then the catalog). Nothing is
 * duplicated: shelf books are chosen by id, and a catalog book is added to the Library through Quick Add first.
 */
export function AddBooksModal({kind,period,label,books,planned,onAdd,onClose}:{kind:PlanKind;period:string;label:string;books:Book[];planned:ReadonlySet<string>;onAdd:(ids:string[])=>void;onClose:()=>void}){
 const router=useRouter(),[picked,setPicked]=useState<string[]>([]);
 const byId=new Map(books.map(b=>[b.id,b]));
 const choose=(id:string)=>setPicked(list=>list.includes(id)?list:[...list,id]);
 const quick=useQuickAdd({onAdded:book=>choose(book.id)});
 const suggestions=books.filter(b=>!b.archivedAt&&!planned.has(b.id)&&(b.status==='planned'||b.status==='reading')).sort((a,b)=>(a.status===b.status?0:a.status==='reading'?-1:1)||b.createdAt.localeCompare(a.createdAt)).slice(0,12);
 const toggle=(id:string)=>setPicked(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id]);
 const fresh=picked.filter(id=>!planned.has(id));
 return <MuseModal id="reading-plan-add" label={`Add books to ${label}`} title={`Add to ${label}`} returnFocus={null} onClose={onClose} size="tall">
  <div className="muse-plan-add">
   {suggestions.length>0&&<section aria-label="From your shelf"><span className="small-label">From your shelf</span>
    <ul className="muse-plan-suggest">{suggestions.map(b=><li key={b.id}><button type="button" aria-pressed={picked.includes(b.id)} onClick={()=>toggle(b.id)} title={b.title}><span className="muse-plan-suggest-cover"><Cover book={b}/></span><strong>{b.title}</strong><StatusChip status={b.status} compact/></button></li>)}</ul></section>}
   <section aria-label="Search your library and the catalog"><span className="small-label">Or search</span>
    <BookSearch stage="search" onImport={c=>void quick.start({candidate:c,title:c.title,author:c.authors[0]??'',status:'planned'},c.key)} onEditions={()=>{}} onReview={()=>{}} onBackToSearch={()=>{}} onManual={()=>router.push(`/collections?tab=library&add=book&plan=${kind}:${period}`)} quickPending={quick.pending} onQuickAdd={(candidate,status,hit)=>void quick.start({candidate,title:candidate.title,author:candidate.authors[0]??'',status,...(hit?{hardcoverBookId:hit.bookId}:{})},candidate.key)} onOpenSeries={key=>router.push(seriesHref(key))} onOpenBook={id=>{if(planned.has(id))return;toggle(id);}}/>
    {quick.error&&<p role="alert" className="muse-books-error">{quick.error}</p>}</section>
   {picked.length>0&&<ul className="muse-plan-picked" aria-label="Chosen books">{picked.map(id=>{const b=byId.get(id);return <li key={id}>{b?.title??'A book'}<button type="button" className="text-button" aria-label={`Remove ${b?.title??'book'}`} onClick={()=>toggle(id)}>×</button></li>;})}</ul>}
   <div className="muse-books-actions muse-plan-add-actions"><button type="button" className="muse-button button-primary" disabled={!fresh.length} onClick={()=>{onAdd(fresh);onClose();}}>{fresh.length?`Add ${fresh.length} ${fresh.length===1?'book':'books'} to ${label}`:'Choose books to add'}</button><button type="button" className="muse-button button-ghost" onClick={onClose}>Cancel</button></div>
  </div>
  {quick.sheet}
 </MuseModal>;
}
