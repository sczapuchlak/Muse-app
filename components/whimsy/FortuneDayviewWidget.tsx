'use client';
import Link from 'next/link';
import {MuseCard} from '@/components/MuseCard';
import {MuseStar} from '@/components/MuseStar';
import {fortuneById} from '@/lib/whimsy/fortunes';
import {useWhimsyData} from './WhimsyData';
export function FortuneDayviewWidget({date}:{date:string}){const {records,status}=useWhimsyData();if(!status.loaded||!records?.widgets.some(item=>item.experience==='fortunes'&&item.enabled))return null;const assignment=records.fortunes.find(item=>item.date===date&&item.kind==='cookie'&&(!item.slot||item.slot==='daily'));const content=fortuneById(assignment?.content.contentId??'');return <MuseCard id="daily-fortune"><div className="muse-card-header"><h2 id="daily-fortune-title">Daily Fortune <MuseStar size={15} prismatic/></h2></div><p className="card-description">{content?.body??'A little mystery is waiting in Whimsy.'}</p><Link className="muse-button button-ghost" href="/whimsy/fortunes">{content?'Visit the cabinet':'Open your fortune'} →</Link></MuseCard>;}
