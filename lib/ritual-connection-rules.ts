import {validDate} from './dates';
import type {WaterUnit} from './water';
import type {MovementCategory} from './progress/movement';

/** Leaf rules shared by the Rituals reducer and the connection engine (no runtime import cycle). */
type RitualType="checkbox"|"numeric"|"duration"|"weekly-target"|"category";
export const connectionMetrics=['water','workouts','workout-minutes','reading-minutes','reading-pages','books-finished','tasks-completed'] as const;
export type ConnectionMetric=typeof connectionMetrics[number];
export type RitualConnection={metric:ConnectionMetric;since:string;category?:MovementCategory;typeId?:string;unit?:WaterUnit;threshold?:number;/** #104: water only — grade each date against that day's shared water goal instead of the ritual's own goal. */followGoal?:boolean};

/** Which tracker kinds fit each Ritual type: counts for weekly targets, minutes for durations, anything for check-offs. */
export function compatibleMetrics(type:RitualType):ConnectionMetric[]{
 if(type==='category')return []; // A category is a choice you log, not a count Muse can derive.
 if(type==='checkbox')return [...connectionMetrics];
 if(type==='duration')return ['workout-minutes','reading-minutes'];
 if(type==='weekly-target')return ['workouts','books-finished','tasks-completed'];
 return ['water','workouts','reading-pages','books-finished','tasks-completed','workout-minutes','reading-minutes'];
}
export function validConnection(ritual:{type:RitualType},connection:RitualConnection){
 if(!connectionMetrics.includes(connection.metric)||!compatibleMetrics(ritual.type).includes(connection.metric)||!validDate(connection.since))return false;
 if(connection.threshold!==undefined&&!(Number.isFinite(connection.threshold)&&connection.threshold>0&&connection.threshold<=1000000))return false;
 if(connection.unit!==undefined&&!['oz','mL'].includes(connection.unit))return false;
 if(connection.followGoal!==undefined&&(typeof connection.followGoal!=='boolean'||connection.metric!=='water'))return false;
 return true;
}
