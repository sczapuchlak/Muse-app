"use client";
import {useEffect,useMemo,useState} from 'react';
import {useWhimsyData} from '../whimsy/WhimsyData';
import {useAstrologyData} from '../astrology/AstrologyData';
import {useMoney} from '../money/MoneyStore';
import {useDailyData} from '../daily/DailyData';
import {useShowcaseSources} from '../profile/useShowcaseSources';
import {useCollectionsData} from '../collections/CollectionsData';
import {useAspirations} from '../rituals/aspirations/useAspirations';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {readDays} from '@/lib/data/daily';
import {shiftDate,todayInTimeZone} from '@/lib/dates';
import type {StreamBundle,StreamMood} from '@/lib/stream/adapters';

/**
 * The author's own records, read on their device to pick what to share and build the snapshot. Nothing here is sent
 * anywhere until they publish, and then only the fields they approved.
 */
export function useStreamSources(){
 const {bundle:base,loaded:baseLoaded}=useShowcaseSources();
 const whimsy=useWhimsyData(),astrology=useAstrologyData(),money=useMoney(),{profile}=useDailyData(),collections=useCollectionsData(),aspirations=useAspirations();
 const [moods,setMoods]=useState<StreamMood[]|null>(null);
 useEffect(()=>{let cancelled=false;const end=todayInTimeZone(profile.timeZone),start=shiftDate(end,-60);
  readDays(createMuseBrowserClient(),start,end).then(days=>{if(cancelled)return;
   setMoods(Object.entries(days).flatMap(([date,day])=>day.checkins.map(c=>({id:c.id,date,period:c.period as 'morning'|'evening',emotionIds:c.checkin_emotions.map(e=>e.emotion_id)}))).sort((a,b)=>b.date.localeCompare(a.date)));
  },()=>{if(!cancelled)setMoods([]);});
  return()=>{cancelled=true;};},[profile.timeZone]);
 const bundle=useMemo<StreamBundle>(()=>({...base,moods:moods??[],dreams:whimsy.records?.dreams??[],tarot:whimsy.records?.tarot??[],fortunes:whimsy.records?.fortunes??[],saved:whimsy.records?.saved??[],
  chart:astrology.records.chart?{id:astrology.records.chart.id,payload:astrology.records.chart.payload}:null,cards:money.state?.cards??[],bills:money.state?.bills??[],
  sessions:whimsy.records?.sessions??[],episodes:collections.records.episodes,seasons:collections.records.seasons,activity:collections.records.activity,aspirations:aspirations.aspirations,aspirationUpdates:aspirations.updates}),
  [base,moods,whimsy.records,astrology.records.chart,money.state,collections.records,aspirations.aspirations,aspirations.updates]);
 return {bundle,loaded:baseLoaded&&moods!==null};
}
