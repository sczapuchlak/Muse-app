"use client";
import {useMemo} from 'react';
import {useWhimsyData} from '../whimsy/WhimsyData';
import {useCollectionsData} from '../collections/CollectionsData';
import {useRituals} from '../rituals/RitualStore';
import {useDailyData} from '../daily/DailyData';
import {todayInTimeZone} from '@/lib/dates';
import {adapters,type SourceBundle} from '@/lib/profile/adapters';
import type {Showcase} from '@/lib/profile/persistence';

/** The owner's own records, used only on their device to pick items and refresh snapshots. */
export function useShowcaseSources(){
 const whimsy=useWhimsyData(),collections=useCollectionsData(),rituals=useRituals(),{profile}=useDailyData();
 const loaded=whimsy.status.loaded&&collections.loaded&&rituals.status.loaded;
 const bundle=useMemo<SourceBundle>(()=>({books:whimsy.records?.books??[],questCompletions:whimsy.records?.questCompletions??[],media:collections.records.media,curated:collections.records.curated,curatedMembers:collections.records.curatedMembers,rituals:rituals.state,today:todayInTimeZone(profile.timeZone)}),[whimsy.records,collections.records,rituals.state,profile.timeZone]);
 return {bundle,loaded:!!loaded};
}
/** Items whose source no longer exists (or has come back). Written victories have no source and never go missing. */
export function sourceStates(showcases:Showcase[],bundle:SourceBundle){
 const missing:string[]=[],restored:string[]=[];
 for(const showcase of showcases)for(const item of showcase.items){
  if(item.kind==='victory'||!item.sourceId)continue;
  const exists=!!adapters[item.kind].display(bundle,item.sourceId,['title']);
  if(!exists&&item.sourceState==='ok')missing.push(item.id);if(exists&&item.sourceState==='missing')restored.push(item.id);
 }
 return {missing,restored};
}
