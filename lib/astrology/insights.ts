import {validDate} from '@/lib/dates';
import {insightAvailability,type InsightSourceStatus} from '@/lib/insights/sources';
import type {AstrologyActivity,CosmicJournalEntry} from './models';
export type AstrologyInsightSource={activity:AstrologyActivity[];journal:Pick<CosmicJournalEntry,'id'|'date'|'reference'>[];status:InsightSourceStatus};
/** Deliberately excludes birth profile, chart inputs, private text and mood correlations. */
export function astrologyMetrics(source:AstrologyInsightSource|undefined,range:{start:string;end:string}){
 if(!validDate(range.start)||!validDate(range.end)||range.start>range.end)throw Error('Choose an ordered local-date range.');
 if(!source||!insightAvailability([source.status]).ready)return {ready:false as const};
 const within=(date:string)=>validDate(date)&&date>=range.start&&date<=range.end;
 const activity=[...new Map(source.activity.filter(row=>within(row.date)).map(row=>[`${row.user_id}/${row.kind}/${row.reference_id}/${row.date}`,row])).values()];
 const journal=[...new Map(source.journal.filter(row=>within(row.date)).map(row=>[row.id,row])).values()];
 const count=(kind:AstrologyActivity['kind'])=>activity.filter(row=>row.kind===kind).length;
 const topics=activity.filter(row=>row.kind==='library-viewed'),topicCounts=Object.fromEntries([...new Set(topics.map(row=>row.reference_id))].map(id=>[id,topics.filter(row=>row.reference_id===id).length]));
 return {ready:true as const,forecastViews:count('forecast-viewed'),forecastsSaved:count('forecast-saved'),journalEntries:journal.length,chartsCreated:count('chart-created'),placementsExplored:count('chart-explored'),libraryVisits:topics.length,distinctLibraryTopics:Object.keys(topicCounts).length,topicCounts,eventsSaved:count('event-saved'),activityDays:new Set(activity.map(row=>row.date)).size,journalSourceIds:journal.map(row=>row.id),activitySourceIds:activity.map(row=>`${row.kind}/${row.reference_id}/${row.date}`)};
}
export function astrologyRecap(source:AstrologyInsightSource|undefined,range:{start:string;end:string}){const metrics=astrologyMetrics(source,range);return {range,source:'astrology' as const,...metrics};}
