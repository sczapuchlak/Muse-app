import {moodQuadrants,type EmotionQuadrant} from '../models';
import {emotionCatalog} from '../emotions';
import {within,rangeDays,type InsightRange} from './ranges';
import type {NormalizedInsights} from './normalize';
const average=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
export function moodMetrics(input:NormalizedInsights,range:InsightRange){
 const records=input.mood.records.filter((record)=>within(record.date,range));
 const byDate=rangeDays(range).map((date)=>{const day=records.filter((item)=>item.date===date);return {date,checkins:day.length,energy:average(day.flatMap((item)=>item.energy===null?[]:[item.energy])),stress:average(day.flatMap((item)=>item.stress===null?[]:[item.stress])),day:average(day.flatMap((item)=>item.overallDay===null?[]:[item.overallDay]))};});
 const emotions=emotionCatalog.map((emotion)=>({id:emotion.id,label:emotion.name,emoji:emotion.emoji,quadrant:emotion.quadrant,count:records.filter((item)=>item.emotionIds.includes(emotion.id)).length})).filter((row)=>row.count).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
 const families=(Object.keys(moodQuadrants) as EmotionQuadrant[]).map((quadrant)=>({id:quadrant,label:moodQuadrants[quadrant].label,count:emotions.filter((item)=>item.quadrant===quadrant).reduce((sum,item)=>sum+item.count,0)}));
 const influences=input.mood.influences.map((tag)=>({id:tag.id,label:tag.name,count:records.filter((item)=>item.causeTagIds.includes(tag.id)).length})).filter((row)=>row.count).sort((a,b)=>b.count-a.count);
 const averageSignal=(key:'energy'|'stress'|'overallDay')=>{const values=records.flatMap((item)=>item[key]===null?[]:[item[key]!]);return {value:average(values),n:values.length};};
 const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,i)=>{const days=byDate.filter((day)=>(new Date(`${day.date}T12:00:00Z`).getUTCDay()+6)%7===i&&day.day!==null);return {label,day:days.length>=3?average(days.map((day)=>day.day!)):null,n:days.length};});
 return {records,byDate,emotions,families,influences,energy:averageSignal('energy'),stress:averageSignal('stress'),day:averageSignal('overallDay'),weekday,loggedDays:new Set(records.map((record)=>record.date)).size};
}
