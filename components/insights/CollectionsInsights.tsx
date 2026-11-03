'use client';
import Link from 'next/link';
import {useCollectionsData} from '@/components/collections/CollectionsData';
import {useWhimsyData} from '@/components/whimsy/WhimsyData';
import {collectionsMetrics} from '@/lib/collections/insights';
import type {CollectionRange} from '@/lib/collections/insights';
import {InsightPanel} from './InsightPanel';

export function CollectionsInsights({range}:{range:CollectionRange}){
 const collection=useCollectionsData(),whimsy=useWhimsyData();
 if(!collection.loaded||!whimsy.status.loaded)return <InsightPanel title="Your stories"><p role="status">{collection.error||whimsy.status.error||'Loading saved Collections records…'}</p><button type="button" className="muse-button button-ghost" onClick={()=>{void collection.retry();void whimsy.retry();}}>Retry Collections</button></InsightPanel>;
 let metrics:ReturnType<typeof collectionsMetrics>;
 try{metrics=collectionsMetrics(collection.records,whimsy.records?.books??[],whimsy.records?.sessions??[],range);}catch{return <InsightPanel title="Your stories"><p role="alert">Reading history could not be summarized. Review the saved reading sessions before using Collections Insights.</p></InsightPanel>;}
 const active=metrics.books.finished+metrics.books.readingSessions+metrics.movies.completed+metrics.movies.viewings+metrics.tv.episodeViewings+metrics.games.completed+metrics.games.playSessions;
 return <InsightPanel title="Your stories" kicker="Collections · saved activity">
  {!active?<p>No saved reading, viewing, or playing activity is dated in this period. Your library is still here whenever you want to explore it.</p>:<><dl className="muse-insight-small-metrics"><div><dt>Books finished</dt><dd>{metrics.books.finished}</dd></div><div><dt>Reading sessions</dt><dd>{metrics.books.readingSessions}</dd></div><div><dt>Pages read</dt><dd>{metrics.books.pages}</dd></div><div><dt>Movies completed</dt><dd>{metrics.movies.completed}</dd></div><div><dt>Movie viewings</dt><dd>{metrics.movies.viewings}</dd></div><div><dt>Episodes watched</dt><dd>{metrics.tv.episodesWatched}</dd></div><div><dt>Games completed</dt><dd>{metrics.games.completed}</dd></div><div><dt>Game sessions</dt><dd>{metrics.games.playSessions}</dd></div></dl><p className="card-description">Recorded time: {Math.round(metrics.books.recordedMinutes)} reading minutes, {metrics.movies.recordedMinutes+metrics.tv.recordedMinutes} viewing minutes, {metrics.games.recordedMinutes} playing minutes. {metrics.movies.sessionsMissingDuration+metrics.tv.sessionsMissingDuration+metrics.games.sessionsMissingDuration} session(s) have no duration.</p></>}
  {metrics.series.current.length>0&&<div><h3>Series journey</h3><p>{metrics.series.inProgress} in progress · {metrics.series.caughtUp} caught up · {metrics.series.completed} completed</p><ul>{metrics.series.current.slice(0,5).map(row=><li key={row.id}>{row.title}: {row.completed}/{row.total} selected installments · {row.status.replace('-', ' ')}</li>)}</ul><p className="card-description">Series progress is current. Historical series state is not reconstructed from today&apos;s membership.</p></div>}
  <Link className="muse-button button-ghost" href="/collections">Open Collections →</Link>
 </InsightPanel>;
}
