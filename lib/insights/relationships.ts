import type {ReturnTypeOfMetrics} from './metrics';
/** Descriptive Pearson r only; no p-value, significance or causal claims. */
export function pearson(pairs:[number,number][]):number|null{if(pairs.length<10)return null;const mean=(values:number[])=>values.reduce((sum,v)=>sum+v,0)/values.length,x=mean(pairs.map((pair)=>pair[0])),y=mean(pairs.map((pair)=>pair[1]));let numerator=0,xx=0,yy=0;for(const [a,b] of pairs){numerator+=(a-x)*(b-y);xx+=(a-x)**2;yy+=(b-y)**2;}return xx>0&&yy>0?Math.max(-1,Math.min(1,numerator/Math.sqrt(xx*yy))):null;}
export function relationships(metrics:ReturnTypeOfMetrics){const {mood,rituals,planner,daily}=metrics;
 const ritualPairs=mood.byDate.flatMap((day)=>{const ritual=rituals.byDate.find((item)=>item.date===day.date),observed=ritual?ritual.complete+ritual.partial+ritual.missed:0;return day.energy!==null&&ritual&&observed>0?[[day.energy,ritual.complete/observed] as [number,number]]:[];});
 const loadPairs=mood.byDate.flatMap((day)=>day.stress!==null?[[day.stress,planner.byDate.find((item)=>item.date===day.date)?.planned??0] as [number,number]]:[]);
 const movementGroups={selected:[] as number[],empty:[] as number[]};for(const day of mood.byDate){if(day.energy===null)continue;const movement=daily.movement.find((item)=>item.date===day.date);if(movement)(movement.typeIds.length?movementGroups.selected:movementGroups.empty).push(day.energy);}
 const mean=(values:number[])=>values.reduce((sum,n)=>sum+n,0)/values.length;
 return {ritualEnergy:{n:ritualPairs.length,r:pearson(ritualPairs)},stressLoad:{n:loadPairs.length,r:pearson(loadPairs)},movementEnergy:{selected:movementGroups.selected.length,empty:movementGroups.empty.length,selectedMean:movementGroups.selected.length>=5&&movementGroups.empty.length>=5?mean(movementGroups.selected):null,emptyMean:movementGroups.selected.length>=5&&movementGroups.empty.length>=5?mean(movementGroups.empty):null}};
}
