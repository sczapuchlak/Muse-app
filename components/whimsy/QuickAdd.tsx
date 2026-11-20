'use client';
/* eslint-disable @next/next/no-img-element -- edition covers are external HTTPS images, as elsewhere in Books. */
import {useMemo,useRef,useState,type ReactNode} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {MuseIcon} from '@/components/MuseIcon';
import {useMuseSpark} from '@/components/MuseSpark';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {todayForReading} from '@/lib/whimsy/books';
import {validTimeZone} from '@/lib/dates';
import type {Book} from '@/lib/whimsy/models';
import type {SeriesMember} from '@/lib/collections/models';
import {sameEdition,withEdition,type BookCandidate} from '@/lib/books/metadata';
import {addDiscoveredBook,discoveredBookDraft,distinctEditions,existingLibraryBook,fetchEditions,lookupCatalogBook,postJson,type QuickStatus} from '@/lib/books/add-book';
import {saveReadingPlan} from '@/lib/books/finish';
import {readReadingTimer} from '@/lib/whimsy/reading-timer';
import {FinishBook,type FinishSave} from './FinishBook';
import type {BookLookup} from '@/lib/books/series-discovery';
import {collectionsChanged,useCollectionsData} from '@/components/collections/CollectionsData';
import {useWhimsyData} from './WhimsyData';
import './QuickAdd.css';

export type QuickAddRequest={candidate:BookCandidate|null;title:string;author:string;status:QuickStatus;hardcoverBookId?:string;member?:SeriesMember|null;catalog?:{coverUrl?:string|null;pages?:number|null}};
type Sheet={request:QuickAddRequest;base:BookCandidate|null;editions:BookCandidate[];lookup:BookLookup|null;resolve:(pick:{edition:BookCandidate;status:QuickStatus}|undefined)=>void};
const norm=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const editionLine=(e:BookCandidate)=>[e.formatLabel||e.format?e.publisher:null,e.year,e.language,e.pageCount?`${e.pageCount} pages`:null].filter(Boolean).join(' · ');
export const quickStatusLabel:Record<QuickStatus,string>={planned:'To Be Read',reading:'Currently Reading',finished:'Already read'};
/** Already read: the edition chosen, the book drafted (or found on the shelf), waiting for Finish Book. Nothing is saved yet. */
type Finishing={book:Book;isNew:boolean;draft:ReturnType<typeof discoveredBookDraft>|null;args:Parameters<typeof addDiscoveredBook>[1]};

/**
 * Quick Add (#136): one tap from Books search or a series. When an edition choice matters (a different format,
 * length, publisher, year or language), "Which edition?" asks; otherwise the book is added as found. The
 * series membership, synopsis and catalog details travel with it.
 */
