import {validDate} from './dates';
import type {RitualDefinition,RitualEntry,RitualState} from './rituals';
import {isScheduled} from './rituals';
import {measureDays,metricInfo,type DayMeasure,type MetricSpec,type ProgressSources} from './progress/engine';
import {movementCategoryLabels} from './progress/movement';

/**
 * Connected Rituals derive their dated values from an authoritative tracker instead of a manual check-off. The source
 * record stays the only record: nothing is copied while connected, so editing or deleting a workout, water log, reading
 * session, finished book or task recalculates the Ritual. Disconnecting writes exactly what was shown into ordinary
 * Ritual entries, so history survives a change of mode without being rewritten.
 */
export {connectionMetrics,compatibleMetrics,validConnection,type ConnectionMetric,type RitualConnection} from './ritual-connection-rules';
import {validConnection,type RitualConnection} from './ritual-connection-rules';
export type DerivedValue={ritualId:string;date:string;value:number;measured:number;recordIds:string[];incomplete:boolean;goal?:number};
/** #104: the shared water goal for a date — the goal saved with that day's log, else the current setting. */
export function waterGoalFor(sources:ProgressSources,date:string,unit:string){const day=sources.wellness?.water.find(w=>w.date===date),s=sources.wellness?.waterSettings;const goal=day?.goal??s?.goal,u=day?.unit??s?.unit??'oz';if(!goal||goal<=0)return undefined;return u===unit?goal:u==='oz'?Math.round(goal*29.5735):Math.round(goal/29.5735*10)/10;}

export const connectionSpec=(c:RitualConnection):MetricSpec=>({metric:c.metric,category:c.category,typeId:c.typeId,unit:c.unit});

export function connectionLabel(c:Pick<RitualConnection,'metric'|'category'|'unit'|'threshold'>,typeName?:string){
 const info=metricInfo[c.metric];
 const what=c.metric==='workouts'||c.metric==='workout-minutes'?`${typeName??(c.category?movementCategoryLabels[c.category]:'Any')} ${c.metric==='workouts'?'workouts':'workout minutes'}`.replace('Any workouts','Workouts').replace('Any workout minutes','Workout minutes'):info.label;
 return `${what} · ${info.owner}`;
}
export function connectionUnit(c:Pick<RitualConnection,'metric'|'unit'>){return c.metric==='water'?(c.unit??'oz'):metricInfo[c.metric].unit;}

/** Derived value for one measured day, shaped to the Ritual type. Zero is never derived: no record is not a "missed". */
function shape(ritual:RitualDefinition,connection:RitualConnection,day:DayMeasure,sharedGoal?:number){
 if(ritual.type==='checkbox')return day.value>=(sharedGoal??connection.threshold??1)?1:0;
 if(ritual.type==='weekly-target')return Math.floor(day.value);
 return Math.round(day.value*100)/100;
}

export function derivedValues(ritual:RitualDefinition,sources:ProgressSources,today:string,cache=new Map<string,Map<string,DayMeasure>>()):{values:DerivedValue[];available:boolean;issue?:string}{
 const connection=ritual.connection;
 if(!connection||!validConnection(ritual,connection))return {values:[],available:false};
 const key=JSON.stringify(connectionSpec(connection));
 let days=cache.get(key),issue:string|undefined,available=true;
 if(!days){const measured=measureDays(connectionSpec(connection),sources);days=measured.days;issue=measured.issue;available=measured.available;if(measured.available)cache.set(key,days);}
 const values:DerivedValue[]=[];
 for(const day of days.values()){
  if(day.date<connection.since||day.date>today||!isScheduled(ritual,day.date))continue;
  const shared=connection.followGoal&&connection.metric==='water'?waterGoalFor(sources,day.date,connection.unit??'oz'):undefined;
  const value=shape(ritual,connection,day,shared),goal=ritual.type==='checkbox'?undefined:shared;
  if(value>0&&value<=1000000)values.push({ritualId:ritual.id,date:day.date,value,measured:day.value,recordIds:day.recordIds,incomplete:!day.complete,...(goal?{goal}:{})});
 }
 return {values:values.sort((a,b)=>a.date.localeCompare(b.date)),available,issue};
}

/**
 * The Ritual state every surface displays: stored entries, with connected Rituals' derived values taking the place of
 * entries from their connection date onward. Derived entries are marked so editors stay read-only for them.
 */
export function withConnections(state:RitualState,sources:ProgressSources,today:string){
 const derived=new Map<string,DerivedValue>(),cache=new Map<string,Map<string,DayMeasure>>(),issues:string[]=[];let unavailable=false;
 const connected=state.rituals.filter(r=>r.connection);
 if(!connected.length||!validDate(today))return {state,derived,issues,unavailable};
 for(const ritual of connected){const result=derivedValues(ritual,sources,today,cache);if(!result.available)unavailable=true;if(result.issue)issues.push(result.issue);for(const value of result.values)derived.set(`${value.ritualId}/${value.date}`,value);}
 const entries:RitualEntry[]=state.entries.filter(e=>!derived.has(`${e.ritualId}/${e.date}`));
 for(const value of derived.values())entries.push({id:`${value.ritualId}/${value.date}`,ritualId:value.ritualId,date:value.date,value:value.value,updatedAt:'',derived:true,...(value.goal?{goal:value.goal}:{})});
 return {state:{...state,entries},derived,issues,unavailable};
}

/** Entries to store when a connection ends or changes: exactly the derived values that were being shown. */
export function materializeConnection(ritual:RitualDefinition,sources:ProgressSources,today:string){
 return derivedValues(ritual,sources,today).values.map(v=>({date:v.date,value:v.value}));
}
