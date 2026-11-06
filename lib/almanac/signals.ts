/**
 * Almanac signal adapters (#53). Each one only translates outputs of an existing module function into catalog facts;
 * thresholds and math stay in those functions. Adapters are pure: (records, today) → Signal[].
 */
import type {Signal} from './types';
import {signalCatalog} from './signal-catalog';
import {shiftDate} from '@/lib/dates';
import type {Book,ReadingGoal,ReadingSession,DreamEntry,TarotReading} from '@/lib/whimsy/models';
import {genrePersona,readingMilestones,readingTraits} from '@/lib/whimsy/reading-dna';
import {completionsIn,readingStreaks} from '@/lib/whimsy/reading-stats';
import {challengeFor,challengeProgress} from '@/lib/whimsy/reading-challenge';
import {authorStats,finishSpeed,readingRhythm,weekdayLabels} from '@/lib/whimsy/atlas-insights';
import {entryFor,ritualCell,ritualOpportunity,ritualStreak,type RitualState} from '@/lib/rituals';
import type {Revelation} from '@/lib/insights/revelations';
import type {CrossConnection} from '@/lib/insights/across';
import {symbolConstellation,symbolDreamCounts} from '@/lib/whimsy/dreams';
import {tarotById,tarotInsights} from '@/lib/whimsy/tarot';

type Facts=Signal['facts'];
const empty={sampleSize:0,basis:'',recordIds:[] as string[],range:null};
/** Builds a signal, taking module and sensitivity from the catalog so the two can never disagree. */
export function makeSignal(key:string,facts:Facts,{observedOn,strength,href,evidence}:{observedOn:string;strength:number;href:string;evidence?:Partial<Signal['evidence']>}):Signal{
 const spec=signalCatalog[key];if(!spec)throw Error(`Unknown Almanac signal ${key}`);
 return {key,module:spec.module,sensitivity:spec.sensitivity,facts,observedOn,strength:Math.max(0,Math.min(1,strength)),href,evidence:{...empty,...evidence},...(spec.crossModule?{crossModule:spec.crossModule}:{})};
}
const recent=(today:string,days:number)=>({start:shiftDate(today,-(days-1)),end:today});

