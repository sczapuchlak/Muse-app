import {nourishReducer,defaultGrocerySections,type NourishAction,type NourishState} from './nourish';
import type {DailyMealAssignment,DailyMovement,MovementType} from './models';
import type {DailyWater,WaterSettings} from './water';
import type {WellnessGoal} from './wellness-goals';
import type {MovementCategory} from './progress/movement';
import {isMovementOutcome,prunedOutcomes,type MovementStatus} from './movement-status';
/** One completed activity per type and date. Duration is optional; unknown stays unknown, never zero. */
export type MovementRecord={id:string;date:string;typeId:string;timeZone?:string;createdAt?:string;durationMinutes?:number|null};
export type WellnessState={assignments:DailyMealAssignment[];savedMeals:NourishState['savedMeals'];water:DailyWater[];waterSettings:WaterSettings|null;types:MovementType[];quickIds:string[];recentIds:string[];movement:DailyMovement[];activities:MovementRecord[];groceryItems:NourishState['groceryItems'];grocerySections:NourishState['grocerySections'];
 /** Versioned goals. Undefined until the server supports goals, so the UI never offers what cannot be saved. */
 goals?:WellnessGoal[];
 /** True once the server stores movement outcomes (#112); until then only Planned/Completed are offered. */
 movementOutcomes?:boolean};
export const emptyWellness=():WellnessState=>({assignments:[],savedMeals:[],water:[],waterSettings:null,types:[],quickIds:[],recentIds:[],movement:[],activities:[],groceryItems:[],grocerySections:defaultGrocerySections.map(section=>({...section}))});
export type WellnessAction=
 |{kind:'meal';action:NourishAction}
 |{kind:'water';date:string;mode:'add'|'set';amount:number;settings:WaterSettings}
 |{kind:'water/remove';date:string}
 |{kind:'water/settings';settings:WaterSettings;date?:string}
 |{kind:'movement';day?:DailyMovement;types:MovementType[];quickIds:string[];recentIds:string[]}
 |{kind:'movement/complete';date:string;typeId:string;complete:boolean;id:string}
 |{kind:'movement/status';date:string;typeId:string;status:MovementStatus;id:string}
 |{kind:'activity/save';record:MovementRecord}
 |{kind:'activity/remove';id:string}
 |{kind:'activity/duration';id:string;durationMinutes:number|null}
 |{kind:'type/category';id:string;category:MovementCategory}
 |{kind:'goal/save';goal:WellnessGoal};
export function wellnessReducer(state:WellnessState,action:WellnessAction):WellnessState{
 switch(action.kind){
 case 'meal':{const next=nourishReducer(state,action.action);return {...state,assignments:next.assignments,savedMeals:next.savedMeals,groceryItems:next.groceryItems,grocerySections:next.grocerySections};}
 case 'water':{const old=state.water.find(d=>d.date===action.date),settings=old?.goal&&old.unit?{...action.settings,goal:old.goal,unit:old.unit}:action.settings;const total=action.mode==='add'?(old?.total??0)+action.amount:action.amount;if(!Number.isFinite(total)||total<0)return state;const day={...old,date:action.date,total,goal:settings.goal,unit:settings.unit};return {...state,water:old?state.water.map(d=>d.date===day.date?day:d):[...state.water,day]};}
 case 'water/remove':return {...state,water:state.water.filter(d=>d.date!==action.date)};
 case 'water/settings':return {...state,waterSettings:action.settings,water:state.water.map(d=>d.date===action.date?{...d,goal:action.settings.goal}:d)};
 case 'movement':{const day=action.day&&{...action.day,outcomes:prunedOutcomes(action.day)};return {...state,types:action.types,quickIds:action.quickIds,recentIds:action.recentIds,movement:day?(state.movement.some(d=>d.date===day.date)?state.movement.map(d=>d.date===day.date?day:d):[...state.movement,day]):state.movement};}
 case 'movement/status':{
  // Completed is the movement record; Skipped/Rest/Sick are outcomes on a planned movement; Planned clears both.
  const old=state.movement.find(d=>d.date===action.date)??{date:action.date,typeIds:[]};
  const outcome=isMovementOutcome(action.status)?action.status:undefined;
  const typeIds=outcome&&!old.typeIds.includes(action.typeId)?[...old.typeIds,action.typeId]:old.typeIds;
  const outcomes={...prunedOutcomes(old)};delete outcomes[action.typeId];if(outcome)outcomes[action.typeId]=outcome;
  const day={...old,typeIds,outcomes};
  const movement=state.movement.some(d=>d.date===day.date)?state.movement.map(d=>d.date===day.date?day:d):[...state.movement,day];
  const has=state.activities.some(r=>r.date===action.date&&r.typeId===action.typeId);
  const activities=action.status==='completed'?(has?state.activities:[...state.activities,{id:action.id,date:action.date,typeId:action.typeId}]):state.activities.filter(r=>r.date!==action.date||r.typeId!==action.typeId);
  return {...state,movement,activities};}
 case 'movement/complete':{const exists=state.activities.some(r=>r.date===action.date&&r.typeId===action.typeId);if(action.complete)return exists?state:{...state,activities:[...state.activities,{id:action.id,date:action.date,typeId:action.typeId}]};return {...state,activities:state.activities.filter(r=>r.date!==action.date||r.typeId!==action.typeId)};}
 case 'activity/save':return {...state,activities:state.activities.some(r=>r.id===action.record.id)?state.activities.map(r=>r.id===action.record.id?action.record:r):[...state.activities,action.record]};
 case 'activity/remove':return {...state,activities:state.activities.filter(r=>r.id!==action.id)};
 case 'activity/duration':{const value=action.durationMinutes;if(value!==null&&!(Number.isInteger(value)&&value>=1&&value<=1440))return state;return {...state,activities:state.activities.map(r=>r.id===action.id?{...r,durationMinutes:value}:r)};}
 case 'type/category':return {...state,types:state.types.map(t=>t.id===action.id?{...t,category:action.category}:t)};
 case 'goal/save':{if(!state.goals)return state;const goals=state.goals.some(g=>g.id===action.goal.id)?state.goals.map(g=>g.id===action.goal.id?action.goal:g):[...state.goals,action.goal];return {...state,goals};}
 }
}
