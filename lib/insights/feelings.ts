import {recordedFeelings} from '../feelings';
import {moodQuadrants,type EmotionQuadrant} from '../models';
import {emotionCatalog} from '../emotions';
import {within,rangeDays,type InsightRange} from './ranges';
import type {NormalizedInsights} from './normalize';
const average=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
export function moodMetrics(input:NormalizedInsights,range:InsightRange){
 const records=input.mood.records.filter((record)=>within(record.date,range));
 const observations=input.dailyPulse?.filter(item=>within(item.date,range));
 const byDate=rangeDays(range).map((date)=>{const pulse=observations?.find(item=>item.date===date);const day=records.filter((item)=>item.date===date);return {date,checkins:day.length,energy:observations?pulse?.energy??null:average(day.flatMap((item)=>item.energy===null?[]:[item.energy])),stress:observations?pulse?.stress??null:average(day.flatMap((item)=>item.stress===null?[]:[item.stress])),day:observations?pulse?.overallDay??null:average(day.flatMap((item)=>item.overallDay===null?[]:[item.overallDay]))};});
 const tally=new Map<string,{id:string;label:string;emoji:string;quadrant:EmotionQuadrant;count:number}>(),occurrences:Record<EmotionQuadrant,number>={red:0,blue:0,green:0,yellow:0};
 // Each recorded feeling counts in the quadrant the person chose for that entry (a personal interpretation, or a custom feeling), never re-read from today's vocabulary.
 for(const record of records)for(const feeling of recordedFeelings(record,emotionCatalog)){occurrences[feeling.quadrant]++;const row=tally.get(feeling.id);if(row)row.count++;else tally.set(feeling.id,{id:feeling.id,label:feeling.name,emoji:feeling.emoji,quadrant:feeling.quadrant,count:1});}
 const emotions=[...tally.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
 const families=(Object.keys(moodQuadrants) as EmotionQuadrant[]).map((quadrant)=>({id:quadrant,label:moodQuadrants[quadrant].label,count:occurrences[quadrant]}));
 const influences=input.mood.influences.map((tag)=>({id:tag.id,label:tag.name,count:records.filter((item)=>item.causeTagIds.includes(tag.id)).length})).filter((row)=>row.count).sort((a,b)=>b.count-a.count);
 const averageSignal=(key:'energy'|'stress'|'overallDay')=>{const values=(observations??records).flatMap((item)=>item[key]===null?[]:[item[key]!]);return {value:average(values),n:values.length};};
 const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,i)=>{const days=byDate.filter((day)=>(new Date(`${day.date}T12:00:00Z`).getUTCDay()+6)%7===i&&day.day!==null);return {label,day:days.length>=3?average(days.map((day)=>day.day!)):null,n:days.length};});
 return {records,byDate,emotions,families,influences,energy:averageSignal('energy'),stress:averageSignal('stress'),day:averageSignal('overallDay'),weekday,loggedDays:new Set(records.map((record)=>record.date)).size};
}
