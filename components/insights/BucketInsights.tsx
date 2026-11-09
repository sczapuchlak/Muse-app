'use client';
import Link from 'next/link';
import {dateLabel} from '@/lib/dates';
import type {InsightRange} from '@/lib/insights/ranges';
import {bucketTrends} from '@/lib/bucket-list/logic';
import {useBucketList} from '../envision/bucket/useBucketList';
import {YearChip,yearStyle} from '../envision/bucket/BucketViews';
import {InsightPanel} from './InsightPanel';
import '../envision/aspirations/Aspirations.css';
import '../envision/bucket/BucketList.css';

/**
 * The Bucket List in Insights (#84): what came true in the selected range, by year and category. Deliberately no
 * "percent of the list done" — a life wishlist isn't a quota.
 */
export function BucketInsights({range,today}:{range:InsightRange;today:string}){
 const {list,entries,status}=useBucketList(today);
 const title='Dreams that came true';
 if(!status.loaded||!list)return <InsightPanel kicker="Bucket List" title={title}><p className="card-description" role="status">Loading…</p></InsightPanel>;
 if(status.error)return <InsightPanel kicker="Bucket List" title={title}><p className="card-description">{status.error}</p></InsightPanel>;
 if(!entries.length)return <InsightPanel kicker="Bucket List" title={title}><p className="card-description">Dreams you cross off in Envision will gather here. <Link href="/envision?view=bucket">Start your list</Link></p></InsightPanel>;
 const t=bucketTrends(entries,range.start,range.end);
 return <InsightPanel kicker="Bucket List" title={title}>
  {!t.completed.length?<p className="card-description">Nothing crossed off between {dateLabel(range.start)} and {dateLabel(range.end)}. Dreams keep.</p>:<>
   <dl className="muse-aspirations-stats"><div><dt>Crossed off</dt><dd>{t.completed.length}</dd><small className="small-label">In this period</small></div>
    {t.byYear.map(y=><div key={y.year}><dt><YearChip list={list} year={y.year}/></dt><dd>{y.count}</dd><small className="small-label">in {y.year}</small></div>)}</dl>
   {t.byCategory.length>1&&<p className="small-label">{t.byCategory.map(c=>`${c.category} ${c.count}`).join(' · ')}</p>}
   <ul className="muse-bucket-pills">{t.completed.slice(-12).reverse().map(e=><li key={e.id}><span className="muse-bucket-pill" data-done style={yearStyle(list,Number(e.completedOn!.slice(0,4)))}>{e.icon?`${e.icon} `:''}<span className="muse-bucket-title-text">{e.title}</span><small>{dateLabel(e.completedOn!)}</small></span></li>)}</ul>
  </>}
  <p className="small-label">From your Bucket List in Envision. <Link href="/envision?view=bucket">Open it</Link></p>
 </InsightPanel>;
}