// ---------- Reading ----------
export function readingSignals({books,sessions,goals,today}:{books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];today:string}):Signal[]{
 const out:Signal[]=[],year=recent(today,365),season=recent(today,90),fortnight=recent(today,14),href='/whimsy/bookshelf';
 const traitKeys:Record<string,string>={'night-owl':'reading.trait.night-owl','early-bird':'reading.trait.early-bird',weekend:'reading.trait.weekend',steady:'reading.trait.steady','long-haul':'reading.trait.long-haul','little-often':'reading.trait.little-often',rereader:'reading.trait.rereader'};
 for(const t of readingTraits(books,sessions,year,today))if(t.id&&traitKeys[t.id]&&t.facts)out.push(makeSignal(traitKeys[t.id],t.facts,{observedOn:today,strength:.4,href}));
 const persona=genrePersona(books,year);
 if('title' in persona&&persona.facts)out.push(makeSignal('reading.persona',{persona:persona.title,...persona.facts},{observedOn:today,strength:.35,href:'/whimsy/bookshelf?view=atlas'}));
 for(const m of readingMilestones(books,sessions))if(m.achievedOn&&m.achievedOn>=shiftDate(today,-6))out.push(makeSignal('reading.milestone',{title:m.title,metric:m.metric,threshold:m.threshold,achievedOn:m.achievedOn},{observedOn:m.achievedOn,strength:.9,href}));
 const streak=readingStreaks(sessions,today);
 if(streak.current>=3)out.push(makeSignal('reading.streak',{current:streak.current,longest:streak.longest,readToday:streak.readToday},{observedOn:today,strength:Math.min(.85,.4+streak.current/60),href}));
 const y=today.slice(0,4),goal=challengeFor(goals,y);
 if(goal){const p=challengeProgress(goal,books,y,today);
  for(const t of [75,50,25]){const needed=Math.ceil(p.target*t/100),crossing=p.reads[needed-1];
   if(!p.reached&&crossing&&p.done>=needed&&crossing.finishedOn>=shiftDate(today,-13)){out.push(makeSignal('reading.challenge.progress',{done:p.done,target:p.target,threshold:t,year:y,ahead:!!p.pace&&p.pace.difference>0},{observedOn:crossing.finishedOn,strength:.8,href}));break;}}}
 const byYear=new Map<string,number>();for(const e of completionsIn(books,null).events){const k=e.completion.finishedOn.slice(0,4);byYear.set(k,(byYear.get(k)??0)+1);}
 const done=byYear.get(y)??0,previousBest=Math.max(0,...[...byYear].filter(([k])=>k<y).map(([,n])=>n));
 if(previousBest>0&&done>previousBest)out.push(makeSignal('reading.challenge.record',{done,previousBest,year:y},{observedOn:today,strength:.85,href}));
 const authors=authorStats(books,season);
 if(authors.newAuthors>=3)out.push(makeSignal('reading.authors.new',{newAuthors:authors.newAuthors,returningAuthors:authors.returningAuthors},{observedOn:today,strength:.45,href}));
 const top=authors.authors[0];if(top&&top.reads>=3)out.push(makeSignal('reading.author.returning',{author:top.author,reads:top.reads,books:top.books},{observedOn:today,strength:.5,href}));
 const speed=finishSpeed(books,fortnight);if(speed.fastest&&speed.fastest.days<=3)out.push(makeSignal('reading.speed.swift',{title:speed.fastest.book.title,days:speed.fastest.days},{observedOn:speed.fastest.book.finishedOn??today,strength:.6,href}));
 const rhythm=readingRhythm(sessions,season);
 if(rhythm.timedSessions>=3&&rhythm.topHour!==null&&rhythm.topDay!==null){const hourTotal=rhythm.grid.reduce((n,row)=>n+row[rhythm.topHour!],0);
  out.push(makeSignal('reading.rhythm.hour',{hour:rhythm.topHour,weekday:weekdayLabels[rhythm.topDay],share:rhythm.total?hourTotal/rhythm.total:0},{observedOn:today,strength:.3,href}));}
 return out;
}

// ---------- Rituals ----------
/** Streaks (5+ scheduled days or 3+ weeks) and returns: met today after 7+ scheduled opportunities without a full goal. */
export function ritualSignals(state:RitualState,today:string):Signal[]{
 const out:Signal[]=[],href='/rituals';
 for(const ritual of state.rituals){if(ritual.status&&ritual.status!=='active')continue;
  const s=ritualStreak(state,ritual,today);
  if((s.unit==='weeks'&&s.count>=3)||(s.unit==='scheduled days'&&s.count>=5))out.push(makeSignal('rituals.streak',{ritual:ritual.name,count:s.count,unit:s.unit},{observedOn:today,strength:Math.min(.8,.35+s.count/80),href}));
  if(ritual.type!=='weekly-target'&&ritualCell(state,ritual,today,today).status==='complete'){
   let gap=0,day=shiftDate(today,-1);
   for(let i=0;i<120&&day>=ritual.startDate;i++,day=shiftDate(day,-1)){if(!ritualOpportunity(state,ritual,day))continue;if(ritualCell(state,ritual,day,today).status==='complete')break;gap++;}
   const everMet=state.entries.some(e=>e.ritualId===ritual.id&&e.date<today&&e.value>=ritual.goal&&e.outcome!=='missed');
   if(gap>=7&&everMet&&entryFor(state,ritual.id,today))out.push(makeSignal('rituals.return',{ritual:ritual.name,gapOpportunities:gap},{observedOn:today,strength:.75,href}));
  }
 }
 return out;
}

