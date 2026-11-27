'use client';
import {memo,type CSSProperties,useCallback,useDeferredValue,useEffect,useMemo,useRef,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {AddToPlanModal} from '@/components/whimsy/plans/AddToPlanModal';
import {BOOK_STATUS_LABEL,BOOK_STATUS_ORDER} from '@/lib/books/status';
import {StatusDot} from '@/components/books/StatusDot';
import {BooksNav} from '@/components/books/BooksNav';
import {MusePageHeader} from '@/components/MusePageHeader';
import {MuseModal} from '@/components/MuseModal';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseOptionalDatePicker} from '@/components/MuseDatePicker';
import {MuseIcon} from '@/components/MuseIcon';
import {MuseIconButton} from '@/components/MuseIconButton';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {todayInTimeZone,validTimeZone} from '@/lib/dates';
import {bookPosition} from '@/lib/whimsy/books';
import type {Book} from '@/lib/whimsy/models';
import {BookCover,Bookshelf} from '@/components/whimsy/Bookshelf';
import {useWhimsyData} from '@/components/whimsy/WhimsyData';
import {CoverGlow} from '@/components/whimsy/BookAtmosphere';
import {canonicalItems,mediaStatusLabels,seriesProgress,type CanonicalItem,type MediaKind} from '@/lib/collections/models';
import {browseLibrary,collectionSortIds} from '@/lib/collections/library-browse';
import {pageItems,type PageSize} from '@/lib/collections/pagination';
import {usePagination} from './usePagination';
import {PaginationControls} from './PaginationControls';
import {collectionSorts,defaultCollectionsPreferences,readCollectionsPreferences,saveCollectionsPreferences,type CollectionSort,type CollectionsPreferences,type LibraryDensity} from '@/lib/collections/preferences';
import {MediaCover,MediaLibrary} from './MediaLibrary';
import {ActiveMediaCarousel} from './ActiveMediaCarousel';
import {SeriesCover} from './SeriesCover';
import {useSeriesSearch} from './SeriesSearchResults';
import {bookHref,catalogSeriesKey,rememberReturn,seriesHref} from '@/lib/books/return-nav';
import {SeriesLibrary} from './SeriesLibrary';
import {CuratedLibrary} from './CuratedLibrary';
import {useCollectionsData} from './CollectionsData';
import './Collections.css';
import {MuseSearch} from '@/components/design/MuseSearch';
import {RatingStars} from './StarRating';
import {GridGlyph,ListGlyph} from '@/components/design/ViewIcons';
import type {ReadingSession} from '@/lib/whimsy/models';
import './Library.css';
import {BooksSettings} from '@/components/books/BooksSettings';
import {bookshelfWidgetExtras,saveWhimsyRecord} from '@/lib/whimsy/persistence';

type View='overview'|'books'|'movies'|'tv'|'games'|'music'|'series'|'my-collections';
type Mode='board'|'library';
const views:View[]=['overview','books','movies','tv','games','music','series','my-collections'];
const kindChoices:[CollectionsPreferences['kind'],string][]=[['all','All'],['book','Books'],['movie','Movies'],['tv','TV Shows'],['game','Games'],['album','Music']];
const statusLabels:Record<string,string>={...BOOK_STATUS_LABEL,watching:'Watching',watched:'Watched','caught-up':'Caught Up',completed:'Completed',backlog:'Backlog',playing:'Currently Playing',listening:'On Repeat',listened:'Listened'};
const mediaView:Record<MediaKind,View>={movie:'movies',tv:'tv',game:'games',album:'music'};
const isKind=(value:string|null):value is CollectionsPreferences['kind']=>kindChoices.some(([id])=>id===value);
/** Books is the only visible media type for now; the other media and My Collections keep their data and routes, just not their doors. */
const emptyCopy:Record<Exclude<CollectionsPreferences['kind'],'all'>,[string,string,string,View]>={book:['Your shelves are ready for a first story.','Add a book to begin your library.','Add Book','books'],movie:['There are no movies in your collection.','Add a movie to begin your library.','Add Movie','movies'],tv:['There are no TV shows in your collection.','Add a show to begin your library.','Add TV Show','tv'],album:['There are no albums in your collection.','Add an album to begin your library.','Add Album','music'],game:['There are no games in your collection.','Add a game to begin your library.','Add Game','games']};

type SeriesChip={id:string;title:string;sequence:number|null};
const NO_BOOKS:Book[]=[];
const NO_SESSIONS:ReadingSession[]=[];
const densityChoices:[LibraryDensity,string,LibraryDensity][]=[['compact','Compact','compact'],['comfortable','Comfortable','comfortable'],['showcase','Showcase','showcase'],['list','List','list']];
const LIBRARY_SCROLL_KEY='muse.library.scroll';
const kindLabel:Record<CanonicalItem['kind'],string>={book:'Book',tv:'TV Show',movie:'Movie',album:'Album',game:'Game'};
const statusTone=(s:string)=>(['reading','watching','listening','playing'].includes(s)?'active':['finished','watched','listened','completed','caught-up','played'].includes(s)?'done':['paused','on-hold'].includes(s)?'paused':s==='dnf'?'dnf':'planned');
const statusIcon=(s:string):'eye'|'bookmark'|'check'|'pause'|'minus'=>{const t=statusTone(s);return t==='active'?'eye':t==='done'?'check':t==='paused'?'pause':t==='dnf'?'minus':'bookmark';};
/**
 * Library V2 (Nov 26): a cover-first tile. The cover is the card: no filled box around it, a small status badge in its
 * corner (icon + label for screen readers), a favourite mark, then the title and author beneath.
 */
