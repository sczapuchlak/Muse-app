import type {SupabaseClient} from '@supabase/supabase-js';
import type {Book} from '@/lib/whimsy/models';
import {addToPlan,planEntries,periodOf,yearRollup,type PlanEntry} from './reading-plans';

/**
 * The book wheel's sources and randomness (Reading Roulette, now "Spin to Add" on a Reading Plan), and the retirement of
 * the old Up Next slots. Up Next merged into the Monthly Reading Plan on Nov 25: the plan is the one place for planned
 * reading. Its table stays (nothing is deleted); it is only read once more to hand any waiting books to the plan.
 */
export type SourceId='month'|'year'|'tbr'|'library'|'surprise';
export const SOURCES:{id:SourceId;label:string;hint:string}[]=[
 {id:'month',label:'This month’s plan',hint:'Books you planned for this month'},
 {id:'year',label:'Yearly plan',hint:'Books you planned for this year'},
 {id:'tbr',label:'To Be Read',hint:'Your To Be Read shelf'},
 {id:'library',label:'Entire Library',hint:'Anything you could pick up'},
 {id:'surprise',label:'Surprise me',hint:'Any of the four, shuffled together'},
];

/** A book can be queued when it is not archived and not already being read or finished. Paused and DNF books may be revisited. */
export const eligible=(book:Book)=>!book.archivedAt&&(book.status==='planned'||book.status==='paused'||book.status==='dnf');

export type Pools=Record<Exclude<SourceId,'surprise'>,Book[]>;
/** Every source's eligible books, in a stable order, minus any book that already holds another slot. */
export function buildPools(books:readonly Book[],plans:readonly PlanEntry[],today:string,exclude:ReadonlySet<string>,at?:{month:string;year:string}):Pools{
 const byId=new Map(books.map(b=>[b.id,b])),ok=(b:Book|undefined):b is Book=>!!b&&eligible(b)&&!exclude.has(b.id);
 // The yearly plan reads as the year does: its months' books and its own (yearRollup).
 const fromPlan=(kind:'month'|'year')=>(kind==='year'?yearRollup(plans,at?.year??periodOf('year',today)):planEntries(plans,'month',at?.month??periodOf('month',today))).map(e=>byId.get(e.bookId)).filter(ok);
 const all=books.filter(ok);
 return {month:fromPlan('month'),year:fromPlan('year'),tbr:all.filter(b=>b.status==='planned'),library:all};
}
/** The books a source offers. Surprise is the four sources shuffled into one pool (each book once). */
export function poolFor(pools:Pools,source:SourceId):Book[]{
 if(source!=='surprise')return pools[source];
 const seen=new Set<string>(),out:Book[]=[];for(const list of [pools.month,pools.year,pools.tbr,pools.library])for(const b of list)if(!seen.has(b.id)){seen.add(b.id);out.push(b);}
 return out;
}
/** Why a source is empty, and where to look instead. */
export function emptyReason(source:SourceId,pools:Pools):{why:string;try:SourceId[]}{
 const alt=(['month','year','tbr','library'] as const).filter(s=>s!==source&&pools[s].length>0);
 const why={month:'Nothing in this month’s plan is waiting to be read. Finished and in-progress books are skipped.',year:'Nothing in your yearly plan is waiting to be read.',tbr:'Your To Be Read shelf is empty.',library:'Your Library has nothing waiting. Everything is being read, finished or already in this plan.',surprise:'There is nothing to choose from yet.'}[source];
 return {why,try:alt};
}

/** A uniformly random index (no modulo bias) from the platform's secure random source. */
export function randomIndex(n:number,random:(a:Uint32Array)=>Uint32Array=a=>crypto.getRandomValues(a)):number{
 if(n<=0)throw Error('Nothing to pick from');
 const limit=Math.floor(0x100000000/n)*n,buf=new Uint32Array(1);
 for(;;){random(buf);if(buf[0]<limit)return buf[0]%n;}
}
/** Picks one book at random; avoids repeating `previous` when there is any other choice. */
export function pickRandom(pool:readonly Book[],previous?:string|null,random?:(a:Uint32Array)=>Uint32Array):Book|null{
 if(!pool.length)return null;
 const choices=pool.length>1&&previous?pool.filter(b=>b.id!==previous):pool;
 return choices[randomIndex(choices.length,random)];
}
/** Covers to flash past during a spin: a shuffled sample of the pool that always ends on the winner. */
export function reelFor(pool:readonly Book[],winner:Book,length=14,random?:(a:Uint32Array)=>Uint32Array):Book[]{
 const reel:Book[]=[];for(let i=0;i<length-1;i++)reel.push(pool[randomIndex(pool.length,random)]);return [...reel,winner];
}

// ---- Retiring the old Up Next slots ---------------------------------------------------------------------------------
const SLOT_COUNT=3;
export type Slots=(string|null)[];
export const emptySlots=():Slots=>Array.from({length:SLOT_COUNT},()=>null);
/** The waiting books (in slot order) that move into the plan: started, finished, archived or missing books are let go. */
export const upNextToPlan=(slots:Slots,books:readonly Book[])=>{const byId=new Map(books.map(b=>[b.id,b]));return slots.filter((id):id is string=>!!id&&!!byId.get(id)&&eligible(byId.get(id)!));};

export async function readUpNext(client:SupabaseClient):Promise<Slots>{
 const {data,error}=await client.from('up_next_slots').select('slot,book_id');if(error)throw Error(error.message);
 const slots=emptySlots();for(const r of data??[])if(r.slot>=0&&r.slot<SLOT_COUNT)slots[r.slot]=r.book_id as string;return slots;
}
/**
 * Hands any books still waiting in Up Next to a month's plan (after its own books, in slot order; a plan never holds a
 * book twice), then empties the slots so it happens once. Safe to repeat and to run in two tabs: adding is idempotent,
 * and the slots are only emptied after the books are safely in the plan. Returns the books it moved.
 */
export async function retireUpNext(client:SupabaseClient,books:readonly Book[],month:string):Promise<string[]>{
 const slots=await readUpNext(client);if(!slots.some(Boolean))return [];
 const moving=upNextToPlan(slots,books);
 if(moving.length)await addToPlan(client,'month',month,moving);
 const {error}=await client.rpc('save_up_next',{p_book_ids:emptySlots()});if(error)throw Error(error.message);
 return moving;
}
