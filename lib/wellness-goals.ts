import {shiftDate,validDate} from './dates';
import type {WaterUnit} from './water';
import {measureDays,periodEnd,periodStart,periodStarts,periodTotal,nextPeriod,type MetricSpec,type ProgressSources,type DayMeasure,type Period} from './progress/engine';

/**
 * Wellness goals are optional, independent and versioned. A target change adds a version effective from the start of
 * the period it was made in; earlier periods keep the version they were evaluated against. Pausing or retiring a goal
 * is a version too, so paused time is never counted as failure and history is never rewritten.
 */
export const goalMetrics=['workouts','strength-workouts','cardio-workouts','workout-minutes','water','nutrition-protein','nutrition-calories','nutrition-carbs','nutrition-fat'] as const;
export type GoalMetric=typeof goalMetrics[number];
export type GoalPeriod='day'|'week';
export type GoalDirection='atLeast'|'atMost';
export type GoalStatus='active'|'paused'|'inactive';
export type GoalVersion={effectiveFrom:string;target:number;unit:string;direction:GoalDirection;status:GoalStatus;recordedAt:string};
export type WellnessGoal={id:string;metric:GoalMetric;period:GoalPeriod;createdAt:string;versions:GoalVersion[]};

/**
 * `recorded` goals measure what happened. `planned` goals (nutrition) measure meals in the plan, which are not confirmed
 * intake, so their results are always worded as the plan meeting a target, never as the person achieving it.
 */
export type GoalBasis='recorded'|'planned';
export const goalMetricInfo:Record<GoalMetric,{label:string;unit:string;periods:GoalPeriod[];direction:GoalDirection;example:number;describe:string;basis:GoalBasis}>={
 workouts:{label:'Workouts',unit:'sessions',periods:['week','day'],direction:'atLeast',example:4,describe:'Any completed movement',basis:'recorded'},
 'strength-workouts':{label:'Strength workouts',unit:'sessions',periods:['week'],direction:'atLeast',example:3,describe:'Movement types classified as Strength',basis:'recorded'},
 'cardio-workouts':{label:'Cardio workouts',unit:'sessions',periods:['week'],direction:'atLeast',example:2,describe:'Movement types classified as Cardio',basis:'recorded'},
 'workout-minutes':{label:'Workout minutes',unit:'min',periods:['week','day'],direction:'atLeast',example:150,describe:'Durations recorded on completed movement',basis:'recorded'},
 water:{label:'Hydration',unit:'oz',periods:['day'],direction:'atLeast',example:80,describe:'Daily water total',basis:'recorded'},
 'nutrition-protein':{label:'Protein (planned)',unit:'g',periods:['day'],direction:'atLeast',example:100,describe:'Known protein across the day’s planned meals',basis:'planned'},
 'nutrition-calories':{label:'Calories (planned)',unit:'kcal',periods:['day'],direction:'atMost',example:2000,describe:'Known calories across the day’s planned meals',basis:'planned'},
 'nutrition-carbs':{label:'Carbs (planned)',unit:'g',periods:['day'],direction:'atLeast',example:200,describe:'Known carbs across the day’s planned meals',basis:'planned'},
 'nutrition-fat':{label:'Fat (planned)',unit:'g',periods:['day'],direction:'atLeast',example:60,describe:'Known fat across the day’s planned meals',basis:'planned'},
};
/** Hydration keeps its existing tracker goal (saved per day), so it is reported, not duplicated as a second goal. */
export const creatableGoalMetrics=goalMetrics.filter(metric=>metric!=='water');
/** Tracked elsewhere or not at all: listed so the UI can explain rather than invent a tracker. */
export const unsupportedGoalMetrics=[{label:'Steps',reason:'Muse does not record steps yet, and external health connections need separate approval.'},{label:'Sleep',reason:'Muse does not record sleep duration yet.'}];

export function goalSpec(goal:Pick<WellnessGoal,'metric'>,unit?:string):MetricSpec{
 switch(goal.metric){
 case 'strength-workouts':return {metric:'workouts',category:'strength'};
 case 'cardio-workouts':return {metric:'workouts',category:'cardio'};
 case 'water':return {metric:'water',unit:(unit==='mL'?'mL':'oz') as WaterUnit};
 default:return {metric:goal.metric};
 }
}

export function versionAt(goal:WellnessGoal,date:string):GoalVersion|undefined{
 let found:GoalVersion|undefined;
 for(const version of [...goal.versions].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)||a.recordedAt.localeCompare(b.recordedAt)))if(version.effectiveFrom<=date)found=version;
 return found;
}
export const currentVersion=(goal:WellnessGoal)=>[...goal.versions].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)||a.recordedAt.localeCompare(b.recordedAt)).at(-1);

