import type {StreakDetail} from './reading-streak';
import type {GoalStreakDetail} from './daily-goal';
import type {ChallengeProgress} from './reading-challenge';

/**
 * Celebrations are derived, never stored as events: each one is true of *today's* data (the goal was met today, a streak
 * milestone was reached today, the challenge's last book was finished today). A small seen-list keeps each from
 * appearing twice, and at most one is shown per visit.
 */
export type CelebrationKind='challenge'|'streak'|'best'|'goal';
export type Celebration={id:string;kind:CelebrationKind;title:string;line:string;count?:number};

/** The best finished run before today's, so a personal best means beating an earlier streak. */
export const bestBefore=(streak:Pick<StreakDetail,'runs'>,today:string)=>Math.max(0,...streak.runs.filter(r=>r.end<today).map(r=>r.length));

export function detectCelebrations({today,streak,goal,challenge}:{today:string;streak:StreakDetail;goal:GoalStreakDetail|null;challenge?:ChallengeProgress|null}):Celebration[]{
 const out:Celebration[]=[];
 // Highest first: the annual challenge, a streak milestone, a personal best, then today's goal.
 if(challenge?.reached){const finishing=challenge.reads[challenge.target-1];if(finishing&&finishing.finishedOn===today)out.push({id:`challenge:${challenge.year}`,kind:'challenge',title:`Your ${challenge.year} Reading Challenge is complete`,line:`${challenge.done} ${challenge.done===1?'book':'books'} finished. What a year of stories.`,count:challenge.done});}
 const milestone=streak.readToday?streak.milestones.find(m=>m.reachedOn===today&&m.days===streak.current):undefined;
 if(milestone)out.push({id:`streak:${milestone.days}:${today}`,kind:'streak',title:`${milestone.days} days in a row`,line:milestone.days===7?'A whole week with a book. Lovely.':`${milestone.days} days of reading, one small sitting at a time.`,count:milestone.days});
 const prev=bestBefore(streak,today);
 if(streak.readToday&&streak.current>=3&&streak.current>prev&&!milestone)out.push({id:`best:${streak.current}:${today}`,kind:'best',title:'A new personal best',line:`${streak.current} days in a row, your longest yet.`,count:streak.current});
 if(goal?.metToday&&goal.targetToday!==null)out.push({id:`goal:${today}`,kind:'goal',title:'Today’s reading goal, done',line:`${Math.floor(goal.minutesToday)} of ${goal.targetToday} minutes${goal.current>1?` · ${goal.current} days in a row`:''}.`,count:goal.current});
 return out;
}
/** The first celebration not yet seen on this device, or null. */
export const nextUnseen=(events:readonly Celebration[],seen:readonly string[])=>events.find(e=>!seen.includes(e.id))??null;
