import type {Tables} from '@/lib/database.types';
import type {Book} from '@/lib/whimsy/models';

export type MediaItem=Tables<'collection_media_items'>;
export type Episode=Tables<'collection_tv_episodes'>;
export type MediaActivity=Tables<'collection_activity'>;
export type Series=Tables<'collection_series'>;
export type SeriesMember=Tables<'collection_series_members'>;
export type Curated=Tables<'collection_curated'>;
export type CuratedMember=Tables<'collection_curated_members'>;
export type MediaKind='movie'|'tv'|'game';
export type CollectionsSnapshot={media:MediaItem[];episodes:Episode[];activity:MediaActivity[];series:Series[];seriesMembers:SeriesMember[];curated:Curated[];curatedMembers:CuratedMember[]};
export const emptyCollections=():CollectionsSnapshot=>({media:[],episodes:[],activity:[],series:[],seriesMembers:[],curated:[],curatedMembers:[]});
export type CanonicalItem={id:string;kind:'book'|MediaKind;title:string;creator:string;coverUrl:string|null;status:string;genre:string;rating:number|null;favorite:boolean;createdAt:string;updatedAt:string;book?:Book;media?:MediaItem};
export function canonicalItems(books:Book[],media:MediaItem[]):CanonicalItem[]{return [...books.map(book=>({id:book.id,kind:'book' as const,title:book.title,creator:book.author??'',coverUrl:book.coverUrl??null,status:book.status,genre:book.genre??'',rating:book.rating??null,favorite:false,createdAt:book.createdAt,updatedAt:book.updatedAt,book})),...media.map(item=>({id:item.id,kind:item.kind as MediaKind,title:item.title,creator:item.creator,coverUrl:item.cover_url,status:item.status,genre:item.genres.join(', '),rating:item.rating,favorite:item.favorite,createdAt:item.created_at,updatedAt:item.updated_at,media:item}))];}
export const mediaStatusLabels:Record<MediaKind,Record<string,string>>={movie:{planned:'Want to Watch',watching:'Watching',watched:'Watched',dnf:'Did Not Finish'},tv:{planned:'Want to Watch',watching:'Watching','caught-up':'Caught Up',completed:'Completed',paused:'On Hold',dnf:'Did Not Finish'},game:{backlog:'Backlog',playing:'Currently Playing',paused:'On Hold',completed:'Completed',dnf:'Did Not Finish'}};
export function completed(item:CanonicalItem){return item.kind==='book'?item.status==='finished':item.kind==='movie'?item.status==='watched':item.status==='completed';}
export function releasedEpisodes(showId:string,episodes:Episode[],today:string,includeSpecials=false){return episodes.filter(episode=>episode.show_id===showId&&(includeSpecials||!episode.special)&&episode.release_state==='released'&&(!episode.air_date||episode.air_date<=today)).sort((a,b)=>a.season_number-b.season_number||a.episode_number-b.episode_number);}
export function tvProgress(showId:string,episodes:Episode[],activity:MediaActivity[],today:string){const available=releasedEpisodes(showId,episodes,today),watched=new Set(activity.filter(row=>row.media_id===showId&&row.episode_id&&['episode-watch','episode-rewatch'].includes(row.kind)).map(row=>row.episode_id));const next=available.find(episode=>!watched.has(episode.id))??null;return {watched:available.filter(episode=>watched.has(episode.id)).length,available:available.length,next,seasons:[...new Set(available.map(episode=>episode.season_number))].map(season=>{const own=available.filter(episode=>episode.season_number===season);return {season,watched:own.filter(episode=>watched.has(episode.id)).length,available:own.length};})};}
export function seriesProgress(series:Series,members:SeriesMember[],books:Book[],media:MediaItem[]){
 const own=members.filter(member=>member.series_id===series.id&&member.role==='mainline').sort((a,b)=>a.sequence-b.sequence),items=canonicalItems(books,media),resolved=own.map(member=>({member,item:items.find(item=>item.id===(member.book_id??member.media_id))??null}));
 const released=resolved.filter(row=>row.member.release_state==='released');
 const scope=series.scope==='released'?released:series.scope==='announced'?resolved.filter(row=>row.member.release_state!=='unknown'):resolved;
 const done=scope.filter(row=>row.item&&completed(row.item)).length,hasProgress=resolved.some(row=>row.item&&completed(row.item)),paused=scope.some(row=>row.item?.status==='paused');
 const releasedDone=released.length>0&&released.every(row=>row.item&&completed(row.item));
 const future=resolved.some(row=>row.member.release_state==='announced');
 const status=!scope.length?'not-started':paused?'on-hold':done===scope.length?(future?'caught-up':'completed'):releasedDone&&future?'caught-up':hasProgress?'in-progress':'not-started';
 return {completed:done,total:scope.length,percentage:scope.length?done/scope.length*100:null,next:scope.find(row=>row.item&&!completed(row.item))?.item??null,status,ordered:resolved};
}
export function collectionMembers(collectionId:string,members:CuratedMember[],items:CanonicalItem[]){return members.filter(member=>member.collection_id===collectionId).sort((a,b)=>a.position-b.position).map(member=>items.find(item=>item.id===(member.book_id??member.media_id))).filter((item):item is CanonicalItem=>!!item);}