export function useQuickAdd({onAdded}:{onAdded?:(book:Book,existing:boolean)=>void}={}){
 const {records:whimsy,timeZone,retry:retryWhimsy}=useWhimsyData(),{records,userId,retry}=useCollectionsData(),client=useMemo(()=>createMuseBrowserClient(),[]);
 const [finishing,setFinishing]=useState<Finishing|null>(null),[finishBusy,setFinishBusy]=useState(false),[finishError,setFinishError]=useState('');
 const [pending,setPending]=useState<string|null>(null),[sheet,setSheet]=useState<Sheet|null>(null),[toast,setToast]=useState<{book:Book;existing:boolean;note?:string}|null>(null),[error,setError]=useState('');
 const sparkle=useMuseSpark(),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const books=whimsy?.books??[],today=validTimeZone(timeZone)?todayForReading(timeZone):new Date().toISOString().slice(0,10);
 async function resolveCandidate(request:QuickAddRequest):Promise<BookCandidate|null>{
  if(request.candidate)return request.candidate;
  // From a series: the edition search uses the catalog title and author.
  const found=await postJson<{results:BookCandidate[]}>('/api/books/search',{query:`${request.title} ${request.author}`.trim().slice(0,120)}).catch(()=>({results:[]}));
  const same=found.results.filter(c=>norm(c.title)===norm(request.title)||norm(c.title).startsWith(`${norm(request.title)} `));
  return same.find(c=>!request.author||c.authors.some(a=>norm(a)===norm(request.author)))??same[0]??null;
 }
 async function start(request:QuickAddRequest,key:string){
  if(pending)return;setPending(key);setError('');
  try{
   const owned=existingLibraryBook(books,{title:request.title,authors:request.author?[request.author]:[],isbn13:request.candidate?.isbn13});
   // Already read for a book on the shelf finishes (or adds a past read to) that same book: never a duplicate.
   if(owned&&request.status==='finished'&&!request.member){setFinishError('');setFinishing({book:owned,isNew:false,draft:null,args:{candidate:null,status:'finished',lookup:null}});return;}
   if(owned&&!request.member){showToast(owned,true);return;}
   const base=await resolveCandidate(request);
   const [editions,lookup]=await Promise.all([
    base&&(base.workKey||base.isbn13)?fetchEditions(base).then(r=>({list:r.editions,description:r.description})).catch(()=>({list:[] as BookCandidate[],description:undefined})):Promise.resolve({list:[] as BookCandidate[],description:undefined}),
    lookupCatalogBook({title:request.title,author:request.author,isbn:base?.isbn13,workKey:base?.workKey,...(request.hardcoverBookId?{hardcoverBookId:request.hardcoverBookId}:{})}).catch(()=>null),
   ]);
   const described=base&&!base.description&&editions.description?{...base,description:editions.description}:base;
   const choices=distinctEditions(described,editions.list);
   let chosen:BookCandidate|null=described,status=request.status;
   if(choices.length>1){
    const picked=await new Promise<{edition:BookCandidate;status:QuickStatus}|undefined>(resolve=>setSheet({request,base:described,editions:choices,lookup,resolve}));
    setSheet(null);
    if(!picked)return;
    status=picked.status;
    chosen=described?(sameEdition(described,picked.edition)?described:withEdition(described,picked.edition)):picked.edition;
   }else if(described&&editions.list.length){const match=editions.list.find(e=>sameEdition(described,e));if(match)chosen=withEdition(described,match);}
   const args={candidate:chosen,catalogOnly:chosen?undefined:{title:request.title,author:request.author,coverUrl:request.catalog?.coverUrl??lookup?.book?.coverUrl??null,pages:request.catalog?.pages??lookup?.book?.pages??null},status,lookup,member:request.member};
   if(status==='finished'){
    const draft=discoveredBookDraft({today,books},args);setFinishError('');
    setFinishing('existing' in draft?{book:draft.existing,isNew:false,draft:null,args}:{book:draft.draft,isNew:true,draft,args});return;
   }
   const result=await addDiscoveredBook({client,userId,today,books,records},args);
   collectionsChanged();await Promise.all([retry(),retryWhimsy()]);
   showToast(result.book,result.existing);sparkle.trigger();
   onAdded?.(result.book,result.existing);
  }catch(cause){setError(cause instanceof Error?cause.message:typeof (cause as {message?:unknown})?.message==='string'?(cause as {message:string}).message:'That book could not be added. Nothing was changed.');}
  finally{setPending(null);}
 }
 /** Already read's single save: the new book with its finished read (or the existing book's read) in one write. */
 async function saveFinished(state:Finishing,{plan}:FinishSave){
  if(finishBusy)return;setFinishBusy(true);setFinishError('');
  try{
   if(!validTimeZone(timeZone))throw Error('Set your saved timezone in Settings before recording reading.');
   let book=state.book,existing=!state.isNew;
   if(state.isNew&&state.draft){const result=await addDiscoveredBook({client,userId,today,books,records},{...state.args,finish:{plan,sessions:whimsy?.sessions??[],timeZone,draft:state.draft}});book=result.book;existing=result.existing;}
   else{
    const timer=await readReadingTimer(client);
    if(timer?.bookId===book.id&&plan.target==='current')throw Error('This book has a reading timer open. Finish the book from its timer, or discard the sitting first.');
    await saveReadingPlan(client,{book,plan,sessions:whimsy?.sessions??[],timeZone,today});
   }
   collectionsChanged();await Promise.all([retry(),retryWhimsy()]);
   setFinishing(null);showToast(book,false,plan.target==='past'?'has another finished read':'is on your shelf, finished');sparkle.trigger();
   onAdded?.(book,existing);
  }catch(cause){setFinishError(cause instanceof Error?cause.message:typeof (cause as {message?:unknown})?.message==='string'?(cause as {message:string}).message:'That book could not be saved. Nothing was changed.');}
  finally{setFinishBusy(false);}
 }
 function showToast(book:Book,existing:boolean,note?:string){setToast({book,existing,note});if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(null),6500);}
 const sheetElement=sheet?<EditionSheet sheet={sheet} onChoose={(edition,status)=>sheet.resolve({edition,status})} onCancel={()=>sheet.resolve(undefined)}/>
  :finishing?<FinishBook key={finishing.book.id} book={finishing.book} today={today} timeZone={timeZone} busy={finishBusy} error={finishError} context={finishing.isNew?'add':finishing.book.status==='finished'?'past-read':'add'} sessions={whimsy?.sessions??[]} onSave={save=>void saveFinished(finishing,save)} onClose={()=>{setFinishing(null);setFinishError('');}}/>:null;
 return {start,pending,error,clearError:()=>setError(''),sheet:sheetElement,toast,dismissToast:()=>setToast(null),spark:sparkle.spark};
}

