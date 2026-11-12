import type {SupabaseClient} from '@supabase/supabase-js';
import type {Book} from '@/lib/whimsy/models';

/**
 * Reading Plans (Phase 2). A plan is the ordered set of entries sharing (kind, period): 'month' + 'YYYY-MM' or
 * 'year' + 'YYYY'. Entries are only membership and order; a book's status, rating and dates always come from the
 * book itself, so a plan can never disagree with the Library. Phase 3 (Up Next) picks from these entries.
 */
export type PlanKind='month'|'year';
export type PlanEntry={id:string;kind:PlanKind;period:string;bookId:string;position:number};

export const PLAN_STATUSES:Book['status'][]=['planned','reading','finished','paused','dnf'];
export const PLAN_STATUS_LABEL:Record<Book['status'],string>={planned:'To Be Read',reading:'Currently Reading',finished:'Finished',paused:'Paused',dnf:'Did Not Finish'};

const pad=(n:number)=>String(n).padStart(2,'0');
export const isPeriod=(kind:PlanKind,period:string)=>kind==='month'?/^\d{4}-(0[1-9]|1[0-2])$/.test(period):/^\d{4}$/.test(period);
/** The period containing a local date (YYYY-MM-DD). */
export const periodOf=(kind:PlanKind,date:string)=>kind==='month'?date.slice(0,7):date.slice(0,4);
export function shiftPeriod(kind:PlanKind,period:string,by:number){
 if(kind==='year')return String(Number(period)+by);
 const [y,m]=period.split('-').map(Number),index=y*12+(m-1)+by;return `${Math.floor(index/12)}-${pad(index%12+1)}`;
}
export function periodLabel(kind:PlanKind,period:string){
 if(kind==='year')return period;
 const [y,m]=period.split('-').map(Number);
 return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1,12)));
}
export const shortPeriodLabel=(kind:PlanKind,period:string)=>kind==='year'?period:new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5,7))-1,1,12)));

const byPosition=(a:PlanEntry,b:PlanEntry)=>a.position-b.position||a.id.localeCompare(b.id);
/** One plan's entries in manual order. */
export const planEntries=(entries:readonly PlanEntry[],kind:PlanKind,period:string)=>entries.filter(e=>e.kind===kind&&e.period===period).sort(byPosition);
export const planCount=(entries:readonly PlanEntry[],kind:PlanKind,period:string)=>entries.reduce((n,e)=>n+(e.kind===kind&&e.period===period?1:0),0);
/** Every period (of a kind) that has books, newest first: for "past and future plans". */
export const periodsWithPlans=(entries:readonly PlanEntry[],kind:PlanKind)=>[...new Set(entries.filter(e=>e.kind===kind).map(e=>e.period))].sort().reverse();
/** The plans a book belongs to. */
export const plansForBook=(entries:readonly PlanEntry[],bookId:string)=>entries.filter(e=>e.bookId===bookId).sort((a,b)=>a.kind===b.kind?a.period.localeCompare(b.period):a.kind==='year'?-1:1);

/** Counts of a plan's books by their real reading status, in a fixed order (zero statuses omitted). */
export function statusDistribution(books:readonly Pick<Book,'status'>[]){
 const counts=new Map<Book['status'],number>();for(const b of books)counts.set(b.status,(counts.get(b.status)??0)+1);
 return PLAN_STATUSES.filter(s=>counts.has(s)).map(status=>({status,count:counts.get(status)!}));
}

/** Pure reorder: the id at `from` moves to `to`. */
export function moveItem<T>(list:readonly T[],from:number,to:number):T[]{
 if(from===to||from<0||to<0||from>=list.length||to>=list.length)return [...list];
 const next=[...list],[item]=next.splice(from,1);next.splice(to,0,item);return next;
}
/** The same list with a changed order applied to a subset (a visible page) while hidden items keep their relative place. */
export function reorderWithin(all:readonly string[],visible:readonly string[],nextVisible:readonly string[]):string[]{
 const slots=all.map((id,i)=>visible.includes(id)?i:-1).filter(i=>i>=0),out=[...all];slots.forEach((slot,i)=>{out[slot]=nextVisible[i];});return out;
}

/** The actual dates shown on a plan card: the read that is finished or in progress. */
export function planDates(book:Pick<Book,'startedOn'|'finishedOn'|'completions'|'status'>){
 const last=book.completions?.at(-1);
 if(book.status==='finished'||(!book.startedOn&&last))return {started:last?.startedOn??book.startedOn,finished:last?.finishedOn??book.finishedOn};
 return {started:book.startedOn,finished:undefined};
}

// ---- Persistence ------------------------------------------------------------------------------------------------
type Row={id:string;period_kind:PlanKind;period:string;book_id:string;position:number};
const fromRow=(r:Row):PlanEntry=>({id:r.id,kind:r.period_kind,period:r.period,bookId:r.book_id,position:r.position});
const fail=(error:{message:string}|null)=>{if(error)throw Error(error.message);};

export async function readPlanEntries(client:SupabaseClient):Promise<PlanEntry[]>{
 const {data,error}=await client.from('reading_plan_entries').select('id,period_kind,period,book_id,position').order('period_kind').order('period').order('position').limit(5000);
 fail(error);return (data??[]).map(r=>fromRow(r as Row));
}
export async function addToPlan(client:SupabaseClient,kind:PlanKind,period:string,bookIds:string[]){const {error}=await client.rpc('add_reading_plan_books',{p_kind:kind,p_period:period,p_book_ids:bookIds});fail(error);}
export async function savePlanOrder(client:SupabaseClient,kind:PlanKind,period:string,bookIds:string[]){const {error}=await client.rpc('reorder_reading_plan',{p_kind:kind,p_period:period,p_book_ids:bookIds});fail(error);}
export async function movePlanBook(client:SupabaseClient,kind:PlanKind,from:string,to:string,bookId:string){const {error}=await client.rpc('move_reading_plan_book',{p_kind:kind,p_from:from,p_to:to,p_book_id:bookId});fail(error);}
export async function removeFromPlan(client:SupabaseClient,kind:PlanKind,period:string,bookId:string){const {error}=await client.from('reading_plan_entries').delete().eq('period_kind',kind).eq('period',period).eq('book_id',bookId);fail(error);}
