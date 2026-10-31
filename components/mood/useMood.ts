'use client';
import {useMuseState} from '../MuseSession';
import {useDailyData,useDailyDay} from '../daily/DailyData';
import {emotionalRecords} from '@/lib/data/daily-store';
import {emptyCheckIn,type MoodPatch,type MoodPeriod,type MoodState} from '@/lib/mood';
/** One shared projection, with session identity independent from daily Pulse. */
export function useMood(date:string){
 const {snapshot,store,profile}=useDailyData();useDailyDay(date);
 const [sessions,setSessions]=useMuseState<Record<string,MoodPeriod>>('mood-sessions',{},true);
 const period=sessions[date]??store?.period(date)??'evening';
 const state:MoodState={records:emotionalRecords(snapshot.days),influences:snapshot.influences,favoriteEmotionIds:[]};
 const record=state.records.find(item=>item.date===date&&item.period===period)??{...emptyCheckIn(date,period),timeZone:profile.timeZone};
 function setPeriod(period:MoodPeriod,forDate=date){setSessions(current=>({...current,[forDate]:period}));}
 function update(patch:Pick<MoodPatch,'emotionIds'|'causeTagIds'|'reflection'>){setPeriod(period);store?.edit(date,{kind:period,patch});}
 return {state,record,period,setPeriod,update,store};
}
