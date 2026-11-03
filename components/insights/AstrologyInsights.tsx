import Link from 'next/link';
import type {ReturnTypeOfMetrics} from '@/lib/insights/metrics';
import {libraryEntry} from '@/lib/astrology/library';
import {InsightPanel} from './InsightPanel';
export function AstrologyInsights({metrics,error,onRetry}:{metrics:ReturnTypeOfMetrics['astrology'];error?:string;onRetry:()=>void}){
 if(!metrics.ready)return <InsightPanel title="Cosmic explorations"><p role={error?'alert':'status'}>{error||'Loading your saved astrology observations…'}</p><button type="button" className="muse-button button-ghost" onClick={onRetry}>Retry astrology records</button></InsightPanel>;
 const active=metrics.journalEntries+metrics.chartsCreated+metrics.placementsExplored+metrics.libraryVisits+metrics.eventsSaved+metrics.forecastViews;
 return <InsightPanel title="Cosmic explorations" kicker="Curiosity, without a score">
  {!active?<p>No astrology activity is recorded for this period. Explore a library entry, calculate your chart, or keep a reflection when you feel like it.</p>:<><dl className="muse-insight-small-metrics"><div><dt>Journal reflections</dt><dd>{metrics.journalEntries}</dd></div><div><dt>Library topics explored</dt><dd>{metrics.distinctLibraryTopics}<small>{metrics.libraryVisits} visits, deduplicated by topic and local day</small></dd></div><div><dt>Placements explored</dt><dd>{metrics.placementsExplored}</dd></div><div><dt>Charts calculated</dt><dd>{metrics.chartsCreated}</dd></div><div><dt>Celestial events kept</dt><dd>{metrics.eventsSaved}</dd></div></dl>{Object.keys(metrics.topicCounts).length>0&&<div><h3>Topics you returned to</h3><ul>{Object.entries(metrics.topicCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,count])=><li key={id}>{libraryEntry(id)?.title??'A retained library reference'} · {count} {count===1?'day':'days'}</li>)}</ul></div>}</>}
  <p className="card-description">Counts describe saved actions and dated reflections. They do not measure productivity or suggest that planetary events caused a personal outcome. Birth details and journal excerpts are excluded.</p><Link className="muse-button button-ghost" href="/whimsy/observatory">Visit The Cosmic Observatory →</Link>
 </InsightPanel>;
}
