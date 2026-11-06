/**
 * The annual Reading Challenge (#50). Built on the existing ReadingGoal model, no second goal store:
 * a challenge is a books goal for a year. A goal pinned to one year (`recurs:false`, Jan 1–Dec 31) wins for that year;
 * otherwise a repeating yearly books goal applies to every year from its start. Future views (Aspirations) should
 * reference these same goal records, never copy them.
 *
 * Counting: every finished read counts, rereads included, in the year of its actual finish date (the same rule as
 * Bookshelf's existing "each finished read counts"). Duplicate finishes cannot double-count because completions are
 * already idempotent per read. Missing finish dates are never invented.
 */
import type {Book,ReadingGoal} from './models';
import {completionsIn} from './reading-stats';

export type ChallengeRead={readId:string;bookId:string;title:string;author?:string;coverUrl?:string;finishedOn:string;reread:boolean};
export type ChallengePace={expected:number;difference:number;status:'ahead'|'on-pace'|'behind'}|null;
export type ChallengeProgress={year:string;goal:ReadingGoal;target:number;done:number;percent:number;remaining:number;reached:boolean;pace:ChallengePace;reads:ChallengeRead[]};

const yearRange=(year:string)=>({start:`${year}-01-01`,end:`${year}-12-31`});
const isYearBooks=(g:ReadingGoal)=>g.period==='year'&&g.unit==='books';

/** The challenge that applies to a year, if any. */
export function challengeFor(goals:ReadingGoal[],year:string):ReadingGoal|null{
 const pinned=goals.filter(g=>isYearBooks(g)&&!g.recurs&&g.start.slice(0,4)===year).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
 if(pinned)return pinned;
 return goals.filter(g=>isYearBooks(g)&&g.recurs&&g.start.slice(0,4)<=year).sort((a,b)=>b.start.localeCompare(a.start))[0]??null;
}

/** Days elapsed in the year as a fraction (0 before it starts, 1 after it ends). */
export function yearElapsed(year:string,today:string){
 if(today<`${year}-01-01`)return 0;if(today>`${year}-12-31`)return 1;
 const start=Date.UTC(Number(year),0,1),end=Date.UTC(Number(year)+1,0,1),now=Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1,Number(today.slice(8,10)))+86400000;
 return Math.min(1,(now-start)/(end-start));
}

export function challengeProgress(goal:ReadingGoal,books:Book[],year:string,today:string):ChallengeProgress{
 const {events}=completionsIn(books,yearRange(year));
 const reads=events.map(e=>({readId:e.completion.id,bookId:e.book.id,title:e.book.title,author:e.book.author,coverUrl:e.book.coverUrl,finishedOn:e.completion.finishedOn,reread:!!e.reread}))
  .sort((a,b)=>a.finishedOn.localeCompare(b.finishedOn)||a.title.localeCompare(b.title));
 const target=Math.max(1,goal.target),done=reads.length,elapsed=yearElapsed(year,today);
 // Pace only for the year in progress; wording stays neutral (a small band counts as on pace).
 let pace:ChallengePace=null;
 if(elapsed>0&&elapsed<1){const expected=target*elapsed,difference=done-expected;pace={expected,difference,status:Math.abs(difference)<.75?'on-pace':difference>0?'ahead':'behind'};}
 return {year,goal,target,done,percent:Math.min(100,Math.round(done/target*100)),remaining:Math.max(0,target-done),reached:done>=target,pace,reads};
}

/** Years worth offering in the picker: any year with finishes or a challenge, plus this year and next. */
export function challengeYears(goals:ReadingGoal[],books:Book[],today:string){
 const years=new Set<string>([today.slice(0,4),String(Number(today.slice(0,4))+1)]);
 for(const g of goals)if(isYearBooks(g))years.add(g.start.slice(0,4));
 for(const e of completionsIn(books,null).events)years.add(e.completion.finishedOn.slice(0,4));
 return [...years].sort((a,b)=>b.localeCompare(a));
}

/**
 * Reliable reading-goal facts for the future Living Universe engine (no copy, no commentary): quarter thresholds
 * reached, a personal yearly record, the year's first finish and finishing ahead of schedule.
 */
export function challengeSignals(progress:ChallengeProgress,books:Book[]){
 const thresholds=[25,50,75,100].filter(t=>progress.done/progress.target*100>=t);
 const byYear=new Map<string,number>();for(const e of completionsIn(books,null).events){const y=e.completion.finishedOn.slice(0,4);byYear.set(y,(byYear.get(y)??0)+1);}
 const previousBest=Math.max(0,...[...byYear].filter(([y])=>y<progress.year).map(([,n])=>n));
 return {thresholds,personalRecord:progress.done>previousBest&&previousBest>0,firstFinishOfYear:progress.reads[0]??null,
  reachedAheadOfSchedule:progress.reached&&!!progress.pace&&progress.pace.difference>0};
}
