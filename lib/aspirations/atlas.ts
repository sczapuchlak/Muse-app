/**
 * Life Atlas 2.0 (#190). Pure. The Atlas is one view of the same aspirations: a year is a lens (annual priorities
 * plus target dates), never a separate collection. Life areas are the Reflections records (Level 10 Life), so the
 * ten areas keep their ids, labels and order; a person's renamed or archived areas are respected.
 */
import type {Tables} from '@/lib/database.types';
import type {MuseMarkIcon,MuseTone} from '@/components/design/MuseHeading';
import type {Aspiration,AspirationConnection,PlanningStyle,ProgressKind} from './models';
import {isOpen} from './progress';

export type Priority=Tables<'aspiration_year_priorities'>;
export type YearPlan=Tables<'aspiration_year_plans'>;
export type YearVision=Tables<'aspiration_year_visions'>;
export type AreaLink={aspiration_id:string;area_id:string;is_primary:boolean};
export type RelatedLink={aspiration_id:string;related_id:string};
export type Lens={kind:'year';year:number}|{kind:'all'}|{kind:'undated'};

const yearOf=(today:string)=>Number(today.slice(0,4));
/** The year worth designing: from October, next year (nobody wants to plan a nearly finished year). */
export const planningYear=(today:string)=>Number(today.slice(5,7))>=10?yearOf(today)+1:yearOf(today);

export const activePriorities=(list:Priority[])=>list.filter(p=>!p.removed_at);
/** Years an aspiration was chosen for (the annual association; separate from any target date). */
export function yearsOf(id:string,priorities:Priority[]){
 return [...new Set(activePriorities(priorities).filter(p=>p.aspiration_id===id).map(p=>p.year))].sort((a,b)=>a-b);
}
/** Years implied by when it is due: a target date, a target month/year/range, or a Reading Challenge's year. */
export function targetYears(a:Pick<Aspiration,'targetDate'|'targetPeriod'|'connection'>):number[]{
 const out=new Set<number>();
 if(a.targetDate)out.add(Number(a.targetDate.slice(0,4)));
 if(a.targetPeriod){if(a.targetPeriod.includes('/')){const from=Number(a.targetPeriod.slice(0,4)),to=Number(a.targetPeriod.slice(5));for(let y=from;y<=to&&y-from<50;y++)out.add(y);}else out.add(Number(a.targetPeriod.slice(0,4)));}
 if(a.connection?.kind==='reading-challenge')out.add(Number(a.connection.year));
 return [...out].filter(Number.isFinite).sort((x,y)=>x-y);
}
export const isUndated=(a:Aspiration,priorities:Priority[])=>!yearsOf(a.id,priorities).length&&!targetYears(a).length;
export function inLens(a:Aspiration,lens:Lens,priorities:Priority[]){
 if(lens.kind==='all')return true;
 if(lens.kind==='undated')return isUndated(a,priorities);
 return yearsOf(a.id,priorities).includes(lens.year)||targetYears(a).includes(lens.year);
}
/** Every year anyone could want to look at: chosen years, target years, the current and the planning year. */
export function knownYears(aspirations:Aspiration[],priorities:Priority[],plans:Pick<YearPlan,'year'>[],today:string){
 const ys=new Set<number>([yearOf(today),planningYear(today),...plans.map(p=>p.year),...activePriorities(priorities).map(p=>p.year),...aspirations.flatMap(a=>targetYears(a))]);
 return [...ys].filter(y=>y>=1&&y<=9999).sort((a,b)=>a-b);
}
export function defaultLens(today:string,plans:YearPlan[],saved?:string|null):Lens{
 if(saved==='all')return {kind:'all'};if(saved==='undated')return {kind:'undated'};
 if(saved&&/^\d{4}$/.test(saved))return {kind:'year',year:Number(saved)};
 const next=planningYear(today),plan=plans.find(p=>p.year===next);
 return {kind:'year',year:next!==yearOf(today)&&(plan?.ritual_started_at||plan?.established_at)?next:yearOf(today)};
}
export const lensKey=(l:Lens)=>l.kind==='year'?String(l.year):l.kind;

/** An Atlas exists once someone has brought a year to life, built it themselves, or already placed aspirations. */
export function isEstablished(plans:YearPlan[],links:AreaLink[],priorities:Priority[]){
 return plans.some(p=>p.established_at||p.ritual_completed_at)||links.some(l=>l.is_primary)||activePriorities(priorities).length>0;
}
export const primaryAreaOf=(id:string,links:AreaLink[])=>links.find(l=>l.aspiration_id===id&&l.is_primary)?.area_id??null;
export const secondaryAreasOf=(id:string,links:AreaLink[])=>links.filter(l=>l.aspiration_id===id&&!l.is_primary).map(l=>l.area_id);
export const relatedOf=(id:string,links:RelatedLink[])=>links.flatMap(l=>l.aspiration_id===id?[l.related_id]:l.related_id===id?[l.aspiration_id]:[]);
/** Related links are stored once, smaller id first. */
export const relatedPair=(a:string,b:string)=>a<b?{aspiration_id:a,related_id:b}:{aspiration_id:b,related_id:a};

