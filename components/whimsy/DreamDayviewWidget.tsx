'use client';
import Link from 'next/link';
import {MuseCard} from '@/components/MuseCard';
import {MuseStar} from '@/components/MuseStar';
import {dateLabel} from '@/lib/dates';
import {useWhimsyData} from './WhimsyData';
/** Opt-in projection only; never copies or infers a dream entry. */
export function DreamDayviewWidget({date}:{date:string}){const {records,status}=useWhimsyData();if(!status.loaded||!records?.widgets.some(item=>item.experience==='dreamscapes'&&item.enabled))return null;const count=records.dreams.filter(item=>item.date===date).length;return <MuseCard id="daily-dreamscapes"><div className="muse-card-header"><h2 id="daily-dreamscapes-title">Dreamscapes <MuseStar size={15} prismatic/></h2></div><p className="card-description">{count?`${count} ${count===1?'dream':'dreams'} recorded for ${dateLabel(date)}.`:'A place for what you remember from sleep.'}</p><Link href="/whimsy/dreamscapes" className="muse-button button-ghost">{count?'Open Dream Diary':'Capture a Dream'} →</Link></MuseCard>;}
