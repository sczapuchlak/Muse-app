import type { ContextTag, Emotion, EmotionQuadrant, MoodCheckIn, MoodPreferences, PulseSignal } from './models';
import { validDate } from './dates';
import {mockProfile} from './mock-profile';
import { sampleContextTags } from './sample-taxonomies';
export type MoodPeriod = 'morning' | 'evening';
export type EmotionalCheckIn = Pick<MoodCheckIn, "id"|"emotionIds"|"causeTagIds"> & { date:string; period:MoodPeriod; energy:number|null; stress:number|null; overallDay:number|null; reflection:string; createdAt:string|null; updatedAt:string|null; timeZone:string };
export type MoodState = MoodPreferences & { records:EmotionalCheckIn[]; influences:ContextTag[] };
export const initialMoodState:MoodState = {records:[],favoriteEmotionIds:[],influences:sampleContextTags};
export function emptyCheckIn(date:string,period:MoodPeriod):EmotionalCheckIn {
 return {id:`mood-${date}-${period}`,date,period,emotionIds:[],causeTagIds:[],energy:null,stress:null,overallDay:null,reflection:'',createdAt:null,updatedAt:null,timeZone:mockProfile.timeZone};
}
export function hasMoodData(record:EmotionalCheckIn) {return !!(record.emotionIds.length||record.causeTagIds.length||record.reflection.trim()||[record.energy,record.stress,record.overallDay].some((n)=>n!==null));}
export type MoodPatch = Partial<Pick<EmotionalCheckIn,'emotionIds'|'causeTagIds'|'energy'|'stress'|'overallDay'|'reflection'>>;
/** One record per calendar date + period, shared by Daily Edit and Mood. Empty is missing, never zero. */
export function updateMood(state:MoodState,date:string,period:MoodPeriod,patch:MoodPatch,now:string,timeZone=mockProfile.timeZone):MoodState {
 if(!validDate(date)||!['morning','evening'].includes(period))return state;
 const existing=uniqueMoodRecords(state.records).find((record)=>record.date===date&&record.period===period);
 const current=existing??emptyCheckIn(date,period);
 const record={...current,...patch,createdAt:existing?(existing.createdAt??null):now,timeZone:existing?.timeZone??timeZone,updatedAt:now};
 for(const key of ['energy','stress','overallDay'] as PulseSignal[])if(record[key]!==null&&(!Number.isInteger(record[key])||record[key]! < 1||record[key]! > 10))return state;
 record.emotionIds=[...new Set(record.emotionIds)];record.causeTagIds=[...new Set(record.causeTagIds)].filter((id)=>state.influences.some((tag)=>tag.id===id)).slice(0,3);
 const rest=state.records.filter((item)=>item.date!==date||item.period!==period);
 return {...state,records:hasMoodData(record)?[...rest,record]:rest};
}
export function moodSummary(records:EmotionalCheckIn[],emotions:Emotion[]) {
 records=uniqueMoodRecords(records);
 const values=records.flatMap((record)=>record.overallDay===null?[]:[record.overallDay]);
 const counts=new Map<string,number>(); const families:Record<EmotionQuadrant,number>={red:0,blue:0,green:0,yellow:0};
 for(const record of records)for(const id of record.emotionIds){const emotion=emotions.find((item)=>item.id===id);if(!emotion)continue;counts.set(id,(counts.get(id)??0)+1);families[emotion.quadrant]++;}
 const signals=Object.fromEntries((['energy','stress','overallDay'] as const).map(key=>{const values=records.flatMap(record=>record[key]===null?[]:[record[key]]);return [key,{count:values.length,average:values.length?values.reduce((sum,n)=>sum+n,0)/values.length:null}];})) as Record<PulseSignal,{count:number;average:number|null}>;
 return {signals,count:records.length,dayCount:values.length,averageDay:values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null,families,frequent:[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4)};
}

/** Capture-time default only. Historical records retain their explicit session. */
export const moodSessionRule={eveningStartsAt:15} as const;
export function defaultMoodPeriod(now:Date,timeZone=mockProfile.timeZone,cutoff:number=moodSessionRule.eveningStartsAt):MoodPeriod {
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone,hour:'2-digit',hourCycle:'h23'}).format(now));
 return hour<cutoff?'morning':'evening';
}
/** The canonical identity is local date + explicit session. Legacy duplicates cannot inflate summaries. */
export function uniqueMoodRecords(records:EmotionalCheckIn[]):EmotionalCheckIn[] {
 const unique=new Map<string,EmotionalCheckIn>();for(const record of records){const key=`${record.date}/${record.period}`,previous=unique.get(key);if(!previous||(record.updatedAt??'')>(previous.updatedAt??''))unique.set(key,record);}return [...unique.values()];
}