const LibraryTile=memo(function LibraryTile({item,onOpen,selected}:{item:CanonicalItem;onOpen:(item:CanonicalItem)=>void;selected?:boolean}){
 const status=item.kind==='book'?statusLabels[item.status]??item.status:mediaStatusLabels[item.kind][item.status]??item.status;
 return <button type="button" className="muse-lib-item muse-lib-tile" data-glow={item.book?.coverUrl?true:undefined} data-kind={item.kind} data-tone={statusTone(item.status)} data-selected={selected||undefined} aria-pressed={selected===undefined?undefined:selected} title={item.creator?`${item.title} — ${item.creator}`:item.title} onClick={()=>onOpen(item)}>
  <CoverGlow url={item.book?.coverUrl}/><span className="muse-lib-cover">{item.book?<BookCover book={item.book}/>:<MediaCover item={item.media!}/>}
   <span className="muse-lib-badge" data-tone={statusTone(item.status)} role="img" aria-label={`${kindLabel[item.kind]} · ${status}`} title={status}><MuseIcon name={statusIcon(item.status)} size={12}/></span>
   {item.favorite&&<span className="muse-lib-fav" role="img" aria-label="Favorite" title="Favorite"><MuseIcon name="favorite" size={11}/></span>}
   {selected!==undefined&&<span className="muse-lib-check" aria-hidden="true">{selected&&<MuseIcon name="check" size={13}/>}</span>}
  </span>
  <span className="muse-lib-text"><strong className="muse-card-title">{shortTitle(item.title)}{shortTitle(item.title)!==item.title&&<span className="sr-only">{item.title.slice(shortTitle(item.title).length)}</span>}</strong>
  <span className="muse-card-creator">{item.creator}</span></span>
 </button>;
});
/** The gallery shows "City of Bones", not "City of Bones (The Mortal Instruments, #1)"; the full title stays in the tooltip and for screen readers. */
const shortTitle=(t:string)=>t.replace(/\s*\([^()]*#\s*[\d.]+[^()]*\)\s*$/,'')||t;
const shortDate=(d:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${d.slice(0,10)}T12:00:00Z`));
/** Library V2 list view: one row per book with its real status, the reader's own rating, recorded progress and a date. */
const LibraryRow=memo(function LibraryRow({item,sessions,onOpen,selected}:{item:CanonicalItem;sessions:readonly ReadingSession[];onOpen:(item:CanonicalItem)=>void;selected?:boolean}){
 const book=item.book,status=item.kind==='book'?statusLabels[item.status]??item.status:mediaStatusLabels[item.kind][item.status]??item.status,tone=statusTone(item.status);
 const position=book&&book.status==='reading'?bookPosition(book,[...sessions]):null,percent=book?.totalPages&&position!==null?Math.min(100,Math.round(100*position/book.totalPages)):null;
 const finishedOn=book?.completions?.at(-1)?.finishedOn??book?.finishedOn,date=tone==='done'&&finishedOn?['Finished',finishedOn]:tone==='active'&&book?.startedOn?['Started',book.startedOn]:['Added',item.createdAt];
 return <button type="button" className="muse-lib-item muse-lib-row" data-kind={item.kind} data-tone={tone} data-selected={selected||undefined} aria-pressed={selected===undefined?undefined:selected} onClick={()=>onOpen(item)}>
  <span className="muse-lib-row-book"><span className="muse-lib-thumb">{book?<BookCover book={book}/>:<MediaCover item={item.media!}/>}{selected!==undefined&&<span className="muse-lib-check" aria-hidden="true">{selected&&<MuseIcon name="check" size={12}/>}</span>}</span>
   <span className="muse-lib-row-text"><strong className="muse-card-title">{item.title}</strong><span className="muse-card-creator">{item.creator}</span></span></span>
  <span className="muse-lib-row-status"><span className="muse-lib-pill" data-tone={tone}><MuseIcon name={statusIcon(item.status)} size={12}/>{status}</span>{item.favorite&&<span className="muse-lib-fav-inline" role="img" aria-label="Favorite"><MuseIcon name="favorite" size={12}/></span>}</span>
  <span className="muse-lib-row-rating">{item.rating?<><RatingStars value={item.rating}/><span className="type-numeric">{item.rating.toFixed(1)}</span></>:<span className="muse-lib-muted">Not rated</span>}</span>
  <span className="muse-lib-row-progress">{percent!==null?<><span className="muse-lib-meter" style={{'--fill':`${Math.max(percent,3)}%`} as CSSProperties}><i/></span><span className="type-numeric">{percent}% ({position}/{book!.totalPages})</span></>:tone==='done'?<span className="muse-lib-muted">Finished</span>:<span className="muse-lib-muted">—</span>}</span>
  <span className="muse-lib-row-date type-numeric" title={`${date[0]} ${shortDate(date[1])}`}><MuseIcon name="calendar" size={13}/><span className="sr-only">{date[0]} </span>{shortDate(date[1])}</span>
  <span className="muse-lib-row-go" aria-hidden="true"><MuseIcon name="chevron" size={15}/></span>
 </button>;
});

export function Collections(){
 const query=useSearchParams(),view=views.find(id=>id===query?.get('view'))??'overview',router=useRouter();
 const {records:whimsy,status,timeZone,retry:retryWhimsy}=useWhimsyData(),collection=useCollectionsData(),books=whimsy?.books??NO_BOOKS,items=useMemo(()=>canonicalItems(books.filter(book=>!book.archivedAt),collection.records.media),[books,collection.records.media]),today=todayInTimeZone(validTimeZone(timeZone)?timeZone:'UTC');
 const client=useMemo(()=>createMuseBrowserClient(),[]),[preferences,setPreferences]=useState(defaultCollectionsPreferences),[draftPreferences,setDraftPreferences]=useState(defaultCollectionsPreferences),[preferencesOpen,setPreferencesOpen]=useState(false),[preferenceBusy,setPreferenceBusy]=useState(false),[preferenceError,setPreferenceError]=useState('');
 const fromUrl=(key:string)=>query?.get(key)??'',urlSort=fromUrl('sort');
 const [search,setSearch]=useState(()=>fromUrl('q')),[kindFilter]=useState<CollectionsPreferences['kind']>('book'),[sort,setSortState]=useState<string>(()=>(collectionSortIds as readonly string[]).includes(urlSort)?urlSort:'recent'),[statusFilter,setStatusFilter]=useState(()=>fromUrl('status')),[genreFilter,setGenreFilter]=useState(()=>fromUrl('genre')),[ratingFilter,setRatingFilter]=useState(()=>fromUrl('rating')),[tagFilter,setTagFilter]=useState(()=>fromUrl('tag')),[seriesFilter,setSeriesFilter]=useState(()=>fromUrl('sf')),[favoriteOnly,setFavoriteOnly]=useState(()=>query?.get('fav')==='1'),[addedAfter,setAddedAfter]=useState(()=>fromUrl('added')),[completedAfter,setCompletedAfter]=useState(()=>fromUrl('done')),[,setAddOpen]=useState(false),[prefsReady,setPrefsReady]=useState(false),[widgetBusy,setWidgetBusy]=useState(false);
 const archivedItems=useMemo(()=>canonicalItems(books.filter(book=>book.archivedAt),[]),[books]);
 const searchTerm=search.trim(),seriesSearch=useSeriesSearch(view==='overview'&&(kindFilter==='all'||kindFilter==='book')?searchTerm:'');
 const savedSeriesMatches=searchTerm.length>=3&&(kindFilter==='all'||kindFilter==='book')?collection.records.series.filter(row=>row.kind==='book'&&row.title.toLowerCase().includes(searchTerm.toLowerCase())).slice(0,6):[];
 const catalogSeriesMatches=seriesSearch.results.filter(hit=>!collection.records.series.some(row=>row.catalog_source===hit.source&&row.catalog_id===hit.id)).slice(0,Math.max(0,6-savedSeriesMatches.length));
 /** Book and Series pages remember Collections as their return point. */
 function openPage(href:string){try{sessionStorage.setItem(LIBRARY_SCROLL_KEY,JSON.stringify({url:`${window.location.pathname}${window.location.search}`,y:window.scrollY}));}catch{/* optional */}rememberReturn(href,kindFilter==='book'?'Books':'Collections');router.push(href);}
 const seriesCovers=(seriesId:string)=>collection.records.seriesMembers.filter(m=>m.series_id===seriesId&&!m.hidden&&m.role!=='collection').sort((a,b)=>a.sequence-b.sequence).map(m=>({title:books.find(b=>b.id===m.book_id)?.title??m.catalog_title??'',cover:books.find(b=>b.id===m.book_id)?.coverUrl||m.catalog_cover_url||null,color:m.catalog_cover_color,owned:!!m.book_id})).slice(0,4);
 // Legacy Books links (#136): the old standalone Books view resolves into Collections and the new pages.
 useEffect(()=>{if(view!=='books')return;const book=query?.get('book'),section=query?.get('section'),add=query?.get('add');router.replace(book?bookHref(book):section==='atlas'?'/collections/reading-atlas':add==='1'?'/collections?kind=book&add=book':'/collections?kind=book');},[view,query,router]);
 useEffect(()=>{if(view!=='series'||!collection.loaded)return;const id=query?.get('series'),row=id?collection.records.series.find(s=>s.id===id):null;if(id&&row?.kind==='book')router.replace(seriesHref(id));},[view,query,router,collection.loaded,collection.records.series]);
 /** Any change to what the Library matches returns the list to page 1. */
 const visibleKey=JSON.stringify([search.trim(),sort,statusFilter,genreFilter,ratingFilter,tagFilter,seriesFilter,favoriteOnly,addedAfter,completedAfter,kindFilter]),deferredSearch=useDeferredValue(search);
 const addAnchor=useRef<HTMLButtonElement>(null);
 /** Select mode: tick books in the Library, then add them to a reading plan in one go. */
 const [selecting,setSelecting]=useState(false),[selectedIds,setSelectedIds]=useState<string[]>([]),[planOpen,setPlanOpen]=useState(false);
 const toggleSelect=useCallback((item:CanonicalItem)=>setSelectedIds(list=>list.includes(item.id)?list.filter(id=>id!==item.id):[...list,item.id]),[]);
 const stopSelecting=()=>{setSelecting(false);setSelectedIds([]);};
 const mode:Mode='library',tab:'dashboard'|'library'=query?.get('tab')==='library'?'library':'dashboard';
 /** The chosen sort is remembered on the account until changed; failing to save never blocks sorting. */
 /** Cover density is a saved account preference: compact by default so large libraries stay browsable. */
 /** Gallery remembers which cover size it had, so switching back from List returns to it. */
 const [lastGallery,setLastGallery]=useState<LibraryDensity>('compact');
 function setDensity(density:LibraryDensity){if(preferences.density!=='list')setLastGallery(preferences.density);if(density===preferences.density)return;const updated={...preferences,density};setPreferences(updated);setDraftPreferences(current=>({...current,density}));void saveCollectionsPreferences(client,collection.userId,updated).catch(()=>{});}
 function setSort(next:string){setSortState(next);if(!collectionSorts.includes(next as CollectionSort)||next===preferences.sort)return;const updated={...preferences,sort:next as CollectionSort};setPreferences(updated);setDraftPreferences(current=>({...current,sort:next as CollectionSort}));void saveCollectionsPreferences(client,collection.userId,updated).catch(()=>{});}
 useEffect(()=>{let active=true;readCollectionsPreferences(client,collection.userId).then(saved=>{if(!active)return;setPreferences(saved);setDraftPreferences(saved);const url=new URLSearchParams(window.location.search);if(!(collectionSortIds as readonly string[]).includes(url.get('sort')??''))setSortState(saved.sort);setPrefsReady(true);}).catch(()=>{if(active){setPreferenceError('Collections preferences could not load. Your library is still available.');setPrefsReady(true);}});return()=>{active=false;};},[client,collection.userId]);
 const genres=useMemo(()=>[...new Set(items.flatMap(item=>item.genre.split(',').map(value=>value.trim()).filter(Boolean)))].sort(),[items]);
 const seriesIds=useMemo(()=>seriesFilter?new Set(collection.records.seriesMembers.filter(member=>member.series_id===seriesFilter).map(member=>member.book_id??member.media_id)):null,[seriesFilter,collection.records.seriesMembers]);
 const {seriesNamesByItem}=useMemo(()=>{
  // One pass over series membership instead of a scan per card or per keystroke.
  const titles=new Map(collection.records.series.map(row=>[row.id,row.title])),names=new Map<string,string[]>(),chips=new Map<string,SeriesChip>();
  for(const member of collection.records.seriesMembers){const id=member.book_id??member.media_id,name=titles.get(member.series_id);if(!id||!name)continue;names.set(id,[...(names.get(id)??[]),name]);if(member.book_id&&!member.hidden&&member.role!=='collection'&&!chips.has(id))chips.set(id,{id:member.id,title:name,sequence:member.position_known?Number(member.sequence):null});}
  return {seriesNamesByItem:names,seriesChipByItem:chips};
 },[collection.records.series,collection.records.seriesMembers]);
 const advancedCount=Number(!!genreFilter)+Number(!!ratingFilter)+Number(!!tagFilter)+Number(!!seriesFilter)+Number(favoriteOnly)+Number(!!addedAfter)+Number(!!completedAfter);
 const filtered=useMemo(()=>browseLibrary(statusFilter==='archived'?archivedItems:items,{kind:kindFilter,status:statusFilter,genre:genreFilter,rating:ratingFilter,tag:tagFilter,seriesIds,favoriteOnly,addedAfter,completedAfter,search:deferredSearch},sort,seriesNamesByItem),[statusFilter,archivedItems,items,kindFilter,genreFilter,ratingFilter,tagFilter,seriesIds,favoriteOnly,addedAfter,completedAfter,deferredSearch,sort,seriesNamesByItem]);
 const ready=prefsReady&&status.loaded&&collection.loaded&&view==='overview';
 const pager=usePagination({total:filtered.length,resetKey:visibleKey,ready,url:true,sizeStorageKey:'muse.library.pageSize'}),pageSlice=pageItems(filtered,pager.window);
 /** Filters live in the URL (replaceState) so opening a Book and coming back restores them, with page and size. */
 useEffect(()=>{
  if(!ready)return;
  const params=new URLSearchParams(window.location.search),set=(key:string,value:string)=>{if(value)params.set(key,value);else params.delete(key);};
  set('q',search.trim());set('status',statusFilter);set('sort',sort);set('genre',genreFilter);set('rating',ratingFilter);set('tag',tagFilter);set('sf',seriesFilter);set('fav',favoriteOnly?'1':'');set('added',addedAfter);set('done',completedAfter);set('kind',kindFilter);
  const next=`${window.location.pathname}?${params}`;
  if(next!==`${window.location.pathname}${window.location.search}`)window.history.replaceState(null,'',next);
 },[ready,search,statusFilter,sort,genreFilter,ratingFilter,tagFilter,seriesFilter,favoriteOnly,addedAfter,completedAfter,kindFilter]);
 /** Returning from a Book puts the reader back at the card they left (the page itself comes from the URL). */
 const scrollRestored=useRef(false);
 useEffect(()=>{
  if(!ready||scrollRestored.current)return;scrollRestored.current=true;
  try{const saved=JSON.parse(sessionStorage.getItem(LIBRARY_SCROLL_KEY)??'null');sessionStorage.removeItem(LIBRARY_SCROLL_KEY);
   if(saved&&saved.url===`${window.location.pathname}${window.location.search}`&&Number.isFinite(saved.y))requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,saved.y)));}catch{/* the reader simply starts at the top */}
 },[ready]);
 const inProgress=items.filter(item=>(kindFilter==='all'||item.kind===kindFilter)&&(item.kind==='book'?item.status==='reading':item.kind==='game'?item.status==='playing':item.status==='watching'));
 const categoryItems=items.filter(item=>kindFilter==='all'||item.kind===kindFilter),activeLabel=kindFilter==='book'?'Currently Reading':kindFilter==='game'?'Currently Playing':kindFilter==='all'?'In Progress':'Currently Watching';
 const hasContentFilters=!!(search.trim()||statusFilter||advancedCount);
 function go(next:View,options:{mode?:Mode;item?:CanonicalItem;add?:boolean;section?:'atlas';seriesId?:string}={}){const params=new URLSearchParams(query?.toString());if(next==='overview')params.delete('view');else params.set('view',next);if(options.mode)params.set('mode',options.mode);params.delete('book');params.delete('item');params.delete('add');params.delete('section');params.delete('series');if(options.seriesId)params.set('series',options.seriesId);if(options.item)params.set(next==='books'?'book':'item',options.item.id);if(options.add)params.set('add','1');if(options.section)params.set('section',options.section);window.history.pushState(null,'',`/collections${params.size?`?${params}`:''}`);setAddOpen(false);}
 function openAddBook(){const params=new URLSearchParams(query?.toString());params.delete('view');params.delete('book');params.delete('item');params.delete('series');params.delete('section');params.set('add','book');window.history.pushState(null,'',`/collections?${params}`);setAddOpen(false);}
 function closeAddBook(){const params=new URLSearchParams(query?.toString());params.delete('add');params.delete('plan');window.history.pushState(null,'',`/collections${params.size?`?${params}`:''}`);}
 function open(item:CanonicalItem){if(item.kind==='book'){openPage(bookHref(item.id));return;}go(mediaView[item.kind],{item});}
 const openRef=useRef(open);useEffect(()=>{openRef.current=open;});
 const openItem=useCallback((item:CanonicalItem)=>openRef.current(item),[]);
 const listView=preferences.density==='list',sessions=whimsy?.sessions??NO_SESSIONS;
 const sortHead=(id:string,text:string)=><button type="button" className="muse-lib-sorthead" aria-pressed={sort===id} onClick={()=>setSort(id)}>{text}{sort===id&&<MuseIcon name="chevron" size={12}/>}</button>;
 function cards(entries:CanonicalItem[]){
  if(listView)return <div className="muse-lib-list" role="list"><div className="muse-lib-list-head" aria-hidden="true">{sortHead('title','Book')}<span>Status</span>{sortHead('rating','Rating')}<span>Progress</span>{sortHead('recent','Date')}<span/></div>
   {entries.map(item=><div role="listitem" key={`${item.kind}/${item.id}`}><LibraryRow item={item} sessions={sessions} onOpen={selecting?toggleSelect:openItem} selected={selecting?selectedIds.includes(item.id):undefined}/></div>)}</div>;
  return <div className="muse-lib-grid">{entries.map(item=><LibraryTile key={`${item.kind}/${item.id}`} item={item} onOpen={selecting?toggleSelect:openItem} selected={selecting?selectedIds.includes(item.id):undefined}/>)}</div>;
 }
 /** The current page of the Library with page controls above and below; only these cards are ever mounted. */
 const listTop=useRef<HTMLDivElement>(null),{setPage:setPagerPage,setSize:setPagerSize}=pager;
 const noun=kindFilter==='book'?'books':kindFilter==='all'?'items':kindFilter==='tv'?'shows':kindFilter==='album'?'albums':kindFilter==='game'?'games':'movies';
 const changePage=useCallback((page:number)=>{setPagerPage(page);requestAnimationFrame(()=>listTop.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));},[setPagerPage]);
 const changeSize=useCallback((size:PageSize)=>{setPagerSize(size);requestAnimationFrame(()=>listTop.current?.scrollIntoView({block:'start',behavior:'instant'}));},[setPagerSize]);
 const pagedLibrary=<div className="muse-collections-library-page muse-lib" data-layout={mode} data-view={listView?'list':'gallery'} ref={listTop}><PaginationControls window={pager.window} noun={noun} position="top" label="Library" onPage={changePage} onSize={changeSize}/>{cards(pageSlice)}<PaginationControls window={pager.window} noun={noun} position="bottom" label="Library" onPage={changePage} onSize={changeSize}/></div>;
 /** Books settings (the Daily Edit Bookshelf widget and Goodreads import) live in the Books toolbar, not on the Reading Desk. */
 const booksWidget=whimsy?.widgets.find(w=>w.experience==='bookshelf');
 async function toggleBooksWidget(enabled:boolean){if(widgetBusy)return;setWidgetBusy(true);try{await saveWhimsyRecord(client,'widgets',{record:{id:booksWidget?.id??crypto.randomUUID(),experience:'bookshelf',enabled,...bookshelfWidgetExtras(booksWidget)},expectedRevision:booksWidget?.revision??0,commandId:crypto.randomUUID()});await retryWhimsy();}catch(error){setPreferenceError(error instanceof Error?error.message:'Books settings could not be saved.');}finally{setWidgetBusy(false);}}
 function clearFilters(){setSearch('');setStatusFilter('');setGenreFilter('');setRatingFilter('');setTagFilter('');setSeriesFilter('');setFavoriteOnly(false);setAddedAfter('');setCompletedAfter('');}
 async function savePreferences(){setPreferenceBusy(true);setPreferenceError('');try{const confirmed=await saveCollectionsPreferences(client,collection.userId,draftPreferences);setPreferences(confirmed);setPreferencesOpen(false);}catch(error){setPreferenceError(error instanceof Error?error.message:'Preferences could not be saved.');}finally{setPreferenceBusy(false);}}
 const [filtersOpen,setFiltersOpen]=useState(false);
 const statusName=(id:string)=>id==='archived'?'Archived':statusLabels[id]??id;
 const bookCount=items.filter(item=>item.kind==='book').length,favoriteCount=items.filter(item=>item.favorite).length;
 const activeCount=Number(!!statusFilter)+advancedCount;
 const sortLabel:Record<string,string>={recent:'Recently updated',oldest:'Date added',completed:'Recently completed',rating:'Highest rated',title:'Title',author:'Author'};
 /** The active filters as small removable chips, only while something is filtered. */
 const activeChips:[string,()=>void][]=[...(statusFilter?[[statusName(statusFilter),()=>setStatusFilter('')] as [string,()=>void]]:[]),...(favoriteOnly?[['Favorites',()=>setFavoriteOnly(false)] as [string,()=>void]]:[]),...(genreFilter?[[genreFilter,()=>setGenreFilter('')] as [string,()=>void]]:[]),...(ratingFilter?[[`${ratingFilter}★ and up`,()=>setRatingFilter('')] as [string,()=>void]]:[]),...(seriesFilter?[[collection.records.series.find(r=>r.id===seriesFilter)?.title??'Series',()=>setSeriesFilter('')] as [string,()=>void]]:[]),...(tagFilter?[[`#${tagFilter}`,()=>setTagFilter('')] as [string,()=>void]]:[]),...(addedAfter?[[`Added since ${addedAfter}`,()=>setAddedAfter('')] as [string,()=>void]]:[]),...(completedAfter?[[`Finished since ${completedAfter}`,()=>setCompletedAfter('')] as [string,()=>void]]:[])];
 /** Library V2 toolbar: search and Add, then Filters, Sort, Gallery/List and Select, all in one compact row. */
 const libraryToolbar=<div className="muse-lib-toolbar" role="search">
  <div className="muse-lib-toolbar-row muse-search-row">
   <MuseSearch label="Search your library" value={search} onChange={setSearch} placeholder="Search your library…"/>
   <button ref={addAnchor} type="button" className="muse-button button-primary muse-lib-add" aria-label="Add a book" onClick={()=>openAddBook()}><MuseIcon name="plus" size={15}/><span>Add</span></button>
   <div className="muse-lib-tools">
    <button type="button" className="muse-button button-ghost muse-lib-tool muse-collections-filter-trigger" aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(true)}><MuseIcon name="filter" size={15}/><span>Filters</span>{activeCount>0&&<span className="muse-collections-filter-count type-numeric">{activeCount}</span>}</button>
    <div className="muse-lib-sort"><MuseChoiceMenu label="Collection sort" variant="chip" icon="sort" valueLabel="Sort" options={Object.entries(sortLabel).map(([id,label])=>({id,label}))} selectedIds={[sort]} onSelect={setSort}/></div>
    <div className="muse-lib-view" role="group" aria-label="Library view"><button type="button" aria-pressed={!listView} aria-label="Gallery" title="Gallery" onClick={()=>setDensity(lastGallery)}><GridGlyph size={17}/></button><button type="button" aria-pressed={listView} aria-label="List" title="List" onClick={()=>setDensity('list')}><ListGlyph size={17}/></button></div>
    <button type="button" className="muse-button button-ghost muse-lib-tool muse-collections-select-trigger" aria-pressed={selecting} title="Select books to add to a reading plan" onClick={()=>selecting?stopSelecting():setSelecting(true)}><MuseIcon name="check" size={15}/><span>{selecting?'Done':'Select'}</span></button>
   </div>
  </div>
  {activeChips.length>0&&<div className="muse-lib-chips" aria-label="Active filters">{activeChips.map(([text,remove])=><button key={text} type="button" className="muse-lib-chip" onClick={remove} aria-label={`Remove filter: ${text}`}>{text}<MuseIcon name="close" size={11}/></button>)}<button type="button" className="text-button muse-lib-clear" onClick={clearFilters}>Clear all</button></div>}
 </div>;
 const filterSheet=filtersOpen&&<MuseModal id="library-filters" label="Filter your library" title="Filters" returnFocus={null} onClose={()=>setFiltersOpen(false)}><div className="muse-lib-filters">
  <section aria-labelledby="lib-f-show"><h4 id="lib-f-show">Show</h4><div className="muse-lib-pills" role="group" aria-label="Reading status">
   <button type="button" aria-pressed={!statusFilter&&!favoriteOnly} onClick={()=>{setStatusFilter('');setFavoriteOnly(false);}}><MuseIcon name="book" size={14}/>All books <small className="type-numeric">{bookCount}</small></button>
   {BOOK_STATUS_ORDER.map(id=><button key={id} type="button" aria-pressed={statusFilter===id} onClick={()=>setStatusFilter(statusFilter===id?'':id)}><StatusDot status={id}/>{BOOK_STATUS_LABEL[id]} <small className="type-numeric">{items.filter(item=>item.status===id).length}</small></button>)}
   <button type="button" aria-pressed={favoriteOnly} onClick={()=>setFavoriteOnly(!favoriteOnly)}><MuseIcon name="favorite" size={14}/>Favorites <small className="type-numeric">{favoriteCount}</small></button>
   {archivedItems.length>0&&<button type="button" aria-pressed={statusFilter==='archived'} onClick={()=>setStatusFilter(statusFilter==='archived'?'':'archived')}><MuseIcon name="archive" size={14}/>Archived <small className="type-numeric">{archivedItems.length}</small></button>}
  </div></section>
  <section aria-labelledby="lib-f-more" className="muse-lib-filter-grid"><h4 id="lib-f-more">Narrow it down</h4>
   <div className="muse-collections-choice-field"><span>Genre</span><MuseChoiceMenu label="Collection genre" valueLabel={genreFilter||'All genres'} options={[{id:'',label:'All genres'},...genres.map(genre=>({id:genre,label:genre}))]} selectedIds={[genreFilter]} onSelect={setGenreFilter} searchable/></div>
   <div className="muse-collections-choice-field"><span>Your rating</span><MuseChoiceMenu label="Collection rating" valueLabel={ratingFilter?`${ratingFilter}/5`:'Any rating'} options={[{id:'',label:'Any rating'},...[5,4.5,4,3.5,3,2.5,2,1.5,1,.5].map(rating=>({id:String(rating),label:`${rating}/5`}))]} selectedIds={[ratingFilter]} onSelect={setRatingFilter}/></div>
   <div className="muse-collections-choice-field"><span>Series</span><MuseChoiceMenu label="Collection series" valueLabel={collection.records.series.find(row=>row.id===seriesFilter)?.title??'All series'} options={[{id:'',label:'All series'},...collection.records.series.map(row=>({id:row.id,label:row.title}))]} selectedIds={[seriesFilter]} onSelect={setSeriesFilter} searchable/></div>
   <label className="muse-collections-tag-filter">Personal tag<input value={tagFilter} onChange={event=>setTagFilter(event.target.value)} placeholder="Search your tags"/></label>
   <div className="muse-collections-date-filter"><span>Added on or after</span><MuseOptionalDatePicker label="Added on or after" date={addedAfter} today={today} onChange={setAddedAfter}/></div>
   <div className="muse-collections-date-filter"><span>Finished on or after</span><MuseOptionalDatePicker label="Completed on or after" date={completedAfter} today={today} onChange={setCompletedAfter}/></div>
  </section>
  <div className="muse-lib-filters-foot"><button type="button" className="muse-button button-ghost" disabled={!activeCount&&!search} onClick={clearFilters}>Clear all</button><button type="button" className="muse-button button-primary" onClick={()=>setFiltersOpen(false)}>Show {filtered.length.toLocaleString()} {filtered.length===1?'book':'books'}</button></div>
 </div></MuseModal>;
 const groups:[string,(item:CanonicalItem)=>boolean][]=[['Currently Reading',item=>item.kind==='book'&&item.status==='reading'],['Currently Watching',item=>['movie','tv'].includes(item.kind)&&item.status==='watching'],['Currently Playing',item=>item.kind==='game'&&item.status==='playing'],['On Repeat',item=>item.kind==='album'&&item.status==='listening'],['Up Next',item=>['planned','backlog'].includes(item.status)],['Recently Finished',item=>['finished','watched','completed','listened'].includes(item.status)],['Favorites',item=>item.favorite]];
 return <main className="muse-page muse-collections" data-density={preferences.density}><MusePageHeader title="Books" description={tab==='library'?'Everything you own, read and want.':'Your reading life, at a glance.'}>{view==='overview'&&<MuseIconButton icon="settings" label="Books settings" onClick={()=>{setDraftPreferences(preferences);setPreferenceError('');setPreferencesOpen(true);}}/>}</MusePageHeader>
 {view==='overview'&&<BooksNav current={tab}/>}
 {view!=='overview'&&<a href="/collections" className="muse-collections-back" onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();go('overview');}}}><span className="muse-collections-back-icon"><MuseIcon name="arrow" size={16}/></span>Back to Collections</a>}
 {view==='books'?<p role="status" className="muse-collections-redirect">Opening Books…</p>:view==='movies'||view==='tv'||view==='games'||view==='music'?<MediaLibrary key={`${view}/${query?.get('item')??''}/${query?.get('add')??''}`} kind={view==='movies'?'movie':view==='games'?'game':view==='music'?'album':'tv'} initialItemId={query?.get('item')} initialAdd={query?.get('add')==='1'}/>:view==='series'?<SeriesLibrary key={query?.get('series')??''} initialSeriesId={query?.get('series')} initialAdd={query?.get('add')==='1'}/>:view==='my-collections'?<CuratedLibrary initialAdd={query?.get('add')==='1'}/>:<section className="muse-collections-overview" data-tab={tab} aria-label="Collections overview">{tab==='library'&&libraryToolbar}
 {preferenceError&&<p role="alert" className="muse-books-error">{preferenceError}</p>}
 {!status.loaded||!collection.loaded?<p role="status">{status.error||collection.error||'Loading your books…'}</p>:tab==='dashboard'?<Bookshelf surface="dashboard" embedded/>:<>{(savedSeriesMatches.length>0||catalogSeriesMatches.length>0)&&<section className="muse-collections-series-strip" aria-label="Matching series"><span className="small-label">Series</span><div>{savedSeriesMatches.map(row=>{const covers=seriesCovers(row.id),progress=seriesProgress(row,collection.records.seriesMembers,books,collection.records.media);return <button type="button" key={row.id} onClick={()=>openPage(seriesHref(row.id))}><span className="muse-collections-series-stack" aria-hidden="true">{(covers.length?covers:[{title:row.title,cover:null,color:null,owned:true}]).slice(0,3).map((c,i)=><span key={i} style={{['--i' as string]:i}}><SeriesCover title={c.title} coverUrl={c.cover} color={c.color} size="sm"/></span>)}</span><span><strong>{row.title}</strong><small>{progress.completed} of {progress.availableTotal} read</small></span></button>;})}{catalogSeriesMatches.map(hit=><button type="button" key={`${hit.source}:${hit.id}`} onClick={()=>openPage(seriesHref(catalogSeriesKey(hit.source,hit.id)))}><span className="muse-collections-series-stack" aria-hidden="true"><span><SeriesCover title={hit.title} coverUrl={hit.coverUrl??null} size="sm"/></span></span><span><strong>{hit.title}</strong><small>{[hit.author,hit.primaryCount!==null?`${hit.primaryCount} books`:null].filter(Boolean).join(' · ')}</small></span></button>)}</div></section>}{kindFilter!=='all'&&categoryItems.length===0&&!hasContentFilters?<div className="muse-empty-state muse-collections-empty" data-variant="editorial"><h3>{emptyCopy[kindFilter][0]}</h3><p>{emptyCopy[kindFilter][1]}</p><button type="button" className="muse-button button-primary" onClick={()=>kindFilter==='book'?openAddBook():go(emptyCopy[kindFilter][3],{add:true})}>{emptyCopy[kindFilter][2]}</button></div>:items.length===0&&collection.records.series.length===0&&collection.records.curated.length===0?<div className="muse-empty-state muse-collections-empty" data-variant="editorial"><h3>Your museum starts with a story.</h3><p>Add a book, movie, TV show, or game. Your existing reading history appears here automatically.</p><button type="button" className="muse-button button-primary" onClick={()=>{addAnchor.current?.focus();setAddOpen(true);}}>Add your first item</button></div>:!filtered.length&&hasContentFilters?<div className="muse-empty-state muse-collections-empty muse-collections-no-results" data-variant="editorial"><h3>Nothing matches these filters.</h3><p>Try another search or filter to see your collection.</p><button type="button" className="muse-button button-ghost" onClick={clearFilters}>Clear filters</button></div>:<>{pagedLibrary}</>}</>}</section>}
 {view==='overview'&&query?.get('add')==='book'&&<Bookshelf embedded editorOnly initialAdd onExit={closeAddBook}/>}{preferencesOpen&&<MuseModal id="collections-preferences" label="Settings" title="Settings" returnFocus={null} onClose={()=>setPreferencesOpen(false)}><div className="muse-collections-dialog muse-collections-preferences"><section className="muse-settings-group" aria-labelledby="settings-collections"><h3 id="settings-collections">Library</h3><div className="muse-collections-choice-field"><span>Cover size</span><MuseChoiceMenu label="Default cover size" valueLabel={densityChoices.find(([id])=>id===draftPreferences.density)?.[1]??'Compact'} options={densityChoices.map(([id,label])=>({id,label}))} selectedIds={[draftPreferences.density]} onSelect={id=>setDraftPreferences({...draftPreferences,density:id as LibraryDensity})}/></div></section>
 <section className="muse-settings-group" aria-labelledby="settings-books"><h3 id="settings-books">Books</h3><label className="muse-collections-checkbox"><input type="checkbox" checked={!!booksWidget?.enabled} disabled={!status.loaded||widgetBusy} onChange={event=>void toggleBooksWidget(event.target.checked)}/><span>Show my current read on the Daily Edit<small>Saves right away</small></span></label><div className="muse-settings-row"><div><strong>Import, export & reading data</strong><span>Goodreads and CSV import, a full library export, and import history.</span></div><BooksSettings name="Books" triggerLabel="Open import & export" icon="book" enabled={!!booksWidget?.enabled} disabled={!status.loaded||widgetBusy} saving={widgetBusy} onChange={enabled=>void toggleBooksWidget(enabled)}/></div></section>{preferenceError&&<p role="alert">{preferenceError}</p>}<div className="muse-collections-actions muse-collections-sticky-footer"><button type="button" className="muse-button button-primary" disabled={preferenceBusy} onClick={()=>void savePreferences()}>{preferenceBusy?'Saving…':'Save preferences'}</button><button type="button" className="muse-button button-ghost" onClick={()=>setPreferencesOpen(false)}>Cancel</button></div></div></MuseModal>}
 {selecting&&tab==='library'&&<div className="muse-collections-select-bar" role="region" aria-label="Selected books"><span className="type-numeric">{selectedIds.length} selected</span><button type="button" className="muse-button button-primary" disabled={!selectedIds.length} onClick={()=>setPlanOpen(true)}>Add to a reading plan…</button><button type="button" className="muse-button button-ghost" onClick={stopSelecting}>Cancel</button></div>}
 {filterSheet}
 {planOpen&&<AddToPlanModal books={items.filter(i=>selectedIds.includes(i.id)&&i.book).map(i=>({id:i.id,title:i.title}))} today={today} onClose={()=>{setPlanOpen(false);stopSelecting();}}/>}
 </main>;
}