/** Add or replace the version for the period containing `today`; earlier versions are untouched. */
export function withVersion(goal:WellnessGoal,today:string,change:Partial<Pick<GoalVersion,'target'|'unit'|'direction'|'status'>>,now:string):WellnessGoal{
 const from=periodStart(today,goal.period),base=versionAt(goal,from)??currentVersion(goal);
 if(!base&&(change.target===undefined||change.unit===undefined))throw Error('A new goal needs a target and unit.');
 const next:GoalVersion={effectiveFrom:from,target:change.target??base!.target,unit:change.unit??base!.unit,direction:change.direction??base?.direction??goalMetricInfo[goal.metric].direction,status:change.status??base?.status??'active',recordedAt:now};
 if(!(next.target>0&&next.target<=1000000))throw Error('Choose a target above zero.');
 return {...goal,versions:[...goal.versions.filter(v=>v.effectiveFrom!==from),next].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom))};
}
export function newGoal(metric:GoalMetric,period:GoalPeriod,target:number,unit:string,today:string,now:string,id:string,direction=goalMetricInfo[metric].direction):WellnessGoal{
 if(!goalMetricInfo[metric].periods.includes(period))throw Error('That period is not available for this goal.');
 return withVersion({id,metric,period,createdAt:now,versions:[]},today,{target,unit,direction,status:'active'},now);
}

export type GoalPeriodStatus='achieved'|'missed'|'unknown'|'in-progress'|'paused'|'inactive'|'upcoming';
export type GoalPeriodResult={start:string;end:string;status:GoalPeriodStatus;value:number;target:number|null;unit:string;direction:GoalDirection;recordIds:string[];recordedDays:number;incompleteDays:number};

export function evaluatePeriod(goal:WellnessGoal,days:Map<string,DayMeasure>,start:string,today:string):GoalPeriodResult{
 const version=versionAt(goal,start),end=periodEnd(start,goal.period),info=goalMetricInfo[goal.metric];
 const total=periodTotal(days,start,goal.period,today);
 const base={start,end,value:total.value,recordIds:total.recordIds,recordedDays:total.recordedDays,incompleteDays:total.incompleteDays,target:version?.target??null,unit:version?.unit??info.unit,direction:version?.direction??info.direction};
 if(!version||version.status==='inactive')return {...base,status:'inactive'};
 if(version.status==='paused')return {...base,status:'paused'};
 if(start>today)return {...base,status:'upcoming'};
 const met=version.direction==='atLeast'?total.value>=version.target:total.value<=version.target;
 const current=end>=today;
 if(version.direction==='atLeast'){
  if(met&&total.recordedDays)return {...base,status:'achieved'};
  if(current)return {...base,status:'in-progress'};
  if(!total.recordedDays||total.incompleteDays)return {...base,status:'unknown'};
  return {...base,status:'missed'};
 }
 if(!total.recordedDays)return {...base,status:current?'in-progress':'unknown'};
 if(!met)return {...base,status:'missed'};
 if(current)return {...base,status:'in-progress'};
 return {...base,status:total.incompleteDays?'unknown':'achieved'};
}

export function goalHistory(goal:WellnessGoal,sources:ProgressSources,today:string,count=12){
 if(!validDate(today))return {results:[] as GoalPeriodResult[],available:false,issue:'Choose a valid local date.'};
 const measured=measureDays(goalSpec(goal,currentVersion(goal)?.unit),sources);
 let start=periodStart(today,goal.period);const starts=[start];
 for(let i=1;i<count;i++){start=periodStart(shiftDate(start,-1),goal.period);starts.unshift(start);}
 // Water days convert per version unit, so measure again when a version uses another unit.
 const results=starts.map(s=>{const unit=versionAt(goal,s)?.unit;const days=goal.metric==='water'&&unit&&unit!==currentVersion(goal)?.unit?measureDays(goalSpec(goal,unit),sources).days:measured.days;return evaluatePeriod(goal,days,s,today);});
 return {results,available:measured.available,issue:measured.issue};
}

export type Adherence={achieved:number;missed:number;unknown:number;paused:number;inactive:number;inProgress:number;rate:number|null};
/** Share of decided periods only; unknown, paused, inactive and in-progress periods are never counted as missed. */
export function adherence(results:GoalPeriodResult[]):Adherence{
 const count=(status:GoalPeriodStatus)=>results.filter(r=>r.status===status).length;
 const achieved=count('achieved'),missed=count('missed');
 return {achieved,missed,unknown:count('unknown'),paused:count('paused'),inactive:count('inactive'),inProgress:count('in-progress'),rate:achieved+missed>0?achieved/(achieved+missed):null};
}

/** All periods of one goal between two dates (inclusive), for monthly/yearly reporting. */
export function goalResultsBetween(goal:WellnessGoal,sources:ProgressSources,start:string,end:string,today:string){
 const measured=measureDays(goalSpec(goal,currentVersion(goal)?.unit),sources);
 return periodStarts(start,end,goal.period).filter(s=>s<=today).map(s=>evaluatePeriod(goal,measured.days,s,today));
}
export {nextPeriod,type Period};

const recordedLabels:Record<GoalPeriodStatus,string>={achieved:'Met',missed:'Below target',unknown:'No complete record','in-progress':'In progress',paused:'Paused',inactive:'Not tracking',upcoming:'Upcoming'};
const plannedLabels:Record<GoalPeriodStatus,string>={achieved:'Plan meets target',missed:'Plan below target',unknown:'Plan incomplete','in-progress':'Planned so far',paused:'Paused',inactive:'Not tracking',upcoming:'Upcoming'};
/** Status wording for a goal; planned-nutrition goals never claim the target was achieved. */
export function goalStatusLabel(status:GoalPeriodStatus,basis:GoalBasis='recorded'){return (basis==='planned'?plannedLabels:recordedLabels)[status];}