function EditionSheet({sheet,onChoose,onCancel}:{sheet:Sheet;onChoose:(edition:BookCandidate,status:QuickStatus)=>void;onCancel:()=>void}){
 const [status,setStatus]=useState<QuickStatus>(sheet.request.status);
 return <MuseModal id="book-edition-sheet" label="Choose an edition" title="Which edition?" returnFocus={null} onClose={onCancel} size="tall">
  <div className="muse-edition-sheet">
   <p className="muse-edition-sheet-title type-title">{sheet.request.title}<span>{sheet.request.author?` · ${sheet.request.author}`:''}</span></p>
   <div className="muse-segmented muse-edition-sheet-status" role="group" aria-label="Add as">{(Object.keys(quickStatusLabel) as QuickStatus[]).map(id=><button key={id} type="button" aria-pressed={status===id} onClick={()=>setStatus(id)}>{quickStatusLabel[id]}</button>)}</div>
   <p className="small-label muse-edition-sheet-hint">Covers, page counts and ISBNs follow the edition you choose.</p>
   <ul className="muse-edition-sheet-list">{sheet.editions.map((edition,index)=><li key={edition.key}>
    <span className="muse-edition-sheet-cover">{edition.thumbnailUrl??edition.coverUrl?<img src={edition.thumbnailUrl??edition.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span aria-hidden="true">{edition.title.slice(0,1)}</span>}</span>
    <span className="muse-edition-sheet-copy"><strong>{edition.formatLabel??(edition.format==='ebook'?'Ebook':edition.format==='audiobook'?'Audiobook':edition.format==='physical'?'Print':edition.publisher??'Edition')}{index===0&&sheet.base&&sheet.base.key===edition.key?<em> · the one you found</em>:null}</strong><span>{editionLine(edition)||'Details not listed'}</span>{edition.isbn13&&<small className="type-numeric">ISBN {edition.isbn13}</small>}</span>
    <button type="button" className="muse-button button-primary" onClick={()=>onChoose(edition,status)}>Add</button>
   </li>)}</ul>
  </div>
 </MuseModal>;
}

/** Success: "… is on your shelf" with a way straight to the book. */
export function QuickAddToast({toast,onOpen,onDismiss,spark}:{toast:{book:Book;existing:boolean;note?:string}|null;onOpen:(book:Book)=>void;onDismiss:()=>void;spark?:ReactNode}){
 if(!toast)return null;
 return <div className="muse-quick-toast" role="status">
  <span className="muse-quick-toast-cover">{toast.book.coverUrl?<img src={toast.book.coverUrl} alt="" referrerPolicy="no-referrer"/>:<MuseIcon name="book" size={18}/>}{spark}</span>
  <span className="muse-quick-toast-copy"><strong>{toast.book.title}</strong><span>{toast.note??(toast.existing?'is already on your shelf':'is on your shelf')}</span></span>
  <button type="button" className="muse-button" onClick={()=>onOpen(toast.book)}>Open</button>
  <button type="button" className="muse-icon-button" aria-label="Dismiss" onClick={onDismiss}><MuseIcon name="close" size={16}/></button>
 </div>;
}

/** Adding a book that is not on the shelf (Nov 18): plain, labelled choices, one tap each: To Be Read (want to read it),
 * Reading now (Currently Reading) or Read (already read: opens Finish Book for its dates, sessions, rating and review).
 * The compact size keeps the same choices with shorter words. */
export function QuickAddButton({busy,disabled,onAdd,label,size}:{busy:boolean;disabled?:boolean;onAdd:(status:QuickStatus)=>void;label:string;size?:'sm'}){
 const [last,setLast]=useState<QuickStatus>('planned');
 const choose=(status:QuickStatus)=>(event:React.MouseEvent)=>{event.stopPropagation();setLast(status);onAdd(status);};
 const spinner=<span className="muse-quick-add-spinner" aria-hidden="true"/>;
 return <span className="muse-quick-add" data-size={size} role="group" aria-label={`Add ${label}`}>
  <button type="button" className="muse-quick-add-main" disabled={disabled||busy} aria-label={`Add ${label} to To Be Read`} title="Want to read it: add to your To Be Read shelf" onClick={choose('planned')}>{busy&&last==='planned'?spinner:<MuseIcon name="bookmark" size={16}/>}<span>{size==='sm'?'TBR':'To Be Read'}</span></button>
  <button type="button" className="muse-quick-add-reading" disabled={disabled||busy} aria-label={`Add ${label} to Currently Reading`} title="Start it now: add to Currently Reading" onClick={choose('reading')}>{busy&&last==='reading'?spinner:<MuseIcon name="book" size={16}/>}<span>{size==='sm'?'Reading':'Reading now'}</span></button>
  <button type="button" className="muse-quick-add-read" disabled={disabled||busy} aria-label={`Add ${label} as already read`} title="Already read it: add with its dates, rating and review" onClick={choose('finished')}>{busy&&last==='finished'?spinner:<MuseIcon name="check" size={16}/>}<span>Read</span></button>
 </span>;
}
