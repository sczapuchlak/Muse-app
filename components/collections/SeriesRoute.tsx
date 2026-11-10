'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {MuseIcon} from '@/components/MuseIcon';
import {MuseModal} from '@/components/MuseModal';
import {GlassPopover} from '@/components/GlassPopover';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {deleteSeries,saveSeriesMember} from '@/lib/collections/persistence';
import type {Series,SeriesMember} from '@/lib/collections/models';
import type {SeriesCatalog} from '@/lib/books/series-discovery';
import {fetchSeriesCatalog} from '@/lib/books/add-book';
import {catalogNeedsRefresh,saveDiscoveredSeries} from '@/lib/books/series-save';
import {catalogSeriesView,primaryBasisNote,seriesCompletion,seriesShelf,shelfStateLabel,type ShelfEntry} from '@/lib/books/series-view';
import {bookHref,currentReturn,goBack,parseSeriesKey,rememberReturn} from '@/lib/books/return-nav';
import {todayForReading} from '@/lib/whimsy/books';
import {validTimeZone} from '@/lib/dates';
import {useWhimsyData} from '@/components/whimsy/WhimsyData';
import {QuickAddButton,QuickAddToast,useQuickAdd} from '@/components/whimsy/QuickAdd';
import {collectionsChanged,useCollectionsData} from './CollectionsData';
import {SeriesCover} from './SeriesCover';
import {BookSpines,BookSpinesSkeleton,type SpineEntry} from './BookSpines';
import {ShelfDecor} from './ShelfTrinkets';
import {SeriesLibrary} from './SeriesLibrary';
import '@/components/whimsy/BookPage.css';
import './SeriesPage.css';

const longDate=(iso:string)=>{const d=new Date(`${iso}T12:00:00Z`);return Number.isNaN(d.getTime())?iso:d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});};

/**
 * A book series in Collections (#136). A catalog series is shown as found, without saving anything; it is
 * saved the first time the reader adds or stars one of its books. Saved series keep every correction.
 */
