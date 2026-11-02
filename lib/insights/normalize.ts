import type {MovementRecord} from '../wellness';
import type {DailyExpression} from '../daily-expression';
import type {DailyPulseObservation} from '../data/daily-projections';
import type {PlannerState} from '../planner';
import type {RitualState} from '../rituals';
import type {MoodState} from '../mood';
import type {MoneyState} from '../money';
import type {NourishState} from '../nourish';
import type {DailyMovement,MovementType} from '../models';
import type {DailyWater} from '../water';
import {validDate} from '../dates';
export type SourceKind='prototype-session'|'manual'|'imported';
export type SourceInfo={kind:SourceKind;provider?:string};
export type DatedSource<T>={record:T;source:SourceInfo};
export type InsightsInput={whimsy?:{sources:import('../whimsy/models').WhimsySources;status:import('./sources').InsightSourceStatus};planner:PlannerState;rituals:RitualState;mood:MoodState;dailyPulse?:DailyPulseObservation[];dailyEntries?:(DailyExpression&{date:string;id:string})[];activities?:MovementRecord[];money:MoneyState;nourish:NourishState;movement:DailyMovement[];movementTypes?:MovementType[];water:DailyWater[];timeZone:string;today:string;source:SourceInfo};
/** Future adapters must resolve cross-source external IDs before these canonical records reach metrics. */
export type NormalizedInsights=InsightsInput&{quality:{duplicatesRemoved:number;invalidDailyDates:number;invalidNumericRecords:number};provenance:{module:string;source:SourceInfo;count:number}[]};
function unique<T>(items:T[],key:(item:T)=>string,updated:(item:T)=>string=()=> ''):T[]{const map=new Map<string,T>();for(const item of items){const id=key(item),previous=map.get(id);if(!previous||updated(item)>=updated(previous))map.set(id,item);}return [...map.values()];}
export function dailySessionRecords(records:Record<string,unknown>):{movement:DailyMovement[];water:DailyWater[]} {
 const movement:DailyMovement[]=[],water:DailyWater[]=[];
 for(const [key,value] of Object.entries(records)){if(!value||typeof value!=='object')continue;const record=value as Record<string,unknown>;const [date,kind]=key.split('/');if(!validDate(date)||record.date!==date)continue;
 if(kind==='movement'&&Array.isArray(record.typeIds)&&record.typeIds.every((id)=>typeof id==='string'))movement.push({date,typeIds:[...new Set(record.typeIds as string[])]});
 if(kind==='water'&&typeof record.total==='number'&&Number.isFinite(record.total)&&record.total>=0)water.push({date,total:record.total,...(typeof record.goal==='number'&&Number.isFinite(record.goal)&&record.goal>0?{goal:record.goal}:{}),...(record.unit==='oz'||record.unit==='mL'?{unit:record.unit}:{})});
 }return {movement,water};
}
export function normalizeInsights(input:InsightsInput):NormalizedInsights {
 let duplicatesRemoved=0,invalidDailyDates=0,invalidNumericRecords=0;
 const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
 const cents=(value:unknown)=>finite(value)&&Number.isSafeInteger(value);
 function dedupe<T>(items:T[],key:(item:T)=>string,updated?:(item:T)=>string){const result=unique(items,key,updated);duplicatesRemoved+=items.length-result.length;return result;}
 function daily<T extends {date:string}>(items:T[]){return items.filter((item)=>{if(validDate(item.date))return true;invalidDailyDates++;return false;});}
 const planner={...input.planner,completionHistory:input.planner.completionHistory===undefined?undefined:dedupe(input.planner.completionHistory,item=>item.id),tasks:dedupe(input.planner.tasks,(item)=>item.id,(item)=>item.completedAt??item.createdAt).map((item)=>{if(!finite(item.actualMinutes)||item.estimatedMinutes!==undefined&&!finite(item.estimatedMinutes))invalidNumericRecords++;return {...item,actualMinutes:finite(item.actualMinutes)?item.actualMinutes:0,estimatedMinutes:finite(item.estimatedMinutes)?item.estimatedMinutes:undefined};}),events:dedupe(input.planner.events,(item)=>item.id)};
 const rituals={...input.rituals,rituals:dedupe(input.rituals.rituals,(item)=>item.id),entries:dedupe(daily(input.rituals.entries),(item)=>`${item.ritualId}/${item.date}`,(item)=>item.updatedAt).filter((item)=>{if(finite(item.value))return true;invalidNumericRecords++;return false;})};
 const mood={...input.mood,records:dedupe(daily(input.mood.records),(item)=>`${item.date}/${item.period}`,(item)=>item.updatedAt??'').map((item)=>{const clean={...item};let invalid=false;for(const key of ['energy','stress','overallDay'] as const){if(clean[key]===undefined){clean[key]=null;continue;}if(clean[key]!==null&&(!finite(clean[key])||!Number.isInteger(clean[key])||clean[key]!<1||clean[key]!>10)){clean[key]=null;invalid=true;}}if(invalid)invalidNumericRecords++;return clean;})};
 const money={...input.money,transactions:dedupe(daily(input.money.transactions),(item)=>item.id).filter((item)=>{const valid=cents(item.amountCents)&&item.splits.every((split)=>cents(split.amountCents))&&item.splits.reduce((sum,split)=>sum+split.amountCents,0)<=item.amountCents;if(!valid)invalidNumericRecords++;return valid;}),payments:dedupe(daily(input.money.payments),(item)=>item.id).filter((item)=>{if(cents(item.amountCents))return true;invalidNumericRecords++;return false;}),allocations:dedupe(input.money.allocations,(item)=>item.id).filter((item)=>{if(cents(item.plannedCents))return true;invalidNumericRecords++;return false;}).map((item)=>{if(item.actualCents!==undefined&&!cents(item.actualCents))invalidNumericRecords++;return {...item,actualCents:item.actualCents===undefined||cents(item.actualCents)?item.actualCents:undefined};}),paychecks:dedupe(input.money.paychecks,(item)=>item.id).map((item)=>({...item,actualCents:cents(item.actualCents)?item.actualCents:undefined,expectedCents:cents(item.expectedCents)?item.expectedCents:undefined})),recurring:dedupe(input.money.recurring,(item)=>item.id).map((item)=>({...item,amountCents:cents(item.amountCents)?item.amountCents:undefined}))};
 const nourish={...input.nourish,assignments:dedupe(daily(input.nourish.assignments),(item)=>item.id).map((item)=>{if(!item.nutrition)return item;const nutrition={...item.nutrition};let invalid=false;for(const key of ['calories','protein','carbs','fat'] as const){if(nutrition[key]==null){delete nutrition[key];continue;}if(!finite(nutrition[key])){delete nutrition[key];invalid=true;}}if(invalid)invalidNumericRecords++;return {...item,nutrition};}),savedMeals:dedupe(input.nourish.savedMeals,(item)=>item.id)};
 const movement=dedupe(daily(input.movement),(item)=>item.date),water=dedupe(daily(input.water),(item)=>item.date).filter((item)=>{if(finite(item.total))return true;invalidNumericRecords++;return false;}).map((item)=>({...item,goal:finite(item.goal)&&item.goal>0?item.goal:undefined}));
 const activities=dedupe(dedupe(daily(input.activities??[]),item=>item.id),item=>`${item.date}/${item.typeId}`);
 const dailyPulse=input.dailyPulse===undefined?undefined:dedupe(daily(input.dailyPulse),item=>item.date).map(item=>{const clean={...item};for(const key of ['energy','stress','overallDay'] as const){const value=clean[key];if(value==null){clean[key]=null;continue;}if(!Number.isInteger(value)||value<1||value>10){clean[key]=null;invalidNumericRecords++;}}return clean;});
 const dailyEntries=input.dailyEntries===undefined?undefined:dedupe(daily(input.dailyEntries),item=>item.date);
 return {...input,planner,rituals,mood,money,nourish,movement,activities,water,dailyPulse,dailyEntries,quality:{duplicatesRemoved,invalidDailyDates,invalidNumericRecords},provenance:[{module:'Planner',count:planner.tasks.length},{module:'Rituals',count:rituals.entries.length},{module:'Mood',count:mood.records.length},{module:'Money',count:money.transactions.length},{module:'Wellness',count:nourish.assignments.length},{module:'Daily Edit',count:movement.length+activities.length+water.length}].map(item=>({...item,source:input.source}))};
}