// ---------- The ten Life Areas: a glyph, an ink and a prompt each ----------
type AreaVoice={glyph:MuseMarkIcon;example:string;prompt:string;whisper:string};
const voices:{match:RegExp;voice:AreaVoice}[]=[
 {match:/health|fitness|body/i,voice:{glyph:'pulse',example:'Run my first 10k',prompt:'What would feeling stronger, healthier, or more at home in your body make possible?',whisper:'Strength, rest, the body you live in'}},
 {match:/career|work/i,voice:{glyph:'briefcase',example:'Lead a project I love',prompt:'What work would you be proud to look back on, and what would you love to be known for?',whisper:'Craft, ambition, meaningful work'}},
 {match:/financ|money|wealth/i,voice:{glyph:'coins',example:'Save a three-month cushion',prompt:'What would a little more ease, freedom, or security with money let you do?',whisper:'Ease, security, generosity'}},
 {match:/family/i,voice:{glyph:'keepsake',example:'Sunday dinners together',prompt:'Which moments with the people who raised you, or the family you’ve made, do you want to keep?',whisper:'Roots, traditions, the people who are home'}},
 {match:/friend/i,voice:{glyph:'smile',example:'Host a monthly game night',prompt:'Which connections would you love to nurture, deepen, or create?',whisper:'Laughter, loyalty, your people'}},
 {match:/romance|love|partner/i,voice:{glyph:'heart',example:'A weekend away, just us',prompt:'What would make love feel more tender, playful, or adventurous this year?',whisper:'Tenderness, play, devotion'}},
 {match:/growth|learn|personal/i,voice:{glyph:'seedling',example:'Learn to sew',prompt:'What are you curious enough to learn, practice, or become?',whisper:'Curiosity, practice, becoming'}},
 {match:/fun|recreation|play|adventure/i,voice:{glyph:'compass',example:'See the northern lights',prompt:'What would make this year more playful, adventurous, or unforgettable?',whisper:'Play, adventure, delight'}},
 {match:/home|environment|space/i,voice:{glyph:'house',example:'A bedroom that feels like a sanctuary',prompt:'What would make the places you live and move through feel more like yours?',whisper:'Sanctuary, beauty, belonging'}},
 {match:/spirit|soul|faith/i,voice:{glyph:'crescent',example:'A morning stillness practice',prompt:'What helps you feel grounded, connected, or full of wonder, and how could you make room for it?',whisper:'Wonder, stillness, meaning'}},
];
const fallbackVoice:AreaVoice={glyph:'sparkle',example:'Something you’d love to grow',prompt:'What would you love to explore, nurture, or bring to life here?',whisper:'A chapter all your own'};
export const areaVoice=(label:string)=>voices.find(v=>v.match.test(label))?.voice??fallbackVoice;
/** Spread around the eight theme inks so neighbouring areas never share a tint. */
export const areaTone=(position:number):MuseTone=>(((position*3)%8)+1) as MuseTone;
const numerals=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
export const roman=(i:number)=>numerals[i]??String(i+1);

// ---------- How progress is recognized (the ritual's light choice) ----------
export type Tracking='know'|'milestones'|'target'|'connected'|'later';
export const trackingLabels:Record<Tracking,{label:string;detail:string}>={
 know:{label:'I’ll know when I’ve achieved it',detail:'One finish line, no numbers'},
 milestones:{label:'Track milestones',detail:'A few meaningful steps along the way'},
 target:{label:'Track a measurable target',detail:'Like 5 pull-ups or $3,000'},
 connected:{label:'Connect progress from Muse',detail:'Counted from Books, Planner, Movement or Water'},
 later:{label:'Decide later',detail:'Leave it open for now'},
};
export function trackingOf(a:Pick<Aspiration,'progressKind'|'planningStyle'>):Tracking{
 if(a.progressKind==='milestones')return 'milestones';
 if(a.progressKind==='numeric'||a.progressKind==='manual')return 'target';
 if(a.progressKind==='connected')return 'connected';
 return a.planningStyle==='achievement'?'know':'later';
}
/** The fields a tracking choice changes. Existing milestones, notes and history are never cleared. */
export function trackingPatch(t:Tracking,a:Pick<Aspiration,'target'|'unit'|'connection'|'planningStyle'>):{progressKind:ProgressKind;planningStyle:PlanningStyle|null;connection:AspirationConnection|null;target:number|null;unit:string|null}{
 const keepStyle=a.planningStyle==='practice'||a.planningStyle==='exploration'?a.planningStyle:null;
 if(t==='milestones')return {progressKind:'milestones',planningStyle:keepStyle,connection:null,target:null,unit:a.unit};
 if(t==='target')return {progressKind:'numeric',planningStyle:'target',connection:null,target:a.target,unit:a.unit};
 if(t==='connected')return {progressKind:'connected',planningStyle:keepStyle,connection:a.connection,target:a.target,unit:a.unit};
 return {progressKind:'binary',planningStyle:t==='know'?'achievement':keepStyle,connection:null,target:null,unit:a.unit};
}

