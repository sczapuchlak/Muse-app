import type {Tables} from '@/lib/database.types';
import type {Book} from '@/lib/whimsy/models';

export type MediaItem=Tables<'collection_media_items'>;
export type Episode=Tables<'collection_tv_episodes'>;
export type Season=Tables<'collection_tv_seasons'>;
export type MediaActivity=Tables<'collection_activity'>;
export type Series=Tables<'collection_series'>;
export type SeriesMember=Tables<'collection_series_members'>;
export type Curated=Tables<'collection_curated'>;
export type CuratedMember=Tables<'collection_curated_members'>;
export type MediaKind='movie'|'tv'|'game';
export type CollectionsSnapshot={media:MediaItem[];episodes:Episode[];seasons:Season[];activity:MediaActivity[];series:Series[];seriesMembers:SeriesMember[];curated:Curated[];curatedMembers:CuratedMember[]};
export const emptyCollections=():CollectionsSnapshot=>({media:[],episodes:[],seasons:[],activity:[],series:[],seriesMembers:[],curated:[],curatedMembers:[]});
export function activeMediaItems(items:readonly MediaItem[],kind:MediaKind){const activeStatus=kind==='game'?'playing':'watching';return items.filter(item=>item.kind===kind&&item.status===activeStatus);}
export type CanonicalItem={id:string;kind:'book'|MediaKind;title:string;creator:string;coverUrl:string|null;status:string;genre:string;rating:number|null;favorite:boolean;createdAt:string;updatedAt:string;book?:Book;media?:MediaItem};
export function canonicalItems(books:Book[],media:MediaItem[]):CanonicalItem[]{return [...books.map(book=>({id:book.id,kind:'book' as const,title:book.title,creator:book.author??'',coverUrl:book.coverUrl??null,status:book.status,genre:book.genre??'',rating:book.rating??null,favorite:false,createdAt:book.createdAt,updatedAt:book.updatedAt,book})),...media.map(item=>({id:item.id,kind:item.kind as MediaKind,title:item.title,creator:item.creator,coverUrl:item.cover_url,status:item.status,genre:item.genres.join(', '),rating:item.rating,favorite:item.favorite,createdAt:item.created_at,updatedAt:item.updated_at,media:item}))];}
export const mediaStatusLabels:Record<MediaKind,Record<string,string>>={movie:{planned:'Want to Watch',watching:'Watching',watched:'Watched',dnf:'Did Not Finish'},tv:{planned:'Want to Watch',watching:'Watching','caught-up':'Caught Up',completed:'Completed',paused:'On Hold',dnf:'Did Not Finish'},game:{backlog:'Backlog',playing:'Currently Playing',paused:'On Hold',completed:'Completed',dnf:'Did Not Finish'}};
export function completed(item:CanonicalItem){return item.kind==='book'?item.status==='finished':item.kind==='movie'?item.status==='watched':item.status==='completed';}
export function releasedEpisodes(showId:string,episodes:Episode[],today:string,includeSpecials=false){return episodes.filter(episode=>episode.show_id===showId&&(includeSpecials||!episode.special)&&episode.release_state==='released'&&(!episode.air_date||episode.air_date<=today)).sort((a,b)=>a.season_number-b.season_number||a.episode_number-b.episode_number);}
export function tvProgress(showId:string,episodes:Episode[],activity:MediaActivity[],today:string,seasons:Season[]=[],conclusionState='unknown'){
 const availableEpisodes=releasedEpisodes(showId,episodes,today),watchedIds=new Set(activity.filter(row=>row.media_id===showId&&row.episode_id&&['episode-watch','episode-rewatch'].includes(row.kind)).map(row=>row.episode_id));
 const summaries=seasons.filter(row=>row.show_id===showId),numbers=[...new Set([...summaries.map(row=>row.season_number),...episodes.filter(row=>row.show_id===showId&&!row.special).map(row=>row.season_number)])].sort((a,b)=>a-b);
 const rows=numbers.map(season=>{const summary=summaries.find(row=>row.season_number===season),own=availableEpisodes.filter(row=>row.season_number===season),trackedWatched=own.filter(row=>watchedIds.has(row.id)).length,available=Math.max(summary?.total_episodes??0,own.length),manualWatched=summary?.watched_episodes??0,allTrackedWatched=own.every(row=>watchedIds.has(row.id)),watched=summary?.watched&&allTrackedWatched?available:Math.min(available,Math.max(manualWatched,trackedWatched)),released=summary?.release_state==='released'||own.length>0;
  return {season,watched,available,released,complete:released&&(summary?.watched&&allTrackedWatched||available>0&&watched===available),releaseState:own.length?'released':summary?.release_state??'unknown',summary:summary??null};});
 const released=rows.filter(row=>row.released),watched=released.reduce((sum,row)=>sum+row.watched,0),available=released.reduce((sum,row)=>sum+row.available,0),completedSeasons=released.filter(row=>row.complete).length,next=availableEpisodes.find(episode=>!watchedIds.has(episode.id))??null;
 const future=rows.some(row=>row.releaseState==='announced')||episodes.some(row=>row.show_id===showId&&!row.special&&row.release_state==='announced');
 const status=!released.length?'not-started':completedSeasons===released.length?conclusionState==='concluded'&&!future?'completed':'caught-up':watched>0||completedSeasons>0?'in-progress':'not-started';
 return {watched,available,next,seasons:rows,completedSeasons,releasedSeasons:released.length,status};
}
export function seriesProgress(series:Series,members:SeriesMember[],books:Book[],media:MediaItem[]){
 const own=members.filter(member=>member.series_id===series.id&&member.role==='mainline').sort((a,b)=>a.sequence-b.sequence),items=canonicalItems(books,media),resolved=own.map(member=>({member,item:items.find(item=>item.id===(member.book_id??member.media_id))??null}));
 const released=resolved.filter(row=>row.member.release_state==='released');
 const scope=series.scope==='released'?released:series.scope==='announced'?resolved.filter(row=>row.member.release_state!=='unknown'):resolved;
 const availableScope=scope.filter(row=>row.member.release_state==='released'),done=availableScope.filter(row=>row.item&&completed(row.item)).length,hasProgress=resolved.some(row=>row.item&&completed(row.item)),paused=scope.some(row=>row.item?.status==='paused');
 const releasedDone=released.length>0&&released.every(row=>row.item&&completed(row.item));
 const future=resolved.some(row=>row.member.release_state==='announced');
 const status=!resolved.length?'not-started':paused?'on-hold':releasedDone?(series.conclusion_state==='concluded'&&!future?'completed':'caught-up'):hasProgress?'in-progress':'not-started';
 return {completed:done,total:scope.length,availableTotal:availableScope.length,percentage:availableScope.length?done/availableScope.length*100:null,next:scope.find(row=>row.item&&!completed(row.item))?.item??null,status,ordered:resolved};
}
export function collectionMembers(collectionId:string,members:CuratedMember[],items:CanonicalItem[]){return members.filter(member=>member.collection_id===collectionId).sort((a,b)=>a.position-b.position).map(member=>items.find(item=>item.id===(member.book_id??member.media_id))).filter((item):item is CanonicalItem=>!!item);}
