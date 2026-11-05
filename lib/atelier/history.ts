/** Undo/redo for the studio. Rapid edits to one control (a slider drag, a colour sweep) merge into a single step. */
export type History<T>={past:T[];present:T;future:T[];lastKey:string|null;lastAt:number};
export const LIMIT=120;
export const startHistory=<T,>(present:T):History<T>=>({past:[],present,future:[],lastKey:null,lastAt:0});
export function record<T>(history:History<T>,next:T,key:string|null,now=Date.now()):History<T>{
 if(Object.is(next,history.present))return history;
 const merge=key!==null&&key===history.lastKey&&now-history.lastAt<900;
 return {past:merge?history.past:[...history.past,history.present].slice(-LIMIT),present:next,future:[],lastKey:key,lastAt:now};
}
export const undo=<T,>(history:History<T>):History<T>=>history.past.length?{past:history.past.slice(0,-1),present:history.past[history.past.length-1],future:[history.present,...history.future],lastKey:null,lastAt:0}:history;
export const redo=<T,>(history:History<T>):History<T>=>history.future.length?{past:[...history.past,history.present],present:history.future[0],future:history.future.slice(1),lastKey:null,lastAt:0}:history;