// ---------- Insights (the existing Little Revelations) ----------
export function revelationSignals(revelations:Revelation[],today:string):Signal[]{
 return revelations.filter(r=>r.signal&&signalCatalog[r.signal.key]).map(r=>makeSignal(r.signal!.key,r.signal!.facts,{observedOn:today,strength:r.rank/100,href:r.href,evidence:{sampleSize:r.sampleSize,basis:r.basis,recordIds:r.recordIds,range:r.range}}));
}

// ---------- Cross-module (descriptive comparisons with enough days on both sides) ----------
const crossKeys:Record<string,string>={'reading-day':'cross.reading-day','movement-energy':'cross.movement-energy'};
export function crossSignals(connections:CrossConnection[],today:string):Signal[]{
 return connections.filter(c=>crossKeys[c.id]&&c.result.enough&&c.result.withMean!==null&&c.result.withoutMean!==null).map(c=>makeSignal(crossKeys[c.id],
  {withN:c.result.withN,withoutN:c.result.withoutN,withMean:Math.round(c.result.withMean!*10)/10,withoutMean:Math.round(c.result.withoutMean!*10)/10},
  {observedOn:today,strength:Math.min(1,Math.abs(c.result.withMean!-c.result.withoutMean!)/3),href:'/insights',evidence:{sampleSize:c.result.withN+c.result.withoutN,basis:c.note}}));
}

// ---------- Recaps (recapFacts for a completed week or month) ----------
type Recap={tasks:{completed:number|null};rituals:{fullGoals:number};wellness:{workouts:number}|null;reading:{minutes:number;readingDays:number;booksFinished:number}|null;mood:{checkins:number}};
export function recapSignal(kind:'week'|'month',recap:Recap,{label,end}:{label?:string;end:string}):Signal|null{
 const facts:Facts={tasks:recap.tasks.completed,ritualFullGoals:recap.rituals.fullGoals,readingSeconds:recap.reading?recap.reading.minutes*60:null,readingDays:recap.reading?.readingDays??null,
  booksFinished:recap.reading?.booksFinished??null,workouts:recap.wellness?.workouts??null,moodCheckins:recap.mood.checkins,...(kind==='month'?{month:label??''}:{})};
 const anything=[facts.tasks,facts.ritualFullGoals,facts.readingSeconds,facts.workouts].some(v=>typeof v==='number'&&v>0);
 return anything?makeSignal(`recap.${kind}`,facts,{observedOn:end,strength:.6,href:'/insights'}):null;
}

// ---------- Dreams & Tarot ----------
export function dreamSignals(dreams:DreamEntry[],symbolName:(id:string)=>string|undefined,today:string):Signal[]{
 const recentDreams=dreams.filter(d=>d.date>=shiftDate(today,-59)&&d.date<=today),out:Signal[]=[],href='/whimsy/dreams';
 const [topId,count]=[...symbolDreamCounts(recentDreams)].sort((a,b)=>b[1]-a[1])[0]??[];
 const name=topId?symbolName(topId):undefined;
 if(name&&count>=3)out.push(makeSignal('dreams.recurring-symbol',{symbol:name,dreams:count},{observedOn:today,strength:Math.min(.8,.3+count/20),href}));
 const pair=symbolConstellation(recentDreams,12,2).links?.[0];
 const first=pair?symbolName(pair.a):undefined,second=pair?symbolName(pair.b):undefined;
 if(pair&&first&&second)out.push(makeSignal('dreams.symbol-pair',{first,second,dreams:pair.count},{observedOn:today,strength:.5,href}));
 return out;
}
export function tarotSignals(readings:TarotReading[],today:string):Signal[]{
 const from=shiftDate(today,-29),recentReadings=readings.filter(r=>r.date>=from&&r.date<=today);
 const [topId,count]=tarotInsights(recentReadings.map(r=>({cards:r.cards,spreadId:r.spreadId,date:r.date}))).topCards[0]??[];
 const card=topId?tarotById(topId):undefined;
 return card&&count>=3?[makeSignal('tarot.recurring-card',{card:card.name,draws:count,days:30},{observedOn:today,strength:.5,href:'/whimsy/tarot'})]:[];
}
