import {nourishReducer,defaultGrocerySections,type NourishAction,type NourishState} from './nourish';
import type {DailyMealAssignment,DailyMovement,MovementType} from './models';
import type {DailyWater,WaterSettings} from './water';
export type MovementRecord={id:string;date:string;typeId:string;timeZone?:string;createdAt?:string};
export type WellnessState={assignments:DailyMealAssignment[];savedMeals:NourishState['savedMeals'];water:DailyWater[];waterSettings:WaterSettings|null;types:MovementType[];quickIds:string[];recentIds:string[];movement:DailyMovement[];activities:MovementRecord[];groceryItems:NourishState['groceryItems'];grocerySections:NourishState['grocerySections']};
export const emptyWellness=():WellnessState=>({assignments:[],savedMeals:[],water:[],waterSettings:null,types:[],quickIds:[],recentIds:[],movement:[],activities:[],groceryItems:[],grocerySections:defaultGrocerySections.map(section=>({...section}))});
export type WellnessAction=
 |{kind:'meal';action:NourishAction}
 |{kind:'water';date:string;mode:'add'|'set';amount:number;settings:WaterSettings}
 |{kind:'water/remove';date:string}
 |{kind:'water/settings';settings:WaterSettings;date?:string}
 |{kind:'movement';day?:DailyMovement;types:MovementType[];quickIds:string[];recentIds:string[]}
 |{kind:'movement/complete';date:string;typeId:string;complete:boolean;id:string}
 |{kind:'activity/save';record:MovementRecord}
 |{kind:'activity/remove';id:string};
export function wellnessReducer(state:WellnessState,action:WellnessAction):WellnessState{
 switch(action.kind){
 case 'meal':{const next=nourishReducer(state,action.action);return {...state,assignments:next.assignments,savedMeals:next.savedMeals,groceryItems:next.groceryItems,grocerySections:next.grocerySections};}
 case 'water':{const old=state.water.find(d=>d.date===action.date),settings=old?.goal&&old.unit?{...action.settings,goal:old.goal,unit:old.unit}:action.settings;const total=action.mode==='add'?(old?.total??0)+action.amount:action.amount;if(!Number.isFinite(total)||total<0)return state;const day={...old,date:action.date,total,goal:settings.goal,unit:settings.unit};return {...state,water:old?state.water.map(d=>d.date===day.date?day:d):[...state.water,day]};}
 case 'water/remove':return {...state,water:state.water.filter(d=>d.date!==action.date)};
 case 'water/settings':return {...state,waterSettings:action.settings,water:state.water.map(d=>d.date===action.date?{...d,goal:action.settings.goal}:d)};
 case 'movement':return {...state,types:action.types,quickIds:action.quickIds,recentIds:action.recentIds,movement:action.day?(state.movement.some(d=>d.date===action.day!.date)?state.movement.map(d=>d.date===action.day!.date?action.day!:d):[...state.movement,action.day]):state.movement};
 case 'movement/complete':{const exists=state.activities.some(r=>r.date===action.date&&r.typeId===action.typeId);if(action.complete)return exists?state:{...state,activities:[...state.activities,{id:action.id,date:action.date,typeId:action.typeId}]};return {...state,activities:state.activities.filter(r=>r.date!==action.date||r.typeId!==action.typeId)};}
 case 'activity/save':return {...state,activities:state.activities.some(r=>r.id===action.record.id)?state.activities.map(r=>r.id===action.record.id?action.record:r):[...state.activities,action.record]};
 case 'activity/remove':return {...state,activities:state.activities.filter(r=>r.id!==action.id)};
 }
}
