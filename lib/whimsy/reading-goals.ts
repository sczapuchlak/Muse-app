/**
 * Monthly reading goals (Nov 26), beside the annual Reading Challenge and the daily minutes goal. Same goal store, no
 * second one: a monthly goal is a books goal for a month. One pinned to a single month (`recurs:false`) wins for that
 * month; otherwise the latest repeating monthly books goal that has started applies, so changing "every month" from
 * December on leaves November's target as it was.
 *
 * Without a monthly goal, a month with a Reading Plan uses the plan as its goal: plan three books, and November's goal
 * is those three. Plan progress counts the planned books that are finished; a goal counts every read finished in the
 * month, rereads included (the challenge's rule). Missing finish dates are never invented.
 */
import type {Book,ReadingGoal} from './models';
import {endOfPeriod} from './books';
import {completionsIn} from './reading-stats';

const isMonthBooks=(g:ReadingGoal)=>g.period==='month'&&g.unit==='books';
export const monthStart=(month:string)=>`${month}-01`;
export const monthEnd=(month:string)=>endOfPeriod(monthStart(month),'month');

/** The monthly books goal that applies to a month (YYYY-MM), if any. */
export function monthGoalFor(goals:readonly ReadingGoal[],month:string):ReadingGoal|null{
 const pinned=goals.filter(g=>isMonthBooks(g)&&!g.recurs&&g.start.slice(0,7)===month).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
 if(pinned)return pinned;
 return goals.filter(g=>isMonthBooks(g)&&g.recurs&&g.start.slice(0,7)<=month).sort((a,b)=>b.start.localeCompare(a.start)||b.updatedAt.localeCompare(a.updatedAt))[0]??null;
}

export type MonthRead={readId:string;book:Book;finishedOn:string;reread:boolean};
export type MonthProgress={month:string;goal:ReadingGoal|null;source:'goal'|'plan'|'none';target:number;done:number;percent:number;reached:boolean;
 /** The month's plan, in its order, with each book's real status. */ planned:Book[];plannedFinished:number;
 /** Every read finished in the month, newest first. */ reads:MonthRead[]};

/** Fraction of the month elapsed (0 before, 1 after). */
export function monthElapsed(month:string,today:string){
 const start=monthStart(month),end=monthEnd(month);if(today<start)return 0;if(today>end)return 1;
 return Number(today.slice(8,10))/Number(end.slice(8,10));
}

export function monthProgress(goals:readonly ReadingGoal[],books:readonly Book[],planned:readonly Book[],month:string):MonthProgress{
 const goal=monthGoalFor(goals,month),{events}=completionsIn([...books],{start:monthStart(month),end:monthEnd(month)});
 const reads=events.map(e=>({readId:e.completion.id,book:e.book,finishedOn:e.completion.finishedOn,reread:!!e.reread})).sort((a,b)=>b.finishedOn.localeCompare(a.finishedOn)||a.book.title.localeCompare(b.book.title));
 const plannedFinished=planned.filter(b=>b.status==='finished').length;
 const source=goal?'goal':planned.length?'plan':'none',target=goal?Math.max(1,goal.target):planned.length,done=goal?reads.length:plannedFinished;
 return {month,goal,source,target,done,percent:target?Math.min(100,Math.round(done/target*100)):0,reached:target>0&&done>=target,planned:[...planned],plannedFinished,reads};
}

/** A neutral pace for a month or year in progress: how far an even pace would be by today. */
export function evenPace(done:number,target:number,elapsed:number):{status:'ahead'|'on-pace'|'behind';gap:number}|null{
 if(!target||elapsed<=0||elapsed>=1)return null;const difference=done-target*elapsed;
 return {status:Math.abs(difference)<.75?'on-pace':difference>0?'ahead':'behind',gap:Math.max(1,Math.round(Math.abs(difference)))};
}

/** Goal ideas for the New goal sheet ("you can edit these"). Each opens the editor filled in; nothing saves until you say so. */
export type GoalIdea={id:string;title:string;detail:string;timeframe:'year'|'month'|'daily';target:number;every?:boolean};
export function goalIdeas(today:string,planCount:number):GoalIdea[]{
 const year=today.slice(0,4),monthName=new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(`${today.slice(0,7)}-01T12:00:00Z`));
 return [
  {id:'week',title:'A book a week',detail:`52 books in ${year}`,timeframe:'year',target:52},
  {id:'two-month',title:'Two a month',detail:`24 books in ${year}`,timeframe:'year',target:24},
  ...(planCount>0?[{id:'plan',title:'Finish my plan',detail:`${planCount} ${planCount===1?'book':'books'} in ${monthName}`,timeframe:'month' as const,target:planCount}]:[]),
  {id:'four',title:'Four this month',detail:`4 books in ${monthName}`,timeframe:'month',target:4},
  {id:'monthly',title:'Three every month',detail:'3 books, month after month',timeframe:'month',target:3,every:true},
  {id:'daily',title:'20 minutes a day',detail:'A small daily rhythm',timeframe:'daily',target:20},
 ];
}
