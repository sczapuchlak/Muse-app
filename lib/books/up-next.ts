import type {SupabaseClient} from '@supabase/supabase-js';
import type {Book} from '@/lib/whimsy/models';
import {planEntries,periodOf,type PlanEntry} from './reading-plans';

/**
 * Up Next (Phase 3): up to three suggested reads. Only the book id per slot is stored; everything else comes from the
 * book itself, so Up Next can never disagree with the Library and adds no status model of its own.
 */
export const SLOT_COUNT=3;
export type Slots=(string|null)[];
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
export function buildPools(books:readonly Book[],plans:readonly PlanEntry[],today:string,exclude:ReadonlySet<string>):Pools{
 const byId=new Map(books.map(b=>[b.id,b])),ok=(b:Book|undefined):b is Book=>!!b&&eligible(b)&&!exclude.has(b.id);
 const fromPlan=(kind:'month'|'year')=>planEntries(plans,kind,periodOf(kind,today)).map(e=>byId.get(e.bookId)).filter(ok);
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
 const why={month:'Nothing in this month’s plan is waiting to be read. Finished and in-progress books are skipped.',year:'Nothing in your yearly plan is waiting to be read.',tbr:'Your To Be Read shelf is empty.',library:'Your Library has nothing waiting. Everything is being read, finished or already in Up Next.',surprise:'There is nothing to choose from yet.'}[source];
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

// ---- Slot operations (pure) ---------------------------------------------------------------------------------------
export const emptySlots=():Slots=>Array.from({length:SLOT_COUNT},()=>null);
/** Put a book in a slot. A book already in another slot moves (never duplicates). */
export function setSlot(slots:Slots,index:number,bookId:string|null):Slots{
 const next=slots.map(id=>id===bookId&&bookId!==null?null:id);next[index]=bookId;return next;
}
export function removeFromSlot(slots:Slots,index:number):Slots{const next=[...slots];next[index]=null;return next;}
/** Swap a slot with its neighbour (-1 left, +1 right). */
export function nudgeSlot(slots:Slots,index:number,delta:-1|1):Slots{
 const to=index+delta;if(to<0||to>=slots.length)return [...slots];const next=[...slots];[next[index],next[to]]=[next[to],next[index]];return next;
}
/** Drop slots whose book is gone, archived, or has genuinely started (status moved to Currently Reading or beyond). */
export function settle(slots:Slots,books:readonly Book[]):Slots{
 const byId=new Map(books.map(b=>[b.id,b]));
 return slots.map(id=>{if(!id)return null;const b=byId.get(id);return !b||b.archivedAt||b.status==='reading'||b.status==='finished'?null:id;});
}
export const sameSlots=(a:Slots,b:Slots)=>a.length===b.length&&a.every((x,i)=>x===b[i]);

// ---- Persistence --------------------------------------------------------------------------------------------------
export async function readUpNext(client:SupabaseClient):Promise<Slots>{
 const {data,error}=await client.from('up_next_slots').select('slot,book_id');if(error)throw Error(error.message);
 const slots=emptySlots();for(const r of data??[])if(r.slot>=0&&r.slot<SLOT_COUNT)slots[r.slot]=r.book_id as string;return slots;
}
export async function saveUpNext(client:SupabaseClient,slots:Slots){const {error}=await client.rpc('save_up_next',{p_book_ids:slots});if(error)throw Error(error.message);}
/** Place a book in a slot using what is stored now (for flows that finish on another page). */
export async function placeInUpNext(client:SupabaseClient,index:number,bookId:string){await saveUpNext(client,setSlot(await readUpNext(client),index,bookId));}