export function SeriesRoute({seriesKey}:{seriesKey:string}){
 const router=useRouter();
 const parsed=useMemo(()=>parseSeriesKey(seriesKey),[seriesKey]);
 const {records,userId,loaded,error:loadError,retry}=useCollectionsData(),{records:whimsy,status:whimsyStatus,timeZone}=useWhimsyData();
 const books=useMemo(()=>(whimsy?.books??[]).filter(b=>!b.archivedAt),[whimsy]);
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const today=validTimeZone(timeZone)?todayForReading(timeZone):new Date().toISOString().slice(0,10);
 const [catalog,setCatalog]=useState<SeriesCatalog|null>(null),[state,setState]=useState<'loading'|'ready'|'missing'|'error'>('loading'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[problem,setProblem]=useState('');
 const [back,setBack]=useState<{href:string;label:string}|null>(null),[menuOpen,setMenuOpen]=useState(false),[correcting,setCorrecting]=useState(false),[nonce,setNonce]=useState(0);
 const menuAnchor=useRef<HTMLButtonElement>(null);
 const quick=useQuickAdd();
 const [mountedAt]=useState(()=>Date.now());
 const [layout,setLayoutState]=useState<'list'|'grid'>('list');
 useEffect(()=>{const frame=requestAnimationFrame(()=>{try{const v=localStorage.getItem('muse.series.layout');if(v==='grid'||v==='list')setLayoutState(v);}catch{/* list by default */}});return()=>cancelAnimationFrame(frame);},[]);
 const setLayout=(v:'list'|'grid')=>{setLayoutState(v);try{localStorage.setItem('muse.series.layout',v);}catch{/* this visit only */}};
 useEffect(()=>{const frame=requestAnimationFrame(()=>setBack(currentReturn()));return()=>cancelAnimationFrame(frame);},[seriesKey]);

 // The saved series for this route: by id, or the saved copy of the catalog series it names.
 const saved:Series|null='savedId' in parsed?records.series.find(s=>s.id===parsed.savedId)??null:records.series.find(s=>s.catalog_source===parsed.source&&s.catalog_id===parsed.id)??null;
 const source='savedId' in parsed?saved?.catalog_source??null:parsed.source,catalogId='savedId' in parsed?saved?.catalog_id??null:parsed.id;
 const stale=!!saved&&catalogNeedsRefresh(saved,records.seriesMembers.filter(m=>m.series_id===saved.id),mountedAt);
 useEffect(()=>{
  if(!loaded)return;
  if('savedId' in parsed&&!saved){const frame=requestAnimationFrame(()=>setState('missing'));return()=>cancelAnimationFrame(frame);}
  if(saved&&!stale){const frame=requestAnimationFrame(()=>setState('ready'));return()=>cancelAnimationFrame(frame);}
  if(!source||!catalogId){const frame=requestAnimationFrame(()=>setState(saved?'ready':'missing'));return()=>cancelAnimationFrame(frame);}
  const controller=new AbortController();
  (async()=>{
   if(!saved)setState('loading');
   try{
    const found=await fetchSeriesCatalog(source,catalogId,saved?.title??'',false,controller.signal);
    if(controller.signal.aborted)return;
    if(!found){setState(saved?'ready':'missing');return;}
    setCatalog(found);
    // A saved series from before catalog artwork quietly gains covers, years and lengths; corrections stay.
    if(saved&&stale){await saveDiscoveredSeries(client,userId,found,records,books,saved).then(()=>{collectionsChanged();return retry();}).catch(()=>{});}
    setState('ready');
   }catch{if(!controller.signal.aborted)setState(saved?'ready':'error');}
  })();
  return()=>controller.abort();
 // Records change after a save; the fetch belongs to the route and its retry nonce.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[loaded,seriesKey,saved?.id,stale,nonce]);

 // Saved, current series: the catalog is still read quietly for each installment's short synopsis.
 useEffect(()=>{
  if(!loaded||!saved||stale||catalog||!source||!catalogId)return;
  const controller=new AbortController();
  fetchSeriesCatalog(source,catalogId,saved.title,false,controller.signal).then(found=>{if(!controller.signal.aborted&&found)setCatalog(found);}).catch(()=>{});
  return()=>controller.abort();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[loaded,saved?.id,stale,source,catalogId]);
 const synopses=useMemo(()=>new Map((catalog?.members??[]).filter(m=>m.description).map(m=>[`${m.source}:${m.id}`,m.description!])),[catalog]);
 const view=useMemo(()=>saved?{series:saved,members:records.seriesMembers.filter(m=>m.series_id===saved.id)}:catalog?catalogSeriesView(catalog,books,userId):null,[saved,records.seriesMembers,catalog,books,userId]);
 const shelf=view?seriesShelf(view.series,view.members,books,today):null;

 function leave(){goBack(router,'/collections?kind=book');}
 function openBook(id:string){const href=bookHref(id);rememberReturn(href,view?.series.title??'series');router.push(href);}
 /** Saves the catalog series (the first add or star) and returns the saved row for one installment. */
 async function savedMember(entry:ShelfEntry):Promise<SeriesMember|null>{
  if(saved)return records.seriesMembers.find(m=>m.id===entry.member.id)??null;
  if(!catalog)return null;
  const series=await saveDiscoveredSeries(client,userId,catalog,records,books);
  const {data,error}=await client.from('collection_series_members').select('*').eq('user_id',userId).eq('series_id',series.id).eq('catalog_source',entry.member.catalog_source??'').eq('catalog_id',entry.member.catalog_id??'').maybeSingle();
  collectionsChanged();await retry();
  if(error)throw error;return data;
 }
 async function add(entry:ShelfEntry,status:'planned'|'reading'){
  setProblem('');
  try{
   const member=await savedMember(entry);
   await quick.start({candidate:null,title:entry.title,author:entry.author,status,member,...(entry.member.catalog_source==='hardcover'&&entry.member.catalog_id?{hardcoverBookId:entry.member.catalog_id}:{}),catalog:{coverUrl:entry.coverUrl,pages:entry.pages}},entry.key);
  }catch(cause){setProblem(cause instanceof Error?cause.message:'This book could not be added. Nothing was changed.');}
 }
 async function star(entry:ShelfEntry){
  if(busy)return;setBusy(true);setProblem('');
  try{const member=await savedMember(entry);if(!member)throw Error('This installment could not be saved.');await saveSeriesMember(client,{...member,starred:!member.starred},member.revision);collectionsChanged();await retry();setNotice(member.starred?'Star removed.':'Starred for later.');}
  catch(cause){setProblem(cause instanceof Error?cause.message:'Could not save this star.');}finally{setBusy(false);}
 }
 async function refresh(){
  if(!saved||busy||!saved.catalog_source||!saved.catalog_id)return;setBusy(true);setProblem('');
  try{const found=await fetchSeriesCatalog(saved.catalog_source,saved.catalog_id,saved.title,true);if(!found)throw Error('No updated catalog was found. Your saved series is unchanged.');setCatalog(found);await saveDiscoveredSeries(client,userId,found,records,books,saved);collectionsChanged();await retry();setNotice('Series refreshed. Your corrections were kept.');}
  catch(cause){setProblem(cause instanceof Error?cause.message:'Series refresh failed.');}finally{setBusy(false);}
 }
 async function remove(){
  if(!saved||!window.confirm(`Remove ${saved.title} from your series? Its books stay in your Library.`))return;setBusy(true);
  try{await deleteSeries(client,userId,saved.id,saved.revision);collectionsChanged();await retry();leave();}catch(cause){setProblem(cause instanceof Error?cause.message:'Series could not be removed.');}finally{setBusy(false);}
 }

 const crumbs=<nav className="muse-book-page-crumbs muse-series-page-crumbs" aria-label="Series navigation">
  <button type="button" className="muse-book-page-back" onClick={leave}><MuseIcon name="arrow" size={16}/><span>{back?`Back to ${back.label}`:'Books'}</span></button>
  <ol className="muse-book-page-trail"><li><Link href="/collections">Collections</Link></li><li><Link href="/collections?kind=book">Books</Link></li></ol>
 </nav>;
 if(!loaded||!whimsyStatus.loaded||state==='loading')return <main className="muse-page muse-series-route" aria-busy="true">{crumbs}<SeriesSkeleton/>{loadError&&<p role="alert">{loadError}</p>}</main>;
 if(state==='missing'||state==='error'||!view||!shelf)return <main className="muse-page muse-series-route">{crumbs}<div className="muse-empty-state muse-series-page-empty" data-variant="editorial"><h1 className="type-display">{state==='error'?'This series is resting for a moment.':'We couldn’t find this series.'}</h1><p>{state==='error'?'The series catalog didn’t answer. Your Library and saved series are unchanged.':'It may have been removed, or the catalog no longer lists it.'}</p><div className="muse-books-actions">{state==='error'&&<button type="button" className="muse-button button-primary" onClick={()=>setNonce(n=>n+1)}>Try again</button>}<button type="button" className="muse-button button-ghost" onClick={leave}>{back?`Back to ${back.label}`:'Back to Books'}</button></div></div></main>;

 const {series}=view,description=series.description?.trim()??'';
 const statusChip=series.catalog_completed===true||series.conclusion_state==='concluded'?{label:'All books published',tone:'done'}:shelf.upcomingCount?{label:shelf.nextRelease?.releaseDate?`Next: ${longDate(shelf.nextRelease.releaseDate)}`:'More to come',tone:'upcoming'}:series.conclusion_state==='ongoing'||series.catalog_completed===false?{label:'Ongoing',tone:'upcoming'}:null;
 const synopsisFor=(entry:ShelfEntry)=>entry.book?.description?.trim()||synopses.get(`${entry.member.catalog_source}:${entry.member.catalog_id}`)||'';
 /** Ownership and reading are separate facts: on your shelf or not; read, reading, paused, not started, or wished for. */
 const signals=(entry:ShelfEntry)=>{
  const owned=!!entry.book;
  const reading=entry.state==='upcoming'?{tone:'upcoming',label:entry.releaseDate?`Coming ${longDate(entry.releaseDate)}`:'Upcoming'}:entry.state==='read'?{tone:'read',label:'Finished'}:entry.state==='reading'?{tone:'reading',label:'Reading now'}:entry.state==='paused'?{tone:'paused',label:'Paused'}:entry.state==='planned'?{tone:'wish',label:'Want to read'}:entry.starred?{tone:'wish',label:'Want to read'}:owned?{tone:'quiet',label:'Not started'}:null;
  return <span className="muse-series-signals"><span className="muse-series-own" data-owned={owned||undefined}>{owned?<><MuseIcon name="check" size={11}/>On your shelf</>:'Not on your shelf'}</span>{reading&&<span className="muse-series-status" data-tone={reading.tone}>{reading.tone==='read'&&<MuseIcon name="check" size={11}/>}{reading.tone==='wish'&&!owned&&<MuseIcon name="favorite" size={11}/>}{reading.label}</span>}</span>;
 };
 const actions=(entry:ShelfEntry)=>entry.book?<button type="button" className="muse-icon-button" aria-label={`Open ${entry.title}`} onClick={()=>openBook(entry.book!.id)}><MuseIcon name="arrow" size={16}/></button>:<>
  <button type="button" className="muse-icon-button muse-series-page-star" aria-pressed={entry.starred} aria-label={entry.starred?`Remove ${entry.title} from Want to read`:`Want to read ${entry.title}`} title={entry.starred?'On your wishlist':'Add to your wishlist'} disabled={busy} onClick={()=>void star(entry)}><MuseIcon name="favorite" size={17}/></button>
  {entry.state!=='upcoming'&&<QuickAddButton label={entry.title} busy={quick.pending===entry.key} disabled={!!quick.pending&&quick.pending!==entry.key} onAdd={status=>void add(entry,status)}/>}
 </>;
 const meta=(entry:ShelfEntry)=>[entry.year,entry.pages?`${entry.pages} pages`:null,entry.author&&entry.author!==shelf.authors?entry.author:null].filter(Boolean).join(' · ');
 const row=(entry:ShelfEntry)=>{const owned=!!entry.book,synopsis=synopsisFor(entry);return <li key={entry.key} id={`installment-${entry.member.id}`} className="muse-series-page-row" data-state={entry.state} data-owned={owned||undefined}>
  <span className="muse-series-page-pos type-numeric">{entry.positionLabel||'·'}</span>
  <button type="button" className="muse-series-page-row-main" disabled={!owned} onClick={()=>entry.book&&openBook(entry.book.id)} aria-label={owned?`Open ${entry.title}`:undefined}>
   <SeriesCover title={entry.title} coverUrl={entry.coverUrl} color={entry.coverColor} ghost={!owned} size="sm"/>
   <span className="muse-series-page-row-copy"><strong className="type-title">{entry.title}</strong>{meta(entry)&&<span className="muse-series-page-row-meta">{meta(entry)}</span>}{signals(entry)}</span>
  </button>
  {synopsis?<p className="muse-series-page-synopsis">{synopsis}</p>:<span className="muse-series-page-synopsis" aria-hidden="true"/>}
  <span className="muse-series-page-row-actions">{actions(entry)}</span>
 </li>;};
 const card=(entry:ShelfEntry)=>{const owned=!!entry.book,facts=[entry.year,entry.pages?`${entry.pages} pp`:null].filter(Boolean).join(' · ');return <li key={entry.key} id={`installment-${entry.member.id}`} className="muse-series-card" data-state={entry.state} data-owned={owned||undefined}>
  <div className="muse-series-card-art">
   <button type="button" className="muse-series-card-cover" disabled={!owned} onClick={()=>entry.book&&openBook(entry.book.id)} aria-label={owned?`Open ${entry.title}`:entry.title}>
    <SeriesCover title={entry.title} coverUrl={entry.coverUrl} color={entry.coverColor} ghost={!owned} size="md"/>
    {entry.positionLabel&&<span className="muse-book-series-badge-pos">{entry.positionLabel}</span>}
    {entry.state==='read'&&<span className="muse-book-series-mark" data-mark="read" aria-hidden="true"><MuseIcon name="check" size={12}/></span>}
   </button>
   {!owned&&<button type="button" className="muse-series-card-wish" aria-pressed={entry.starred} aria-label={entry.starred?`Remove ${entry.title} from Want to read`:`Want to read ${entry.title}`} title={entry.starred?'On your wishlist':'Add to your wishlist'} disabled={busy} onClick={()=>void star(entry)}><MuseIcon name="favorite" size={14}/></button>}
  </div>
  <div className="muse-series-card-copy"><strong className="type-title">{entry.title}</strong>{facts&&<span className="muse-series-card-facts">{facts}</span>}{signals(entry)}</div>
  {!owned&&entry.state!=='upcoming'&&<div className="muse-series-card-actions"><QuickAddButton size="sm" label={entry.title} busy={quick.pending===entry.key} disabled={!!quick.pending&&quick.pending!==entry.key} onAdd={status=>void add(entry,status)}/></div>}
 </li>;};
 const list=(entries:ShelfEntry[])=>layout==='grid'?<ol className="muse-series-grid">{entries.map(card)}</ol>:<ol className="muse-series-page-rows">{entries.map(row)}</ol>;
 const spines=shelf.primary,basisNote=primaryBasisNote(shelf);
 const spineEntries:SpineEntry[]=spines.map(e=>({key:e.key,title:e.title,positionLabel:e.positionLabel,coverUrl:e.coverUrl,coverColor:e.coverColor,owned:!!e.book,state:e.state}));
 const shelfGenres=[...new Set(spines.flatMap(e=>(e.book?.genre??'').split(',').map(g=>g.trim()).filter(Boolean)))];
 const core=seriesCompletion(shelf);
 const layoutToggle=<div className="muse-segmented muse-series-layout" role="group" aria-label="Show books as"><button type="button" aria-pressed={layout==='list'} onClick={()=>setLayout('list')}>List</button><button type="button" aria-pressed={layout==='grid'} onClick={()=>setLayout('grid')}>Grid</button></div>;

 return <main className="muse-page muse-series-route">
  {crumbs}
  <header className="muse-series-page-identity muse-series-page-head">
   <h1 className="type-title">{series.title}</h1>
   <p className="muse-book-page-author">{shelf.authors?<>by <strong>{shelf.authors}</strong></>:null}{shelf.firstYear?<span className="muse-series-page-since">{shelf.authors?' · ':''}since {shelf.firstYear}</span>:null}</p>
    <div className="muse-series-page-chips"><span className="muse-book-chip" data-tone="accent"><MuseIcon name="series" size={13}/>{shelf.primaryCount} primary {shelf.primaryCount===1?'book':'books'}</span>{shelf.additional.length>0&&<span className="muse-book-chip">+{shelf.additional.length} additional {shelf.additional.length===1?'work':'works'}</span>}{statusChip&&<span className="muse-book-chip" data-tone={statusChip.tone}>{statusChip.label}</span>}{!saved&&<span className="muse-book-chip" data-tone="quiet">From the catalog</span>}</div>
   {description&&<SeriesDescription text={description}/>}
  </header>
  <div className="muse-series-top">
  <div className="muse-series-shelf" role="img" style={{'--count':spines.length} as CSSProperties} aria-label={`${series.title}: ${spines.filter(e=>e.book).length} of ${spines.length} primary books on your shelf`}>
   <span className="muse-series-shelf-glow" aria-hidden="true"/>
   <ShelfDecor genres={shelfGenres} count={spines.length}/>
   <BookSpines entries={spineEntries} nextKey={shelf.next?.key}/>
   <span className="muse-series-shelf-plank" aria-hidden="true"/>
  </div>
   <aside className="muse-card muse-series-page-progress" aria-label="Your progress" data-complete={core.complete||undefined}>
    <div className="muse-series-progress-head"><span className="small-label">Primary series</span>{core.badge&&<span className="muse-series-core-badge" data-tone={core.all?'all':core.complete?'core':'caught-up'}><MuseIcon name="check" size={13}/>{core.badge}</span>}</div>
    <div className="muse-series-page-count"><strong className="type-numeric">{shelf.readCount}</strong><span>of {shelf.primaryCount} read</span><em className="type-numeric">{shelf.percent}%</em></div>
    <div className="muse-book-series-meter" data-complete={core.complete||undefined} role="meter" aria-label={`Primary series progress: ${shelf.readCount} of ${shelf.primaryCount} read`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={shelf.percent}><span style={{width:`${shelf.percent}%`}}/></div>
    <p className="muse-series-page-owned">{core.complete?`You’ve finished all ${shelf.primaryCount} primary ${shelf.primaryCount===1?'book':'books'}.`:core.caughtUp?`Every released primary book is read · ${shelf.primaryUpcoming} still to come.`:<>{shelf.primary.filter(e=>e.book).length} on your shelf{shelf.readingCount?` · ${shelf.readingCount} reading now`:''}{shelf.primaryUpcoming?` · ${shelf.primaryUpcoming} still to come`:''}</>}</p>
    {basisNote&&<p className="muse-series-page-basis" role="note">{basisNote}</p>}
    {shelf.additional.length>0&&<div className="muse-series-progress-extra"><div><strong>Additional works</strong><small>{shelf.additionalReadCount} of {shelf.additional.length} read · prequels, novellas and companions</small></div><div className="muse-series-progress-mini"><div className="muse-book-series-meter" data-tone="optional" role="meter" aria-label={`Additional works: ${shelf.additionalReadCount} of ${shelf.additional.length} read`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shelf.additionalReadCount/shelf.additional.length*100)}><span style={{width:`${Math.round(shelf.additionalReadCount/shelf.additional.length*100)}%`}}/></div><small>Optional</small></div></div>}
    {shelf.collections.length>0&&<div className="muse-series-progress-extra"><div><strong>Collections &amp; box sets</strong><small>Bundles and collected editions</small></div><span className="muse-book-chip">Not counted</span></div>}
    {!core.complete&&!core.caughtUp&&shelf.next?<div className="muse-series-page-next"><span className="small-label">Next in order</span><div><SeriesCover title={shelf.next.title} coverUrl={shelf.next.coverUrl} color={shelf.next.coverColor} ghost={!shelf.next.book} size="sm"/><span><strong className="type-title">{shelf.next.title}</strong><small>{shelf.next.book?shelfStateLabel[shelf.next.state]:'Not on your shelf yet'}</small></span></div>{shelf.next.book?<button type="button" className="muse-button button-primary" onClick={()=>openBook(shelf.next!.book!.id)}>Open book</button>:<button type="button" className="muse-button button-primary" disabled={!!quick.pending} onClick={()=>void add(shelf.next!,'planned')}>{quick.pending===shelf.next.key?'Adding…':'Add to Want to Read'}</button>}</div>:null}
   </aside>
  </div>
  {(notice||problem||quick.error)&&<p className="muse-series-page-message" role={problem||quick.error?'alert':'status'} data-tone={problem||quick.error?'error':undefined}>{problem||quick.error||notice}</p>}
  <section className="muse-card muse-series-page-order" data-layout={layout} aria-labelledby="series-order-heading">
   <header className="muse-series-page-order-head"><div><h2 id="series-order-heading" className="muse-book-page-section-title">Primary series <span className="muse-series-page-section-count type-numeric">{shelf.primaryCount}</span></h2><p>The main books in reading order. Series progress follows these.</p></div>
    <div className="muse-series-page-tools">{layoutToggle}{saved&&<><button ref={menuAnchor} type="button" className="muse-button button-ghost" aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>Manage <MuseIcon name="chevron" size={14}/></button>
    <GlassPopover id="series-manage" label="Manage series" open={menuOpen} anchorRef={menuAnchor} onClose={()=>setMenuOpen(false)} width={250} bare><div className="popover-choice-list">
     {saved.catalog_source&&<button type="button" className="popover-choice" disabled={busy} onClick={()=>{setMenuOpen(false);void refresh();}}><span><MuseIcon name="undo" size={14}/> Refresh from catalog</span></button>}
     <button type="button" className="popover-choice" onClick={()=>{setMenuOpen(false);setCorrecting(true);}}><span><MuseIcon name="edit" size={14}/> Correct installments</span></button>
     <button type="button" className="popover-choice" disabled={busy} onClick={()=>{setMenuOpen(false);void remove();}}><span><MuseIcon name="trash" size={14}/> Remove series</span></button>
    </div></GlassPopover></>}</div>
   </header>
   {shelf.primary.length?list(shelf.primary):<p className="muse-series-page-empty-note">No primary books are listed for this series yet.</p>}
  </section>
  {shelf.additional.length>0&&<section className="muse-card muse-series-page-order muse-series-page-additional" data-layout={layout} aria-labelledby="series-additional-heading">
   <header className="muse-series-page-order-head"><div><h2 id="series-additional-heading" className="muse-book-page-section-title">Additional works <span className="muse-series-page-section-count type-numeric">{shelf.additional.length}</span></h2><p>Prequels, novellas and companion stories, at their place in the order. Tracked on their own; they don’t change series progress.</p></div><span className="muse-book-chip">{shelf.additionalReadCount} of {shelf.additional.length} read</span></header>
   {list(shelf.additional)}
  </section>}
  {shelf.collections.length>0&&<section className="muse-card muse-series-page-order muse-series-page-bundles" data-layout={layout} aria-label="Collections and box sets"><details className="muse-series-page-collections"><summary><span className="muse-book-page-section-title">Collections &amp; box sets</span> <span className="muse-series-page-section-count type-numeric">{shelf.collections.length}</span><small>Bundles and collected editions. Never counted toward progress.</small></summary>{list(shelf.collections)}</details></section>}
  <section className="muse-series-page-footnote">
   <p className="small-label muse-series-page-source">{series.catalog_source?`Series details from ${series.catalog_source==='hardcover'?'Hardcover':series.catalog_source==='wikidata'?'Wikidata':'Open Library'}${series.catalog_refreshed_at?` · refreshed ${longDate(series.catalog_refreshed_at.slice(0,10))}`:''}. Counts follow the catalog and may change as books are announced.`:'A series you put together. Everything here follows your own order.'}</p>
  </section>
  {correcting&&saved&&<MuseModal id="series-corrections" label="Correct installments" title="Correct installments" returnFocus={null} onClose={()=>setCorrecting(false)} size="tall"><SeriesLibrary key={saved.id} initialSeriesId={saved.id} embedded onBack={()=>setCorrecting(false)} backLabel="Done"/></MuseModal>}
  {quick.sheet}<QuickAddToast toast={quick.toast} spark={quick.spark} onDismiss={quick.dismissToast} onOpen={book=>{quick.dismissToast();openBook(book.id);}}/>
 </main>;
}
/** The first two sentences, with the rest a tap away. */
function leadSentences(text:string,count=2){
 const clean=text.replace(/\s+/g,' ').trim(),parts=clean.match(/[^.!?]+[.!?]+(?:["”’)]*)(?:\s|$)/g);
 if(!parts||parts.length<=count)return {lead:clean,more:false};
 return {lead:parts.slice(0,count).join('').trim(),more:true};
}
function SeriesDescription({text}:{text:string}){
 const [open,setOpen]=useState(false),{lead,more}=leadSentences(text);
 return <div className="muse-series-page-description"><p className="type-reading">{open||!more?text:lead}</p>{more&&<button type="button" className="text-button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Show less':'Read more'}</button>}</div>;
}
function SeriesSkeleton(){
 return <div className="muse-series-page-skeleton" aria-label="Opening series"><div className="muse-series-shelf"><span className="muse-series-shelf-glow" aria-hidden="true"/><BookSpinesSkeleton/><span className="muse-series-shelf-plank"/></div><div className="muse-skeleton-lines"><span/><span/><span/></div></div>;
}