// ---------- Filters ----------
export type StatusFilter='all'|'open'|'achieved'|'resting'|'archived';
export function matchesStatus(a:Pick<Aspiration,'status'>,f:StatusFilter){
 if(f==='archived')return a.status==='archived';
 if(a.status==='archived')return false;
 if(f==='open')return isOpen(a)&&a.status!=='paused';
 if(f==='achieved')return a.status==='completed';
 if(f==='resting')return a.status==='paused'||a.status==='discontinued';
 return true;
}
/** Quarter (1–4) an aspiration is due in, within a year; null when it has no month-level target. */
export function quarterIn(a:Pick<Aspiration,'targetDate'|'targetPeriod'>,year:number){
 const d=a.targetDate??(a.targetPeriod?.length===7?`${a.targetPeriod}-01`:null);
 if(!d||Number(d.slice(0,4))!==year)return null;
 return Math.floor((Number(d.slice(5,7))-1)/3)+1;
}
export function matchesSearch(a:Pick<Aspiration,'title'|'description'|'motivation'|'milestones'>,q:string){
 const query=q.trim().toLocaleLowerCase();if(!query)return true;
 return [a.title,a.description,a.motivation,...a.milestones.map(m=>m.title)].some(v=>v?.toLocaleLowerCase().includes(query));
}

// ---------- New year: what could be carried forward (never automatically) ----------
/** Unfinished aspirations chosen for an earlier year and not yet for this one; most recent year first. */
export function carryCandidates(year:number,aspirations:Aspiration[],priorities:Priority[]){
 const act=activePriorities(priorities);
 return aspirations.filter(a=>isOpen(a)&&!act.some(p=>p.aspiration_id===a.id&&p.year===year))
  .map(a=>({a,from:Math.max(0,...act.filter(p=>p.aspiration_id===a.id&&p.year<year).map(p=>p.year))}))
  .filter(x=>x.from>0).sort((x,y)=>y.from-x.from||x.a.title.localeCompare(y.a.title));
}

/** The ritual's chapters in order. */
export type RitualStep='imagine'|'carry'|'declare'|{area:string};
export function ritualSteps(areaIds:string[],hasCarry:boolean):RitualStep[]{
 return ['imagine',...(hasCarry?['carry' as const]:[]),...areaIds.map(area=>({area})),'declare'];
}
export const stepKey=(s:RitualStep)=>typeof s==='string'?s:s.area;
export function resumeIndex(steps:RitualStep[],saved:string|null|undefined){
 const i=steps.findIndex(s=>stepKey(s)===saved);return i<0?0:i;
}
/** A gentle focus nudge, never a cap. */
export const focusNudge=(count:number)=>count>5;

export type AtlasCounts={total:number;achieved:number;milestones:number;milestonesDone:number};
export function atlasCounts(list:Aspiration[]):AtlasCounts{
 return {total:list.length,achieved:list.filter(a=>a.status==='completed').length,
  milestones:list.reduce((n,a)=>n+a.milestones.length,0),milestonesDone:list.reduce((n,a)=>n+a.milestones.filter(m=>m.completedOn).length,0)};
}
/** Short words for when an aspiration is due. */
export function whenLabel(a:Pick<Aspiration,'targetDate'|'targetPeriod'|'timeframe'>){
 const fmt=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{...o,timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
 if(a.targetDate)return `By ${fmt(a.targetDate,{month:'short',day:'numeric',year:'numeric'})}`;
 if(a.targetPeriod){if(a.targetPeriod.includes('/'))return `${a.targetPeriod.slice(0,4)}–${a.targetPeriod.slice(5)}`;if(a.targetPeriod.length===7)return `By ${fmt(`${a.targetPeriod}-01`,{month:'short',year:'numeric'})}`;return `In ${a.targetPeriod}`;}
 if(a.timeframe==='ongoing')return 'Ongoing';if(a.timeframe==='someday')return 'Someday';
 return '';
}
